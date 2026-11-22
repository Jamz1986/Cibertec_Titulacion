import type { VercelRequest, VercelResponse } from '@vercel/node';
import fs from 'fs';
import path from 'path';
import { verifyBearerToken } from '../_auth';
import { aggregateHostsFromWebhookTickets } from '../_hosts';

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

function formatPeruDateTime(includeDate = true): string {
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
  if (!includeDate) {
    return `${map.hour}:${map.minute}:${map.second} (GMT-5)`;
  }
  return `${map.year}-${map.month}-${map.day} ${map.hour}:${map.minute}:${map.second} (GMT-5)`;
}

function setPublicWebhookCors(res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,POST');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );
}

function mapZabbixSeverityToPriority(severity?: string): 'low' | 'medium' | 'high' | 'urgent' {
  if (!severity) return 'urgent';
  const s = String(severity).toLowerCase().trim();
  if (
    s.includes('disaster') ||
    s.includes('desastre') ||
    s.includes('high') ||
    s.includes('alta') ||
    s.includes('alto') ||
    s === '5' ||
    s === '4'
  ) {
    return 'urgent';
  }
  if (s.includes('average') || s === '3') {
    return 'high';
  }
  if (
    s.includes('warning') ||
    s.includes('advertencia') ||
    s.includes('media') ||
    s.includes('medio') ||
    s === '2'
  ) {
    return 'medium';
  }
  if (
    s.includes('info') ||
    s.includes('information') ||
    s.includes('baja') ||
    s.includes('not classified') ||
    s === '1' ||
    s === '0'
  ) {
    return 'low';
  }
  return 'urgent';
}

export default function handler(req: VercelRequest, res: VercelResponse) {
  const action = String(req.query?.action || '').trim();
  const isAuthProtectedAction =
    action === 'hosts' || action === 'acknowledge' || action === 'assign';

  if (!isAuthProtectedAction) {
    setPublicWebhookCors(res);
  }

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // CU-10: GET /api/hosts (solo ADMIN y TECNICO)
  if (req.method === 'GET' && action === 'hosts') {
    const user = verifyBearerToken(req.headers.authorization as string | undefined);
    if (!user) {
      return res.status(401).json({ success: false, error: 'Se requiere autenticación.' });
    }
    if (user.rol !== 'ADMIN' && user.rol !== 'TECNICO') {
      return res.status(403).json({
        success: false,
        error: 'Acceso restringido a roles ADMIN o TECNICO.',
      });
    }
    const hosts = aggregateHostsFromWebhookTickets(getCachedTickets());
    return res.status(200).json({
      success: true,
      count: hosts.length,
      hosts,
    });
  }

  // CU-06: PATCH /api/tickets/:id/acknowledge (solo ADMIN y TECNICO)
  if (req.method === 'PATCH' && action === 'acknowledge') {
    const user = verifyBearerToken(req.headers.authorization as string | undefined);
    if (!user) {
      return res.status(401).json({ success: false, error: 'Se requiere autenticación.' });
    }
    if (user.rol !== 'ADMIN' && user.rol !== 'TECNICO') {
      return res.status(403).json({
        success: false,
        error: 'Solo un técnico o administrador puede aceptar la alerta.',
      });
    }
    const targetId = String(req.query?.id || '').trim();
    const cache = getCachedTickets();
    const idx = cache.findIndex((t) => t.id === targetId);
    if (idx === -1) {
      return res.status(404).json({ success: false, error: 'Ticket no encontrado en caché del servidor.' });
    }
    cache[idx].acknowledgedBy = user.nombre;
    cache[idx].acknowledgedAt = formatPeruDateTime(true);
    saveCachedTickets(cache);
    return res.status(200).json({ success: true, ticket: cache[idx] });
  }

  // CU-07: PATCH /api/tickets/:id/assign (solo ADMIN / Coordinador)
  if (req.method === 'PATCH' && action === 'assign') {
    const user = verifyBearerToken(req.headers.authorization as string | undefined);
    if (!user) {
      return res.status(401).json({ success: false, error: 'Se requiere autenticación.' });
    }
    if (user.rol !== 'ADMIN') {
      return res.status(403).json({
        success: false,
        error: 'Solo el coordinador (ADMIN) puede asignar técnicos.',
      });
    }
    const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : req.body || {};
    const asignadoA = String(body?.asignadoA || '').trim();
    if (!asignadoA) {
      return res.status(400).json({ success: false, error: 'Debe indicar el técnico asignado.' });
    }
    const targetId = String(req.query?.id || '').trim();
    const cache = getCachedTickets();
    const idx = cache.findIndex((t) => t.id === targetId);
    if (idx === -1) {
      return res.status(404).json({ success: false, error: 'Ticket no encontrado en caché del servidor.' });
    }
    cache[idx].asignadoA = asignadoA;
    cache[idx].assignedTechnician = asignadoA;
    cache[idx].comments = [
      ...(cache[idx].comments || []),
      {
        id: `c-assign-${Date.now()}`,
        author: user.nombre,
        role: 'Coordinador / Admin',
        text: `Ticket asignado al técnico: ${asignadoA}.`,
        timestamp: formatPeruDateTime(false),
      },
    ];
    saveCachedTickets(cache);
    return res.status(200).json({ success: true, ticket: cache[idx] });
  }

  if (req.method === 'GET') {
    const current = getCachedTickets();
    if (req.url?.includes('powerbi') || req.query?.format === 'powerbi') {
      const rows = current.map((t) => ({
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
      return res.status(200).json(rows);
    }
    return res.status(200).json({
      success: true,
      status: 'online',
      service: 'EduDesk Zabbix Webhook API (Vercel Serverless)',
      method: 'POST',
      endpoint: '/api/webhooks/zabbix',
      acceptedFormats: ['application/json', 'application/x-www-form-urlencoded', 'text/plain'],
      count: current.length,
      tickets: current,
      recentCount: current.length,
      recentTickets: current.slice(0, 15),
    });
  }

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

      const eventoZabbixId = String(
        payload?.evento_zabbix_id || payload?.event_id || payload?.EVENT_ID || ''
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

      const current = getCachedTickets();
      const effectiveRawEvent = eventName || `Incidencia automática en ${hostName}`;

      const matchingIndex = current.findIndex((t) => {
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

      if (estadoEvento === 'RESOLVED') {
        if (matchingIndex !== -1) {
          const existing = current[matchingIndex];
          existing.status = 'resolved';
          existing.estadoEvento = 'RESOLVED';
          existing.valorActual = itemValue;
          existing.comments = [
            ...(existing.comments || []),
            {
              id: `c-zbx-res-${Date.now()}`,
              author: 'Zabbix Webhook Controller (Vercel Serverless)',
              role: 'Recuperación Automática',
              text: `Evento marcado como RESOLVED desde Zabbix. Host: ${hostName} [${hostIp}]. Valor actual: ${itemValue}. Hora VMware: ${timeSync.timeOnly}.`,
              timestamp: timeSync.timeOnly,
            },
          ];
          saveCachedTickets(current);
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
          message: 'Evento RESOLVED procesado (sin ticket abierto pendiente).',
        });
      }

      if (matchingIndex !== -1) {
        const existing = current[matchingIndex];
        existing.valorActual = itemValue;
        existing.horaIncidenciaVM = timeSync.timeOnly;
        existing.vmTimestamp = timeSync.vmTimestamp;
        existing.duplicateAlertCount = (existing.duplicateAlertCount || 0) + 1;

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

        saveCachedTickets(current);
        return res.status(200).json({
          status: 'success',
          deduplicated: true,
          message: `Alerta deduplicada: el ticket ${existing.code} sigue abierto para este incidente`,
          ticketId: existing.id,
          ticketCode: existing.code,
          ticket: existing,
        });
      }

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
      const computedPriority = mapZabbixSeverityToPriority(severity);
      let computedTipoFalla:
        | 'Red y Conectividad'
        | 'Hardware Aula / AIP'
        | 'Servidor y Servicios' = 'Hardware Aula / AIP';

      if (
        normEvent.includes('ram') ||
        normEvent.includes('memoria') ||
        normEvent.includes('memory') ||
        normEvent.includes('vm.memory') ||
        normEvent.includes('pavailable') ||
        normEvent.includes('>85') ||
        normEvent.includes('umbral del 85')
      ) {
        casoNumero = 4;
        casoNombre = 'Caso 4: Saturación de Memoria RAM (>85%)';
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
          computedTitle = `Saturación Crítica de Memoria RAM (>85%) · ${hostName}`;
        }
        defaultMensajeFalla = `Consumo de memoria RAM supera el umbral crítico del 85% en ${hostName}.`;
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
        casoNumero = 2;
        casoNombre = 'Caso 2: Sobrecarga de Procesador (Rendimiento / Telemetría)';
        computedTitle = `Sobrecarga Crítica de Procesador CPU (>95%) · ${hostName}`;
        defaultMensajeFalla = `Saturación crítica de CPU en ${hostName}.`;
        computedTipoFalla = 'Hardware Aula / AIP';
      } else if (
        normEvent.includes('service is not running') ||
        normEvent.includes('active checks are not available') ||
        normEvent.includes('service') ||
        normEvent.includes('servicio') ||
        normEvent.includes('agent service')
      ) {
        casoNumero = 3;
        casoNombre = 'Caso 3: Interrupción de Servicio Crítico (Estado de Agentes)';
        computedTitle = `Interrupción de Servicio Crítico del Agente de Monitoreo · ${hostName}`;
        defaultMensajeFalla = `Servicio de monitoreo detenido en ${hostName}.`;
        computedTipoFalla = 'Servidor y Servicios';
      } else {
        let clean = cleanTitlePrefix(eventName);
        if (!clean) clean = `Incidencia automática en ${hostName}`;
        computedTitle = clean.includes(hostName) ? clean : `${clean} · ${hostName}`;
        defaultMensajeFalla = `Incidencia técnica detectada automáticamente en ${hostName}.`;
      }

      const mensajeBase = rawMensajeFalla || defaultMensajeFalla;
      const computedDesc = `${mensajeBase} | Host: ${hostName} | IP: ${hostIp} | Valor: ${itemValue}`;

      const year = new Date().getFullYear();
      const ticket = {
        id: `t-zbx-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        code: `TK-${year}-${Math.floor(1000 + Math.random() * 9000)}`,
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
        distrito: 'Miraflores',
        tipoFalla: computedTipoFalla,
        casoNumero,
        casoNombre,
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
        sede: payload?.sede || `Sede Miraflores · ${hostName} (${hostIp})`,
        schoolName: payload?.schoolName || `I.E. Sede Miraflores (${hostName})`,
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
            author: 'Zabbix Webhook Controller (Vercel Serverless)',
            role: 'Automatización de Incidencias',
            text: `Evento procesado desde Zabbix Server 7.0 LTS en VMware. Host: ${hostName} [${hostIp}]. Evento: ${effectiveRawEvent}. Métrica: ${itemValue}. Severidad: ${severity}. Hora VMware: ${timeSync.timeOnly}.`,
            timestamp: timeSync.timeOnly,
          },
        ],
      };

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

  return res.status(405).json({ error: 'Method Not Allowed' });
}
