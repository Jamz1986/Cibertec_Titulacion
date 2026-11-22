import React, { useState } from 'react';
import { Ticket, TicketStatus } from '../types/helpdesk';
import { PRIORITY_CONFIGS } from '../data/mockData';
import {
  UserCheck,
  Clock,
  CheckCircle2,
  Wrench,
  ChevronRight,
  Search,
  MapPin,
  Zap,
  Inbox,
} from 'lucide-react';

interface AssignedTicketsViewProps {
  currentUserName: string;
  tickets: Ticket[];
  onSelectTicket: (ticket: Ticket) => void;
  onGoToAllTickets: () => void;
}

export const AssignedTicketsView: React.FC<AssignedTicketsViewProps> = ({
  currentUserName,
  tickets,
  onSelectTicket,
  onGoToAllTickets,
}) => {
  const [statusFilter, setStatusFilter] = useState<'all' | TicketStatus>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const assignedToMe = tickets.filter((t) => {
    const assignee = (t.asignadoA || t.assignedTechnician || '').trim().toLowerCase();
    const me = currentUserName.trim().toLowerCase();
    if (!assignee || !me) return false;
    return assignee === me || assignee.includes(me) || me.includes(assignee);
  });

  const filtered = assignedToMe.filter((t) => {
    if (statusFilter !== 'all' && t.status !== statusFilter) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        t.title.toLowerCase().includes(q) ||
        t.code.toLowerCase().includes(q) ||
        t.schoolName.toLowerCase().includes(q) ||
        t.description.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const openCount = assignedToMe.filter((t) => t.status === 'open').length;
  const inProgressCount = assignedToMe.filter(
    (t) => t.status === 'in_progress' || t.status === 'vmware_testing'
  ).length;
  const resolvedCount = assignedToMe.filter(
    (t) => t.status === 'resolved' || t.status === 'closed'
  ).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="p-5 rounded-2xl bg-white border border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold uppercase tracking-wider text-indigo-700">
              Bandeja Personal del Especialista
            </span>
            <span className="text-xs text-slate-300">·</span>
            <span className="text-xs font-semibold text-emerald-700">{currentUserName}</span>
          </div>
          <h1 className="text-lg font-bold text-slate-900 mt-0.5 flex items-center gap-2">
            <UserCheck className="w-5 h-5 text-indigo-600" />
            <span>Mis Tickets Asignados</span>
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Incidencias derivadas a su atención por el Administrador junto con el resumen e indicaciones técnicas del problema.
          </p>
        </div>

        <button
          type="button"
          onClick={onGoToAllTickets}
          className="px-3.5 py-2 rounded-xl border border-slate-300 bg-slate-50 hover:bg-slate-100 text-slate-800 text-xs font-semibold transition-colors cursor-pointer self-start md:self-auto"
        >
          Ver Todos los Tickets
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <button
          type="button"
          onClick={() => setStatusFilter('all')}
          className={`p-4 rounded-xl border text-left cursor-pointer transition-all ${
            statusFilter === 'all'
              ? 'bg-slate-900 text-white border-slate-900'
              : 'bg-white border-slate-200 hover:border-slate-300'
          }`}
        >
          <span className={`text-[11px] font-semibold block ${statusFilter === 'all' ? 'text-slate-300' : 'text-slate-500'}`}>
            Total Asignados
          </span>
          <span className="text-2xl font-bold font-mono mt-1 block">{assignedToMe.length}</span>
        </button>

        <button
          type="button"
          onClick={() => setStatusFilter(statusFilter === 'open' ? 'all' : 'open')}
          className={`p-4 rounded-xl border text-left cursor-pointer transition-all ${
            statusFilter === 'open'
              ? 'bg-amber-600 text-white border-amber-600'
              : 'bg-white border-amber-200 hover:border-amber-300'
          }`}
        >
          <span className={`text-[11px] font-semibold block ${statusFilter === 'open' ? 'text-amber-100' : 'text-amber-700'}`}>
            Por Iniciar (Abiertos)
          </span>
          <span className="text-2xl font-bold font-mono mt-1 block">{openCount}</span>
        </button>

        <button
          type="button"
          onClick={() => setStatusFilter(statusFilter === 'in_progress' ? 'all' : 'in_progress')}
          className={`p-4 rounded-xl border text-left cursor-pointer transition-all ${
            statusFilter === 'in_progress'
              ? 'bg-indigo-600 text-white border-indigo-600'
              : 'bg-white border-indigo-200 hover:border-indigo-300'
          }`}
        >
          <span className={`text-[11px] font-semibold block ${statusFilter === 'in_progress' ? 'text-indigo-100' : 'text-indigo-700'}`}>
            En Atención / Diagnóstico
          </span>
          <span className="text-2xl font-bold font-mono mt-1 block">{inProgressCount}</span>
        </button>

        <button
          type="button"
          onClick={() => setStatusFilter(statusFilter === 'resolved' ? 'all' : 'resolved')}
          className={`p-4 rounded-xl border text-left cursor-pointer transition-all ${
            statusFilter === 'resolved'
              ? 'bg-emerald-600 text-white border-emerald-600'
              : 'bg-white border-emerald-200 hover:border-emerald-300'
          }`}
        >
          <span className={`text-[11px] font-semibold block ${statusFilter === 'resolved' ? 'text-emerald-100' : 'text-emerald-700'}`}>
            Resueltos
          </span>
          <span className="text-2xl font-bold font-mono mt-1 block">{resolvedCount}</span>
        </button>
      </div>

      {/* Search */}
      <div className="p-3.5 rounded-xl bg-white border border-slate-200 flex items-center gap-3">
        <Search className="w-4 h-4 text-slate-400 shrink-0" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Buscar dentro de mis tickets asignados..."
          className="w-full text-xs text-slate-900 placeholder-slate-400 focus:outline-hidden"
        />
      </div>

      {/* Tickets List */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
        <div className="px-6 py-3 border-b border-slate-200 bg-slate-50/70 flex items-center justify-between text-xs font-semibold text-slate-600">
          <span>Tickets Asignados ({filtered.length})</span>
          <span className="text-slate-400 font-normal">Haga clic para atender y actualizar estado</span>
        </div>

        {filtered.length === 0 ? (
          <div className="p-12 text-center space-y-3">
            <Inbox className="w-8 h-8 text-slate-400 mx-auto" />
            <h3 className="text-sm font-bold text-slate-900">
              {assignedToMe.length === 0
                ? 'Aún no tiene tickets asignados directamente'
                : 'No hay tickets asignados con el filtro actual'}
            </h3>
            <p className="text-xs text-slate-500 max-w-md mx-auto">
              Cuando el Coordinador / Administrador le asigne una incidencia desde el detalle de un ticket, aparecerá aquí para su seguimiento continuo.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {filtered.map((ticket) => {
              const pConf = PRIORITY_CONFIGS[ticket.priority] || PRIORITY_CONFIGS.high;
              return (
                <div
                  key={ticket.id}
                  onClick={() => onSelectTicket(ticket)}
                  className="p-4 hover:bg-slate-50/80 transition-colors cursor-pointer flex flex-col md:flex-row md:items-center justify-between gap-4"
                >
                  <div className="space-y-1.5 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-mono text-xs font-bold text-slate-900 bg-slate-100 px-2 py-0.5 rounded">
                        {ticket.code}
                      </span>
                      {ticket.origen === 'AUTOMATICO' && (
                        <span className="font-mono text-[10px] font-bold px-1.5 py-0.5 rounded bg-purple-100 text-purple-800 border border-purple-200 flex items-center gap-0.5">
                          <Zap className="w-2.5 h-2.5 fill-current" />
                          <span>Telemetría</span>
                        </span>
                      )}
                      {ticket.distrito && (
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold px-1.5 py-0.5 rounded bg-sky-50 text-sky-800 border border-sky-200">
                          <MapPin className="w-2.5 h-2.5 text-sky-600" />
                          <span>{ticket.distrito}</span>
                        </span>
                      )}
                      <span className="text-xs text-slate-500">{ticket.schoolName}</span>
                    </div>

                    <h3 className="text-sm font-bold text-slate-900">{ticket.title}</h3>
                    <p className="text-xs text-slate-500 line-clamp-1">{ticket.description}</p>

                    {ticket.assignmentNote && (
                      <div className="mt-2 p-2.5 rounded-xl bg-indigo-50/80 border border-indigo-200 text-xs text-indigo-950 space-y-1">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-700">
                            Mensaje e Indicaciones del Administrador
                          </span>
                          {(ticket.assignedBy || ticket.assignedAt) && (
                            <span className="text-[10px] font-mono text-indigo-600">
                              {ticket.assignedBy ? `Por: ${ticket.assignedBy}` : ''}
                              {ticket.assignedBy && ticket.assignedAt ? ' · ' : ''}
                              {ticket.assignedAt || ''}
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-slate-800 leading-relaxed whitespace-pre-wrap">
                          {ticket.assignmentNote}
                        </p>
                      </div>
                    )}

                    <div className="flex items-center gap-2 text-[11px] text-slate-400">
                      <span className="inline-flex items-center gap-1 font-mono bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded">
                        <Clock className="w-3 h-3 text-indigo-500" />
                        <span>{ticket.horaIncidenciaVM || ticket.createdAt}</span>
                      </span>
                      <span>·</span>
                      <span className="text-indigo-700 font-semibold">
                        Asignado a: {ticket.asignadoA || ticket.assignedTechnician}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 shrink-0 self-end md:self-center">
                    <div className="flex flex-col items-end gap-1">
                      <span className={`px-2 py-0.5 rounded text-xs font-semibold border ${pConf.badgeBg}`}>
                        {pConf.label} · {pConf.slaHours}h
                      </span>
                      {ticket.status === 'resolved' ? (
                        <span className="text-xs font-medium text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3" />
                          <span>Resuelto</span>
                        </span>
                      ) : ticket.status === 'in_progress' ? (
                        <span className="text-xs font-medium text-blue-700 bg-blue-50 border border-blue-200 px-2 py-0.5 rounded flex items-center gap-1">
                          <Wrench className="w-3 h-3" />
                          <span>En Progreso</span>
                        </span>
                      ) : (
                        <span className="text-xs font-medium text-slate-700 bg-slate-100 border border-slate-200 px-2 py-0.5 rounded">
                          {ticket.status === 'vmware_testing' ? 'En Diagnóstico' : 'Abierto'}
                        </span>
                      )}
                    </div>

                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onSelectTicket(ticket);
                      }}
                      className="px-3 py-1.5 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-colors flex items-center gap-1 cursor-pointer"
                    >
                      <span>Atender</span>
                      <ChevronRight className="w-3.5 h-3.5" />
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
