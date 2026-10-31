import type { VercelRequest, VercelResponse } from '@vercel/node';

// In-memory cache for recent tickets across serverless invocations
const recentTickets: any[] = [];

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
    return res.status(200).json({
      status: 'online',
      service: 'EduDesk Zabbix Webhook API (Vercel Serverless)',
      method: 'POST',
      endpoint: '/api/webhooks/zabbix',
      acceptedFormats: ['application/json', 'text/plain'],
      recentCount: recentTickets.length,
      recentTickets: recentTickets.slice(0, 10),
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

      const hostName = payload?.host_name || payload?.hostname || payload?.host || payload?.equipo || 'PC-ALUMNO-01';
      const hostIp = payload?.ip || payload?.host_ip || payload?.ipDispositivo || '192.168.30.101';
      const eventName = payload?.event_name || payload?.trigger_name || payload?.titulo || payload?.title || payload?.mensaje || 'Alerta de Monitoreo Proactivo Zabbix';
      const severity = payload?.severity || payload?.severidad || 'High';
      const itemValue = payload?.item_value || payload?.valor || payload?.metric || 'Estado Anómalo Detectado';
      const description = payload?.description || payload?.descripcion || `Alerta emitida por Zabbix Server 7.0: ${eventName}. Equipo: ${hostName} (${hostIp}). Métrica: ${itemValue}`;

      const now = new Date();
      const formattedDate = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(
        now.getDate()
      ).padStart(2, '0')} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

      const ticket = {
        id: `t-zbx-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        code: `TK-${now.getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`,
        title: `Alerta Zabbix: ${eventName}`,
        titulo: `Alerta Zabbix: ${eventName}`,
        description: description,
        descripcion: description,
        origen: 'AUTOMATICO',
        priority: String(severity).toLowerCase().includes('disaster') ? 'urgent' : 'high',
        status: 'open',
        category: 'aip_hardware',
        ugel: 'UGEL 03',
        sede: 'I.E. Antenor Orrego Espinoza (Lab Central)',
        schoolName: 'I.E. Antenor Orrego Espinoza',
        reporterUserId: 'usr-zabbix-webhook',
        reporterName: `Zabbix Agent (${hostName})`,
        reporterRole: 'Telemetría Proactiva SNMP/Agent',
        reporterEmail: 'zabbix-webhook@cibertec.edu.pe',
        classroomLab: 'Laboratorio de Cómputo (VLAN 30)',
        createdAt: formattedDate,
        slaTargetHours: 8,
        telemetriaZabbix: {
          lastGaspReceived: false,
          heartbeatConsecutiveFails: 3,
          correlationConfidence: 96,
          ipDispositivo: hostIp,
          puertoAfectado: 'eth0 / ens33 (10050)',
          latenciaMs: 0,
          perdidaPaquetesPct: 0,
          anchoBandaUtilizadoMbps: 12.5,
          ultimoSondeoSnmp: 'Hace 2 seg',
          probableCausa: 'FALLA_LOCAL_AISLADA',
        },
        comments: [
          {
            id: `c-zbx-${Date.now()}`,
            author: 'Zabbix Webhook Controller (Vercel Serverless)',
            role: 'Automatización de Incidencias',
            text: `Evento procesado desde Zabbix Server 7.0 LTS. Host: ${hostName} [${hostIp}]. Evento: ${eventName}. Métrica: ${itemValue}. Severidad: ${severity}.`,
            timestamp: 'Hace instantes',
          },
        ],
      };

      recentTickets.unshift(ticket);
      if (recentTickets.length > 50) recentTickets.pop();

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
