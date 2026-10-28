import React, { useState } from 'react';
import { Ticket, UGELCode } from '../types/helpdesk';
import {
  Zap,
  ZapOff,
  Radio,
  Server,
  Activity,
  RefreshCw,
  Cpu,
  Layers,
  Info,
  Terminal,
  FileCheck,
  ArrowRight,
  WifiOff,
  Flame,
  Phone,
  PhoneCall,
} from 'lucide-react';
import { EmergencyPhoneModal } from './EmergencyPhoneModal';

interface ZonalBlackoutMonitorProps {
  onAutoCreateTicket: (newTicket: Ticket) => void;
  onOpenTicket: (ticket: Ticket) => void;
  existingTickets: Ticket[];
}

interface SchoolNodeStatus {
  id: string;
  name: string;
  ugel: UGELCode;
  ip: string;
  status: 'ONLINE' | 'POWER_LOSS' | 'FIBER_CUT' | 'UNKNOWN_DOWN';
  pingMs: number;
  upsModel: string;
  upsBatteryPct: number;
  lastGaspSent: boolean;
  gridVoltage: number; // 220V normal, 0V blackout
}

const INITIAL_NODES: SchoolNodeStatus[] = [
  {
    id: 'node-1',
    name: 'I.E. Antenor Orrego Espinoza',
    ugel: 'UGEL 05',
    ip: '10.105.12.1',
    status: 'ONLINE',
    pingMs: 14,
    upsModel: 'APC Smart-UPS 3000VA (Rack AIP)',
    upsBatteryPct: 100,
    lastGaspSent: false,
    gridVoltage: 224,
  },
  {
    id: 'node-2',
    name: 'I.E. Canto Grande',
    ugel: 'UGEL 05',
    ip: '10.105.18.1',
    status: 'ONLINE',
    pingMs: 16,
    upsModel: 'Tripp-Lite SmartOnline 2200VA',
    upsBatteryPct: 98,
    lastGaspSent: false,
    gridVoltage: 221,
  },
  {
    id: 'node-3',
    name: 'I.E. Nicolás Copérnico',
    ugel: 'UGEL 05',
    ip: '10.105.22.1',
    status: 'ONLINE',
    pingMs: 15,
    upsModel: 'APC Smart-UPS 1500VA',
    upsBatteryPct: 100,
    lastGaspSent: false,
    gridVoltage: 223,
  },
  {
    id: 'node-4',
    name: 'I.E. Gran Unidad Alfonso Ugarte',
    ugel: 'UGEL 03',
    ip: '10.103.8.1',
    status: 'ONLINE',
    pingMs: 11,
    upsModel: 'Eaton 9PX 3000VA RT',
    upsBatteryPct: 100,
    lastGaspSent: false,
    gridVoltage: 220,
  },
  {
    id: 'node-5',
    name: 'I.E. Melitón Carvajal',
    ugel: 'UGEL 03',
    ip: '10.103.14.1',
    status: 'ONLINE',
    pingMs: 12,
    upsModel: 'APC Smart-UPS 2200VA',
    upsBatteryPct: 97,
    lastGaspSent: false,
    gridVoltage: 219,
  },
  {
    id: 'node-6',
    name: 'I.E. 6048 Jorge Basadre',
    ugel: 'UGEL 01',
    ip: '10.101.4.1',
    status: 'ONLINE',
    pingMs: 19,
    upsModel: 'APC Back-UPS Pro 1500',
    upsBatteryPct: 95,
    lastGaspSent: false,
    gridVoltage: 222,
  },
];

export const ZonalBlackoutMonitor: React.FC<ZonalBlackoutMonitorProps> = ({
  onAutoCreateTicket,
  onOpenTicket,
}) => {
  const [nodes, setNodes] = useState<SchoolNodeStatus[]>(INITIAL_NODES);
  const [activeSimulation, setActiveSimulation] = useState<
    'NONE' | 'UGEL05_BLACKOUT' | 'UGEL03_FIBERCUT' | 'SINGLE_SCHOOL_FAIL'
  >('NONE');
  const [isSimulating, setIsSimulating] = useState(false);
  const [simStep, setSimStep] = useState(0);
  const [logs, setLogs] = useState<string[]>([
    '[' + new Date().toLocaleTimeString() + '] [NOC-ZABBIX-INITIALIZED] Polling ICMP activo hacia 6 nodos core escolares en Lima Metropolitana.',
    '[' + new Date().toLocaleTimeString() + '] [HEARTBEAT-DAEMON] Dead Man\'s Switch configurado: timeout = 45s, reintentos = 3.',
    '[' + new Date().toLocaleTimeString() + '] [CORRELATOR-RULE] Umbral zonal: >= 2 caídas en misma UGEL en ventana < 180s activa clasificación de SINIESTRO ZONAL.',
  ]);
  const [latestCreatedTicket, setLatestCreatedTicket] = useState<Ticket | null>(null);
  const [isPhoneModalOpen, setIsPhoneModalOpen] = useState(false);
  const [phoneTargetSchool, setPhoneTargetSchool] = useState<string>('I.E. Antenor Orrego Espinoza');

  const resetAllNodes = () => {
    setNodes(INITIAL_NODES);
    setActiveSimulation('NONE');
    setIsSimulating(false);
    setSimStep(0);
    setLogs((prev) => [
      ...prev,
      '[' + new Date().toLocaleTimeString() + '] [RESET] Restauración de telemetría normal en todas las sedes.',
    ]);
  };

  const runSimulation = (
    type: 'UGEL05_BLACKOUT' | 'UGEL03_FIBERCUT' | 'SINGLE_SCHOOL_FAIL'
  ) => {
    setActiveSimulation(type);
    setIsSimulating(true);
    setSimStep(1);

    const now = new Date();
    const timeStr = () => new Date().toLocaleTimeString();

    if (type === 'UGEL05_BLACKOUT') {
      // Step 1: Power loss at 3 schools in UGEL 05
      setLogs((prev) => [
        ...prev,
        `[${timeStr()}] [SUBESTACIÓN-ELECTRICA] ⚡ ALERTA: Caída súbita de tensión en Alimentador SJL-04 (Enel Distribución). Tensión de red = 0 VAC.`,
        `[${timeStr()}] [SNMP-TRAP-DAEMON] 🚨 TRAMPA "LAST GASP" RECIBIDA: I.E. Antenor Orrego (APC Smart-UPS) envía trampa UDP 162 RFC 1628: upsTrapOnBattery. Tensión entrada: 0V.`,
      ]);

      setNodes((prev) =>
        prev.map((n) =>
          n.ugel === 'UGEL 05'
            ? {
                ...n,
                status: 'POWER_LOSS',
                gridVoltage: 0,
                upsBatteryPct: 88,
                lastGaspSent: true,
                pingMs: 0,
              }
            : n
        )
      );

      // Step 2: 1.5 seconds later - Dead Man's Switch
      setTimeout(() => {
        setSimStep(2);
        setLogs((prev) => [
          ...prev,
          `[${timeStr()}] [ZABBIX-POLLER] ❌ ICMP ping a 10.105.12.1 (Antenor Orrego) -> 3 paquetes perdidos (100% loss).`,
          `[${timeStr()}] [ZABBIX-POLLER] ❌ ICMP ping a 10.105.18.1 (Canto Grande) -> 3 paquetes perdidos (100% loss).`,
          `[${timeStr()}] [ZABBIX-POLLER] ❌ ICMP ping a 10.105.22.1 (Nicolás Copérnico) -> 3 paquetes perdidos (100% loss).`,
          `[${timeStr()}] [DEAD-MAN-SWITCH] Host unreachable confirmado: 3 colegios sin respuesta en menos de 30 segundos.`,
        ]);
      }, 1400);

      // Step 3: 3 seconds later - Correlation Engine
      setTimeout(() => {
        setSimStep(3);
        setLogs((prev) => [
          ...prev,
          `[${timeStr()}] [CORRELADOR-ZONAL] 🧠 EVALUACIÓN ESPACIO-TEMPORAL:`,
          `  - Colegios caídos: 3 nodos en un radio de 3.2 km (Sector SJL / UGEL 05).`,
          `  - Diferencia de tiempo: 4.8 segundos entre caídas.`,
          `  - Trampa Last Gasp recibida: SÍ (upsTrapOnBattery = 1).`,
          `  - DIAGNÓSTICO: 99.4% DE CONFIANZA -> SINIESTRO ZONAL: APAGÓN ELÉCTRICO MASIVO ENEL.`,
          `  - Descarta fallo de router individual o error humano en colegio.`,
        ]);
      }, 2800);

      // Step 4: 4.5 seconds later - Automatic Ticket Dispatch
      setTimeout(() => {
        setSimStep(4);
        setIsSimulating(false);

        const ticketCode = `TK-${now.getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;
        const formattedDate = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(
          now.getDate()
        ).padStart(2, '0')} ${String(now.getHours()).padStart(2, '0')}:${String(
          now.getMinutes()
        ).padStart(2, '0')}`;

        const autoTicket: Ticket = {
          id: `t-outage-${Date.now()}`,
          code: ticketCode,
          title: '🚨 SINIESTRO ZONAL: Apagón eléctrico masivo en UGEL 05 (3 colegios sin energía)',
          titulo: '🚨 SINIESTRO ZONAL: Apagón eléctrico masivo en UGEL 05 (3 colegios sin energía)',
          description: `INCIDENCIA GENERADA AUTOMÁTICAMENTE POR MOTOR DE CORRELACIÓN ZABBIX NOC:
Se detectó la desconexión total simultánea de 3 instituciones educativas en el distrito de San Juan de Lurigancho (UGEL 05) debido a un corte imprevisto de suministro eléctrico (Enel Alimentador SJL-04).

Colegios Afectados:
1. I.E. Antenor Orrego Espinoza (AIP Pabellón A) - Trampa SNMP Last Gasp APC recibida
2. I.E. Canto Grande (Laboratorio 1 y 2) - Pérdida de telemetría ICMP
3. I.E. Nicolás Copérnico (Centro de Cómputo) - Pérdida de telemetría ICMP

Parámetros de Detección:
- Dead Man's Switch: 3/3 fallos de heartbeat en 18s.
- Trampa de Último Suspiro (RFC 1628): upsTrapOnBattery, Vin = 0V confirmada antes de apagado.
- Correlación Zonal: 99.4% confianza de corte de energía distrital.
- SLA de Atención Crítica: 2 horas (Prioridad Urgente).`,
          descripcion: 'Siniestro Zonal automático por corte de suministro eléctrico en UGEL 05 detectado por Correlador Zabbix.',
          origen: 'AUTOMATICO',
          priority: 'urgent',
          status: 'open',
          category: 'networking_connectivity',
          ugel: 'UGEL 05',
          sede: 'UGEL 05 - Sector San Juan de Lurigancho Norte',
          schoolName: 'I.E. Antenor Orrego Espinoza (+ 2 Colegios Vecinos)',
          reporterUserId: 'usr-zabbix-correlator',
          reporterName: 'Motor de Correlación Zabbix NOC (Siniestros Zonales)',
          reporterRole: 'Telemetría Proactiva MINEDU / DRELM',
          reporterEmail: 'noc-alertas@drelm.gob.pe',
          classroomLab: 'Múltiples Laboratorios AIP y Aulas de Innovación',
          createdAt: formattedDate,
          slaTargetHours: 2,
          assignedTechnician: 'Ing. Cuadrilla Emergencia Zonal TI (UGEL 05)',
          sinistroZonal: true,
          outageCause: 'CORTE_ELECTRICO_MASIVO',
          telemetriaZabbix: {
            lastGaspReceived: true,
            lastGaspTrapCode: 'RFC-1628:upsTrapOnBattery(Vin=0V)',
            upsResidualBatteryPct: 88,
            heartbeatConsecutiveFails: 3,
            correlationConfidence: 99.4,
            colegiosAfectadosEnSector: [
              'I.E. Antenor Orrego Espinoza',
              'I.E. Canto Grande',
              'I.E. Nicolás Copérnico',
            ],
            zonaSuministro: 'Subestación Enel San Juan de Lurigancho - Alimentador SJL-04',
            probableCausa: 'CORTE_ELECTRICO_MASIVO',
          },
          comments: [
            {
              id: `c-${Date.now()}-1`,
              author: 'Zabbix Webhook API',
              role: 'Motor de Detección Automatizada',
              text: 'Alerta generada automáticamente por pérdida de telemetría sincronizada. Se activa protocolo de contingencia con Enel Distribución y DRELM.',
              timestamp: formattedDate,
            },
            {
              id: `c-${Date.now()}-2`,
              author: 'Dispatcher de Mesa de Ayuda',
              role: 'Enrutador de Incidencias',
              text: 'Prioridad Urgente asignada según Matriz de Criticidad (SLA 2 horas). Se notificó por SMS al especialista de infraestructura de la UGEL 05.',
              timestamp: formattedDate,
            },
          ],
        };

        onAutoCreateTicket(autoTicket);
        setLatestCreatedTicket(autoTicket);

        setLogs((prev) => [
          ...prev,
          `[${timeStr()}] [HELPDESK-API] ✅ HTTP 201 CREATED: Ticket de Siniestro Zonal ${ticketCode} generado en base de datos.`,
          `[${timeStr()}] [DISPATCHER] Notificación SMS y Webhook enviada a Cuadrilla Técnica UGEL 05 y Mesa de Ayuda.`,
        ]);
      }, 4400);
    } else if (type === 'UGEL03_FIBERCUT') {
      // Fiber cut in UGEL 03
      setLogs((prev) => [
        ...prev,
        `[${timeStr()}] [INFRAESTRUCTURA-WAN] ⚠️ Caída de enlace óptico en Anillo Metropolitano Salaverry-Brasil (UGEL 03).`,
        `[${timeStr()}] [ROUTER-BGP] BFD (Bidirectional Forwarding Detection) sesión caída en router de borde.`,
      ]);

      setNodes((prev) =>
        prev.map((n) =>
          n.ugel === 'UGEL 03'
            ? {
                ...n,
                status: 'FIBER_CUT',
                pingMs: 0,
                // In fiber cut, 220V power IS STILL ON! Only network died.
                gridVoltage: 220,
                lastGaspSent: false,
              }
            : n
        )
      );

      setTimeout(() => {
        setSimStep(2);
        setLogs((prev) => [
          ...prev,
          `[${timeStr()}] [ZABBIX-POLLER] ❌ ICMP timeout simultáneo en Alfonso Ugarte y Melitón Carvajal.`,
          `[${timeStr()}] [TELEMETRIA-UPS] ℹ️ DATO CLAVE: No se recibió trampa de batería. UPS reporta 220V estable.`,
        ]);
      }, 1400);

      setTimeout(() => {
        setSimStep(3);
        setLogs((prev) => [
          ...prev,
          `[${timeStr()}] [CORRELADOR-ZONAL] 🧠 EVALUACIÓN ESPACIO-TEMPORAL:`,
          `  - Múltiples colegios caídos en UGEL 03 sin respuesta de ping.`,
          `  - Energía eléctrica normal (220V presente según SNMP local previo a corte).`,
          `  - DIAGNÓSTICO: CORTE DE FIBRA ÓPTICA TRONCAL DEL PROVEEDOR ISP (Telefónica/Claro).`,
        ]);
      }, 2600);

      setTimeout(() => {
        setSimStep(4);
        setIsSimulating(false);

        const ticketCode = `TK-${now.getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;
        const formattedDate = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(
          now.getDate()
        ).padStart(2, '0')} ${String(now.getHours()).padStart(2, '0')}:${String(
          now.getMinutes()
        ).padStart(2, '0')}`;

        const autoTicket: Ticket = {
          id: `t-outage-${Date.now()}`,
          code: ticketCode,
          title: '🚨 FALLO TRONCAL WAN: Rotura de fibra óptica en UGEL 03 (I.E. Alfonso Ugarte y Melitón Carvajal)',
          titulo: '🚨 FALLO TRONCAL WAN: Rotura de fibra óptica en UGEL 03 (I.E. Alfonso Ugarte y Melitón Carvajal)',
          description: `DETECCIÓN AUTOMÁTICA NOC ZABBIX:
Se produjo una interrupción del enlace de fibra óptica troncal del proveedor ISP en el eje Brasil-Salaverry afectando a las instituciones de la UGEL 03.
El sistema verificó que las escuelas cuentan con energía eléctrica normal (sin trampa de batería), aislando el problema como fallo del operador de telecomunicaciones.`,
          descripcion: 'Fallo masivo de fibra óptica troncal ISP en UGEL 03.',
          origen: 'AUTOMATICO',
          priority: 'urgent',
          status: 'open',
          category: 'networking_connectivity',
          ugel: 'UGEL 03',
          sede: 'Sede UGEL 03 - Enlace Dorsal',
          schoolName: 'I.E. Gran Unidad Alfonso Ugarte (+ I.E. Melitón Carvajal)',
          reporterUserId: 'usr-zabbix-correlator',
          reporterName: 'Sensor Zabbix BFD & Correlador de Enlace',
          reporterRole: 'Supervisión Troncal DRELM',
          reporterEmail: 'noc-alertas@drelm.gob.pe',
          classroomLab: 'Toda la infraestructura de red del colegio',
          createdAt: formattedDate,
          slaTargetHours: 2,
          assignedTechnician: 'Ing. Leonardo Granados Ortega',
          sinistroZonal: true,
          outageCause: 'CORTE_FIBRA_OPTICA_TRONCAL',
          telemetriaZabbix: {
            lastGaspReceived: false,
            heartbeatConsecutiveFails: 3,
            correlationConfidence: 96.8,
            colegiosAfectadosEnSector: [
              'I.E. Gran Unidad Alfonso Ugarte',
              'I.E. Melitón Carvajal',
            ],
            zonaSuministro: 'Troncal Óptica Metro-Ethernet UGEL 03',
            probableCausa: 'CORTE_FIBRA_OPTICA_TRONCAL',
          },
          comments: [
            {
              id: `c-${Date.now()}-1`,
              author: 'Zabbix Webhook API',
              role: 'Sistema Automatizado',
              text: 'Incidencia creada con ticket prioritario hacia NOC de Claro / Telefónica Empresas.',
              timestamp: formattedDate,
            },
          ],
        };

        onAutoCreateTicket(autoTicket);
        setLatestCreatedTicket(autoTicket);

        setLogs((prev) => [
          ...prev,
          `[${timeStr()}] [HELPDESK-API] ✅ HTTP 201 CREATED: Ticket de Siniestro Zonal ${ticketCode} generado en base de datos.`,
        ]);
      }, 4200);
    } else {
      // Single school breaker fail
      setLogs((prev) => [
        ...prev,
        `[${timeStr()}] [MONITOREO-LOCAL] Caída detectada únicamente en I.E. Jorge Basadre (UGEL 01).`,
        `[${timeStr()}] [CORRELADOR-ZONAL] Verificando colegios vecinos en UGEL 01...`,
        `  - I.E. República de Bolivia: 100% ONLINE (Ping 15ms).`,
        `  - I.E. 7054 VMT: 100% ONLINE (Ping 17ms).`,
        `[${timeStr()}] [DIAGNÓSTICO] NO ES APAGÓN ZONAL. Es una falla local interna en el colegio (posible llave térmica bajada).`,
      ]);

      setNodes((prev) =>
        prev.map((n) =>
          n.id === 'node-6'
            ? {
                ...n,
                status: 'POWER_LOSS',
                gridVoltage: 0,
                pingMs: 0,
                lastGaspSent: true,
              }
            : n
        )
      );

      setTimeout(() => {
        setSimStep(4);
        setIsSimulating(false);

        const ticketCode = `TK-${now.getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;
        const formattedDate = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(
          now.getDate()
        ).padStart(2, '0')} ${String(now.getHours()).padStart(2, '0')}:${String(
          now.getMinutes()
        ).padStart(2, '0')}`;

        const autoTicket: Ticket = {
          id: `t-single-${Date.now()}`,
          code: ticketCode,
          title: 'Avería local de energía: Tablero eléctrico sin tensión en I.E. Jorge Basadre',
          titulo: 'Avería local de energía: Tablero eléctrico sin tensión en I.E. Jorge Basadre',
          description: `El servidor Zabbix detectó pérdida de telemetría aislada en la I.E. Jorge Basadre.
El motor de correlación verificó que los colegios aledaños de la UGEL 01 funcionan con normalidad, por lo que NO se trata de un apagón distrital sino de un fallo interno en el disyuntor o tablero del colegio.`,
          descripcion: 'Falla local aislada de energía en I.E. Jorge Basadre.',
          origen: 'AUTOMATICO',
          priority: 'high',
          status: 'open',
          category: 'aip_hardware',
          ugel: 'UGEL 01',
          sede: 'Sede Villa El Salvador',
          schoolName: 'I.E. 6048 Jorge Basadre (Villa El Salvador)',
          reporterUserId: 'usr-zabbix-correlator',
          reporterName: 'Sensor Zabbix Autonómico',
          reporterRole: 'Telemetría Proactiva',
          reporterEmail: 'zabbix@cibertec.edu.pe',
          classroomLab: 'Tablero Eléctrico General AIP',
          createdAt: formattedDate,
          slaTargetHours: 8,
          assignedTechnician: 'Ing. Carlos Mendoza (Técnico Residente)',
          sinistroZonal: false,
          outageCause: 'FALLA_LOCAL_AISLADA',
          telemetriaZabbix: {
            lastGaspReceived: true,
            heartbeatConsecutiveFails: 3,
            correlationConfidence: 91.5,
            colegiosAfectadosEnSector: ['I.E. 6048 Jorge Basadre'],
            probableCausa: 'FALLA_LOCAL_AISLADA',
          },
          comments: [
            {
              id: `c-${Date.now()}-1`,
              author: 'Zabbix Webhook API',
              role: 'Sistema Automatizado',
              text: 'Ticket de incidencia local generado automáticamente. Se asigna prioridad Alta (SLA 8 horas).',
              timestamp: formattedDate,
            },
          ],
        };

        onAutoCreateTicket(autoTicket);
        setLatestCreatedTicket(autoTicket);

        setLogs((prev) => [
          ...prev,
          `[${timeStr()}] [HELPDESK-API] ✅ HTTP 201 CREATED: Ticket local ${ticketCode} generado exitosamente.`,
        ]);
      }, 2500);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="p-6 rounded-2xl bg-slate-900 text-white border border-slate-800 shadow-xl relative overflow-hidden">
        <div className="absolute right-0 top-0 translate-x-10 -translate-y-10 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-2 max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-red-500/20 text-red-300 border border-red-500/30">
              <Radio className="w-3.5 h-3.5 animate-pulse text-red-400" />
              <span>Zabbix NOC · Detección Automática de Siniestros & Apagones</span>
            </div>
            <h1 className="text-xl md:text-2xl font-bold tracking-tight text-white">
              ¿Cómo se reporta automáticamente un apagón si el colegio está desconectado?
            </h1>
            <p className="text-xs md:text-sm text-slate-300 leading-relaxed">
              Cuando un colegio pierde la energía (apagón de Enel/Luz del Sur) o sufre un corte de fibra
              óptica, <strong>el colegio no puede reportarse a sí mismo</strong> porque sus equipos están
              apagados o incomunicados. El sistema resuelve esto mediante{' '}
              <strong className="text-indigo-300">3 técnicas de ingeniería de redes</strong>:
            </p>
          </div>

          <div className="flex flex-wrap lg:flex-col gap-2 shrink-0">
            <button
              onClick={resetAllNodes}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 cursor-pointer transition-colors"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Restablecer Monitoreo</span>
            </button>
            {latestCreatedTicket && (
              <>
                <button
                  onClick={() => onOpenTicket(latestCreatedTicket)}
                  className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-500 text-white shadow-md cursor-pointer transition-colors"
                >
                  <FileCheck className="w-3.5 h-3.5" />
                  <span>Ver Ticket ({latestCreatedTicket.code})</span>
                </button>
                <button
                  onClick={() => {
                    setPhoneTargetSchool(latestCreatedTicket.schoolName);
                    setIsPhoneModalOpen(true);
                  }}
                  className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white shadow-md cursor-pointer transition-colors"
                >
                  <PhoneCall className="w-3.5 h-3.5" />
                  <span>Llamar al Colegio (Contingencia)</span>
                </button>
              </>
            )}
          </div>
        </div>

        {/* 3 Core Engineering Pillars */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-6 pt-5 border-t border-slate-800 text-xs">
          <div className="p-3 rounded-xl bg-slate-800/60 border border-slate-700/60">
            <div className="flex items-center gap-2 font-bold text-amber-300 mb-1">
              <Zap className="w-4 h-4" />
              <span>1. Trampa SNMP "Last Gasp"</span>
            </div>
            <p className="text-slate-300 text-[11px] leading-relaxed">
              La Smart-UPS o router usa capacitores residuales para enviar una ráfaga agónica UDP (<code className="text-amber-200">upsTrapOnBattery</code>) milisegundos antes de que el voltaje caiga a 0V.
            </p>
          </div>

          <div className="p-3 rounded-xl bg-slate-800/60 border border-slate-700/60">
            <div className="flex items-center gap-2 font-bold text-sky-300 mb-1">
              <Activity className="w-4 h-4" />
              <span>2. Dead Man's Switch (Heartbeat)</span>
            </div>
            <p className="text-slate-300 text-[11px] leading-relaxed">
              El NOC central no espera que el colegio llame: hace ping cada 15s. Si hay 3 timeouts consecutivos (<code className="text-sky-200">nodata(45s)=1</code>), Zabbix marca la sede como <em>Unreachable</em>.
            </p>
          </div>

          <div className="p-3 rounded-xl bg-slate-800/60 border border-slate-700/60">
            <div className="flex items-center gap-2 font-bold text-emerald-300 mb-1">
              <Layers className="w-4 h-4" />
              <span>3. Correlación Zonal UGEL</span>
            </div>
            <p className="text-slate-300 text-[11px] leading-relaxed">
              Si 2 o más colegios de la misma zona caen en &lt; 180s, el motor descarta fallo interno y diagnostica <strong>Siniestro Zonal</strong>, despachando un Ticket Urgente automático (SLA 2h).
            </p>
          </div>
        </div>
      </div>

      {/* Interactive Simulation Sandbox */}
      <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Flame className="w-5 h-5 text-amber-500" />
              <span>Banco de Pruebas: Simulación de Siniestros y Generación de Tickets</span>
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Ejecute uno de los 3 siniestros reales para ver la cascada de detección y cómo se inyecta el ticket en la Mesa de Ayuda:
            </p>
          </div>

          {isSimulating && (
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-100 text-amber-800 border border-amber-300 text-xs font-semibold animate-pulse">
              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
              <span>Correlacionador procesando telemetría...</span>
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Card 1: UGEL 05 Blackout */}
          <div
            className={`p-4 rounded-xl border transition-all text-left flex flex-col justify-between ${
              activeSimulation === 'UGEL05_BLACKOUT'
                ? 'border-red-500 bg-red-50/50 ring-2 ring-red-400'
                : 'border-slate-200 hover:border-slate-300 bg-white'
            }`}
          >
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold px-2 py-0.5 rounded bg-red-100 text-red-800">
                  Siniestro Crítico Multi-Sede
                </span>
                <span className="text-xs font-mono text-slate-400">UGEL 05 SJL</span>
              </div>
              <h3 className="text-sm font-bold text-slate-900">
                Apagón Eléctrico Masivo en Cuadrante SJL
              </h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Corte imprevisto en subestación eléctrica Enel. 3 colegios pierden 220V al mismo
                tiempo. La UPS dispara la trampa <em>Last Gasp</em> y Zabbix correlaciona el apagón zonal.
              </p>
            </div>
            <button
              disabled={isSimulating}
              onClick={() => runSimulation('UGEL05_BLACKOUT')}
              className="mt-4 w-full py-2 px-3 rounded-lg text-xs font-bold bg-red-600 hover:bg-red-700 disabled:bg-slate-300 text-white cursor-pointer shadow-xs transition-colors flex items-center justify-center gap-1.5"
            >
              <ZapOff className="w-4 h-4" />
              <span>Simular Apagón Eléctrico Zonal</span>
            </button>
          </div>

          {/* Card 2: Fiber cut */}
          <div
            className={`p-4 rounded-xl border transition-all text-left flex flex-col justify-between ${
              activeSimulation === 'UGEL03_FIBERCUT'
                ? 'border-amber-500 bg-amber-50/50 ring-2 ring-amber-400'
                : 'border-slate-200 hover:border-slate-300 bg-white'
            }`}
          >
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold px-2 py-0.5 rounded bg-amber-100 text-amber-800">
                  Fallo Telecomunicaciones ISP
                </span>
                <span className="text-xs font-mono text-slate-400">UGEL 03 Centro</span>
              </div>
              <h3 className="text-sm font-bold text-slate-900">
                Corte de Fibra Óptica Troncal
              </h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Rotura del anillo metropolitano de fibra óptica por obras civiles. Los colegios
                tienen luz 220V pero pierden conexión. El correlador crea ticket urgente al ISP.
              </p>
            </div>
            <button
              disabled={isSimulating}
              onClick={() => runSimulation('UGEL03_FIBERCUT')}
              className="mt-4 w-full py-2 px-3 rounded-lg text-xs font-bold bg-amber-600 hover:bg-amber-700 disabled:bg-slate-300 text-white cursor-pointer shadow-xs transition-colors flex items-center justify-center gap-1.5"
            >
              <WifiOff className="w-4 h-4" />
              <span>Simular Corte Troncal de Fibra</span>
            </button>
          </div>

          {/* Card 3: Single school breaker fail */}
          <div
            className={`p-4 rounded-xl border transition-all text-left flex flex-col justify-between ${
              activeSimulation === 'SINGLE_SCHOOL_FAIL'
                ? 'border-indigo-500 bg-indigo-50/50 ring-2 ring-indigo-400'
                : 'border-slate-200 hover:border-slate-300 bg-white'
            }`}
          >
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-800">
                  Incidencia Local Aislada
                </span>
                <span className="text-xs font-mono text-slate-400">UGEL 01 Sur</span>
              </div>
              <h3 className="text-sm font-bold text-slate-900">
                Disyuntor Interno Bajado en 1 Colegio
              </h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Sólo la I.E. Jorge Basadre pierde enlace. Los colegios aledaños siguen online.
                El correlador determina que NO es apagón zonal y crea un ticket local de prioridad Alta.
              </p>
            </div>
            <button
              disabled={isSimulating}
              onClick={() => runSimulation('SINGLE_SCHOOL_FAIL')}
              className="mt-4 w-full py-2 px-3 rounded-lg text-xs font-bold bg-slate-800 hover:bg-slate-900 disabled:bg-slate-300 text-white cursor-pointer shadow-xs transition-colors flex items-center justify-center gap-1.5"
            >
              <Cpu className="w-4 h-4" />
              <span>Simular Falla Local en 1 Colegio</span>
            </button>
          </div>
        </div>
      </div>

      {/* Grid Status & Topology Map */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Monitored Schools Status (2 cols wide) */}
        <div className="lg:col-span-2 space-y-4">
          <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-xs">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <Server className="w-4 h-4 text-indigo-600" />
                  <span>Matriz de Telemetría Escolar en Tiempo Real (NOC Zabbix)</span>
                </h3>
                <p className="text-xs text-slate-500">
                  Monitoreo de tensión eléctrica (VAC), enlace de fibra y estado de la UPS en rack
                </p>
              </div>
              <span className="text-xs font-mono px-2 py-0.5 rounded bg-slate-100 text-slate-600">
                Intervalo: 15s
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {nodes.map((node) => {
                return (
                  <div
                    key={node.id}
                    className={`p-3.5 rounded-xl border transition-all ${
                      node.status === 'POWER_LOSS'
                        ? 'border-red-400 bg-red-50/60 ring-1 ring-red-300'
                        : node.status === 'FIBER_CUT'
                        ? 'border-amber-400 bg-amber-50/60 ring-1 ring-amber-300'
                        : 'border-slate-200 bg-white hover:border-slate-300'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span
                            className={`w-2 h-2 rounded-full ${
                              node.status === 'ONLINE'
                                ? 'bg-emerald-500 animate-pulse'
                                : 'bg-red-500'
                            }`}
                          />
                          <span className="text-xs font-bold text-slate-900 leading-tight">
                            {node.name}
                          </span>
                        </div>
                        <span className="text-[11px] text-slate-500 font-mono">
                          {node.ugel} · IP: {node.ip}
                        </span>
                      </div>

                      <span
                        className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded ${
                          node.status === 'ONLINE'
                            ? 'bg-emerald-100 text-emerald-800'
                            : node.status === 'POWER_LOSS'
                            ? 'bg-red-100 text-red-800'
                            : 'bg-amber-100 text-amber-800'
                        }`}
                      >
                        {node.status === 'ONLINE'
                          ? 'Operativo'
                          : node.status === 'POWER_LOSS'
                          ? 'Sin Energía'
                          : 'Sin Enlace FO'}
                      </span>
                    </div>

                    <div className="grid grid-cols-3 gap-2 mt-3 pt-2 border-t border-slate-100 text-[11px]">
                      <div>
                        <span className="text-slate-400 block text-[10px]">Tensión Red</span>
                        <span
                          className={`font-mono font-bold ${
                            node.gridVoltage === 0 ? 'text-red-600' : 'text-slate-800'
                          }`}
                        >
                          {node.gridVoltage} VAC
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-400 block text-[10px]">Ping NOC</span>
                        <span
                          className={`font-mono font-bold ${
                            node.pingMs === 0 ? 'text-red-600' : 'text-emerald-700'
                          }`}
                        >
                          {node.pingMs === 0 ? 'TIMEOUT' : `${node.pingMs}ms`}
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-400 block text-[10px]">UPS Rack</span>
                        <span className="font-mono text-slate-700 font-medium">
                          {node.upsBatteryPct}%
                        </span>
                      </div>
                    </div>

                    {node.lastGaspSent && (
                      <div className="mt-2 p-1.5 rounded bg-red-100/80 text-[10px] font-semibold text-red-800 flex items-center gap-1">
                        <ZapOff className="w-3 h-3 text-red-600" />
                        <span>Trampa Last Gasp UDP 162 recibida en NOC</span>
                      </div>
                    )}

                    {node.status !== 'ONLINE' && (
                      <button
                        onClick={() => {
                          setPhoneTargetSchool(node.name);
                          setIsPhoneModalOpen(true);
                        }}
                        className="mt-2 w-full py-1.5 px-2 bg-slate-900 hover:bg-slate-800 text-emerald-400 rounded-md text-[11px] font-bold flex items-center justify-center gap-1 transition-colors cursor-pointer"
                      >
                        <PhoneCall className="w-3 h-3 text-emerald-400" />
                        <span>Llamar al Director / CIST</span>
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Workflow Sequence Steps */}
          <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-xs">
            <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-3">
              Fases de Ejecución del Protocolo de Detección de Desconexión
            </h3>

            <div className="space-y-3">
              {[
                {
                  step: 1,
                  title: 'Disparo de Trampa Last Gasp / Corte de Suministro',
                  desc: 'El hardware envía el último paquete UDP antes de descargarse por completo.',
                  active: simStep >= 1,
                },
                {
                  step: 2,
                  title: 'Timeout de Heartbeat (Dead Man\'s Switch)',
                  desc: 'El poller de Zabbix detecta 3 fallos consecutivos en el ciclo de 15 segundos.',
                  active: simStep >= 2,
                },
                {
                  step: 3,
                  title: 'Análisis del Motor de Correlación Espacio-Temporal',
                  desc: 'Agrupa caídas simultáneas por cuadrante UGEL y subestación eléctrica para descartar fallas individuales.',
                  active: simStep >= 3,
                },
                {
                  step: 4,
                  title: 'Creación Automática del Ticket Crítico (SLA < 2h)',
                  desc: 'Inyección vía REST API en el HelpDesk con categoría networking y despacho a cuadrillas.',
                  active: simStep >= 4,
                },
              ].map((s) => (
                <div
                  key={s.step}
                  className={`flex items-start gap-3 p-3 rounded-xl border transition-all ${
                    s.active
                      ? 'border-indigo-300 bg-indigo-50/50 text-slate-900'
                      : 'border-slate-200 bg-slate-50/40 text-slate-400'
                  }`}
                >
                  <div
                    className={`w-6 h-6 rounded-full flex items-center justify-center font-bold text-xs shrink-0 ${
                      s.active ? 'bg-indigo-600 text-white' : 'bg-slate-200 text-slate-500'
                    }`}
                  >
                    {s.step}
                  </div>
                  <div className="text-xs">
                    <strong className={s.active ? 'text-slate-900' : 'text-slate-500'}>
                      {s.title}
                    </strong>
                    <p className={`text-[11px] mt-0.5 ${s.active ? 'text-slate-600' : 'text-slate-400'}`}>
                      {s.desc}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Column: Terminal Console Log & Generated Ticket Preview */}
        <div className="space-y-4">
          {/* Live Terminal */}
          <div className="p-4 rounded-2xl bg-slate-950 text-slate-200 font-mono text-xs border border-slate-800 shadow-lg flex flex-col h-[320px]">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800 text-[11px] text-slate-400">
              <div className="flex items-center gap-2">
                <Terminal className="w-3.5 h-3.5 text-emerald-400" />
                <span>Consola NOC · Zabbix Trapper Engine</span>
              </div>
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            </div>

            <div className="flex-1 overflow-y-auto py-2 space-y-1.5 text-[11px] leading-relaxed">
              {logs.map((log, idx) => (
                <div
                  key={idx}
                  className={
                    log.includes('CRITICAL') || log.includes('ALERTA') || log.includes('0 VAC')
                      ? 'text-red-400 font-semibold'
                      : log.includes('CREATED') || log.includes('CONFIANZA')
                      ? 'text-emerald-400 font-semibold'
                      : log.includes('CORRELADOR') || log.includes('EVALUACIÓN')
                      ? 'text-indigo-300'
                      : 'text-slate-300'
                  }
                >
                  {log}
                </div>
              ))}
            </div>
          </div>

          {/* Ticket Dispatch Card */}
          {latestCreatedTicket ? (
            <div className="p-5 rounded-2xl bg-emerald-50 border border-emerald-300 shadow-xs space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold px-2 py-0.5 rounded bg-emerald-200 text-emerald-900">
                  Ticket Generado Automáticamente
                </span>
                <span className="font-mono text-xs font-bold text-emerald-800">
                  {latestCreatedTicket.code}
                </span>
              </div>
              <h4 className="text-xs font-bold text-slate-900">
                {latestCreatedTicket.title}
              </h4>
              <div className="text-[11px] text-slate-600 space-y-1">
                <p>
                  <strong>Prioridad:</strong> Urgente (SLA &lt; 2 horas)
                </p>
                <p>
                  <strong>Origen:</strong> AUTOMATICO (Zabbix Webhook)
                </p>
                <p>
                  <strong>Sede:</strong> {latestCreatedTicket.sede}
                </p>
              </div>
              <div className="space-y-2">
                <button
                  onClick={() => onOpenTicket(latestCreatedTicket)}
                  className="w-full py-2 px-3 rounded-lg text-xs font-bold bg-emerald-700 hover:bg-emerald-800 text-white cursor-pointer transition-colors shadow-xs flex items-center justify-center gap-1.5"
                >
                  <span>Abrir y Atender en Mesa de Ayuda</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => {
                    setPhoneTargetSchool(latestCreatedTicket.schoolName);
                    setIsPhoneModalOpen(true);
                  }}
                  className="w-full py-2 px-3 rounded-lg text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white cursor-pointer transition-colors shadow-xs flex items-center justify-center gap-1.5"
                >
                  <PhoneCall className="w-3.5 h-3.5" />
                  <span>Llamar al Director / CIST (Contingencia)</span>
                </button>
              </div>
            </div>
          ) : (
            <div className="p-5 rounded-2xl bg-white border border-slate-200 text-center space-y-2">
              <Info className="w-6 h-6 text-slate-400 mx-auto" />
              <h4 className="text-xs font-bold text-slate-800">
                Ningún siniestro activo en este momento
              </h4>
              <p className="text-[11px] text-slate-500">
                Presione uno de los botones de simulación arriba para probar el disparo de alertas y la creación automática del ticket.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Emergency Phone Modal */}
      <EmergencyPhoneModal
        isOpen={isPhoneModalOpen}
        onClose={() => setIsPhoneModalOpen(false)}
        targetSchoolName={phoneTargetSchool}
        associatedTicket={latestCreatedTicket}
      />
    </div>
  );
};
