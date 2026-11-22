import React, { useEffect, useState, useCallback } from 'react';
import {
  Sliders,
  ShieldCheck,
  Save,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Clock,
  Cpu,
  MemoryStick,
  WifiOff,
  Server,
} from 'lucide-react';

type RulePriority = 'low' | 'medium' | 'high' | 'urgent';

interface MonitoringRuleItem {
  id: 'cpu_overload' | 'ram_saturation' | 'network_disconnect' | 'agent_service_down';
  nombre: string;
  descripcion: string;
  metrica: string;
  umbral: number;
  unidad: '%' | 's' | 'estado';
  prioridad: RulePriority;
  habilitada: boolean;
}

interface MonitoringRulesConfig {
  rules: MonitoringRuleItem[];
  deduplicarAlertas: boolean;
  autoResolverConOk: boolean;
  correlacionZonalMinCaidas: number;
  updatedAt: string;
  updatedBy: string;
}

interface MonitoringRulesViewProps {
  token: string | null;
  onOpenZabbixGuide?: () => void;
}

export const MonitoringRulesView: React.FC<MonitoringRulesViewProps> = ({
  token,
  onOpenZabbixGuide,
}) => {
  const [config, setConfig] = useState<MonitoringRulesConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);

  const loadRules = useCallback(async () => {
    if (!token) {
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
      const res = await fetch('/api/monitoring-rules', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        setError(data.error || 'No se pudieron cargar las reglas de monitoreo.');
        return;
      }
      setConfig(data.config);
      setError(null);
    } catch {
      setError('Error de conexión al consultar las reglas de monitoreo.');
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    loadRules();
  }, [loadRules]);

  const handleRuleChange = (
    id: MonitoringRuleItem['id'],
    patch: Partial<MonitoringRuleItem>
  ) => {
    if (!config) return;
    setSaveMessage(null);
    setConfig({
      ...config,
      rules: config.rules.map((r) => (r.id === id ? { ...r, ...patch } : r)),
    });
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!config || !token) return;
    setSaving(true);
    setSaveMessage(null);
    setError(null);
    try {
      const res = await fetch('/api/monitoring-rules', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(config),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        setError(data.error || 'No se pudieron guardar los cambios.');
        return;
      }
      setConfig(data.config);
      setSaveMessage('Reglas de monitoreo guardadas y aplicadas al motor de alertas.');
    } catch {
      setError('Error de red al guardar las reglas de monitoreo.');
    } finally {
      setSaving(false);
    }
  };

  const getRuleIcon = (id: MonitoringRuleItem['id']) => {
    switch (id) {
      case 'cpu_overload':
        return <Cpu className="w-5 h-5 text-amber-600" />;
      case 'ram_saturation':
        return <MemoryStick className="w-5 h-5 text-orange-600" />;
      case 'network_disconnect':
        return <WifiOff className="w-5 h-5 text-rose-600" />;
      case 'agent_service_down':
        return <Server className="w-5 h-5 text-indigo-600" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="p-5 rounded-2xl bg-white border border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-rose-100 text-rose-800 text-[10px] font-bold uppercase tracking-wider">
              <ShieldCheck className="w-3 h-3" />
              <span>Solo Administrador</span>
            </span>
            <span className="text-xs text-slate-300">·</span>
            <span className="text-xs font-medium text-slate-500">
              Motor Webhook Zabbix & Umbrales
            </span>
          </div>
          <h1 className="text-lg font-bold text-slate-900 mt-1 flex items-center gap-2">
            <Sliders className="w-5 h-5 text-indigo-600" />
            <span>Configurar Reglas de Monitoreo</span>
          </h1>
          <p className="text-xs text-slate-500 mt-0.5 max-w-2xl">
            Defina qué eventos de Zabbix generan tickets automáticos, ajuste los umbrales de CPU/RAM/tiempo de espera y establezca las prioridades por defecto.
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {onOpenZabbixGuide && (
            <button
              type="button"
              onClick={onOpenZabbixGuide}
              className="px-3 py-2 rounded-xl border border-emerald-300 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 text-xs font-semibold transition-colors cursor-pointer"
            >
              Ver URL y Guía Webhook Zabbix
            </button>
          )}
          <button
            type="button"
            onClick={loadRules}
            className="p-2 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700 cursor-pointer"
            title="Recargar reglas"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {saveMessage && (
        <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{saveMessage}</span>
        </div>
      )}

      {config && (
        <form onSubmit={handleSave} className="space-y-6">
          {/* Individual Trigger Rules */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {config.rules.map((rule) => (
              <div
                key={rule.id}
                className={`p-5 rounded-2xl border bg-white space-y-4 transition-all ${
                  rule.habilitada ? 'border-slate-200' : 'border-slate-200/70 opacity-75 bg-slate-50/70'
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center shrink-0">
                      {getRuleIcon(rule.id)}
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-slate-900">{rule.nombre}</h3>
                      <p className="text-[11px] text-slate-500 mt-0.5 leading-relaxed">
                        {rule.descripcion}
                      </p>
                      <span className="inline-block mt-1.5 text-[10px] font-mono px-2 py-0.5 rounded bg-slate-100 text-slate-600">
                        Métrica: {rule.metrica}
                      </span>
                    </div>
                  </div>

                  <label className="inline-flex items-center gap-1.5 text-xs font-semibold cursor-pointer shrink-0">
                    <input
                      type="checkbox"
                      checked={rule.habilitada}
                      onChange={(e) => handleRuleChange(rule.id, { habilitada: e.target.checked })}
                      className="w-4 h-4 accent-indigo-600 rounded cursor-pointer"
                    />
                    <span className={rule.habilitada ? 'text-emerald-700' : 'text-slate-500'}>
                      {rule.habilitada ? 'Activa' : 'Inactiva'}
                    </span>
                  </label>
                </div>

                <div className="grid grid-cols-2 gap-3 pt-3 border-t border-slate-100 text-xs">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                      {rule.unidad === '%'
                        ? 'Umbral (%)'
                        : rule.unidad === 's'
                        ? 'Tiempo sin respuesta (s)'
                        : 'Estado disparador'}
                    </label>
                    {rule.unidad === 'estado' ? (
                      <div className="px-3 py-2 rounded-lg bg-slate-100 text-slate-700 font-mono text-xs">
                        Servicio detenido (0)
                      </div>
                    ) : (
                      <div className="flex items-center gap-1.5">
                        <input
                          type="number"
                          min={rule.unidad === '%' ? 10 : 5}
                          max={rule.unidad === '%' ? 100 : 3600}
                          value={rule.umbral}
                          onChange={(e) =>
                            handleRuleChange(rule.id, { umbral: Number(e.target.value) })
                          }
                          className="w-full px-3 py-1.5 rounded-lg border border-slate-300 font-mono font-bold text-slate-900 bg-white"
                        />
                        <span className="font-mono font-bold text-slate-500">{rule.unidad}</span>
                      </div>
                    )}
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                      Prioridad del Ticket
                    </label>
                    <select
                      value={rule.prioridad}
                      onChange={(e) =>
                        handleRuleChange(rule.id, { prioridad: e.target.value as RulePriority })
                      }
                      className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white text-slate-900 font-semibold cursor-pointer"
                    >
                      <option value="low">Baja (SLA 48h)</option>
                      <option value="medium">Media (SLA 24h)</option>
                      <option value="high">Alta (SLA 8h)</option>
                      <option value="urgent">Urgente (SLA 2h)</option>
                    </select>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Global Correlation & Webhook Behavior */}
          <div className="p-5 rounded-2xl bg-white border border-slate-200 space-y-4">
            <h2 className="text-sm font-bold text-slate-900">
              Comportamiento Global del Webhook y Correlación
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
              <label className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/60 flex items-start gap-2.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={config.deduplicarAlertas}
                  onChange={(e) =>
                    setConfig({ ...config, deduplicarAlertas: e.target.checked })
                  }
                  className="w-4 h-4 accent-indigo-600 mt-0.5 cursor-pointer"
                />
                <div>
                  <span className="font-bold text-slate-900 block">Deduplicar Alertas Repetidas</span>
                  <span className="text-[11px] text-slate-500">
                    Incrementa el contador en el ticket abierto sin crear duplicados ni repetir sonido.
                  </span>
                </div>
              </label>

              <label className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/60 flex items-start gap-2.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={config.autoResolverConOk}
                  onChange={(e) =>
                    setConfig({ ...config, autoResolverConOk: e.target.checked })
                  }
                  className="w-4 h-4 accent-indigo-600 mt-0.5 cursor-pointer"
                />
                <div>
                  <span className="font-bold text-slate-900 block">Auto-resolver con evento OK</span>
                  <span className="text-[11px] text-slate-500">
                    Cierra el ticket automáticamente cuando Zabbix envía estado RESOLVED.
                  </span>
                </div>
              </label>

              <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/60 space-y-1.5">
                <label className="font-bold text-slate-900 block">
                  Mínimo de caídas para Correlación Zonal
                </label>
                <input
                  type="number"
                  min={2}
                  max={20}
                  value={config.correlacionZonalMinCaidas}
                  onChange={(e) =>
                    setConfig({
                      ...config,
                      correlacionZonalMinCaidas: Number(e.target.value),
                    })
                  }
                  className="w-24 px-2.5 py-1 rounded-lg border border-slate-300 bg-white font-mono font-bold text-slate-900"
                />
              </div>
            </div>

            <div className="pt-3 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2 text-[11px] text-slate-500 font-mono">
                <Clock className="w-3.5 h-3.5 text-indigo-500" />
                <span>
                  Última actualización: {config.updatedAt} · Por: {config.updatedBy}
                </span>
              </div>

              <button
                type="submit"
                disabled={saving}
                className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 disabled:opacity-60 text-white text-xs font-bold shadow-xs transition-colors cursor-pointer"
              >
                <Save className="w-4 h-4 text-emerald-400" />
                <span>{saving ? 'Guardando...' : 'Guardar Reglas de Monitoreo'}</span>
              </button>
            </div>
          </div>
        </form>
      )}
    </div>
  );
};
