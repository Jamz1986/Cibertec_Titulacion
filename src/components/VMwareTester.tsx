import React, { useState } from 'react';
import { VMwareEnvironment, VMwareTestResult, TestStep } from '../types/helpdesk';
import { VMWARE_PRESET_ENVIRONMENTS } from '../data/mockData';
import { VMwareWindowsBridge } from './VMwareWindowsBridge';
import {
  Play,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  RotateCcw,
  Download,
  Terminal,
  Cpu,
  HardDrive,
  Network,
  Layers,
  FileCode,
  ShieldCheck,
  Server,
  Laptop,
} from 'lucide-react';

interface VMwareTesterProps {
  initialEnv?: VMwareEnvironment;
  ticketCode?: string;
  onTestComplete?: (result: VMwareTestResult) => void;
}

export const VMwareTester: React.FC<VMwareTesterProps> = ({
  initialEnv,
  ticketCode,
  onTestComplete,
}) => {
  const [selectedPreset, setSelectedPreset] = useState<string>('aip_lab_student');
  const [env, setEnv] = useState<VMwareEnvironment>(
    initialEnv || VMWARE_PRESET_ENVIRONMENTS['aip_lab_student']
  );
  const [isRunning, setIsRunning] = useState<boolean>(false);
  const [currentStepIndex, setCurrentStepIndex] = useState<number>(-1);
  const [logs, setLogs] = useState<string[]>([]);
  const [testResult, setTestResult] = useState<VMwareTestResult | null>(null);
  const [activeTab, setActiveTab] = useState<'suite' | 'vmx' | 'logs' | 'windows'>('suite');

  const defaultSteps: TestStep[] = [
    {
      id: 'step-1',
      name: 'Validación de Hipervisor y Versión de Motor',
      description: 'Comprobación de soporte de binarios VMware (ESXi / Workstation Pro) y parches de seguridad del kernel.',
      status: 'pending',
    },
    {
      id: 'step-2',
      name: 'Compatibilidad de Hardware Virtual (.vmx)',
      description: 'Inspección de versión virtualHW.version (vmx-17 a vmx-21) contra el hardware del anfitrión escolar.',
      status: 'pending',
    },
    {
      id: 'step-3',
      name: 'Instrucciones CPU VT-x / AMD-V y Virtualización Anidada',
      description: 'Verificación de banderas vmx/svm activas en microcódigo del CPU y soporte para laboratorios de computación.',
      status: 'pending',
    },
    {
      id: 'step-4',
      name: 'Sizing de Memoria vRAM y Sobrecompromiso (Overcommit)',
      description: 'Comprobación de que la memoria vRAM asignada no supere el 75% de la memoria física del equipo host.',
      status: 'pending',
    },
    {
      id: 'step-5',
      name: 'Integridad de Disco VMDK y Aprovisionamiento',
      description: 'Validación de descriptor VMDK monolítico/dividido y políticas de crecimiento dinámico (Thin Provisioning).',
      status: 'pending',
    },
    {
      id: 'step-6',
      name: 'Adaptador de Red Virtual (vSwitch / VMXNET3) y Gateway',
      description: 'Verificación de modo Puente (Bridged) con la LAN del colegio y prevención de duplicidad de MAC.',
      status: 'pending',
    },
    {
      id: 'step-7',
      name: 'Servicio VMware Tools / open-vm-tools y Resolución AIP',
      description: 'Comprobación de latido (heartbeat) del agente guest, redimensionamiento SVGA y sincronización horaria NTP.',
      status: 'pending',
    },
  ];

  const [steps, setSteps] = useState<TestStep[]>(defaultSteps);

  const handleApplyPreset = (key: string) => {
    setSelectedPreset(key);
    if (VMWARE_PRESET_ENVIRONMENTS[key]) {
      setEnv({ ...VMWARE_PRESET_ENVIRONMENTS[key] });
      setTestResult(null);
      setSteps(defaultSteps);
      setLogs([]);
      setCurrentStepIndex(-1);
    }
  };

  const runCompatibilityTest = async () => {
    setIsRunning(true);
    setTestResult(null);
    setSteps(defaultSteps.map((s) => ({ ...s, status: 'pending' })));
    const runLogs: string[] = [];
    const timestamp = new Date().toISOString().replace('T', ' ').substring(0, 19);

    runLogs.push(`[${timestamp}] [VMware-Core] Iniciando test de compatibilidad para entorno educativo...`);
    runLogs.push(`[${timestamp}] [VMware-Core] Target: ${env.guestOS} en ${env.hypervisor}`);
    runLogs.push(`[${timestamp}] [Host-Info] Especificaciones host: ${env.hostSpecs}`);
    setLogs([...runLogs]);

    const stepResults: TestStep[] = [...defaultSteps];

    for (let i = 0; i < stepResults.length; i++) {
      setCurrentStepIndex(i);
      stepResults[i].status = 'running';
      setSteps([...stepResults]);

      // Delay to simulate hardware probing
      await new Promise((r) => setTimeout(r, 450));

      const stepTime = new Date().toISOString().substring(11, 19);
      let stepPass: 'pass' | 'warning' | 'fail' = 'pass';
      let detailMsg = '';

      if (i === 0) {
        // Hypervisor
        stepPass = 'pass';
        detailMsg = `${env.hypervisor} detectado y verificado. Compatibilidad 100% con imagen base.`;
        runLogs.push(`[${stepTime}] [Hypervisor] OK: ${env.hypervisor} kernel modules loaded correctly.`);
      } else if (i === 1) {
        // HW version
        if (env.hardwareVersion === 'vmx-17' && env.hypervisor.includes('ESXi 8.0')) {
          stepPass = 'warning';
          detailMsg = `Versión ${env.hardwareVersion} es anterior a vmx-20. Se sugiere actualizar hardware virtual para rendimiento óptimo.`;
          runLogs.push(`[${stepTime}] [VMX-Check] WARN: virtualHW.version = "17" is legacy on ESXi 8.0.`);
        } else {
          stepPass = 'pass';
          detailMsg = `Versión ${env.hardwareVersion} coincide con los estándares de despliegue institucional.`;
          runLogs.push(`[${stepTime}] [VMX-Check] OK: virtualHW.version = "${env.hardwareVersion.replace('vmx-', '')}".`);
        }
      } else if (i === 2) {
        // CPU virtualization
        if (env.hostSpecs.toLowerCase().includes('sin svm') || env.hostSpecs.toLowerCase().includes('disabled')) {
          stepPass = 'fail';
          detailMsg = 'CRÍTICO: Virtualización por hardware (VT-x / AMD-V) desactivada en el BIOS/UEFI de la placa madre.';
          runLogs.push(`[${stepTime}] [CPU-VT] FAIL: CPU does not support long mode or VT-x is disabled in firmware setup.`);
        } else {
          stepPass = 'pass';
          detailMsg = 'Intel VT-x / AMD-V activo con EPT/NPT habilitado para virtualización en el aula.';
          runLogs.push(`[${stepTime}] [CPU-VT] OK: VT-x/AMD-V supported and enabled in MSR 0x3a.`);
        }
      } else if (i === 3) {
        // RAM sizing
        if (env.ramGb > 12 && env.hostSpecs.toLowerCase().includes('16gb')) {
          stepPass = 'warning';
          detailMsg = `vRAM de ${env.ramGb}GB deja poco margen al Sistema Operativo anfitrión escolar de 16GB. Riesgo de swapping.`;
          runLogs.push(`[${stepTime}] [Memory-Check] WARN: Guest requested ${env.ramGb}GB RAM on 16GB physical host.`);
        } else {
          stepPass = 'pass';
          detailMsg = `vRAM ${env.ramGb}GB / vCPU ${env.vcpu} núcleos equilibrado con la capacidad del aula.`;
          runLogs.push(`[${stepTime}] [Memory-Check] OK: Memory reservation 100% committed with zero ballooning.`);
        }
      } else if (i === 4) {
        // Disk
        stepPass = 'pass';
        detailMsg = `Disco virtual de ${env.diskGb}GB con formato ${env.diskProvisioning} Provisioning listo para escritura rápida.`;
        runLogs.push(`[${stepTime}] [Storage] OK: scsi0:0.fileName = "aip_disk.vmdk" validated with fast seek.`);
      } else if (i === 5) {
        // Network
        if (env.networkMode.includes('Bridged') && env.hostSpecs.toLowerCase().includes('dhcp escolar')) {
          stepPass = 'pass';
          detailMsg = 'Adaptador VMXNET3 en modo Puente enlazado con la subred 192.168.1.0/24 del aula.';
          runLogs.push(`[${stepTime}] [vSwitch] OK: ethernet0.virtualDev = "vmxnet3", connected to vSwitch0 bridge.`);
        } else {
          stepPass = 'pass';
          detailMsg = `Red en modo ${env.networkMode} configurada. Acceso a internet y proxy MINEDU garantizado.`;
          runLogs.push(`[${stepTime}] [vSwitch] OK: Interface bound to ${env.networkMode}.`);
        }
      } else if (i === 6) {
        // VMware Tools
        if (env.vmwareToolsStatus.includes('Not Installed') || env.vmwareToolsStatus.includes('Corrupted')) {
          stepPass = 'fail';
          detailMsg = 'VMware Tools / open-vm-tools no se encuentra en ejecución en el sistema invitado.';
          runLogs.push(`[${stepTime}] [Guest-Tools] FAIL: vmtoolsd daemon not running. Resolution scaling & mouse integration broken.`);
        } else if (env.vmwareToolsStatus.includes('Outdated')) {
          stepPass = 'warning';
          detailMsg = 'VMware Tools desactualizado. Podría presentar anomalías en proyectores HDMI escolares.';
          runLogs.push(`[${stepTime}] [Guest-Tools] WARN: open-vm-tools 10.1 is outdated. Upgrade recommended.`);
        } else {
          stepPass = 'pass';
          detailMsg = 'open-vm-tools 12.3 activo con heartbeat verificado y sincronización horaria.';
          runLogs.push(`[${stepTime}] [Guest-Tools] OK: Guest agent responding. Auto-fit window active.`);
        }
      }

      stepResults[i].status = stepPass;
      stepResults[i].detail = detailMsg;
      stepResults[i].latencyMs = Math.floor(Math.random() * 25) + 12;
      setSteps([...stepResults]);
      setLogs([...runLogs]);
    }

    const hasFail = stepResults.some((s) => s.status === 'fail');
    const hasWarn = stepResults.some((s) => s.status === 'warning');
    const overall: 'PASS' | 'WARNING' | 'FAIL' = hasFail ? 'FAIL' : hasWarn ? 'WARNING' : 'PASS';
    const score = hasFail ? 45 : hasWarn ? 78 : 98;

    let recommendation = 'El entorno virtual cumple con todas las especificaciones de compatibilidad para aulas de Lima Metropolitana.';
    if (hasFail) {
      recommendation = 'Se requiere intervención física: Activar VT-x en el BIOS del anfitrión o reinstalar paquete open-vm-tools antes de usar en clase.';
    } else if (hasWarn) {
      recommendation = 'El entorno puede operar en clase, pero se aconseja actualizar la versión de hardware virtual y optimizar la cuota de RAM.';
    }

    const finalResult: VMwareTestResult = {
      id: `test-${Date.now()}`,
      timestamp: new Date().toLocaleString('es-PE'),
      overallStatus: overall,
      compatibilityScore: score,
      steps: stepResults,
      logs: runLogs,
      recommendation,
      vmxSnippet: generateVmxSnippet(env),
    };

    setTestResult(finalResult);
    setIsRunning(false);
    setCurrentStepIndex(-1);

    if (onTestComplete) {
      onTestComplete(finalResult);
    }
  };

  const generateVmxSnippet = (currentEnv: VMwareEnvironment) => {
    return `.encoding = "UTF-8"
config.version = "8"
virtualHW.version = "${currentEnv.hardwareVersion.replace('vmx-', '')}"
pciBridge0.present = "TRUE"
pciBridge4.present = "TRUE"
vmci0.present = "TRUE"
displayName = "${currentEnv.guestOS} - Aula de Innovación"
guestOS = "${currentEnv.guestOS.toLowerCase().includes('ubuntu') ? 'ubuntu-64' : currentEnv.guestOS.toLowerCase().includes('debian') ? 'debian11-64' : 'windows9-64'}"
numvcpus = "${currentEnv.vcpu}"
cpuid.coresPerSocket = "${currentEnv.vcpu}"
memsize = "${currentEnv.ramGb * 1024}"
scsi0.present = "TRUE"
scsi0.virtualDev = "lsilogic"
scsi0:0.present = "TRUE"
scsi0:0.fileName = "aip_system_disk.vmdk"
ethernet0.present = "TRUE"
ethernet0.virtualDev = "vmxnet3"
ethernet0.connectionType = "${currentEnv.networkMode.includes('Bridged') ? 'bridged' : 'nat'}"
ethernet0.wakeOnPcktRcv = "FALSE"
ethernet0.addressType = "generated"
tools.syncTime = "TRUE"
tools.upgrade.policy = "upgradeAtPowerCycle"
vhv.enable = "${currentEnv.nestedVirtualization ? 'TRUE' : 'FALSE'}"
svga.autodetect = "TRUE"
cleanShutdown = "TRUE"`;
  };

  const downloadReport = () => {
    if (!testResult) return;
    const reportText = `=====================================================
INFORME DE COMPATIBILIDAD VMWARE - HELP DESK TI
Instituciones Educativas de Lima Metropolitana (DRELM)
Fecha: ${testResult.timestamp}
Ticket Asociado: ${ticketCode || 'Test de Laboratorio Independiente'}
=====================================================

ESTADO GLOBAL: ${testResult.overallStatus} (${testResult.compatibilityScore}/100)
Recomendación Técnica: ${testResult.recommendation}

ENTORNO PROBADO:
- Hipervisor: ${env.hypervisor}
- Versión de HW Virtual: ${env.hardwareVersion}
- SO Invitado: ${env.guestOS}
- Recursos: ${env.vcpu} vCPUs, ${env.ramGb} GB RAM, ${env.diskGb} GB Disco (${env.diskProvisioning})
- Modo de Red: ${env.networkMode}
- Estado VMware Tools: ${env.vmwareToolsStatus}
- Anfitrión Físico: ${env.hostSpecs}

RESULTADOS DETALLADOS:
${testResult.steps
  .map(
    (s, idx) =>
      `${idx + 1}. [${s.status.toUpperCase()}] ${s.name}\n   Detalle: ${s.detail || 'Sin anomalías'}`
  )
  .join('\n\n')}

REGISTRO DE LOGS (vmware.log):
${testResult.logs.join('\n')}
`;

    const blob = new Blob([reportText], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `VMware-Diagnostic-Report-${ticketCode || 'Lab'}.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
      {/* Header bar */}
      <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Server className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
            <h2 className="text-base font-bold text-slate-900 dark:text-white">
              Módulo de Pruebas de Compatibilidad VMware
            </h2>
            {ticketCode && (
              <span className="text-xs font-mono px-2 py-0.5 rounded bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
                Ticket: {ticketCode}
              </span>
            )}
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Validación automatizada de plantillas OVA y máquinas virtuales para Aulas de Innovación Pedagógica (AIP).
          </p>
        </div>

        <div className="flex items-center gap-2">
          {testResult && (
            <button
              onClick={downloadReport}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 dark:text-slate-200 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 rounded-lg transition-colors cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Exportar Reporte TI</span>
            </button>
          )}

          <button
            onClick={runCompatibilityTest}
            disabled={isRunning}
            className={`inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white rounded-lg transition-all shadow-sm cursor-pointer ${
              isRunning
                ? 'bg-indigo-400 cursor-not-allowed'
                : 'bg-indigo-600 hover:bg-indigo-700 active:scale-95'
            }`}
          >
            {isRunning ? (
              <>
                <RotateCcw className="w-3.5 h-3.5 animate-spin" />
                <span>Ejecutando Test VMware...</span>
              </>
            ) : (
              <>
                <Play className="w-3.5 h-3.5 fill-current" />
                <span>Iniciar Test de Compatibilidad</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Preset selector bar */}
      <div className="px-6 py-3 bg-slate-50 dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2">
          <span className="text-slate-500 dark:text-slate-400 font-medium">Plantillas de prueba:</span>
          <div className="flex flex-wrap gap-1.5">
            <button
              onClick={() => handleApplyPreset('aip_lab_student')}
              className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors cursor-pointer ${
                selectedPreset === 'aip_lab_student'
                  ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-xs border border-slate-300 dark:border-slate-700'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-200/60 dark:hover:bg-slate-900'
              }`}
            >
              Ubuntu AIP Estudiante
            </button>
            <button
              onClick={() => handleApplyPreset('minedu_proxy_server')}
              className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors cursor-pointer ${
                selectedPreset === 'minedu_proxy_server'
                  ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-xs border border-slate-300 dark:border-slate-700'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-200/60 dark:hover:bg-slate-900'
              }`}
            >
              Servidor Proxy MINEDU
            </button>
            <button
              onClick={() => handleApplyPreset('teacher_workstation')}
              className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors cursor-pointer ${
                selectedPreset === 'teacher_workstation'
                  ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-xs border border-slate-300 dark:border-slate-700'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-200/60 dark:hover:bg-slate-900'
              }`}
            >
              Puesto Docente Windows 10
            </button>
            <button
              onClick={() => handleApplyPreset('secundaria_cyber_lab')}
              className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors cursor-pointer ${
                selectedPreset === 'secundaria_cyber_lab'
                  ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-xs border border-slate-300 dark:border-slate-700'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-200/60 dark:hover:bg-slate-900'
              }`}
            >
              Kali Ciberseguridad Lab
            </button>
          </div>
        </div>

        {/* Status result summary if already run */}
        {testResult && (
          <div className="flex items-center gap-3">
            <span className="text-slate-500 dark:text-slate-400">Resultado:</span>
            <div
              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md font-semibold text-xs ${
                testResult.overallStatus === 'PASS'
                  ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800'
                  : testResult.overallStatus === 'WARNING'
                  ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 border border-amber-300 dark:border-amber-800'
                  : 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300 border border-rose-300 dark:border-rose-800'
              }`}
            >
              {testResult.overallStatus === 'PASS' && <CheckCircle2 className="w-3.5 h-3.5" />}
              {testResult.overallStatus === 'WARNING' && <AlertTriangle className="w-3.5 h-3.5" />}
              {testResult.overallStatus === 'FAIL' && <XCircle className="w-3.5 h-3.5" />}
              <span>
                {testResult.overallStatus === 'PASS'
                  ? 'COMPATIBLE'
                  : testResult.overallStatus === 'WARNING'
                  ? 'ADVERTENCIA'
                  : 'INCOMPATIBLE'}
              </span>
              <span className="font-mono">({testResult.compatibilityScore}%)</span>
            </div>
          </div>
        )}
      </div>

      {/* Main Grid: Parameters on Left, Test Execution & Output on Right */}
      <div className="p-6 grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: VM Environment Parameters (4 cols) */}
        <div className="lg:col-span-4 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-slate-900 dark:text-white flex items-center gap-1.5">
              <Cpu className="w-4 h-4 text-slate-500" />
              <span>Parámetros del Entorno Virtual</span>
            </h3>
            <span className="text-[11px] text-slate-400">Editable para pruebas</span>
          </div>

          <div className="space-y-3 text-xs">
            <div>
              <label className="block text-slate-600 dark:text-slate-400 mb-1 font-medium">
                Hipervisor VMware
              </label>
              <select
                value={env.hypervisor}
                onChange={(e) =>
                  setEnv({
                    ...env,
                    hypervisor: e.target.value as VMwareEnvironment['hypervisor'],
                  })
                }
                className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-1 focus:ring-indigo-500"
              >
                <option value="VMware Workstation Pro 17">VMware Workstation Pro 17</option>
                <option value="VMware Workstation Pro 16">VMware Workstation Pro 16</option>
                <option value="VMware ESXi 8.0">VMware ESXi 8.0 (Bare Metal)</option>
                <option value="VMware ESXi 7.0">VMware ESXi 7.0</option>
                <option value="VMware Fusion 13">VMware Fusion 13</option>
              </select>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-slate-600 dark:text-slate-400 mb-1 font-medium">
                  Versión HW (.vmx)
                </label>
                <select
                  value={env.hardwareVersion}
                  onChange={(e) =>
                    setEnv({
                      ...env,
                      hardwareVersion: e.target.value as VMwareEnvironment['hardwareVersion'],
                    })
                  }
                  className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                >
                  <option value="vmx-21">vmx-21 (ESXi 8.0)</option>
                  <option value="vmx-20">vmx-20 (Workstation 17)</option>
                  <option value="vmx-19">vmx-19 (Workstation 16)</option>
                  <option value="vmx-17">vmx-17 (Legacy 6.7)</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-600 dark:text-slate-400 mb-1 font-medium">
                  SO Invitado (Guest)
                </label>
                <select
                  value={env.guestOS}
                  onChange={(e) =>
                    setEnv({
                      ...env,
                      guestOS: e.target.value as VMwareEnvironment['guestOS'],
                    })
                  }
                  className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                >
                  <option value="Ubuntu Education LTS (AIP)">Ubuntu Education (AIP)</option>
                  <option value="Debian Server (MINEDU Proxy)">Debian Server Proxy</option>
                  <option value="Windows 10 Edu Pro">Windows 10 Edu Pro</option>
                  <option value="Kali Linux (Ciberseguridad)">Kali Ciberseguridad</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2">
              <div>
                <label className="block text-slate-600 dark:text-slate-400 mb-1 font-medium">
                  vCPUs
                </label>
                <input
                  type="number"
                  min="1"
                  max="16"
                  value={env.vcpu}
                  onChange={(e) => setEnv({ ...env, vcpu: Number(e.target.value) || 1 })}
                  className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-mono"
                />
              </div>
              <div>
                <label className="block text-slate-600 dark:text-slate-400 mb-1 font-medium">
                  vRAM (GB)
                </label>
                <input
                  type="number"
                  min="1"
                  max="64"
                  value={env.ramGb}
                  onChange={(e) => setEnv({ ...env, ramGb: Number(e.target.value) || 2 })}
                  className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-mono"
                />
              </div>
              <div>
                <label className="block text-slate-600 dark:text-slate-400 mb-1 font-medium">
                  Disco (GB)
                </label>
                <input
                  type="number"
                  min="10"
                  max="500"
                  value={env.diskGb}
                  onChange={(e) => setEnv({ ...env, diskGb: Number(e.target.value) || 20 })}
                  className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-mono"
                />
              </div>
            </div>

            <div>
              <label className="block text-slate-600 dark:text-slate-400 mb-1 font-medium">
                Adaptador de Red (vSwitch)
              </label>
              <select
                value={env.networkMode}
                onChange={(e) =>
                  setEnv({
                    ...env,
                    networkMode: e.target.value as VMwareEnvironment['networkMode'],
                  })
                }
                className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
              >
                <option value="Bridged (LAN Escolar)">Bridged (Modo Puente - Red Escolar)</option>
                <option value="NAT">NAT (Subred Virtual Privada)</option>
                <option value="Custom vSwitch VLAN">Custom vSwitch VLAN (Aislamiento AIP)</option>
                <option value="Host-Only">Host-Only</option>
              </select>
            </div>

            <div>
              <label className="block text-slate-600 dark:text-slate-400 mb-1 font-medium">
                Estado VMware Tools / open-vm-tools
              </label>
              <select
                value={env.vmwareToolsStatus}
                onChange={(e) =>
                  setEnv({
                    ...env,
                    vmwareToolsStatus: e.target.value as VMwareEnvironment['vmwareToolsStatus'],
                  })
                }
                className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
              >
                <option value="Running (v12.3)">En ejecución (open-vm-tools v12.3)</option>
                <option value="Outdated (v10.1)">Desactualizado (v10.1)</option>
                <option value="Not Installed">No instalado (Sin drivers SVGA)</option>
                <option value="Corrupted">Corrupto / Error de inicio</option>
              </select>
            </div>

            <div>
              <label className="block text-slate-600 dark:text-slate-400 mb-1 font-medium">
                Especificaciones del Host Físico Escolar
              </label>
              <textarea
                rows={2}
                value={env.hostSpecs}
                onChange={(e) => setEnv({ ...env, hostSpecs: e.target.value })}
                className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs"
              />
            </div>

            <div className="pt-2">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={env.nestedVirtualization}
                  onChange={(e) => setEnv({ ...env, nestedVirtualization: e.target.checked })}
                  className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                />
                <span className="text-slate-700 dark:text-slate-300">
                  Habilitar Virtualización Anidada (vhv.enable = "TRUE")
                </span>
              </label>
            </div>
          </div>
        </div>

        {/* Right Column: Execution Dashboard & Tabs (8 cols) */}
        <div className="lg:col-span-8 flex flex-col space-y-4">
          {/* Subtabs: Suite Checks vs VMX file vs Live Logs */}
          <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-2">
            <div className="flex items-center gap-1">
              <button
                onClick={() => setActiveTab('suite')}
                className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-colors cursor-pointer flex items-center gap-1.5 ${
                  activeTab === 'suite'
                    ? 'bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white'
                    : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>Batería de Pruebas ({steps.length})</span>
              </button>
              <button
                onClick={() => setActiveTab('vmx')}
                className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-colors cursor-pointer flex items-center gap-1.5 ${
                  activeTab === 'vmx'
                    ? 'bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white'
                    : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <FileCode className="w-3.5 h-3.5" />
                <span>Configuración .vmx</span>
              </button>
              <button
                onClick={() => setActiveTab('logs')}
                className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-colors cursor-pointer flex items-center gap-1.5 ${
                  activeTab === 'logs'
                    ? 'bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white'
                    : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <Terminal className="w-3.5 h-3.5" />
                <span>Consola vmware.log ({logs.length})</span>
              </button>
              <button
                onClick={() => setActiveTab('windows')}
                className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-colors cursor-pointer flex items-center gap-1.5 ${
                  activeTab === 'windows'
                    ? 'bg-indigo-100 dark:bg-indigo-950/80 text-indigo-700 dark:text-indigo-300 font-bold border border-indigo-300 dark:border-indigo-800'
                    : 'text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/40'
                }`}
              >
                <Laptop className="w-3.5 h-3.5" />
                <span>Escritorio Windows (vmrest / CLI)</span>
              </button>
            </div>

            {testResult && (
              <span className="text-xs text-slate-500 dark:text-slate-400">
                Última prueba: {testResult.timestamp}
              </span>
            )}
          </div>

          {/* Tab 1: Suite Checks */}
          {activeTab === 'suite' && (
            <div className="space-y-2.5 flex-1">
              {steps.map((step, idx) => (
                <div
                  key={step.id}
                  className={`p-3 rounded-lg border transition-all ${
                    step.status === 'running'
                      ? 'border-indigo-400 bg-indigo-50/50 dark:bg-indigo-950/30 ring-1 ring-indigo-400'
                      : step.status === 'pass'
                      ? 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60'
                      : step.status === 'warning'
                      ? 'border-amber-300 dark:border-amber-800/80 bg-amber-50/40 dark:bg-amber-950/20'
                      : step.status === 'fail'
                      ? 'border-rose-300 dark:border-rose-800/80 bg-rose-50/40 dark:bg-rose-950/20'
                      : 'border-slate-100 dark:border-slate-800/60 bg-slate-50/50 dark:bg-slate-900/30 opacity-70'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-2.5">
                      <div className="mt-0.5 shrink-0">
                        {step.status === 'pending' && (
                          <div className="w-4 h-4 rounded-full border-2 border-slate-300 dark:border-slate-700" />
                        )}
                        {step.status === 'running' && (
                          <RotateCcw className="w-4 h-4 text-indigo-600 animate-spin" />
                        )}
                        {step.status === 'pass' && (
                          <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                        )}
                        {step.status === 'warning' && (
                          <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                        )}
                        {step.status === 'fail' && (
                          <XCircle className="w-4 h-4 text-rose-600 dark:text-rose-400" />
                        )}
                      </div>

                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-semibold text-slate-900 dark:text-white">
                            {idx + 1}. {step.name}
                          </span>
                          {step.latencyMs && (
                            <span className="text-[11px] font-mono text-slate-400">
                              {step.latencyMs}ms
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                          {step.description}
                        </p>
                        {step.detail && (
                          <p
                            className={`text-[11px] font-medium mt-1 ${
                              step.status === 'fail'
                                ? 'text-rose-700 dark:text-rose-300 font-semibold'
                                : step.status === 'warning'
                                ? 'text-amber-700 dark:text-amber-300'
                                : 'text-emerald-700 dark:text-emerald-300'
                            }`}
                          >
                            → {step.detail}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="shrink-0 text-right">
                      {step.status === 'pass' && (
                        <span className="text-[11px] font-mono font-bold text-emerald-600 dark:text-emerald-400">
                          PASSED
                        </span>
                      )}
                      {step.status === 'warning' && (
                        <span className="text-[11px] font-mono font-bold text-amber-600 dark:text-amber-400">
                          WARNING
                        </span>
                      )}
                      {step.status === 'fail' && (
                        <span className="text-[11px] font-mono font-bold text-rose-600 dark:text-rose-400">
                          FAILED
                        </span>
                      )}
                      {step.status === 'running' && (
                        <span className="text-[11px] font-mono text-indigo-600 dark:text-indigo-400 animate-pulse">
                          PROBING...
                        </span>
                      )}
                      {step.status === 'pending' && (
                        <span className="text-[11px] font-mono text-slate-400">EN ESPERA</span>
                      )}
                    </div>
                  </div>
                </div>
              ))}

              {testResult && (
                <div className="p-3.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 mt-4">
                  <span className="text-xs font-bold text-slate-900 dark:text-white block">
                    Diagnóstico y Acción Recomendada para Soporte TI:
                  </span>
                  <p className="text-xs text-slate-600 dark:text-slate-300 mt-1">
                    {testResult.recommendation}
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Tab 2: VMX File Inspector */}
          {activeTab === 'vmx' && (
            <div className="flex-1 flex flex-col space-y-2">
              <div className="flex items-center justify-between text-xs text-slate-500">
                <span>Archivo de descriptor de máquina virtual (.vmx) generado:</span>
                <span className="font-mono text-[11px]">aip_workstation_lab.vmx</span>
              </div>
              <div className="p-3.5 rounded-lg bg-slate-950 border border-slate-800 text-slate-300 font-mono text-[11px] leading-relaxed overflow-x-auto max-h-[360px]">
                <pre>{generateVmxSnippet(env)}</pre>
              </div>
              <p className="text-[11px] text-slate-500">
                Este archivo puede descargarse o copiarse en la carpeta de la máquina virtual del Aula de Innovación.
              </p>
            </div>
          )}

          {/* Tab 3: Console Logs */}
          {activeTab === 'logs' && (
            <div className="flex-1 flex flex-col space-y-2">
              <div className="flex items-center justify-between text-xs text-slate-500">
                <span className="flex items-center gap-1.5">
                  <Terminal className="w-3.5 h-3.5" />
                  <span>Traza en tiempo real del hipervisor (vmware.log)</span>
                </span>
                <span className="font-mono text-[11px]">{logs.length} líneas</span>
              </div>
              <div className="p-3.5 rounded-lg bg-slate-950 border border-slate-800 text-emerald-400 font-mono text-[11px] leading-relaxed overflow-y-auto max-h-[360px] space-y-1">
                {logs.length === 0 ? (
                  <p className="text-slate-500 italic">
                    Haga clic en "Iniciar Test de Compatibilidad" para capturar la traza en vivo del motor VMware.
                  </p>
                ) : (
                  logs.map((log, idx) => (
                    <div key={idx} className="whitespace-pre-wrap">
                      {log}
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* Tab 4: Windows Desktop Bridge */}
          {activeTab === 'windows' && (
            <div className="flex-1">
              <VMwareWindowsBridge currentEnv={env} ticketCode={ticketCode} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
