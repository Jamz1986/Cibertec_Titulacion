import type { VercelRequest, VercelResponse } from '@vercel/node';
import fs from 'fs';
import path from 'path';

const CACHE_FILE = path.join('/tmp', 'zabbix_tickets_cache.json');

function getCachedTickets(): any[] {
  try {
    if (fs.existsSync(CACHE_FILE)) {
      const raw = fs.readFileSync(CACHE_FILE, 'utf-8');
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch (err) {
    console.warn('[Zabbix Webhook] Error reading cache file:', err);
  }
  return [];
}

function saveCachedTickets(tickets: any[]) {
  try {
    fs.writeFileSync(CACHE_FILE, JSON.stringify(tickets.slice(0, 50), null, 2), 'utf-8');
  } catch (err) {
    console.warn('[Zabbix Webhook] Error writing cache file:', err);
  }
}

export default function handler(req: VercelRequest, res: VercelResponse) {
  // Set universal CORS headers
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization'
  );

  // Handle preflight OPTIONS request
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Handle GET (Status & test check)
  if (req.method === 'GET') {
    const current = getCachedTickets();
    return res.status(200).json({
      status: 'online',
      service: 'EduDesk Zabbix Webhook API (Vercel Serverless)',
      method: 'POST',
      endpoint: '/api/webhooks/zabbix',
      acceptedFormats: ['application/json', 'application/x-www-form-urlencoded', 'text/plain'],
      recentCount: current.length,
      recentTickets: current.slice(0, 10),
    });
  }

  // Handle POST (Zabbix Webhook)
  if (req.method === 'POST') {
    try {
      let payload = req.body;
      if (typeof payload === 'string') {
        try {
          payload = JSON.parse(payload);
        } catch {
          payload = { rawMessage: payload };
        }
      }

      // Check all possible key variants from Zabbix Media Types
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

      const now = new Date();
      const formattedDate = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(
        now.getDate()
      ).padStart(2, '0')} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

      const s = String(severity).toLowerCase();
      const priority = (s.includes('disaster') || s.includes('desastre') || s.includes('5')) ? 'urgent' : 'high';

      const ticket = {
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
        slaTargetHours: priority === 'urgent' ? 2 : 8,
        telemetriaZabbix: {
          lastGaspReceived: false,
          heartbeatConsecutiveFails: 3,
          correlationConfidence: 98,
          ipDispositivo: hostIp,
          puertoAfectado: hostName.toLowerCase().includes('switch') ? 'GigabitEthernet0/2 (Trunk)' : 'eth0 / ens33 (10050)',
          latenciaMs: hostName.toLowerCase().includes('cpu') ? 18 : 0,
          perdidaPaquetesPct: hostName.toLowerCase().includes('down') ? 100 : 0,
          anchoBandaUtilizadoMbps: 14.2,
          ultimoSondeoSnmp: 'Hace 1 seg',
          probableCausa: hostName.toLowerCase().includes('switch')
            ? 'CORTE_ENLACE_TRUNK_SWITCH'
            : 'FALLA_LOCAL_AISLADA',
        },
        comments: [
          {
            id: `c-zbx-${Date.now()}`,
            author: 'Zabbix Webhook Controller (Vercel Serverless)',
            role: 'Automatización de Incidencias',
            text: `Evento procesado desde Zabbix Server 7.0 LTS en VMware. Host: ${hostName} [${hostIp}]. Evento: ${eventName}. Métrica: ${itemValue}. Severidad: ${severity}.`,
            timestamp: 'Hace instantes',
          },
        ],
      };

      const current = getCachedTickets();
      current.unshift(ticket);
      saveCachedTickets(current);

      return res.status(200).json({
        status: 'success',
        message: 'Ticket de incidencia creado exitosamente en EduDesk',
        ticketId: ticket.id,
        ticketCode: ticket.code,
        ticket: ticket,
      });
    } catch (err: any) {
      return res.status(500).json({
        status: 'error',
        message: 'Error al procesar el webhook',
        error: err?.message || String(err),
      });
    }
  }

  // Method not supported
  return res.status(405).json({ error: 'Method Not Allowed' });
}
