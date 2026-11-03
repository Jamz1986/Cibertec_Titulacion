import React, { useState } from 'react';
import { Ticket, Priority, TicketStatus } from './types/helpdesk';
import { INITIAL_TICKETS, PRIORITY_CONFIGS } from './data/mockData';
import { PrioritySelector } from './components/PrioritySelector';
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
  X,
  Bell,
  Menu,
  HelpCircle,
} from 'lucide-react';
import { EmergencyPhoneModal } from './components/EmergencyPhoneModal';
import { LoginPortal } from './components/LoginPortal';
import { PacketTracerTopology } from './components/PacketTracerTopology';
import { ZabbixConnectionModal } from './components/ZabbixConnectionModal';
import { FAQSection } from './components/FAQSection';

export default function App() {
  const { currentUser, logout, hasRole } = useAuth();
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isZabbixModalOpen, setIsZabbixModalOpen] = useState(false);
  const isGeneralUser = currentUser?.rol === 'DOCENTE' || currentUser?.rol === 'ALUMNO';
  const isTechnician = currentUser?.rol === 'TECNICO';
  const isAdmin = currentUser?.rol === 'ADMIN';

  const [activeSection, setActiveSection] = useState<
    'tickets' | 'packet-tracer' | 'siniestros' | 'priorities' | 'thesis' | 'architecture' | 'faq'
  >('tickets');

  // Audio chime for real-time alert reception
  const playAlertChime = () => {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.type = 'sine';
      osc.frequency.setValueAtTime(880, ctx.currentTime);
      osc.frequency.setValueAtTime(1174.66, ctx.currentTime + 0.12);
      gain.gain.setValueAtTime(0.3, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.4);
    } catch {}
  };

  const [latestZabbixAlert, setLatestZabbixAlert] = useState<Ticket | null>(null);
  const [zabbixWebhookEventCount, setZabbixWebhookEventCount] = useState<number>(0);

  const [tickets, setTickets] = useState<Ticket[]>(() => {
    try {
      const saved = localStorage.getItem('edudesk_tickets_cache');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {}
    return INITIAL_TICKETS;
  });

  React.useEffect(() => {
    try {
      localStorage.setItem('edudesk_tickets_cache', JSON.stringify(tickets));
    } catch {}
  }, [tickets]);

  const [isNewTicketModalOpen, setIsNewTicketModalOpen] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [priorityFilter, setPriorityFilter] = useState<'all' | Priority>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | TicketStatus>('all');
  const [origenFilter, setOrigenFilter] = useState<'all' | 'AUTOMATICO' | 'MANUAL'>('all');
  const [onlyMyTickets, setOnlyMyTickets] = useState<boolean>(isGeneralUser);

  // When switching role, align default view and filtering
  React.useEffect(() => {
    setOnlyMyTickets(isGeneralUser);
    if (isGeneralUser && activeSection === 'thesis') {
      setActiveSection('tickets');
    }
  }, [currentUser?.rol]);

  // Sincronización en tiempo real con el backend de Webhooks de Zabbix y Vercel
  React.useEffect(() => {
    const handleIncomingTicketsList = (incoming: Ticket[]) => {
      setTickets((prev) => {
        const existingIds = new Set(prev.map((t) => t.id));
        const newTickets = incoming.filter((t) => !existingIds.has(t.id));
        if (newTickets.length > 0) {
          setLatestZabbixAlert(newTickets[0]);
          playAlertChime();
          setOrigenFilter('all');
          setPriorityFilter('all');
          setStatusFilter('all');

          newTickets.forEach((t) => {
            if (
              t.sinistroZonal ||
              t.outageCause === 'CORTE_ELECTRICO_MASIVO' ||
              t.telemetriaZabbix?.probableCausa === 'CORTE_ELECTRICO_MASIVO' ||
              t.priority === 'urgent'
            ) {
              setCriticalBlackoutAlert({
                ticket: t,
                schoolName: t.schoolName,
                ugel: t.ugel,
                probableCausa: t.telemetriaZabbix?.probableCausa || 'CORTE_ELECTRICO_MASIVO',
              });
              setPhoneTargetSchool(t.schoolName);
            }
          });
          return [...newTickets, ...prev];
        }
        return prev;
      });
    };

    const fetchRecentWebhookTickets = async () => {
      // 1. Fetch from local backend
      try {
        const res = await fetch('/api/tickets/recent');
        if (res.ok) {
          const data = await res.json();
          if (data.success && Array.isArray(data.tickets) && data.tickets.length > 0) {
            setZabbixWebhookEventCount(data.count || data.tickets.length);
            handleIncomingTicketsList(data.tickets as Ticket[]);
          }
        }
      } catch {}

      // 2. Also fetch from Vercel endpoint in case teammate sends to Vercel (Captura de pantalla)
      try {
        const vercelRes = await fetch('https://cibertec-titulacion.vercel.app/api/webhooks/zabbix');
        if (vercelRes.ok) {
          const vData = await vercelRes.json();
          if (Array.isArray(vData.recentTickets) && vData.recentTickets.length > 0) {
            handleIncomingTicketsList(vData.recentTickets as Ticket[]);
          }
        }
      } catch {}
    };

    fetchRecentWebhookTickets();
    const interval = setInterval(fetchRecentWebhookTickets, 2500);
    return () => clearInterval(interval);
  }, []);

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

  // Automated trigger from network telemetry simulation
  const triggerSimulatedNetworkAlert = () => {
    const now = new Date();
    const formattedDate = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(
      now.getDate()
    ).padStart(2, '0')} ${String(now.getHours()).padStart(2, '0')}:${String(
      now.getMinutes()
    ).padStart(2, '0')}`;

    const newAutoTicket: Ticket = {
      id: `t-auto-${Date.now()}`,
      code: `TK-${now.getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`,
      title: 'Alerta de Red: Puerto Gi0/12 Switch Troncal DOWN (VLAN 30)',
      titulo: 'Alerta de Red: Puerto Gi0/12 Switch Troncal DOWN (VLAN 30)',
      description: 'El sistema de supervisión de red detectó estado DOWN en la interfaz de red del Laboratorio AIP 2. Se interrumpieron 24 PCs clientes del aula.',
      descripcion: 'El sistema de supervisión de red detectó estado DOWN en la interfaz de red del Laboratorio AIP 2.',
      origen: 'AUTOMATICO',
      priority: 'high',
      status: 'open',
      category: 'networking_connectivity',
      ugel: 'UGEL 07',
      sede: 'Sede Miraflores - Switch de Distribución',
      schoolName: 'I.E. Juana Alarco de Dammert (Miraflores)',
      reporterUserId: 'usr-4',
      reporterName: 'Sensor de Red Automatizado (VLAN 30)',
      reporterRole: 'Monitoreo Proactivo de Red',
      reporterEmail: 'telemetria@ugel07.gob.pe',
      classroomLab: 'Laboratorio AIP 2 (Pabellón B)',
      createdAt: formattedDate,
      slaTargetHours: 8,
      assignedTechnician: 'Ing. Leonardo Granados Ortega',
      comments: [
        {
          id: `c-${Date.now()}`,
          author: 'Sistema de Telemetría de Red',
          role: 'Integración Automatizada',
          text: 'Falla de red detectada automáticamente. Incidencia generada de forma predictiva según arquitectura de red.',
          timestamp: formattedDate,
        },
      ],
    };

    setTickets([newAutoTicket, ...tickets]);
  };

  const filteredTickets = tickets.filter((t) => {
    if (onlyMyTickets && currentUser && t.origen === 'MANUAL') {
      const isMine =
        t.reporterUserId === currentUser.id ||
        t.reporterEmail.toLowerCase() === currentUser.email.toLowerCase();
      if (!isMine) return false;
    }
    if (origenFilter !== 'all' && t.origen !== origenFilter) return false;
    if (priorityFilter !== 'all' && t.priority !== priorityFilter) return false;
    if (statusFilter !== 'all' && t.status !== statusFilter) return false;
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
            <Wrench className="w-3 h-3" />
            <span>En Diagnóstico</span>
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
    <div className="min-h-screen bg-[#f8fafc] text-slate-900 flex flex-col md:flex-row font-sans">
      {/* Mobile Header Bar */}
      <div className="md:hidden flex items-center justify-between px-4 py-3 bg-white border-b border-slate-200 sticky top-0 z-40 shadow-xs">
        <div className="flex items-center gap-2.5">
          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="p-2 rounded-lg text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
            aria-label="Abrir menú"
          >
            {isMobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-indigo-600 text-white flex items-center justify-center font-bold text-sm shadow-xs">
              ED
            </div>
            <div>
              <span className="font-bold text-slate-900 text-sm block leading-none">EduDesk TI</span>
              <span className="text-[10px] text-slate-500 font-medium">UGEL 07 · Mesa de Ayuda</span>
            </div>
          </div>
        </div>
        <button
          onClick={() => setIsNewTicketModalOpen(true)}
          className="p-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors shadow-xs cursor-pointer"
          title="Nuevo Ticket"
        >
          <Plus className="w-4 h-4" />
        </button>
      </div>

      {/* Mobile Backdrop Overlay */}
      {isMobileMenuOpen && (
        <div
          onClick={() => setIsMobileMenuOpen(false)}
          className="md:hidden fixed inset-0 z-40 bg-slate-900/40 backdrop-blur-xs"
        />
      )}

      {/* Left Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-64 lg:w-72 bg-white border-r border-slate-200 flex flex-col justify-between transition-transform duration-200 ease-in-out md:static md:translate-x-0 md:h-screen md:sticky md:top-0 shrink-0 ${
          isMobileMenuOpen ? 'translate-x-0 shadow-2xl' : '-translate-x-full md:shadow-none'
        }`}
      >
        {/* Sidebar Header / Brand */}
        <div className="p-5 border-b border-slate-200">
          <div className="flex items-center justify-between mb-3.5">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-700 to-indigo-500 text-white flex items-center justify-center shadow-sm shadow-indigo-200 font-bold text-sm tracking-tight">
                ED
              </div>
              <div>
                <h1 className="text-base font-bold text-slate-900 tracking-tight leading-tight">
                  EduDesk TI
                </h1>
                <p className="text-[11px] font-semibold text-indigo-600 leading-tight">
                  Mesa de Ayuda · UGEL 07
                </p>
              </div>
            </div>
            {/* Close button on mobile */}
            <button
              onClick={() => setIsMobileMenuOpen(false)}
              className="md:hidden p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Telemetry Status badge & connection helper */}
          <button
            type="button"
            onClick={() => setIsZabbixModalOpen(true)}
            title="Ver URL y configuración para conectar Zabbix en VMware"
            className="w-full flex items-center justify-between px-3 py-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 border border-emerald-200/80 text-[11px] text-emerald-800 transition-colors cursor-pointer text-left"
          >
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shrink-0" />
              <span className="font-semibold">Telemetría Zabbix</span>
            </div>
            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-emerald-200 text-emerald-900 font-mono">
              Configurar 📡
            </span>
          </button>

          {/* Primary Action Button */}
          <button
            onClick={() => {
              setIsNewTicketModalOpen(true);
              setIsMobileMenuOpen(false);
            }}
            className="w-full mt-3.5 inline-flex items-center justify-center gap-2 px-3.5 py-2.5 text-xs font-bold text-white bg-slate-900 hover:bg-slate-800 rounded-xl transition-colors shadow-xs cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>{isGeneralUser ? 'Reportar Incidencia' : 'Nuevo Ticket'}</span>
          </button>
        </div>

        {/* Navigation items */}
        <nav className="flex-1 p-3 space-y-1 overflow-y-auto text-xs font-semibold">
          <button
            onClick={() => {
              setActiveSection('tickets');
              setIsMobileMenuOpen(false);
            }}
            className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl transition-colors cursor-pointer ${
              activeSection === 'tickets'
                ? 'bg-indigo-50 text-indigo-700 font-bold border border-indigo-200/70'
                : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
            }`}
          >
            <div className="flex items-center gap-2.5">
              <Layers className="w-4 h-4 text-indigo-500" />
              <span>Incidentes & Tickets</span>
            </div>
            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
              activeSection === 'tickets' ? 'bg-indigo-200 text-indigo-900' : 'bg-slate-100 text-slate-600'
            }`}>
              {filteredTickets.length}
            </span>
          </button>

          <button
            onClick={() => {
              setActiveSection('packet-tracer');
              setIsMobileMenuOpen(false);
            }}
            className={`w-full flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl transition-colors cursor-pointer ${
              activeSection === 'packet-tracer'
                ? 'bg-indigo-50 text-indigo-700 font-bold border border-indigo-200/70'
                : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
            }`}
          >
            <Network className="w-4 h-4 text-indigo-500" />
            <span>Topología Packet Tracer</span>
          </button>

          <button
            onClick={() => {
              setActiveSection('siniestros');
              setIsMobileMenuOpen(false);
            }}
            className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl transition-colors cursor-pointer ${
              activeSection === 'siniestros'
                ? 'bg-red-50 text-red-700 font-bold border border-red-200/70'
                : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
            }`}
          >
            <div className="flex items-center gap-2.5">
              <Radio className="w-4 h-4 text-red-500 animate-pulse" />
              <span>Monitoreo & Siniestros</span>
            </div>
            <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
          </button>

          <button
            onClick={() => {
              setActiveSection('priorities');
              setIsMobileMenuOpen(false);
            }}
            className={`w-full flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl transition-colors cursor-pointer ${
              activeSection === 'priorities'
                ? 'bg-indigo-50 text-indigo-700 font-bold border border-indigo-200/70'
                : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
            }`}
          >
            <Sliders className="w-4 h-4 text-indigo-500" />
            <span>{isGeneralUser ? 'Guía de Prioridades SLA' : 'Matriz de Prioridades SLA'}</span>
          </button>

          {!isGeneralUser && (
            <button
              onClick={() => {
                setActiveSection('thesis');
                setIsMobileMenuOpen(false);
              }}
              className={`w-full flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl transition-colors cursor-pointer ${
                activeSection === 'thesis'
                  ? 'bg-indigo-50 text-indigo-700 font-bold border border-indigo-200/70'
                  : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
              }`}
            >
              <CheckCircle2 className="w-4 h-4 text-indigo-500" />
              <span>Métricas de Titulación</span>
            </button>
          )}

          <button
            onClick={() => {
              setActiveSection('architecture');
              setIsMobileMenuOpen(false);
            }}
            className={`w-full flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl transition-colors cursor-pointer ${
              activeSection === 'architecture'
                ? 'bg-indigo-50 text-indigo-700 font-bold border border-indigo-200/70'
                : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
            }`}
          >
            <Server className="w-4 h-4 text-indigo-500" />
            <span>{isGeneralUser ? 'Memoria del Proyecto' : 'Arquitectura del Sistema'}</span>
          </button>

          <button
            onClick={() => {
              setActiveSection('faq');
              setIsMobileMenuOpen(false);
            }}
            className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl transition-colors cursor-pointer ${
              activeSection === 'faq'
                ? 'bg-indigo-50 text-indigo-700 font-bold border border-indigo-200/70'
                : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
            }`}
          >
            <div className="flex items-center gap-2.5">
              <HelpCircle className="w-4 h-4 text-indigo-500" />
              <span>Preguntas Frecuentes (FAQ)</span>
            </div>
            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
              activeSection === 'faq' ? 'bg-indigo-200 text-indigo-900' : 'bg-slate-100 text-slate-600'
            }`}>
              8
            </span>
          </button>
        </nav>

        {/* User Footer Profile & Actions */}
        <div className="p-3 border-t border-slate-200 space-y-2.5 bg-slate-50/70">
          <div className="p-2.5 rounded-xl bg-white border border-slate-200 flex items-center gap-2.5">
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-xs text-white shrink-0 ${
              currentUser?.rol === 'ADMIN' ? 'bg-rose-600' : 'bg-emerald-600'
            }`}>
              {currentUser?.nombre?.charAt(0) || 'U'}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-bold text-slate-800 truncate leading-tight">
                {currentUser?.nombre}
              </p>
              <p className="text-[10px] text-slate-400 font-medium truncate mt-0.5">
                {currentUser?.rol === 'ADMIN' ? 'Admin NOC' : 'Técnico TI'} · UGEL 07
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => setIsShareModalOpen(true)}
              className="inline-flex items-center justify-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-indigo-200 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-semibold transition-colors cursor-pointer"
            >
              <Share2 className="w-3.5 h-3.5" />
              <span>Equipo</span>
            </button>

            <button
              onClick={() => logout()}
              className="inline-flex items-center justify-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-rose-200 bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-semibold transition-colors cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Salir</span>
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 min-h-screen">
        <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-6 space-y-6">
          {/* Señal de Alerta en Tiempo Real (Triggered automatically from VMware Zabbix) */}
          {latestZabbixAlert && (
            <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
              <div className="bg-white rounded-3xl max-w-lg w-full shadow-2xl border-2 border-red-500 overflow-hidden scale-100 animate-in zoom-in-95 duration-200">
                {/* Header with Beacon Alert */}
                <div className="bg-gradient-to-r from-red-600 via-rose-600 to-red-700 p-6 text-white text-center relative overflow-hidden">
                  <div className="absolute -right-6 -top-6 w-32 h-32 bg-white/10 rounded-full blur-xl pointer-events-none" />
                  <div className="w-14 h-14 mx-auto rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center mb-3 shadow-inner ring-4 ring-white/30 animate-pulse">
                    <Bell className="w-7 h-7 text-white" />
                  </div>
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/20 text-white text-[11px] font-bold uppercase tracking-wider mb-2">
                    <Radio className="w-3.5 h-3.5 animate-ping text-white" />
                    <span>Señal de Alerta en Tiempo Real</span>
                  </div>
                  <h3 className="text-xl font-black text-white leading-tight">
                    Falla Detectada desde VMware Zabbix
                  </h3>
                  <p className="text-xs text-red-100 mt-1">
                    Evento recibido y procesado por el Webhook de EduDesk
                  </p>
                </div>

                {/* Body Details */}
                <div className="p-6 space-y-4">
                  <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-3">
                    <div className="flex items-center justify-between pb-2 border-b border-slate-200">
                      <span className="text-xs font-medium text-slate-500">Ticket Generado</span>
                      <span className="font-mono text-xs font-bold text-red-600 bg-red-50 border border-red-200 px-2.5 py-0.5 rounded-full">
                        {latestZabbixAlert.code}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div>
                        <span className="text-[10px] uppercase font-bold text-slate-400 block">Equipo / Host</span>
                        <span className="font-semibold text-slate-800">{latestZabbixAlert.reporterName || 'PC-ALUMNO-01'}</span>
                      </div>
                      <div>
                        <span className="text-[10px] uppercase font-bold text-slate-400 block">IP / Ubicación</span>
                        <span className="font-mono font-medium text-slate-700">{latestZabbixAlert.classroomLab || '192.168.30.101'}</span>
                      </div>
                    </div>

                    <div className="text-xs">
                      <span className="text-[10px] uppercase font-bold text-slate-400 block">Evento Zabbix</span>
                      <span className="font-bold text-slate-900 leading-snug block mt-0.5">
                        {latestZabbixAlert.title}
                      </span>
                    </div>

                    <div className="text-xs">
                      <span className="text-[10px] uppercase font-bold text-slate-400 block">Métrica / Detalle</span>
                      <p className="text-slate-600 text-xs mt-0.5 leading-relaxed bg-white p-2.5 rounded-xl border border-slate-200">
                        {latestZabbixAlert.description}
                      </p>
                    </div>

                    <div className="flex items-center justify-between pt-1">
                      <span className="text-xs font-medium text-slate-500">Prioridad Asignada:</span>
                      <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-900 border border-amber-200 uppercase">
                        {latestZabbixAlert.priority} · SLA &lt; {latestZabbixAlert.slaTargetHours}h
                      </span>
                    </div>
                  </div>

                  <p className="text-center text-[11px] text-slate-500 font-medium">
                    ✓ La incidencia ha sido insertada y actualizada automáticamente en el listado de tickets.
                  </p>
                </div>

                {/* Footer with ONLY the "Aceptar" button as requested */}
                <div className="p-5 bg-slate-50 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => {
                      setLatestZabbixAlert(null);
                      setActiveSection('tickets');
                    }}
                    className="w-full py-3.5 px-6 rounded-2xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-sm tracking-wide shadow-lg shadow-slate-900/20 active:scale-[0.99] transition-all cursor-pointer flex items-center justify-center gap-2"
                  >
                    <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                    <span>Aceptar</span>
                  </button>
                </div>
              </div>
            </div>
          )}

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
                        <span>ALERTA CRÍTICA · INTERRUPCIÓN GENERAL DE RED (UGEL 07)</span>
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
                      Se confirmó la desconexión total y pérdida de telemetría en <strong>{criticalBlackoutAlert.schoolName}</strong> ({criticalBlackoutAlert.ugel}). La sede se encuentra incomunicada por red de datos.
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
              {/* Top Action Bar */}
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 pb-3">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                    Panel Principal · Incidentes & Tickets
                  </span>
                  <span className="px-2 py-0.5 rounded-full text-[11px] bg-indigo-100 text-indigo-800 font-bold">
                    {filteredTickets.length} registros
                  </span>
                </div>

                <button
                  type="button"
                  onClick={() => setIsZabbixModalOpen(true)}
                  title="Ver URL y parámetros para conectar la máquina virtual de Zabbix"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-300 bg-white hover:bg-slate-100 text-slate-700 text-xs font-semibold transition-colors cursor-pointer"
                >
                  <Server className="w-3.5 h-3.5 text-indigo-600" />
                  <span>📡 Conexión VMware Zabbix</span>
                </button>
              </div>
                  {/* Active User Role Banner */}
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
                          ? `${currentUser?.institucionSede} · Vista de usuario para registrar y seguir el estado de incidencias.`
                          : isAdmin
                          ? `${currentUser?.institucionSede} · Monitoreo centralizado de sedes y topología de red.`
                          : `${currentUser?.institucionSede} · Permisos de atención técnica y diagnóstico de incidentes.`}
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
                          title="Monitoreo de Siniestros Zonales e Interrupciones de Conectividad"
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-semibold bg-red-600 hover:bg-red-700 text-white cursor-pointer shadow-xs transition-colors"
                        >
                          <Radio className="w-3.5 h-3.5 animate-pulse" />
                          <span>Monitoreo de Siniestros</span>
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
                    <span className="text-xs font-bold uppercase tracking-wider text-indigo-700">
                      Mesa de Ayuda · UGEL 07
                    </span>
                    <span className="text-xs text-slate-300">·</span>
                    <span className="text-xs font-medium text-emerald-600">SLA Automatizado Activo</span>
                  </div>
                  <h1 className="text-lg font-bold text-slate-900 mt-0.5">
                    {isGeneralUser ? 'Mis Incidentes y Solicitudes de Soporte' : 'Gestión y Triaje de Incidentes Tecnológicos'}
                  </h1>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {isGeneralUser
                      ? 'Consulte el avance de atención de sus solicitudes con clasificación por criticidad (Baja, Media, Alta, Urgente).'
                      : 'Categorización por criticidad, recepción de eventos de red y diagnóstico proactivo de infraestructura.'}
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
                  {/* Origen Filter */}
                  <div className="flex items-center gap-1.5">
                    <span className="text-slate-500 font-medium">Origen:</span>
                    <select
                      value={origenFilter}
                      onChange={(e) => setOrigenFilter(e.target.value as 'all' | 'AUTOMATICO' | 'MANUAL')}
                      className="px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white text-slate-900 font-medium cursor-pointer"
                    >
                      <option value="all">Todos los orígenes</option>
                      <option value="MANUAL">Manual (Docente / Alumno)</option>
                      <option value="AUTOMATICO">Automático (Telemetría de Red)</option>
                    </select>
                  </div>

                  {/* Priority Filter */}
                  <div className="flex items-center gap-1.5">
                    <span className="text-slate-500 font-medium">Prioridad:</span>
                    <select
                      value={priorityFilter}
                      onChange={(e) => setPriorityFilter(e.target.value as 'all' | Priority)}
                      className="px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white text-slate-900 font-medium cursor-pointer"
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
                      className="px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white text-slate-900 font-medium cursor-pointer"
                    >
                      <option value="all">Todos</option>
                      <option value="open">Abiertos</option>
                      <option value="vmware_testing">En Diagnóstico</option>
                      <option value="in_progress">En Progreso</option>
                      <option value="resolved">Resueltos</option>
                    </select>
                  </div>

                  {/* Zabbix Connection helper button */}
                  <button
                    type="button"
                    onClick={() => setIsZabbixModalOpen(true)}
                    title="Ver URL y comando cURL para enviar fallas desde VMware Zabbix"
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-xs transition-colors cursor-pointer"
                  >
                    <Server className="w-3.5 h-3.5" />
                    <span>Conectar VMware / Zabbix</span>
                  </button>

                  {(priorityFilter !== 'all' || statusFilter !== 'all' || origenFilter !== 'all' || searchQuery) && (
                    <button
                      onClick={() => {
                        setPriorityFilter('all');
                        setStatusFilter('all');
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
                  <span className="text-slate-400 font-normal">Haga clic en una fila para gestionar el incidente</span>
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
                        setOrigenFilter('all');
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
                                <span>Telemetría de Red</span>
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

          {/* Section: Preguntas Frecuentes (FAQ) */}
          {activeSection === 'faq' && <FAQSection />}

          {/* Section: Cisco Packet Tracer Network Topology (TOPOLOGIA.pkt) */}
          {activeSection === 'packet-tracer' && (
            <PacketTracerTopology onTriggerNetworkIncident={handleAddNewTicket} />
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
                  Componente interactivo diseñado para categorizar incidentes en 4 niveles (Low, Medium, High, Urgent) conforme a las directivas tecnológicas de la DRELM y tiempos máximos de intervención de mesa de ayuda en UGEL 07.
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
                    Criterios Técnicos para Especialistas de Soporte UGEL 07:
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
                      <strong>Acción recomendada en infraestructura:</strong>{' '}
                      <span>
                        {sandboxPriority === 'urgent'
                          ? 'Acceso inmediato a consola remota del switch central, verificación de enlace de fibra y conmutación por error (Failover).'
                          : sandboxPriority === 'high'
                          ? 'Diagnóstico del switch de distribución del pabellón y reconfiguración de subred en el lote de computadoras afectadas.'
                          : sandboxPriority === 'medium'
                          ? 'Diagnóstico del puesto individual, verificación de cableado UTP Cat6 y ajuste de controlador de red.'
                          : 'Actualización programada de software educativo en el repositorio de la institución.'}
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
                        <th className="px-6 py-3">Escenario Típico (UGEL 07)</th>
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
                        <td className="px-6 py-3">Puesto individual con parpadeo o equipo congelado en Lab AIP.</td>
                        <td className="px-6 py-3">Coordinador CIST local</td>
                      </tr>
                      <tr className="hover:bg-slate-50">
                        <td className="px-6 py-3 font-bold text-amber-700">Alta / High</td>
                        <td className="px-6 py-3 font-mono font-semibold">&lt; 8 horas</td>
                        <td className="px-6 py-3">Aula completa (30+ alumnos)</td>
                        <td className="px-6 py-3">Falla de switch de distribución o sin conexión a internet en AIP.</td>
                        <td className="px-6 py-3">Especialista TI UGEL 07 presencial</td>
                      </tr>
                      <tr className="hover:bg-slate-50">
                        <td className="px-6 py-3 font-bold text-rose-700">Urgente / Urgent</td>
                        <td className="px-6 py-3 font-mono font-semibold">&lt; 2 horas</td>
                        <td className="px-6 py-3">Colegio completo / Jornada censal</td>
                        <td className="px-6 py-3">Caída del enlace principal de fibra durante evaluaciones MINEDU.</td>
                        <td className="px-6 py-3">Equipo de Guardia Rápida UGEL 07 / DRELM</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* Section: Zonal Blackout & Network Monitor */}
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

          {/* Section 5: Architecture & Systems Docs */}
          {activeSection === 'architecture' && (
            <ArchitectureDocs />
          )}
        </main>

        {/* Footer */}
        <footer className="mt-auto border-t border-slate-200 bg-white py-4 px-6 text-xs text-slate-500">
          <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2">
            <div>
              Help Desk TI Automatizado & Monitoreo Proactivo de Red · Jurisdicción UGEL 07 (Lima Sur)
            </div>
            <div className="flex items-center gap-2">
              <span>Proyecto de Titulación Profesional de Ingeniería</span>
            </div>
          </div>
        </footer>
      </div>

      {/* Ticket Submission Modal */}
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

      {/* Zabbix & VMware Live Connection Setup Modal */}
      <ZabbixConnectionModal
        isOpen={isZabbixModalOpen}
        onClose={() => setIsZabbixModalOpen(false)}
        onTicketInjected={handleAddNewTicket}
      />
    </div>
  );
}
