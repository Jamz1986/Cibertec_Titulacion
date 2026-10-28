import React, { useState } from 'react';
import {
  Share2,
  Globe,
  Copy,
  Check,
  X,
  Users,
  ShieldCheck,
  ExternalLink,
  KeyRound,
  Network,
  Server
} from 'lucide-react';
import { TEAM_MEMBERS } from '../context/AuthContext';

interface ShareDeployModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ShareDeployModal: React.FC<ShareDeployModalProps> = ({ isOpen, onClose }) => {
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  if (!isOpen) return null;

  const sharedAppUrl = 'https://ais-pre-kzl72i7vitrkbyopieu6nv-542924610480.us-east1.run.app';

  const copyToClipboard = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs overflow-y-auto">
      <div className="relative w-full max-w-3xl bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden my-6">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-indigo-600 text-white flex items-center justify-center shadow-xs">
              <Share2 className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <span>Acceso Institucional & Credenciales del Equipo</span>
                <span className="text-[10px] font-mono font-bold bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full">
                  GRUPO 01
                </span>
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Credenciales de acceso para los 4 integrantes del proyecto de titulación CIBERTEC.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-6 max-h-[80vh] overflow-y-auto text-xs">
          
          {/* Section 1: Live Cloud URL */}
          <div className="p-4 rounded-xl border border-indigo-200 dark:border-indigo-900/60 bg-gradient-to-br from-indigo-50/60 to-white dark:from-indigo-950/30 dark:to-slate-900 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Globe className="w-4 h-4 text-indigo-600" />
                <span className="font-bold text-slate-900 dark:text-white text-sm">
                  1. Enlace Web del Sistema en Línea
                </span>
              </div>
              <span className="text-[11px] text-slate-500">Acceso institucional activo</span>
            </div>

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 bg-white dark:bg-slate-800 p-2.5 rounded-lg border border-slate-300 dark:border-slate-700 font-mono text-xs">
              <span className="flex-1 text-indigo-600 dark:text-indigo-400 font-semibold truncate select-all px-1">
                {sharedAppUrl}
              </span>
              <div className="flex items-center gap-1.5 shrink-0">
                <button
                  onClick={() => copyToClipboard(sharedAppUrl, 'shared-url')}
                  className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-md transition-colors cursor-pointer flex items-center gap-1 text-xs"
                >
                  {copiedKey === 'shared-url' ? (
                    <>
                      <Check className="w-3.5 h-3.5" />
                      <span>¡Copiado!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span>Copiar Enlace</span>
                    </>
                  )}
                </button>
                <a
                  href={sharedAppUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="p-1.5 border border-slate-300 dark:border-slate-600 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-md text-slate-600 dark:text-slate-300 transition-colors"
                  title="Abrir en nueva pestaña"
                >
                  <ExternalLink className="w-4 h-4" />
                </a>
              </div>
            </div>
          </div>

          {/* Section 2: Credenciales de los 4 Miembros */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="font-bold text-slate-900 dark:text-white uppercase tracking-wider text-xs flex items-center gap-2">
                <Users className="w-4 h-4 text-indigo-600" />
                <span>2. Credenciales de Acceso Oficiales (4 Miembros)</span>
              </span>
              <span className="text-[11px] text-slate-500">
                Ingreso protegido por contraseña
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {TEAM_MEMBERS.map((member) => (
                <div
                  key={member.id}
                  className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-950/40 space-y-2.5"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-900 dark:text-white text-xs">
                      {member.nombre}
                    </span>
                    <span
                      className={`text-[9px] font-bold px-2 py-0.5 rounded font-mono ${
                        member.rol === 'ADMIN'
                          ? 'bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300'
                          : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300'
                      }`}
                    >
                      {member.rol}
                    </span>
                  </div>

                  <p className="text-[11px] text-slate-600 dark:text-slate-400">
                    {member.cargo}
                  </p>

                  <div className="p-2.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-1 font-mono text-[11px]">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-500">Usuario:</span>
                      <span className="text-slate-900 dark:text-slate-100 font-bold">
                        {member.username}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-500">Correo:</span>
                      <span className="text-slate-700 dark:text-slate-300">
                        {member.email}
                      </span>
                    </div>
                    <div className="flex items-center justify-between pt-1 border-t border-slate-100 dark:border-slate-800">
                      <span className="text-slate-500">Contraseña:</span>
                      <span className="text-indigo-600 dark:text-indigo-400 font-bold select-all">
                        {member.password}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Section 3: Componentes de la Arquitectura */}
          <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/40 dark:bg-slate-950/30 text-slate-600 dark:text-slate-400 space-y-2">
            <div className="flex items-center gap-2 font-semibold text-slate-800 dark:text-slate-200">
              <Network className="w-4 h-4 text-indigo-500" />
              <span>Infraestructura Integrada del Proyecto</span>
            </div>
            <p className="text-[11px] leading-relaxed">
              • <strong>Cisco Packet Tracer (TOPOLOGIA.pkt):</strong> 4 VLANs (10, 20, 30, 40) diseñadas por Renzo Fonseca.<br />
              • <strong>Zabbix Server 7.0:</strong> Desplegado en Ubuntu 22.04 LTS (192.168.40.10) por Josealejandro Hinojosa.<br />
              • <strong>VMware Sandbox ESXi 7.0:</strong> Host virtualizado para pruebas de clones por Leonardo Granados.<br />
              • <strong>Backend & BD MySQL:</strong> Arquitectura relacional y API de tickets por Maria Gonzales.
            </p>
          </div>

        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 flex items-center justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold transition-colors cursor-pointer"
          >
            Cerrar
          </button>
        </div>

      </div>
    </div>
  );
};
