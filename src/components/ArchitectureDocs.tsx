import React, { useState } from 'react';
import {
  Database,
  Server,
  Users,
  Code2,
  Terminal,
  CheckCircle2,
  Layers,
  Cpu,
  FileCode,
  BookOpen,
  Copy,
  Check,
  ShieldCheck,
  ArrowRight,
  Building,
  Radio,
  Zap,
  ZapOff,
  Activity,
  WifiOff,
  ListOrdered,
  Network,
  Workflow,
  MonitorPlay,
} from 'lucide-react';

export const ArchitectureDocs: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'agents' | 'usecases' | 'mysql' | 'vmware_real' | 'siniestros_noc' | 'hoja_ruta_vmware'>('hoja_ruta_vmware');
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedCode(id);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  const mysqlScript = `-- ========================================================
-- PROYECTO DE TITULACIÓN: HELP DESK EDUCATIVO LIMA METROPOLITANA
-- Script DDL de Base de Datos Relacional: MySQL 8.0+
-- ========================================================

CREATE DATABASE IF NOT EXISTS helpdesk_minedu_db 
CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

USE helpdesk_minedu_db;

-- 1. Tabla de Instituciones Educativas (UGEL 01 a 07)
CREATE TABLE IF NOT EXISTS instituciones_educativas (
    id_ie INT AUTO_INCREMENT PRIMARY KEY,
    codigo_modular VARCHAR(10) NOT NULL UNIQUE,
    nombre_ie VARCHAR(150) NOT NULL,
    ugel ENUM('UGEL 01', 'UGEL 02', 'UGEL 03', 'UGEL 04', 'UGEL 05', 'UGEL 06', 'UGEL 07') NOT NULL,
    distrito VARCHAR(80) NOT NULL,
    total_aulas_aip INT DEFAULT 2,
    tipo_gestion ENUM('Pública', 'Convenio', 'Privada') DEFAULT 'Pública',
    ip_subred_aip VARCHAR(45) DEFAULT '192.168.1.0/24',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- 2. Tabla de Usuarios y Roles Institucionales
CREATE TABLE IF NOT EXISTS usuarios (
    id_usuario INT AUTO_INCREMENT PRIMARY KEY,
    dni CHAR(8) NOT NULL UNIQUE,
    nombres VARCHAR(100) NOT NULL,
    apellidos VARCHAR(100) NOT NULL,
    email VARCHAR(120) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    rol ENUM('DOCENTE_DAIP', 'COORDINADOR_CIST', 'ESPECIALISTA_TI_UGEL', 'ADMIN_DRELM') NOT NULL,
    id_ie INT NULL,
    telefono VARCHAR(20),
    estado BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (id_ie) REFERENCES instituciones_educativas(id_ie) ON DELETE SET NULL
) ENGINE=InnoDB;

-- 3. Tabla de Incidentes / Tickets de Soporte
CREATE TABLE IF NOT EXISTS tickets (
    id_ticket INT AUTO_INCREMENT PRIMARY KEY,
    codigo_ticket VARCHAR(20) NOT NULL UNIQUE,
    titulo VARCHAR(200) NOT NULL,
    descripcion TEXT NOT NULL,
    categoria ENUM(
        'vmware_virtualization',
        'networking_connectivity',
        'aip_hardware',
        'school_server',
        'educational_software'
    ) NOT NULL,
    prioridad ENUM('low', 'medium', 'high', 'urgent') NOT NULL,
    sla_horas INT NOT NULL,
    estado ENUM('open', 'vmware_testing', 'in_progress', 'resolved', 'closed') DEFAULT 'open',
    id_ie INT NOT NULL,
    id_reportante INT NOT NULL,
    id_tecnico_asignado INT NULL,
    ambiente_afectado VARCHAR(100) NOT NULL, -- ej: Lab AIP 2
    fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    fecha_limite_sla DATETIME NOT NULL,
    fecha_resolucion DATETIME NULL,
    notas_resolucion TEXT NULL,
    FOREIGN KEY (id_ie) REFERENCES instituciones_educativas(id_ie),
    FOREIGN KEY (id_reportante) REFERENCES usuarios(id_usuario),
    FOREIGN KEY (id_tecnico_asignado) REFERENCES usuarios(id_usuario)
) ENGINE=InnoDB;

-- 4. Tabla de Perfiles de Entornos Virtuales VMware
CREATE TABLE IF NOT EXISTS vmware_entornos (
    id_entorno INT AUTO_INCREMENT PRIMARY KEY,
    id_ticket INT NOT NULL,
    hipervisor ENUM('VMware ESXi 8.0', 'VMware ESXi 7.0', 'VMware Workstation Pro 17', 'VMware Workstation Pro 16') NOT NULL,
    hardware_version VARCHAR(10) NOT NULL DEFAULT 'vmx-20',
    guest_os VARCHAR(80) NOT NULL,
    vcpu INT NOT NULL DEFAULT 2,
    ram_gb INT NOT NULL DEFAULT 4,
    disk_gb INT NOT NULL DEFAULT 40,
    disk_provisioning ENUM('Thin', 'Thick Lazy', 'Thick Eager') DEFAULT 'Thin',
    network_mode VARCHAR(50) DEFAULT 'Bridged (LAN Escolar)',
    tools_status VARCHAR(50) DEFAULT 'Running (v12.3)',
    host_hardware_info VARCHAR(255),
    nested_virtualization BOOLEAN DEFAULT FALSE,
    FOREIGN KEY (id_ticket) REFERENCES tickets(id_ticket) ON DELETE CASCADE
) ENGINE=InnoDB;

-- 5. Tabla de Registro de Ejecución de Pruebas VMware (Logs & Resultados)
CREATE TABLE IF NOT EXISTS vmware_logs_pruebas (
    id_prueba INT AUTO_INCREMENT PRIMARY KEY,
    id_ticket INT NOT NULL,
    resultado_global ENUM('PASS', 'WARNING', 'FAIL') NOT NULL,
    compatibilidad_score INT NOT NULL,
    traza_vmware_log MEDIUMTEXT NOT NULL,
    recomendacion_ia TEXT NOT NULL,
    ejecutado_por VARCHAR(100) DEFAULT 'Agente Automatizado VMware',
    fecha_ejecucion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (id_ticket) REFERENCES tickets(id_ticket) ON DELETE CASCADE
) ENGINE=InnoDB;

-- 6. Tabla de Historial y Comentarios
CREATE TABLE IF NOT EXISTS ticket_comentarios (
    id_comentario INT AUTO_INCREMENT PRIMARY KEY,
    id_ticket INT NOT NULL,
    id_autor INT NOT NULL,
    mensaje TEXT NOT NULL,
    es_nota_interna BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (id_ticket) REFERENCES tickets(id_ticket) ON DELETE CASCADE,
    FOREIGN KEY (id_autor) REFERENCES usuarios(id_usuario)
) ENGINE=InnoDB;`;

  const nodeMysqlCode = `// server/db.js - Conexión Node.js / Express a MySQL
import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
dotenv.config();

// Pool de conexiones de alto rendimiento
export const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || 'password123',
  database: process.env.DB_NAME || 'helpdesk_minedu_db',
  port: Number(process.env.DB_PORT) || 3306,
  waitForConnections: true,
  connectionLimit: 15,
  queueLimit: 0,
});

// Prueba de conexión
pool.getConnection()
  .then(conn => {
    console.log('✅ Conexión exitosa a la base de datos MySQL (helpdesk_minedu_db)');
    conn.release();
  })
  .catch(err => console.error('❌ Error al conectar a MySQL:', err.message));`;

  const vmwareRealScripts = `# ==============================================================
# SCRIPT 1: Automatización Real con VMware Workstation (vmrun CLI)
# Ubicación en Windows: "C:\\Program Files (x86)\\VMware\\VMware Workstation\\vmrun.exe"
# Ubicación en Linux: /usr/bin/vmrun
# ==============================================================

# 1. Comprobar máquinas virtuales en ejecución en el laboratorio
vmrun list

# 2. Iniciar VM de prueba de Aula de Innovación en modo silencioso (nogui)
vmrun -T ws start "C:\\AIP_VMs\\Ubuntu_AIP_Student\\Ubuntu_AIP.vmx" nogui

# 3. Comprobar si VMware Tools está activo dentro de la VM
vmrun -T ws checkToolsState "C:\\AIP_VMs\\Ubuntu_AIP_Student\\Ubuntu_AIP.vmx"

# 4. Obtener la dirección IP real asignada en la red escolar
vmrun -T ws getGuestIPAddress "C:\\AIP_VMs\\Ubuntu_AIP_Student\\Ubuntu_AIP.vmx"

# 5. Ejecutar diagnóstico de conectividad interna sin entrar a la interfaz
vmrun -T ws -gu docente -gp aip2026 runProgramInGuest \\
  "C:\\AIP_VMs\\Ubuntu_AIP_Student\\Ubuntu_AIP.vmx" \\
  /bin/ping -c 3 192.168.1.1

# ==============================================================
# SCRIPT 2: Automatización Real con VMware PowerCLI (VMware ESXi / vSphere)
# Ejecutar en PowerShell con módulo VMware.PowerCLI instalado
# ==============================================================

# Conectar al hipervisor ESXi central del colegio
Connect-VIServer -Server "192.168.1.200" -User "root" -Password "SecretPass2026!"

# Función de diagnóstico automatizado invocada por el Help Desk
function Test-SchoolVMCompatibility {
    param([string]$VMName)
    
    $vm = Get-VM -Name $VMName
    $view = $vm | Get-View
    
    # Verificación 1: CPU y Virtualización por Hardware
    $hwSupport = $view.Capability.NestedHVSupported
    
    # Verificación 2: Estado de VMware Tools
    $toolsStatus = $vm.ExtensionData.Guest.ToolsRunningStatus
    
    # Verificación 3: Versión de Hardware Virtual
    $hwVersion = $vm.Version
    
    # Verificación 4: Asignación de Recursos vs Host
    $allocatedRamGB = $vm.MemoryGB
    $vCPU = $vm.NumCpu
    
    [PSCustomObject]@{
        VMName              = $VMName
        PowerState          = $vm.PowerState
        HardwareVersion     = $hwVersion
        ToolsStatus         = $toolsStatus
        NestedHVSupported   = $hwSupport
        MemoryGB            = $allocatedRamGB
        NumCpu              = $vCPU
        OverallStatus       = if ($toolsStatus -eq "guestToolsRunning") { "PASS" } else { "FAIL" }
    }
}

# Invocar test para el servidor Moodle local
Test-SchoolVMCompatibility -VMName "MINEDU-Moodle-Proxy"`;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="p-6 rounded-2xl bg-white border border-slate-200">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-indigo-600" />
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Memoria Técnica & Documentación de Sustentación
              </span>
            </div>
            <h1 className="text-xl font-bold text-slate-900">
              Arquitectura del Help Desk, Modelo MySQL y Conexión Real VMware
            </h1>
            <p className="text-xs text-slate-500 max-w-3xl">
              Guía detallada de funcionamiento, interacción de los agentes institucionales de Lima Metropolitana, catálogo formal de casos de uso, scripts DDL para MySQL y automatización real con hipervisores VMware.
            </p>
          </div>
        </div>

        {/* Tab navigation */}
        <div className="flex flex-wrap gap-2 mt-6 pt-4 border-t border-slate-100 text-xs font-semibold">
          <button
            onClick={() => setActiveTab('agents')}
            className={`px-3.5 py-2 rounded-lg cursor-pointer transition-colors flex items-center gap-2 ${
              activeTab === 'agents'
                ? 'bg-indigo-600 text-white'
                : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>1. Agentes y Roles del Sistema</span>
          </button>
          <button
            onClick={() => setActiveTab('usecases')}
            className={`px-3.5 py-2 rounded-lg cursor-pointer transition-colors flex items-center gap-2 ${
              activeTab === 'usecases'
                ? 'bg-indigo-600 text-white'
                : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>2. Catálogo de Casos de Uso</span>
          </button>
          <button
            onClick={() => setActiveTab('mysql')}
            className={`px-3.5 py-2 rounded-lg cursor-pointer transition-colors flex items-center gap-2 ${
              activeTab === 'mysql'
                ? 'bg-indigo-600 text-white'
                : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
            }`}
          >
            <Database className="w-3.5 h-3.5" />
            <span>3. Conexión y Modelo MySQL</span>
          </button>
          <button
            onClick={() => setActiveTab('vmware_real')}
            className={`px-3.5 py-2 rounded-lg cursor-pointer transition-colors flex items-center gap-2 ${
              activeTab === 'vmware_real'
                ? 'bg-indigo-600 text-white'
                : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
            }`}
          >
            <Server className="w-3.5 h-3.5" />
            <span>4. Uso Real en VMware (vmrun & PowerCLI)</span>
          </button>
          <button
            onClick={() => setActiveTab('siniestros_noc')}
            className={`px-3.5 py-2 rounded-lg cursor-pointer transition-colors flex items-center gap-2 ${
              activeTab === 'siniestros_noc'
                ? 'bg-red-600 text-white'
                : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
            }`}
          >
            <Radio className="w-3.5 h-3.5 text-red-400" />
            <span>5. Siniestros, Apagones & Zabbix NOC</span>
          </button>
          <button
            onClick={() => setActiveTab('hoja_ruta_vmware')}
            className={`px-3.5 py-2 rounded-lg cursor-pointer transition-colors flex items-center gap-2 ${
              activeTab === 'hoja_ruta_vmware'
                ? 'bg-emerald-700 text-white shadow-xs'
                : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200'
            }`}
          >
            <ListOrdered className="w-3.5 h-3.5 text-emerald-600" />
            <span className="font-semibold">6. Hoja de Ruta VMware (11 Pasos)</span>
          </button>
        </div>
      </div>

      {/* Tab 1: Agents & Roles */}
      {activeTab === 'agents' && (
        <div className="space-y-6">
          <div className="p-6 rounded-2xl bg-white border border-slate-200 space-y-4">
            <div>
              <h2 className="text-base font-bold text-slate-900">
                Ecosistema de Agentes y Roles Institucionales
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                La plataforma opera mediante la coordinación entre 4 actores humanos de la jerarquía educativa de Lima y 2 agentes de software automatizados:
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 text-xs">
              {/* Agent 1 */}
              <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 space-y-2">
                <div className="flex items-center gap-2 text-indigo-700 font-bold">
                  <Users className="w-4 h-4" />
                  <span>Docente DAIP (Nivel 1 - Usuario)</span>
                </div>
                <p className="text-slate-600 leading-relaxed">
                  Docente de Aula de Innovación Pedagógica. Trabaja en el colegio impartiendo sesiones curriculares. Detecta fallas en las máquinas de cómputo, emite tickets iniciales y describe síntomas en el software educativo o la VM.
                </p>
                <div className="text-[11px] text-slate-400 font-mono">
                  Privilegios: Crear tickets, ver estado de su I.E., calificar atención.
                </div>
              </div>

              {/* Agent 2 */}
              <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 space-y-2">
                <div className="flex items-center gap-2 text-indigo-700 font-bold">
                  <ShieldCheck className="w-4 h-4" />
                  <span>Coordinador CIST (Nivel 1 - Soporte Local)</span>
                </div>
                <p className="text-slate-600 leading-relaxed">
                  Coordinador de Innovación y Soporte Tecnológico asignado a la institución educativa. Aplica soluciones de primera línea, revisa el cableado, reinicia hipervisores locales y valida pruebas preliminares en las aulas.
                </p>
                <div className="text-[11px] text-slate-400 font-mono">
                  Privilegios: Gestionar tickets locales, ejecutar tests VMware, cerrar incidencias menores.
                </div>
              </div>

              {/* Agent 3 */}
              <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 space-y-2">
                <div className="flex items-center gap-2 text-indigo-700 font-bold">
                  <Cpu className="w-4 h-4" />
                  <span>Especialista TI UGEL (Nivel 2 - Avanzado)</span>
                </div>
                <p className="text-slate-600 leading-relaxed">
                  Ingeniero o técnico del Área de Gestión de la Educación Básica Regular (AGEBRE/AGP) de la UGEL (01 al 07). Atiende incidentes clasificados como <strong>Alta</strong> y <strong>Urgente</strong>, reconfigura imágenes OVA maestras y audita SLAs.
                </p>
                <div className="text-[11px] text-slate-400 font-mono">
                  Privilegios: Reclasificar prioridades, reasignar tickets, modificar plantillas .vmx.
                </div>
              </div>

              {/* Agent 4 */}
              <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 space-y-2">
                <div className="flex items-center gap-2 text-indigo-700 font-bold">
                  <Building className="w-4 h-4" />
                  <span>Administrador DRELM / MINEDU (Nivel 3)</span>
                </div>
                <p className="text-slate-600 leading-relaxed">
                  Dirección Regional de Educación de Lima Metropolitana. Supervisa la infraestructura metropolitana, el cumplimiento de metas del proyecto de titulación y los servidores centrales ESXi que soportan las plataformas censales.
                </p>
                <div className="text-[11px] text-slate-400 font-mono">
                  Privilegios: Acceso global, reportería de KPIs de titulación, gestión de usuarios.
                </div>
              </div>

              {/* Software Agent 5 */}
              <div className="p-4 rounded-xl border border-indigo-200 bg-indigo-50/30 space-y-2">
                <div className="flex items-center gap-2 text-indigo-900 font-bold">
                  <Code2 className="w-4 h-4 text-indigo-600" />
                  <span>Agente Software: Triaje Automatizado</span>
                </div>
                <p className="text-slate-600 leading-relaxed">
                  Motor algorítmico integrado que procesa el lenguaje natural de la incidencia (título y descripción). Evalúa si se trata de un corte general, aula paralizada o falla menor y sugiere o aplica el nivel de prioridad y tiempo SLA.
                </p>
                <div className="text-[11px] text-slate-500 font-mono">
                  Función: Análisis semántico de keywords, cálculo de SLA (&lt;2h, &lt;8h, &lt;24h, &lt;48h).
                </div>
              </div>

              {/* Software Agent 6 */}
              <div className="p-4 rounded-xl border border-indigo-200 bg-indigo-50/30 space-y-2">
                <div className="flex items-center gap-2 text-indigo-900 font-bold">
                  <Server className="w-4 h-4 text-indigo-600" />
                  <span>Agente Software: Validador VMware</span>
                </div>
                <p className="text-slate-600 leading-relaxed">
                  Módulo de prueba de entornos virtuales. Inspecciona sintaxis .vmx, compatibilidad de microcódigo de CPU VT-x/AMD-V, sobrecompromiso de memoria vRAM y agentes VMware Tools para emitir diagnósticos antes del despliegue en clase.
                </p>
                <div className="text-[11px] text-slate-500 font-mono">
                  Función: Ejecución de batería de 7 pruebas, scoring 0-100%, generación de informes.
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab 2: Use Cases */}
      {activeTab === 'usecases' && (
        <div className="space-y-4">
          <div className="p-6 rounded-2xl bg-white border border-slate-200 space-y-4">
            <div>
              <h2 className="text-base font-bold text-slate-900">
                Catálogo de Casos de Uso del Proyecto de Titulación
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Especificación formal bajo el estándar RUP / IEEE para la memoria descriptiva de ingeniería:
              </p>
            </div>

            <div className="space-y-3 text-xs">
              <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-900 text-sm">
                    CU-01: Registro de Incidencia con Clasificación de Prioridad Multinivel
                  </span>
                  <span className="font-mono text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded">
                    Actor: Docente DAIP / Coordinador CIST
                  </span>
                </div>
                <p className="text-slate-600">
                  <strong>Objetivo:</strong> Permitir al usuario registrar una falla en el aula de cómputo seleccionando su colegio (UGEL 01-07) y clasificándola en 4 niveles (Low, Medium, High, Urgent) con cálculo dinámico de tiempo de resolución SLA.
                </p>
                <div className="bg-white p-2.5 rounded border border-slate-200 text-slate-700">
                  <strong>Flujo Principal:</strong> 1. El usuario accede al formulario. 2. Selecciona UGEL y colegio. 3. Detalla el síntoma. 4. Selecciona la prioridad requerida guiado por la matriz de SLA. 5. El sistema emite código único (ej. TK-2026-0382) y programa la cuenta regresiva de atención.
                </div>
              </div>

              <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-900 text-sm">
                    CU-02: Triaje Inteligente y Sugerencia de Prioridad
                  </span>
                  <span className="font-mono text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded">
                    Actor: Agente Software de Triaje
                  </span>
                </div>
                <p className="text-slate-600">
                  <strong>Objetivo:</strong> Analizar la descripción del problema en tiempo de digitación para prevenir sub-clasificaciones erróneas por parte de docentes sin formación técnica.
                </p>
                <div className="bg-white p-2.5 rounded border border-slate-200 text-slate-700">
                  <strong>Flujo Principal:</strong> 1. Detección de patrones como "pantalla negra", "servidor ESXi", "evaluación censal". 2. Si la severidad inferida difiere de la marcada, se activa el banner de recomendación. 3. Con 1 clic el usuario adopta la prioridad sugerida.
                </div>
              </div>

              <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-900 text-sm">
                    CU-03: Prueba Automatizada de Compatibilidad VMware (Pre-Flight Test)
                  </span>
                  <span className="font-mono text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded">
                    Actor: Especialista TI / Validador VMware
                  </span>
                </div>
                <p className="text-slate-600">
                  <strong>Objetivo:</strong> Evaluar si una plantilla virtual OVA de Ubuntu o Windows arrancará sin incidencias en las computadoras del aula antes de impartir la clase pedagógica.
                </p>
                <div className="bg-white p-2.5 rounded border border-slate-200 text-slate-700">
                  <strong>Flujo Principal:</strong> 1. El especialista abre el banco de pruebas o un ticket asociado. 2. Define parámetros del host escolar. 3. Ejecuta la batería de 7 pruebas. 4. Obtiene el resultado (PASS/WARNING/FAIL), la traza vmware.log y la descarga del informe técnico.
                </div>
              </div>

              <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-900 text-sm">
                    CU-04: Reclasificación y Despacho Técnico de Mesa de Ayuda
                  </span>
                  <span className="font-mono text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded">
                    Actor: Especialista TI UGEL
                  </span>
                </div>
                <p className="text-slate-600">
                  <strong>Objetivo:</strong> Reevaluar la prioridad técnica tras comprobar el impacto físico en la institución y asignar el especialista con el perfil técnico apropiado.
                </p>
              </div>

              <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-900 text-sm">
                    CU-05: Auditoría y Reportería de Métricas de Titulación (MTTR y SLA)
                  </span>
                  <span className="font-mono text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded">
                    Actor: Administrador DRELM / Investigador
                  </span>
                </div>
                <p className="text-slate-600">
                  <strong>Objetivo:</strong> Exportar y contrastar los indicadores del tiempo medio de resolución antes y después de implementar el módulo VMware para validar las hipótesis de la tesis.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab 3: MySQL */}
      {activeTab === 'mysql' && (
        <div className="space-y-6">
          <div className="p-6 rounded-2xl bg-white border border-slate-200 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <Database className="w-5 h-5 text-indigo-600" />
                  <span>Conexión y Script DDL de Base de Datos MySQL 8.0+</span>
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Esquema normalizado en 3ra Forma Normal (3FN) con soporte para llaves foráneas, restricciones de integridad referencial y tipos ENUM para prioridades.
                </p>
              </div>
              <button
                onClick={() => copyToClipboard(mysqlScript, 'mysql-script')}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-lg transition-colors cursor-pointer"
              >
                {copiedCode === 'mysql-script' ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-600" />
                    <span>¡Copiado!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>Copiar Script SQL</span>
                  </>
                )}
              </button>
            </div>

            <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 text-emerald-400 font-mono text-[11px] leading-relaxed max-h-[350px] overflow-y-auto">
              <pre>{mysqlScript}</pre>
            </div>

            {/* Node.js / Express Connection Code */}
            <div className="pt-4 border-t border-slate-200 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-slate-900">
                    Módulo de Conexión en Backend Node.js / Express (Pool de Conexiones)
                  </h3>
                  <p className="text-xs text-slate-500">
                    Instalar con: <code className="font-mono bg-slate-100 px-1 py-0.5 rounded">npm install mysql2 dotenv</code>
                  </p>
                </div>
                <button
                  onClick={() => copyToClipboard(nodeMysqlCode, 'node-code')}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition-colors cursor-pointer"
                >
                  {copiedCode === 'node-code' ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-600" />
                      <span>¡Copiado!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span>Copiar Conector Node</span>
                    </>
                  )}
                </button>
              </div>

              <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 text-indigo-300 font-mono text-[11px] leading-relaxed">
                <pre>{nodeMysqlCode}</pre>
              </div>

              <div className="p-3.5 rounded-lg bg-amber-50 border border-amber-200 text-amber-900 text-xs">
                <strong>Configuración del archivo .env:</strong>
                <pre className="font-mono text-[11px] mt-1 text-slate-800">
                  DB_HOST=127.0.0.1&#10;DB_USER=root&#10;DB_PASSWORD=miPasswordSeguro2026&#10;DB_NAME=helpdesk_minedu_db&#10;DB_PORT=3306
                </pre>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab 4: Real VMware Integration */}
      {activeTab === 'vmware_real' && (
        <div className="space-y-6">
          <div className="p-6 rounded-2xl bg-white border border-slate-200 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <Server className="w-5 h-5 text-indigo-600" />
                  <span>Cómo usarlo Realmente con Entornos Virtuales VMware</span>
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Implementación física real en laboratorios de cómputo escolares de Lima con VMware Workstation Pro (en aulas) y VMware ESXi / vSphere (en centros de datos escolares).
                </p>
              </div>
              <button
                onClick={() => copyToClipboard(vmwareRealScripts, 'vmware-scripts')}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-lg transition-colors cursor-pointer"
              >
                {copiedCode === 'vmware-scripts' ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-600" />
                    <span>¡Copiado!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>Copiar Scripts VMware</span>
                  </>
                )}
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
              <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 space-y-2">
                <span className="font-bold text-slate-900 text-sm block">
                  Arquitectura 1: Aulas AIP (VMware Workstation)
                </span>
                <p className="text-slate-600 leading-relaxed">
                  En cada PC de cómputo del colegio se instala <strong>VMware Workstation Pro 17</strong> con la imagen base escolar (ej. Ubuntu Edición MINEDU con Scratch, Python y Geogebra).
                </p>
                <div className="bg-white p-3 rounded border border-slate-200 space-y-1">
                  <p><strong>Mecanismo real:</strong> El backend del Help Desk ejecuta en segundo plano comandos mediante la utilidad oficial <code className="font-mono text-indigo-600">vmrun.exe</code>.</p>
                  <p><strong>Beneficio:</strong> Puede comprobar si la máquina virtual responde, forzar reinicio silencioso y diagnosticar si la red está en conflicto antes de que el docente entre a clase.</p>
                </div>
              </div>

              <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 space-y-2">
                <span className="font-bold text-slate-900 text-sm block">
                  Arquitectura 2: Servidores de la I.E. (VMware ESXi 8.0)
                </span>
                <p className="text-slate-600 leading-relaxed">
                  En el servidor central de la institución (ej. HPE MicroServer o servidor torre del colegio) corre <strong>VMware ESXi Bare Metal</strong> alojando el proxy de contenidos, Moodle y la base de datos de evaluaciones.
                </p>
                <div className="bg-white p-3 rounded border border-slate-200 space-y-1">
                  <p><strong>Mecanismo real:</strong> El módulo de testeo se conecta a la API REST de vSphere o ejecuta scripts de <strong>PowerCLI</strong> vía PowerShell.</p>
                  <p><strong>Beneficio:</strong> Monitorea en vivo el estado del hipervisor, uso de vCPU y vRAM y si ocurre un Kernel Panic emite una alerta con prioridad <strong>Urgente (SLA &lt; 2h)</strong>.</p>
                </div>
              </div>
            </div>

            {/* Windows Desktop Connection Architecture Callout */}
            <div className="p-4 rounded-xl border border-indigo-200 bg-indigo-50/40 space-y-2 text-xs">
              <span className="font-bold text-indigo-950 text-sm block">
                Detalle Clave para Titulación: ¿Cómo se comunica el aplicativo Web con VMware instalado en el Escritorio Windows?
              </span>
              <p className="text-slate-700 leading-relaxed">
                Por seguridad del navegador (sandbox), una aplicación web no puede ejecutar directamente archivos <code className="font-mono bg-white px-1 py-0.5 rounded border border-indigo-200">.exe</code> locales. Para integrar VMware Workstation instalado en Windows con la mesa de ayuda, la industria y la arquitectura de este proyecto emplean tres mecanismos oficiales:
              </p>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5 pt-1">
                <div className="p-2.5 rounded-lg bg-white border border-indigo-100 space-y-1">
                  <strong className="text-indigo-900 block font-bold">1. VMware REST API (vmrest.exe)</strong>
                  <p className="text-slate-600 text-[11px]">
                    VMware incluye <code className="font-mono text-indigo-600">vmrest.exe -p 8697</code>. Corre en segundo plano en Windows y la web consume su API REST en <code className="font-mono text-[10px]">localhost:8697/api/vms</code> para encender o auditar máquinas.
                  </p>
                </div>
                <div className="p-2.5 rounded-lg bg-white border border-indigo-100 space-y-1">
                  <strong className="text-emerald-900 block font-bold">2. Scripts .BAT / PowerShell</strong>
                  <p className="text-slate-600 text-[11px]">
                    El técnico descarga con 1 clic desde el ticket un script <code className="font-mono text-emerald-700">.bat</code> que ejecuta <code className="font-mono text-[10px]">vmrun.exe checkToolsState</code> y genera un reporte JSON en el escritorio.
                  </p>
                </div>
                <div className="p-2.5 rounded-lg bg-white border border-indigo-100 space-y-1">
                  <strong className="text-blue-900 block font-bold">3. Protocolo Nativo (vmrc://)</strong>
                  <p className="text-slate-600 text-[11px]">
                    Al hacer clic en el enlace web en el Help Desk, Windows reconoce el esquema <code className="font-mono text-blue-600">vmrc://</code> y abre inmediatamente la ventana nativa de VMware en la pantalla del usuario.
                  </p>
                </div>
              </div>
            </div>

            {/* Code Box */}
            <div className="space-y-2">
              <span className="text-xs font-bold text-slate-900 block">
                Scripts Operativos de Integración VMware (Listos para ejecutar en laboratorio):
              </span>
              <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 text-sky-300 font-mono text-[11px] leading-relaxed max-h-[380px] overflow-y-auto">
                <pre>{vmwareRealScripts}</pre>
              </div>
            </div>

            {/* Step-by-step practical deployment guide */}
            <div className="p-4 rounded-xl border border-indigo-200 bg-indigo-50/30 space-y-2 text-xs">
              <span className="font-bold text-indigo-950 text-sm block">
                Pasos para el Despliegue en la Sustentación de Titulación:
              </span>
              <ol className="list-decimal pl-5 space-y-1.5 text-slate-700">
                <li>
                  <strong>Crear la Base de Datos en MySQL:</strong> Abrir MySQL Workbench o consola, ejecutar el script SQL de la pestaña 3.
                </li>
                <li>
                  <strong>Crear la VM de Prueba en VMware Workstation:</strong> Desplegar una máquina virtual con Ubuntu 22.04 LTS o Windows 10 Edu.
                </li>
                <li>
                  <strong>Configurar la red en modo Puente (Bridged):</strong> Asegurar que la VM tome IP dentro de la misma subred del aula para permitir el acceso web al Help Desk.
                </li>
                <li>
                  <strong>Conectar el Endpoint de Testeo:</strong> Cuando el docente reporte un incidente en un puesto, el botón "Iniciar Test de Compatibilidad" invoca las validaciones automatizadas y vincula el archivo de registro <code className="font-mono">vmware.log</code> al ticket.
                </li>
              </ol>
            </div>
          </div>
        </div>
      )}

      {/* Tab 5: Siniestros Zonales, Apagones Masivos y Detección Zabbix NOC */}
      {activeTab === 'siniestros_noc' && (
        <div className="space-y-6">
          <div className="p-6 rounded-2xl bg-white border border-slate-200 space-y-6">
            <div>
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-red-100 text-red-800 mb-2">
                <Radio className="w-3.5 h-3.5 text-red-600 animate-pulse" />
                <span>Protocolo Zabbix NOC · Detección de Desconexión Silenciosa</span>
              </div>
              <h2 className="text-lg font-bold text-slate-900">
                ¿Cómo se reporta automáticamente un siniestro si el colegio perdió la energía o la red?
              </h2>
              <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                Fundamentación teórica para el Jurado de Titulación: En telecomunicaciones y redes escolares, cuando ocurre un apagón general (Enel / Luz del Sur) o un corte de fibra óptica en la zona, <strong>el colegio no puede reportarse a sí mismo</strong> porque sus servidores y computadoras se apagaron o no tienen salida a internet. El sistema resuelve esto de forma 100% automatizada a través de tres mecanismos complementarios:
              </p>
            </div>

            {/* 3 Pillars Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
              <div className="p-4 rounded-xl border border-amber-200 bg-amber-50/50 space-y-2">
                <div className="flex items-center gap-2 font-bold text-amber-900">
                  <Zap className="w-4 h-4 text-amber-600" />
                  <span>1. Trampa SNMP "Last Gasp"</span>
                </div>
                <p className="text-slate-600 leading-relaxed text-[11px]">
                  <strong>Estándar RFC 1628 (UPS-MIB) / IEEE 802.3ah:</strong> Las Smart-UPS de los racks AIP (APC, TrippLite, Eaton) y routers de borde poseen condensadores y baterías que detectan el corte de 220V (<code className="font-mono text-amber-800">inputVoltage=0V</code>). En milisegundos disparan un paquete UDP 162 hacia el NOC (<code className="font-mono text-amber-800">upsTrapOnBattery</code>) justo antes de apagarse.
                </p>
              </div>

              <div className="p-4 rounded-xl border border-sky-200 bg-sky-50/50 space-y-2">
                <div className="flex items-center gap-2 font-bold text-sky-900">
                  <Activity className="w-4 h-4 text-sky-600" />
                  <span>2. Dead Man's Switch (Heartbeat)</span>
                </div>
                <p className="text-slate-600 leading-relaxed text-[11px]">
                  <strong>Monitoreo Pasivo Centralizado:</strong> El servidor Zabbix no espera que el colegio llame. Zabbix ejecuta un ciclo de sondeo ICMP Ping cada 15 segundos. Si el router escolar no responde en 3 intentos (<code className="font-mono text-sky-800">nodata(45s)=1</code>), Zabbix marca la sede como <em>HOST UNREACHABLE</em> y activa la alerta roja.
                </p>
              </div>

              <div className="p-4 rounded-xl border border-indigo-200 bg-indigo-50/50 space-y-2">
                <div className="flex items-center gap-2 font-bold text-indigo-900">
                  <Layers className="w-4 h-4 text-indigo-600" />
                  <span>3. Motor de Correlación Zonal UGEL</span>
                </div>
                <p className="text-slate-600 leading-relaxed text-[11px]">
                  <strong>Diferenciación Inteligente de Averías:</strong> ¿Cómo saber si se bajó una llave interna o si es un apagón de todo el distrito? Si caen <strong>2 o más colegios de la misma UGEL / cuadrante eléctrico en &lt; 180s</strong>, el algoritmo diagnostica automáticamente <em>Siniestro Zonal Masivo</em> con 98% de certeza.
                </p>
              </div>
            </div>

            {/* Workflow Diagram */}
            <div className="p-5 rounded-xl border border-slate-200 bg-slate-50/60 space-y-3">
              <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                Flujo de Datos desde la Caída hasta la Creación del Ticket en MySQL
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-3 text-xs">
                <div className="p-3 rounded-lg bg-white border border-slate-200">
                  <span className="text-[10px] font-bold text-slate-400 block mb-1">Paso 1: Siniestro Físico</span>
                  <p className="font-semibold text-slate-800">Subestación Eléctrica 0 VAC o Fibra Rota</p>
                  <p className="text-[11px] text-slate-500 mt-1">Se interrumpe la alimentación en el sector de la UGEL.</p>
                </div>

                <div className="p-3 rounded-lg bg-white border border-slate-200">
                  <span className="text-[10px] font-bold text-amber-600 block mb-1">Paso 2: Detección Inmediata</span>
                  <p className="font-semibold text-slate-800">Last Gasp UDP + Timeout ICMP Zabbix</p>
                  <p className="text-[11px] text-slate-500 mt-1">El NOC detecta la falta de respuesta en menos de 45 segundos.</p>
                </div>

                <div className="p-3 rounded-lg bg-white border border-slate-200">
                  <span className="text-[10px] font-bold text-indigo-600 block mb-1">Paso 3: Correlación Espacial</span>
                  <p className="font-semibold text-slate-800">Agrupamiento Geográfico UGEL</p>
                  <p className="text-[11px] text-slate-500 mt-1">Compara con colegios adyacentes para descartar avería puntual.</p>
                </div>

                <div className="p-3 rounded-lg bg-white border border-slate-200">
                  <span className="text-[10px] font-bold text-emerald-600 block mb-1">Paso 4: Inyección en Help Desk</span>
                  <p className="font-semibold text-slate-800">Ticket Urgente (SLA &lt; 2h) JPA MySQL</p>
                  <p className="text-[11px] text-slate-500 mt-1">Webhook REST API genera el ticket y notifica a cuadrillas.</p>
                </div>
              </div>
            </div>

            {/* Python Zabbix Webhook Script */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                  <Terminal className="w-4 h-4 text-emerald-600" />
                  <span>Script de Webhook Zabbix en Python para Inyección Automática de Tickets:</span>
                </span>
                <button
                  onClick={() =>
                    copyToClipboard(
                      `# /usr/lib/zabbix/alertscripts/zabbix_zonal_dispatcher.py
import sys, json, requests

host_name = sys.argv[1]
ugel_code = sys.argv[2]
alarm_text = sys.argv[3]

payload = {
    "origen": "AUTOMATICO",
    "titulo": f"Alerta Crítica Zabbix: Siniestro Zonal en {ugel_code} ({host_name})",
    "descripcion": f"Pérdida de telemetría y trampa Last Gasp confirmada en {host_name}. {alarm_text}",
    "prioridad": "urgent",
    "slaTargetHours": 2,
    "ugel": ugel_code,
    "categoria": "networking_connectivity",
    "sinistroZonal": True,
    "telemetriaZabbix": {
        "heartbeatConsecutiveFails": 3,
        "lastGaspReceived": True,
        "correlationConfidence": 98.5,
        "probableCausa": "CORTE_ELECTRICO_MASIVO"
    }
}

headers = {"Content-Type": "application/json", "Authorization": "Bearer MINEDU-NOC-TOKEN-2026"}
resp = requests.post("https://helpdesk.cibertec.edu.pe/api/v1/tickets/webhook", json=payload, headers=headers)
print(f"Ticket automático creado HTTP {resp.status_code}")`,
                      'zabbix-webhook-py'
                    )
                  }
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded text-xs font-medium bg-slate-100 hover:bg-slate-200 text-slate-700 cursor-pointer"
                >
                  {copiedCode === 'zabbix-webhook-py' ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-600" />
                      <span>Copiado</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span>Copiar Script</span>
                    </>
                  )}
                </button>
              </div>

              <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 text-emerald-300 font-mono text-[11px] leading-relaxed max-h-[300px] overflow-y-auto">
                <pre>{`# /usr/lib/zabbix/alertscripts/zabbix_zonal_dispatcher.py
# Invocado automáticamente por Zabbix Server al disparar la acción de siniestro
import sys, json, requests

host_name = sys.argv[1]   # ej: "I.E. Antenor Orrego"
ugel_code = sys.argv[2]   # ej: "UGEL 05"
alarm_text = sys.argv[3]  # ej: "Power Loss 0 VAC - Last Gasp Trap Received"

payload = {
    "origen": "AUTOMATICO",
    "titulo": f"🚨 SINIESTRO ZONAL: Apagón / Corte de Red en {ugel_code} ({host_name})",
    "descripcion": f"Detección Zabbix NOC: Pérdida total de telemetría y trampa agónica Last Gasp. {alarm_text}",
    "prioridad": "urgent",
    "slaTargetHours": 2,
    "ugel": ugel_code,
    "categoria": "networking_connectivity",
    "sinistroZonal": True,
    "telemetriaZabbix": {
        "heartbeatConsecutiveFails": 3,
        "lastGaspReceived": True,
        "correlationConfidence": 98.5,
        "probableCausa": "CORTE_ELECTRICO_MASIVO"
    }
}

headers = {"Content-Type": "application/json", "Authorization": "Bearer MINEDU-NOC-TOKEN-2026"}
resp = requests.post("https://helpdesk.cibertec.edu.pe/api/v1/tickets/webhook", json=payload, headers=headers)
print(f"Ticket generado exitosamente: HTTP {resp.status_code}")`}</pre>
              </div>
            </div>

            {/* Q&A for Thesis Defense */}
            <div className="p-4 rounded-xl border border-slate-200 bg-slate-50 space-y-3 text-xs">
              <span className="font-bold text-slate-900 block text-sm">
                Preguntas Típicas del Jurado de Tesis y Respuestas Clave:
              </span>
              <div className="space-y-2 text-slate-700">
                <p>
                  <strong className="text-slate-900">1. ¿Por qué no usamos un agente local que mande un correo cuando se corta la luz?</strong>
                  <br />
                  <em>Respuesta:</em> Porque si no hay energía eléctrica en el colegio, el servidor local y el módem del colegio se apagan de inmediato; no tienen corriente ni salida a internet para enviar ningún correo. Por ello, la arquitectura debe ser <strong>centralizada y basada en "Dead Man's Switch" (pérdida de sondeo)</strong> desde el servidor Zabbix en el NOC de Lima.
                </p>
                <p>
                  <strong className="text-slate-900">2. ¿Cómo se evita que una falsa alarma colapse a las cuadrillas de la UGEL?</strong>
                  <br />
                  <em>Respuesta:</em> Mediante la <strong>regla de correlación espacio-temporal</strong>: Si solo cae 1 escuela, se clasifica como falla interna local (Prioridad Alta, SLA 8h). Solo si caen 2 o más escuelas del mismo sector en un intervalo menor a 180 segundos se declara <strong>Siniestro Zonal Crítico</strong> (Prioridad Urgente, SLA 2h).
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab 6: Hoja de Ruta de Implementación en VMware (11 Pasos Oficiales) */}
      {activeTab === 'hoja_ruta_vmware' && (
        <div className="space-y-6">
          <div className="p-6 rounded-2xl bg-white border border-slate-200 space-y-6">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-200">
              <div>
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 mb-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Hoja de Ruta Oficial · Banco de Pruebas Virtualizado</span>
                </div>
                <h2 className="text-xl font-bold text-slate-900">
                  Hoja de Ruta de Implementación en VMware Workstation / ESXi
                </h2>
                <p className="text-xs text-slate-500 mt-0.5 max-w-2xl">
                  Guía técnica integral estructurada en 3 fases y 11 pasos operativos con comandos exactos, configuraciones de red Netplan, scripts de base de datos MySQL, Zabbix Server y el webhook hacia EduDesk.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <span className="px-3 py-1 rounded-lg bg-indigo-50 border border-indigo-200 text-indigo-700 font-mono text-xs font-bold">
                  IP Servidor: 192.168.40.10
                </span>
                <span className="px-3 py-1 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-700 font-mono text-xs font-bold">
                  IP Cliente: 192.168.40.20
                </span>
              </div>
            </div>

            {/* 3 Phases Visual Summary */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="p-3.5 rounded-xl border border-blue-200 bg-blue-50/40">
                <div className="text-[11px] font-bold text-blue-900 uppercase tracking-wide">Fase 1</div>
                <div className="font-bold text-slate-900 text-sm mt-0.5">Infraestructura Virtual</div>
                <div className="text-xs text-slate-600 mt-1">Pasos 1 al 5 · VMs en VMware, Ubuntu Server, IP 192.168.40.10, Cliente PC-ALUMNO-01 y Ping.</div>
              </div>

              <div className="p-3.5 rounded-xl border border-amber-200 bg-amber-50/40">
                <div className="text-[11px] font-bold text-amber-900 uppercase tracking-wide">Fase 2</div>
                <div className="font-bold text-slate-900 text-sm mt-0.5">Plataforma de Monitoreo</div>
                <div className="text-xs text-slate-600 mt-1">Pasos 6 al 8 · MySQL 8.0, Zabbix Server 7.0 LTS / 6.4 y Zabbix Agent en PC-ALUMNO-01.</div>
              </div>

              <div className="p-3.5 rounded-xl border border-emerald-200 bg-emerald-50/40">
                <div className="text-[11px] font-bold text-emerald-900 uppercase tracking-wide">Fase 3</div>
                <div className="font-bold text-slate-900 text-sm mt-0.5">Help Desk e Integración</div>
                <div className="text-xs text-slate-600 mt-1">Pasos 9 al 11 · Spring Boot / EduDesk, Webhook Zabbix y Prueba de concepto con ticket automático.</div>
              </div>
            </div>

            {/* ================= FASE 1 ================= */}
            <div className="space-y-4 pt-2">
              <div className="flex items-center gap-2.5 pb-2 border-b border-blue-200 text-blue-900">
                <Server className="w-5 h-5 text-blue-600" />
                <h3 className="text-base font-bold">
                  Fase 1: Preparación de la Infraestructura Virtual (Servidores y Redes)
                </h3>
              </div>

              <div className="space-y-3">
                {/* Paso 1 */}
                <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-900 text-sm flex items-center gap-2">
                      <span className="w-6 h-6 rounded-full bg-blue-600 text-white flex items-center justify-center text-xs font-bold">1</span>
                      Paso 1: Creación de la Máquina Virtual del Servidor Unificado (Hardware Virtual)
                    </span>
                    <span className="text-[11px] font-mono text-slate-500">VMware Workstation Pro / Player</span>
                  </div>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    En tu computadora Windows de escritorio, abre VMware Workstation y crea la máquina virtual del servidor con los siguientes parámetros técnicos:
                  </p>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs font-mono bg-white p-3 rounded-lg border border-slate-200">
                    <div><span className="text-slate-400 block text-[10px]">NOMBRE VM</span>SRV-UNIFICADO-MINEDU</div>
                    <div><span className="text-slate-400 block text-[10px]">CPU / CORES</span>2 vCPUs (VT-x activo)</div>
                    <div><span className="text-slate-400 block text-[10px]">MEMORIA RAM</span>4096 MB (4 GB)</div>
                    <div><span className="text-slate-400 block text-[10px]">DISCO DURO</span>50 GB NVMe / SCSI</div>
                  </div>
                  <div className="p-2.5 bg-blue-50/60 rounded border border-blue-200 text-[11px] text-blue-900">
                    <strong>Configuración de Red en VMware:</strong> En <em>Virtual Network Editor</em> (o Edit Virtual Machine Settings &gt; Network Adapter), selecciona <strong>Custom (VMnet2)</strong> o <strong>Host-Only</strong> configurado con el segmento de red <code className="font-bold">192.168.40.0/24</code> para garantizar un entorno aislado idéntico al del aula escolar.
                  </div>
                </div>

                {/* Paso 2 */}
                <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-900 text-sm flex items-center gap-2">
                      <span className="w-6 h-6 rounded-full bg-blue-600 text-white flex items-center justify-center text-xs font-bold">2</span>
                      Paso 2: Instalación del sistema operativo Ubuntu Server
                    </span>
                    <span className="text-[11px] font-mono text-slate-500">Ubuntu 22.04 LTS Server</span>
                  </div>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    Monta la imagen ISO oficial <code className="font-mono bg-white px-1 py-0.5 rounded border border-slate-200">ubuntu-22.04.4-live-server-amd64.iso</code> en el lector virtual CD/DVD y procede con la instalación:
                  </p>
                  <ul className="list-disc pl-5 text-xs text-slate-600 space-y-1">
                    <li>Idioma: Español o English.</li>
                    <li>Particionado de almacenamiento: Usar disco completo guiado con <strong>LVM (Logical Volume Manager)</strong> para facilitar ampliaciones.</li>
                    <li>Perfil de usuario: Servidor: <code className="font-mono text-indigo-700">srv-edudesk-noc</code> | Usuario: <code className="font-mono text-indigo-700">soporte</code> | Contraseña: tu clave de administración.</li>
                    <li>Paquetes de software: Activar únicamente <strong>Install OpenSSH Server</strong> para administración remota vía SSH o PowerShell.</li>
                  </ul>
                </div>

                {/* Paso 3 */}
                <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-900 text-sm flex items-center gap-2">
                      <span className="w-6 h-6 rounded-full bg-blue-600 text-white flex items-center justify-center text-xs font-bold">3</span>
                      Paso 3: Configuración de la red y asignación de la IP estática (192.168.40.10)
                    </span>
                    <button
                      onClick={() =>
                        copyToClipboard(
                          `# /etc/netplan/00-installer-config.yaml
network:
  version: 2
  renderer: networkd
  ethernets:
    ens33:
      dhcp4: no
      addresses:
        - 192.168.40.10/24
      routes:
        - to: default
          via: 192.168.40.1
      nameservers:
        addresses:
          - 8.8.8.8
          - 1.1.1.1`,
                          'netplan-script'
                        )
                      }
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded text-xs font-medium bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 cursor-pointer"
                    >
                      {copiedCode === 'netplan-script' ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-emerald-600" />
                          <span>Copiado</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5" />
                          <span>Copiar Netplan</span>
                        </>
                      )}
                    </button>
                  </div>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    Edita el archivo de configuración de Netplan con <code className="font-mono bg-white px-1 py-0.5 rounded border border-slate-200">sudo nano /etc/netplan/00-installer-config.yaml</code>:
                  </p>
                  <div className="p-3 bg-slate-950 rounded-lg text-emerald-400 font-mono text-[11px] leading-relaxed overflow-x-auto">
                    <pre>{`network:
  version: 2
  renderer: networkd
  ethernets:
    ens33:               # (Usa el nombre de interfaz con 'ip link show')
      dhcp4: no
      addresses:
        - 192.168.40.10/24
      routes:
        - to: default
          via: 192.168.40.1
      nameservers:
        addresses:
          - 8.8.8.8
          - 1.1.1.1`}</pre>
                  </div>
                  <div className="p-2.5 bg-slate-900 text-sky-300 font-mono text-[11px] rounded">
                    # Aplicar la configuración y validar:<br />
                    sudo netplan apply<br />
                    ip a show ens33
                  </div>
                </div>

                {/* Paso 4 */}
                <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-900 text-sm flex items-center gap-2">
                      <span className="w-6 h-6 rounded-full bg-blue-600 text-white flex items-center justify-center text-xs font-bold">4</span>
                      Paso 4: Creación de la Máquina Virtual Cliente simulando la PC-ALUMNO-01
                    </span>
                    <span className="text-[11px] font-mono text-slate-500">Windows 10 / Ubuntu Desktop</span>
                  </div>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    Crea una segunda máquina virtual en VMware Workstation para simular el equipo de un estudiante en el Aula de Innovación Pedagógica (AIP):
                  </p>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs font-mono bg-white p-3 rounded-lg border border-slate-200">
                    <div><span className="text-slate-400 block text-[10px]">NOMBRE HOST</span>PC-ALUMNO-01</div>
                    <div><span className="text-slate-400 block text-[10px]">ADAPTADOR RED</span>VMnet2 (Misma red)</div>
                    <div><span className="text-slate-400 block text-[10px]">IP ASIGNADA</span>192.168.40.20</div>
                    <div><span className="text-slate-400 block text-[10px]">MÁSCARA</span>255.255.255.0 (/24)</div>
                  </div>
                </div>

                {/* Paso 5 */}
                <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-900 text-sm flex items-center gap-2">
                      <span className="w-6 h-6 rounded-full bg-blue-600 text-white flex items-center justify-center text-xs font-bold">5</span>
                      Paso 5: Configuración de conectividad (Ping) entre el Servidor y la PC Cliente
                    </span>
                    <span className="text-[11px] font-mono text-slate-500">ICMP Echo Validation</span>
                  </div>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    Comprueba que ambas máquinas virtuales se alcancen a través de la red virtual de VMware. En Windows cliente, habilita el protocolo ICMP si el cortafuegos bloquea el eco:
                  </p>
                  <div className="p-3 bg-slate-950 rounded-lg text-emerald-400 font-mono text-[11px] leading-relaxed space-y-1">
                    <div className="text-slate-400"># Desde el Servidor Ubuntu (192.168.40.10) hacia la PC Cliente:</div>
                    <div className="text-white">ping -c 4 192.168.40.20</div>
                    <div className="text-slate-400 mt-2"># Desde la PC Cliente (CMD Windows) hacia el Servidor:</div>
                    <div className="text-white">ping 192.168.40.10</div>
                    <div className="text-slate-400 mt-2"># Si Windows bloquea el Ping, ejecutar en PowerShell como Administrador en PC-ALUMNO-01:</div>
                    <div className="text-amber-300">netsh advfirewall firewall add rule name="ICMP Allow VMWare" protocol=icmpv4:8,any dir=in action=allow</div>
                  </div>
                </div>
              </div>
            </div>

            {/* ================= FASE 2 ================= */}
            <div className="space-y-4 pt-4">
              <div className="flex items-center gap-2.5 pb-2 border-b border-amber-200 text-amber-900">
                <Activity className="w-5 h-5 text-amber-600" />
                <h3 className="text-base font-bold">
                  Fase 2: Despliegue de la Plataforma de Monitoreo
                </h3>
              </div>

              <div className="space-y-3">
                {/* Paso 6 */}
                <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-900 text-sm flex items-center gap-2">
                      <span className="w-6 h-6 rounded-full bg-amber-600 text-white flex items-center justify-center text-xs font-bold">6</span>
                      Paso 6: Instalación del motor de Base de Datos (MySQL) y Servidor Web
                    </span>
                    <button
                      onClick={() =>
                        copyToClipboard(
                          `# Instalación MySQL y Nginx
sudo apt update
sudo apt install -y mysql-server nginx

# Configuración de base de datos MySQL
sudo mysql -e "CREATE DATABASE zabbix CHARACTER SET utf8mb4 COLLATE utf8mb4_bin;"
sudo mysql -e "CREATE DATABASE helpdesk_minedu_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"
sudo mysql -e "CREATE USER 'zabbix'@'localhost' IDENTIFIED BY 'ZabbixPass2026!';"
sudo mysql -e "GRANT ALL PRIVILEGES ON zabbix.* TO 'zabbix'@'localhost';"
sudo mysql -e "CREATE USER 'edudesk'@'localhost' IDENTIFIED BY 'EduDeskPass2026!';"
sudo mysql -e "GRANT ALL PRIVILEGES ON helpdesk_minedu_db.* TO 'edudesk'@'localhost';"
sudo mysql -e "SET GLOBAL log_bin_trust_function_creators = 1;"
sudo mysql -e "FLUSH PRIVILEGES;"`,
                          'paso6-mysql'
                        )
                      }
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded text-xs font-medium bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 cursor-pointer"
                    >
                      {copiedCode === 'paso6-mysql' ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-emerald-600" />
                          <span>Copiado</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5" />
                          <span>Copiar Comandos</span>
                        </>
                      )}
                    </button>
                  </div>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    Ejecuta en la terminal de Ubuntu Server (192.168.40.10) para aprovisionar MySQL 8.0 y crear las bases de datos para Zabbix y EduDesk:
                  </p>
                  <div className="p-3 bg-slate-950 rounded-lg text-emerald-400 font-mono text-[11px] leading-relaxed overflow-x-auto">
                    <pre>{`sudo apt update && sudo apt install -y mysql-server nginx

sudo mysql
CREATE DATABASE zabbix CHARACTER SET utf8mb4 COLLATE utf8mb4_bin;
CREATE DATABASE helpdesk_minedu_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'zabbix'@'localhost' IDENTIFIED BY 'ZabbixPass2026!';
GRANT ALL PRIVILEGES ON zabbix.* TO 'zabbix'@'localhost';
CREATE USER 'edudesk'@'localhost' IDENTIFIED BY 'EduDeskPass2026!';
GRANT ALL PRIVILEGES ON helpdesk_minedu_db.* TO 'edudesk'@'localhost';
SET GLOBAL log_bin_trust_function_creators = 1;
FLUSH PRIVILEGES;
EXIT;`}</pre>
                  </div>
                </div>

                {/* Paso 7 */}
                <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-900 text-sm flex items-center gap-2">
                      <span className="w-6 h-6 rounded-full bg-amber-600 text-white flex items-center justify-center text-xs font-bold">7</span>
                      Paso 7: Instalación de Zabbix Server y configuración de su entorno gráfico
                    </span>
                    <button
                      onClick={() =>
                        copyToClipboard(
                          `# Descargar repo Zabbix 7.0 LTS
wget https://repo.zabbix.com/zabbix/7.0/ubuntu/pool/main/z/zabbix-release/zabbix-release_latest_7.0+ubuntu22.04_all.deb
sudo dpkg -i zabbix-release_latest_7.0+ubuntu22.04_all.deb
sudo apt update

# Instalar Zabbix Server, frontend y agente
sudo apt install -y zabbix-server-mysql zabbix-frontend-php zabbix-nginx-conf zabbix-sql-scripts zabbix-agent

# Cargar esquema de base de datos inicial
zcat /usr/share/zabbix-sql-scripts/mysql/server.sql.gz | mysql --default-character-set=utf8mb4 -uzabbix -p'ZabbixPass2026!' zabbix

# Configurar contraseña en /etc/zabbix/zabbix_server.conf
sudo sed -i 's/# DBPassword=/DBPassword=ZabbixPass2026!/' /etc/zabbix/zabbix_server.conf

# Configurar puerto en /etc/zabbix/nginx.conf
sudo sed -i 's/#        listen          8080;/        listen          8080;/' /etc/zabbix/nginx.conf
sudo sed -i 's/#        server_name     example.com;/        server_name     192.168.40.10;/' /etc/zabbix/nginx.conf

# Iniciar y habilitar servicios
sudo systemctl restart zabbix-server zabbix-agent nginx php8.1-fpm
sudo systemctl enable zabbix-server zabbix-agent nginx php8.1-fpm`,
                          'paso7-zabbix'
                        )
                      }
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded text-xs font-medium bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 cursor-pointer"
                    >
                      {copiedCode === 'paso7-zabbix' ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-emerald-600" />
                          <span>Copiado</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5" />
                          <span>Copiar Comandos</span>
                        </>
                      )}
                    </button>
                  </div>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    Instala Zabbix Server 7.0 LTS / 6.4 LTS, puebla el esquema en MySQL y arranca el frontend Nginx:
                  </p>
                  <div className="p-3 bg-slate-950 rounded-lg text-emerald-400 font-mono text-[11px] leading-relaxed overflow-x-auto">
                    <pre>{`# 1. Repositorio e instalación:
wget https://repo.zabbix.com/zabbix/7.0/ubuntu/pool/main/z/zabbix-release/zabbix-release_latest_7.0+ubuntu22.04_all.deb
sudo dpkg -i zabbix-release_latest_7.0+ubuntu22.04_all.deb
sudo apt update && sudo apt install -y zabbix-server-mysql zabbix-frontend-php zabbix-nginx-conf zabbix-sql-scripts zabbix-agent

# 2. Carga inicial de tablas:
zcat /usr/share/zabbix-sql-scripts/mysql/server.sql.gz | mysql --default-character-set=utf8mb4 -uzabbix -p'ZabbixPass2026!' zabbix

# 3. Arrancar servicios:
sudo systemctl restart zabbix-server zabbix-agent nginx php8.1-fpm
sudo systemctl enable zabbix-server zabbix-agent nginx php8.1-fpm`}</pre>
                  </div>
                  <p className="text-xs text-slate-600">
                    Abre en el navegador: <strong className="text-indigo-600 font-mono">http://192.168.40.10:8080</strong> para culminar el asistente web (Usuario por defecto: <code className="font-mono">Admin</code>, Contraseña: <code className="font-mono">zabbix</code>).
                  </p>
                </div>

                {/* Paso 8 */}
                <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-900 text-sm flex items-center gap-2">
                      <span className="w-6 h-6 rounded-full bg-amber-600 text-white flex items-center justify-center text-xs font-bold">8</span>
                      Paso 8: Instalación de Zabbix Agent en la PC Cliente para iniciar la recolección de telemetría
                    </span>
                    <span className="text-[11px] font-mono text-slate-500">PC-ALUMNO-01</span>
                  </div>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    Instala el agente en la máquina virtual cliente para monitorear procesador, RAM, disco y presencia de red:
                  </p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div className="p-3 bg-white rounded border border-slate-200 text-xs space-y-1">
                      <strong className="text-slate-900 block">Si la PC Cliente es Windows:</strong>
                      <p className="text-slate-600 text-[11px]">Descarga e instala el paquete <code className="font-mono">zabbix_agent2-7.0-windows-amd64.msi</code>. En el asistente:</p>
                      <ul className="list-disc pl-4 text-[11px] text-slate-600">
                        <li>Host name: <code className="font-mono font-bold text-indigo-700">PC-ALUMNO-01</code></li>
                        <li>Zabbix server IP / DNS: <code className="font-mono font-bold text-indigo-700">192.168.40.10</code></li>
                        <li>Server or Proxy for active checks: <code className="font-mono">192.168.40.10</code></li>
                      </ul>
                    </div>

                    <div className="p-3 bg-white rounded border border-slate-200 text-xs space-y-1">
                      <strong className="text-slate-900 block">Si la PC Cliente es Linux:</strong>
                      <div className="p-2 bg-slate-950 text-emerald-400 font-mono text-[10px] rounded">
                        sudo apt install -y zabbix-agent<br />
                        sudo sed -i 's/Server=127.0.0.1/Server=192.168.40.10/' /etc/zabbix/zabbix_agentd.conf<br />
                        sudo sed -i 's/Hostname=Zabbix server/Hostname=PC-ALUMNO-01/' /etc/zabbix/zabbix_agentd.conf<br />
                        sudo systemctl restart zabbix-agent
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* ================= FASE 3 ================= */}
            <div className="space-y-4 pt-4">
              <div className="flex items-center gap-2.5 pb-2 border-b border-emerald-200 text-emerald-900">
                <Workflow className="w-5 h-5 text-emerald-600" />
                <h3 className="text-base font-bold">
                  Fase 3: Despliegue del Help Desk e Integración
                </h3>
              </div>

              <div className="space-y-3">
                {/* Paso 9 */}
                <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-900 text-sm flex items-center gap-2">
                      <span className="w-6 h-6 rounded-full bg-emerald-600 text-white flex items-center justify-center text-xs font-bold">9</span>
                      Paso 9: Preparación del entorno Java (Spring Boot) / Node y despliegue de EduDesk
                    </span>
                    <button
                      onClick={() =>
                        copyToClipboard(
                          `# Instalación de Java 17 y dependencias en Ubuntu Server (192.168.40.10)
sudo apt update
sudo apt install -y openjdk-17-jdk git curl

# Clonar o copiar el proyecto EduDesk
cd /opt
sudo git clone https://github.com/tu-usuario/edudesk-helpdesk.git /opt/edudesk
cd /opt/edudesk

# Compilar con Maven o Gradle
./mvnw clean package -DskipTests

# Crear servicio systemd para arranque automático en puerto 3000
sudo bash -c 'cat <<EOF > /etc/systemd/system/edudesk.service
[Unit]
Description=EduDesk Help Desk MINEDU
After=network.target mysql.service

[Service]
User=soporte
WorkingDirectory=/opt/edudesk
ExecStart=/usr/bin/java -jar /opt/edudesk/target/edudesk-0.0.1-SNAPSHOT.jar --server.port=3000
SuccessExitStatus=143
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
EOF'

sudo systemctl daemon-reload
sudo systemctl enable --now edudesk.service
sudo systemctl status edudesk.service`,
                          'paso9-spring'
                        )
                      }
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded text-xs font-medium bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 cursor-pointer"
                    >
                      {copiedCode === 'paso9-spring' ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-emerald-600" />
                          <span>Copiado</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5" />
                          <span>Copiar Despliegue</span>
                        </>
                      )}
                    </button>
                  </div>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    Instala el runtime JDK 17 en el servidor y ejecuta el servicio de la mesa de ayuda escuchando en el puerto <code className="font-mono bg-white px-1 py-0.5 rounded border border-slate-200">3000</code>:
                  </p>
                  <div className="p-3 bg-slate-950 rounded-lg text-emerald-400 font-mono text-[11px] leading-relaxed overflow-x-auto">
                    <pre>{`sudo apt install -y openjdk-17-jdk git
cd /opt/edudesk && ./mvnw clean package -DskipTests
sudo systemctl enable --now edudesk.service

# Comprobar que responde el backend:
curl -I http://192.168.40.10:3000/api/health`}</pre>
                  </div>
                </div>

                {/* Paso 10 */}
                <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-900 text-sm flex items-center gap-2">
                      <span className="w-6 h-6 rounded-full bg-emerald-600 text-white flex items-center justify-center text-xs font-bold">10</span>
                      Paso 10: Configuración del Webhook en Zabbix para enviar datos hacia EduDesk
                    </span>
                    <button
                      onClick={() =>
                        copyToClipboard(
                          `// Script Webhook en Zabbix (Alerts -> Media Types -> EduDesk)
try {
    Zabbix.log(4, '[EduDesk Webhook] Payload entrante: ' + value);
    var params = JSON.parse(value);
    var req = new HttpRequest();
    req.addHeader('Content-Type: application/json');
    req.addHeader('Authorization: Bearer MINEDU-SECRET-TOKEN-2026');

    var ticketPayload = {
        origen: "AUTOMATICO",
        hostAfectado: params.HostName,
        titulo: "🚨 Fallo Crítico en " + params.HostName + ": " + params.EventName,
        descripcion: "Alerta automática generada por Zabbix Server. El agente no responde. Severidad: " + params.Severity,
        prioridad: params.Severity === "Disaster" || params.Severity === "High" ? "urgent" : "high",
        slaTargetHours: 2,
        categoria: "hardware_pc",
        ipAfectada: params.HostIP
    };

    var response = req.post('http://192.168.40.10:3000/api/tickets/webhook', JSON.stringify(ticketPayload));
    if (req.getStatus() !== 200 && req.getStatus() !== 201) {
        throw 'Error HTTP ' + req.getStatus() + ': ' + response;
    }
    return 'OK: Ticket Creado con Exito';
} catch (error) {
    Zabbix.log(3, '[EduDesk Webhook] Fallo de envio: ' + error);
    throw 'Fallo el Webhook hacia EduDesk: ' + error;
}`,
                          'paso10-webhook'
                        )
                      }
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded text-xs font-medium bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 cursor-pointer"
                    >
                      {copiedCode === 'paso10-webhook' ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-emerald-600" />
                          <span>Copiado</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5" />
                          <span>Copiar Webhook JS</span>
                        </>
                      )}
                    </button>
                  </div>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    En el panel web de Zabbix (<strong>http://192.168.40.10:8080</strong>), ve a <em>Alerts &gt; Media Types &gt; Create Media Type</em>:
                  </p>
                  <ul className="list-disc pl-5 text-xs text-slate-600 space-y-1">
                    <li><strong>Name:</strong> EduDesk Webhook</li>
                    <li><strong>Type:</strong> Webhook</li>
                    <li><strong>Parameters:</strong> <code className="font-mono">HostName: {`{HOST.NAME}`}</code>, <code className="font-mono">HostIP: {`{HOST.IP}`}</code>, <code className="font-mono">EventName: {`{EVENT.NAME}`}</code>, <code className="font-mono">Severity: {`{EVENT.SEVERITY}`}</code>.</li>
                    <li><strong>Script:</strong> Pega el código JavaScript de arriba que hace POST a <code className="font-mono font-bold">http://192.168.40.10:3000/api/tickets/webhook</code>.</li>
                  </ul>
                  <div className="p-2.5 bg-emerald-50 rounded border border-emerald-200 text-xs text-emerald-900">
                    <strong>Acción Automática:</strong> En <em>Alerts &gt; Actions &gt; Trigger Actions</em>, crea la regla "Auto-Crear Ticket EduDesk" para que ante cualquier problema con severidad <em>High</em> o <em>Disaster</em>, Zabbix dispare este medio de alerta.
                  </div>
                </div>

                {/* Paso 11 */}
                <div className="p-4 rounded-xl border border-emerald-300 bg-emerald-50/50 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-emerald-950 text-sm flex items-center gap-2">
                      <span className="w-6 h-6 rounded-full bg-emerald-700 text-white flex items-center justify-center text-xs font-bold">11</span>
                      Paso 11: Prueba final de concepto (Simulación de caída de la PC Cliente y validación del ticket automático)
                    </span>
                    <span className="text-xs font-mono font-bold bg-emerald-200 text-emerald-900 px-2 py-0.5 rounded">
                      VALIDACIÓN DE TITULACIÓN
                    </span>
                  </div>
                  <p className="text-xs text-slate-700 leading-relaxed">
                    Este es el hito demostrativo ante el jurado de sustentación. Se ejecuta la siguiente secuencia cronometrada:
                  </p>
                  <ol className="list-decimal pl-5 text-xs text-slate-700 space-y-2">
                    <li>
                      <strong>Provocación de la avería:</strong> En la ventana de VMware Workstation, haz clic derecho sobre la VM <code className="font-mono font-bold">PC-ALUMNO-01</code> &gt; <em>Settings</em> &gt; <em>Network Adapter</em> &gt; Desmarcar la casilla <strong>"Connected"</strong> (o apagar la máquina).
                    </li>
                    <li>
                      <strong>Detección Zabbix:</strong> En 60 a 180 segundos, el trigger <code className="font-mono bg-white px-1 py-0.5 rounded border border-slate-200 text-red-600 font-bold">Zabbix agent on PC-ALUMNO-01 is unreachable for 3 minutes</code> cambia a estado <strong>PROBLEM (CRÍTICO)</strong> en el panel de Zabbix.
                    </li>
                    <li>
                      <strong>Disparo del Webhook:</strong> Zabbix ejecuta el script del Paso 10 y envía la petición HTTP POST a EduDesk.
                    </li>
                    <li>
                      <strong>Apertura Automática del Ticket:</strong> En la interfaz de EduDesk aparece inmediatamente el ticket de color rojo con prioridad <strong>Urgente (SLA 2 horas)</strong>, originado por <em>"AGENTE_SOFTWARE_ZABBIX"</em>, asignado a la cola del Técnico TI y notificando en tiempo real al Docente DAIP.
                    </li>
                  </ol>
                  <div className="p-3 bg-white rounded-lg border border-emerald-300 flex items-center justify-between text-xs">
                    <span className="text-slate-600">
                      ¿Quieres simular este flujo completo ahora mismo en pantalla sin encender VMware?
                    </span>
                    <span className="font-bold text-indigo-700">
                      Usa la pestaña "Siniestros & Apagones Zabbix" en el menú superior
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
