import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { UserRole } from '../types/helpdesk';
import {
  Server,
  ShieldCheck,
  Wrench,
  Lock,
  Mail,
  ArrowRight,
  CheckCircle2,
  KeyRound,
  Eye,
  EyeOff,
  Info,
  Network,
  UserPlus,
  Loader2,
  Users,
} from 'lucide-react';

export const LoginPortal: React.FC = () => {
  const { login, registerUser, claimInitialAdmin, needsSetup, isAuthLoading } = useAuth();
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');
  const [selectedRole, setSelectedRole] = useState<UserRole>('TECNICO');
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError(null);
    setIsSubmitting(true);

    try {
      const result = needsSetup
        ? await claimInitialAdmin({
            username: identifier,
            password,
          })
        : authMode === 'register'
        ? await registerUser({
            username: identifier,
            rol: selectedRole,
            password,
          })
        : await login(identifier, password);

      if (!result.success) {
        setLoginError(result.error || 'Credenciales inválidas.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-indigo-500 selection:text-white relative overflow-hidden">
      {/* Decorative Grid & Glow Background */}
      <div className="absolute inset-0 bg-[radial-gradient(#1e293b_1px,transparent_1px)] [background-size:24px_24px] opacity-40 pointer-events-none" />
      <div className="absolute top-0 right-1/4 w-96 h-96 bg-indigo-600/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 left-1/4 w-96 h-96 bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />

      {/* Official Institutional Top Bar */}
      <header className="relative z-10 border-b border-slate-800/80 bg-slate-900/60 backdrop-blur-md px-6 py-3.5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 border-r border-slate-700/60 pr-4">
            <span className="w-3 h-3 rounded-full bg-red-600" />
            <span className="w-3 h-3 rounded-full bg-white" />
            <span className="w-3 h-3 rounded-full bg-red-600" />
            <span className="text-xs font-bold text-slate-300 tracking-wider ml-1">
              MINEDU · DRELM
            </span>
          </div>
          <div>
            <span className="text-xs font-semibold text-slate-400">
              Mesa de Ayuda TI & Monitoreo Proactivo
            </span>
            <span className="hidden sm:inline text-xs text-slate-500 ml-2">
              · Instituciones Educativas (Lima Sur)
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2 bg-emerald-950/60 border border-emerald-800/60 px-3 py-1 rounded-full text-[11px] text-emerald-400 font-mono">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span>PORTAL EN LÍNEA · MESA DE AYUDA</span>
        </div>
      </header>

      {/* Main Container */}
      <main className="relative z-10 flex-1 max-w-7xl w-full mx-auto p-6 md:p-10 flex flex-col justify-center">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
          {/* Left Column: Thesis Context & Scope */}
          <div className="lg:col-span-7 space-y-6">
            <div className="space-y-3">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/30 text-indigo-300 text-xs font-medium">
                <Server className="w-3.5 h-3.5 text-indigo-400" />
                <span>IEST Privado CIBERTEC · Diplomado de Titulación 2026</span>
              </div>

              <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight text-white leading-tight">
                Plataforma de Monitoreo de Red, Gestión Predictiva y Automatizada de Incidencias
              </h1>

              <p className="text-sm md:text-base text-slate-400 leading-relaxed">
                Sistema institucional para las Instituciones Educativas de la <strong>Red Escolar</strong> (San Borja, Miraflores, Santiago de Surco, Barranco, Chorrillos, Surquillo y San Luis).
                Optimiza la supervisión continua de la conectividad en Aulas de Innovación Pedagógica (AIP), la atención oportuna de incidencias técnicas y el cumplimiento riguroso de tiempos de respuesta según criticidad.
              </p>
            </div>

            {/* Institutional Scope & Pillars */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
              <div className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800/70 space-y-1">
                <ShieldCheck className="w-4 h-4 text-indigo-400" />
                <p className="text-xs font-bold text-white">Monitoreo Proactivo</p>
                <p className="text-[11px] text-slate-400 leading-relaxed">
                  Supervisión continua de nodos, puertos troncales y disponibilidad de servicios.
                </p>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800/70 space-y-1">
                <Network className="w-4 h-4 text-emerald-400" />
                <p className="text-xs font-bold text-white">Gestión de Redes</p>
                <p className="text-[11px] text-slate-400 leading-relaxed">
                  Segmentación multi-VLAN y telemetría de enlaces en sedes educativas.
                </p>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800/70 space-y-1">
                <Wrench className="w-4 h-4 text-sky-400" />
                <p className="text-xs font-bold text-white">Mesa de Ayuda</p>
                <p className="text-[11px] text-slate-400 leading-relaxed">
                  Atención oportuna de tickets y seguimiento técnico bajo estándares ITIL.
                </p>
              </div>
            </div>
          </div>

          {/* Right Column: Secure Institutional Authentication Card */}
          <div className="lg:col-span-5">
            <div className="bg-slate-900/90 border border-slate-800 rounded-2xl shadow-2xl p-6 md:p-7 backdrop-blur-xl relative space-y-5">
              {/* Box Header */}
              <div className="flex items-center gap-3 pb-4 border-b border-slate-800">
                <div className="w-10 h-10 rounded-xl bg-indigo-600 flex items-center justify-center font-bold text-white shadow-md shadow-indigo-600/30 shrink-0">
                  {needsSetup || authMode === 'register' ? (
                    <UserPlus className="w-5 h-5" />
                  ) : (
                    <Lock className="w-5 h-5" />
                  )}
                </div>
                <div>
                  <h2 className="text-base font-bold text-white">
                    {needsSetup
                      ? 'Configuración Inicial de Administrador'
                      : authMode === 'register'
                      ? 'Crear Acceso por Perfil'
                      : 'Acceso al Sistema de Mesa de Ayuda'}
                  </h2>
                  <p className="text-xs text-slate-400">
                    {needsSetup
                      ? 'Ingrese el usuario y clave inicial para administrar EduDesk'
                      : authMode === 'register'
                      ? 'Registre su usuario para Técnico, Docente o Alumno'
                      : 'Ingrese su usuario o correo y contraseña'}
                  </p>
                </div>
              </div>

              {/* Simple mode switcher when system is already initialized */}
              {!isAuthLoading && !needsSetup && (
                <div className="grid grid-cols-2 gap-1.5 p-1 rounded-xl bg-slate-950 border border-slate-800 text-xs font-semibold">
                  <button
                    type="button"
                    onClick={() => {
                      setAuthMode('login');
                      setLoginError(null);
                    }}
                    className={`py-2 px-3 rounded-lg transition-colors cursor-pointer ${
                      authMode === 'login'
                        ? 'bg-indigo-600 text-white shadow-xs'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    Iniciar Sesión
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setAuthMode('register');
                      setLoginError(null);
                    }}
                    className={`py-2 px-3 rounded-lg transition-colors cursor-pointer ${
                      authMode === 'register'
                        ? 'bg-emerald-600 text-white shadow-xs'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    Crear Perfil / Cuenta
                  </button>
                </div>
              )}

              {isAuthLoading ? (
                <div className="py-10 flex flex-col items-center justify-center gap-3 text-slate-400 text-xs">
                  <Loader2 className="w-6 h-6 animate-spin text-indigo-400" />
                  <span>Verificando estado de autenticación...</span>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-4">
                  {loginError && (
                    <div className="p-3 rounded-xl bg-rose-950/60 border border-rose-800/60 text-rose-300 text-xs flex items-center gap-2">
                      <Info className="w-4 h-4 shrink-0" />
                      <span>{loginError}</span>
                    </div>
                  )}

                  {!needsSetup && authMode === 'register' && (
                    <div>
                      <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                        Perfil del Usuario
                      </label>
                      <div className="relative">
                        <Users className="w-4 h-4 text-slate-500 absolute left-3 top-3 pointer-events-none" />
                        <select
                          value={selectedRole}
                          onChange={(e) => setSelectedRole(e.target.value as UserRole)}
                          className="w-full bg-slate-950 border border-slate-800 focus:border-indigo-500 rounded-xl pl-9 pr-3 py-2.5 text-xs text-white focus:outline-hidden transition-colors cursor-pointer"
                        >
                          <option value="TECNICO">Técnico de Soporte TI (TECNICO)</option>
                          <option value="DOCENTE">Docente de Aula / AIP (DOCENTE)</option>
                          <option value="ALUMNO">Estudiante de Laboratorio (ALUMNO)</option>
                        </select>
                      </div>
                    </div>
                  )}

                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                      Usuario o Correo Institucional
                    </label>
                    <div className="relative">
                      <Mail className="w-4 h-4 text-slate-500 absolute left-3 top-3 pointer-events-none" />
                      <input
                        type="text"
                        value={identifier}
                        onChange={(e) => setIdentifier(e.target.value)}
                        placeholder="usuario@edudesk.edu.pe"
                        className="w-full bg-slate-950 border border-slate-800 focus:border-indigo-500 rounded-xl pl-9 pr-3 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-hidden transition-colors"
                        required
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                      {needsSetup
                        ? 'Contraseña Inicial (mín. 6 caracteres)'
                        : authMode === 'register'
                        ? 'Contraseña Nueva (mín. 4 caracteres)'
                        : 'Contraseña'}
                    </label>
                    <div className="relative">
                      <KeyRound className="w-4 h-4 text-slate-500 absolute left-3 top-3 pointer-events-none" />
                      <input
                        type={showPassword ? 'text' : 'password'}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="••••••••••••"
                        className="w-full bg-slate-950 border border-slate-800 focus:border-indigo-500 rounded-xl pl-9 pr-10 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-hidden font-mono transition-colors"
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-2.5 text-slate-500 hover:text-slate-300 cursor-pointer"
                      >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className={`w-full py-3 px-4 rounded-xl ${
                      authMode === 'register' && !needsSetup
                        ? 'bg-emerald-600 hover:bg-emerald-500 shadow-emerald-600/30'
                        : 'bg-indigo-600 hover:bg-indigo-500 shadow-indigo-600/30'
                    } disabled:opacity-60 text-white font-semibold text-xs transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer mt-2`}
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Validando...</span>
                      </>
                    ) : (
                      <>
                        <span>
                          {needsSetup
                            ? 'Crear Administrador e Ingresar'
                            : authMode === 'register'
                            ? 'Crear Cuenta e Ingresar'
                            : 'Iniciar Sesión en EduDesk'}
                        </span>
                        <ArrowRight className="w-4 h-4" />
                      </>
                    )}
                  </button>
                </form>
              )}

              {/* Institutional Notice */}
              <div className="pt-2 text-[10px] text-slate-500 leading-normal flex items-start gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0 mt-0.5" />
                <span>
                  Autenticación verificada en servidor con control de acceso por roles (DOCENTE, ALUMNO, TECNICO, ADMIN).
                </span>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Institutional Footer */}
      <footer className="relative z-10 border-t border-slate-800/80 bg-slate-950 py-4 px-6 text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>
            Instituto Superior Tecnológico Privado CIBERTEC · Diplomado de Titulación
          </span>
          <span className="font-mono text-[11px] text-slate-400">
            Asesor: Huapaya Vasquez Juan Alberto · Lima, 2026
          </span>
        </div>
      </footer>
    </div>
  );
};
