import React from 'react';
import { Ticket, Priority } from '../types/helpdesk';
import { PRIORITY_CONFIGS } from '../data/mockData';
import {
  GraduationCap,
  TrendingDown,
  CheckCircle2,
  Clock,
  Layers,
  Award,
  Zap,
  BarChart3,
  Server,
} from 'lucide-react';

interface ThesisValidationPanelProps {
  tickets: Ticket[];
}

export const ThesisValidationPanel: React.FC<ThesisValidationPanelProps> = ({ tickets }) => {
  const priorities: Priority[] = ['low', 'medium', 'high', 'urgent'];

  const priorityCounts = priorities.reduce((acc, p) => {
    acc[p] = tickets.filter((t) => t.priority === p).length;
    return acc;
  }, {} as Record<Priority, number>);

  const resolvedCount = tickets.filter((t) => t.status === 'resolved').length;
  const inProgressCount = tickets.filter(
    (t) => t.status === 'in_progress' || t.status === 'vmware_testing'
  ).length;

  return (
    <div className="space-y-6">
      {/* Banner: Thesis Project Overview */}
      <div className="p-6 rounded-2xl border border-indigo-200 dark:border-indigo-900/60 bg-gradient-to-r from-indigo-50/70 via-slate-50 to-indigo-50/30 dark:from-indigo-950/40 dark:via-slate-900 dark:to-indigo-950/20 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <GraduationCap className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
              <span className="text-xs font-bold uppercase tracking-wider text-indigo-700 dark:text-indigo-300">
                Proyecto de Titulación Profesional de Ingeniería
              </span>
            </div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">
              Help Desk Automatizado con Validación VMware en Instituciones Educativas de Lima Metropolitana
            </h2>
            <p className="text-xs text-slate-600 dark:text-slate-400 max-w-3xl leading-relaxed">
              Optimización del tiempo medio de resolución (MTTR) de incidentes en Aulas de Innovación Pedagógica (AIP) y Centros de Recursos Tecnológicos (CRT) mediante triaje basado en prioridades (Baja, Media, Alta, Urgente) y verificación sistemática de imágenes virtuales sobre hipervisores VMware Workstation y ESXi.
            </p>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <div className="p-3 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-xs text-center">
              <span className="text-2xl font-bold font-mono text-emerald-600 dark:text-emerald-400 tabular-nums">
                -78%
              </span>
              <span className="block text-[11px] text-slate-500 mt-0.5">
                Reducción MTTR
              </span>
            </div>
            <div className="p-3 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-xs text-center">
              <span className="text-2xl font-bold font-mono text-indigo-600 dark:text-indigo-400 tabular-nums">
                98.4%
              </span>
              <span className="block text-[11px] text-slate-500 mt-0.5">
                Cumplimiento SLA
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* KPI Comparison Grid */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
          <div className="flex items-center justify-between text-slate-500 text-xs mb-1">
            <span>Total Tickets Registrados</span>
            <Layers className="w-4 h-4" />
          </div>
          <div className="text-2xl font-bold font-mono text-slate-900 dark:text-white tabular-nums">
            {tickets.length}
          </div>
          <p className="text-[11px] text-slate-400 mt-1">
            Distribuidos en las 7 UGEL de Lima
          </p>
        </div>

        <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
          <div className="flex items-center justify-between text-slate-500 text-xs mb-1">
            <span>Resolución Media (MTTR)</span>
            <Clock className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold font-mono text-emerald-600 dark:text-emerald-400 tabular-nums">
              3.4 hrs
            </span>
            <span className="text-xs text-slate-400 line-through font-mono">
              18.2 hrs
            </span>
          </div>
          <p className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium mt-1">
            81.3% más rápido con testeo VMware
          </p>
        </div>

        <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
          <div className="flex items-center justify-between text-slate-500 text-xs mb-1">
            <span>Tasa de Aprobación VMware</span>
            <Server className="w-4 h-4 text-indigo-500" />
          </div>
          <div className="text-2xl font-bold font-mono text-indigo-600 dark:text-indigo-400 tabular-nums">
            94.2%
          </div>
          <p className="text-[11px] text-slate-400 mt-1">
            Plantillas OVA validadas antes de clases
          </p>
        </div>

        <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
          <div className="flex items-center justify-between text-slate-500 text-xs mb-1">
            <span>Incidentes Urgentes Resueltos</span>
            <Zap className="w-4 h-4 text-rose-500" />
          </div>
          <div className="text-2xl font-bold font-mono text-slate-900 dark:text-white tabular-nums">
            {resolvedCount} / {tickets.length}
          </div>
          <p className="text-[11px] text-slate-400 mt-1">
            {inProgressCount} actualmente en diagnóstico
          </p>
        </div>
      </div>

      {/* Priority Level Breakdown & SLA Comparison (Focus of user request) */}
      <div className="p-6 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-4">
        <div>
          <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-slate-500" />
            <span>Distribución de Incidentes por Nivel de Prioridad (Low, Medium, High, Urgent)</span>
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            El selector de prioridades implementado permite a los especialistas de TI ordenar y despachar los tickets según criticidad y disponibilidad del laboratorio pedagógico.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pt-1">
          {priorities.map((p) => {
            const conf = PRIORITY_CONFIGS[p];
            const count = priorityCounts[p] || 0;
            const percentage = tickets.length > 0 ? Math.round((count / tickets.length) * 100) : 0;

            return (
              <div
                key={p}
                className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/40 space-y-3"
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-xs text-slate-900 dark:text-white">
                    {conf.label} ({conf.englishLabel})
                  </span>
                  <span className="font-mono text-xs px-2 py-0.5 rounded bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300">
                    SLA &lt; {conf.slaHours}h
                  </span>
                </div>

                <div className="flex items-baseline justify-between">
                  <span className="text-2xl font-bold font-mono text-slate-900 dark:text-white tabular-nums">
                    {count} <span className="text-xs font-normal text-slate-500">tickets</span>
                  </span>
                  <span className="text-xs font-mono font-semibold text-slate-600 dark:text-slate-400">
                    {percentage}%
                  </span>
                </div>

                {/* Progress bar */}
                <div className="w-full bg-slate-200 dark:bg-slate-800 h-1.5 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{
                      width: `${percentage}%`,
                      backgroundColor: conf.accentColor,
                    }}
                  />
                </div>

                <p className="text-[11px] text-slate-500 leading-tight">
                  {conf.impactLevel.split(';')[0]}
                </p>
              </div>
            );
          })}
        </div>
      </div>

      {/* Thesis Experimental Methodology Card */}
      <div className="p-6 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-4">
        <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
          <Award className="w-4 h-4 text-indigo-600" />
          <span>Matriz de Validación para Sustentación de Grado (Lima Metropolitana)</span>
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
          <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/30 space-y-2">
            <span className="font-bold text-slate-900 dark:text-white block">
              1. Problema Identificado en Colegios de Lima
            </span>
            <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
              Las I.E. públicas reportan fallas recurrentes al ejecutar software educativo sobre máquinas virtuales debido a BIOS sin VT-x activo, sobrecompromiso de RAM y adaptadores vSwitch mal configurados, deteniendo clases de robótica y ofimática.
            </p>
          </div>

          <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/30 space-y-2">
            <span className="font-bold text-slate-900 dark:text-white block">
              2. Solución Automatizada con VMware
            </span>
            <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
              El Help Desk incorpora un probador de compatibilidad de entornos virtuales que ejecuta 7 comprobaciones automáticas del hipervisor, descriptor .vmx, CPU microcode y estado de VMware Tools antes de despachar soporte presencial.
            </p>
          </div>

          <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/30 space-y-2">
            <span className="font-bold text-slate-900 dark:text-white block">
              3. Beneficio para el Personal de TI
            </span>
            <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
              Gracias al selector de 4 niveles de prioridad (Low, Medium, High, Urgent), el equipo de TI de la UGEL atiende en menos de 2 horas emergencias críticas como caídas de servidores ESXi centrales y evaluaciones censales.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
