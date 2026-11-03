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

      const title =
        payload?.titulo ||
        payload?.title ||
        `Alerta Zabbix: Falla en ${hostName} (${eventName})`;

      const description =
        payload?.descripcion ||
        payload?.description ||
        `Alerta emitida por Zabbix Server 7.0 (Ubuntu): ${eventName}. Host: ${hostName} (${hostIp}). Métrica: ${itemValue}. Severidad: ${severity}.`;

      const priority = mapZabbixSeverityToPriority(severity);
      const now = new Date();
      const formattedDate = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(
        now.getDate()
      ).padStart(2, '0')} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

      const newTicket: StoredWebhookTicket = {
        id: `t-zbx-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        code: `TK-${now.getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`,
        title: title,
        titulo: title,
        description: description,
        descripcion: description,
        origen: 'AUTOMATICO',
        priority: priority,
        status: 'open',
        category: hostName.toLowerCase().includes('switch') || hostName.toLowerCase().includes('router')
          ? 'networking_connectivity'
          : 'aip_hardware',
        ugel: payload?.ugel || 'UGEL 07',
        sede: payload?.sede || `VMware Lab · ${hostName} (${hostIp})`,
        schoolName: payload?.schoolName || `VMware Lab · ${hostName}`,
        reporterUserId: 'usr-zabbix-webhook',
        reporterName: `Agente Zabbix (${hostName})`,
        reporterRole: 'Telemetría Proactiva de Red',
        reporterEmail: 'telemetria@ugel07.gob.pe',
        classroomLab: `Estación Virtual: ${hostName} · IP ${hostIp}`,
        createdAt: formattedDate,
        slaTargetHours: priority === 'urgent' ? 2 : priority === 'high' ? 8 : 24,
        telemetriaZabbix: {
          lastGaspReceived: false,
          heartbeatConsecutiveFails: 3,
          correlationConfidence: 96,
          ipDispositivo: hostIp,
          puertoAfectado: hostName.toLowerCase().includes('switch') ? 'GigabitEthernet0/2 (Trunk)' : 'eth0 / ens33 (10050)',
          latenciaMs: hostName.toLowerCase().includes('cpu') ? 14 : 0,
          perdidaPaquetesPct: hostName.toLowerCase().includes('unreachable') ? 100 : 0,
          anchoBandaUtilizadoMbps: 12.5,
          ultimoSondeoSnmp: 'Hace 2 seg',
          probableCausa: hostName.toLowerCase().includes('switch')
            ? 'CORTE_ENLACE_TRUNK_SWITCH'
            : 'FALLA_LOCAL_AISLADA',
        },
        comments: [
          {
            id: `c-zbx-${Date.now()}`,
            author: 'Zabbix Webhook Controller (Ubuntu / VMware)',
            role: 'Automatización de Incidencias',
            text: `Evento procesado automáticamente desde Zabbix Server 7.0 LTS. Host: ${hostName} [${hostIp}]. Evento: ${eventName}. Métrica: ${itemValue}. Severidad: ${severity}.`,
            timestamp: 'Hace instantes',
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
        timestamp: formattedDate,
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
