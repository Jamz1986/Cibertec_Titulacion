export type Priority = 'low' | 'medium' | 'high' | 'urgent';

export type TicketStatus = 'open' | 'vmware_testing' | 'in_progress' | 'resolved' | 'closed';

export type TicketCategory =
  | 'vmware_virtualization'
  | 'networking_connectivity'
  | 'aip_hardware'
  | 'school_server'
  | 'educational_software';

export type UGELCode =
  | 'UGEL 01'
  | 'UGEL 02'
  | 'UGEL 03'
  | 'UGEL 04'
  | 'UGEL 05'
  | 'UGEL 06'
  | 'UGEL 07';

export type UserRole = 'DOCENTE' | 'ALUMNO' | 'TECNICO' | 'ADMIN';

export interface AppUser {
  id: string;
  nombre: string;
  email: string;
  rol: UserRole;
  rolLabel: string;
  institucionSede: string;
  ugel: UGELCode;
  departamento: string;
  cargo: string;
}

export interface PriorityConfig {
  key: Priority;
  label: string;
  englishLabel: string;
  slaHours: number;
  slaDescription: string;
  criteria: string;
  impactLevel: string;
  accentColor: string;
  bgLight: string;
  borderColor: string;
  textColor: string;
  badgeBg: string;
}

export interface VMwareEnvironment {
  hypervisor: 'VMware ESXi 8.0' | 'VMware ESXi 7.0' | 'VMware Workstation Pro 17' | 'VMware Workstation Pro 16' | 'VMware Fusion 13';
  hardwareVersion: 'vmx-21' | 'vmx-20' | 'vmx-19' | 'vmx-17';
  guestOS: 'Ubuntu Education LTS (AIP)' | 'Debian Server (MINEDU Proxy)' | 'Windows 10 Edu Pro' | 'Kali Linux (Ciberseguridad)';
  vcpu: number;
  ramGb: number;
  diskGb: number;
  diskProvisioning: 'Thin' | 'Thick Lazy Zeroed' | 'Thick Eager Zeroed';
  networkMode: 'Bridged (LAN Escolar)' | 'NAT' | 'Host-Only' | 'Custom vSwitch VLAN';
  vmwareToolsStatus: 'Running (v12.3)' | 'Outdated (v10.1)' | 'Not Installed' | 'Corrupted';
  hostSpecs: string;
  nestedVirtualization: boolean;
}

export interface TestStep {
  id: string;
  name: string;
  description: string;
  status: 'pending' | 'running' | 'pass' | 'warning' | 'fail';
  detail?: string;
  latencyMs?: number;
}

export interface VMwareTestResult {
  id: string;
  timestamp: string;
  overallStatus: 'PASS' | 'WARNING' | 'FAIL';
  compatibilityScore: number;
  steps: TestStep[];
  logs: string[];
  recommendation: string;
  vmxSnippet?: string;
}

export interface TicketComment {
  id: string;
  author: string;
  role: string;
  text: string;
  timestamp: string;
}

export type OutageCause =
  | 'CORTE_ELECTRICO_MASIVO' // Apagón Enel / Luz del Sur en cuadrante
  | 'CORTE_FIBRA_OPTICA_TRONCAL' // Rotura troncal de fibra óptica de ISP
  | 'FALLA_LOCAL_AISLADA' // Breaker o llave térmica interna del colegio
  | 'CORTE_ENLACE_TRUNK_SWITCH' // Caída de puerto troncal o switch de distribución
  | 'DESCONEXION_INDETERMINADA';

export interface ZabbixTelemetry {
  lastGaspReceived: boolean;
  lastGaspTrapCode?: string;
  upsResidualBatteryPct?: number;
  heartbeatConsecutiveFails: number;
  correlationConfidence: number; // 0 - 100%
  colegiosAfectadosEnSector?: string[];
  zonaSuministro?: string;
  probableCausa: OutageCause;
  ipDispositivo?: string;
  puertoAfectado?: string;
  latenciaMs?: number;
  perdidaPaquetesPct?: number;
  anchoBandaUtilizadoMbps?: number;
  ultimoSondeoSnmp?: string;
}

export interface Ticket {
  id: string;
  code: string;
  titulo?: string; // Según Entidad JPA Ticket.java del informe CIBERTEC
  title: string;
  descripcion?: string;
  description: string;
  origen: 'AUTOMATICO' | 'MANUAL'; // Según Pág. 33 del informe CIBERTEC
  priority: Priority;
  status: TicketStatus;
  category: TicketCategory;
  ugel: UGELCode;
  sede: string; // Según Entidad JPA Ticket.java del informe CIBERTEC
  schoolName: string;
  reporterUserId?: string;
  reporterName: string;
  reporterRole: string;
  reporterEmail: string;
  classroomLab: string;
  createdAt: string;
  slaTargetHours: number;
  assignedTechnician?: string;
  vmwareEnv?: VMwareEnvironment;
  vmwareTestResults?: VMwareTestResult[];
  resolutionNotes?: string;
  comments: TicketComment[];
  // Campos de Siniestro Zonal / Detección Automática de Apagón
  sinistroZonal?: boolean;
  outageCause?: OutageCause;
  telemetriaZabbix?: ZabbixTelemetry;
}
