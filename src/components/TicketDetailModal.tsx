import React, { useState } from 'react';
import { Ticket, Priority, TicketStatus, VMwareTestResult } from '../types/helpdesk';
import { PRIORITY_CONFIGS } from '../data/mockData';
import { VMwareTester } from './VMwareTester';
import {
  X,
  Clock,
  Building,
  User,
  Server,
  CheckCircle2,
  AlertTriangle,
  Play,
  MessageSquare,
  Send,
  ShieldCheck,
  FileText,
  Sliders,
  ZapOff,
  Radio,
  Activity,
  WifiOff,
  PhoneCall,
} from 'lucide-react';

import { useAuth } from '../context/AuthContext';
import { EmergencyPhoneModal } from './EmergencyPhoneModal';

interface TicketDetailModalProps {
  ticket: Ticket | null;
  isOpen: boolean;
  onClose: () => void;
  onUpdateTicket: (updated: Ticket) => void;
}

export const TicketDetailModal: React.FC<TicketDetailModalProps> = ({
  ticket,
  isOpen,
  onClose,
  onUpdateTicket,
}) => {
  const { currentUser, hasRole } = useAuth();
  const isTechnicianOrAdmin = hasRole(['TECNICO', 'ADMIN']);

  if (!isOpen || !ticket) return null;

  const [activeTab, setActiveTab] = useState<'info' | 'vmware_test' | 'comments'>('info');
  const [commentText, setCommentText] = useState('');
  const [commentAuthor, setCommentAuthor] = useState(
    currentUser?.nombre || 'Ing. Especialista TI'
  );
  const [resolutionNote, setResolutionNote] = useState(ticket.resolutionNotes || '');
  const [showPriorityEditor, setShowPriorityEditor] = useState(false);
  const [isPhoneModalOpen, setIsPhoneModalOpen] = useState(false);

  const handleLogCall = (_ticketId: string, logMessage: string) => {
    const updated: Ticket = {
      ...ticket,
      status: ticket.status === 'open' ? 'in_progress' : ticket.status,
      comments: [
        ...ticket.comments,
        {
          id: `c-call-${Date.now()}`,
          author: currentUser?.nombre || 'Administrador de Red NOC',
          role: 'Llamada de Contingencia',
          text: logMessage,
          timestamp: new Date().toISOString().replace('T', ' ').substring(0, 16),
        },
      ],
    };
    onUpdateTicket(updated);
  };

  const priorityConfig = PRIORITY_CONFIGS[ticket.priority];

  const handlePriorityChange = (newPriority: Priority) => {
    const updated: Ticket = {
      ...ticket,
      priority: newPriority,
      slaTargetHours: PRIORITY_CONFIGS[newPriority].slaHours,
      comments: [
        ...ticket.comments,
        {
          id: `c-${Date.now()}`,
          author: commentAuthor,
          role: 'Personal TI',
          text: `Prioridad reclasificada de ${PRIORITY_CONFIGS[ticket.priority].label} a ${PRIORITY_CONFIGS[newPriority].label} (${PRIORITY_CONFIGS[newPriority].englishLabel}) según evaluación técnica del personal.`,
          timestamp: new Date().toISOString().replace('T', ' ').substring(0, 16),
        },
      ],
    };
    onUpdateTicket(updated);
    setShowPriorityEditor(false);
  };

  const handleStatusChange = (newStatus: TicketStatus) => {
    const statusLabels: Record<TicketStatus, string> = {
      open: 'Abierto',
      vmware_testing: 'En Validación VMware',
      in_progress: 'En Progreso',
      resolved: 'Resuelto',
      closed: 'Cerrado',
    };

    const updated: Ticket = {
      ...ticket,
      status: newStatus,
      resolutionNotes: newStatus === 'resolved' ? resolutionNote || 'Incidencia atendida y validada en entorno VMware.' : ticket.resolutionNotes,
      comments: [
        ...ticket.comments,
        {
          id: `c-${Date.now()}`,
          author: commentAuthor,
          role: 'Personal TI',
          text: `Estado actualizado a "${statusLabels[newStatus]}".`,
          timestamp: new Date().toISOString().replace('T', ' ').substring(0, 16),
        },
      ],
    };
    onUpdateTicket(updated);
  };

  const handleAddComment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!commentText.trim()) return;

    const updated: Ticket = {
      ...ticket,
      comments: [
        ...ticket.comments,
        {
          id: `c-${Date.now()}`,
          author: commentAuthor,
          role: 'Especialista TI',
          text: commentText.trim(),
          timestamp: new Date().toISOString().replace('T', ' ').substring(0, 16),
        },
      ],
    };
    onUpdateTicket(updated);
    setCommentText('');
  };

  const handleTestComplete = (result: VMwareTestResult) => {
    const updated: Ticket = {
      ...ticket,
      status: result.overallStatus === 'PASS' ? 'resolved' : 'in_progress',
      vmwareTestResults: [...(ticket.vmwareTestResults || []), result],
      comments: [
        ...ticket.comments,
        {
          id: `c-${Date.now()}`,
          author: 'Módulo de Validación VMware',
          role: 'Test Automatizado',
          text: `Test de compatibilidad finalizado con estado ${result.overallStatus} (${result.compatibilityScore}%). Recomendación: ${result.recommendation}`,
          timestamp: new Date().toISOString().replace('T', ' ').substring(0, 16),
        },
      ],
    };
    onUpdateTicket(updated);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs overflow-y-auto">
      <div className="relative w-full max-w-4xl bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xl overflow-hidden my-6">
        {/* Top Header */}
        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="font-mono text-xs font-semibold px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                {ticket.code}
              </span>
              <span className="text-xs text-slate-500">·</span>
              <span className="text-xs font-medium text-slate-600 dark:text-slate-400">
                {ticket.ugel} · {ticket.schoolName}
              </span>
            </div>
            <h2 className="text-base font-bold text-slate-900 dark:text-white mt-1">
              {ticket.title}
            </h2>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Status and Priority Ribbon */}
        <div className="px-6 py-3 bg-slate-50 dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-3">
            {/* Priority with reclassify control */}
            <div className="flex items-center gap-2">
              <span className="text-slate-500 font-medium">Prioridad TI:</span>
              <div
                className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md font-bold text-xs border ${priorityConfig.badgeBg}`}
              >
                <span>
                  {priorityConfig.label} ({priorityConfig.englishLabel})
                </span>
                <span className="font-mono text-[11px]">SLA: {priorityConfig.slaHours}h</span>
              </div>
              {isTechnicianOrAdmin && (
                <button
                  onClick={() => setShowPriorityEditor(!showPriorityEditor)}
                  className="text-[11px] text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 font-medium underline cursor-pointer"
                >
                  {showPriorityEditor ? 'Cerrar' : 'Reclasificar'}
                </button>
              )}
            </div>

            <span className="text-slate-300 dark:text-slate-700">|</span>

            {/* Status Indicator / Selector */}
            <div className="flex items-center gap-1.5">
              <span className="text-slate-500 font-medium">Estado:</span>
              {isTechnicianOrAdmin ? (
                <select
                  value={ticket.status}
                  onChange={(e) => handleStatusChange(e.target.value as TicketStatus)}
                  className="px-2 py-0.5 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-medium"
                >
                  <option value="open">Abierto (En Cola)</option>
                  <option value="vmware_testing">En Validación VMware</option>
                  <option value="in_progress">En Progreso (Técnico Asignado)</option>
                  <option value="resolved">Resuelto</option>
                  <option value="closed">Cerrado</option>
                </select>
              ) : (
                <span className="px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 font-semibold text-slate-800 dark:text-slate-200">
                  {ticket.status === 'open'
                    ? 'Abierto'
                    : ticket.status === 'vmware_testing'
                    ? 'En Validación VMware'
                    : ticket.status === 'in_progress'
                    ? 'En Atención Técnica'
                    : ticket.status === 'resolved'
                    ? 'Resuelto'
                    : 'Cerrado'}
                </span>
              )}
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setIsPhoneModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg text-xs transition-colors cursor-pointer shadow-xs"
              title="Llamar telefónicamente a la autoridad de la institución educativa"
            >
              <PhoneCall className="w-3.5 h-3.5" />
              <span>Llamada de Contingencia</span>
            </button>
            <div className="flex items-center gap-1 text-slate-500 text-[11px]">
              <Clock className="w-3.5 h-3.5" />
              <span>Registrado: {ticket.createdAt}</span>
            </div>
          </div>
        </div>

        {/* Priority Quick Reclassify Panel */}
        {showPriorityEditor && (
          <div className="p-4 bg-indigo-50/50 dark:bg-indigo-950/20 border-b border-indigo-100 dark:border-indigo-900/40">
            <span className="text-xs font-bold text-slate-900 dark:text-white block mb-2">
              Reclasificar nivel de prioridad técnica (IT Staff Triage):
            </span>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
              {(['low', 'medium', 'high', 'urgent'] as Priority[]).map((p) => {
                const conf = PRIORITY_CONFIGS[p];
                const active = ticket.priority === p;
                return (
                  <button
                    key={p}
                    onClick={() => handlePriorityChange(p)}
                    className={`p-2 rounded-lg border text-left cursor-pointer transition-all ${
                      active
                        ? 'border-indigo-600 bg-white dark:bg-slate-800 ring-1 ring-indigo-500'
                        : 'border-slate-200 dark:border-slate-700 bg-white/70 dark:bg-slate-900 hover:border-slate-300'
                    }`}
                  >
                    <div className="font-bold text-slate-900 dark:text-white">
                      {conf.label} ({conf.englishLabel})
                    </div>
                    <div className="text-[11px] text-slate-500 font-mono">SLA &lt; {conf.slaHours}h</div>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Modal Navigation Tabs */}
        <div className="px-6 border-b border-slate-200 dark:border-slate-800 flex items-center gap-4 text-xs font-medium">
          <button
            onClick={() => setActiveTab('info')}
            className={`py-3 border-b-2 transition-colors cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'info'
                ? 'border-slate-900 text-slate-900 dark:border-white dark:text-white font-semibold'
                : 'border-transparent text-slate-500 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            <span>Ficha del Ticket & Datos Institucionales</span>
          </button>

          <button
            onClick={() => setActiveTab('vmware_test')}
            className={`py-3 border-b-2 transition-colors cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'vmware_test'
                ? 'border-indigo-600 text-indigo-600 dark:border-indigo-400 dark:text-indigo-400 font-semibold'
                : 'border-transparent text-slate-500 hover:text-indigo-600 dark:hover:text-indigo-400'
            }`}
          >
            <Server className="w-3.5 h-3.5" />
            <span>Pruebas de Compatibilidad VMware</span>
            {ticket.vmwareTestResults && ticket.vmwareTestResults.length > 0 && (
              <span className="ml-1 px-1.5 py-0.2 rounded-full text-[10px] bg-indigo-100 text-indigo-700 dark:bg-indigo-900 dark:text-indigo-300 font-mono">
                {ticket.vmwareTestResults.length}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('comments')}
            className={`py-3 border-b-2 transition-colors cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'comments'
                ? 'border-slate-900 text-slate-900 dark:border-white dark:text-white font-semibold'
                : 'border-transparent text-slate-500 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <MessageSquare className="w-3.5 h-3.5" />
            <span>Historial y Comentarios ({ticket.comments.length})</span>
          </button>
        </div>

        {/* Tab 1: Info */}
        {activeTab === 'info' && (
          <div className="p-6 space-y-6 max-h-[65vh] overflow-y-auto">
            {/* Description */}
            <div className="space-y-2">
              <span className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider block">
                Descripción del Problema
              </span>
              <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/30 text-xs text-slate-700 dark:text-slate-300 leading-relaxed whitespace-pre-wrap">
                {ticket.description}
              </div>
            </div>

            {/* School & Reporter Metadata */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
              <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 space-y-2">
                <span className="font-bold text-slate-900 dark:text-white block">
                  Ubicación Institucional
                </span>
                <div className="space-y-1 text-slate-600 dark:text-slate-400">
                  <p>
                    <strong className="text-slate-800 dark:text-slate-200">Colegio:</strong> {ticket.schoolName}
                  </p>
                  <p>
                    <strong className="text-slate-800 dark:text-slate-200">UGEL:</strong> {ticket.ugel}
                  </p>
                  <p>
                    <strong className="text-slate-800 dark:text-slate-200">Ambiente:</strong> {ticket.classroomLab}
                  </p>
                </div>
                <div className="pt-1.5">
                  <button
                    type="button"
                    onClick={() => setIsPhoneModalOpen(true)}
                    className="w-full py-1.5 px-2 bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/40 dark:hover:bg-emerald-900/40 border border-emerald-300 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <PhoneCall className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                    <span>Llamar al Director / CIST de la Sede</span>
                  </button>
                </div>
              </div>

              <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 space-y-2">
                <span className="font-bold text-slate-900 dark:text-white block">
                  Reportante / Contacto
                </span>
                <div className="space-y-1 text-slate-600 dark:text-slate-400">
                  <p>
                    <strong className="text-slate-800 dark:text-slate-200">Nombre:</strong> {ticket.reporterName}
                  </p>
                  <p>
                    <strong className="text-slate-800 dark:text-slate-200">Rol:</strong> {ticket.reporterRole}
                  </p>
                  <p>
                    <strong className="text-slate-800 dark:text-slate-200">Correo:</strong> {ticket.reporterEmail}
                  </p>
                </div>
              </div>
            </div>

            {/* Telemetría Zabbix de Siniestro Zonal / Apagón si aplica */}
            {ticket.telemetriaZabbix && (
              <div className="p-4 rounded-xl border border-red-300 dark:border-red-900/60 bg-red-50/60 dark:bg-red-950/30 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="p-1 rounded-md bg-red-600 text-white">
                      <ZapOff className="w-4 h-4" />
                    </span>
                    <div>
                      <h4 className="text-xs font-bold text-red-950 dark:text-red-200">
                        Telemetría Zabbix NOC: Detección Automática de Siniestro
                      </h4>
                      <p className="text-[11px] text-red-700 dark:text-red-300">
                        Diagnóstico: {ticket.telemetriaZabbix.probableCausa === 'CORTE_ELECTRICO_MASIVO'
                          ? 'Apagón Eléctrico Masivo en Subestación (Enel/Luz del Sur)'
                          : ticket.telemetriaZabbix.probableCausa === 'CORTE_FIBRA_OPTICA_TRONCAL'
                          ? 'Corte de Enlace Troncal de Fibra Óptica (Proveedor ISP)'
                          : 'Avería Eléctrica Local Aislada'}
                      </p>
                    </div>
                  </div>
                  <span className="text-[11px] font-mono font-bold px-2 py-0.5 rounded bg-red-200 text-red-900 dark:bg-red-900/80 dark:text-red-200">
                    Confianza: {ticket.telemetriaZabbix.correlationConfidence}%
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                  <div className="p-2 rounded bg-white/90 dark:bg-slate-900 border border-red-200 dark:border-red-900/40">
                    <span className="text-slate-400 block text-[10px]">Trampa Last Gasp</span>
                    <span className="font-semibold text-slate-800 dark:text-slate-200">
                      {ticket.telemetriaZabbix.lastGaspReceived ? '✅ Recibida (UDP 162)' : '❌ No recibida'}
                    </span>
                  </div>
                  <div className="p-2 rounded bg-white/90 dark:bg-slate-900 border border-red-200 dark:border-red-900/40">
                    <span className="text-slate-400 block text-[10px]">Heartbeat Fails</span>
                    <span className="font-semibold text-red-700 dark:text-red-400 font-mono">
                      {ticket.telemetriaZabbix.heartbeatConsecutiveFails} timeouts (Dead Man's)
                    </span>
                  </div>
                  <div className="p-2 rounded bg-white/90 dark:bg-slate-900 border border-red-200 dark:border-red-900/40">
                    <span className="text-slate-400 block text-[10px]">Batería UPS Residual</span>
                    <span className="font-semibold text-slate-800 dark:text-slate-200 font-mono">
                      {ticket.telemetriaZabbix.upsResidualBatteryPct ? `${ticket.telemetriaZabbix.upsResidualBatteryPct}%` : 'N/A'}
                    </span>
                  </div>
                  <div className="p-2 rounded bg-white/90 dark:bg-slate-900 border border-red-200 dark:border-red-900/40">
                    <span className="text-slate-400 block text-[10px]">Zona de Suministro</span>
                    <span className="font-semibold text-slate-800 dark:text-slate-200 truncate block">
                      {ticket.telemetriaZabbix.zonaSuministro || ticket.ugel}
                    </span>
                  </div>
                </div>

                {ticket.telemetriaZabbix.colegiosAfectadosEnSector && ticket.telemetriaZabbix.colegiosAfectadosEnSector.length > 0 && (
                  <div className="pt-2 border-t border-red-200 dark:border-red-900/40 text-[11px] text-red-900 dark:text-red-300">
                    <strong>Colegios asociados al mismo siniestro zonal:</strong>{' '}
                    {ticket.telemetriaZabbix.colegiosAfectadosEnSector.join(' · ')}
                  </div>
                )}
              </div>
            )}

            {/* Attached VMware Specs if present */}
            {ticket.vmwareEnv && (
              <div className="p-4 rounded-xl border border-indigo-200 dark:border-indigo-900/50 bg-indigo-50/30 dark:bg-indigo-950/20 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-indigo-950 dark:text-indigo-200 flex items-center gap-1.5">
                    <Server className="w-4 h-4 text-indigo-600" />
                    <span>Entorno Virtual VMware Asociado</span>
                  </span>
                  <button
                    onClick={() => setActiveTab('vmware_test')}
                    className="inline-flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 text-white cursor-pointer transition-colors shadow-xs"
                  >
                    <Play className="w-3 h-3 fill-current" />
                    <span>Abrir Banco de Pruebas VMware</span>
                  </button>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                  <div className="p-2 rounded bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                    <span className="text-slate-400 block text-[11px]">Hipervisor</span>
                    <span className="font-semibold text-slate-800 dark:text-slate-200">
                      {ticket.vmwareEnv.hypervisor}
                    </span>
                  </div>
                  <div className="p-2 rounded bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                    <span className="text-slate-400 block text-[11px]">SO Invitado</span>
                    <span className="font-semibold text-slate-800 dark:text-slate-200">
                      {ticket.vmwareEnv.guestOS}
                    </span>
                  </div>
                  <div className="p-2 rounded bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                    <span className="text-slate-400 block text-[11px]">vCPU / RAM</span>
                    <span className="font-semibold text-slate-800 dark:text-slate-200 font-mono">
                      {ticket.vmwareEnv.vcpu} vCPU / {ticket.vmwareEnv.ramGb}GB
                    </span>
                  </div>
                  <div className="p-2 rounded bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                    <span className="text-slate-400 block text-[11px]">VMware Tools</span>
                    <span className="font-semibold text-slate-800 dark:text-slate-200">
                      {ticket.vmwareEnv.vmwareToolsStatus}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Resolution Notes */}
            {ticket.status === 'resolved' && (
              <div className="p-4 rounded-xl border border-emerald-200 dark:border-emerald-900/50 bg-emerald-50/40 dark:bg-emerald-950/20 space-y-1 text-xs">
                <span className="font-bold text-emerald-900 dark:text-emerald-200 flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span>Notas de Resolución Técnica</span>
                </span>
                <p className="text-emerald-800 dark:text-emerald-300">
                  {ticket.resolutionNotes || 'Incidencia resuelta conforme al protocolo tecnológico.'}
                </p>
              </div>
            )}
          </div>
        )}

        {/* Tab 2: VMware Tester Tab */}
        {activeTab === 'vmware_test' && (
          <div className="p-6 max-h-[65vh] overflow-y-auto">
            <VMwareTester
              initialEnv={ticket.vmwareEnv}
              ticketCode={ticket.code}
              onTestComplete={handleTestComplete}
            />
          </div>
        )}

        {/* Tab 3: Comments & Timeline */}
        {activeTab === 'comments' && (
          <div className="p-6 space-y-4 max-h-[65vh] overflow-y-auto">
            <div className="space-y-3">
              {ticket.comments.map((c) => (
                <div
                  key={c.id}
                  className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-950/40 text-xs space-y-1"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-900 dark:text-white">{c.author}</span>
                      <span className="text-slate-400">({c.role})</span>
                    </div>
                    <span className="text-[11px] font-mono text-slate-400">{c.timestamp}</span>
                  </div>
                  <p className="text-slate-700 dark:text-slate-300 leading-relaxed">{c.text}</p>
                </div>
              ))}
            </div>

            {/* Add comment form */}
            <form onSubmit={handleAddComment} className="pt-3 border-t border-slate-200 dark:border-slate-800 space-y-2">
              <span className="text-xs font-semibold text-slate-900 dark:text-white block">
                Agregar nota o actualización técnica:
              </span>
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Escriba la acción realizada, diagnóstico o coordinación con el docente..."
                  value={commentText}
                  onChange={(e) => setCommentText(e.target.value)}
                  className="flex-1 px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-900 dark:text-white focus:ring-1 focus:ring-indigo-500"
                />
                <button
                  type="submit"
                  className="px-4 py-2 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-lg text-xs font-semibold hover:bg-slate-800 dark:hover:bg-slate-100 transition-colors cursor-pointer flex items-center gap-1.5"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>Enviar</span>
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Modal Footer */}
        <div className="px-6 py-3.5 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 flex items-center justify-between text-xs">
          <div className="text-slate-500">
            Mesa de Ayuda UGEL Lima Metropolitana · Tesis de Titulación
          </div>
          <button
            onClick={onClose}
            className="px-4 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
          >
            Cerrar Ficha
          </button>
        </div>
      </div>

      {/* Emergency Telephone Console */}
      <EmergencyPhoneModal
        isOpen={isPhoneModalOpen}
        onClose={() => setIsPhoneModalOpen(false)}
        targetSchoolName={ticket.schoolName}
        associatedTicket={ticket}
        onLogCallToTicket={handleLogCall}
      />
    </div>
  );
};
