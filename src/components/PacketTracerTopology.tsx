import React, { useState } from 'react';
import {
  Network,
  Server,
  Laptop,
  Monitor,
  Wifi,
  Shield,
  Radio,
  Activity,
  CheckCircle2,
  AlertTriangle,
  Play,
  RotateCcw,
  Terminal,
  ZapOff,
  Cpu,
  Layers,
  FileCode,
  Info,
  ArrowRight,
  Send,
  Eye
} from 'lucide-react';
import { Ticket } from '../types/helpdesk';

interface PacketTracerTopologyProps {
  onTriggerNetworkIncident?: (ticket: Ticket) => void;
}

interface NetworkDevice {
  id: string;
  name: string;
  type: 'router' | 'switch' | 'server' | 'pc' | 'laptop' | 'ap';
  model: string;
  ip: string;
  mask: string;
  gateway: string;
  vlan: string;
  vlanName: string;
  zone: 'admin' | 'academico' | 'lab' | 'datacenter';
  zoneName: string;
  ports: string[];
  status: 'online' | 'warning' | 'offline';
  snmpStatus: 'Activo (v3)' | 'Inactivo';
  mac: string;
  iosConfig: string;
}

export const PacketTracerTopology: React.FC<PacketTracerTopologyProps> = ({
  onTriggerNetworkIncident,
}) => {
  // State for simulated link failure on SW-LAB-COMPUTO
  const [isLabLinkDown, setIsLabLinkDown] = useState(false);
  const [isCoreLinkDown, setIsCoreLinkDown] = useState(false);
  const [selectedDeviceId, setSelectedDeviceId] = useState<string>('srv-zabbix');
  const [activeTab, setActiveTab] = useState<'topology' | 'cli' | 'vlan-table' | 'snmp'>('topology');
  const [cliSource, setCliSource] = useState<'r1' | 'sw-core' | 'sw-lab' | 'srv-zabbix'>('r1');

  // Ping simulation state
  const [pingSource, setPingSource] = useState<string>('pc-alumno-01');
  const [pingTarget, setPingTarget] = useState<string>('srv-zabbix');
  const [pingLogs, setPingLogs] = useState<string[]>([]);
  const [isPinging, setIsPinging] = useState(false);

  const devices: Record<string, NetworkDevice> = {
    r1: {
      id: 'r1',
      name: 'R1-DRELM-ROUTER',
      type: 'router',
      model: 'Cisco 2911 ISR',
      ip: '192.168.40.1 (Subinterfaces .10, .20, .30, .40)',
      mask: '255.255.255.0',
      gateway: '10.0.0.1 (WAN ISP)',
      vlan: 'Inter-VLAN (dot1Q)',
      vlanName: 'Enrutamiento Trunk 802.1Q',
      zone: 'datacenter',
      zoneName: 'DATA CENTER (VLAN 40)',
      ports: ['Gig0/0 (Trunk a SW-CORE)', 'Gig0/1 (WAN)', 'Gig0/2 (Failover)'],
      status: isCoreLinkDown ? 'warning' : 'online',
      snmpStatus: 'Activo (v3)',
      mac: '0001.96C2.B101',
      iosConfig: `hostname R1-DRELM-ROUTER
!
interface GigabitEthernet0/0
 no ip address
 duplex auto
 speed auto
!
interface GigabitEthernet0/0.10
 description VLAN 10 - Area Administrativa
 encapsulation dot1Q 10
 ip address 192.168.10.1 255.255.255.0
 ip helper-address 192.168.40.10
!
interface GigabitEthernet0/0.20
 description VLAN 20 - Area Academica (Docentes)
 encapsulation dot1Q 20
 ip address 192.168.20.1 255.255.255.0
 ip helper-address 192.168.40.10
!
interface GigabitEthernet0/0.30
 description VLAN 30 - Laboratorio de Computo
 encapsulation dot1Q 30
 ip address 192.168.30.1 255.255.255.0
 ip helper-address 192.168.40.10
!
interface GigabitEthernet0/0.40
 description VLAN 40 - Data Center Servidores & Zabbix
 encapsulation dot1Q 40
 ip address 192.168.40.1 255.255.255.0
!
snmp-server community cibertec2026 RO
snmp-server host 192.168.40.10 version 3 priv zabbix_agent`,
    },
    'sw-core': {
      id: 'sw-core',
      name: 'SW-CORE-DISTRIBUCION',
      type: 'switch',
      model: 'Cisco Catalyst 2960-24TT',
      ip: '192.168.40.2 (VLAN 40 SVI)',
      mask: '255.255.255.0',
      gateway: '192.168.40.1',
      vlan: '10, 20, 30, 40',
      vlanName: 'Switch Core / Distribución',
      zone: 'datacenter',
      zoneName: 'DATA CENTER (VLAN 40)',
      ports: ['Gig1/0/1 (R1 Trunk)', 'Gig1/0/10 (SW-ADMIN)', 'Gig1/0/2 (SW-ACAD)', 'Gig1/0/4 (SW-LAB)'],
      status: isCoreLinkDown ? 'offline' : 'online',
      snmpStatus: 'Activo (v3)',
      mac: '00D0.BA74.AA01',
      iosConfig: `hostname SW-CORE
!
vlan 10
 name ADMINISTRACION
vlan 20
 name ACADEMICO-DOCENTES
vlan 30
 name LAB-COMPUTO
vlan 40
 name SERVIDORES-NOC
!
interface GigabitEthernet1/0/1
 switchport mode trunk
 description Uplink hacia Router R1
!
interface GigabitEthernet1/0/10
 switchport mode trunk
 description Enlace a SW-ADMINISTRACION
!
interface GigabitEthernet1/0/2
 switchport mode trunk
 description Enlace a SW-ACADEMICO
!
interface GigabitEthernet1/0/4
 switchport mode trunk
 description Enlace a SW-LAB-COMPUTO
!
interface FastEthernet0/24
 switchport mode access
 switchport access vlan 40
 description Conexión a SRV-ZABBIX`,
    },
    'srv-zabbix': {
      id: 'srv-zabbix',
      name: 'SRV-ZABBIX | HELPDESK',
      type: 'server',
      model: 'Ubuntu Server 22.04 LTS (VMware vSphere)',
      ip: '192.168.40.10',
      mask: '255.255.255.0',
      gateway: '192.168.40.1',
      vlan: '40',
      vlanName: 'VLAN 40 - Servidores',
      zone: 'datacenter',
      zoneName: 'DATA CENTER (VLAN 40)',
      ports: ['eth0 (192.168.40.10 / Fa0 SW-CORE)'],
      status: 'online',
      snmpStatus: 'Activo (v3)',
      mac: '0060.702B.7701',
      iosConfig: `# Configuración de red Ubuntu Server /etc/netplan/01-netcfg.yaml:
network:
  version: 2
  renderer: networkd
  ethernets:
    ens33:
      addresses: [192.168.40.10/24]
      gateway4: 192.168.40.1
      nameservers:
        addresses: [8.8.8.8, 1.1.1.1]

# Puertos Zabbix & Servicios:
# - Zabbix Server Trapper: 10051/TCP
# - Webhook EduDesk API: 8080/TCP
# - MySQL Database: 3306/TCP`,
    },
    'pc-tecnico': {
      id: 'pc-tecnico',
      name: 'PC-TÉCNICO TI',
      type: 'pc',
      model: 'Workstation TI - Ing. Granados',
      ip: '192.168.40.20',
      mask: '255.255.255.0',
      gateway: '192.168.40.1',
      vlan: '40',
      vlanName: 'VLAN 40 - Servidores y TI',
      zone: 'datacenter',
      zoneName: 'DATA CENTER (VLAN 40)',
      ports: ['FastEthernet0 (SW-CORE Fa0/12)'],
      status: 'online',
      snmpStatus: 'Activo (v3)',
      mac: '0002.16A4.3312',
      iosConfig: `IP: 192.168.40.20
Subnet Mask: 255.255.255.0
Default Gateway: 192.168.40.1
DNS Server: 192.168.40.10
Rol: Administración de Zabbix y Consola VMware ESXi`,
    },
    'sw-admin': {
      id: 'sw-admin',
      name: 'SW-ADMINISTRACION',
      type: 'switch',
      model: 'Cisco Catalyst 2960-24TT',
      ip: '192.168.10.2',
      mask: '255.255.255.0',
      gateway: '192.168.10.1',
      vlan: '10',
      vlanName: 'VLAN 10 - Administración',
      zone: 'admin',
      zoneName: 'ÁREA ADMINISTRATIVA (VLAN 10)',
      ports: ['Gig0/1 (Trunk hacia SW-CORE Gig1/0/10)', 'Fa0/1 (PC-ADMIN-01)'],
      status: 'online',
      snmpStatus: 'Activo (v3)',
      mac: '00E0.F7C1.1110',
      iosConfig: `hostname SW-ADMINISTRACION
vlan 10
 name ADMINISTRACION
interface GigabitEthernet0/1
 switchport mode trunk
interface FastEthernet0/1
 switchport mode access
 switchport access vlan 10
 spanning-tree portfast`,
    },
    'pc-admin-01': {
      id: 'pc-admin-01',
      name: 'PC-ADMIN-01',
      type: 'pc',
      model: 'PC Dirección / Secretaría',
      ip: '192.168.10.15',
      mask: '255.255.255.0',
      gateway: '192.168.10.1',
      vlan: '10',
      vlanName: 'VLAN 10 - Administración',
      zone: 'admin',
      zoneName: 'ÁREA ADMINISTRATIVA (VLAN 10)',
      ports: ['FastEthernet0 (SW-ADMIN Fa0/1)'],
      status: 'online',
      snmpStatus: 'Activo (v3)',
      mac: '0004.9A11.4422',
      iosConfig: `IP: 192.168.10.15
Subnet Mask: 255.255.255.0
Default Gateway: 192.168.10.1
DHCP Client: Habilitado (Pool VLAN-10)`,
    },
    'sw-academico': {
      id: 'sw-academico',
      name: 'SW-ACADEMICO',
      type: 'switch',
      model: 'Cisco Catalyst 2960-24TT',
      ip: '192.168.20.2',
      mask: '255.255.255.0',
      gateway: '192.168.20.1',
      vlan: '20',
      vlanName: 'VLAN 20 - Área Académica',
      zone: 'academico',
      zoneName: 'ÁREA ACADÉMICA (VLAN 20)',
      ports: ['Gig0/1 (Trunk a SW-CORE Gig1/0/2)', 'Fa0/1 (PC-DOCENTE)', 'Fa0/2 (AP-ACADÉMICOS)'],
      status: 'online',
      snmpStatus: 'Activo (v3)',
      mac: '0060.47AA.2220',
      iosConfig: `hostname SW-ACADEMICO
vlan 20
 name ACADEMICO-DOCENTES
interface GigabitEthernet0/1
 switchport mode trunk
interface FastEthernet0/1
 switchport mode access
 switchport access vlan 20
interface FastEthernet0/2
 switchport mode access
 switchport access vlan 20
 description Enlace a AccessPoint-PT`,
    },
    'pc-docente-01': {
      id: 'pc-docente-01',
      name: 'PC-DOCENTE-01',
      type: 'pc',
      model: 'PC Sala de Profesores / AIP',
      ip: '192.168.20.12',
      mask: '255.255.255.0',
      gateway: '192.168.20.1',
      vlan: '20',
      vlanName: 'VLAN 20 - Docentes',
      zone: 'academico',
      zoneName: 'ÁREA ACADÉMICA (VLAN 20)',
      ports: ['FastEthernet0 (SW-ACADEMICO Fa0/1)'],
      status: 'online',
      snmpStatus: 'Activo (v3)',
      mac: '00D0.5821.B210',
      iosConfig: `IP: 192.168.20.12
Subnet Mask: 255.255.255.0
Default Gateway: 192.168.20.1
Zabbix Agent: v6.4 (Supervisando CPU y Conectividad)`,
    },
    'lap-docente-01': {
      id: 'lap-docente-01',
      name: 'LAP-DOCENTE-01',
      type: 'laptop',
      model: 'Laptop Docente AIP (WiFi)',
      ip: '192.168.20.50',
      mask: '255.255.255.0',
      gateway: '192.168.20.1',
      vlan: '20',
      vlanName: 'VLAN 20 - Docentes Wireless',
      zone: 'academico',
      zoneName: 'ÁREA ACADÉMICA (VLAN 20)',
      ports: ['Wireless0 (AP-ACADÉMICOS SSID: AIP-WIFI)'],
      status: 'online',
      snmpStatus: 'Activo (v3)',
      mac: '0001.6499.7711',
      iosConfig: `IP: 192.168.20.50
SSID: AIP-DOCENTES-SECURE
WPA2-PSK: CibertecEdu2026`,
    },
    'sw-lab': {
      id: 'sw-lab',
      name: 'SW-LAB-COMPUTO',
      type: 'switch',
      model: 'Cisco Catalyst 2960-24TT',
      ip: '192.168.30.2',
      mask: '255.255.255.0',
      gateway: '192.168.30.1',
      vlan: '30',
      vlanName: 'VLAN 30 - Laboratorio Cómputo',
      zone: 'lab',
      zoneName: 'LABORATORIO CÓMPUTO (VLAN 30)',
      ports: ['Gig0/2 (Trunk a SW-CORE Gig1/0/4)', 'Fa0/1 (PC-ALUMNO-01)', 'Fa0/2 (PC-ALUMNO-02)'],
      status: isLabLinkDown ? 'offline' : 'online',
      snmpStatus: isLabLinkDown ? 'Inactivo' : 'Activo (v3)',
      mac: '00E0.14B9.3330',
      iosConfig: `hostname SW-LAB-COMPUTO
vlan 30
 name LAB-COMPUTO
interface GigabitEthernet0/2
 switchport mode trunk
 description Trunk a SW-CORE Gig1/0/4
interface range FastEthernet0/1-24
 switchport mode access
 switchport access vlan 30
 spanning-tree portfast`,
    },
    'pc-alumno-01': {
      id: 'pc-alumno-01',
      name: 'PC-ALUMNO-01',
      type: 'pc',
      model: 'Estación de Trabajo Lab 1',
      ip: '192.168.30.101',
      mask: '255.255.255.0',
      gateway: '192.168.30.1',
      vlan: '30',
      vlanName: 'VLAN 30 - Estudiantes',
      zone: 'lab',
      zoneName: 'LABORATORIO CÓMPUTO (VLAN 30)',
      ports: ['FastEthernet0 (SW-LAB Fa0/1)'],
      status: isLabLinkDown ? 'offline' : 'online',
      snmpStatus: isLabLinkDown ? 'Inactivo' : 'Activo (v3)',
      mac: '000C.2991.6F11',
      iosConfig: `IP: 192.168.30.101
Subnet Mask: 255.255.255.0
Default Gateway: 192.168.30.1
Zabbix Agent: v6.4 (Reporta métricas de disco y red)`,
    },
    'pc-alumno-02': {
      id: 'pc-alumno-02',
      name: 'PC-ALUMNO-02',
      type: 'pc',
      model: 'Estación de Trabajo Lab 2',
      ip: '192.168.30.102',
      mask: '255.255.255.0',
      gateway: '192.168.30.1',
      vlan: '30',
      vlanName: 'VLAN 30 - Estudiantes',
      zone: 'lab',
      zoneName: 'LABORATORIO CÓMPUTO (VLAN 30)',
      ports: ['FastEthernet0 (SW-LAB Fa0/2)'],
      status: isLabLinkDown ? 'offline' : 'online',
      snmpStatus: isLabLinkDown ? 'Inactivo' : 'Activo (v3)',
      mac: '000C.2991.6F12',
      iosConfig: `IP: 192.168.30.102
Subnet Mask: 255.255.255.0
Default Gateway: 192.168.30.1`,
    },
  };

  const selectedDevice = devices[selectedDeviceId] || devices['srv-zabbix'];

  // Toggle trunk link failure to simulate packet tracer fault injection
  const handleToggleLabFailure = () => {
    const nextState = !isLabLinkDown;
    setIsLabLinkDown(nextState);

    if (nextState && onTriggerNetworkIncident) {
      // Create automatic high priority incident from Packet Tracer topology
      const automaticTicket: Ticket = {
        id: `t-pkt-${Date.now()}`,
        code: `NET-PKT-30-${Math.floor(1000 + Math.random() * 9000)}`,
        title: 'Caída de Enlace Troncal GigabitEthernet0/2 hacia SW-LAB-COMPUTO (VLAN 30)',
        description:
          'ALERTA SNMP TRAP (Cisco Packet Tracer TOPOLOGIA.pkt): El enlace troncal Gig0/2 conectando SW-CORE con SW-LAB-COMPUTO se encuentra en estado DOWN. Se ha interrumpido el tráfico de red de 40 estaciones de trabajo de estudiantes en el Laboratorio de Cómputo (Subred 192.168.30.0/24). Se requiere verificación de puerto en switch o escalamiento a sandbox VMware.',
        status: 'open',
        priority: 'high',
        category: 'networking_connectivity',
        schoolName: 'I.E. Antenor Orrego Espinoza (Laboratorio Central)',
        sede: 'I.E. Antenor Orrego Espinoza',
        ugel: 'UGEL 03',
        reporterName: 'SNMP Trap Agent · Cisco Catalyst 2960',
        reporterRole: 'SNMP Trap Monitor Core',
        reporterEmail: 'snmp.engine@cibertec.edu.pe',
        classroomLab: 'Laboratorio de Cómputo 01 (VLAN 30)',
        slaTargetHours: 8,
        createdAt: 'Hace instantes',
        origen: 'AUTOMATICO',
        telemetriaZabbix: {
          lastGaspReceived: false,
          heartbeatConsecutiveFails: 4,
          correlationConfidence: 99,
          ipDispositivo: '192.168.30.2',
          puertoAfectado: 'GigabitEthernet0/2 (Trunk)',
          latenciaMs: 0,
          perdidaPaquetesPct: 100,
          anchoBandaUtilizadoMbps: 0,
          ultimoSondeoSnmp: 'Hace 3 seg',
          probableCausa: 'CORTE_ENLACE_TRUNK_SWITCH',
        },
        comments: [
          {
            id: 'c-1',
            author: 'Renzo Erick Fonseca Vilchez (Analista de Redes)',
            role: 'SNMP Monitor Core',
            text: 'Evento disparado desde topología Packet Tracer TOPOLOGIA.pkt: Transición IF-MIB::linkDown registrada en interfaz Gig1/0/4 de SW-CORE hacia SW-LAB-COMPUTO.',
            timestamp: 'Hace 1 minuto',
          },
        ],
      };

      onTriggerNetworkIncident(automaticTicket);
    }
  };

  const runPingSimulation = () => {
    setIsPinging(true);
    setPingLogs([
      `Iniciando sondeo ICMP desde ${devices[pingSource]?.name || pingSource} (${devices[pingSource]?.ip}) hacia ${devices[pingTarget]?.name || pingTarget} (${devices[pingTarget]?.ip})...`,
    ]);

    setTimeout(() => {
      const isSourceDown = (pingSource.includes('alumno') || pingSource === 'sw-lab') && isLabLinkDown;
      const isTargetDown = (pingTarget.includes('alumno') || pingTarget === 'sw-lab') && isLabLinkDown;

      if (isSourceDown || isTargetDown) {
        setPingLogs((prev) => [
          ...prev,
          `Enviando 4 paquetes ICMP Echo Request de 32 bytes:`,
          `Respuesta desde ${devices[pingSource]?.gateway || '192.168.30.1'}: Host de destino inaccesible (Destination Host Unreachable).`,
          `Tiempo de espera agotado para esta solicitud (Request timed out).`,
          `Tiempo de espera agotado para esta solicitud (Request timed out).`,
          `Estadísticas de Ping para ${devices[pingTarget]?.ip}:`,
          `    Paquetes: Enviados = 4, Recibidos = 0, Perdidos = 4 (100% de pérdida).`,
          `[FALLA]: El enlace de la VLAN 30 se encuentra caído en Packet Tracer. Ticket generado automáticamente.`,
        ]);
      } else {
        setPingLogs((prev) => [
          ...prev,
          `Enviando 4 paquetes ICMP Echo Request de 32 bytes (Trunk 802.1Q a través de R1 Inter-VLAN):`,
          `Respuesta desde ${devices[pingTarget]?.ip}: bytes=32 tiempo=1.2ms TTL=127`,
          `Respuesta desde ${devices[pingTarget]?.ip}: bytes=32 tiempo=0.9ms TTL=127`,
          `Respuesta desde ${devices[pingTarget]?.ip}: bytes=32 tiempo=1.1ms TTL=127`,
          `Respuesta desde ${devices[pingTarget]?.ip}: bytes=32 tiempo=0.8ms TTL=127`,
          `Estadísticas de Ping para ${devices[pingTarget]?.ip}:`,
          `    Paquetes: Enviados = 4, Recibidos = 4, Perdidos = 0 (0% de pérdida).`,
          `Tiempos aproximados de ida y vuelta en milisegundos:`,
          `    Mínimo = 0.8ms, Máximo = 1.2ms, Media = 1.0ms [ENLACE OK]`,
        ]);
      }
      setIsPinging(false);
    }, 900);
  };

  return (
    <div className="space-y-6">
      {/* Top Banner & Metadata */}
      <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 text-white shadow-xl relative overflow-hidden">
        <div className="absolute right-0 top-0 w-96 h-96 bg-indigo-600/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full bg-blue-950 text-blue-400 border border-blue-800 text-[10px] font-mono font-bold uppercase tracking-wider flex items-center gap-1.5">
                <FileCode className="w-3.5 h-3.5" />
                <span>Cisco Packet Tracer v8.2 · TOPOLOGIA.pkt</span>
              </span>
              <span className="text-xs text-slate-400 font-mono">
                C:\Users\renfonseca\Desktop\TOPOLOGIA.pkt
              </span>
            </div>
            <h2 className="text-xl md:text-2xl font-bold tracking-tight text-white flex items-center gap-2">
              <Network className="w-6 h-6 text-indigo-400" />
              <span>Mapa de Red Institucional & Topología de Simulación</span>
            </h2>
            <p className="text-xs text-slate-400 max-w-3xl leading-relaxed">
              Diseño de arquitectura de red física y lógica multi-VLAN con enrutamiento Inter-VLAN (Router-on-a-stick),
              monitoreo proactivo de puertos SNMPv3 y servidor central de mesa de ayuda Zabbix 7.0 desplegado en VMware.
            </p>
          </div>

          {/* Author Badge from Thesis PDF */}
          <div className="p-3 rounded-xl bg-slate-950/70 border border-slate-800/80 shrink-0 text-right space-y-0.5">
            <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
              Diseño & Configuración de Red:
            </p>
            <p className="text-xs font-bold text-indigo-300">
              Renzo Erick Fonseca Vilchez
            </p>
            <p className="text-[11px] text-slate-400 font-mono">
              Analista de Redes y Comunicaciones · CIBERTEC
            </p>
          </div>
        </div>
      </div>

      {/* Main Grid: Interactive Canvas & Node Inspector */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* Left Column (8 cols): Packet Tracer Visual Canvas */}
        <div className="lg:col-span-8 space-y-4">
          
          {/* Canvas Container */}
          <div className="p-4 md:p-6 rounded-2xl bg-slate-950 border border-slate-800 shadow-2xl relative overflow-hidden">
            
            {/* Canvas Header & Quick Controls */}
            <div className="flex flex-wrap items-center justify-between gap-3 pb-4 mb-4 border-b border-slate-800/80">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
                <span className="text-xs font-bold text-slate-200 uppercase tracking-wider">
                  Topología Lógica en Tiempo Real
                </span>
                <span className="text-[11px] font-mono text-slate-500">
                  (4 VLANs Configuradas · Troncal 802.1Q)
                </span>
              </div>

              {/* Stress Test Button */}
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleToggleLabFailure}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer shadow-sm ${
                    isLabLinkDown
                      ? 'bg-emerald-600 hover:bg-emerald-500 text-white'
                      : 'bg-rose-600/90 hover:bg-rose-500 text-white border border-rose-500/50'
                  }`}
                  title="Simula la desconexión física del cable trunk Gig0/2 que alimenta el laboratorio"
                >
                  {isLabLinkDown ? (
                    <>
                      <RotateCcw className="w-3.5 h-3.5" />
                      <span>Restaurar Enlace SW-LAB</span>
                    </>
                  ) : (
                    <>
                      <ZapOff className="w-3.5 h-3.5" />
                      <span>Simular Caída Enlace Lab (VLAN 30)</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* 4 VLAN Quadrants Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 relative">
              
              {/* Central Trunk Bridge Indicator */}
              <div className="hidden md:flex absolute inset-0 items-center justify-center pointer-events-none z-10">
                <div className="bg-slate-900/90 border border-indigo-500/40 rounded-full px-3 py-1 text-[10px] font-mono text-indigo-300 shadow-lg backdrop-blur-xs">
                  Trunk 802.1Q Core Backbone
                </div>
              </div>

              {/* Zone 1: ÁREA ADMINISTRATIVA (VLAN 10) - Yellow / Amber */}
              <div className="p-4 rounded-xl border border-amber-500/30 bg-amber-950/10 hover:bg-amber-950/20 transition-all space-y-3 relative">
                <div className="flex items-center justify-between border-b border-amber-500/20 pb-2">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-amber-400" />
                    <span className="text-xs font-bold text-amber-300">
                      ÁREA ADMINISTRATIVA (VLAN 10)
                    </span>
                  </div>
                  <span className="text-[10px] font-mono text-amber-400 bg-amber-950/60 px-2 py-0.5 rounded border border-amber-800/40">
                    192.168.10.0/24
                  </span>
                </div>

                {/* Devices inside VLAN 10 */}
                <div className="grid grid-cols-2 gap-2.5">
                  <button
                    type="button"
                    onClick={() => setSelectedDeviceId('sw-admin')}
                    className={`p-3 rounded-lg border text-left cursor-pointer transition-all ${
                      selectedDeviceId === 'sw-admin'
                        ? 'border-amber-400 bg-amber-900/40 ring-1 ring-amber-400'
                        : 'border-slate-800 bg-slate-900/80 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <Network className="w-4 h-4 text-amber-400" />
                      <span className="w-2 h-2 rounded-full bg-emerald-400" />
                    </div>
                    <p className="text-xs font-bold text-white truncate">SW-ADMIN</p>
                    <p className="text-[10px] text-slate-400 font-mono">2960-24TT</p>
                    <p className="text-[9px] text-amber-400 font-mono">Gig0/1 Trunk</p>
                  </button>

                  <button
                    type="button"
                    onClick={() => setSelectedDeviceId('pc-admin-01')}
                    className={`p-3 rounded-lg border text-left cursor-pointer transition-all ${
                      selectedDeviceId === 'pc-admin-01'
                        ? 'border-amber-400 bg-amber-900/40 ring-1 ring-amber-400'
                        : 'border-slate-800 bg-slate-900/80 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <Monitor className="w-4 h-4 text-amber-300" />
                      <span className="w-2 h-2 rounded-full bg-emerald-400" />
                    </div>
                    <p className="text-xs font-bold text-white truncate">PC-ADMIN-01</p>
                    <p className="text-[10px] text-slate-400 font-mono">192.168.10.15</p>
                    <p className="text-[9px] text-slate-500 font-mono">Port Fa0/1</p>
                  </button>
                </div>
              </div>

              {/* Zone 2: DATA CENTER (VLAN 40) - Blue / Cyan */}
              <div className="p-4 rounded-xl border border-sky-500/30 bg-sky-950/10 hover:bg-sky-950/20 transition-all space-y-3 relative">
                <div className="flex items-center justify-between border-b border-sky-500/20 pb-2">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-sky-400" />
                    <span className="text-xs font-bold text-sky-300">
                      DATA CENTER (VLAN 40)
                    </span>
                  </div>
                  <span className="text-[10px] font-mono text-sky-400 bg-sky-950/60 px-2 py-0.5 rounded border border-sky-800/40">
                    192.168.40.0/24
                  </span>
                </div>

                {/* Devices inside VLAN 40 */}
                <div className="grid grid-cols-2 gap-2.5">
                  <button
                    type="button"
                    onClick={() => setSelectedDeviceId('r1')}
                    className={`p-3 rounded-lg border text-left cursor-pointer transition-all ${
                      selectedDeviceId === 'r1'
                        ? 'border-sky-400 bg-sky-900/40 ring-1 ring-sky-400'
                        : 'border-slate-800 bg-slate-900/80 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <Shield className="w-4 h-4 text-sky-400" />
                      <span className="w-2 h-2 rounded-full bg-emerald-400" />
                    </div>
                    <p className="text-xs font-bold text-white truncate">R1 ROUTER</p>
                    <p className="text-[10px] text-slate-400 font-mono">Cisco 2911</p>
                    <p className="text-[9px] text-sky-400 font-mono">Gateway .1</p>
                  </button>

                  <button
                    type="button"
                    onClick={() => setSelectedDeviceId('sw-core')}
                    className={`p-3 rounded-lg border text-left cursor-pointer transition-all ${
                      selectedDeviceId === 'sw-core'
                        ? 'border-sky-400 bg-sky-900/40 ring-1 ring-sky-400'
                        : 'border-slate-800 bg-slate-900/80 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <Network className="w-4 h-4 text-indigo-400" />
                      <span className="w-2 h-2 rounded-full bg-emerald-400" />
                    </div>
                    <p className="text-xs font-bold text-white truncate">SW-CORE</p>
                    <p className="text-[10px] text-slate-400 font-mono">2960-24TT Core</p>
                    <p className="text-[9px] text-indigo-400 font-mono">Trunk Hub</p>
                  </button>

                  <button
                    type="button"
                    onClick={() => setSelectedDeviceId('srv-zabbix')}
                    className={`p-3 rounded-lg border text-left cursor-pointer transition-all col-span-2 ${
                      selectedDeviceId === 'srv-zabbix'
                        ? 'border-emerald-400 bg-emerald-950/40 ring-1 ring-emerald-400'
                        : 'border-emerald-900/40 bg-slate-900/90 hover:border-emerald-700'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-1.5">
                        <Server className="w-4 h-4 text-emerald-400" />
                        <span className="text-xs font-bold text-white">
                          SRV-ZABBIX | HELPDESK
                        </span>
                      </div>
                      <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-emerald-950 text-emerald-400 border border-emerald-800">
                        192.168.40.10:10051
                      </span>
                    </div>
                    <p className="text-[10px] text-slate-400">
                      Servidor Ubuntu 22.04 LTS · Agente Zabbix & Base MySQL
                    </p>
                  </button>
                </div>
              </div>

              {/* Zone 3: ÁREA ACADÉMICA (VLAN 20) - Green */}
              <div className="p-4 rounded-xl border border-emerald-500/30 bg-emerald-950/10 hover:bg-emerald-950/20 transition-all space-y-3 relative">
                <div className="flex items-center justify-between border-b border-emerald-500/20 pb-2">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
                    <span className="text-xs font-bold text-emerald-300">
                      ÁREA ACADÉMICA (VLAN 20)
                    </span>
                  </div>
                  <span className="text-[10px] font-mono text-emerald-400 bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-800/40">
                    192.168.20.0/24
                  </span>
                </div>

                {/* Devices inside VLAN 20 */}
                <div className="grid grid-cols-2 gap-2.5">
                  <button
                    type="button"
                    onClick={() => setSelectedDeviceId('sw-academico')}
                    className={`p-3 rounded-lg border text-left cursor-pointer transition-all ${
                      selectedDeviceId === 'sw-academico'
                        ? 'border-emerald-400 bg-emerald-900/40 ring-1 ring-emerald-400'
                        : 'border-slate-800 bg-slate-900/80 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <Network className="w-4 h-4 text-emerald-400" />
                      <span className="w-2 h-2 rounded-full bg-emerald-400" />
                    </div>
                    <p className="text-xs font-bold text-white truncate">SW-ACADEMICO</p>
                    <p className="text-[10px] text-slate-400 font-mono">2960-24TT</p>
                    <p className="text-[9px] text-emerald-400 font-mono">Gig0/1 Trunk</p>
                  </button>

                  <button
                    type="button"
                    onClick={() => setSelectedDeviceId('pc-docente-01')}
                    className={`p-3 rounded-lg border text-left cursor-pointer transition-all ${
                      selectedDeviceId === 'pc-docente-01'
                        ? 'border-emerald-400 bg-emerald-900/40 ring-1 ring-emerald-400'
                        : 'border-slate-800 bg-slate-900/80 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <Monitor className="w-4 h-4 text-emerald-300" />
                      <span className="w-2 h-2 rounded-full bg-emerald-400" />
                    </div>
                    <p className="text-xs font-bold text-white truncate">PC-DOCENTE-01</p>
                    <p className="text-[10px] text-slate-400 font-mono">192.168.20.12</p>
                    <p className="text-[9px] text-slate-500 font-mono">Fa0/1 Docentes</p>
                  </button>

                  <button
                    type="button"
                    onClick={() => setSelectedDeviceId('lap-docente-01')}
                    className={`p-3 rounded-lg border text-left cursor-pointer transition-all col-span-2 ${
                      selectedDeviceId === 'lap-docente-01'
                        ? 'border-emerald-400 bg-emerald-900/40 ring-1 ring-emerald-400'
                        : 'border-slate-800 bg-slate-900/80 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-1.5">
                        <Wifi className="w-4 h-4 text-emerald-400" />
                        <span className="text-xs font-bold text-white">
                          AP-ACADÉMICOS + LAP-DOCENTE-01
                        </span>
                      </div>
                      <span className="text-[9px] font-mono text-emerald-400">
                        192.168.20.50 (WiFi)
                      </span>
                    </div>
                    <p className="text-[10px] text-slate-400">
                      AccessPoint Cisco Air-AP + Laptop Docente AIP
                    </p>
                  </button>
                </div>
              </div>

              {/* Zone 4: LABORATORIO CÓMPUTO (VLAN 30) - Orange / Coral */}
              <div
                className={`p-4 rounded-xl border transition-all space-y-3 relative ${
                  isLabLinkDown
                    ? 'border-rose-500/60 bg-rose-950/20'
                    : 'border-orange-500/30 bg-orange-950/10 hover:bg-orange-950/20'
                }`}
              >
                <div
                  className={`flex items-center justify-between border-b pb-2 ${
                    isLabLinkDown ? 'border-rose-500/40' : 'border-orange-500/20'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span
                      className={`w-2.5 h-2.5 rounded-full ${
                        isLabLinkDown ? 'bg-rose-500 animate-ping' : 'bg-orange-400'
                      }`}
                    />
                    <span
                      className={`text-xs font-bold ${
                        isLabLinkDown ? 'text-rose-400' : 'text-orange-300'
                      }`}
                    >
                      LABORATORIO CÓMPUTO (VLAN 30)
                    </span>
                  </div>
                  <span
                    className={`text-[10px] font-mono px-2 py-0.5 rounded border ${
                      isLabLinkDown
                        ? 'text-rose-400 bg-rose-950 border-rose-800'
                        : 'text-orange-400 bg-orange-950/60 border-orange-800/40'
                    }`}
                  >
                    {isLabLinkDown ? 'ENLACE TRUNK DOWN' : '192.168.30.0/24'}
                  </span>
                </div>

                {/* Devices inside VLAN 30 */}
                <div className="grid grid-cols-2 gap-2.5">
                  <button
                    type="button"
                    onClick={() => setSelectedDeviceId('sw-lab')}
                    className={`p-3 rounded-lg border text-left cursor-pointer transition-all ${
                      selectedDeviceId === 'sw-lab'
                        ? 'border-orange-400 bg-orange-900/40 ring-1 ring-orange-400'
                        : 'border-slate-800 bg-slate-900/80 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <Network
                        className={`w-4 h-4 ${
                          isLabLinkDown ? 'text-rose-500 animate-pulse' : 'text-orange-400'
                        }`}
                      />
                      <span
                        className={`w-2 h-2 rounded-full ${
                          isLabLinkDown ? 'bg-rose-500' : 'bg-emerald-400'
                        }`}
                      />
                    </div>
                    <p className="text-xs font-bold text-white truncate">SW-LAB-COMPUTO</p>
                    <p className="text-[10px] text-slate-400 font-mono">2960-24TT</p>
                    <p
                      className={`text-[9px] font-mono ${
                        isLabLinkDown ? 'text-rose-400 font-bold' : 'text-orange-400'
                      }`}
                    >
                      {isLabLinkDown ? 'Gig0/2 DOWN' : 'Gig0/2 Trunk'}
                    </p>
                  </button>

                  <button
                    type="button"
                    onClick={() => setSelectedDeviceId('pc-alumno-01')}
                    className={`p-3 rounded-lg border text-left cursor-pointer transition-all ${
                      selectedDeviceId === 'pc-alumno-01'
                        ? 'border-orange-400 bg-orange-900/40 ring-1 ring-orange-400'
                        : 'border-slate-800 bg-slate-900/80 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <Monitor
                        className={`w-4 h-4 ${
                          isLabLinkDown ? 'text-rose-400' : 'text-orange-300'
                        }`}
                      />
                      <span
                        className={`w-2 h-2 rounded-full ${
                          isLabLinkDown ? 'bg-rose-500' : 'bg-emerald-400'
                        }`}
                      />
                    </div>
                    <p className="text-xs font-bold text-white truncate">PC-ALUMNO-01</p>
                    <p className="text-[10px] text-slate-400 font-mono">192.168.30.101</p>
                    <p className="text-[9px] text-slate-500 font-mono">Lab 1 · Fa0/1</p>
                  </button>

                  <button
                    type="button"
                    onClick={() => setSelectedDeviceId('pc-alumno-02')}
                    className={`p-3 rounded-lg border text-left cursor-pointer transition-all col-span-2 ${
                      selectedDeviceId === 'pc-alumno-02'
                        ? 'border-orange-400 bg-orange-900/40 ring-1 ring-orange-400'
                        : 'border-slate-800 bg-slate-900/80 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-1.5">
                        <Monitor
                          className={`w-4 h-4 ${
                            isLabLinkDown ? 'text-rose-400' : 'text-orange-300'
                          }`}
                        />
                        <span className="text-xs font-bold text-white">
                          PC-ALUMNO-02
                        </span>
                      </div>
                      <span className="text-[9px] font-mono text-slate-400">
                        192.168.30.102 (Fa0/2)
                      </span>
                    </div>
                    <p className="text-[10px] text-slate-400">
                      Estación Alumno · Clonada en Sandbox VMware ESXi
                    </p>
                  </button>
                </div>
              </div>

            </div>

            {/* Live Packet Flow Legend */}
            <div className="mt-4 pt-3 border-t border-slate-800 flex flex-wrap items-center justify-between gap-3 text-[11px] text-slate-400 font-mono">
              <div className="flex items-center gap-3">
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-emerald-400" />
                  <span>Enlace Up</span>
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-amber-400" />
                  <span>Spanning-Tree STP</span>
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-rose-500" />
                  <span>Link Down / Alerta</span>
                </span>
              </div>
              <div className="text-slate-500">
                Topología verificada: Cisco IOS Software C2960-LANBASEK9-M
              </div>
            </div>
          </div>

          {/* Interactive ICMP Ping Simulator */}
          <div className="p-4 rounded-xl bg-slate-900/90 border border-slate-800 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Terminal className="w-4 h-4 text-emerald-400" />
                <h3 className="text-xs font-bold text-white uppercase tracking-wider">
                  Simulador de Enrutamiento & Ping ICMP Inter-VLAN
                </h3>
              </div>
              <span className="text-[11px] text-slate-400 font-mono">
                Sondeo de paquetes entre VLANs
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
              <div>
                <label className="block text-[11px] text-slate-400 mb-1">
                  Nodo Origen:
                </label>
                <select
                  value={pingSource}
                  onChange={(e) => setPingSource(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-hidden"
                >
                  <option value="pc-alumno-01">PC-ALUMNO-01 (VLAN 30: 192.168.30.101)</option>
                  <option value="pc-docente-01">PC-DOCENTE-01 (VLAN 20: 192.168.20.12)</option>
                  <option value="pc-admin-01">PC-ADMIN-01 (VLAN 10: 192.168.10.15)</option>
                  <option value="pc-tecnico">PC-TÉCNICO TI (VLAN 40: 192.168.40.20)</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] text-slate-400 mb-1">
                  Nodo Destino:
                </label>
                <select
                  value={pingTarget}
                  onChange={(e) => setPingTarget(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-hidden"
                >
                  <option value="srv-zabbix">SRV-ZABBIX (VLAN 40: 192.168.40.10)</option>
                  <option value="r1">ROUTER R1 (Gateway: 192.168.40.1)</option>
                  <option value="pc-alumno-01">PC-ALUMNO-01 (VLAN 30: 192.168.30.101)</option>
                  <option value="pc-docente-01">PC-DOCENTE-01 (VLAN 20: 192.168.20.12)</option>
                </select>
              </div>

              <div className="flex items-end">
                <button
                  type="button"
                  onClick={runPingSimulation}
                  disabled={isPinging}
                  className="w-full py-1.5 px-3 rounded-lg bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-semibold text-xs transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Play className="w-3.5 h-3.5" />
                  <span>{isPinging ? 'Enviando Paquetes...' : 'Ejecutar Ping ICMP'}</span>
                </button>
              </div>
            </div>

            {/* Ping Output Console */}
            {pingLogs.length > 0 && (
              <div className="p-3 rounded-lg bg-slate-950 border border-slate-800 font-mono text-[11px] text-emerald-400 space-y-1">
                {pingLogs.map((log, idx) => (
                  <p key={idx} className={log.includes('[FALLA]') ? 'text-rose-400 font-bold' : ''}>
                    {log}
                  </p>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right Column (4 cols): Device Inspector & Cisco IOS Config */}
        <div className="lg:col-span-4 space-y-4">
          
          {/* Selected Device Card */}
          <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-indigo-600/20 border border-indigo-500/40 text-indigo-400 flex items-center justify-center">
                  <Activity className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white truncate max-w-[180px]">
                    {selectedDevice.name}
                  </h3>
                  <p className="text-[11px] text-slate-400 font-mono">
                    {selectedDevice.model}
                  </p>
                </div>
              </div>

              <span
                className={`text-[10px] font-mono px-2 py-0.5 rounded font-bold uppercase ${
                  selectedDevice.status === 'online'
                    ? 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                    : selectedDevice.status === 'warning'
                    ? 'bg-amber-950 text-amber-400 border border-amber-800'
                    : 'bg-rose-950 text-rose-400 border border-rose-800 animate-pulse'
                }`}
              >
                {selectedDevice.status === 'online'
                  ? 'ONLINE'
                  : selectedDevice.status === 'warning'
                  ? 'ALERTA'
                  : 'OFFLINE'}
              </span>
            </div>

            {/* Properties Table */}
            <div className="space-y-2 text-xs">
              <div className="flex items-center justify-between p-2 rounded-lg bg-slate-950/60 border border-slate-800/60">
                <span className="text-slate-400">Dirección IP:</span>
                <span className="font-mono text-white font-semibold">{selectedDevice.ip}</span>
              </div>

              <div className="flex items-center justify-between p-2 rounded-lg bg-slate-950/60 border border-slate-800/60">
                <span className="text-slate-400">VLAN Asignada:</span>
                <span className="font-mono text-indigo-300 font-semibold">{selectedDevice.vlanName}</span>
              </div>

              <div className="flex items-center justify-between p-2 rounded-lg bg-slate-950/60 border border-slate-800/60">
                <span className="text-slate-400">Default Gateway:</span>
                <span className="font-mono text-slate-300">{selectedDevice.gateway}</span>
              </div>

              <div className="flex items-center justify-between p-2 rounded-lg bg-slate-950/60 border border-slate-800/60">
                <span className="text-slate-400">Dirección MAC:</span>
                <span className="font-mono text-slate-300">{selectedDevice.mac}</span>
              </div>

              <div className="flex items-center justify-between p-2 rounded-lg bg-slate-950/60 border border-slate-800/60">
                <span className="text-slate-400">Agente SNMPv3:</span>
                <span className="font-mono text-emerald-400">{selectedDevice.snmpStatus}</span>
              </div>
            </div>

            {/* Cisco IOS Configuration Preview */}
            <div className="space-y-1.5 pt-1">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                  <Terminal className="w-3.5 h-3.5 text-indigo-400" />
                  <span>Configuración Cisco IOS / Host</span>
                </span>
                <span className="text-[10px] text-slate-500 font-mono">running-config</span>
              </div>

              <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 font-mono text-[11px] text-slate-300 max-h-48 overflow-y-auto leading-relaxed">
                <pre className="whitespace-pre-wrap">{selectedDevice.iosConfig}</pre>
              </div>
            </div>
          </div>

          {/* VLAN Segmentation Summary (RFC / Architecture Table) */}
          <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-2.5 text-xs">
            <h4 className="font-bold text-white flex items-center gap-1.5">
              <Layers className="w-4 h-4 text-indigo-400" />
              <span>Tabla de Segmentación de Red (VLANs)</span>
            </h4>

            <div className="space-y-1.5 text-[11px] font-mono">
              <div className="p-1.5 rounded bg-slate-950 flex items-center justify-between text-amber-300 border border-amber-900/30">
                <span>VLAN 10: Administración</span>
                <span>192.168.10.0/24</span>
              </div>
              <div className="p-1.5 rounded bg-slate-950 flex items-center justify-between text-emerald-300 border border-emerald-900/30">
                <span>VLAN 20: Académica (Docentes)</span>
                <span>192.168.20.0/24</span>
              </div>
              <div className="p-1.5 rounded bg-slate-950 flex items-center justify-between text-orange-300 border border-orange-900/30">
                <span>VLAN 30: Laboratorio Cómputo</span>
                <span>192.168.30.0/24</span>
              </div>
              <div className="p-1.5 rounded bg-slate-950 flex items-center justify-between text-sky-300 border border-sky-900/30">
                <span>VLAN 40: Data Center & Zabbix</span>
                <span>192.168.40.0/24</span>
              </div>
            </div>
          </div>

        </div>

      </div>
    </div>
  );
};
