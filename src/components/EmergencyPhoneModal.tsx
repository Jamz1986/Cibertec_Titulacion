import React, { useState, useEffect } from 'react';
import {
  Phone,
  PhoneCall,
  PhoneOff,
  User,
  Building,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Radio,
  X,
  Volume2,
  FileText,
  ShieldCheck,
  Send,
  ZapOff,
} from 'lucide-react';
import { Ticket, UGELCode } from '../types/helpdesk';

export interface SchoolContact {
  id: string;
  schoolName: string;
  ugel: UGELCode;
  role: string;
  name: string;
  phone: string;
  landline?: string;
  notes: string;
  isPrimary: boolean;
}

export const SCHOOL_EMERGENCY_DIRECTORY: SchoolContact[] = [
  {
    id: 'contact-1',
    schoolName: 'I.E. Antenor Orrego Espinoza',
    ugel: 'UGEL 05',
    role: 'Director General',
    name: 'Mg. Roberto Salazar Campos',
    phone: '+51 987 654 321',
    landline: '01 376-8921',
    notes: 'Disponible 24/7 para emergencias institucionales y siniestros de infraestructura.',
    isPrimary: true,
  },
  {
    id: 'contact-2',
    schoolName: 'I.E. Antenor Orrego Espinoza',
    ugel: 'UGEL 05',
    role: 'Coordinador CIST (AIP)',
    name: 'Prof. Juan Paredes Córdova',
    phone: '+51 976 543 210',
    notes: 'Responsable técnico en sitio del aula de cómputo y racks de comunicación.',
    isPrimary: false,
  },
  {
    id: 'contact-3',
    schoolName: 'I.E. Canto Grande',
    ugel: 'UGEL 05',
    role: 'Directora',
    name: 'Lic. María Elena Cruz',
    phone: '+51 992 114 558',
    landline: '01 388-4420',
    notes: 'Sede vecina afectada por el mismo alimentador eléctrico SJL-04.',
    isPrimary: true,
  },
  {
    id: 'contact-4',
    schoolName: 'I.E. Nicolás Copérnico',
    ugel: 'UGEL 05',
    role: 'Director',
    name: 'Dr. Jorge Huamán Peña',
    phone: '+51 945 882 103',
    notes: 'Sede afectada en cuadrante San Juan de Lurigancho Norte.',
    isPrimary: true,
  },
  {
    id: 'contact-5',
    schoolName: 'I.E. Gran Unidad Alfonso Ugarte',
    ugel: 'UGEL 03',
    role: 'Director General',
    name: 'Dr. Hernán Morales Vela',
    phone: '+51 981 223 344',
    landline: '01 440-1299',
    notes: 'Contacto principal para eventos de conectividad troncal Salaverry-Brasil.',
    isPrimary: true,
  },
  {
    id: 'contact-6',
    schoolName: 'I.E. 6048 Jorge Basadre',
    ugel: 'UGEL 01',
    role: 'Coordinador CIST',
    name: 'Ing. Carlos Mendoza Rivas',
    phone: '+51 955 771 220',
    notes: 'Responsable de infraestructura y tableros eléctricos escolares en Villa El Salvador.',
    isPrimary: true,
  },
  {
    id: 'contact-7',
    schoolName: 'Enel Distribución Perú',
    ugel: 'UGEL 05',
    role: 'Mesa de Enlace Prioritario Entidades Públicas',
    name: 'Central de Emergencias Eléctricas (Alimentador SJL-04)',
    phone: '01 517-1717',
    notes: 'Línea de prioridad para centros educativos y hospitales durante apagones de media tensión.',
    isPrimary: false,
  },
];

interface EmergencyPhoneModalProps {
  isOpen: boolean;
  onClose: () => void;
  targetSchoolName?: string;
  associatedTicket?: Ticket | null;
  onLogCallToTicket?: (ticketId: string, logMessage: string) => void;
}

export const EmergencyPhoneModal: React.FC<EmergencyPhoneModalProps> = ({
  isOpen,
  onClose,
  targetSchoolName,
  associatedTicket,
  onLogCallToTicket,
}) => {
  if (!isOpen) return null;

  // Filter contacts by target school if specified, or default to matching school
  const defaultSelected =
    SCHOOL_EMERGENCY_DIRECTORY.find((c) =>
      targetSchoolName ? c.schoolName.toLowerCase().includes(targetSchoolName.toLowerCase()) : false
    ) || SCHOOL_EMERGENCY_DIRECTORY[0];

  const [selectedContact, setSelectedContact] = useState<SchoolContact>(defaultSelected);
  const [callState, setCallState] = useState<'IDLE' | 'DIALING' | 'CONNECTED' | 'ENDED'>('IDLE');
  const [callSeconds, setCallSeconds] = useState(0);
  const [dialogStep, setDialogStep] = useState(0);
  const [hasLoggedCall, setHasLoggedCall] = useState(false);

  // Call timer effect
  useEffect(() => {
    let interval: any = null;
    if (callState === 'CONNECTED') {
      interval = setInterval(() => {
        setCallSeconds((s) => s + 1);
      }, 1000);
    } else {
      setCallSeconds(0);
    }
    return () => clearInterval(interval);
  }, [callState]);

  const handleStartCall = () => {
    setCallState('DIALING');
    setDialogStep(1);
    setHasLoggedCall(false);

    // Simulate connecting after 2.5 seconds
    setTimeout(() => {
      setCallState('CONNECTED');
      setDialogStep(2);
    }, 2400);

    // Dialog progress simulation
    setTimeout(() => {
      setDialogStep(3);
    }, 5500);

    setTimeout(() => {
      setDialogStep(4);
    }, 9000);
  };

  const handleEndCall = () => {
    setCallState('ENDED');
  };

  const handleRegisterCallToTicket = () => {
    if (!associatedTicket || !onLogCallToTicket) return;

    const timestamp = new Date().toLocaleTimeString();
    const durationMin = Math.ceil(callSeconds / 60);

    const logEntry = `📞 [LLAMADA TELEFÓNICA DE CONTINGENCIA MINEDU - ${timestamp}]
Interlocutor: ${selectedContact.name} (${selectedContact.role} - ${selectedContact.schoolName})
Teléfono marcado: ${selectedContact.phone}
Duración de llamada: ${callSeconds}s (~${durationMin} min)
Resultado: Confirmación verbal de apagón general de la red eléctrica pública (Enel). El Director constató la ausencia de 220V en tableros y aulas AIP. Alumnos y docentes a salvo en zona segura. Se coordina atención prioritaria con cuadrilla técnica.`;

    onLogCallToTicket(associatedTicket.id, logEntry);
    setHasLoggedCall(true);
  };

  const formatTimer = (sec: number) => {
    const mins = Math.floor(sec / 60);
    const s = sec % 60;
    return `${String(mins).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-xs overflow-y-auto">
      <div className="relative w-full max-w-2xl bg-white rounded-2xl border border-slate-200 shadow-2xl overflow-hidden my-6">
        {/* Header */}
        <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-red-600 text-white flex items-center justify-center shadow-xs">
              <PhoneCall className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <h2 className="text-base font-bold flex items-center gap-2">
                <span>Consola Telefónica de Contingencia MINEDU</span>
                <span className="text-[10px] font-mono font-bold bg-red-500/30 text-red-300 border border-red-500/50 px-2 py-0.5 rounded-full">
                  CANAL DE VOZ PRIORITARIO
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                Comunicación directa por telefonía móvil GSM / fija cuando los datos y la energía están caídos.
              </p>
            </div>
          </div>

          <button
            onClick={() => {
              if (callState === 'CONNECTED' || callState === 'DIALING') {
                handleEndCall();
              }
              onClose();
            }}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-5 text-xs">
          {/* Context Banner */}
          <div className="p-3.5 rounded-xl border border-amber-200 bg-amber-50/70 text-amber-900 flex items-start gap-3">
            <Radio className="w-4 h-4 text-amber-600 shrink-0 mt-0.5 animate-pulse" />
            <div className="space-y-0.5">
              <strong className="block font-bold">
                Protocolo ante Desconexión Silenciosa o Apagón General:
              </strong>
              <p className="text-[11px] text-amber-800 leading-relaxed">
                Si la institución educativa no responde a Zabbix por falta de energía o red, el Administrador del NOC utiliza este directorio para verificar telefónicamente el estado físico de la sede y validar si el siniestro afecta a la manzana o únicamente al aula de innovación.
              </p>
            </div>
          </div>

          {/* Contact Selector */}
          <div className="space-y-2">
            <label className="font-bold text-slate-800 block">
              1. Seleccione la Autoridad Escolar o Contacto de Emergencia a Llamar:
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-48 overflow-y-auto pr-1">
              {SCHOOL_EMERGENCY_DIRECTORY.map((contact) => {
                const isSelected = selectedContact.id === contact.id;
                return (
                  <button
                    key={contact.id}
                    disabled={callState === 'DIALING' || callState === 'CONNECTED'}
                    onClick={() => {
                      setSelectedContact(contact);
                      setCallState('IDLE');
                      setDialogStep(0);
                    }}
                    className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                      isSelected
                        ? 'border-indigo-600 bg-indigo-50/60 ring-1 ring-indigo-500'
                        : 'border-slate-200 hover:border-slate-300 bg-white'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <strong className="text-slate-900 text-xs block leading-tight">
                        {contact.name}
                      </strong>
                      <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-slate-100 text-slate-600">
                        {contact.ugel}
                      </span>
                    </div>
                    <div className="text-[11px] text-indigo-700 font-semibold mt-0.5">
                      {contact.role} · {contact.schoolName}
                    </div>
                    <div className="font-mono text-[11px] text-slate-600 mt-1 flex items-center gap-1 font-bold">
                      <Phone className="w-3 h-3 text-slate-400" />
                      <span>{contact.phone}</span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Call Control Panel */}
          <div className="p-4 rounded-xl border border-slate-200 bg-slate-900 text-white space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-800">
              <div>
                <span className="text-[10px] uppercase tracking-wider text-slate-400 font-bold block">
                  Línea Telefónica Seleccionada
                </span>
                <div className="font-bold text-base text-white">
                  {selectedContact.name}
                </div>
                <div className="text-xs text-indigo-300">
                  {selectedContact.role} · {selectedContact.schoolName}
                </div>
                <div className="text-xs font-mono text-emerald-400 mt-0.5 font-bold">
                  {selectedContact.phone}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2">
                {/* Native tel link */}
                <a
                  href={`tel:${selectedContact.phone.replace(/\s+/g, '')}`}
                  className="px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-xs border border-slate-700 transition-colors flex items-center gap-1.5"
                  title="Abrir marcador telefónico nativo"
                >
                  <Phone className="w-3.5 h-3.5 text-slate-400" />
                  <span>Marcar en Dispositivo</span>
                </a>

                {/* Simulated Call */}
                {callState === 'IDLE' || callState === 'ENDED' ? (
                  <button
                    onClick={handleStartCall}
                    className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-md cursor-pointer transition-colors flex items-center gap-1.5"
                  >
                    <PhoneCall className="w-4 h-4" />
                    <span>Iniciar Llamada de Contingencia</span>
                  </button>
                ) : (
                  <button
                    onClick={handleEndCall}
                    className="px-4 py-2 rounded-lg bg-red-600 hover:bg-red-700 text-white font-bold text-xs shadow-md cursor-pointer transition-colors flex items-center gap-1.5"
                  >
                    <PhoneOff className="w-4 h-4" />
                    <span>Colgar Llamada</span>
                  </button>
                )}
              </div>
            </div>

            {/* Live Interactive Call Simulator State */}
            {callState !== 'IDLE' && (
              <div className="p-3.5 rounded-lg bg-slate-950 border border-slate-800 space-y-3 font-mono text-xs">
                <div className="flex items-center justify-between text-[11px]">
                  <div className="flex items-center gap-2">
                    <span
                      className={`w-2.5 h-2.5 rounded-full ${
                        callState === 'DIALING'
                          ? 'bg-amber-400 animate-ping'
                          : callState === 'CONNECTED'
                          ? 'bg-emerald-500 animate-pulse'
                          : 'bg-slate-500'
                      }`}
                    />
                    <span className="font-bold text-slate-200">
                      {callState === 'DIALING'
                        ? 'Marcando red celular GSM...'
                        : callState === 'CONNECTED'
                        ? `Llamada Activa en Curso · ${formatTimer(callSeconds)}`
                        : 'Llamada Finalizada'}
                    </span>
                  </div>

                  {callState === 'CONNECTED' && (
                    <div className="flex items-center gap-1 text-emerald-400">
                      <Volume2 className="w-3.5 h-3.5" />
                      <span className="text-[10px]">Audio Enlace Seguro</span>
                    </div>
                  )}
                </div>

                {/* Simulated Call Transcript Dialog */}
                <div className="space-y-2 text-[11px] leading-relaxed max-h-48 overflow-y-auto p-2 bg-slate-900/90 rounded border border-slate-800">
                  {dialogStep >= 1 && (
                    <div className="text-slate-400 italic">
                      [Tono de llamada... conectando con la estación base celular de SJL]
                    </div>
                  )}

                  {dialogStep >= 2 && (
                    <div className="p-2 rounded bg-indigo-950/60 border border-indigo-800/60 text-indigo-200 space-y-1">
                      <div className="font-bold text-indigo-300">
                        📞 {selectedContact.name} ({selectedContact.role}):
                      </div>
                      <p>
                        "— ¡Aló! Buenas tardes, habla el Director de la {selectedContact.schoolName}. ¿Con quién tengo el gusto?"
                      </p>
                    </div>
                  )}

                  {dialogStep >= 3 && (
                    <div className="p-2 rounded bg-slate-800/80 border border-slate-700 text-slate-200 space-y-1">
                      <div className="font-bold text-emerald-400">
                        👤 Administrador de Red NOC (Tú):
                      </div>
                      <p>
                        "— Buenas tardes Director. Le llamamos desde el NOC central MINEDU/DRELM. Nuestro sistema de telemetría Zabbix acaba de detectar una desconexión total de energía en su colegio y los centros aledaños. ¿Nos confirma si tienen luz en el colegio?"
                      </p>
                    </div>
                  )}

                  {dialogStep >= 4 && (
                    <div className="p-2 rounded bg-amber-950/60 border border-amber-800/60 text-amber-200 space-y-1">
                      <div className="font-bold text-amber-300">
                        📞 {selectedContact.name} ({selectedContact.role}):
                      </div>
                      <p>
                        "— Sí ingeniero, exactamente. Hace unos 3 minutos se produjo un corte intempestivo de luz en toda la avenida Canto Grande. Las computadoras del aula AIP se apagaron inmediatamente. Los alumnos están tranquilos en el patio por protocolo de seguridad. Agradecemos su llamada tan rápida."
                      </p>
                    </div>
                  )}
                </div>

                {/* Button to register call into the ticket */}
                {associatedTicket && callState === 'CONNECTED' && (
                  <div className="pt-2 flex items-center justify-between border-t border-slate-800">
                    <span className="text-[11px] text-slate-400">
                      Asociar acta verbal al Ticket {associatedTicket.code}:
                    </span>
                    <button
                      disabled={hasLoggedCall}
                      onClick={handleRegisterCallToTicket}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer flex items-center gap-1.5 ${
                        hasLoggedCall
                          ? 'bg-emerald-900 text-emerald-200 border border-emerald-700 cursor-default'
                          : 'bg-indigo-600 hover:bg-indigo-500 text-white'
                      }`}
                    >
                      {hasLoggedCall ? (
                        <>
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                          <span>¡Llamada Registrada en Ticket!</span>
                        </>
                      ) : (
                        <>
                          <Send className="w-3.5 h-3.5" />
                          <span>Registrar Minuta Telefónica</span>
                        </>
                      )}
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs">
          <span className="text-slate-500">
            Canal de Telefonía Satelital / Celular para Contingencias Críticas
          </span>
          <button
            onClick={() => {
              if (callState === 'CONNECTED' || callState === 'DIALING') {
                handleEndCall();
              }
              onClose();
            }}
            className="px-4 py-1.5 bg-slate-800 hover:bg-slate-900 text-white font-semibold rounded-lg transition-colors cursor-pointer"
          >
            Cerrar Consola
          </button>
        </div>
      </div>
    </div>
  );
};
