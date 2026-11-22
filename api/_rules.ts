import fs from 'fs';
import path from 'path';

export type RulePriority = 'low' | 'medium' | 'high' | 'urgent';

export interface MonitoringRuleItem {
  id: 'cpu_overload' | 'ram_saturation' | 'network_disconnect' | 'agent_service_down';
  nombre: string;
  descripcion: string;
  metrica: string;
  umbral: number;
  unidad: '%' | 's' | 'estado';
  prioridad: RulePriority;
  habilitada: boolean;
}

export interface MonitoringRulesConfig {
  rules: MonitoringRuleItem[];
  deduplicarAlertas: boolean;
  autoResolverConOk: boolean;
  correlacionZonalMinCaidas: number;
  updatedAt: string;
  updatedBy: string;
}

const RULES_FILE = path.join('/tmp', 'edudesk_monitoring_rules.json');

export const DEFAULT_MONITORING_RULES: MonitoringRulesConfig = {
  rules: [
    {
      id: 'network_disconnect',
      nombre: 'Desconexión Física de Red / Agente Inaccesible',
      descripcion: 'Dispara ticket cuando el agente Zabbix deja de responder (nodata / unreachable).',
      metrica: 'nodata / ICMP ping',
      umbral: 30,
      unidad: 's',
      prioridad: 'urgent',
      habilitada: true,
    },
    {
      id: 'cpu_overload',
      nombre: 'Sobrecarga Crítica de Procesador (CPU)',
      descripcion: 'Genera alerta preventiva cuando el uso sostenido de CPU supera el umbral definido.',
      metrica: 'system.cpu.util',
      umbral: 95,
      unidad: '%',
      prioridad: 'high',
      habilitada: true,
    },
    {
      id: 'ram_saturation',
      nombre: 'Saturación de Memoria RAM',
      descripcion: 'Alerta cuando el consumo de memoria física supera el porcentaje límite.',
      metrica: 'vm.memory.size[pavailable]',
      umbral: 85,
      unidad: '%',
      prioridad: 'high',
      habilitada: true,
    },
    {
      id: 'agent_service_down',
      nombre: 'Interrupción de Servicio Crítico de Monitoreo',
      descripcion: 'Notifica si el servicio del agente Zabbix es detenido en la estación.',
      metrica: 'service.info[Zabbix Agent]',
      umbral: 1,
      unidad: 'estado',
      prioridad: 'high',
      habilitada: true,
    },
  ],
  deduplicarAlertas: true,
  autoResolverConOk: true,
  correlacionZonalMinCaidas: 2,
  updatedAt: 'Configuración inicial del sistema',
  updatedBy: 'Sistema EduDesk',
};

export function getMonitoringRules(): MonitoringRulesConfig {
  try {
    if (fs.existsSync(RULES_FILE)) {
      const raw = fs.readFileSync(RULES_FILE, 'utf-8');
      const parsed = JSON.parse(raw);
      if (parsed && Array.isArray(parsed.rules)) {
        return parsed as MonitoringRulesConfig;
      }
    }
  } catch (err) {
    console.warn('[Monitoring Rules] Error reading rules file:', err);
  }
  return DEFAULT_MONITORING_RULES;
}

export function saveMonitoringRules(
  input: Partial<MonitoringRulesConfig>,
  updatedBy: string
): { success: boolean; error?: string; config?: MonitoringRulesConfig } {
  const current = getMonitoringRules();
  const allowedPriorities: RulePriority[] = ['low', 'medium', 'high', 'urgent'];

  const nextRules: MonitoringRuleItem[] = current.rules.map((existing) => {
    const incoming = Array.isArray(input.rules)
      ? input.rules.find((r) => r?.id === existing.id)
      : undefined;
    if (!incoming) return existing;

    let umbral = Number(incoming.umbral);
    if (existing.unidad === '%') {
      if (isNaN(umbral) || umbral < 10 || umbral > 100) {
        umbral = existing.umbral;
      }
    } else if (existing.unidad === 's') {
      if (isNaN(umbral) || umbral < 5 || umbral > 3600) {
        umbral = existing.umbral;
      }
    } else {
      umbral = 1;
    }

    const prioridad = allowedPriorities.includes(incoming.prioridad as RulePriority)
      ? (incoming.prioridad as RulePriority)
      : existing.prioridad;

    return {
      ...existing,
      umbral: Math.round(umbral),
      prioridad,
      habilitada: typeof incoming.habilitada === 'boolean' ? incoming.habilitada : existing.habilitada,
    };
  });

  const minCaidas = Number(input.correlacionZonalMinCaidas);
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

  const nextConfig: MonitoringRulesConfig = {
    rules: nextRules,
    deduplicarAlertas:
      typeof input.deduplicarAlertas === 'boolean'
        ? input.deduplicarAlertas
        : current.deduplicarAlertas,
    autoResolverConOk:
      typeof input.autoResolverConOk === 'boolean'
        ? input.autoResolverConOk
        : current.autoResolverConOk,
    correlacionZonalMinCaidas:
      !isNaN(minCaidas) && minCaidas >= 2 && minCaidas <= 20
        ? Math.round(minCaidas)
        : current.correlacionZonalMinCaidas,
    updatedAt: `${map.year}-${map.month}-${map.day} ${map.hour}:${map.minute}:${map.second} (GMT-5)`,
    updatedBy,
  };

  try {
    fs.writeFileSync(RULES_FILE, JSON.stringify(nextConfig, null, 2), 'utf-8');
  } catch (err) {
    console.warn('[Monitoring Rules] Error saving rules:', err);
  }

  return { success: true, config: nextConfig };
}
