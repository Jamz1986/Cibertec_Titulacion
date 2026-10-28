import React, { useState } from 'react';
import { Priority, PriorityConfig } from '../types/helpdesk';
import { PRIORITY_CONFIGS } from '../data/mockData';
import { Clock, HelpCircle, Check, AlertTriangle, ShieldAlert, Info } from 'lucide-react';

interface PrioritySelectorProps {
  value: Priority;
  onChange: (priority: Priority) => void;
  disabled?: boolean;
}

export const PrioritySelector: React.FC<PrioritySelectorProps> = ({
  value,
  onChange,
  disabled = false,
}) => {
  const [showMatrix, setShowMatrix] = useState(false);
  const priorities: Priority[] = ['low', 'medium', 'high', 'urgent'];

  const getPriorityIcon = (p: Priority) => {
    switch (p) {
      case 'low':
        return <Info className="w-4 h-4 text-sky-600 dark:text-sky-400" />;
      case 'medium':
        return <Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />;
      case 'high':
        return <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400" />;
      case 'urgent':
        return <ShieldAlert className="w-4 h-4 text-rose-600 dark:text-rose-400" />;
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <label className="block text-sm font-semibold text-slate-900 dark:text-slate-100">
            Nivel de Prioridad / Priority Level <span className="text-rose-500">*</span>
          </label>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Seleccione el impacto para asignar el tiempo máximo de atención (SLA) según directivas MINEDU / DRELM.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setShowMatrix(!showMatrix)}
          className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white transition-colors cursor-pointer"
        >
          <HelpCircle className="w-3.5 h-3.5" />
          <span>{showMatrix ? 'Ocultar Matriz SLA' : 'Guía de Categorización TI'}</span>
        </button>
      </div>

      {/* SLA Matrix Explainer Card */}
      {showMatrix && (
        <div className="p-3.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 text-xs text-slate-700 dark:text-slate-300 space-y-2">
          <div className="font-semibold text-slate-900 dark:text-white flex items-center gap-2">
            <span>Matriz de Impacto y Tiempos de Respuesta (SLA) para Soporte TI Escolar</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-2 pt-1">
            <div className="p-2 rounded border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950">
              <span className="font-bold text-sky-700 dark:text-sky-400 block">Baja (Low) · 48h</span>
              <p className="text-[11px] text-slate-600 dark:text-slate-400 mt-1">
                Solicitudes de nuevas imágenes OVA, dudas pedagógicas de software, configuraciones opcionales.
              </p>
            </div>
            <div className="p-2 rounded border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950">
              <span className="font-bold text-emerald-700 dark:text-emerald-400 block">Media (Medium) · 24h</span>
              <p className="text-[11px] text-slate-600 dark:text-slate-400 mt-1">
                Fallo en 1 o 2 máquinas del laboratorio; el docente puede continuar la clase reubicando alumnos.
              </p>
            </div>
            <div className="p-2 rounded border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950">
              <span className="font-bold text-amber-700 dark:text-amber-400 block">Alta (High) · 8h</span>
              <p className="text-[11px] text-slate-600 dark:text-slate-400 mt-1">
                Laboratorio AIP completo inoperativo (&gt;15 PCs), servidor proxy local caído o red vSwitch degradada.
              </p>
            </div>
            <div className="p-2 rounded border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950">
              <span className="font-bold text-rose-700 dark:text-rose-400 block">Urgente (Urgent) · 2h</span>
              <p className="text-[11px] text-slate-600 dark:text-slate-400 mt-1">
                Caída del hipervisor ESXi central durante jornada de exámenes MINEDU, corte general o riesgo de pérdida.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* 4-level Selector Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {priorities.map((p) => {
          const config: PriorityConfig = PRIORITY_CONFIGS[p];
          const isSelected = value === p;

          return (
            <button
              key={p}
              type="button"
              disabled={disabled}
              onClick={() => onChange(p)}
              className={`text-left p-3.5 rounded-xl border transition-all cursor-pointer relative ${
                isSelected
                  ? 'border-slate-900 dark:border-white ring-2 ring-slate-900/10 dark:ring-white/20 bg-white dark:bg-slate-900 shadow-sm'
                  : 'border-slate-200 dark:border-slate-800 bg-white/70 dark:bg-slate-900/60 hover:border-slate-300 dark:hover:border-slate-700 hover:bg-white dark:hover:bg-slate-900'
              } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              {/* Top row: Label + SLA badge */}
              <div className="flex items-center justify-between gap-2 mb-2">
                <div className="flex items-center gap-1.5">
                  {getPriorityIcon(p)}
                  <span className="text-sm font-bold text-slate-900 dark:text-white">
                    {config.label}
                  </span>
                  <span className="text-xs text-slate-400 dark:text-slate-500">
                    / {config.englishLabel}
                  </span>
                </div>

                <div
                  className={`inline-flex items-center gap-1 text-[11px] font-mono font-medium px-2 py-0.5 rounded ${
                    isSelected
                      ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-950'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                  }`}
                >
                  <Clock className="w-3 h-3" />
                  <span>&lt; {config.slaHours}h</span>
                </div>
              </div>

              {/* Criteria description */}
              <p className="text-xs text-slate-600 dark:text-slate-400 leading-snug line-clamp-2 min-h-[2.2rem]">
                {config.criteria}
              </p>

              {/* Bottom impact bar */}
              <div className="mt-2.5 pt-2 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-[11px]">
                <span className="text-slate-500 dark:text-slate-400 truncate">
                  {config.impactLevel.split(';')[0]}
                </span>
                {isSelected && (
                  <span className="font-semibold text-slate-900 dark:text-white shrink-0 ml-1">
                    ✓ Activo
                  </span>
                )}
              </div>
            </button>
          );
        })}
      </div>

      {/* Selected Priority Summary Callout */}
      <div className="px-3.5 py-2.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-900/40 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
        <div className="flex items-center gap-2 text-slate-700 dark:text-slate-300">
          <span className="font-semibold text-slate-900 dark:text-white">Prioridad seleccionada:</span>
          <span className="font-bold text-slate-900 dark:text-white">
            {PRIORITY_CONFIGS[value].label} ({PRIORITY_CONFIGS[value].englishLabel})
          </span>
          <span className="text-slate-400">·</span>
          <span className="text-slate-600 dark:text-slate-400">
            {PRIORITY_CONFIGS[value].slaDescription}
          </span>
        </div>
        <div className="text-slate-500 dark:text-slate-400 text-[11px]">
          Derivación automática a mesa de ayuda TI - UGEL
        </div>
      </div>
    </div>
  );
};
