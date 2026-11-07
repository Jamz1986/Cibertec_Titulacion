import express from 'express';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';
import { exec } from 'child_process';
import util from 'util';

const require = createRequire(import.meta.url);
const { ZipArchive } = require('archiver');

const execPromise = util.promisify(exec);

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = Number(process.env.PORT) || 3000;

// Enable CORS for all origins, methods, and standard headers
app.use(
  cors({
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'Origin'],
    credentials: true,
  })
);

// Body parsers: support JSON, URL-encoded, and plain text fallback for Zabbix webhooks
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(express.text({ type: ['text/plain', 'application/octet-stream', 'text/html'], limit: '10mb' }));

// In-memory store for webhook events and automatic tickets
interface StoredWebhookTicket {
  id: string;
  code: string;
  title: string;
  titulo?: string;
  description: string;
  descripcion?: string;
  origen: 'AUTOMATICO' | 'MANUAL';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  status: 'open' | 'vmware_testing' | 'in_progress' | 'resolved' | 'closed';
  category: 'vmware_virtualization' | 'networking_connectivity' | 'aip_hardware' | 'school_server' | 'educational_software';
  ugel: string;
  sede: string;
  schoolName: string;
  reporterUserId?: string;
  reporterName: string;
  reporterRole: string;
  reporterEmail: string;
  classroomLab: string;
  createdAt: string;
  slaTargetHours: number;
  comments: Array<{
    id: string;
    author: string;
    role: string;
    text: string;
    timestamp: string;
  }>;
  distrito?: 'Miraflores' | 'San Borja' | 'Santiago de Surco' | 'San Luis' | 'Barranco' | 'Chorrillos' | 'Surquillo';
  tipoFalla?: 'Red y Conectividad' | 'Hardware Aula / AIP' | 'Servidor y Servicios' | 'Suministro Eléctrico' | 'Software Educativo';
  vmTimestamp?: string;
  horaIncidenciaVM?: string;
  zonaHorariaVM?: string;
  casoNumero?: 1 | 2 | 3;
  casoNombre?: string;
  casoHistoriaJurado?: string;
  telemetriaZabbix?: {
    lastGaspReceived: boolean;
    heartbeatConsecutiveFails: number;
    correlationConfidence: number;
    ipDispositivo?: string;
    puertoAfectado?: string;
    latenciaMs?: number;
    perdidaPaquetesPct?: number;
    anchoBandaUtilizadoMbps?: number;
    ultimoSondeoSnmp?: string;
    probableCausa: 'CORTE_ELECTRICO_MASIVO' | 'CORTE_FIBRA_OPTICA_TRONCAL' | 'FALLA_LOCAL_AISLADA' | 'CORTE_ENLACE_TRUNK_SWITCH' | 'DESCONEXION_INDETERMINADA';
  };
}

const CACHE_FILE = path.join('/tmp', 'zabbix_tickets_cache.json');

function loadCachedTickets(): StoredWebhookTicket[] {
  try {
    if (fs.existsSync(CACHE_FILE)) {
      const raw = fs.readFileSync(CACHE_FILE, 'utf-8');
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch (err) {
    console.warn('[Server] Error loading cache:', err);
  }
  return [];
}

function persistCachedTickets(tickets: StoredWebhookTicket[]) {
  try {
    fs.writeFileSync(CACHE_FILE, JSON.stringify(tickets.slice(0, 50), null, 2), 'utf-8');
  } catch (err) {
    console.warn('[Server] Error persisting cache:', err);
  }
}

let receivedTickets: StoredWebhookTicket[] = loadCachedTickets();

interface WebhookLogEntry {
  id: string;
  timestamp: string;
  method: string;
  path: string;
  ip: string;
  hostName?: string;
  eventName?: string;
  status: number;
  message: string;
}

let webhookLogs: WebhookLogEntry[] = [];

// Helper function to map Zabbix severity to EduDesk priority
function mapZabbixSeverityToPriority(severity?: string): 'low' | 'medium' | 'high' | 'urgent' {
  if (!severity) return 'high';
  const s = String(severity).toLowerCase();
  if (s.includes('disaster') || s.includes('desastre') || s.includes('5')) return 'urgent';
  if (s.includes('high') || s.includes('alta') || s.includes('alto') || s.includes('4')) return 'high';
  if (s.includes('average') || s.includes('media') || s.includes('medio') || s.includes('3')) return 'medium';
  if (s.includes('warning') || s.includes('advertencia') || s.includes('2')) return 'medium';
  if (s.includes('info') || s.includes('information') || s.includes('1')) return 'low';
  return 'high';
}

// ==========================================
// 1. Zabbix Webhook API Endpoints & Logic
// ==========================================

function handleZabbixWebhook(req: express.Request, res: express.Response) {
  // Set explicit CORS headers on every response
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, PATCH, DELETE');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, Accept, Origin');

  if (req.method === 'OPTIONS') {
    return res.sendStatus(204);
  }

  if (req.method === 'GET') {
    return res.status(200).json({
      status: 'online',
      service: 'EduDesk - Receptor Webhook Zabbix Server 7.0 LTS',
      method: 'POST',
      endpointsAceptados: ['/api/webhooks/zabbix', '/api/webhooks/zabbix/', '/api/webhook', '/webhook', '/zabbix', '/'],
      receivedCount: receivedTickets.length,
      recentTickets: receivedTickets.slice(0, 10),
    });
  }

  if (req.method === 'POST') {
    try {
      let payload = req.body;

      // Handle plain text or stringified JSON payload
      if (typeof payload === 'string') {
        try {
          payload = JSON.parse(payload);
        } catch {
          payload = { rawMessage: payload };
        }
      }

      const hostName =
        payload?.host_name ||
        payload?.hostname ||
        payload?.host ||
        payload?.HOST ||
        payload?.equipo ||
        payload?.target ||
        'servidor-zabbix';

      const hostIp =
        payload?.ip ||
        payload?.host_ip ||
        payload?.ipDispositivo ||
        payload?.IP ||
        payload?.ip_address ||
        '192.168.40.10';

      const eventName =
        payload?.event_name ||
        payload?.trigger_name ||
        payload?.event ||
        payload?.subject ||
        payload?.mensaje ||
        'Windows: Zabbix agent is not available';

      const severity =
        payload?.severity ||
        payload?.severidad ||
        payload?.SEVERITY ||
        payload?.event_severity ||
        'High';

      const itemValue =
        payload?.item_value ||
        payload?.valor ||
        payload?.metric ||
        payload?.item ||
        '0';

      // =========================================================================
      // Detección y Clasificación de los 3 Escenarios de Titulación para el Jurado
      // =========================================================================
      const normEvent = `${eventName} ${payload?.titulo || ''} ${payload?.descripcion || ''}`.toLowerCase();

      let casoNumero: 1 | 2 | 3 | undefined = undefined;
      let casoNombre: string | undefined = undefined;
      let casoHistoriaJurado: string | undefined = undefined;
      let computedTitle = '';
      let computedDesc = '';
      let computedPriority: 'urgent' | 'high' | 'medium' | 'low' = mapZabbixSeverityToPriority(severity);
      let computedTipoFalla: 'Red y Conectividad' | 'Hardware Aula / AIP' | 'Servidor y Servicios' | 'Suministro Eléctrico' | 'Software Educativo' = 'Hardware Aula / AIP';

      if (
        normEvent.includes('not available') ||
        normEvent.includes('nodata') ||
        normEvent.includes('unreachable') ||
        normEvent.includes('desconexion') ||
        normEvent.includes('cable') ||
        normEvent.includes('desconexión') ||
        normEvent.includes('30s')
      ) {
        // Caso 1: Desconexión Física de Red (Disponibilidad / Red)
        casoNumero = 1;
        casoNombre = 'Caso 1: Desconexión Física de Red (Disponibilidad / Red)';
        casoHistoriaJurado = 'Personal de limpieza o un alumno desconecta por error el cable UTP del equipo PC-ALUMNO-01 durante el mantenimiento del laboratorio.';
        computedTitle = `[Caso 1: Desconexión Física de Red] Windows: Zabbix agent is not available (or nodata for 30s) · ${hostName}`;
        computedDesc = `Incidencia de Disponibilidad de Red: Pérdida total de enlace en ${hostName} (${hostIp}). Historia para el jurado: Personal de limpieza o un alumno desconecta por error el cable UTP del equipo PC-ALUMNO-01 durante el mantenimiento del laboratorio. Alerta en Zabbix: Windows: Zabbix agent is not available (or nodata for 30s). Métrica: ${itemValue}. Severidad: Crítica.`;
        computedPriority = 'urgent';
        computedTipoFalla = 'Red y Conectividad';
      } else if (
        normEvent.includes('cpu') ||
        normEvent.includes('procesador') ||
        normEvent.includes('>95') ||
        normEvent.includes('utilization') ||
        normEvent.includes('sobrecarga')
      ) {
        // Caso 2: Sobrecarga de Procesador (Rendimiento / Telemetría)
        casoNumero = 2;
        casoNombre = 'Caso 2: Sobrecarga de Procesador (Rendimiento / Telemetría)';
        casoHistoriaJurado = 'Un alumno ejecuta un proceso en bucle infinito o software no autorizado que bloquea el procesador del equipo.';
        computedTitle = `[Caso 2: Sobrecarga de Procesador] High CPU utilization (>95%) · ${hostName}`;
        computedDesc = `Alerta Preventiva de Rendimiento: Saturación crítica de CPU en ${hostName} (${hostIp}). Métrica: ${itemValue || '98.4%'}. Historia para el jurado: Un alumno ejecuta un proceso en bucle infinito o software no autorizado que bloquea el procesador del equipo. El monitoreo advierte la saturación de recursos antes de que el equipo se colapse.`;
        computedPriority = 'high';
        computedTipoFalla = 'Hardware Aula / AIP';
      } else if (
        normEvent.includes('service is not running') ||
        normEvent.includes('service') ||
        normEvent.includes('servicio') ||
        normEvent.includes('agent service')
      ) {
        // Caso 3: Interrupción de Servicio Crítico (Estado de Agentes)
        casoNumero = 3;
        casoNombre = 'Caso 3: Interrupción de Servicio Crítico (Estado de Agentes)';
        casoHistoriaJurado = 'Falla inesperada del servicio de monitoreo o intento de detener los procesos de control en la estación de trabajo.';
        computedTitle = `[Caso 3: Interrupción de Servicio Crítico] Zabbix agent service is not running · ${hostName}`;
        computedDesc = `Alerta de Estado de Agente: Servicio de monitoreo detenido en ${hostName} (${hostIp}). Historia para el jurado: Falla inesperada del servicio de monitoreo o intento de detener los procesos de control en la estación de trabajo. Evidencia el tiempo de respuesta directo del Webhook y la activación del banner sonoro en vivo en la mesa de ayuda.`;
        computedPriority = 'high';
        computedTipoFalla = 'Servidor y Servicios';
      } else {
        // Alerta genérica con nombre del evento real
        computedTitle = `Alerta Zabbix: ${eventName} · ${hostName}`;
        computedDesc = `Alerta emitida por Zabbix Server 7.0 (Ubuntu): ${eventName}. Host: ${hostName} (${hostIp}). Métrica: ${itemValue}. Severidad: ${severity}.`;
        computedPriority = mapZabbixSeverityToPriority(severity);
        computedTipoFalla = hostName.toLowerCase().includes('switch') || hostName.toLowerCase().includes('router')
          ? 'Red y Conectividad'
          : 'Hardware Aula / AIP';
      }

      // Sincronización horaria estricta con la Máquina Virtual (VMware / Zabbix Server) en GMT-5 (UTC-5)
      const parsePeruTime = (rawClock?: any, rawTime?: any, rawDate?: any) => {
        let dateObj = new Date();
        if (rawClock) {
          const num = Number(rawClock);
          if (!isNaN(num) && num > 0) {
            dateObj = new Date(num > 1e11 ? num : num * 1000);
          }
        }
        const formatter = new Intl.DateTimeFormat('es-PE', {
          timeZone: 'America/Lima',
          year: 'numeric',
          month: '2-digit',
          day: '2-digit',
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
          hour12: false,
        });
        const parts = formatter.formatToParts(dateObj);
        const map: Record<string, string> = {};
        for (const p of parts) map[p.type] = p.value;

        const dateFormatted = `${map.year}-${map.month}-${map.day} ${map.hour}:${map.minute}:${map.second}`;
        const timeOnly = `${map.hour}:${map.minute}:${map.second} (GMT-5)`;
        
        let finalTimeOnly = rawTime ? `${rawTime} (GMT-5)` : timeOnly;
        let finalTimestamp = rawDate && rawTime
          ? `${rawDate} ${rawTime} (GMT-5 / UTC-5)`
          : `${dateFormatted} (GMT-5 / UTC-5)`;
        
        return {
          formattedDate: dateFormatted,
          timeOnly: finalTimeOnly,
          vmTimestamp: finalTimestamp,
        };
      };

      const timeSync = parsePeruTime(
        payload?.clock || payload?.timestamp || payload?.EVENT_CLOCK,
        payload?.event_time || payload?.time || payload?.EVENT_TIME,
        payload?.event_date || payload?.date || payload?.EVENT_DATE
      );

      // Determinar Distrito de la UGEL 07 (Miraflores, San Borja, Santiago de Surco, San Luis, Barranco, Chorrillos, Surquillo)
      const detectDistrict = (): 'Miraflores' | 'San Borja' | 'Santiago de Surco' | 'San Luis' | 'Barranco' | 'Chorrillos' | 'Surquillo' => {
        const text = `${payload?.distrito || ''} ${payload?.district || ''} ${payload?.sede || ''} ${payload?.schoolName || ''} ${hostName} ${hostIp}`.toLowerCase();
        if (text.includes('surco') || text.includes('santiago')) return 'Santiago de Surco';
        if (text.includes('borja')) return 'San Borja';
        if (text.includes('luis')) return 'San Luis';
        if (text.includes('barranco')) return 'Barranco';
        if (text.includes('chorrillos')) return 'Chorrillos';
        if (text.includes('surquillo')) return 'Surquillo';
        if (text.includes('miraflores')) return 'Miraflores';

        // Por subred IP de Laboratorios escolares UGEL 07
        if (hostIp.includes('.30.')) return 'Miraflores';
        if (hostIp.includes('.40.')) return 'San Borja';
        if (hostIp.includes('.50.')) return 'Santiago de Surco';
        if (hostIp.includes('.60.')) return 'Surquillo';
        if (hostIp.includes('.70.')) return 'Chorrillos';
        if (hostIp.includes('.80.')) return 'Barranco';
        if (hostIp.includes('.90.')) return 'San Luis';
        return 'Miraflores';
      };

      const distritoAsignado = detectDistrict();

      const newTicket: StoredWebhookTicket = {
        id: `t-zbx-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        code: `TK-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`,
        title: computedTitle,
        titulo: computedTitle,
        description: computedDesc,
        descripcion: computedDesc,
        origen: 'AUTOMATICO',
        priority: computedPriority,
        status: 'open',
        category: computedTipoFalla === 'Red y Conectividad'
          ? 'networking_connectivity'
          : computedTipoFalla === 'Servidor y Servicios'
          ? 'school_server'
          : 'aip_hardware',
        ugel: 'UGEL 07',
        sede: payload?.sede || `Sede ${distritoAsignado} · ${hostName} (${hostIp})`,
        schoolName: payload?.schoolName || `I.E. Sede ${distritoAsignado} (${hostName})`,
        distrito: distritoAsignado,
        tipoFalla: computedTipoFalla,
        casoNumero: casoNumero,
        casoNombre: casoNombre,
        casoHistoriaJurado: casoHistoriaJurado,
        reporterUserId: 'usr-zabbix-webhook',
        reporterName: `Agente Zabbix (${hostName})`,
        reporterRole: 'Telemetría Proactiva de Red',
        reporterEmail: 'telemetria@ugel07.gob.pe',
        classroomLab: `Estación Virtual: ${hostName} · IP ${hostIp}`,
        createdAt: timeSync.formattedDate,
        horaIncidenciaVM: timeSync.timeOnly,
        vmTimestamp: timeSync.vmTimestamp,
        zonaHorariaVM: 'GMT-5 (UTC-5 Perú / VMware)',
        slaTargetHours: computedPriority === 'urgent' ? 2 : computedPriority === 'high' ? 8 : 24,
        telemetriaZabbix: {
          lastGaspReceived: false,
          heartbeatConsecutiveFails: 3,
          correlationConfidence: 98,
          ipDispositivo: hostIp,
          puertoAfectado: hostName.toLowerCase().includes('switch') ? 'GigabitEthernet0/2 (Trunk)' : 'eth0 / ens33 (10050)',
          latenciaMs: hostName.toLowerCase().includes('cpu') ? 14 : 0,
          perdidaPaquetesPct: hostName.toLowerCase().includes('unreachable') || casoNumero === 1 ? 100 : 0,
          anchoBandaUtilizadoMbps: 12.5,
          ultimoSondeoSnmp: 'Hace 1 seg',
          probableCausa: casoNumero === 1
            ? 'CORTE_FIBRA_OPTICA_TRONCAL'
            : hostName.toLowerCase().includes('switch')
            ? 'CORTE_ENLACE_TRUNK_SWITCH'
            : 'FALLA_LOCAL_AISLADA',
        },
        comments: [
          {
            id: `c-zbx-${Date.now()}`,
            author: 'Zabbix Webhook Controller (Ubuntu / VMware)',
            role: 'Automatización de Incidencias',
            text: `Evento procesado desde Zabbix Server 7.0 LTS en VMware. Host: ${hostName} [${hostIp}]. Evento: ${eventName}. Métrica: ${itemValue}. Severidad: ${severity}. Hora VMware: ${timeSync.timeOnly}. ${casoNombre ? `[${casoNombre}]` : ''}`,
            timestamp: timeSync.timeOnly,
          },
        ],
      };

      receivedTickets = loadCachedTickets();
      receivedTickets.unshift(newTicket);
      if (receivedTickets.length > 50) {
        receivedTickets.pop();
      }
      persistCachedTickets(receivedTickets);

      // Record in live logs
      const logEntry: WebhookLogEntry = {
        id: `log-${Date.now()}`,
        timestamp: timeSync.formattedDate,
        method: req.method,
        path: req.path,
        ip: req.ip || req.socket.remoteAddress || '192.168.40.10',
        hostName: hostName,
        eventName: eventName,
        status: 200,
        message: `Ticket ${newTicket.code} creado exitosamente para host ${hostName}`,
      };
      webhookLogs.unshift(logEntry);
      if (webhookLogs.length > 30) webhookLogs.pop();

      console.log(`[Zabbix Webhook] HTTP 200 OK -> Created ${newTicket.code} for ${hostName} (${eventName})`);

      return res.status(200).json({
        status: 'success',
        message: 'Ticket de incidencia creado exitosamente en EduDesk',
        ticketId: newTicket.id,
        ticketCode: newTicket.code,
        ticket: newTicket,
      });
    } catch (err: any) {
      console.error('[Error in Zabbix Webhook]:', err);
      return res.status(500).json({
        status: 'error',
        message: 'Error al procesar el webhook de Zabbix',
        error: err?.message || String(err),
      });
    }
  }

  return res.status(405).json({ error: 'Method Not Allowed' });
}

// Mount Zabbix Webhook on multiple standard paths
app.all(
  [
    '/api/webhooks/zabbix',
    '/api/webhooks/zabbix/',
    '/api/webhook',
    '/api/webhook/',
    '/webhook',
    '/webhook/',
    '/zabbix',
    '/api/zabbix',
  ],
  handleZabbixWebhook
);

// Fallback: If Zabbix posts to the root '/' path (because URL was configured without /api/webhooks/zabbix)
app.post('/', (req, res, next) => {
  if (req.body && (req.body.host_name || req.body.event_name || req.body.hostname || req.body.origen || req.body.severity)) {
    console.log('[Zabbix Webhook] Detected POST to root / with Zabbix payload. Routing to handler.');
    return handleZabbixWebhook(req, res);
  }
  next();
});

// Logs endpoint for live inspection modal in frontend
app.get('/api/webhooks/logs', (_req, res) => {
  res.json({
    success: true,
    count: webhookLogs.length,
    logs: webhookLogs,
  });
});

// ==========================================
// 2. Tickets API for Frontend Sync
// ==========================================

// GET /api/tickets/recent (frontend polls this to pick up real Zabbix tickets)
app.get('/api/tickets/recent', (_req, res) => {
  const allTickets = loadCachedTickets();
  res.json({
    success: true,
    count: allTickets.length,
    tickets: allTickets,
  });
});

// Health check
app.get('/api/health', (_req, res) => {
  res.json({
    status: 'ok',
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
  });
});

// Descargar todo el código del proyecto en un archivo .ZIP directo
app.get('/api/download-zip', (_req, res) => {
  try {
    res.attachment('Cibertec_Titulacion_Zabbix.zip');
    const archive = new ZipArchive({ zlib: { level: 9 } });

    archive.on('error', (err: any) => {
      console.error('[Archiver Error]:', err);
      res.status(500).send({ error: err.message });
    });

    archive.pipe(res);

    archive.glob('**/*', {
      cwd: __dirname,
      ignore: ['node_modules/**', 'dist/**', '.git/**', '.vercel/**'],
      dot: true,
    });

    archive.finalize();
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Realizar Push directo a GitHub desde la aplicación
app.post('/api/github/push', async (req, res) => {
  try {
    const { token, repoUrl = 'https://github.com/Jamz1986/Cibertec_Titulacion.git', commitMsg = 'feat: actualizar endpoints Zabbix webhook y Vercel serverless' } = req.body;

    if (!token || !String(token).trim()) {
      return res.status(400).json({
        success: false,
        error: 'Se requiere un GitHub Personal Access Token con permisos de "repo".'
      });
    }

    const cleanToken = String(token).trim();
    const cleanRepo = repoUrl.replace('https://github.com/', '').replace('.git', '');
    const authUrl = `https://${cleanToken}@github.com/${cleanRepo}.git`;

    console.log('[Git Push API] Starting git push to', cleanRepo);

    await execPromise('git init', { cwd: __dirname });
    await execPromise('git config user.name "Jamz1986"', { cwd: __dirname });
    await execPromise('git config user.email "l3puma1986@gmail.com"', { cwd: __dirname });
    await execPromise('git branch -M main', { cwd: __dirname });
    await execPromise('git add -A', { cwd: __dirname });

    try {
      await execPromise(`git commit -m "${commitMsg.replace(/"/g, '\\"')}"`, { cwd: __dirname });
    } catch {
      // nothing new to commit is fine
    }

    await execPromise(`git push "${authUrl}" main --force`, { cwd: __dirname });

    console.log('[Git Push API] Git push successful!');
    return res.json({
      success: true,
      message: '¡Código subido exitosamente a GitHub! Vercel iniciará el despliegue automático en segundos.'
    });
  } catch (err: any) {
    console.error('[Git Push API Error]:', err);
    return res.status(500).json({
      success: false,
      error: err.stderr || err.message || 'Error al comunicarse con GitHub. Verifique que el Token tenga permisos "repo".'
    });
  }
});

// ==========================================
// 3. Vite Middleware (Dev) or Static (Prod)
// ==========================================

async function setupServer() {
  const isProduction = process.env.NODE_ENV === 'production';
  const distPath = path.resolve(__dirname, 'dist');
  const distExists = fs.existsSync(distPath);

  if (isProduction && distExists) {
    console.log('[Server] Running in Production mode serving dist...');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(distPath, 'index.html'));
    });
  } else {
    console.log('[Server] Running in Development mode with Vite middleware...');
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`=======================================================`);
    console.log(`EduDesk Full-Stack Server active on http://0.0.0.0:${PORT}`);
    console.log(`Zabbix Webhook POST Endpoint: http://0.0.0.0:${PORT}/api/webhooks/zabbix`);
    console.log(`=======================================================`);
  });
}

setupServer();
