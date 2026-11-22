import React, { useState, useEffect, useCallback } from 'react';
import {
  Share2,
  Globe,
  Copy,
  Check,
  X,
  Users,
  ExternalLink,
  KeyRound,
  Network,
  UserPlus,
  ShieldCheck,
  AlertCircle,
  Loader2,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { UserRole } from '../types/helpdesk';

interface ShareDeployModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUsersChanged?: () => void;
}

interface AdminUserRow {
  id: string;
  username: string;
  nombre: string;
  email: string;
  rol: UserRole;
  rolLabel: string;
  source: 'env' | 'runtime';
}

const ROLE_ENV_CONFIGS = [
  {
    rol: 'ADMIN',
    titulo: 'Administrador / Coordinador NOC',
    permisos: 'Acceso total, reglas de monitoreo, gestión de cuentas y asignación de técnicos.',
    userVar: 'AUTH_ADMIN_USER',
    passVar: 'AUTH_ADMIN_PASSWORD',
  },
  {
    rol: 'TECNICO',
    titulo: 'Especialista de Soporte Técnico TI',
    permisos: 'Alertas sonoras en tiempo real, tickets asignados y monitoreo de equipos.',
    userVar: 'AUTH_TECNICO_USER',
    passVar: 'AUTH_TECNICO_PASSWORD',
  },
  {
    rol: 'DOCENTE',
    titulo: 'Docente de Aula / AIP',
    permisos: 'Registro de tickets manuales y seguimiento de sus reportes.',
    userVar: 'AUTH_DOCENTE_USER',
    passVar: 'AUTH_DOCENTE_PASSWORD',
  },
  {
    rol: 'ALUMNO',
    titulo: 'Estudiante de Laboratorio',
    permisos: 'Reporte de incidencias de aula y consulta de estado.',
    userVar: 'AUTH_ALUMNO_USER',
    passVar: 'AUTH_ALUMNO_PASSWORD',
  },
];

export const ShareDeployModal: React.FC<ShareDeployModalProps> = ({
  isOpen,
  onClose,
  onUsersChanged,
}) => {
  const { currentUser, token } = useAuth();
  const isAdmin = currentUser?.rol === 'ADMIN';

  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [usersList, setUsersList] = useState<AdminUserRow[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);

  // Admin account creation form state
  const [newNombre, setNewNombre] = useState('');
  const [newUsername, setNewUsername] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newRol, setNewRol] = useState<UserRole>('TECNICO');
  const [newPassword, setNewPassword] = useState('');
  const [creating, setCreating] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [formSuccess, setFormSuccess] = useState<string | null>(null);

  const loadUsers = useCallback(async () => {
    if (!isOpen || !isAdmin || !token) return;
    setLoadingUsers(true);
    try {
      const res = await fetch('/api/auth/users', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        if (data?.success && Array.isArray(data.users)) {
          setUsersList(data.users);
        }
      }
    } catch {
      // Silenciar error de red transitorio
    } finally {
      setLoadingUsers(false);
    }
  }, [isOpen, isAdmin, token]);

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  if (!isOpen) return null;

  const sharedAppUrl =
    typeof window !== 'undefined' && window.location.origin
      ? window.location.origin
      : 'https://cibertec-titulacion.vercel.app';

  const copyToClipboard = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token || !isAdmin) return;
    setFormError(null);
    setFormSuccess(null);

    if (newUsername.trim().length < 3) {
      setFormError('El nombre de usuario debe tener al menos 3 caracteres.');
      return;
    }
    if (newNombre.trim().length < 2) {
      setFormError('Ingrese el nombre completo del integrante.');
      return;
    }
    if (newPassword.length < 6) {
      setFormError('La contraseña debe tener al menos 6 caracteres.');
      return;
    }

    setCreating(true);
    try {
      const res = await fetch('/api/auth/users', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          username: newUsername.trim(),
          nombre: newNombre.trim(),
          email: newEmail.trim() || undefined,
          rol: newRol,
          password: newPassword,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data?.success) {
        setFormError(data?.error || 'No se pudo registrar la cuenta.');
        return;
      }

      setFormSuccess(
        `Cuenta creada: "${data.user.username}" (${data.user.rolLabel}). Ya puede iniciar sesión con esa contraseña.`
      );
      setNewNombre('');
      setNewUsername('');
      setNewEmail('');
      setNewPassword('');
      await loadUsers();
      onUsersChanged?.();
    } catch {
      setFormError('No se pudo conectar con el servidor para crear la cuenta.');
    } finally {
      setCreating(false);
    }
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
                <span>Acceso Institucional, Cuentas & Equipo</span>
                <span className="text-[10px] font-mono font-bold bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full">
                  GRUPO 01
                </span>
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Enlace de despliegue y gestión segura de cuentas para roles del sistema.
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

          {/* Admin-only runtime user registration & listing */}
          {isAdmin && (
            <div className="p-4 rounded-xl border-2 border-emerald-200 dark:border-emerald-900/60 bg-emerald-50/40 dark:bg-emerald-950/20 space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <UserPlus className="w-4 h-4 text-emerald-600" />
                  <span className="font-bold text-slate-900 dark:text-white text-sm">
                    2. Registrar Cuenta de Técnico o Usuario (Solo Admin)
                  </span>
                </div>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300 text-[10px] font-bold">
                  <ShieldCheck className="w-3 h-3" />
                  <span>Cifrado scrypt en servidor</span>
                </span>
              </div>

              <p className="text-[11px] text-slate-600 dark:text-slate-400">
                Cree aquí nuevas cuentas (por ejemplo, para el perfil <strong>Técnico TI</strong>) sin necesidad de reiniciar el servidor. Las contraseñas se cifran en memoria de servidor y nunca se exponen en el código.
              </p>

              <form onSubmit={handleCreateUser} className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Nombre Completo *
                  </label>
                  <input
                    type="text"
                    required
                    value={newNombre}
                    onChange={(e) => setNewNombre(e.target.value)}
                    placeholder="Ej: Ing. Leonardo Granados Ortega"
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-xs"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Usuario de Acceso *
                  </label>
                  <input
                    type="text"
                    required
                    value={newUsername}
                    onChange={(e) => setNewUsername(e.target.value)}
                    placeholder="Ej: leonardo"
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-xs font-mono"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Rol Asignado *
                  </label>
                  <select
                    value={newRol}
                    onChange={(e) => setNewRol(e.target.value as UserRole)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-xs font-semibold"
                  >
                    <option value="TECNICO">TECNICO (Soporte TI)</option>
                    <option value="ADMIN">ADMIN (Coordinador NOC)</option>
                    <option value="DOCENTE">DOCENTE (Aula / AIP)</option>
                    <option value="ALUMNO">ALUMNO (Estudiante)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Contraseña (mín. 6 caracteres) *
                  </label>
                  <input
                    type="password"
                    required
                    minLength={6}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Ingrese clave segura"
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-xs"
                  />
                </div>
                <div className="sm:col-span-2 flex flex-col sm:flex-row gap-3 items-stretch sm:items-end">
                  <div className="flex-1">
                    <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Correo Institucional (opcional)
                    </label>
                    <input
                      type="email"
                      value={newEmail}
                      onChange={(e) => setNewEmail(e.target.value)}
                      placeholder="usuario@edudesk.edu.pe"
                      className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-xs"
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={creating}
                    className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 text-white font-bold text-xs inline-flex items-center justify-center gap-1.5 transition-colors cursor-pointer shrink-0"
                  >
                    {creating ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        <span>Registrando...</span>
                      </>
                    ) : (
                      <>
                        <UserPlus className="w-3.5 h-3.5" />
                        <span>Crear Cuenta</span>
                      </>
                    )}
                  </button>
                </div>
              </form>

              {formError && (
                <div className="p-2.5 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-[11px] flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              {formSuccess && (
                <div className="p-2.5 rounded-lg bg-emerald-100 border border-emerald-300 text-emerald-900 text-[11px] flex items-center gap-2 font-semibold">
                  <Check className="w-4 h-4 shrink-0 text-emerald-700" />
                  <span>{formSuccess}</span>
                </div>
              )}

              {/* Active Server Accounts List */}
              <div className="pt-2 border-t border-emerald-200/80 dark:border-emerald-900/40 space-y-2">
                <div className="flex items-center justify-between text-[11px] font-bold text-slate-700 dark:text-slate-300">
                  <span>Cuentas Activas en el Servidor ({usersList.length})</span>
                  {loadingUsers && <span className="text-slate-400 font-normal">Actualizando...</span>}
                </div>
                {usersList.length === 0 ? (
                  <p className="text-[11px] text-slate-500">
                    No se encontraron cuentas registradas aún.
                  </p>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {usersList.map((u) => (
                      <div
                        key={u.id}
                        className="p-2.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex items-center justify-between gap-2"
                      >
                        <div className="min-w-0">
                          <div className="font-bold text-slate-900 dark:text-white truncate">
                            {u.nombre}
                          </div>
                          <div className="text-[10px] text-slate-500 font-mono truncate">
                            @{u.username} · {u.email}
                          </div>
                        </div>
                        <div className="flex flex-col items-end gap-1 shrink-0">
                          <span
                            className={`text-[9px] font-bold px-1.5 py-0.5 rounded font-mono ${
                              u.rol === 'ADMIN'
                                ? 'bg-rose-100 text-rose-700'
                                : u.rol === 'TECNICO'
                                ? 'bg-emerald-100 text-emerald-700'
                                : 'bg-indigo-100 text-indigo-700'
                            }`}
                          >
                            {u.rol}
                          </span>
                          <span className="text-[9px] text-slate-400 font-mono">
                            {u.source === 'env' ? 'ENV' : 'Panel Admin'}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Section 2/3: Roles & Env Configuration (No hardcoded secrets) */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="font-bold text-slate-900 dark:text-white uppercase tracking-wider text-xs flex items-center gap-2">
                <Users className="w-4 h-4 text-indigo-600" />
                <span>{isAdmin ? '3.' : '2.'} Roles del Sistema y Variables de Entorno</span>
              </span>
              <span className="text-[11px] text-slate-500 flex items-center gap-1">
                <KeyRound className="w-3.5 h-3.5 text-emerald-600" />
                <span>Sin credenciales expuestas en código</span>
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {ROLE_ENV_CONFIGS.map((item) => (
                <div
                  key={item.rol}
                  className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-950/40 space-y-2"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-900 dark:text-white text-xs">
                      {item.titulo}
                    </span>
                    <span
                      className={`text-[9px] font-bold px-2 py-0.5 rounded font-mono ${
                        item.rol === 'ADMIN'
                          ? 'bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300'
                          : item.rol === 'TECNICO'
                          ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300'
                          : 'bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300'
                      }`}
                    >
                      {item.rol}
                    </span>
                  </div>

                  <p className="text-[11px] text-slate-600 dark:text-slate-400">
                    {item.permisos}
                  </p>

                  <div className="p-2.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-1 font-mono text-[11px]">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-slate-500">{item.userVar}:</span>
                      <span className="text-slate-800 dark:text-slate-200 font-semibold">
                        &lt;TU_USUARIO&gt;
                      </span>
                    </div>
                    <div className="flex items-center justify-between gap-2 pt-1 border-t border-slate-100 dark:border-slate-800">
                      <span className="text-slate-500">{item.passVar}:</span>
                      <span className="text-indigo-600 dark:text-indigo-400 font-semibold">
                        &lt;TU_CLAVE&gt;
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              Para múltiples cuentas permanentes en despliegue, configure <code className="font-mono text-slate-700 dark:text-slate-300">AUTH_USERS_JSON</code> en las variables de entorno del servidor o Vercel.
            </p>
          </div>

          {/* Section: Componentes de la Arquitectura */}
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
