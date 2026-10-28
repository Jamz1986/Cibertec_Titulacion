import React, { useState } from 'react';
import { Ticket, Priority, TicketStatus, UGELCode } from './types/helpdesk';
import { INITIAL_TICKETS, PRIORITY_CONFIGS } from './data/mockData';
import { PrioritySelector } from './components/PrioritySelector';
import { VMwareTester } from './components/VMwareTester';
import { TicketSubmissionModal } from './components/TicketSubmissionModal';
import { TicketDetailModal } from './components/TicketDetailModal';
import { ThesisValidationPanel } from './components/ThesisValidationPanel';
import { ArchitectureDocs } from './components/ArchitectureDocs';
import { ZonalBlackoutMonitor } from './components/ZonalBlackoutMonitor';
import { useAuth } from './context/AuthContext';
import { ShareDeployModal } from './components/ShareDeployModal';
import {
  Server,
  Plus,
  Search,
  Filter,
  Clock,
  CheckCircle2,
  AlertTriangle,
  ShieldAlert,
  Play,
  Building,
  GraduationCap,
  Layers,
  ChevronRight,
  Info,
  Sliders,
  RefreshCw,
  Cpu,
  User,
  Wrench,
  ShieldCheck,
  Zap,
  LogIn,
  LogOut,
  SlidersHorizontal,
  Share2,
  Radio,
  PhoneCall,
  ZapOff,
  Volume2,
  Network,
} from 'lucide-react';
import { EmergencyPhoneModal } from './components/EmergencyPhoneModal';
import { LoginPortal } from './components/LoginPortal';
import { PacketTracerTopology } from './components/PacketTracerTopology';

export default function App() {
  const { currentUser, logout, hasRole } = useAuth();
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const isGeneralUser = currentUser?.rol === 'DOCENTE' || currentUser?.rol === 'ALUMNO';
  const isTechnician = currentUser?.rol === 'TECNICO';
  const isAdmin = currentUser?.rol === 'ADMIN';

  const [activeSection, setActiveSection] = useState<
    'tickets' | 'packet-tracer' | 'vmware' | 'siniestros' | 'priorities' | 'thesis' | 'architecture'
  >('tickets');
  const [tickets, setTickets] = useState<Ticket[]>(INITIAL_TICKETS);
  const [isNewTicketModalOpen, setIsNewTicketModalOpen] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [priorityFilter, setPriorityFilter] = useState<'all' | Priority>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | TicketStatus>('all');
  const [ugelFilter, setUgelFilter] = useState<'all' | UGELCode>('all');
  const [origenFilter, setOrigenFilter] = useState<'all' | 'AUTOMATICO' | 'MANUAL'>('all');
  const [onlyMyTickets, setOnlyMyTickets] = useState<boolean>(isGeneralUser);

  // When switching role, align default view and filtering
  React.useEffect(() => {
    setOnlyMyTickets(isGeneralUser);
    if (isGeneralUser && (activeSection === 'vmware' || activeSection === 'thesis')) {
      setActiveSection('tickets');
    }
  }, [currentUser?.rol]);

  // Priority sandbox tester in Priorities tab
  const [sandboxPriority, setSandboxPriority] = useState<Priority>('high');

  // Critical Blackout / Silent Disconnection Alert for Administrator
  const [criticalBlackoutAlert, setCriticalBlackoutAlert] = useState<{
    ticket: Ticket;
    schoolName: string;
    ugel: string;
    probableCausa?: string;
  } | null>(null);

  const [isPhoneModalOpen, setIsPhoneModalOpen] = useState(false);
  const [phoneTargetSchool, setPhoneTargetSchool] = useState<string>('I.E. Antenor Orrego Espinoza');

  const handleAddNewTicket = (newTicket: Ticket) => {
    setTickets((prev) => [newTicket, ...prev]);

    // If it's a critical blackout / silent disconnection, alert the Network Administrator
    if (
      newTicket.sinistroZonal ||
      newTicket.outageCause === 'CORTE_ELECTRICO_MASIVO' ||
      newTicket.telemetriaZabbix?.probableCausa === 'CORTE_ELECTRICO_MASIVO'
    ) {
      setCriticalBlackoutAlert({
        ticket: newTicket,
        schoolName: newTicket.schoolName,
        ugel: newTicket.ugel,
        probableCausa: newTicket.telemetriaZabbix?.probableCausa || 'CORTE_ELECTRICO_MASIVO',
      });
      setPhoneTargetSchool(newTicket.schoolName);
    }
  };

  const handleLogCallToTicket = (ticketId: string, logMessage: string) => {
    setTickets((prev) =>
      prev.map((t) => {
        if (t.id === ticketId) {
          const updated: Ticket = {
            ...t,
            status: t.status === 'open' ? 'in_progress' : t.status,
            comments: [
              ...t.comments,
              {
                id: `c-call-${Date.now()}`,
                author: currentUser?.nombre || 'Administrador de Red NOC',
                role: 'Llamada de Contingencia',
                text: logMessage,
                timestamp: new Date().toISOString().replace('T', ' ').substring(0, 16),
              },
            ],
          };
          if (selectedTicket?.id === ticketId) {
            setSelectedTicket(updated);
          }
          if (criticalBlackoutAlert?.ticket.id === ticketId) {
            setCriticalBlackoutAlert({
              ...criticalBlackoutAlert,
              ticket: updated,
            });
          }
          return updated;
        }
        return t;
      })
    );
  };

  const handleUpdateTicket = (updated: Ticket) => {
    setTickets(tickets.map((t) => (t.id === updated.id ? updated : t)));
    setSelectedTicket(updated);
  };

  // Automated trigger from Zabbix SNMP webhook (Pág. 32-34 del informe)
  const triggerSimulatedZabbixAlert = () => {
    const now = new Date();
    const formattedDate = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(
      now.getDate()
    ).padStart(2, '0')} ${String(now.getHours()).padStart(2, '0')}:${String(
      now.getMinutes()
    ).padStart(2, '0')}`;

    const newAutoTicket: Ticket = {
      id: `t-zabbix-${Date.now()}`,
      code: `TK-${now.getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`,
      title: 'Alerta Zabbix SNMP: Puerto Gi0/12 Switch Cisco Catalyst DOWN (VLAN 30)',
      titulo: 'Alerta Zabbix SNMP: Puerto Gi0/12 Switch Cisco Catalyst DOWN (VLAN 30)',
      description: 'El servidor Zabbix recibió trampa SNMP ifOperStatus = DOWN en la interfaz de red del Laboratorio 2. Se interrumpieron 24 PCs clientes virtuales.',
      descripcion: 'El servidor Zabbix recibió trampa SNMP ifOperStatus = DOWN en la interfaz de red del Laboratorio 2.',
      origen: 'AUTOMATICO',
      priority: 'high',
      status: 'open',
      category: 'networking_connectivity',
      ugel: 'UGEL 03',
      sede: 'Sede San Isidro - Switch Core',
      schoolName: 'I.E. Gran Unidad Escolar Alfonso Ugarte (San Isidro)',
      reporterUserId: 'usr-4',
      reporterName: 'Sensor Zabbix SNMPv3 (VLAN 30)',
      reporterRole: 'Monitoreo Proactivo de Red',
      reporterEmail: 'zabbix-webhook@cibertec.edu.pe',
      classroomLab: 'Laboratorio AIP 2 (Pabellón B)',
      createdAt: formattedDate,
      slaTargetHours: 8,
      assignedTechnician: 'Ing. Leonardo Granados Ortega',
      comments: [
        {
          id: `c-${Date.now()}`,
          author: 'Zabbix Webhook API',
          role: 'Integración Automatizada',
          text: 'Trigger de red detectado automáticamente. Incidencia generada de forma predictiva según arquitectura Pág. 31 del proyecto CIBERTEC.',
          timestamp: formattedDate,
        },
      ],
    };

    setTickets([newAutoTicket, ...tickets]);
  };

  const filteredTickets = tickets.filter((t) => {
    if (onlyMyTickets && currentUser) {
      const isMine =
        t.reporterUserId === currentUser.id ||
        t.reporterEmail.toLowerCase() === currentUser.email.toLowerCase();
      if (!isMine) return false;
    }
    if (origenFilter !== 'all' && t.origen !== origenFilter) return false;
    if (priorityFilter !== 'all' && t.priority !== priorityFilter) return false;
    if (statusFilter !== 'all' && t.status !== statusFilter) return false;
    if (ugelFilter !== 'all' && t.ugel !== ugelFilter) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const match =
        t.title.toLowerCase().includes(q) ||
        t.code.toLowerCase().includes(q) ||
        t.schoolName.toLowerCase().includes(q) ||
        t.reporterName.toLowerCase().includes(q) ||
        t.description.toLowerCase().includes(q);
      if (!match) return false;
    }
    return true;
  });

  const getPriorityBadge = (p: Priority) => {
    const conf = PRIORITY_CONFIGS[p];
    return (
      <span
        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-semibold border ${conf.badgeBg}`}
      >
        <span>
          {conf.label} ({conf.englishLabel})
        </span>
        <span className="font-mono text-[10px]">· {conf.slaHours}h</span>
      </span>
    );
  };

  const getStatusBadge = (s: TicketStatus) => {
    switch (s) {
      case 'open':
        return (
          <span className="text-xs font-medium text-slate-700 bg-slate-100 border border-slate-200 px-2 py-0.5 rounded">
            Abierto
          </span>
        );
      case 'vmware_testing':
        return (
          <span className="text-xs font-medium text-indigo-700 bg-indigo-50 border border-indigo-200 px-2 py-0.5 rounded flex items-center gap-1">
            <Server className="w-3 h-3" />
            <span>En Test VMware</span>
          </span>
        );
      case 'in_progress':
        return (
          <span className="text-xs font-medium text-blue-700 bg-blue-50 border border-blue-200 px-2 py-0.5 rounded">
            En Progreso
          </span>
        );
      case 'resolved':
        return (
          <span className="text-xs font-medium text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3" />
            <span>Resuelto</span>
          </span>
        );
      case 'closed':
        return (
          <span className="text-xs font-medium text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
            Cerrado
          </span>
        );
    }
  };

  // Si no hay sesión iniciada, mostrar la Pantalla de Inicio / Acceso Institucional primero
  if (!currentUser) {
    return <LoginPortal />;
  }

  return (
    <div className="min-h-screen bg-[#f8fafc] text-slate-900 flex flex-col font-sans">
      {/* Top Bar Contract: 3 zones separated by gap-8 */}
      <header className="flex items-center justify-between gap-8 px-6 py-4 bg-white border-b border-slate-200 sticky top-0 z-30">
        {/* Zone 1: Single text element wordmark */}
        <div className="flex items-center gap-2 whitespace-nowrap shrink-0">
          <Server className="w-5 h-5 text-indigo-600" />
          <span className="text-base font-bold tracking-tight text-slate-900">
            HelpDesk CIBERTEC · Monitoreo & VMware
          </span>
        </div>

        {/* Zone 2: Concise single-line navigation links based on user role */}
        <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-slate-600">
          <button
            onClick={() => setActiveSection('tickets')}
            className={`whitespace-nowrap shrink-0 transition-colors cursor-pointer pb-0.5 ${
              activeSection === 'tickets'
                ? 'text-indigo-600 font-semibold border-b-2 border-indigo-600'
                : 'hover:text-slate-900'
            }`}
          >
            Incidentes & Tickets
          </button>

          <button
            onClick={() => setActiveSection('packet-tracer')}
            className={`whitespace-nowrap shrink-0 transition-colors cursor-pointer pb-0.5 flex items-center gap-1.5 ${
              activeSection === 'packet-tracer'
                ? 'text-indigo-600 font-semibold border-b-2 border-indigo-600'
                : 'hover:text-slate-900'
            }`}
          >
            <Network className="w-3.5 h-3.5 text-indigo-500" />
            <span>Topología Packet Tracer</span>
          </button>

          {!isGeneralUser && (
            <button
              onClick={() => setActiveSection('vmware')}
              className={`whitespace-nowrap shrink-0 transition-colors cursor-pointer pb-0.5 ${
                activeSection === 'vmware'
                  ? 'text-indigo-600 font-semibold border-b-2 border-indigo-600'
                  : 'hover:text-slate-900'
              }`}
            >
              Banco de Pruebas VMware
            </button>
          )}

          <button
            onClick={() => setActiveSection('siniestros')}
            className={`whitespace-nowrap shrink-0 transition-colors cursor-pointer pb-0.5 flex items-center gap-1.5 ${
              activeSection === 'siniestros'
                ? 'text-red-600 font-semibold border-b-2 border-red-600'
                : 'hover:text-slate-900'
            }`}
          >
            <Radio className="w-3.5 h-3.5 text-red-500 animate-pulse" />
            <span>Siniestros & Apagones Zabbix</span>
          </button>

          <button
            onClick={() => setActiveSection('priorities')}
            className={`whitespace-nowrap shrink-0 transition-colors cursor-pointer pb-0.5 ${
              activeSection === 'priorities'
                ? 'text-indigo-600 font-semibold border-b-2 border-indigo-600'
                : 'hover:text-slate-900'
            }`}
          >
            {isGeneralUser ? 'Guía de Prioridades SLA' : 'Selector & Matriz Prioridades'}
          </button>

          {!isGeneralUser && (
            <button
              onClick={() => setActiveSection('thesis')}
              className={`whitespace-nowrap shrink-0 transition-colors cursor-pointer pb-0.5 ${
                activeSection === 'thesis'
                  ? 'text-indigo-600 font-semibold border-b-2 border-indigo-600'
                  : 'hover:text-slate-900'
              }`}
            >
              Métricas de Titulación
            </button>
          )}

          <button
            onClick={() => setActiveSection('architecture')}
            className={`whitespace-nowrap shrink-0 transition-colors cursor-pointer pb-0.5 ${
              activeSection === 'architecture'
                ? 'text-indigo-600 font-semibold border-b-2 border-indigo-600'
                : 'hover:text-slate-900'
            }`}
          >
            {isGeneralUser ? 'Memoria del Proyecto' : 'MySQL & VMware Real'}
          </button>
        </nav>

        {/* Zone 3: Member Profile & Primary Action */}
        <div className="flex items-center gap-3 shrink-0">
          {/* Share Modal Opener */}
          <button
            onClick={() => setIsShareModalOpen(true)}
            title="Enlaces de acceso para el equipo"
            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-indigo-200 bg-indigo-50/70 hover:bg-indigo-100 text-indigo-700 text-xs font-semibold transition-colors cursor-pointer"
          >
            <Share2 className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Equipo</span>
          </button>

          {/* Authenticated Member Profile Display */}
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl border border-slate-200 bg-slate-50">
            <div
              className={`w-2.5 h-2.5 rounded-full shrink-0 ${
                currentUser?.rol === 'ADMIN' ? 'bg-rose-500' : 'bg-emerald-500'
              }`}
            />
            <div className="text-left">
              <p className="text-xs font-bold text-slate-800 leading-tight">
                {currentUser?.nombre}
              </p>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span
                  className={`text-[9px] font-bold px-1.5 py-0.2 rounded uppercase ${
                    currentUser?.rol === 'ADMIN'
                      ? 'bg-rose-100 text-rose-700'
                      : 'bg-emerald-100 text-emerald-700'
                  }`}
                >
                  {currentUser?.rol === 'ADMIN' ? 'Admin NOC' : 'Técnico TI'}
                </span>
                <span className="text-[10px] text-slate-400 font-mono">
                  {currentUser?.username}
                </span>
              </div>
            </div>
          </div>

          {/* Logout Button: Returns to Login Portal */}
          <button
            onClick={() => logout()}
            title="Cerrar sesión y volver a la pantalla de acceso"
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-rose-200 hover:border-rose-300 bg-rose-50/70 hover:bg-rose-100 text-rose-700 text-xs font-semibold transition-colors cursor-pointer shadow-xs"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Cerrar Sesión</span>
          </button>

          <button
            onClick={() => setIsNewTicketModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-slate-900 rounded-lg hover:bg-slate-800 transition-colors whitespace-nowrap shrink-0 cursor-pointer shadow-sm"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>{isGeneralUser ? 'Reportar Incidencia' : 'Nuevo Ticket'}</span>
          </button>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-6 space-y-6">
        {/* Emergency Alert for Network Administrator and Operations Staff */}
        {criticalBlackoutAlert && (
          <div className="p-5 rounded-2xl bg-gradient-to-r from-red-950 via-slate-900 to-red-950 text-white border-2 border-red-500 shadow-2xl relative overflow-hidden">
            <div className="absolute right-0 top-0 w-80 h-80 bg-red-600/20 rounded-full blur-3xl pointer-events-none" />
            <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-5">
              <div className="flex items-start gap-3.5">
                <div className="w-12 h-12 rounded-2xl bg-red-600 text-white flex items-center justify-center shrink-0 shadow-lg shadow-red-600/50">
                  <ZapOff className="w-6 h-6 animate-pulse" />
                </div>
                <div className="space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="px-2.5 py-0.5 rounded-full bg-red-600 text-white text-[11px] font-bold tracking-wide animate-pulse flex items-center gap-1">
                      <Radio className="w-3 h-3" />
                      <span>ALERTA CRÍTICA ZABBIX NOC · APAGÓN GENERAL</span>
                    </span>
                    <span className="font-mono text-xs text-red-300 font-bold">
                      {criticalBlackoutAlert.ticket.code}
                    </span>
                    <span className="text-xs text-slate-400">·</span>
                    <span className="text-xs font-semibold text-amber-300">
                      SLA: &lt; 2 Horas (Prioridad Urgente)
                    </span>
                  </div>
                  <h2 className="text-base font-bold text-white">
                    {criticalBlackoutAlert.ticket.title}
                  </h2>
                  <p className="text-xs text-slate-300 leading-relaxed max-w-3xl">
                    Se confirmó la desconexión total de 220V (0 VAC / Trampa Last Gasp) y pérdida de telemetría en <strong>{criticalBlackoutAlert.schoolName}</strong> ({criticalBlackoutAlert.ugel}). La sede se encuentra incomunicada por red de datos.
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap lg:flex-col gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => {
                    setPhoneTargetSchool(criticalBlackoutAlert.schoolName);
                    setIsPhoneModalOpen(true);
                  }}
                  className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-lg shadow-emerald-900/50 flex items-center justify-center gap-2 cursor-pointer transition-colors"
                >
                  <PhoneCall className="w-4 h-4 animate-bounce" />
                  <span>Llamada Telefónica al Colegio</span>
                </button>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setSelectedTicket(criticalBlackoutAlert.ticket)}
                    className="flex-1 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 flex items-center justify-center gap-1.5 cursor-pointer transition-colors"
                  >
                    <span>Ver Ficha Ticket</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setCriticalBlackoutAlert(null)}
                    className="px-3 py-1.5 rounded-xl bg-slate-900/80 hover:bg-slate-800 text-slate-400 hover:text-white text-xs font-medium border border-slate-800 cursor-pointer transition-colors"
                  >
                    Reconocer
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Section 1: Tickets & Incidents Management */}
        {activeSection === 'tickets' && (
          <div className="space-y-6">
            {/* Active User Role Banner (Docente / Alumno vs Técnico vs Admin) */}
            <div className={`p-4 rounded-2xl border transition-all ${
              isGeneralUser
                ? 'border-indigo-200 bg-gradient-to-r from-indigo-50/70 to-white'
                : isAdmin
                ? 'border-rose-200 bg-gradient-to-r from-rose-50/60 to-white'
                : 'border-emerald-200 bg-gradient-to-r from-emerald-50/60 to-white'
            }`}>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                <div className="flex items-center gap-3">
                  <div className={`p-2.5 rounded-xl text-white shadow-xs ${
                    isGeneralUser
                      ? 'bg-indigo-600'
                      : isAdmin
                      ? 'bg-rose-600'
                      : 'bg-emerald-600'
                  }`}>
                    {isGeneralUser ? (
                      <GraduationCap className="w-5 h-5" />
                    ) : isAdmin ? (
                      <ShieldCheck className="w-5 h-5" />
                    ) : (
                      <Wrench className="w-5 h-5" />
                    )}
                  </div>

                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-900 text-sm">
                        {currentUser?.nombre}
                      </span>
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        isGeneralUser
                          ? 'bg-indigo-100 text-indigo-800'
                          : isAdmin
                          ? 'bg-rose-100 text-rose-800'
                          : 'bg-emerald-100 text-emerald-800'
                      }`}>
                        {currentUser?.rolLabel}
                      </span>
                    </div>
                    <p className="text-slate-500 mt-0.5">
                      {isGeneralUser
                        ? `${currentUser?.institucionSede} · Vista de usuario para registrar y seguir el estado de fallas en su aula.`
                        : isAdmin
                        ? `${currentUser?.institucionSede} · Acceso total a topología de red, reglas SNMP y métricas de titulación.`
                        : `${currentUser?.institucionSede} · Permisos activos para diagnosticar, resolver y testear en VMware.`}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  {isGeneralUser ? (
                    <button
                      onClick={() => setOnlyMyTickets(!onlyMyTickets)}
                      className={`px-3 py-1.5 rounded-lg font-semibold cursor-pointer transition-colors ${
                        onlyMyTickets
                          ? 'bg-indigo-600 text-white shadow-xs'
                          : 'bg-white border border-slate-300 text-slate-700 hover:bg-slate-100'
                      }`}
                    >
                      {onlyMyTickets ? '✓ Viendo sólo mis reportes' : 'Ver solo mis reportes'}
                    </button>
                  ) : (
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setActiveSection('siniestros')}
                        title="Monitoreo de Siniestros Zonales, Apagones Masivos y Caídas de Fibra Óptica (Zabbix NOC)"
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-semibold bg-red-600 hover:bg-red-700 text-white cursor-pointer shadow-xs transition-colors"
                      >
                        <Radio className="w-3.5 h-3.5 animate-pulse" />
                        <span>🚨 Siniestros & Apagones NOC</span>
                      </button>

                      <button
                        onClick={triggerSimulatedZabbixAlert}
                        title="Simula la recepción de una trampa SNMP desde el switch de laboratorios hacia la API REST del Help Desk (Pág. 32-34 del informe CIBERTEC)"
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-semibold bg-amber-500 hover:bg-amber-600 text-white cursor-pointer shadow-xs transition-colors"
                      >
                        <Zap className="w-3.5 h-3.5 fill-current" />
                        <span>⚡ Simular Alerta SNMP</span>
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Top Overview Banner */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-2xl bg-white border border-slate-200">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                    Mesa de Ayuda UGEL Lima Metropolitana
                  </span>
                  <span className="text-xs text-slate-300">·</span>
                  <span className="text-xs font-medium text-emerald-600">SLA Automatizado Activo</span>
                </div>
                <h1 className="text-lg font-bold text-slate-900 mt-0.5">
                  {isGeneralUser ? 'Mis Incidentes y Solicitudes de Soporte' : 'Gestión y Triaje de Incidentes Tecnológicos'}
                </h1>
                <p className="text-xs text-slate-500 mt-0.5">
                  {isGeneralUser
                    ? 'Consulte el avance de atención de sus solicitudes con clasificación por criticidad (Low, Medium, High, Urgent).'
                    : 'Categorización por criticidad, recepción de alertas Zabbix y verificación de entornos virtuales VMware.'}
                </p>
              </div>

              {/* Priority quick counter tabs */}
              <div className="flex items-center gap-2">
                {(['low', 'medium', 'high', 'urgent'] as Priority[]).map((p) => {
                  const conf = PRIORITY_CONFIGS[p];
                  const count = tickets.filter((t) => t.priority === p).length;
                  const isFiltered = priorityFilter === p;
                  return (
                    <button
                      key={p}
                      onClick={() => setPriorityFilter(isFiltered ? 'all' : p)}
                      className={`px-3 py-1.5 rounded-lg border text-left cursor-pointer transition-all ${
                        isFiltered
                          ? 'border-slate-900 bg-slate-900 text-white'
                          : 'border-slate-200 bg-slate-50 hover:bg-white text-slate-700'
                      }`}
                    >
                      <div className="text-[11px] font-semibold">{conf.label}</div>
                      <div className="text-xs font-bold font-mono tabular-nums">{count}</div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Filter and Search Bar */}
            <div className="p-4 rounded-xl bg-white border border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-4">
              {/* Search */}
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Buscar por código, título, colegio o docente..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-3 py-1.5 rounded-lg border border-slate-300 text-xs text-slate-900 focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>

              {/* Filter controls */}
              <div className="flex flex-wrap items-center gap-2 text-xs">
                {/* Origen Filter (CIBERTEC document) */}
                <div className="flex items-center gap-1.5">
                  <span className="text-slate-500 font-medium">Origen:</span>
                  <select
                    value={origenFilter}
                    onChange={(e) => setOrigenFilter(e.target.value as 'all' | 'AUTOMATICO' | 'MANUAL')}
                    className="px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white text-slate-900 font-medium"
                  >
                    <option value="all">Todos los orígenes</option>
                    <option value="MANUAL">Manual (Docente / Alumno)</option>
                    <option value="AUTOMATICO">Automático (Zabbix SNMP)</option>
                  </select>
                </div>

                {/* Priority Filter */}
                <div className="flex items-center gap-1.5">
                  <span className="text-slate-500 font-medium">Prioridad:</span>
                  <select
                    value={priorityFilter}
                    onChange={(e) => setPriorityFilter(e.target.value as 'all' | Priority)}
                    className="px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white text-slate-900 font-medium"
                  >
                    <option value="all">Todas ({tickets.length})</option>
                    <option value="low">Baja / Low (&lt; 48h)</option>
                    <option value="medium">Media / Medium (&lt; 24h)</option>
                    <option value="high">Alta / High (&lt; 8h)</option>
                    <option value="urgent">Urgente / Urgent (&lt; 2h)</option>
                  </select>
                </div>

                {/* Status Filter */}
                <div className="flex items-center gap-1.5">
                  <span className="text-slate-500 font-medium">Estado:</span>
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value as 'all' | TicketStatus)}
                    className="px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white text-slate-900 font-medium"
                  >
                    <option value="all">Todos</option>
                    <option value="open">Abiertos</option>
                    <option value="vmware_testing">En Test VMware</option>
                    <option value="in_progress">En Progreso</option>
                    <option value="resolved">Resueltos</option>
                  </select>
                </div>

                {/* UGEL Filter */}
                <div className="flex items-center gap-1.5">
                  <span className="text-slate-500 font-medium">UGEL:</span>
                  <select
                    value={ugelFilter}
                    onChange={(e) => setUgelFilter(e.target.value as 'all' | UGELCode)}
                    className="px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white text-slate-900 font-medium"
                  >
                    <option value="all">Todas las UGEL</option>
                    <option value="UGEL 01">UGEL 01 (SJM, VES, VMT)</option>
                    <option value="UGEL 02">UGEL 02 (Rímac, SMP)</option>
                    <option value="UGEL 03">UGEL 03 (San Isidro, Lince)</option>
                    <option value="UGEL 04">UGEL 04 (Comas)</option>
                    <option value="UGEL 05">UGEL 05 (SJL)</option>
                    <option value="UGEL 06">UGEL 06 (Ate)</option>
                    <option value="UGEL 07">UGEL 07 (Miraflores, Surco)</option>
                  </select>
                </div>

                {(priorityFilter !== 'all' || statusFilter !== 'all' || ugelFilter !== 'all' || origenFilter !== 'all' || searchQuery) && (
                  <button
                    onClick={() => {
                      setPriorityFilter('all');
                      setStatusFilter('all');
                      setUgelFilter('all');
                      setOrigenFilter('all');
                      setSearchQuery('');
                    }}
                    className="px-2.5 py-1.5 text-slate-500 hover:text-slate-900 text-xs font-medium cursor-pointer"
                  >
                    Restablecer
                  </button>
                )}
              </div>
            </div>

            {/* Tickets Table / List */}
            <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
              <div className="px-6 py-3 border-b border-slate-200 bg-slate-50/70 flex items-center justify-between text-xs font-semibold text-slate-600">
                <span>Lista de Solicitudes y Tickets de Soporte ({filteredTickets.length})</span>
                <span className="text-slate-400 font-normal">Haga clic en una fila para gestionar y testear con VMware</span>
              </div>

              {filteredTickets.length === 0 ? (
                <div className="p-12 text-center space-y-3">
                  <Info className="w-8 h-8 text-slate-400 mx-auto" />
                  <h3 className="text-sm font-semibold text-slate-900">
                    No se encontraron tickets con los filtros seleccionados
                  </h3>
                  <p className="text-xs text-slate-500 max-w-sm mx-auto">
                    Intente cambiar la prioridad seleccionada o registre un nuevo incidente usando el botón superior.
                  </p>
                  <button
                    onClick={() => {
                      setPriorityFilter('all');
                      setStatusFilter('all');
                      setUgelFilter('all');
                      setSearchQuery('');
                    }}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-slate-100 rounded-lg hover:bg-slate-200 transition-colors cursor-pointer"
                  >
                    Limpiar Filtros
                  </button>
                </div>
              ) : (
                <div className="divide-y divide-slate-100">
                  {filteredTickets.map((ticket) => (
                    <div
                      key={ticket.id}
                      onClick={() => setSelectedTicket(ticket)}
                      className="p-4 hover:bg-slate-50/80 transition-colors cursor-pointer flex flex-col md:flex-row md:items-center justify-between gap-4"
                    >
                      {/* Left: Code, School, Title */}
                      <div className="space-y-1.5 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-mono text-xs font-bold text-slate-900 bg-slate-100 px-2 py-0.5 rounded">
                            {ticket.code}
                          </span>
                          {ticket.origen === 'AUTOMATICO' ? (
                            <span className="font-mono text-[10px] font-bold px-1.5 py-0.5 rounded bg-purple-100 text-purple-800 border border-purple-200 flex items-center gap-0.5">
                              <Zap className="w-2.5 h-2.5 fill-current" />
                              <span>Zabbix SNMP</span>
                            </span>
                          ) : (
                            <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 border border-slate-200">
                              Manual
                            </span>
                          )}
                          <span className="text-slate-300">·</span>
                          <span className="text-xs font-semibold text-indigo-700">
                            {ticket.ugel}
                          </span>
                          <span className="text-slate-300">·</span>
                          <span className="text-xs text-slate-600">
                            {ticket.schoolName}
                          </span>
                          <span className="text-slate-300">·</span>
                          <span className="text-xs text-slate-400">
                            {ticket.classroomLab}
                          </span>
                        </div>

                        <h3 className="text-sm font-bold text-slate-900 hover:text-indigo-600 transition-colors">
                          {ticket.title}
                        </h3>

                        <p className="text-xs text-slate-500 line-clamp-1">
                          {ticket.description}
                        </p>

                        <div className="flex items-center gap-3 text-[11px] text-slate-400 pt-1">
                          <span>Reportado por: {ticket.reporterName} ({ticket.reporterRole})</span>
                          <span>·</span>
                          <span className="font-mono">{ticket.createdAt}</span>
                          {ticket.vmwareEnv && (
                            <>
                              <span>·</span>
                              <span className="inline-flex items-center gap-1 text-indigo-600 font-medium">
                                <Server className="w-3 h-3" />
                                <span>{ticket.vmwareEnv.hypervisor}</span>
                              </span>
                            </>
                          )}
                        </div>
                      </div>

                      {/* Right: Priority, Status, Action */}
                      <div className="flex items-center gap-3 shrink-0 self-end md:self-center">
                        <div className="flex flex-col items-end gap-1">
                          {getPriorityBadge(ticket.priority)}
                          {getStatusBadge(ticket.status)}
                        </div>

                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedTicket(ticket);
                          }}
                          className="px-3 py-1.5 text-xs font-medium text-slate-700 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors flex items-center gap-1 cursor-pointer"
                        >
                          <span>Atender</span>
                          <ChevronRight className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Section: Cisco Packet Tracer Network Topology (TOPOLOGIA.pkt) */}
        {activeSection === 'packet-tracer' && (
          <PacketTracerTopology onTriggerNetworkIncident={handleAddNewTicket} />
        )}

        {/* Section 2: VMware Compatibility Test Workbench */}
        {activeSection === 'vmware' && (
          <div className="space-y-6">
            <div className="p-5 rounded-2xl bg-white border border-slate-200">
              <div className="flex items-center gap-2">
                <Server className="w-5 h-5 text-indigo-600" />
                <h1 className="text-lg font-bold text-slate-900">
                  Laboratorio de Pruebas de Compatibilidad VMware
                </h1>
              </div>
              <p className="text-xs text-slate-500 mt-1 max-w-3xl">
                Entorno interactivo para simular el arranque, microcódigo de CPU VT-x/AMD-V, controladores VMXNET3 y descriptores .vmx de imágenes OVA destinadas a las instituciones educativas de Lima Metropolitana.
              </p>
            </div>

            <VMwareTester />
          </div>
        )}

        {/* Section 3: Priority Selector Showcase & SLA Guidelines */}
        {activeSection === 'priorities' && (
          <div className="space-y-6">
            <div className="p-5 rounded-2xl bg-white border border-slate-200">
              <div className="flex items-center gap-2">
                <Sliders className="w-5 h-5 text-indigo-600" />
                <h1 className="text-lg font-bold text-slate-900">
                  Selector de Nivel de Prioridad para Personal de TI (SLA Matrix)
                </h1>
              </div>
              <p className="text-xs text-slate-500 mt-1 max-w-3xl">
                Componente interactivo diseñado para categorizar incidentes en 4 niveles (Low, Medium, High, Urgent) conforme a las directivas tecnológicas de la DRELM y tiempos máximos de intervención de mesa de ayuda.
              </p>
            </div>

            {/* Live Interactive Sandbox */}
            <div className="p-6 rounded-2xl bg-white border border-slate-200 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-sm font-bold text-slate-900">
                    Demostración Interactiva del Selector de Prioridad
                  </h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Haga clic en cualquiera de las 4 tarjetas para probar el comportamiento reactivo y cálculo de SLA:
                  </p>
                </div>
                <button
                  onClick={() => setIsNewTicketModalOpen(true)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-colors cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Probar en Formulario de Ticket</span>
                </button>
              </div>

              <PrioritySelector value={sandboxPriority} onChange={setSandboxPriority} />

              {/* Technical Breakdown of the selected Priority */}
              <div className="mt-4 p-4 rounded-xl border border-slate-200 bg-slate-50 space-y-2 text-xs">
                <span className="font-bold text-slate-900 block">
                  Criterios Técnicos para Especialistas de Soporte UGEL:
                </span>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-slate-700">
                  <div>
                    <strong>Tiempo Máximo de Primera Respuesta:</strong>{' '}
                    <span className="font-mono font-semibold">
                      {Math.max(1, Math.floor(PRIORITY_CONFIGS[sandboxPriority].slaHours / 4))} hora(s)
                    </span>
                  </div>
                  <div>
                    <strong>Tiempo Máximo de Solución Definitiva (SLA):</strong>{' '}
                    <span className="font-mono font-semibold text-indigo-600">
                      {PRIORITY_CONFIGS[sandboxPriority].slaHours} horas
                    </span>
                  </div>
                  <div className="md:col-span-2">
                    <strong>Impacto en Aulas de Innovación (AIP / CRT):</strong>{' '}
                    <span>{PRIORITY_CONFIGS[sandboxPriority].impactLevel}</span>
                  </div>
                  <div className="md:col-span-2">
                    <strong>Acción recomendada en el hipervisor VMware:</strong>{' '}
                    <span>
                      {sandboxPriority === 'urgent'
                        ? 'Acceso inmediato vía consola remota ESXi, verificación de logs de kernel vmkernel y conmutación por error (Failover).'
                        : sandboxPriority === 'high'
                        ? 'Ejecución del test de compatibilidad VMware y reconfiguración de adaptadores vSwitch en el lote de computadoras afectadas.'
                        : sandboxPriority === 'medium'
                        ? 'Diagnóstico del puesto individual, reinstalación de VMware Tools y ajuste de resolución SVGA.'
                        : 'Actualización programada de plantillas OVA en el repositorio central de la institución.'}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Comparative Table of Priorities */}
            <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
              <div className="px-6 py-4 border-b border-slate-200">
                <h3 className="text-sm font-bold text-slate-900">
                  Tabla Comparativa de Prioridades de Mesa de Ayuda Escolar
                </h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold">
                    <tr>
                      <th className="px-6 py-3">Nivel (Esp / Eng)</th>
                      <th className="px-6 py-3">SLA Resolución</th>
                      <th className="px-6 py-3">Alcance de Alumnos</th>
                      <th className="px-6 py-3">Escenario Típico en Lima</th>
                      <th className="px-6 py-3">Canal de Escalamiento</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-700">
                    <tr className="hover:bg-slate-50">
                      <td className="px-6 py-3 font-bold text-sky-700">Baja / Low</td>
                      <td className="px-6 py-3 font-mono font-semibold">&lt; 48 horas</td>
                      <td className="px-6 py-3">0 alumnos afectados</td>
                      <td className="px-6 py-3">Consultas de configuración de plantillas Scratch / Python.</td>
                      <td className="px-6 py-3">Mesa de ayuda digital / Correo</td>
                    </tr>
                    <tr className="hover:bg-slate-50">
                      <td className="px-6 py-3 font-bold text-emerald-700">Media / Medium</td>
                      <td className="px-6 py-3 font-mono font-semibold">&lt; 24 horas</td>
                      <td className="px-6 py-3">1 a 3 alumnos</td>
                      <td className="px-6 py-3">Puesto individual con parpadeo o VM congelada en Lab AIP.</td>
                      <td className="px-6 py-3">Coordinador CIST local</td>
                    </tr>
                    <tr className="hover:bg-slate-50">
                      <td className="px-6 py-3 font-bold text-amber-700">Alta / High</td>
                      <td className="px-6 py-3 font-mono font-semibold">&lt; 8 horas</td>
                      <td className="px-6 py-3">Aula completa (30+ alumnos)</td>
                      <td className="px-6 py-3">VT-x desactivado en BIOS masivo o sin conexión a internet en AIP.</td>
                      <td className="px-6 py-3">Especialista TI UGEL presencial</td>
                    </tr>
                    <tr className="hover:bg-slate-50">
                      <td className="px-6 py-3 font-bold text-rose-700">Urgente / Urgent</td>
                      <td className="px-6 py-3 font-mono font-semibold">&lt; 2 horas</td>
                      <td className="px-6 py-3">Colegio completo / Jornada censal</td>
                      <td className="px-6 py-3">Caída del servidor ESXi central durante pruebas oficiales MINEDU.</td>
                      <td className="px-6 py-3">Equipo de Guardia Rápida DRELM</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* Section: Zonal Blackout & Silent Disconnection Monitor (Zabbix NOC) */}
        {activeSection === 'siniestros' && (
          <ZonalBlackoutMonitor
            onAutoCreateTicket={handleAddNewTicket}
            onOpenTicket={(t) => setSelectedTicket(t)}
            existingTickets={tickets}
          />
        )}

        {/* Section 4: Thesis Validation Panel */}
        {activeSection === 'thesis' && (
          <ThesisValidationPanel tickets={tickets} />
        )}

        {/* Section 5: Architecture, MySQL Schema & Real VMware Integration */}
        {activeSection === 'architecture' && (
          <ArchitectureDocs />
        )}
      </main>

      {/* Ticket Submission Modal with Priority Selector */}
      <TicketSubmissionModal
        isOpen={isNewTicketModalOpen}
        onClose={() => setIsNewTicketModalOpen(false)}
        onSubmit={handleAddNewTicket}
      />

      {/* Ticket Details & Action Modal */}
      <TicketDetailModal
        ticket={selectedTicket}
        isOpen={selectedTicket !== null}
        onClose={() => setSelectedTicket(null)}
        onUpdateTicket={handleUpdateTicket}
      />

      {/* Share & Deployment Modal for the Team */}
      <ShareDeployModal
        isOpen={isShareModalOpen}
        onClose={() => setIsShareModalOpen(false)}
      />

      {/* Emergency Telephone Console for Administrator */}
      <EmergencyPhoneModal
        isOpen={isPhoneModalOpen}
        onClose={() => setIsPhoneModalOpen(false)}
        targetSchoolName={phoneTargetSchool}
        associatedTicket={criticalBlackoutAlert?.ticket || selectedTicket}
        onLogCallToTicket={handleLogCallToTicket}
      />

      {/* Footer */}
      <footer className="mt-auto border-t border-slate-200 bg-white py-4 px-6 text-xs text-slate-500">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2">
          <div>
            Help Desk TI Automatizado & Módulo de Validación VMware · Lima Metropolitana (DRELM / UGEL 01 - 07)
          </div>
          <div className="flex items-center gap-2">
            <span>Proyecto de Titulación Profesional de Ingeniería</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
