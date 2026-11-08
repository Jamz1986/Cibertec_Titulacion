import { Ticket } from '../types/helpdesk';

/**
 * Extracts and cleans the real detected problem from raw Zabbix payloads,
 * removing any "Alerta Zabbix" or "Zabbix SNMP" prefixes, and provides a clear,
 * concise, summarized problem title for the helpdesk.
 */
export function cleanAndEnrichTicket(rawTicket: any): Ticket {
  const comments = Array.isArray(rawTicket.comments) ? rawTicket.comments : [];
  let extractedEvent = '';
  let extractedMetric = '';

  // 1. Check comments for real event details (e.g. from Vercel/Zabbix webhook)
  for (const c of comments) {
    const text = c?.text || '';
    const matchEvent = text.match(/Evento:\s*([^.]+?)(?:\.|\s*Métrica:)/i);
    if (matchEvent && matchEvent[1]) {
      extractedEvent = matchEvent[1].trim();
    }
    const matchMetric = text.match(/Métrica:\s*([^.]+?)(?:\.|\s*Severidad:)/i);
    if (matchMetric && matchMetric[1]) {
      extractedMetric = matchMetric[1].trim();
    }
    if (extractedEvent) break;
  }

  // 2. Host name detection
  let hostName = 'PC-ALUMNO-01';
  if (rawTicket.reporterName && rawTicket.reporterName.includes('(')) {
    const matchHost = rawTicket.reporterName.match(/\(([^)]+)\)/);
    if (matchHost) hostName = matchHost[1];
  } else if (rawTicket.host_name) {
    hostName = rawTicket.host_name;
  } else if (rawTicket.sede && rawTicket.sede.includes('·')) {
    const parts = rawTicket.sede.split('·');
    if (parts[1]) hostName = parts[1].split('(')[0].trim();
  }

  // 3. Raw title and description strings
  const currentTitle = rawTicket.title || rawTicket.titulo || '';
  const currentDesc = rawTicket.description || rawTicket.descripcion || '';
  const combinedContext = `${currentTitle} ${currentDesc} ${extractedEvent}`.toLowerCase();

  let finalTitle = '';
  let finalDesc = currentDesc;
  let casoNumero: 1 | 2 | 3 | undefined = rawTicket.casoNumero;
  let casoNombre: string | undefined = rawTicket.casoNombre;
  let casoHistoriaJurado: string | undefined = rawTicket.casoHistoriaJurado;
  let tipoFalla = rawTicket.tipoFalla || 'Hardware Aula / AIP';
  let priority = rawTicket.priority || 'high';

  // 4. Problem classification & clean title generation (STRICTLY NO "Alerta Zabbix")
  if (
    combinedContext.includes('link down') ||
    combinedContext.includes('interface') ||
    combinedContext.includes('media disconnected') ||
    combinedContext.includes('not available') ||
    combinedContext.includes('nodata') ||
    combinedContext.includes('unreachable') ||
    combinedContext.includes('cable') ||
    combinedContext.includes('desconexión') ||
    combinedContext.includes('desconexion')
  ) {
    casoNumero = 1;
    casoNombre = 'Caso 1: Desconexión Física de Red (Disponibilidad / Red)';
    casoHistoriaJurado =
      'Personal de limpieza o un alumno desconecta por error el cable UTP del equipo PC-ALUMNO-01 durante el mantenimiento del laboratorio.';
    priority = 'urgent';
    tipoFalla = 'Red y Conectividad';

    if (combinedContext.includes('link down') || combinedContext.includes('interface')) {
      finalTitle = `Desconexión de Enlace de Red (Ethernet Link Down) · ${hostName}`;
      finalDesc = `Pérdida de conectividad física en la interfaz de red Ethernet de la estación ${hostName}. Cable UTP desconectado o sin señal de portadora.`;
    } else {
      finalTitle = `Pérdida Total de Enlace de Red (Agente Inaccesible) · ${hostName}`;
      finalDesc = `El agente de monitoreo no responde por pérdida total de enlace de red. Posible desconexión accidental del cable UTP en ${hostName}.`;
    }
  } else if (
    combinedContext.includes('cpu') ||
    combinedContext.includes('procesador') ||
    combinedContext.includes('>95') ||
    combinedContext.includes('sobrecarga') ||
    combinedContext.includes('utilization')
  ) {
    casoNumero = 2;
    casoNombre = 'Caso 2: Sobrecarga de Procesador (Rendimiento / Telemetría)';
    casoHistoriaJurado =
      'Un alumno ejecuta un proceso en bucle infinito o software no autorizado que bloquea el procesador del equipo.';
    priority = 'high';
    tipoFalla = 'Hardware Aula / AIP';
    finalTitle = `Sobrecarga Crítica de Procesador CPU (>95%) · ${hostName}`;
    finalDesc = `Saturación sostenida de CPU al ${extractedMetric || '98.4%'} en ${hostName}. Alerta preventiva activada antes del colapso del sistema operativo.`;
  } else if (
    combinedContext.includes('service is not running') ||
    combinedContext.includes('service') ||
    combinedContext.includes('servicio') ||
    combinedContext.includes('agent service')
  ) {
    casoNumero = 3;
    casoNombre = 'Caso 3: Interrupción de Servicio Crítico (Estado de Agentes)';
    casoHistoriaJurado =
      'Falla inesperada del servicio de monitoreo o intento de detener los procesos de control en la estación de trabajo.';
    priority = 'high';
    tipoFalla = 'Servidor y Servicios';
    finalTitle = `Interrupción de Servicio Crítico del Agente de Monitoreo · ${hostName}`;
    finalDesc = `El servicio de control y monitoreo en la estación ${hostName} fue detenido o interrumpido inesperadamente.`;
  } else if (combinedContext.includes('restarted') || combinedContext.includes('reinicio')) {
    finalTitle = `Reinicio Inesperado de Estación de Trabajo · ${hostName}`;
    finalDesc = `La estación de trabajo ${hostName} experimentó un reinicio o apagado no programado (Uptime < 10m).`;
    priority = 'medium';
    tipoFalla = 'Hardware Aula / AIP';
  } else {
    // Sanitize any generic title: strip "Alerta Zabbix", "Alerta Zabbix SNMP:", "Zabbix:"
    let clean = (extractedEvent || currentTitle)
      .replace(/\[Caso \d:[^\]]+\]/gi, '')
      .replace(/Alerta Zabbix SNMP:\s*/gi, '')
      .replace(/Alerta Zabbix:\s*/gi, '')
      .replace(/Zabbix:\s*/gi, '')
      .replace(/^Windows:\s*/gi, '')
      .replace(/^Linux:\s*/gi, '')
      .trim();

    if (!clean || clean.toLowerCase().startsWith('falla en')) {
      clean = 'Falla de Disponibilidad en Estación';
    }
    finalTitle = `${clean} · ${hostName}`;
    if (finalDesc.includes('El agente Zabbix reporta un problema crítico')) {
      finalDesc = `Incidencia de hardware/red reportada en la estación ${hostName}. Telemetría automática en espera de validación técnica.`;
    }
  }

  // Double check: absolutely no "Alerta Zabbix"
  finalTitle = finalTitle
    .replace(/Alerta Zabbix SNMP:\s*/gi, '')
    .replace(/Alerta Zabbix:\s*/gi, '')
    .replace(/Zabbix:\s*/gi, '')
    .trim();

  // 5. Time synchronization in GMT-5 (UTC-5)
  const horaIncidenciaVM =
    rawTicket.horaIncidenciaVM ||
    (rawTicket.createdAt && rawTicket.createdAt.includes(':') ? rawTicket.createdAt.slice(-8) + ' (GMT-5)' : '10:00:00 (GMT-5)');

  const vmTimestamp =
    rawTicket.vmTimestamp ||
    (rawTicket.createdAt ? `${rawTicket.createdAt} (GMT-5 / UTC-5)` : '2026-11-07 10:00:00 (GMT-5 / UTC-5)');

  // 6. Clean UGEL 07 references
  const cleanUgel = 'Mesa de Ayuda';
  const cleanEmail = (rawTicket.reporterEmail || 'telemetria@edudesk.edu.pe').replace(/@ugel07\.(gob|edu)\.pe/g, '@edudesk.edu.pe');
  const cleanSchool = (rawTicket.schoolName || 'I.E. Antenor Orrego Espinoza').replace(/UGEL\s*07/gi, 'Sede');
  const cleanSede = (rawTicket.sede || `Sede Central · ${hostName}`).replace(/UGEL\s*07/gi, 'Sede');

  return {
    ...rawTicket,
    title: finalTitle,
    titulo: finalTitle,
    description: finalDesc,
    descripcion: finalDesc,
    priority,
    tipoFalla,
    casoNumero,
    casoNombre,
    casoHistoriaJurado,
    ugel: cleanUgel,
    schoolName: cleanSchool,
    sede: cleanSede,
    reporterEmail: cleanEmail,
    horaIncidenciaVM,
    vmTimestamp,
    zonaHorariaVM: 'GMT-5 (UTC-5 Perú / VMware)',
  };
}
