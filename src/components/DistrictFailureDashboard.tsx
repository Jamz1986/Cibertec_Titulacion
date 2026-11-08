import React, { useState, useMemo } from 'react';
import { Ticket, UGEL07District, FailureType, Priority } from '../types/helpdesk';
import { PRIORITY_CONFIGS } from '../data/mockData';
import {
  BarChart3,
  MapPin,
  AlertTriangle,
  Clock,
  CheckCircle2,
  Filter,
  Layers,
  Search,
  Wifi,
  Cpu,
  Server,
  Zap,
  BookOpen,
  ArrowUpRight,
  TrendingUp,
  Building2,
  ChevronRight,
  ShieldAlert,
} from 'lucide-react';

interface DistrictFailureDashboardProps {
  tickets: Ticket[];
  onSelectTicket: (ticket: Ticket) => void;
}

const UGEL07_DISTRICTS: UGEL07District[] = [
  'Miraflores',
  'San Borja',
  'Santiago de Surco',
  'San Luis',
  'Barranco',
  'Chorrillos',
  'Surquillo',
];

const FAILURE_TYPE_META: Record<
  FailureType,
  { label: string; icon: React.ComponentType<{ className?: string }>; color: string; bg: string; border: string; text: string }
> = {
  'Red y Conectividad': {
    label: 'Red y Conectividad',
    icon: Wifi,
    color: '#0284c7',
    bg: 'bg-sky-50 dark:bg-sky-950/40',
    border: 'border-sky-300',
    text: 'text-sky-700',
  },
  'Hardware Aula / AIP': {
    label: 'Hardware Aula / AIP',
    icon: Cpu,
    color: '#ea580c',
    bg: 'bg-orange-50 dark:bg-orange-950/40',
    border: 'border-orange-300',
    text: 'text-orange-700',
  },
  'Servidor y Servicios': {
    label: 'Servidor y Servicios',
    icon: Server,
    color: '#7c3aed',
    bg: 'bg-purple-50 dark:bg-purple-950/40',
    border: 'border-purple-300',
    text: 'text-purple-700',
  },
  'Suministro Eléctrico': {
    label: 'Suministro Eléctrico',
    icon: Zap,
    color: '#dc2626',
    bg: 'bg-red-50 dark:bg-red-950/40',
    border: 'border-red-300',
    text: 'text-red-700',
  },
  'Software Educativo': {
    label: 'Software Educativo',
    icon: BookOpen,
    color: '#059669',
    bg: 'bg-emerald-50 dark:bg-emerald-950/40',
    border: 'border-emerald-300',
    text: 'text-emerald-700',
  },
};

export const DistrictFailureDashboard: React.FC<DistrictFailureDashboardProps> = ({
  tickets,
  onSelectTicket,
}) => {
  const [selectedDistrict, setSelectedDistrict] = useState<UGEL07District | 'ALL'>('ALL');
  const [selectedFailureType, setSelectedFailureType] = useState<FailureType | 'ALL'>('ALL');
  const [selectedPriority, setSelectedPriority] = useState<Priority | 'ALL'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  // Normalizar y enriquecer tickets si algún webhook no tenía distrito explícito
  const normalizedTickets = useMemo(() => {
    return tickets.map((t) => {
      let d = t.distrito;
      if (!d) {
        const text = `${t.schoolName} ${t.sede} ${t.classroomLab} ${t.description}`.toLowerCase();
        if (text.includes('surco') || text.includes('santiago')) d = 'Santiago de Surco';
        else if (text.includes('borja')) d = 'San Borja';
        else if (text.includes('luis')) d = 'San Luis';
        else if (text.includes('barranco')) d = 'Barranco';
        else if (text.includes('chorrillos')) d = 'Chorrillos';
        else if (text.includes('surquillo')) d = 'Surquillo';
        else d = 'Miraflores';
      }

      let f = t.tipoFalla;
      if (!f) {
        const text = `${t.title} ${t.description} ${t.category}`.toLowerCase();
        if (text.includes('cpu') || text.includes('ram') || text.includes('hardware') || text.includes('fuente') || text.includes('puesto')) {
          f = 'Hardware Aula / AIP';
        } else if (text.includes('switch') || text.includes('red') || text.includes('fibra') || text.includes('enlace') || text.includes('vlan') || text.includes('paquetes')) {
          f = 'Red y Conectividad';
        } else if (text.includes('luz') || text.includes('electr') || text.includes('apagon') || text.includes('apagón') || text.includes('breaker') || text.includes('ups') || text.includes('last gasp')) {
          f = 'Suministro Eléctrico';
        } else if (text.includes('software') || text.includes('virtual') || text.includes('licencia') || text.includes('app')) {
          f = 'Software Educativo';
        } else {
          f = 'Servidor y Servicios';
        }
      }

      return {
        ...t,
        distrito: d,
        tipoFalla: f,
      };
    });
  }, [tickets]);

  // Filtrado de tickets
  const filteredTickets = useMemo(() => {
    return normalizedTickets.filter((t) => {
      if (selectedDistrict !== 'ALL' && t.distrito !== selectedDistrict) return false;
      if (selectedFailureType !== 'ALL' && t.tipoFalla !== selectedFailureType) return false;
      if (selectedPriority !== 'ALL' && t.priority !== selectedPriority) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const match =
          t.title.toLowerCase().includes(q) ||
          t.code.toLowerCase().includes(q) ||
          t.schoolName.toLowerCase().includes(q) ||
          t.description.toLowerCase().includes(q) ||
          (t.distrito && t.distrito.toLowerCase().includes(q));
        if (!match) return false;
      }
      return true;
    });
  }, [normalizedTickets, selectedDistrict, selectedFailureType, selectedPriority, searchQuery]);

  // Métricas agregadas por distrito
  const districtStats = useMemo(() => {
    const stats: Record<
      UGEL07District,
      {
        total: number;
        byFailure: Record<FailureType, number>;
        topFailure: FailureType | 'Sin registros';
        topFailureCount: number;
        urgentCount: number;
        highCount: number;
      }
    > = {} as any;

    UGEL07_DISTRICTS.forEach((d) => {
      stats[d] = {
        total: 0,
        byFailure: {
          'Red y Conectividad': 0,
          'Hardware Aula / AIP': 0,
          'Servidor y Servicios': 0,
          'Suministro Eléctrico': 0,
          'Software Educativo': 0,
        },
        topFailure: 'Sin registros',
        topFailureCount: 0,
        urgentCount: 0,
        highCount: 0,
      };
    });

    normalizedTickets.forEach((t) => {
      const d = t.distrito;
      if (d && stats[d]) {
        stats[d].total += 1;
        const f = t.tipoFalla || 'Red y Conectividad';
        stats[d].byFailure[f] = (stats[d].byFailure[f] || 0) + 1;
        if (t.priority === 'urgent') stats[d].urgentCount += 1;
        if (t.priority === 'high') stats[d].highCount += 1;
      }
    });

    // Calcular top failure por distrito
    UGEL07_DISTRICTS.forEach((d) => {
      let maxCount = 0;
      let topF: FailureType = 'Red y Conectividad';
      Object.entries(stats[d].byFailure).forEach(([type, count]) => {
        if (count > maxCount) {
          maxCount = count;
          topF = type as FailureType;
        }
      });
      if (maxCount > 0) {
        stats[d].topFailure = topF;
        stats[d].topFailureCount = maxCount;
      }
    });

    return stats;
  }, [normalizedTickets]);

  // Frecuencia general de tipos de fallas en el contexto filtrado actual
  const failureFrequency = useMemo(() => {
    const counts: Record<FailureType, number> = {
      'Red y Conectividad': 0,
      'Hardware Aula / AIP': 0,
      'Servidor y Servicios': 0,
      'Suministro Eléctrico': 0,
      'Software Educativo': 0,
    };

    const targetList =
      selectedDistrict === 'ALL'
        ? normalizedTickets
        : normalizedTickets.filter((t) => t.distrito === selectedDistrict);

    targetList.forEach((t) => {
      const f = t.tipoFalla || 'Red y Conectividad';
      counts[f] = (counts[f] || 0) + 1;
    });

    const total = targetList.length || 1;
    const sorted = Object.entries(counts)
      .map(([type, count]) => ({
        type: type as FailureType,
        count,
        percentage: Math.round((count / total) * 100),
      }))
      .sort((a, b) => b.count - a.count);

    return { counts, total: targetList.length, sorted };
  }, [normalizedTickets, selectedDistrict]);

  // Distrito con mayor carga
  const highestIncidentDistrict = useMemo(() => {
    let maxD = UGEL07_DISTRICTS[0];
    let maxVal = 0;
    UGEL07_DISTRICTS.forEach((d) => {
      if (districtStats[d].total > maxVal) {
        maxVal = districtStats[d].total;
        maxD = d;
      }
    });
    return { district: maxD, count: maxVal };
  }, [districtStats]);

  const topOverallFailure = failureFrequency.sorted[0] || {
    type: 'Red y Conectividad',
    count: 0,
    percentage: 0,
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white rounded-3xl p-6 sm:p-8 shadow-xl relative overflow-hidden border border-indigo-900/50">
        <div className="absolute right-0 top-0 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/20 border border-indigo-400/30 text-indigo-300 text-xs font-bold uppercase tracking-wider">
              <MapPin className="w-3.5 h-3.5 text-indigo-400" />
              <span>Mesa de Ayuda TI · Jurisdicción de Lima Sur</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
              Dashboard Interactivo de Fallas por Distrito
            </h1>
            <p className="text-slate-300 text-xs sm:text-sm max-w-2xl leading-relaxed">
              Reporte analítico de frecuencia y recurrencia de averías tecnológicas en las instituciones
              educativas de los 7 distritos: Miraflores, San Borja, Santiago de Surco, San Luis, Barranco,
              Chorrillos y Surquillo.
            </p>
          </div>

          {/* Quick Metrics Capsule */}
          <div className="flex flex-wrap items-center gap-3 bg-white/5 backdrop-blur-md p-4 rounded-2xl border border-white/10 shrink-0">
            <div className="text-center px-3 border-r border-white/10">
              <span className="text-[10px] text-slate-400 uppercase font-bold block">Distritos</span>
              <span className="text-xl font-black text-indigo-300">7</span>
            </div>
            <div className="text-center px-3 border-r border-white/10">
              <span className="text-[10px] text-slate-400 uppercase font-bold block">Tickets Totales</span>
              <span className="text-xl font-black text-emerald-400">{normalizedTickets.length}</span>
            </div>
            <div className="text-center px-3">
              <span className="text-[10px] text-slate-400 uppercase font-bold block">Falla Primaria</span>
              <span className="text-xs font-bold text-amber-300 line-clamp-1 max-w-[130px]">
                {topOverallFailure.type}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* District Interactive Selector Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-indigo-600" />
            <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">
              Seleccionar Distrito:
            </span>
          </div>
          {selectedDistrict !== 'ALL' && (
            <button
              onClick={() => setSelectedDistrict('ALL')}
              className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 underline cursor-pointer"
            >
              Ver todos los distritos
            </button>
          )}
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setSelectedDistrict('ALL')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 border ${
              selectedDistrict === 'ALL'
                ? 'bg-slate-900 text-white border-slate-900 shadow-md shadow-slate-900/20'
                : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200'
            }`}
          >
            <span>Todos los Distritos</span>
            <span
              className={`px-2 py-0.5 rounded-full text-[10px] font-mono ${
                selectedDistrict === 'ALL' ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-700'
              }`}
            >
              {normalizedTickets.length}
            </span>
          </button>

          {UGEL07_DISTRICTS.map((d) => {
            const count = districtStats[d]?.total || 0;
            const isSelected = selectedDistrict === d;
            return (
              <button
                key={d}
                type="button"
                onClick={() => setSelectedDistrict(d)}
                className={`px-3.5 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer flex items-center gap-2 border ${
                  isSelected
                    ? 'bg-indigo-600 text-white border-indigo-600 shadow-md shadow-indigo-600/30'
                    : 'bg-white hover:bg-slate-50 text-slate-700 border-slate-200'
                }`}
              >
                <MapPin className={`w-3.5 h-3.5 ${isSelected ? 'text-white' : 'text-indigo-500'}`} />
                <span>{d}</span>
                <span
                  className={`px-1.5 py-0.5 rounded-md text-[10px] font-mono font-bold ${
                    isSelected ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-600'
                  }`}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Falla más frecuente */}
        <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-2">
          <div className="flex items-center justify-between text-xs font-bold text-slate-500">
            <span>Falla Más Frecuente</span>
            <div className="w-8 h-8 rounded-xl bg-sky-100 text-sky-700 flex items-center justify-center">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <p className="text-xl font-black text-slate-900 leading-tight">
            {topOverallFailure.type}
          </p>
          <div className="flex items-center gap-1.5 text-xs text-sky-600 font-semibold pt-1">
            <span>{topOverallFailure.count} incidentes</span>
            <span className="text-slate-400">·</span>
            <span>{topOverallFailure.percentage}% de casos</span>
          </div>
        </div>

        {/* Card 2: Distrito con mayor incidencia */}
        <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-2">
          <div className="flex items-center justify-between text-xs font-bold text-slate-500">
            <span>Mayor Recurrencia</span>
            <div className="w-8 h-8 rounded-xl bg-rose-100 text-rose-700 flex items-center justify-center">
              <AlertTriangle className="w-4 h-4" />
            </div>
          </div>
          <p className="text-xl font-black text-slate-900 leading-tight">
            {highestIncidentDistrict.district}
          </p>
          <div className="flex items-center gap-1.5 text-xs text-rose-600 font-semibold pt-1">
            <span>{highestIncidentDistrict.count} tickets reportados</span>
          </div>
        </div>

        {/* Card 3: Sincronización VM */}
        <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-2">
          <div className="flex items-center justify-between text-xs font-bold text-slate-500">
            <span>Hora VM / Perú (UTC-5)</span>
            <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <p className="text-xl font-black text-slate-900 leading-tight">
            Sincronizado
          </p>
          <div className="flex items-center gap-1.5 text-xs text-emerald-600 font-semibold pt-1">
            <span>Zona America/Lima</span>
            <span className="text-slate-400">·</span>
            <span>Zabbix Server VM</span>
          </div>
        </div>

        {/* Card 4: Casos Críticos */}
        <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-2">
          <div className="flex items-center justify-between text-xs font-bold text-slate-500">
            <span>Casos Alta/Urgente</span>
            <div className="w-8 h-8 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center">
              <ShieldAlert className="w-4 h-4" />
            </div>
          </div>
          <p className="text-xl font-black text-slate-900 leading-tight">
            {
              filteredTickets.filter((t) => t.priority === 'urgent' || t.priority === 'high').length
            }{' '}
            tickets
          </p>
          <div className="flex items-center gap-1.5 text-xs text-amber-700 font-semibold pt-1">
            <span>Prioridad de Atención Inmediata</span>
          </div>
        </div>
      </div>

      {/* Main Analysis Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column (2 spans): Ranking & Proportional Distribution of Failure Types */}
        <div className="lg:col-span-2 space-y-6">
          <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-4">
              <div>
                <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <BarChart3 className="w-5 h-5 text-indigo-600" />
                  <span>
                    Frecuencia de Averías{' '}
                    {selectedDistrict === 'ALL' ? 'en todas las sedes' : `en ${selectedDistrict}`}
                  </span>
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Distribución porcentual por categoría técnica para focalizar recursos de mantenimiento
                </p>
              </div>

              {selectedFailureType !== 'ALL' && (
                <button
                  type="button"
                  onClick={() => setSelectedFailureType('ALL')}
                  className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 underline cursor-pointer self-start"
                >
                  Restablecer tipo de falla
                </button>
              )}
            </div>

            {/* Bars */}
            <div className="space-y-4">
              {failureFrequency.sorted.map((item) => {
                const meta = FAILURE_TYPE_META[item.type];
                const Icon = meta.icon;
                const isSelected = selectedFailureType === item.type;
                return (
                  <div
                    key={item.type}
                    onClick={() =>
                      setSelectedFailureType(isSelected ? 'ALL' : item.type)
                    }
                    className={`p-3.5 rounded-xl border transition-all cursor-pointer ${
                      isSelected
                        ? 'border-indigo-500 bg-indigo-50/50 ring-2 ring-indigo-200'
                        : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50/70'
                    }`}
                  >
                    <div className="flex items-center justify-between text-xs mb-2">
                      <div className="flex items-center gap-2 font-bold text-slate-800">
                        <div
                          className={`w-7 h-7 rounded-lg flex items-center justify-center ${meta.bg} ${meta.text}`}
                        >
                          <Icon className="w-4 h-4" />
                        </div>
                        <span className="text-sm">{item.type}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-slate-900 text-sm">
                          {item.count} {item.count === 1 ? 'caso' : 'casos'}
                        </span>
                        <span className="text-xs font-bold text-slate-500 font-mono">
                          ({item.percentage}%)
                        </span>
                      </div>
                    </div>

                    {/* Progress Track */}
                    <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{
                          width: `${Math.max(item.percentage, 4)}%`,
                          backgroundColor: meta.color,
                        }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Matrix Breakdown of All 7 Districts */}
          <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-4">
            <div>
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Building2 className="w-5 h-5 text-indigo-600" />
                <span>Comparativa Territorial de los 7 Distritos</span>
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Diagnóstico de la avería principal identificada en cada jurisdicción distrital
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
              {UGEL07_DISTRICTS.map((dist) => {
                const stat = districtStats[dist];
                const isSelected = selectedDistrict === dist;
                const meta =
                  stat.topFailure !== 'Sin registros'
                    ? FAILURE_TYPE_META[stat.topFailure as FailureType]
                    : null;

                return (
                  <div
                    key={dist}
                    onClick={() => setSelectedDistrict(isSelected ? 'ALL' : dist)}
                    className={`p-4 rounded-xl border transition-all cursor-pointer ${
                      isSelected
                        ? 'border-indigo-600 bg-indigo-50/70 ring-2 ring-indigo-300'
                        : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50/60'
                    }`}
                  >
                    <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                      <div className="flex items-center gap-1.5 font-bold text-sm text-slate-900">
                        <MapPin className="w-4 h-4 text-indigo-600" />
                        <span>{dist}</span>
                      </div>
                      <span className="px-2 py-0.5 rounded-full text-xs font-mono font-bold bg-slate-100 text-slate-700">
                        {stat.total} {stat.total === 1 ? 'ticket' : 'tickets'}
                      </span>
                    </div>

                    <div className="mt-2 space-y-1.5">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-slate-400 font-medium">Falla Predominante:</span>
                        <span className="font-bold text-slate-800 text-[11px] truncate max-w-[150px]">
                          {stat.topFailure}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-slate-400 font-medium">Urgentes / Alta:</span>
                        <span className="font-bold text-rose-600 text-xs">
                          {stat.urgentCount + stat.highCount} casos
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Right Column: Operational Recommendations & Zabbix Telemetry Notes */}
        <div className="space-y-6">
          <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-4">
            <div className="flex items-center gap-2 text-slate-900 font-bold">
              <ShieldAlert className="w-5 h-5 text-amber-500" />
              <h3 className="text-sm font-bold">Recomendaciones Operativas de Red</h3>
            </div>

            <div className="space-y-3 text-xs leading-relaxed text-slate-600">
              <div className="p-3 rounded-xl bg-sky-50 border border-sky-200/80">
                <span className="font-bold text-sky-900 block mb-1">
                  1. Chorrillos & Barranco (Zona Costera):
                </span>
                <p className="text-sky-800">
                  Alta corrosión y humedad marina en conectores RJ45. Se aconseja mantenimiento preventivo de
                  cableado exterior y uso de capuchones estancos IP65 en enlaces troncales.
                </p>
              </div>

              <div className="p-3 rounded-xl bg-orange-50 border border-orange-200/80">
                <span className="font-bold text-orange-900 block mb-1">
                  2. Miraflores & San Luis (AIP Hardware):
                </span>
                <p className="text-orange-800">
                  Picos de High CPU (&gt;95%) en estaciones virtuales de alumnos. Requiere actualización de
                  imágenes base en VMware Workstation y limpieza de disipadores térmicos.
                </p>
              </div>

              <div className="p-3 rounded-xl bg-red-50 border border-red-200/80">
                <span className="font-bold text-red-900 block mb-1">
                  3. Santiago de Surco (Energía Eléctrica):
                </span>
                <p className="text-red-800">
                  Registros de cortes intempestivos con paquetes SNMP Last Gasp. Se recomienda auditar la
                  autonomía de baterías en los UPS de los racks de telecomunicaciones.
                </p>
              </div>

              <div className="p-3 rounded-xl bg-purple-50 border border-purple-200/80">
                <span className="font-bold text-purple-900 block mb-1">
                  4. San Borja & Surquillo (Servidores Escolar):
                </span>
                <p className="text-purple-800">
                  Monitorear particiones de bases de datos MySQL/MariaDB del servidor Zabbix local para
                  evitar paradas imprevistas del daemon de telemetría.
                </p>
              </div>
            </div>
          </div>

          {/* Sincronización Horaria Info Box */}
          <div className="p-5 rounded-2xl bg-slate-900 text-white space-y-3 shadow-lg">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-emerald-400" />
              <span className="text-xs font-bold uppercase tracking-wider text-emerald-400">
                Sincronización Horaria de la Alerta
              </span>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">
              Los tickets automáticos generados mediante el webhook capturan el timestamp exacto emitido
              por la máquina virtual (servidor Zabbix en Ubuntu) y lo traducen a la zona horaria oficial del
              Perú (<strong>America/Lima, UTC-5</strong>), garantizando que el reloj del técnico coincida
              exactamente con el de la simulación.
            </p>
          </div>
        </div>
      </div>

      {/* Filtered Incidents Ledger / Table */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs space-y-0">
        <div className="p-5 border-b border-slate-200 bg-slate-50/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-bold text-slate-900">
              Listado de Incidentes Filtrados ({filteredTickets.length})
            </h3>
            <p className="text-xs text-slate-500">
              Haga clic sobre cualquier incidente para abrir su ficha completa y detalle técnico
            </p>
          </div>

          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Buscar por colegio, código..."
                className="pl-8 pr-3 py-1.5 text-xs rounded-xl border border-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 w-48 sm:w-64"
              />
            </div>
          </div>
        </div>

        {filteredTickets.length === 0 ? (
          <div className="p-12 text-center text-slate-500 space-y-2">
            <AlertTriangle className="w-8 h-8 text-amber-500 mx-auto" />
            <p className="text-sm font-semibold text-slate-800">
              No hay tickets que coincidan con los criterios seleccionados
            </p>
            <button
              onClick={() => {
                setSelectedDistrict('ALL');
                setSelectedFailureType('ALL');
                setSelectedPriority('ALL');
                setSearchQuery('');
              }}
              className="px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-xs font-semibold text-slate-700 cursor-pointer transition-colors"
            >
              Limpiar todos los filtros
            </button>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {filteredTickets.map((t) => {
              const pConf = PRIORITY_CONFIGS[t.priority];
              const fMeta = t.tipoFalla ? FAILURE_TYPE_META[t.tipoFalla] : null;
              return (
                <div
                  key={t.id}
                  onClick={() => onSelectTicket(t)}
                  className="p-4 hover:bg-indigo-50/40 transition-colors cursor-pointer flex flex-col md:flex-row md:items-center justify-between gap-3"
                >
                  <div className="space-y-1.5 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-mono text-xs font-bold text-slate-900 bg-slate-100 px-2 py-0.5 rounded">
                        {t.code}
                      </span>
                      {t.distrito && (
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200">
                          <MapPin className="w-3 h-3 text-indigo-500" />
                          <span>{t.distrito}</span>
                        </span>
                      )}
                      {fMeta && (
                        <span
                          className={`inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full ${fMeta.bg} ${fMeta.text} border ${fMeta.border}`}
                        >
                          <span>{t.tipoFalla}</span>
                        </span>
                      )}
                      <span className="text-slate-300">·</span>
                      <span className="text-xs font-medium text-slate-600 truncate max-w-xs">
                        {t.schoolName}
                      </span>
                    </div>

                    <h4 className="text-xs sm:text-sm font-bold text-slate-900 hover:text-indigo-600 transition-colors">
                      {t.title}
                    </h4>

                    <div className="flex items-center gap-3 text-[11px] text-slate-500">
                      <span className="inline-flex items-center gap-1 font-mono text-slate-600">
                        <Clock className="w-3 h-3 text-indigo-500" />
                        <span>Hora VM: {t.horaIncidenciaVM || t.vmTimestamp || t.createdAt}</span>
                      </span>
                      <span>·</span>
                      <span>{t.classroomLab}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0 self-end md:self-center">
                    <span
                      className={`px-2 py-0.5 rounded text-xs font-bold border ${pConf.badgeBg}`}
                    >
                      {pConf.label}
                    </span>
                    <button
                      type="button"
                      className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-slate-100 transition-colors"
                      title="Ver detalle"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
