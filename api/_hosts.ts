export type HostDeviceType = 'switch' | 'servidor' | 'PC';
export type HostHealthState = 'OK' | 'ADVERTENCIA' | 'CAIDO';

export interface MonitoredHostSummary {
  nombre: string;
  ip?: string;
  tipo: HostDeviceType;
  estado: HostHealthState;
  ultimaLectura: string;
  cpu: string | null;
  ram: string | null;
  disco: string | null;
  ticketsAbiertos: number;
  totalTickets: number;
  tickets: any[];
}

function extractHostName(ticket: any): string {
  if (ticket?.hostName && String(ticket.hostName).trim()) {
    return String(ticket.hostName).trim();
  }
  if (ticket?.reporterName && String(ticket.reporterName).includes('(')) {
    const match = String(ticket.reporterName).match(/\(([^)]+)\)/);
    if (match && match[1]) return match[1].trim();
  }
  if (ticket?.classroomLab && String(ticket.classroomLab).includes('·')) {
    const parts = String(ticket.classroomLab).split('·');
    if (parts[1]) return parts[1].split('(')[0].trim();
  }
  return '';
}

function inferDeviceType(nombre: string, tickets: any[]): HostDeviceType {
  const combined = `${nombre} ${tickets.map((t) => `${t.tipoDispositivo || ''} ${t.title || ''}`).join(' ')}`.toLowerCase();
  if (combined.includes('switch') || combined.startsWith('sw-') || combined.includes(' sw-') || combined.includes('router')) {
    return 'switch';
  }
  if (combined.includes('servidor') || combined.includes('server') || combined.includes('zabbix')) {
    return 'servidor';
  }
  return 'PC';
}

function priorityRank(priority?: string): number {
  switch (priority) {
    case 'urgent':
      return 4;
    case 'high':
      return 3;
    case 'medium':
      return 2;
    case 'low':
      return 1;
    default:
      return 0;
  }
}

export function aggregateHostsFromWebhookTickets(tickets: any[]): MonitoredHostSummary[] {
  const groups = new Map<string, { displayName: string; items: any[] }>();

  for (const t of tickets) {
    const hostName = extractHostName(t);
    if (!hostName) continue;
    const key = hostName.toUpperCase();
    const existing = groups.get(key);
    if (existing) {
      existing.items.push(t);
    } else {
      groups.set(key, { displayName: hostName, items: [t] });
    }
  }

  const hosts: MonitoredHostSummary[] = [];

  for (const { displayName, items } of groups.values()) {
    const openTickets = items.filter((t) => t.status !== 'resolved' && t.status !== 'closed');

    // Estado del host sale de su ticket abierto más grave
    let estado: HostHealthState = 'OK';
    if (openTickets.length > 0) {
      let maxRank = 0;
      for (const ot of openTickets) {
        const rank = priorityRank(ot.priority);
        if (rank > maxRank) maxRank = rank;
      }
      estado = maxRank >= 4 ? 'CAIDO' : 'ADVERTENCIA';
    }

    let ip: string | undefined;
    let cpu: string | null = null;
    let ram: string | null = null;
    let disco: string | null = null;

    for (const t of items) {
      if (!ip && t.telemetriaZabbix?.ipDispositivo) {
        ip = t.telemetriaZabbix.ipDispositivo;
      }

      const snap = t.metricsSnapshot || {};
      if (cpu === null && snap.cpu) cpu = String(snap.cpu);
      if (ram === null && snap.ram) ram = String(snap.ram);
      if (disco === null && snap.disco) disco = String(snap.disco);

      // Reutilizar valorActual solo si el evento corresponde explícitamente a CPU / RAM / Disco
      const rawVal = t.valorActual ? String(t.valorActual).trim() : '';
      if (rawVal && rawVal.toUpperCase() !== 'N/A') {
        const ev = `${t.rawEventName || ''} ${t.title || ''}`.toLowerCase();
        if (cpu === null && (t.casoNumero === 2 || ev.includes('cpu') || ev.includes('procesador'))) {
          cpu = rawVal;
        } else if (ram === null && (t.casoNumero === 4 || ev.includes('ram') || ev.includes('memoria') || ev.includes('memory'))) {
          ram = rawVal;
        } else if (disco === null && (ev.includes('disco') || ev.includes('disk') || ev.includes('filesystem') || ev.includes('storage'))) {
          disco = rawVal;
        }
      }
    }

    const latest = items[0];
    const ultimaLectura = latest?.vmTimestamp || latest?.createdAt || '';

    hosts.push({
      nombre: displayName,
      ip,
      tipo: inferDeviceType(displayName, items),
      estado,
      ultimaLectura,
      cpu,
      ram,
      disco,
      ticketsAbiertos: openTickets.length,
      totalTickets: items.length,
      tickets: items,
    });
  }

  const stateWeight: Record<HostHealthState, number> = {
    CAIDO: 3,
    ADVERTENCIA: 2,
    OK: 1,
  };

  return hosts.sort((a, b) => {
    const diff = stateWeight[b.estado] - stateWeight[a.estado];
    if (diff !== 0) return diff;
    return b.ticketsAbiertos - a.ticketsAbiertos;
  });
}
