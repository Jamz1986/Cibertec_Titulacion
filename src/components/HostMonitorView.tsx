import React, { useEffect, useState, useCallback } from 'react';
import { MonitoredHost, Ticket } from '../types/helpdesk';
import { PRIORITY_CONFIGS } from '../data/mockData';
import { cleanAndEnrichTicket } from '../utils/ticketCleaner';
import {
  Server,
  Monitor,
  Network,
  RefreshCw,
  Clock,
  Cpu,
  HardDrive,
  MemoryStick,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  ChevronRight,
  X,
  Search,
} from 'lucide-react';

interface HostMonitorViewProps {
  token: string | null;
  onSelectTicket: (ticket: Ticket) => void;
}

export const HostMonitorView: React.FC<HostMonitorViewProps> = ({ token, onSelectTicket }) => {
  const [hosts, setHosts] = useState<MonitoredHost[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedHost, setSelectedHost] = useState<MonitoredHost | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [stateFilter, setStateFilter] = useState<'ALL' | 'OK' | 'ADVERTENCIA' | 'CAIDO'>('ALL');

  const fetchHosts = useCallback(async () => {
    if (!token) {
      setLoading(false);
      return;
    }
    try {
      const res = await fetch('/api/hosts', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        setError(data.error || 'No se pudo obtener el estado de los equipos.');
        return;
      }
      const normalizedHosts: MonitoredHost[] = (data.hosts || []).map((h: any) => ({
        ...h,
        tickets: Array.isArray(h.tickets) ? h.tickets.map(cleanAndEnrichTicket) : [],
      }));
      setHosts(normalizedHosts);
      setError(null);

      setSelectedHost((prev) => {
        if (!prev) return null;
        return normalizedHosts.find((h) => h.nombre === prev.nombre) || prev;
      });
    } catch {
      setError('Error de conexión al consultar /api/hosts.');
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    fetchHosts();
    const interval = setInterval(fetchHosts, 5000);
    return () => clearInterval(interval);
  }, [fetchHosts]);

  const getDeviceIcon = (tipo: MonitoredHost['tipo']) => {
    switch (tipo) {
      case 'switch':
        return <Network className="w-5 h-5" />;
      case 'servidor':
        return <Server className="w-5 h-5" />;
      default:
        return <Monitor className="w-5 h-5" />;
    }
  };

  const getEstadoBadge = (estado: MonitoredHost['estado']) => {
    switch (estado) {
      case 'CAIDO':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-rose-100 text-rose-800 border border-rose-300">
            <XCircle className="w-3.5 h-3.5" />
            <span>CAIDO</span>
          </span>
        );
      case 'ADVERTENCIA':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-100 text-amber-800 border border-amber-300">
            <AlertTriangle className="w-3.5 h-3.5" />
            <span>ADVERTENCIA</span>
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>OK</span>
          </span>
        );
    }
  };

  const filteredHosts = hosts.filter((h) => {
    if (stateFilter !== 'ALL' && h.estado !== stateFilter) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        h.nombre.toLowerCase().includes(q) ||
        (h.ip || '').toLowerCase().includes(q) ||
        h.tipo.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const countOk = hosts.filter((h) => h.estado === 'OK').length;
  const countWarn = hosts.filter((h) => h.estado === 'ADVERTENCIA').length;
  const countDown = hosts.filter((h) => h.estado === 'CAIDO').length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="p-5 rounded-2xl bg-white border border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold uppercase tracking-wider text-indigo-700">
              Monitoreo en Vivo
            </span>
            <span className="text-xs text-slate-300">·</span>
            <span className="text-xs font-medium text-emerald-600">
              Datos reales recibidos por Webhook
            </span>
          </div>
          <h1 className="text-lg font-bold text-slate-900 mt-0.5">
            Estado de Red y Equipos Monitoreados
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Consolidado por host según los eventos recibidos desde Zabbix. El estado se calcula a partir del ticket abierto de mayor gravedad.
          </p>
        </div>

        <button
          type="button"
          onClick={() => {
            setLoading(true);
            fetchHosts();
          }}
          className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold transition-colors cursor-pointer self-start md:self-auto"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          <span>Actualizar Equipos</span>
        </button>
      </div>

      {/* Summary Counters */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <button
          type="button"
          onClick={() => setStateFilter('ALL')}
          className={`p-4 rounded-xl border text-left transition-all cursor-pointer ${
            stateFilter === 'ALL'
              ? 'bg-slate-900 text-white border-slate-900'
              : 'bg-white border-slate-200 hover:border-slate-300'
          }`}
        >
          <span className={`text-[11px] font-semibold block ${stateFilter === 'ALL' ? 'text-slate-300' : 'text-slate-500'}`}>
            Equipos Detectados
          </span>
          <span className="text-2xl font-bold font-mono mt-1 block">{hosts.length}</span>
        </button>

        <button
          type="button"
          onClick={() => setStateFilter(stateFilter === 'OK' ? 'ALL' : 'OK')}
          className={`p-4 rounded-xl border text-left transition-all cursor-pointer ${
            stateFilter === 'OK'
              ? 'bg-emerald-600 text-white border-emerald-600'
              : 'bg-white border-emerald-200 hover:border-emerald-300'
          }`}
        >
          <span className={`text-[11px] font-semibold block ${stateFilter === 'OK' ? 'text-emerald-100' : 'text-emerald-700'}`}>
            Estado OK
          </span>
          <span className="text-2xl font-bold font-mono mt-1 block">{countOk}</span>
        </button>

        <button
          type="button"
          onClick={() => setStateFilter(stateFilter === 'ADVERTENCIA' ? 'ALL' : 'ADVERTENCIA')}
          className={`p-4 rounded-xl border text-left transition-all cursor-pointer ${
            stateFilter === 'ADVERTENCIA'
              ? 'bg-amber-600 text-white border-amber-600'
              : 'bg-white border-amber-200 hover:border-amber-300'
          }`}
        >
          <span className={`text-[11px] font-semibold block ${stateFilter === 'ADVERTENCIA' ? 'text-amber-100' : 'text-amber-700'}`}>
            En Advertencia
          </span>
          <span className="text-2xl font-bold font-mono mt-1 block">{countWarn}</span>
        </button>

        <button
          type="button"
          onClick={() => setStateFilter(stateFilter === 'CAIDO' ? 'ALL' : 'CAIDO')}
          className={`p-4 rounded-xl border text-left transition-all cursor-pointer ${
            stateFilter === 'CAIDO'
              ? 'bg-rose-600 text-white border-rose-600'
              : 'bg-white border-rose-200 hover:border-rose-300'
          }`}
        >
          <span className={`text-[11px] font-semibold block ${stateFilter === 'CAIDO' ? 'text-rose-100' : 'text-rose-700'}`}>
            Equipos Caídos
          </span>
          <span className="text-2xl font-bold font-mono mt-1 block">{countDown}</span>
        </button>
      </div>

      {/* Search Bar */}
      <div className="p-3.5 rounded-xl bg-white border border-slate-200 flex items-center gap-3">
        <Search className="w-4 h-4 text-slate-400 shrink-0" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Buscar equipo por nombre, IP o tipo (PC, servidor, switch)..."
          className="w-full text-xs text-slate-900 placeholder-slate-400 focus:outline-hidden"
        />
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs">
          {error}
        </div>
      )}

      {/* Host Cards Grid */}
      {!loading && filteredHosts.length === 0 ? (
        <div className="p-12 rounded-2xl bg-white border border-slate-200 text-center space-y-2">
          <Server className="w-8 h-8 text-slate-400 mx-auto" />
          <h3 className="text-sm font-bold text-slate-900">
            No hay equipos reportados por el webhook aún
          </h3>
          <p className="text-xs text-slate-500 max-w-md mx-auto">
            Cuando Zabbix envíe eventos reales al webhook de EduDesk, cada equipo aparecerá aquí automáticamente con su estado, última lectura y métricas enviadas.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredHosts.map((host) => (
            <div
              key={host.nombre}
              onClick={() => setSelectedHost(host)}
              className={`p-5 rounded-2xl bg-white border transition-all cursor-pointer hover:shadow-md space-y-4 ${
                host.estado === 'CAIDO'
                  ? 'border-rose-300'
                  : host.estado === 'ADVERTENCIA'
                  ? 'border-amber-300'
                  : 'border-slate-200'
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div
                    className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                      host.estado === 'CAIDO'
                        ? 'bg-rose-100 text-rose-700'
                        : host.estado === 'ADVERTENCIA'
                        ? 'bg-amber-100 text-amber-700'
                        : 'bg-emerald-100 text-emerald-700'
                    }`}
                  >
                    {getDeviceIcon(host.tipo)}
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-900">{host.nombre}</h3>
                    <p className="text-[11px] font-mono text-slate-500">
                      {host.tipo.toUpperCase()} {host.ip ? `· ${host.ip}` : ''}
                    </p>
                  </div>
                </div>
                {getEstadoBadge(host.estado)}
              </div>

              {/* Real metrics only (never invented) */}
              <div className="grid grid-cols-3 gap-2 text-[11px]">
                <div className="p-2 rounded-lg bg-slate-50 border border-slate-200/80">
                  <span className="text-slate-400 flex items-center gap-1">
                    <Cpu className="w-3 h-3" />
                    <span>CPU</span>
                  </span>
                  <span className="font-mono font-bold text-slate-800 block mt-0.5 truncate">
                    {host.cpu ?? 'No reportado'}
                  </span>
                </div>
                <div className="p-2 rounded-lg bg-slate-50 border border-slate-200/80">
                  <span className="text-slate-400 flex items-center gap-1">
                    <MemoryStick className="w-3 h-3" />
                    <span>RAM</span>
                  </span>
                  <span className="font-mono font-bold text-slate-800 block mt-0.5 truncate">
                    {host.ram ?? 'No reportado'}
                  </span>
                </div>
                <div className="p-2 rounded-lg bg-slate-50 border border-slate-200/80">
                  <span className="text-slate-400 flex items-center gap-1">
                    <HardDrive className="w-3 h-3" />
                    <span>Disco</span>
                  </span>
                  <span className="font-mono font-bold text-slate-800 block mt-0.5 truncate">
                    {host.disco ?? 'No reportado'}
                  </span>
                </div>
              </div>

              <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
                <div className="flex items-center gap-1 truncate">
                  <Clock className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                  <span className="font-mono truncate">{host.ultimaLectura || 'Sin lectura'}</span>
                </div>
                <span className="font-bold text-indigo-600 shrink-0 flex items-center gap-0.5">
                  <span>{host.ticketsAbiertos} abiertos</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Host Detail Modal */}
      {selectedHost && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs overflow-y-auto">
          <div className="relative w-full max-w-3xl bg-white rounded-2xl border border-slate-200 shadow-2xl overflow-hidden my-6">
            <div className="px-6 py-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center">
                  {getDeviceIcon(selectedHost.tipo)}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-base font-bold text-slate-900">{selectedHost.nombre}</h2>
                    {getEstadoBadge(selectedHost.estado)}
                  </div>
                  <p className="text-xs text-slate-500 font-mono">
                    Tipo: {selectedHost.tipo} {selectedHost.ip ? `· IP: ${selectedHost.ip}` : ''} · Última lectura: {selectedHost.ultimaLectura}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedHost(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-200 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-5 max-h-[70vh] overflow-y-auto">
              <div className="grid grid-cols-3 gap-3 text-xs">
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                  <span className="text-slate-500 block">CPU (Zabbix)</span>
                  <span className="font-mono font-bold text-slate-900 mt-1 block">
                    {selectedHost.cpu ?? 'No reportado'}
                  </span>
                </div>
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                  <span className="text-slate-500 block">RAM (Zabbix)</span>
                  <span className="font-mono font-bold text-slate-900 mt-1 block">
                    {selectedHost.ram ?? 'No reportado'}
                  </span>
                </div>
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                  <span className="text-slate-500 block">Disco (Zabbix)</span>
                  <span className="font-mono font-bold text-slate-900 mt-1 block">
                    {selectedHost.disco ?? 'No reportado'}
                  </span>
                </div>
              </div>

              <div className="space-y-2.5">
                <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                  Tickets asociados al equipo ({selectedHost.tickets.length})
                </h3>
                <div className="divide-y divide-slate-100 border border-slate-200 rounded-xl overflow-hidden">
                  {selectedHost.tickets.map((t) => {
                    const pConf = PRIORITY_CONFIGS[t.priority] || PRIORITY_CONFIGS.high;
                    return (
                      <div
                        key={t.id}
                        onClick={() => {
                          setSelectedHost(null);
                          onSelectTicket(t);
                        }}
                        className="p-3.5 hover:bg-slate-50 transition-colors cursor-pointer flex items-center justify-between gap-4"
                      >
                        <div className="space-y-1 min-w-0">
                          <div className="flex items-center gap-2 text-xs">
                            <span className="font-mono font-bold text-slate-800 bg-slate-100 px-2 py-0.5 rounded">
                              {t.code}
                            </span>
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${pConf.badgeBg}`}>
                              {pConf.label}
                            </span>
                            <span className="text-[11px] font-mono text-slate-500">
                              {t.status === 'resolved' || t.status === 'closed' ? 'Resuelto' : 'Abierto'}
                            </span>
                          </div>
                          <p className="text-xs font-semibold text-slate-900 truncate">{t.title}</p>
                          <p className="text-[11px] text-slate-500 font-mono">
                            {t.horaIncidenciaVM || t.createdAt}
                          </p>
                        </div>
                        <ChevronRight className="w-4 h-4 text-slate-400 shrink-0" />
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
