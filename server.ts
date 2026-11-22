import express from 'express';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';
import { exec } from 'child_process';
import util from 'util';
import {
  authenticateUser,
  claimInitialAdmin,
  createUserByAdmin,
  getAuthStatus,
  getPublicTechnicians,
  listUsersForAdmin,
  UserRole,
  verifyBearerToken,
} from './api/_auth.js';
import { aggregateHostsFromWebhookTickets } from './api/_hosts.js';
import { getMonitoringRules, saveMonitoringRules } from './api/_rules.js';

const require = createRequire(import.meta.url);
const { ZipArchive } = require('archiver');

const execPromise = util.promisify(exec);

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = Number(process.env.PORT) || 3000;

// Public CORS only for Zabbix webhooks and Power BI / recent polling
const publicWebhookCors = cors({
  origin: '*',
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'X-Requested-With', 'Accept', 'Origin'],
});

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
  casoNumero?: 1 | 2 | 3 | 4;
  casoNombre?: string;
  eventoZabbixId?: string;
  hostName?: string;
  rawEventName?: string;
  estadoEvento?: 'PROBLEM' | 'RESOLVED';
  valorActual?: string;
  tipoDispositivo?: string;
  ubicacion?: string;
  asignadoA?: string;
  assignedTechnician?: string;
  acknowledgedBy?: string;
  acknowledgedAt?: string;
  duplicateAlertCount?: number;
  metricsSnapshot?: {
    cpu?: string | null;
    ram?: string | null;
    disco?: string | null;
  };
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

// Regla de Mapeo de severity (Zabbix) -> prioridad (EduDesk):
// Disaster / High -> URGENTE ('urgent')
// Average -> ALTA ('high')
// Warning -> MEDIA ('medium')
// Information -> BAJA ('low')
function mapZabbixSeverityToPriority(severity?: string): 'low' | 'medium' | 'high' | 'urgent' {
  if (!severity) return 'urgent';
  const s = String(severity).toLowerCase().trim();
  if (s.includes('disaster') || s.includes('desastre') || s.includes('high') || s.includes('alta') || s.includes('alto') || s === '5' || s === '4') {
    return 'urgent';
  }
  if (s.includes('average') || s.includes('alta_media') || s === '3') {
    return 'high';
  }
  if (s.includes('warning') || s.includes('advertencia') || s.includes('media') || s.includes('medio') || s === '2') {
    return 'medium';
  }
  if (s.includes('info') || s.includes('information') || s.includes('baja') || s.includes('not classified') || s === '1' || s === '0') {
    return 'low';
  }
  return 'urgent';
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

      const eventoZabbixId = String(
        payload?.evento_zabbix_id ||
          payload?.event_id ||
          payload?.EVENT_ID ||
          ''
      ).trim();

      const hostName = String(
        payload?.host_name ||
          payload?.hostname ||
          payload?.host ||
          payload?.HOST ||
          payload?.equipo ||
          payload?.target ||
          'PC-ALUMNO-01'
      ).trim();

      const hostIp = String(
        payload?.ip ||
          payload?.host_ip ||
          payload?.ipDispositivo ||
          payload?.IP ||
          payload?.ip_address ||
          '192.168.30.15'
      ).trim();

      const tipoDispositivo = String(
        payload?.tipo_dispositivo || payload?.device_type || 'PC'
      ).trim();

      const ubicacion = String(
        payload?.ubicacion || payload?.location || payload?.classroomLab || ''
      ).trim();

      const eventName = String(
        payload?.event_name ||
          payload?.trigger_name ||
          payload?.event ||
          payload?.subject ||
          ''
      ).trim();

      const rawMensajeFalla = String(
        payload?.mensaje_falla ||
          payload?.mensaje ||
          payload?.descripcion ||
          payload?.description ||
          ''
      ).trim();

      const severity = String(
        payload?.severity ||
          payload?.severidad ||
          payload?.SEVERITY ||
          payload?.event_severity ||
          'High'
      ).trim();

      const itemValue = String(
        payload?.valor_actual ||
          payload?.item_value ||
          payload?.valor ||
          payload?.metric ||
          payload?.item ||
          'N/A'
      ).trim();

      const fechaIncidenteRaw = String(
        payload?.fecha_incidente || payload?.fecha || ''
      ).trim();

      const estadoEventoRaw = String(
        payload?.estado_evento || payload?.event_status || 'PROBLEM'
      )
        .trim()
        .toUpperCase();
      const estadoEvento: 'PROBLEM' | 'RESOLVED' =
        estadoEventoRaw === '0' ||
        estadoEventoRaw === 'RESOLVED' ||
        estadoEventoRaw === 'RESUELTO' ||
        estadoEventoRaw === 'OK'
          ? 'RESOLVED'
          : 'PROBLEM';

      // Sincronización horaria estricta con la Máquina Virtual (VMware / Zabbix Server) en GMT-5 (UTC-5)
      const parsePeruTime = (
        rawFechaIncidente?: string,
        rawClock?: any,
        rawTime?: any,
        rawDate?: any
      ) => {
        if (rawFechaIncidente) {
          const normalized = rawFechaIncidente.replace(/\./g, '-').trim();
          const dateTimeMatch = normalized.match(
            /^(\d{4}-\d{2}-\d{2})[T\s]+(\d{2}:\d{2}(?::\d{2})?)/
          );
          if (dateTimeMatch) {
            const dPart = dateTimeMatch[1];
            const tPart =
              dateTimeMatch[2].length === 5
                ? `${dateTimeMatch[2]}:00`
                : dateTimeMatch[2];
            return {
              formattedDate: `${dPart} ${tPart}`,
              timeOnly: `${tPart} (GMT-5)`,
              vmTimestamp: `${dPart} ${tPart} (GMT-5 / UTC-5)`,
            };
          }
        }

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

        const cleanRawDate = rawDate ? String(rawDate).replace(/\./g, '-') : '';
        const finalTimeOnly = rawTime ? `${rawTime} (GMT-5)` : timeOnly;
        const finalTimestamp =
          cleanRawDate && rawTime
            ? `${cleanRawDate} ${rawTime} (GMT-5 / UTC-5)`
            : `${dateFormatted} (GMT-5 / UTC-5)`;

        return {
          formattedDate: dateFormatted,
          timeOnly: finalTimeOnly,
          vmTimestamp: finalTimestamp,
        };
      };

      const timeSync = parsePeruTime(
        fechaIncidenteRaw,
        payload?.clock || payload?.timestamp || payload?.EVENT_CLOCK,
        payload?.event_time || payload?.time || payload?.EVENT_TIME,
        payload?.event_date || payload?.date || payload?.EVENT_DATE
      );

      // =========================================================================
      // Deduplicación: Verificar alerta abierta con mismo evento_zabbix_id o host_name + event_name
      // =========================================================================
      receivedTickets = loadCachedTickets();
      const effectiveRawEvent = eventName || `Incidencia automática en ${hostName}`;

      const matchingIndex = receivedTickets.findIndex((t) => {
        if (t.status === 'resolved' || t.status === 'closed') return false;
        if (
          eventoZabbixId &&
          t.eventoZabbixId &&
          String(t.eventoZabbixId) === eventoZabbixId
        ) {
          return true;
        }
        if (
          eventName &&
          t.hostName &&
          t.rawEventName &&
          t.hostName.toLowerCase() === hostName.toLowerCase() &&
          t.rawEventName.toLowerCase() === effectiveRawEvent.toLowerCase()
        ) {
          return true;
        }
        return false;
      });

      const rulesConfig = getMonitoringRules();
      const findRule = (id: string) => rulesConfig.rules.find((r) => r.id === id);

      if (estadoEvento === 'RESOLVED') {
        if (matchingIndex !== -1 && rulesConfig.autoResolverConOk) {
          const existing = receivedTickets[matchingIndex];
          existing.status = 'resolved';
          existing.estadoEvento = 'RESOLVED';
          existing.valorActual = itemValue;
          existing.comments = [
            ...(existing.comments || []),
            {
              id: `c-zbx-res-${Date.now()}`,
              author: 'Zabbix Webhook Controller (Ubuntu / VMware)',
              role: 'Recuperación Automática',
              text: `Evento marcado como RESOLVED desde Zabbix. Host: ${hostName} [${hostIp}]. Valor actual: ${itemValue}. Hora VMware: ${timeSync.timeOnly}.`,
              timestamp: timeSync.timeOnly,
            },
          ];
          persistCachedTickets(receivedTickets);
          webhookLogs.unshift({
            id: `log-${Date.now()}`,
            timestamp: timeSync.formattedDate,
            method: req.method,
            path: req.path,
            ip: hostIp,
            hostName,
            eventName: `[RESOLVED] ${effectiveRawEvent}`,
            status: 200,
            message: `Ticket ${existing.code} marcado como resuelto por recuperación en Zabbix`,
          });
          if (webhookLogs.length > 30) webhookLogs.pop();

          return res.status(200).json({
            status: 'success',
            resolved: true,
            message: `Ticket ${existing.code} actualizado a Resuelto en EduDesk`,
            ticketId: existing.id,
            ticketCode: existing.code,
            ticket: existing,
          });
        }

        return res.status(200).json({
          status: 'success',
          resolved: true,
          message: rulesConfig.autoResolverConOk
            ? 'Evento RESOLVED procesado (sin ticket abierto pendiente).'
            : 'Evento RESOLVED recibido (cierre automático deshabilitado por regla de monitoreo).',
        });
      }

      if (matchingIndex !== -1 && rulesConfig.deduplicarAlertas) {
        const existing = receivedTickets[matchingIndex];
        existing.valorActual = itemValue;
        existing.horaIncidenciaVM = timeSync.timeOnly;
        existing.vmTimestamp = timeSync.vmTimestamp;
        existing.duplicateAlertCount = (existing.duplicateAlertCount || 0) + 1;

        // Actualizar métricas reales solo si Zabbix las envió en este evento
        const dupNorm = `${eventName} ${rawMensajeFalla}`.toLowerCase();
        const nextSnap = { ...(existing.metricsSnapshot || {}) };
        if (payload?.cpu !== undefined && payload?.cpu !== null && String(payload.cpu).trim() !== '') {
          nextSnap.cpu = String(payload.cpu).trim();
        } else if ((dupNorm.includes('cpu') || dupNorm.includes('procesador')) && itemValue !== 'N/A') {
          nextSnap.cpu = itemValue;
        }
        if (payload?.ram !== undefined && payload?.ram !== null && String(payload.ram).trim() !== '') {
          nextSnap.ram = String(payload.ram).trim();
        } else if ((dupNorm.includes('ram') || dupNorm.includes('memoria') || dupNorm.includes('memory')) && itemValue !== 'N/A') {
          nextSnap.ram = itemValue;
        }
        if ((payload?.disco ?? payload?.disk) !== undefined && String(payload?.disco ?? payload?.disk).trim() !== '') {
          nextSnap.disco = String(payload?.disco ?? payload?.disk).trim();
        } else if ((dupNorm.includes('disco') || dupNorm.includes('disk') || dupNorm.includes('filesystem') || dupNorm.includes('storage')) && itemValue !== 'N/A') {
          nextSnap.disco = itemValue;
        }
        if (Object.keys(nextSnap).length > 0) {
          existing.metricsSnapshot = nextSnap;
        }

        persistCachedTickets(receivedTickets);

        webhookLogs.unshift({
          id: `log-${Date.now()}`,
          timestamp: timeSync.formattedDate,
          method: req.method,
          path: req.path,
          ip: hostIp,
          hostName,
          eventName: `[DEDUP] ${effectiveRawEvent}`,
          status: 200,
          message: `Evento deduplicado: ticket abierto ${existing.code} ya activo`,
        });
        if (webhookLogs.length > 30) webhookLogs.pop();

        return res.status(200).json({
          status: 'success',
          deduplicated: true,
          message: `Alerta deduplicada: el ticket ${existing.code} sigue abierto para este incidente`,
          ticketId: existing.id,
          ticketCode: existing.code,
          ticket: existing,
        });
      }

      // =========================================================================
      // Detección y Clasificación de Escenarios (Casos 1, 2, 3 y 4: RAM > 85%)
      // =========================================================================
      const normEvent = `${eventName} ${rawMensajeFalla} ${payload?.titulo || ''} ${payload?.descripcion || ''}`.toLowerCase();

      const cleanTitlePrefix = (str: string) =>
        str
          .replace(/\[Caso \d:[^\]]+\]/gi, '')
          .replace(/Alerta Zabbix SNMP:\s*/gi, '')
          .replace(/Alerta Zabbix:\s*/gi, '')
          .replace(/Zabbix:\s*/gi, '')
          .replace(/^Windows:\s*/gi, '')
          .replace(/^Linux:\s*/gi, '')
          .trim();

      let casoNumero: 1 | 2 | 3 | 4 | undefined = undefined;
      let casoNombre: string | undefined = undefined;
      let computedTitle = '';
      let defaultMensajeFalla = '';
      let computedPriority: 'urgent' | 'high' | 'medium' | 'low' =
        mapZabbixSeverityToPriority(severity);
      let computedTipoFalla:
        | 'Red y Conectividad'
        | 'Hardware Aula / AIP'
        | 'Servidor y Servicios'
        | 'Suministro Eléctrico'
        | 'Software Educativo' = 'Hardware Aula / AIP';
      let matchedRuleId: 'cpu_overload' | 'ram_saturation' | 'network_disconnect' | 'agent_service_down' | null = null;

      if (
        normEvent.includes('ram') ||
        normEvent.includes('memoria') ||
        normEvent.includes('memory') ||
        normEvent.includes('vm.memory') ||
        normEvent.includes('pavailable') ||
        normEvent.includes('>85') ||
        normEvent.includes('umbral del 85')
      ) {
        // Caso 4: Saturación de Memoria RAM (> umbral configurado)
        matchedRuleId = 'ram_saturation';
        const ramRule = findRule('ram_saturation');
        const ramUmbral = ramRule?.umbral ?? 85;
        casoNumero = 4;
        casoNombre = `Caso 4: Saturación de Memoria RAM (>${ramUmbral}%)`;
        const cleanedEvent = cleanTitlePrefix(eventName);
        if (
          cleanedEvent &&
          (cleanedEvent.toLowerCase().includes('ram') ||
            cleanedEvent.toLowerCase().includes('memoria')) &&
          !cleanedEvent.toLowerCase().includes('high memory utilization')
        ) {
          computedTitle = cleanedEvent.includes(hostName)
            ? cleanedEvent
            : `${cleanedEvent} · ${hostName}`;
        } else {
          computedTitle = `Saturación Crítica de Memoria RAM (>${ramUmbral}%) · ${hostName}`;
        }
        defaultMensajeFalla = `Consumo de memoria RAM supera el umbral crítico del ${ramUmbral}% en ${hostName}.`;
        computedTipoFalla = 'Hardware Aula / AIP';
      } else if (
        normEvent.includes('link down') ||
        normEvent.includes('interface') ||
        normEvent.includes('not available') ||
        normEvent.includes('nodata') ||
        normEvent.includes('unreachable') ||
        normEvent.includes('desconexion') ||
        normEvent.includes('cable') ||
        normEvent.includes('desconexión') ||
        normEvent.includes('tcp 10051') ||
        normEvent.includes('30s')
      ) {
        // Caso 1: Desconexión Física de Red (Disponibilidad / Red)
        matchedRuleId = 'network_disconnect';
        casoNumero = 1;
        casoNombre = 'Caso 1: Desconexión Física de Red (Disponibilidad / Red)';
        const cleanedEvent = cleanTitlePrefix(eventName);
        if (normEvent.includes('link down')) {
          computedTitle = `Desconexión de Enlace de Red (Ethernet Link Down) · ${hostName}`;
        } else if (cleanedEvent && cleanedEvent.toLowerCase().includes('desconexi')) {
          computedTitle = cleanedEvent.includes(hostName)
            ? cleanedEvent
            : `${cleanedEvent} · ${hostName}`;
        } else {
          computedTitle = `Desconexión Física de Cable de Red (Pérdida Total de Enlace) · ${hostName}`;
        }
        defaultMensajeFalla = `Pérdida total de enlace en ${hostName} por desconexión física de red o falta de respuesta del agente.`;
        computedTipoFalla = 'Red y Conectividad';
      } else if (
        normEvent.includes('cpu') ||
        normEvent.includes('procesador') ||
        normEvent.includes('>95') ||
        normEvent.includes('utilization') ||
        normEvent.includes('sobrecarga')
      ) {
        // Caso 2: Sobrecarga de Procesador (Rendimiento / Telemetría)
        matchedRuleId = 'cpu_overload';
        const cpuRule = findRule('cpu_overload');
        const cpuUmbral = cpuRule?.umbral ?? 95;
        casoNumero = 2;
        casoNombre = 'Caso 2: Sobrecarga de Procesador (Rendimiento / Telemetría)';
        computedTitle = `Sobrecarga Crítica de Procesador CPU (>${cpuUmbral}%) · ${hostName}`;
        defaultMensajeFalla = `Saturación crítica de CPU en ${hostName}. El monitoreo advierte la saturación antes de que el equipo colapse.`;
        computedTipoFalla = 'Hardware Aula / AIP';
      } else if (
        normEvent.includes('service is not running') ||
        normEvent.includes('active checks are not available') ||
        normEvent.includes('service') ||
        normEvent.includes('servicio') ||
        normEvent.includes('agent service')
      ) {
        // Caso 3: Interrupción de Servicio Crítico (Estado de Agentes)
        matchedRuleId = 'agent_service_down';
        casoNumero = 3;
        casoNombre = 'Caso 3: Interrupción de Servicio Crítico (Estado de Agentes)';
        computedTitle = `Interrupción de Servicio Crítico del Agente de Monitoreo · ${hostName}`;
        defaultMensajeFalla = `Servicio de monitoreo detenido en ${hostName} por falla inesperada o detención de procesos de control.`;
        computedTipoFalla = 'Servidor y Servicios';
      } else if (normEvent.includes('restarted') || normEvent.includes('reinicio')) {
        computedTitle = `Reinicio Inesperado de Estación de Trabajo · ${hostName}`;
        defaultMensajeFalla = `La estación de trabajo ${hostName} experimentó un reinicio o apagado no programado.`;
        computedTipoFalla = 'Hardware Aula / AIP';
      } else {
        let clean = cleanTitlePrefix(eventName);
        if (!clean || clean.toLowerCase().startsWith('falla en')) {
          clean = `Incidencia automática en ${hostName}`;
        }
        computedTitle = clean.includes(hostName) ? clean : `${clean} · ${hostName}`;
        defaultMensajeFalla = `Incidencia técnica detectada automáticamente en ${hostName}.`;
        computedTipoFalla =
          hostName.toLowerCase().includes('switch') ||
          hostName.toLowerCase().includes('router')
            ? 'Red y Conectividad'
            : 'Hardware Aula / AIP';
      }

      if (matchedRuleId) {
        const activeRule = findRule(matchedRuleId);
        if (activeRule && !activeRule.habilitada) {
          return res.status(200).json({
            status: 'success',
            ignoredByRule: true,
            message: `Evento recibido pero omitido porque la regla "${activeRule.nombre}" está deshabilitada por el administrador.`,
          });
        }
        if (activeRule && rulesConfig.updatedBy !== 'Sistema EduDesk') {
          computedPriority = activeRule.prioridad;
        }
      }

      // Regla de descripción recomendada:
      // mensaje_falla + " | Host: " + host_name + " | IP: " + ip + " | Valor: " + valor_actual
      const mensajeBase = rawMensajeFalla || defaultMensajeFalla;
      const computedDesc = `${mensajeBase} | Host: ${hostName} | IP: ${hostIp} | Valor: ${itemValue}`;

      // Determinar Distrito (Miraflores, San Borja, Santiago de Surco, San Luis, Barranco, Chorrillos, Surquillo)
      const detectDistrict = ():
        | 'Miraflores'
        | 'San Borja'
        | 'Santiago de Surco'
        | 'San Luis'
        | 'Barranco'
        | 'Chorrillos'
        | 'Surquillo' => {
        const text = `${payload?.distrito || ''} ${payload?.district || ''} ${payload?.sede || ''} ${payload?.schoolName || ''} ${ubicacion} ${hostName} ${hostIp}`.toLowerCase();
        if (text.includes('surco') || text.includes('santiago')) return 'Santiago de Surco';
        if (text.includes('borja')) return 'San Borja';
        if (text.includes('luis')) return 'San Luis';
        if (text.includes('barranco')) return 'Barranco';
        if (text.includes('chorrillos')) return 'Chorrillos';
        if (text.includes('surquillo')) return 'Surquillo';
        if (text.includes('miraflores')) return 'Miraflores';

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
        category:
          computedTipoFalla === 'Red y Conectividad'
            ? 'networking_connectivity'
            : computedTipoFalla === 'Servidor y Servicios'
            ? 'school_server'
            : 'aip_hardware',
        ugel: 'Mesa de Ayuda',
        sede: payload?.sede || `Sede ${distritoAsignado} · ${hostName} (${hostIp})`,
        schoolName: payload?.schoolName || `I.E. Sede ${distritoAsignado} (${hostName})`,
        distrito: distritoAsignado,
        tipoFalla: computedTipoFalla,
        casoNumero: casoNumero,
        casoNombre: casoNombre,
        eventoZabbixId: eventoZabbixId || undefined,
        hostName,
        rawEventName: effectiveRawEvent,
        estadoEvento,
        valorActual: itemValue,
        tipoDispositivo,
        ubicacion: ubicacion || undefined,
        duplicateAlertCount: 0,
        metricsSnapshot: (() => {
          const snap: { cpu?: string | null; ram?: string | null; disco?: string | null } = {};
          if (payload?.cpu !== undefined && payload?.cpu !== null && String(payload.cpu).trim() !== '') {
            snap.cpu = String(payload.cpu).trim();
          } else if (casoNumero === 2 && itemValue !== 'N/A') {
            snap.cpu = itemValue;
          }
          if (payload?.ram !== undefined && payload?.ram !== null && String(payload.ram).trim() !== '') {
            snap.ram = String(payload.ram).trim();
          } else if (casoNumero === 4 && itemValue !== 'N/A') {
            snap.ram = itemValue;
          }
          if ((payload?.disco ?? payload?.disk) !== undefined && String(payload?.disco ?? payload?.disk).trim() !== '') {
            snap.disco = String(payload?.disco ?? payload?.disk).trim();
          } else if (
            (normEvent.includes('disco') || normEvent.includes('disk') || normEvent.includes('filesystem') || normEvent.includes('storage')) &&
            itemValue !== 'N/A'
          ) {
            snap.disco = itemValue;
          }
          return Object.keys(snap).length > 0 ? snap : undefined;
        })(),
        reporterUserId: 'usr-zabbix-webhook',
        reporterName: `Sensor de Monitoreo (${hostName})`,
        reporterRole: 'Telemetría Proactiva de Red',
        reporterEmail: 'telemetria@edudesk.edu.pe',
        classroomLab: ubicacion
          ? `${ubicacion} · ${hostName} (${hostIp})`
          : `Estación Virtual (${tipoDispositivo}): ${hostName} · IP ${hostIp}`,
        createdAt: timeSync.formattedDate,
        horaIncidenciaVM: timeSync.timeOnly,
        vmTimestamp: timeSync.vmTimestamp,
        zonaHorariaVM: 'GMT-5 (UTC-5 Perú / VMware)',
        slaTargetHours:
          computedPriority === 'urgent' ? 2 : computedPriority === 'high' ? 8 : computedPriority === 'medium' ? 24 : 48,
        telemetriaZabbix: {
          lastGaspReceived: false,
          heartbeatConsecutiveFails: casoNumero === 1 ? 4 : 2,
          correlationConfidence: 98,
          ipDispositivo: hostIp,
          puertoAfectado: hostName.toLowerCase().includes('switch')
            ? 'GigabitEthernet0/2 (Trunk)'
            : 'eth0 / ens33 (10050)',
          latenciaMs: casoNumero === 1 ? 0 : 14,
          perdidaPaquetesPct:
            normEvent.includes('unreachable') || casoNumero === 1 ? 100 : 0,
          anchoBandaUtilizadoMbps: casoNumero === 1 ? 0 : 12.5,
          ultimoSondeoSnmp: 'Hace 1 seg',
          probableCausa:
            casoNumero === 1
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
            text: `Evento procesado desde Zabbix Server 7.0 LTS en VMware. Host: ${hostName} [${hostIp}]. Evento: ${effectiveRawEvent}. Métrica: ${itemValue}. Severidad: ${severity}. Hora VMware: ${timeSync.timeOnly}. ${casoNombre ? `[${casoNombre}]` : ''}`,
            timestamp: timeSync.timeOnly,
          },
        ],
      };

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
        ip: req.ip || req.socket.remoteAddress || hostIp,
        hostName: hostName,
        eventName: effectiveRawEvent,
        status: 200,
        message: `Ticket ${newTicket.code} creado exitosamente para host ${hostName}`,
      };
      webhookLogs.unshift(logEntry);
      if (webhookLogs.length > 30) webhookLogs.pop();

      console.log(`[Zabbix Webhook] HTTP 200 OK -> Created ${newTicket.code} for ${hostName} (${effectiveRawEvent})`);

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

// Mount Zabbix Webhook on multiple standard paths (public CORS for Zabbix VMware)
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
  publicWebhookCors,
  handleZabbixWebhook
);

// Fallback: If Zabbix posts to the root '/' path (because URL was configured without /api/webhooks/zabbix)
app.post('/', publicWebhookCors, (req, res, next) => {
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
// 1b. Auth & Role-Protected Endpoints (CU-06, CU-07, CU-10)
// ==========================================

app.get('/api/auth/status', (_req, res) => {
  res.json(getAuthStatus());
});

app.post('/api/auth/bootstrap', (req, res) => {
  const result = claimInitialAdmin({
    username: req.body?.username,
    nombre: req.body?.nombre,
    email: req.body?.email,
    password: req.body?.password,
  });
  return res.status(result.success ? 200 : 400).json(result);
});

app.post('/api/auth/login', (req, res) => {
  const result = authenticateUser(
    req.body?.identifier || req.body?.username || '',
    req.body?.password || ''
  );
  return res.status(result.success ? 200 : 401).json(result);
});

app.get('/api/auth/me', (req, res) => {
  const user = verifyBearerToken(req.headers.authorization);
  if (!user) {
    return res.status(401).json({ success: false, error: 'Sesión no válida o expirada.' });
  }
  return res.json({ success: true, user });
});

app.get('/api/auth/users', (req, res) => {
  const user = verifyBearerToken(req.headers.authorization);
  if (!user) {
    return res.status(401).json({ success: false, error: 'Se requiere autenticación.' });
  }
  if (user.rol !== 'ADMIN') {
    return res.status(403).json({ success: false, error: 'Solo el administrador puede gestionar usuarios.' });
  }
  return res.json({ success: true, users: listUsersForAdmin() });
});

app.post('/api/auth/users', (req, res) => {
  const user = verifyBearerToken(req.headers.authorization);
  if (!user) {
    return res.status(401).json({ success: false, error: 'Se requiere autenticación.' });
  }
  if (user.rol !== 'ADMIN') {
    return res.status(403).json({ success: false, error: 'Solo el administrador puede crear cuentas.' });
  }
  const result = createUserByAdmin({
    username: req.body?.username,
    nombre: req.body?.nombre,
    email: req.body?.email,
    rol: req.body?.rol as UserRole,
    password: req.body?.password,
  });
  return res.status(result.success ? 200 : 400).json(result);
});

app.get('/api/technicians', (req, res) => {
  const user = verifyBearerToken(req.headers.authorization);
  if (!user) {
    return res.status(401).json({ success: false, error: 'Se requiere autenticación.' });
  }
  return res.json({ success: true, technicians: getPublicTechnicians() });
});

// Configurar Reglas de Monitoreo (solo ADMIN)
app.get('/api/monitoring-rules', (req, res) => {
  const user = verifyBearerToken(req.headers.authorization);
  if (!user) {
    return res.status(401).json({ success: false, error: 'Se requiere autenticación.' });
  }
  if (user.rol !== 'ADMIN') {
    return res.status(403).json({
      success: false,
      error: 'Solo el administrador puede consultar o configurar las reglas de monitoreo.',
    });
  }
  return res.json({ success: true, config: getMonitoringRules() });
});

app.put('/api/monitoring-rules', (req, res) => {
  const user = verifyBearerToken(req.headers.authorization);
  if (!user) {
    return res.status(401).json({ success: false, error: 'Se requiere autenticación.' });
  }
  if (user.rol !== 'ADMIN') {
    return res.status(403).json({
      success: false,
      error: 'Solo el administrador puede modificar las reglas de monitoreo.',
    });
  }
  const result = saveMonitoringRules(req.body || {}, user.nombre);
  return res.status(result.success ? 200 : 400).json(result);
});

// CU-10: Monitorear estado de red y equipos (solo ADMIN y TECNICO)
app.get('/api/hosts', (req, res) => {
  const user = verifyBearerToken(req.headers.authorization);
  if (!user) {
    return res.status(401).json({ success: false, error: 'Se requiere autenticación.' });
  }
  if (user.rol !== 'ADMIN' && user.rol !== 'TECNICO') {
    return res.status(403).json({
      success: false,
      error: 'Acceso restringido a roles ADMIN o TECNICO.',
    });
  }
  const allTickets = loadCachedTickets();
  const hosts = aggregateHostsFromWebhookTickets(allTickets);
  return res.json({
    success: true,
    count: hosts.length,
    hosts,
  });
});

// CU-06: Aceptar alerta automática (solo ADMIN y TECNICO)
app.patch('/api/tickets/:id/acknowledge', (req, res) => {
  const user = verifyBearerToken(req.headers.authorization);
  if (!user) {
    return res.status(401).json({ success: false, error: 'Se requiere autenticación.' });
  }
  if (user.rol !== 'ADMIN' && user.rol !== 'TECNICO') {
    return res.status(403).json({
      success: false,
      error: 'Solo un técnico o administrador puede aceptar la alerta.',
    });
  }

  const targetId = String(req.params.id || '').trim();
  const cache = loadCachedTickets();
  const idx = cache.findIndex((t) => t.id === targetId);
  if (idx === -1) {
    return res.status(404).json({ success: false, error: 'Ticket no encontrado en caché del servidor.' });
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
  const parts = formatter.formatToParts(new Date());
  const map: Record<string, string> = {};
  for (const p of parts) map[p.type] = p.value;
  const ackAt = `${map.year}-${map.month}-${map.day} ${map.hour}:${map.minute}:${map.second} (GMT-5)`;

  cache[idx].acknowledgedBy = user.nombre;
  cache[idx].acknowledgedAt = ackAt;
  persistCachedTickets(cache);

  return res.json({
    success: true,
    ticket: cache[idx],
  });
});

// CU-07: Asignar ticket a técnico (solo ADMIN / Coordinador)
app.patch('/api/tickets/:id/assign', (req, res) => {
  const user = verifyBearerToken(req.headers.authorization);
  if (!user) {
    return res.status(401).json({ success: false, error: 'Se requiere autenticación.' });
  }
  if (user.rol !== 'ADMIN') {
    return res.status(403).json({
      success: false,
      error: 'Solo el coordinador (ADMIN) puede asignar técnicos.',
    });
  }

  const asignadoA = String(req.body?.asignadoA || '').trim();
  if (!asignadoA) {
    return res.status(400).json({ success: false, error: 'Debe indicar el técnico asignado.' });
  }

  const targetId = String(req.params.id || '').trim();
  const cache = loadCachedTickets();
  const idx = cache.findIndex((t) => t.id === targetId);
  if (idx === -1) {
    return res.status(404).json({ success: false, error: 'Ticket no encontrado en caché del servidor.' });
  }

  const formatter = new Intl.DateTimeFormat('es-PE', {
    timeZone: 'America/Lima',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });
  const timeStr = `${formatter.format(new Date())} (GMT-5)`;

  const prevStatus = cache[idx].status;
  cache[idx].asignadoA = asignadoA;
  cache[idx].assignedTechnician = asignadoA;
  if (prevStatus === 'open') {
    cache[idx].status = 'in_progress';
  }
  cache[idx].comments = [
    ...(cache[idx].comments || []),
    {
      id: `c-assign-${Date.now()}`,
      author: user.nombre,
      role: 'Coordinador / Admin',
      text:
        prevStatus === 'open'
          ? `Ticket asignado al técnico: ${asignadoA}. Estado actualizado automáticamente a "En Progreso".`
          : `Ticket asignado al técnico: ${asignadoA}.`,
      timestamp: timeStr,
    },
  ];
  persistCachedTickets(cache);

  return res.json({
    success: true,
    ticket: cache[idx],
  });
});

// ==========================================
// 2. Tickets API for Frontend Sync
// ==========================================

// GET /api/tickets/recent (frontend polls this to pick up real Zabbix tickets)
app.get('/api/tickets/recent', publicWebhookCors, (_req, res) => {
  const allTickets = loadCachedTickets();
  res.json({
    success: true,
    count: allTickets.length,
    tickets: allTickets,
  });
});

// Power BI Flat JSON Dataset Endpoint (Web.Contents ready)
app.get('/api/export/powerbi', (_req, res) => {
  const allTickets = loadCachedTickets();
  const rows = allTickets.map((t) => ({
    Codigo_Ticket: t.code,
    Fecha_Hora_GMT5: t.createdAt,
    Hora_VM: t.horaIncidenciaVM || t.createdAt,
    Distrito: t.distrito || 'Miraflores',
    Institucion_Educativa: t.schoolName,
    Ambiente_Laboratorio: t.classroomLab,
    Tipo_Falla: t.tipoFalla || 'Hardware Aula / AIP',
    Prioridad: t.priority,
    Estado: t.status,
    Origen: t.origen,
    SLA_Objetivo_Horas: t.slaTargetHours,
    Titulo_Problema: t.title,
    Reportante: t.reporterName,
    IP_Dispositivo: t.telemetriaZabbix?.ipDispositivo || '',
    Latencia_ms: t.telemetriaZabbix?.latenciaMs ?? 0,
    Perdida_Paquetes_Pct: t.telemetriaZabbix?.perdidaPaquetesPct ?? 0,
  }));
  res.header('Access-Control-Allow-Origin', '*');
  res.json(rows);
});

// Power BI CSV Endpoint
app.get('/api/export/powerbi.csv', (_req, res) => {
  const allTickets = loadCachedTickets();
  const headers = [
    'Codigo_Ticket',
    'Fecha_Hora_GMT5',
    'Hora_VM',
    'Distrito',
    'Institucion_Educativa',
    'Ambiente_Laboratorio',
    'Tipo_Falla',
    'Prioridad',
    'Estado',
    'Origen',
    'SLA_Objetivo_Horas',
    'Titulo_Problema',
    'Reportante',
    'IP_Dispositivo',
    'Latencia_ms',
    'Perdida_Paquetes_Pct',
  ];
  const esc = (v: unknown) => `"${String(v ?? '').replace(/"/g, '""')}"`;
  const csvLines = [
    headers.join(','),
    ...allTickets.map((t) =>
      [
        t.code,
        t.createdAt,
        t.horaIncidenciaVM || t.createdAt,
        t.distrito || 'Miraflores',
        t.schoolName,
        t.classroomLab,
        t.tipoFalla || 'Hardware Aula / AIP',
        t.priority,
        t.status,
        t.origen,
        t.slaTargetHours,
        t.title,
        t.reporterName,
        t.telemetriaZabbix?.ipDispositivo || '',
        t.telemetriaZabbix?.latenciaMs ?? 0,
        t.telemetriaZabbix?.perdidaPaquetesPct ?? 0,
      ]
        .map(esc)
        .join(',')
    ),
  ];
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Content-Type', 'text/csv; charset=utf-8');
  res.header('Content-Disposition', 'attachment; filename="EduDesk_Fallas_Distrito_PowerBI.csv"');
  res.send('\uFEFF' + csvLines.join('\r\n'));
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

  // Background real-time synchronization from Vercel endpoint
  async function syncFromVercel() {
    try {
      const res = await fetch('https://cibertec-titulacion.vercel.app/api/webhooks/zabbix');
      if (res.ok) {
        const data: any = await res.json();
        if (Array.isArray(data.recentTickets) && data.recentTickets.length > 0) {
          let cache = loadCachedTickets();
          const knownIds = new Set(cache.map((t) => t.id));
          let updated = false;
          for (const vt of data.recentTickets) {
            if (!knownIds.has(vt.id)) {
              let realEvent = vt.title || '';
              if (vt.comments && vt.comments[0]?.text) {
                const m = vt.comments[0].text.match(/Evento:\s*([^.]+?)(?:\.|\s*Métrica:)/i);
                if (m && m[1]) realEvent = m[1].trim();
              }
              const lower = `${realEvent} ${vt.description || ''}`.toLowerCase();
              let cleanTitle = 'Falla Técnica en Estación';
              let casoNum: 1 | 2 | 3 | 4 | undefined = vt.casoNumero;
              let casoNom: string | undefined = vt.casoNombre;
              let tipo: 'Red y Conectividad' | 'Hardware Aula / AIP' | 'Servidor y Servicios' = 'Hardware Aula / AIP';

              if (
                lower.includes('ram') ||
                lower.includes('memoria') ||
                lower.includes('memory') ||
                lower.includes('>85') ||
                lower.includes('pavailable')
              ) {
                cleanTitle = `Saturación Crítica de Memoria RAM (>85%) · ${vt.hostName || 'PC-ALUMNO-01'}`;
                casoNum = 4;
                casoNom = 'Caso 4: Saturación de Memoria RAM (>85%)';
                tipo = 'Hardware Aula / AIP';
              } else if (lower.includes('link down') || lower.includes('interface')) {
                cleanTitle = `Desconexión de Enlace de Red (Ethernet Link Down) · ${vt.hostName || 'PC-ALUMNO-01'}`;
                casoNum = 1;
                casoNom = 'Caso 1: Desconexión Física de Red (Disponibilidad / Red)';
                tipo = 'Red y Conectividad';
              } else if (lower.includes('active checks') || lower.includes('not available') || lower.includes('unreachable') || lower.includes('desconexi')) {
                cleanTitle = `Desconexión Física de Red (Agente Inaccesible) · ${vt.hostName || 'PC-ALUMNO-01'}`;
                casoNum = 1;
                casoNom = 'Caso 1: Desconexión Física de Red (Disponibilidad / Red)';
                tipo = 'Red y Conectividad';
              } else if (lower.includes('cpu')) {
                cleanTitle = `Sobrecarga Crítica de Procesador CPU (>95%) · ${vt.hostName || 'PC-ALUMNO-01'}`;
                casoNum = 2;
                casoNom = 'Caso 2: Sobrecarga de Procesador (Rendimiento / Telemetría)';
                tipo = 'Hardware Aula / AIP';
              } else if (lower.includes('service')) {
                cleanTitle = `Interrupción de Servicio Crítico del Agente de Monitoreo · ${vt.hostName || 'PC-ALUMNO-01'}`;
                casoNum = 3;
                casoNom = 'Caso 3: Interrupción de Servicio Crítico (Estado de Agentes)';
                tipo = 'Servidor y Servicios';
              } else if (lower.includes('restarted')) {
                cleanTitle = `Reinicio Inesperado de Estación de Trabajo · ${vt.hostName || 'PC-ALUMNO-01'}`;
                tipo = 'Hardware Aula / AIP';
              }

              const normalizedTicket: StoredWebhookTicket = {
                ...vt,
                title: cleanTitle,
                titulo: cleanTitle,
                ugel: 'Mesa de Ayuda',
                tipoFalla: tipo,
                casoNumero: casoNum,
                casoNombre: casoNom,
                reporterEmail: 'telemetria@edudesk.edu.pe',
                horaIncidenciaVM: vt.horaIncidenciaVM || '10:00:00 (GMT-5)',
                vmTimestamp: vt.vmTimestamp || `${vt.createdAt || '2026-11-20 10:00:00'} (GMT-5 / UTC-5)`,
                zonaHorariaVM: 'GMT-5 (UTC-5 Perú / VMware)',
              };
              cache.unshift(normalizedTicket);
              knownIds.add(vt.id);
              updated = true;
            }
          }
          if (updated) {
            receivedTickets = cache.slice(0, 50);
            persistCachedTickets(receivedTickets);
          }
        }
      }
    } catch {}
  }
  setInterval(syncFromVercel, 2000);
  syncFromVercel();
}

setupServer();
