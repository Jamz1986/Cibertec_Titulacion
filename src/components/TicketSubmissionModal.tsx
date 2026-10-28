import React, { useState, useEffect } from 'react';
import { Priority, Ticket, TicketCategory, UGELCode, VMwareEnvironment } from '../types/helpdesk';
import { PrioritySelector } from './PrioritySelector';
import { PRIORITY_CONFIGS, UGEL_SCHOOLS, VMWARE_PRESET_ENVIRONMENTS } from '../data/mockData';
import {
  X,
  Server,
  Sparkles,
  Layers,
  Send,
  Building,
  User,
  Mail,
  MapPin,
  Laptop,
  Check,
} from 'lucide-react';

import { useAuth } from '../context/AuthContext';

interface TicketSubmissionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (newTicket: Ticket) => void;
}

export const TicketSubmissionModal: React.FC<TicketSubmissionModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
}) => {
  const { currentUser } = useAuth();
  const [selectedPriority, setSelectedPriority] = useState<Priority>('medium');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<TicketCategory>('vmware_virtualization');
  const [ugel, setUgel] = useState<UGELCode>(currentUser?.ugel || 'UGEL 03');
  const [schoolName, setSchoolName] = useState(
    currentUser?.institucionSede || UGEL_SCHOOLS['UGEL 03'][0]
  );
  const [customSchool, setCustomSchool] = useState('');
  const [reporterName, setReporterName] = useState(
    currentUser?.nombre || 'Prof. Renzo Fonseca Vílchez'
  );
  const [reporterRole, setReporterRole] = useState(
    currentUser?.rolLabel || 'Docente (Usuario General)'
  );
  const [reporterEmail, setReporterEmail] = useState(
    currentUser?.email || 'profesor@cibertec.edu.pe'
  );
  const [classroomLab, setClassroomLab] = useState('Laboratorio AIP 2 (Pabellón Informática)');
  const [includeVMwareDetails, setIncludeVMwareDetails] = useState(true);

  // Sync when currentUser changes
  useEffect(() => {
    if (currentUser) {
      setReporterName(currentUser.nombre);
      setReporterRole(currentUser.rolLabel);
      setReporterEmail(currentUser.email);
      if (currentUser.ugel) setUgel(currentUser.ugel);
      if (currentUser.institucionSede) setSchoolName(currentUser.institucionSede);
    }
  }, [currentUser]);

  // VMware details
  const [vmHypervisor, setVmHypervisor] = useState<VMwareEnvironment['hypervisor']>(
    'VMware Workstation Pro 17'
  );
  const [vmHardwareVersion, setVmHardwareVersion] = useState<VMwareEnvironment['hardwareVersion']>(
    'vmx-20'
  );
  const [vmGuestOS, setVmGuestOS] = useState<VMwareEnvironment['guestOS']>(
    'Ubuntu Education LTS (AIP)'
  );
  const [vmVcpu, setVmVcpu] = useState<number>(2);
  const [vmRamGb, setVmRamGb] = useState<number>(4);
  const [vmToolsStatus, setVmToolsStatus] = useState<VMwareEnvironment['vmwareToolsStatus']>(
    'Running (v12.3)'
  );

  // Smart triage suggestion state
  const [aiSuggestion, setAiSuggestion] = useState<{
    suggested: Priority;
    reason: string;
  } | null>(null);

  // Update school list when UGEL changes
  useEffect(() => {
    if (UGEL_SCHOOLS[ugel] && UGEL_SCHOOLS[ugel].length > 0) {
      setSchoolName(UGEL_SCHOOLS[ugel][0]);
    }
  }, [ugel]);

  // Automated triage heuristic based on text content
  useEffect(() => {
    const text = (title + ' ' + description).toLowerCase();
    if (!text.trim()) {
      setAiSuggestion(null);
      return;
    }

    if (
      text.includes('esxi') ||
      text.includes('caída') ||
      text.includes('censal') ||
      text.includes('urgente') ||
      text.includes('kernel panic') ||
      text.includes('servidor caído') ||
      text.includes('todo el colegio')
    ) {
      setAiSuggestion({
        suggested: 'urgent',
        reason: 'Se detectó caída de servidor central o impacto crítico en evaluaciones.',
      });
    } else if (
      text.includes('aip completa') ||
      text.includes('todo el laboratorio') ||
      text.includes('todas las pc') ||
      text.includes('sin internet') ||
      text.includes('black screen') ||
      text.includes('pantalla negra') ||
      text.includes('vt-x') ||
      text.includes('no arranca ninguna')
    ) {
      setAiSuggestion({
        suggested: 'high',
        reason: 'Afecta la sesión curricular completa del Aula de Innovación Pedagógica.',
      });
    } else if (
      text.includes('1 pc') ||
      text.includes('una máquina') ||
      text.includes('un puesto') ||
      text.includes('lento') ||
      text.includes('parpadea') ||
      text.includes('resolución')
    ) {
      setAiSuggestion({
        suggested: 'medium',
        reason: 'Falla aislada en puesto individual; permite continuidad con alumnos restantes.',
      });
    } else if (
      text.includes('consulta') ||
      text.includes('solicitud') ||
      text.includes('duda') ||
      text.includes('plantilla nueva') ||
      text.includes('ampliar')
    ) {
      setAiSuggestion({
        suggested: 'low',
        reason: 'Requerimiento de baja criticidad o consulta técnica no bloqueante.',
      });
    }
  }, [title, description]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !description.trim()) return;

    const finalSchool = customSchool.trim() ? customSchool.trim() : schoolName;
    const now = new Date();
    const formattedDate = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(
      now.getDate()
    ).padStart(2, '0')} ${String(now.getHours()).padStart(2, '0')}:${String(
      now.getMinutes()
    ).padStart(2, '0')}`;

    const newTicket: Ticket = {
      id: `t-${Date.now()}`,
      code: `TK-${now.getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`,
      title: title.trim(),
      titulo: title.trim(),
      description: description.trim(),
      descripcion: description.trim(),
      origen: 'MANUAL',
      priority: selectedPriority,
      status: 'open',
      category,
      ugel,
      sede: finalSchool,
      schoolName: finalSchool,
      reporterUserId: currentUser?.id,
      reporterName: reporterName.trim(),
      reporterRole: reporterRole.trim(),
      reporterEmail: reporterEmail.trim(),
      classroomLab: classroomLab.trim(),
      createdAt: formattedDate,
      slaTargetHours: PRIORITY_CONFIGS[selectedPriority].slaHours,
      vmwareEnv: includeVMwareDetails
        ? {
            hypervisor: vmHypervisor,
            hardwareVersion: vmHardwareVersion,
            guestOS: vmGuestOS,
            vcpu: vmVcpu,
            ramGb: vmRamGb,
            diskGb: 40,
            diskProvisioning: 'Thin',
            networkMode: 'Bridged (LAN Escolar)',
            vmwareToolsStatus: vmToolsStatus,
            hostSpecs: 'Core i5 Host Lab AIP, 16GB RAM',
            nestedVirtualization: false,
          }
        : undefined,
      comments: [
        {
          id: `c-${Date.now()}`,
          author: 'Sistema HelpDesk TI',
          role: 'Triaje Automatizado',
          text: `Ticket registrado exitosamente. Prioridad establecida: ${PRIORITY_CONFIGS[selectedPriority].label.toUpperCase()} (SLA máximo: ${PRIORITY_CONFIGS[selectedPriority].slaHours} horas). Canalizado a especialistas de ${ugel}.`,
          timestamp: formattedDate,
        },
      ],
    };

    onSubmit(newTicket);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs overflow-y-auto">
      <div className="relative w-full max-w-4xl bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xl overflow-hidden my-8">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Building className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
              <span>Nuevo Ticket de Soporte TI - Lima Metropolitana</span>
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Mesa de Ayuda para Instituciones Educativas de la Dirección Regional de Educación de Lima Metropolitana (DRELM)
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6 max-h-[75vh] overflow-y-auto">
          {/* Institution & UGEL Section */}
          <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-950/40 space-y-3">
            <span className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider block">
              1. Datos de la Institución Educativa y Solicitante
            </span>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
              <div>
                <label className="block text-slate-600 dark:text-slate-400 font-medium mb-1">
                  Jurisdicción UGEL <span className="text-rose-500">*</span>
                </label>
                <select
                  value={ugel}
                  onChange={(e) => setUgel(e.target.value as UGELCode)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-medium focus:ring-1 focus:ring-indigo-500"
                >
                  <option value="UGEL 01">UGEL 01 (SJM, VES, VMT)</option>
                  <option value="UGEL 02">UGEL 02 (Rímac, SMP, Los Olivos)</option>
                  <option value="UGEL 03">UGEL 03 (Cercado, Breña, San Isidro, Lince)</option>
                  <option value="UGEL 04">UGEL 04 (Comas, Carabayllo, Pte Piedra)</option>
                  <option value="UGEL 05">UGEL 05 (SJL, El Agustino)</option>
                  <option value="UGEL 06">UGEL 06 (Ate, Chosica, Chaclacayo)</option>
                  <option value="UGEL 07">UGEL 07 (San Borja, Surco, Miraflores)</option>
                </select>
              </div>

              <div className="md:col-span-2">
                <label className="block text-slate-600 dark:text-slate-400 font-medium mb-1">
                  Institución Educativa (I.E.) <span className="text-rose-500">*</span>
                </label>
                <select
                  value={schoolName}
                  onChange={(e) => setSchoolName(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-medium"
                >
                  {(UGEL_SCHOOLS[ugel] || []).map((school) => (
                    <option key={school} value={school}>
                      {school}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
              <div>
                <label className="block text-slate-600 dark:text-slate-400 font-medium mb-1">
                  Nombre del Reportante
                </label>
                <input
                  type="text"
                  required
                  value={reporterName}
                  onChange={(e) => setReporterName(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                />
              </div>
              <div>
                <label className="block text-slate-600 dark:text-slate-400 font-medium mb-1">
                  Cargo / Rol Institucional
                </label>
                <select
                  value={reporterRole}
                  onChange={(e) => setReporterRole(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                >
                  <option value="Docente DAIP (Aula de Innovación)">Docente DAIP (Aula Innovación)</option>
                  <option value="Coordinador de Innovación CIST">Coordinador CIST (Soporte TI)</option>
                  <option value="Director I.E.">Director / Subdirector I.E.</option>
                  <option value="Especialista TI UGEL">Especialista TI UGEL</option>
                </select>
              </div>
              <div>
                <label className="block text-slate-600 dark:text-slate-400 font-medium mb-1">
                  Aula / Laboratorio Afectado
                </label>
                <input
                  type="text"
                  required
                  value={classroomLab}
                  onChange={(e) => setClassroomLab(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                />
              </div>
            </div>
          </div>

          {/* Ticket Details & Category */}
          <div className="space-y-3">
            <span className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider block">
              2. Detalle de la Incidencia Tecnológica
            </span>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
              <div className="md:col-span-1">
                <label className="block text-slate-600 dark:text-slate-400 font-medium mb-1">
                  Categoría Técnica <span className="text-rose-500">*</span>
                </label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value as TicketCategory)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-medium"
                >
                  <option value="vmware_virtualization">Entornos Virtuales VMware / OVA</option>
                  <option value="networking_connectivity">Redes, Conectividad & VLAN</option>
                  <option value="aip_hardware">Equipos Físicos Aula AIP / CRT</option>
                  <option value="school_server">Servidor Escolar MINEDU / Proxy</option>
                  <option value="educational_software">Software Educativo / Moodle</option>
                </select>
              </div>

              <div className="md:col-span-2">
                <label className="block text-slate-600 dark:text-slate-400 font-medium mb-1">
                  Asunto del Ticket <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ej: Máquina virtual VMware Workstation 17 no inicia por error de VT-x"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-medium"
                />
              </div>
            </div>

            <div>
              <label className="block text-slate-600 dark:text-slate-400 text-xs font-medium mb-1">
                Descripción Detallada del Problema <span className="text-rose-500">*</span>
              </label>
              <textarea
                required
                rows={3}
                placeholder="Describa el síntoma, mensaje de error observado, número de computadoras afectadas y si la clase pedagógica se encuentra detenida..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs"
              />
            </div>

            {/* Smart Triage Suggestion Banner if detected */}
            {aiSuggestion && aiSuggestion.suggested !== selectedPriority && (
              <div className="p-3 rounded-lg border border-indigo-200 dark:border-indigo-800 bg-indigo-50/70 dark:bg-indigo-950/40 flex items-center justify-between gap-3 text-xs">
                <div className="flex items-center gap-2 text-indigo-950 dark:text-indigo-200">
                  <Sparkles className="w-4 h-4 text-indigo-600 dark:text-indigo-400 shrink-0" />
                  <span>
                    <strong>Sugerencia de Triaje Automatizado:</strong> Basado en los términos descritos, se recomienda prioridad{' '}
                    <strong className="underline">
                      {PRIORITY_CONFIGS[aiSuggestion.suggested].label} ({PRIORITY_CONFIGS[aiSuggestion.suggested].englishLabel})
                    </strong>
                    . {aiSuggestion.reason}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedPriority(aiSuggestion.suggested)}
                  className="shrink-0 px-2.5 py-1 text-xs font-semibold rounded-md bg-indigo-600 hover:bg-indigo-700 text-white transition-colors cursor-pointer"
                >
                  Aplicar {PRIORITY_CONFIGS[aiSuggestion.suggested].label}
                </button>
              </div>
            )}
          </div>

          {/* PRIORITY LEVEL SELECTOR COMPONENT (The key prompt requirement) */}
          <div className="pt-2 border-t border-slate-200 dark:border-slate-800">
            <span className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider block mb-3">
              3. Clasificación de Prioridad para Personal de TI (SLA Target)
            </span>
            <PrioritySelector value={selectedPriority} onChange={setSelectedPriority} />
          </div>

          {/* VMware Virtual Environment Specifications */}
          <div className="pt-2 border-t border-slate-200 dark:border-slate-800">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider block">
                4. Especificaciones del Entorno Virtual VMware (Opcional para pruebas)
              </span>
              <label className="flex items-center gap-2 cursor-pointer text-xs">
                <input
                  type="checkbox"
                  checked={includeVMwareDetails}
                  onChange={(e) => setIncludeVMwareDetails(e.target.checked)}
                  className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                />
                <span className="text-slate-600 dark:text-slate-400">
                  Vincular perfil de máquina virtual para testeo automatizado
                </span>
              </label>
            </div>

            {includeVMwareDetails && (
              <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/30 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
                <div>
                  <label className="block text-slate-600 dark:text-slate-400 font-medium mb-1">
                    Hipervisor
                  </label>
                  <select
                    value={vmHypervisor}
                    onChange={(e) =>
                      setVmHypervisor(e.target.value as VMwareEnvironment['hypervisor'])
                    }
                    className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                  >
                    <option value="VMware Workstation Pro 17">VMware Workstation Pro 17</option>
                    <option value="VMware Workstation Pro 16">VMware Workstation Pro 16</option>
                    <option value="VMware ESXi 8.0">VMware ESXi 8.0</option>
                    <option value="VMware ESXi 7.0">VMware ESXi 7.0</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-600 dark:text-slate-400 font-medium mb-1">
                    SO Invitado
                  </label>
                  <select
                    value={vmGuestOS}
                    onChange={(e) => setVmGuestOS(e.target.value as VMwareEnvironment['guestOS'])}
                    className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                  >
                    <option value="Ubuntu Education LTS (AIP)">Ubuntu Education (AIP)</option>
                    <option value="Debian Server (MINEDU Proxy)">Debian Server Proxy</option>
                    <option value="Windows 10 Edu Pro">Windows 10 Edu Pro</option>
                    <option value="Kali Linux (Ciberseguridad)">Kali Ciberseguridad</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-600 dark:text-slate-400 font-medium mb-1">
                    Recursos (vCPU / vRAM)
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="number"
                      min="1"
                      max="16"
                      value={vmVcpu}
                      onChange={(e) => setVmVcpu(Number(e.target.value) || 1)}
                      className="w-1/2 px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-mono"
                      title="vCPUs"
                    />
                    <input
                      type="number"
                      min="1"
                      max="64"
                      value={vmRamGb}
                      onChange={(e) => setVmRamGb(Number(e.target.value) || 2)}
                      className="w-1/2 px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-mono"
                      title="RAM GB"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-slate-600 dark:text-slate-400 font-medium mb-1">
                    VMware Tools
                  </label>
                  <select
                    value={vmToolsStatus}
                    onChange={(e) =>
                      setVmToolsStatus(e.target.value as VMwareEnvironment['vmwareToolsStatus'])
                    }
                    className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                  >
                    <option value="Running (v12.3)">En ejecución (v12.3)</option>
                    <option value="Outdated (v10.1)">Desactualizado (v10.1)</option>
                    <option value="Not Installed">No instalado</option>
                  </select>
                </div>
              </div>
            )}
          </div>

          {/* Footer Actions */}
          <div className="pt-4 border-t border-slate-200 dark:border-slate-800 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="inline-flex items-center gap-2 px-5 py-2 text-xs font-semibold text-white bg-slate-900 dark:bg-white dark:text-slate-900 hover:bg-slate-800 dark:hover:bg-slate-100 rounded-lg transition-colors cursor-pointer shadow-sm"
            >
              <Send className="w-3.5 h-3.5" />
              <span>Registrar Ticket de Soporte</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
