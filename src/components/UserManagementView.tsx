import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Users,
  ShieldCheck,
  UserPlus,
  Search,
  RefreshCw,
  Phone,
  Mail,
  Edit3,
  Trash2,
  CheckCircle2,
  AlertTriangle,
  Wifi,
  WifiOff,
  Wrench,
  Ticket as TicketIcon,
  X,
  Loader2,
  UserCheck,
  Ban,
  ExternalLink,
} from 'lucide-react';
import { AppUser, Ticket, UserRole } from '../types/helpdesk';

interface ManagedUserRow extends AppUser {
  username: string;
  source: 'env' | 'runtime';
  activo: boolean;
  conectado: boolean;
  lastSeenAt?: string;
}

interface UserManagementViewProps {
  token: string | null;
  currentUser: AppUser | null;
  tickets: Ticket[];
  onSelectTicket: (ticket: Ticket) => void;
  onUsersChanged?: () => void;
}

const ROLE_LABELS: Record<UserRole, string> = {
  ADMIN: 'Administrador / Coordinador',
  TECNICO: 'Técnico TI',
  DOCENTE: 'Docente',
  ALUMNO: 'Alumno',
};

const ROLE_BADGE_CLASSES: Record<UserRole, string> = {
  ADMIN: 'bg-rose-100 text-rose-800 border-rose-200',
  TECNICO: 'bg-emerald-100 text-emerald-800 border-emerald-200',
  DOCENTE: 'bg-indigo-100 text-indigo-800 border-indigo-200',
  ALUMNO: 'bg-sky-100 text-sky-800 border-sky-200',
};

export const UserManagementView: React.FC<UserManagementViewProps> = ({
  token,
  currentUser,
  tickets,
  onSelectTicket,
  onUsersChanged,
}) => {
  const [users, setUsers] = useState<ManagedUserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<'ALL' | UserRole>('ALL');
  const [presenceFilter, setPresenceFilter] = useState<'all' | 'online' | 'free' | 'busy'>('all');

  // Create Modal
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [createForm, setCreateForm] = useState({
    nombre: '',
    username: '',
    email: '',
    telefono: '',
    cargo: '',
    rol: 'TECNICO' as UserRole,
    password: '',
  });
  const [submittingCreate, setSubmittingCreate] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  // Edit Modal
  const [editingUser, setEditingUser] = useState<ManagedUserRow | null>(null);
  const [editForm, setEditForm] = useState({
    nombre: '',
    email: '',
    telefono: '',
    cargo: '',
    rol: 'TECNICO' as UserRole,
    activo: true,
    password: '',
  });
  const [submittingEdit, setSubmittingEdit] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

  // Inline Delete Confirmation
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const loadUsers = useCallback(
    async (silent = false) => {
      if (!token) {
        setLoading(false);
        return;
      }
      if (!silent) setLoading(true);
      try {
        const res = await fetch('/api/auth/users', {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json();
        if (!res.ok || !data?.success) {
          setError(data?.error || 'No se pudo obtener la lista de usuarios.');
          return;
        }
        setUsers(Array.isArray(data.users) ? data.users : []);
        setError(null);
      } catch {
        setError('Error de conexión al consultar las cuentas del sistema.');
      } finally {
        if (!silent) setLoading(false);
      }
    },
    [token]
  );

  useEffect(() => {
    loadUsers(false);
    const timer = setInterval(() => {
      loadUsers(true);
    }, 10000);
    return () => clearInterval(timer);
  }, [loadUsers]);

  // Helper: encuentra tickets activos asignados al usuario/técnico
  const getActiveTicketsForUser = useCallback(
    (u: ManagedUserRow): Ticket[] => {
      const candidates = [u.nombre, u.username, u.email]
        .map((v) => (v || '').trim().toLowerCase())
        .filter(Boolean);

      return tickets
        .filter((t) => {
          if (t.status === 'resolved' || t.status === 'closed') return false;
          const assigned = (t.asignadoA || t.assignedTechnician || '').trim().toLowerCase();
          if (!assigned) return false;
          return candidates.some(
            (c) => assigned === c || assigned.includes(c) || c.includes(assigned)
          );
        })
        .sort((a, b) => {
          const rank = (s: Ticket['status']) =>
            s === 'in_progress' || s === 'vmware_testing' ? 2 : 1;
          return rank(b.status) - rank(a.status);
        });
    },
    [tickets]
  );

  const enrichedUsers = useMemo(() => {
    return users.map((u) => {
      const isSelf = currentUser?.id === u.id;
      const effectiveOnline = u.conectado || isSelf;
      const activeTickets = getActiveTicketsForUser(u);
      return {
        ...u,
        conectado: effectiveOnline,
        activeTickets,
        isFree: activeTickets.length === 0,
      };
    });
  }, [users, currentUser?.id, getActiveTicketsForUser]);

  const stats = useMemo(() => {
    const technicians = enrichedUsers.filter((u) => u.rol === 'TECNICO');
    return {
      total: enrichedUsers.length,
      techTotal: technicians.length,
      techOnline: technicians.filter((u) => u.conectado && u.activo).length,
      techFree: technicians.filter((u) => u.isFree && u.activo).length,
      techBusy: technicians.filter((u) => !u.isFree && u.activo).length,
    };
  }, [enrichedUsers]);

  const filteredUsers = useMemo(() => {
    return enrichedUsers.filter((u) => {
      if (roleFilter !== 'ALL' && u.rol !== roleFilter) return false;
      if (presenceFilter === 'online' && !u.conectado) return false;
      if (presenceFilter === 'free' && !u.isFree) return false;
      if (presenceFilter === 'busy' && u.isFree) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const ticketMatch = u.activeTickets.some(
          (t) => t.code.toLowerCase().includes(q) || t.title.toLowerCase().includes(q)
        );
        const userMatch =
          u.nombre.toLowerCase().includes(q) ||
          u.username.toLowerCase().includes(q) ||
          u.email.toLowerCase().includes(q) ||
          (u.telefono || '').toLowerCase().includes(q) ||
          u.cargo.toLowerCase().includes(q);
        return userMatch || ticketMatch;
      }
      return true;
    });
  }, [enrichedUsers, roleFilter, presenceFilter, searchQuery]);

  const handleOpenEdit = (u: ManagedUserRow) => {
    setEditingUser(u);
    setEditForm({
      nombre: u.nombre,
      email: u.email,
      telefono: u.telefono || '',
      cargo: u.cargo || '',
      rol: u.rol,
      activo: u.activo !== false,
      password: '',
    });
    setEditError(null);
  };

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;
    setCreateError(null);
    setFeedback(null);

    if (createForm.nombre.trim().length < 2) {
      setCreateError('Ingrese el nombre completo del usuario.');
      return;
    }
    if (createForm.username.trim().length < 3) {
      setCreateError('El nombre de usuario debe tener al menos 3 caracteres.');
      return;
    }
    if (createForm.password.trim().length < 6) {
      setCreateError('La contraseña debe tener al menos 6 caracteres.');
      return;
    }

    setSubmittingCreate(true);
    try {
      const res = await fetch('/api/auth/users', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          nombre: createForm.nombre.trim(),
          username: createForm.username.trim(),
          email: createForm.email.trim() || undefined,
          telefono: createForm.telefono.trim() || undefined,
          cargo: createForm.cargo.trim() || undefined,
          rol: createForm.rol,
          password: createForm.password.trim(),
        }),
      });
      const data = await res.json();
      if (!res.ok || !data?.success) {
        setCreateError(data?.error || 'No se pudo registrar el usuario.');
        return;
      }

      setFeedback(
        `Usuario "${data.user.nombre}" (@${data.user.username}) registrado con rol ${data.user.rol}.`
      );
      setIsCreateOpen(false);
      setCreateForm({
        nombre: '',
        username: '',
        email: '',
        telefono: '',
        cargo: '',
        rol: 'TECNICO',
        password: '',
      });
      await loadUsers(true);
      onUsersChanged?.();
    } catch {
      setCreateError('Error de conexión al registrar la cuenta.');
    } finally {
      setSubmittingCreate(false);
    }
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token || !editingUser) return;
    setEditError(null);
    setFeedback(null);

    if (editForm.nombre.trim().length < 2) {
      setEditError('El nombre debe tener al menos 2 caracteres.');
      return;
    }
    if (editForm.password.trim() && editForm.password.trim().length < 6) {
      setEditError('Si cambia la contraseña, debe tener al menos 6 caracteres.');
      return;
    }

    setSubmittingEdit(true);
    try {
      const res = await fetch(`/api/auth/users/${encodeURIComponent(editingUser.id)}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          id: editingUser.id,
          nombre: editForm.nombre.trim(),
          email: editForm.email.trim(),
          telefono: editForm.telefono.trim(),
          cargo: editForm.cargo.trim(),
          rol: editForm.rol,
          activo: editForm.activo,
          password: editForm.password.trim() || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data?.success) {
        setEditError(data?.error || 'No se pudieron guardar los cambios.');
        return;
      }

      setFeedback(`Cuenta "${data.user.nombre}" actualizada correctamente.`);
      setEditingUser(null);
      await loadUsers(true);
      onUsersChanged?.();
    } catch {
      setEditError('Error de conexión al actualizar la cuenta.');
    } finally {
      setSubmittingEdit(false);
    }
  };

  const handleToggleActive = async (u: ManagedUserRow) => {
    if (!token) return;
    setFeedback(null);
    setError(null);
    try {
      const res = await fetch(`/api/auth/users/${encodeURIComponent(u.id)}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          id: u.id,
          activo: !u.activo,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data?.success) {
        setError(data?.error || 'No se pudo cambiar el estado de la cuenta.');
        return;
      }
      setFeedback(
        `Cuenta de "${u.nombre}" ${!u.activo ? 'habilitada' : 'suspendida'} correctamente.`
      );
      await loadUsers(true);
      onUsersChanged?.();
    } catch {
      setError('Error de red al cambiar el estado de la cuenta.');
    }
  };

  const handleDeleteUser = async (u: ManagedUserRow) => {
    if (!token) return;
    setDeletingId(u.id);
    setError(null);
    setFeedback(null);
    try {
      const res = await fetch(`/api/auth/users/${encodeURIComponent(u.id)}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ id: u.id }),
      });
      const data = await res.json();
      if (!res.ok || !data?.success) {
        setError(data?.error || 'No se pudo eliminar la cuenta.');
        return;
      }
      setFeedback(`Cuenta "${u.nombre}" eliminada del sistema.`);
      setConfirmDeleteId(null);
      await loadUsers(true);
      onUsersChanged?.();
    } catch {
      setError('Error de conexión al eliminar la cuenta.');
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="p-5 rounded-2xl bg-white border border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-rose-100 text-rose-800 text-[10px] font-bold uppercase tracking-wider">
              <ShieldCheck className="w-3 h-3" />
              <span>Solo Administrador</span>
            </span>
            <span className="text-xs text-slate-300">·</span>
            <span className="text-xs font-medium text-slate-500">
              Control de Cuentas, Roles y Disponibilidad Técnica
            </span>
          </div>
          <h1 className="text-lg font-bold text-slate-900 mt-1 flex items-center gap-2">
            <Users className="w-5 h-5 text-indigo-600" />
            <span>Gestionar Usuarios y Roles</span>
          </h1>
          <p className="text-xs text-slate-500 mt-0.5 max-w-2xl">
            Registre, modifique y administre las cuentas del personal y usuarios. Supervise en tiempo real quién está conectado, qué ticket atiende cada técnico o si se encuentra libre, junto con su número de contacto.
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => loadUsers(false)}
            className="p-2.5 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700 cursor-pointer"
            title="Actualizar estado de usuarios"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>

          <button
            type="button"
            onClick={() => {
              setCreateError(null);
              setIsCreateOpen(true);
            }}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-xs transition-colors cursor-pointer"
          >
            <UserPlus className="w-4 h-4" />
            <span>Registrar Usuario</span>
          </button>
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {feedback && (
        <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{feedback}</span>
          </div>
          <button
            type="button"
            onClick={() => setFeedback(null)}
            className="text-emerald-700 hover:text-emerald-900 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* KPI Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <button
          type="button"
          onClick={() => {
            setRoleFilter('ALL');
            setPresenceFilter('all');
          }}
          className="p-4 rounded-xl border border-slate-200 bg-white hover:border-slate-300 text-left cursor-pointer transition-all"
        >
          <span className="text-[11px] font-semibold text-slate-500 block">
            Total Cuentas Registradas
          </span>
          <span className="text-2xl font-bold font-mono text-slate-900 mt-1 block">
            {stats.total}
          </span>
          <span className="text-[10px] text-slate-400 mt-0.5 block">
            {stats.techTotal} técnico(s) de soporte
          </span>
        </button>

        <button
          type="button"
          onClick={() => {
            setRoleFilter('TECNICO');
            setPresenceFilter(presenceFilter === 'online' ? 'all' : 'online');
          }}
          className={`p-4 rounded-xl border text-left cursor-pointer transition-all ${
            presenceFilter === 'online'
              ? 'bg-emerald-600 text-white border-emerald-600'
              : 'bg-white border-emerald-200 hover:border-emerald-300'
          }`}
        >
          <span
            className={`text-[11px] font-semibold block ${
              presenceFilter === 'online' ? 'text-emerald-100' : 'text-emerald-700'
            }`}
          >
            Técnicos Conectados
          </span>
          <span className="text-2xl font-bold font-mono mt-1 block">{stats.techOnline}</span>
          <span
            className={`text-[10px] mt-0.5 block ${
              presenceFilter === 'online' ? 'text-emerald-100' : 'text-slate-400'
            }`}
          >
            Sesión activa en vivo
          </span>
        </button>

        <button
          type="button"
          onClick={() => {
            setRoleFilter('TECNICO');
            setPresenceFilter(presenceFilter === 'free' ? 'all' : 'free');
          }}
          className={`p-4 rounded-xl border text-left cursor-pointer transition-all ${
            presenceFilter === 'free'
              ? 'bg-sky-600 text-white border-sky-600'
              : 'bg-white border-sky-200 hover:border-sky-300'
          }`}
        >
          <span
            className={`text-[11px] font-semibold block ${
              presenceFilter === 'free' ? 'text-sky-100' : 'text-sky-700'
            }`}
          >
            Técnicos Libres
          </span>
          <span className="text-2xl font-bold font-mono mt-1 block">{stats.techFree}</span>
          <span
            className={`text-[10px] mt-0.5 block ${
              presenceFilter === 'free' ? 'text-sky-100' : 'text-slate-400'
            }`}
          >
            Sin ticket activo asignado
          </span>
        </button>

        <button
          type="button"
          onClick={() => {
            setRoleFilter('TECNICO');
            setPresenceFilter(presenceFilter === 'busy' ? 'all' : 'busy');
          }}
          className={`p-4 rounded-xl border text-left cursor-pointer transition-all ${
            presenceFilter === 'busy'
              ? 'bg-indigo-600 text-white border-indigo-600'
              : 'bg-white border-indigo-200 hover:border-indigo-300'
          }`}
        >
          <span
            className={`text-[11px] font-semibold block ${
              presenceFilter === 'busy' ? 'text-indigo-100' : 'text-indigo-700'
            }`}
          >
            Atendiendo Tickets
          </span>
          <span className="text-2xl font-bold font-mono mt-1 block">{stats.techBusy}</span>
          <span
            className={`text-[10px] mt-0.5 block ${
              presenceFilter === 'busy' ? 'text-indigo-100' : 'text-slate-400'
            }`}
          >
            Con incidencia asignada
          </span>
        </button>
      </div>

      {/* Filters Toolbar */}
      <div className="p-4 rounded-2xl bg-white border border-slate-200 flex flex-col lg:flex-row lg:items-center justify-between gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Buscar por nombre, usuario, teléfono o código de ticket (TK-...)..."
            className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:border-indigo-500 text-xs text-slate-900 focus:outline-hidden"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2 text-xs">
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value as 'ALL' | UserRole)}
            className="px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 font-semibold text-slate-700 cursor-pointer"
          >
            <option value="ALL">Todos los Roles</option>
            <option value="TECNICO">Técnicos (TECNICO)</option>
            <option value="ADMIN">Administradores (ADMIN)</option>
            <option value="DOCENTE">Docentes (DOCENTE)</option>
            <option value="ALUMNO">Alumnos (ALUMNO)</option>
          </select>

          <select
            value={presenceFilter}
            onChange={(e) =>
              setPresenceFilter(e.target.value as 'all' | 'online' | 'free' | 'busy')
            }
            className="px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 font-semibold text-slate-700 cursor-pointer"
          >
            <option value="all">Cualquier Disponibilidad</option>
            <option value="online">Solo Conectados</option>
            <option value="free">Solo Libres</option>
            <option value="busy">Atendiendo Ticket</option>
          </select>
        </div>
      </div>

      {/* Users & Technicians Roster */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
        <div className="px-5 py-3.5 border-b border-slate-200 bg-slate-50/70 flex flex-wrap items-center justify-between gap-2 text-xs font-semibold text-slate-700">
          <span>Directorio de Usuarios, Roles y Seguimiento en Vivo ({filteredUsers.length})</span>
          <span className="text-[11px] text-slate-400 font-normal">
            Actualización automática de presencia cada 10s
          </span>
        </div>

        {loading && users.length === 0 ? (
          <div className="p-12 text-center text-xs text-slate-500 flex flex-col items-center gap-2">
            <Loader2 className="w-6 h-6 animate-spin text-indigo-600" />
            <span>Cargando directorio de usuarios y disponibilidad...</span>
          </div>
        ) : filteredUsers.length === 0 ? (
          <div className="p-12 text-center text-xs text-slate-500">
            No se encontraron cuentas que coincidan con los filtros seleccionados.
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {filteredUsers.map((u) => {
              const primaryTicket = u.activeTickets[0];
              const extraTickets = u.activeTickets.length > 1 ? u.activeTickets.length - 1 : 0;
              const isSelf = currentUser?.id === u.id;

              return (
                <div
                  key={u.id}
                  className={`p-4 md:px-5 transition-colors flex flex-col lg:flex-row lg:items-center justify-between gap-4 ${
                    !u.activo ? 'bg-slate-50/80 opacity-75' : 'hover:bg-slate-50/70'
                  }`}
                >
                  {/* Column 1: Identity, Role & Contact */}
                  <div className="flex items-start gap-3.5 min-w-0 flex-1">
                    <div className="relative shrink-0">
                      <div
                        className={`w-11 h-11 rounded-xl flex items-center justify-center font-bold text-sm text-white ${
                          u.rol === 'ADMIN'
                            ? 'bg-rose-600'
                            : u.rol === 'TECNICO'
                            ? 'bg-emerald-600'
                            : 'bg-indigo-600'
                        }`}
                      >
                        {u.nombre.charAt(0).toUpperCase()}
                      </div>
                      <span
                        title={u.conectado ? 'Conectado' : 'Desconectado'}
                        className={`absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full border-2 border-white ${
                          u.conectado ? 'bg-emerald-500 animate-pulse' : 'bg-slate-300'
                        }`}
                      />
                    </div>

                    <div className="min-w-0 space-y-1 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-sm font-bold text-slate-900 truncate">
                          {u.nombre}
                        </span>
                        {isSelf && (
                          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-slate-900 text-white">
                            Tú
                          </span>
                        )}
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded border font-mono ${
                            ROLE_BADGE_CLASSES[u.rol]
                          }`}
                        >
                          {u.rol} · {ROLE_LABELS[u.rol]}
                        </span>
                        {!u.activo && (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-rose-100 text-rose-700 border border-rose-200">
                            Suspendido
                          </span>
                        )}
                      </div>

                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500">
                        <span className="font-mono text-slate-700 font-semibold">@{u.username}</span>
                        <span className="inline-flex items-center gap-1">
                          <Mail className="w-3.5 h-3.5 text-slate-400" />
                          <span>{u.email}</span>
                        </span>
                        <span className="text-slate-400">· {u.cargo}</span>
                      </div>

                      {/* Contact Phone & Live Connection */}
                      <div className="flex flex-wrap items-center gap-2 pt-0.5 text-xs">
                        {u.conectado ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200 font-semibold text-[11px]">
                            <Wifi className="w-3 h-3" />
                            <span>Conectado</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 border border-slate-200 font-medium text-[11px]">
                            <WifiOff className="w-3 h-3 text-slate-400" />
                            <span>
                              Desconectado
                              {u.lastSeenAt ? ` · Últ. vez ${u.lastSeenAt}` : ''}
                            </span>
                          </span>
                        )}

                        {u.telefono ? (
                          <a
                            href={`tel:${u.telefono.replace(/\s+/g, '')}`}
                            className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md bg-indigo-50 text-indigo-800 border border-indigo-200 hover:bg-indigo-100 font-mono font-bold text-[11px] transition-colors"
                            title="Llamar / Contactar al usuario"
                          >
                            <Phone className="w-3 h-3 text-indigo-600" />
                            <span>{u.telefono}</span>
                          </a>
                        ) : (
                          <button
                            type="button"
                            onClick={() => handleOpenEdit(u)}
                            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-50 text-amber-800 border border-amber-200 hover:bg-amber-100 text-[11px] font-medium cursor-pointer"
                          >
                            <Phone className="w-3 h-3" />
                            <span>Sin número (Agregar)</span>
                          </button>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Column 2: Active Ticket Assignment / "Libre" */}
                  <div className="lg:w-80 shrink-0">
                    {primaryTicket ? (
                      <div className="p-2.5 rounded-xl bg-indigo-50/70 border border-indigo-200 space-y-1">
                        <div className="flex items-center justify-between gap-2">
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-indigo-800">
                            <Wrench className="w-3 h-3 text-indigo-600" />
                            <span>Atendiendo Ticket</span>
                          </span>
                          <div className="flex items-center gap-1">
                            <span className="font-mono text-[10px] font-bold px-1.5 py-0.5 rounded bg-white text-indigo-900 border border-indigo-200">
                              {primaryTicket.code}
                            </span>
                            {extraTickets > 0 && (
                              <span className="font-mono text-[10px] font-bold px-1.5 py-0.5 rounded bg-indigo-600 text-white">
                                +{extraTickets}
                              </span>
                            )}
                          </div>
                        </div>
                        <p className="text-xs font-semibold text-slate-900 line-clamp-1">
                          {primaryTicket.title}
                        </p>
                        <div className="flex items-center justify-between gap-2 pt-0.5">
                          <span className="text-[10px] text-slate-600">
                            Estado:{' '}
                            <strong className="text-indigo-800">
                              {primaryTicket.status === 'in_progress'
                                ? 'En Progreso'
                                : primaryTicket.status === 'vmware_testing'
                                ? 'En Diagnóstico'
                                : 'Abierto'}
                            </strong>
                          </span>
                          <button
                            type="button"
                            onClick={() => onSelectTicket(primaryTicket)}
                            className="inline-flex items-center gap-1 text-[11px] font-bold text-indigo-700 hover:text-indigo-900 cursor-pointer"
                          >
                            <TicketIcon className="w-3 h-3" />
                            <span>Ver Ticket</span>
                            <ExternalLink className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="p-2.5 rounded-xl bg-emerald-50/70 border border-emerald-200 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <UserCheck className="w-4 h-4 text-emerald-600" />
                          <div>
                            <span className="text-[10px] font-semibold uppercase tracking-wider text-emerald-700 block">
                              Estado de Atención
                            </span>
                            <span className="text-xs font-extrabold text-emerald-900">
                              Libre
                            </span>
                          </div>
                        </div>
                        <span className="px-2.5 py-1 rounded-lg bg-emerald-600 text-white text-[11px] font-bold">
                          Libre
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Column 3: Admin Actions */}
                  <div className="flex items-center gap-1.5 shrink-0 self-end lg:self-center">
                    <button
                      type="button"
                      onClick={() => handleOpenEdit(u)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-100 text-slate-700 text-xs font-semibold transition-colors cursor-pointer"
                    >
                      <Edit3 className="w-3.5 h-3.5 text-indigo-600" />
                      <span>Editar / Rol</span>
                    </button>

                    {!isSelf && (
                      <button
                        type="button"
                        onClick={() => handleToggleActive(u)}
                        title={u.activo ? 'Suspender cuenta' : 'Reactivar cuenta'}
                        className={`p-1.5 rounded-lg border transition-colors cursor-pointer ${
                          u.activo
                            ? 'border-amber-200 bg-amber-50 hover:bg-amber-100 text-amber-700'
                            : 'border-emerald-200 bg-emerald-50 hover:bg-emerald-100 text-emerald-700'
                        }`}
                      >
                        {u.activo ? (
                          <Ban className="w-3.5 h-3.5" />
                        ) : (
                          <CheckCircle2 className="w-3.5 h-3.5" />
                        )}
                      </button>
                    )}

                    {!isSelf && u.source === 'runtime' && (
                      <>
                        {confirmDeleteId === u.id ? (
                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              disabled={deletingId === u.id}
                              onClick={() => handleDeleteUser(u)}
                              className="px-2.5 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-[11px] font-bold cursor-pointer"
                            >
                              {deletingId === u.id ? 'Eliminando...' : 'Confirmar'}
                            </button>
                            <button
                              type="button"
                              onClick={() => setConfirmDeleteId(null)}
                              className="px-2 py-1.5 rounded-lg border border-slate-200 bg-white text-slate-600 text-[11px] cursor-pointer"
                            >
                              No
                            </button>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => setConfirmDeleteId(u.id)}
                            title="Eliminar cuenta"
                            className="p-1.5 rounded-lg border border-rose-200 bg-rose-50 hover:bg-rose-100 text-rose-700 transition-colors cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Modal: Registrar Nuevo Usuario */}
      {isCreateOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs overflow-y-auto">
          <div className="w-full max-w-lg rounded-2xl bg-white border border-slate-200 shadow-2xl overflow-hidden my-6">
            <div className="px-5 py-4 bg-slate-900 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <UserPlus className="w-4 h-4 text-emerald-400" />
                <h3 className="text-sm font-bold">Registrar Nueva Cuenta de Usuario</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsCreateOpen(false)}
                className="p-1 rounded-lg text-slate-300 hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateSubmit} className="p-5 space-y-4 text-xs">
              {createError && (
                <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  <span>{createError}</span>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="sm:col-span-2">
                  <label className="block font-bold text-slate-700 mb-1">
                    Nombre Completo *
                  </label>
                  <input
                    type="text"
                    required
                    value={createForm.nombre}
                    onChange={(e) => setCreateForm({ ...createForm, nombre: e.target.value })}
                    placeholder="Ej: Ing. Leonardo Granados"
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 text-slate-900"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Usuario de Acceso *
                  </label>
                  <input
                    type="text"
                    required
                    value={createForm.username}
                    onChange={(e) => setCreateForm({ ...createForm, username: e.target.value })}
                    placeholder="Ej: leonardo"
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 font-mono text-slate-900"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Número de Contacto (Teléfono) *
                  </label>
                  <input
                    type="tel"
                    required
                    value={createForm.telefono}
                    onChange={(e) => setCreateForm({ ...createForm, telefono: e.target.value })}
                    placeholder="Ej: +51 987 654 321"
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 font-mono text-slate-900"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Rol en Help Desk *
                  </label>
                  <select
                    value={createForm.rol}
                    onChange={(e) =>
                      setCreateForm({ ...createForm, rol: e.target.value as UserRole })
                    }
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white font-semibold text-slate-900 cursor-pointer"
                  >
                    <option value="TECNICO">TECNICO (Soporte TI)</option>
                    <option value="ADMIN">ADMIN (Administrador de Red)</option>
                    <option value="DOCENTE">DOCENTE (Usuario General)</option>
                    <option value="ALUMNO">ALUMNO (Estudiante)</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Contraseña (mín. 6 caracteres) *
                  </label>
                  <input
                    type="password"
                    required
                    minLength={6}
                    value={createForm.password}
                    onChange={(e) => setCreateForm({ ...createForm, password: e.target.value })}
                    placeholder="Clave segura"
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 text-slate-900"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Correo Institucional (opcional)
                  </label>
                  <input
                    type="email"
                    value={createForm.email}
                    onChange={(e) => setCreateForm({ ...createForm, email: e.target.value })}
                    placeholder="usuario@edudesk.edu.pe"
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 text-slate-900"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Cargo / Especialidad (opcional)
                  </label>
                  <input
                    type="text"
                    value={createForm.cargo}
                    onChange={(e) => setCreateForm({ ...createForm, cargo: e.target.value })}
                    placeholder="Ej: Soporte de Redes VLAN"
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 text-slate-900"
                  />
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsCreateOpen(false)}
                  className="px-4 py-2 rounded-lg border border-slate-200 text-slate-700 font-semibold hover:bg-slate-50 cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={submittingCreate}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white font-bold cursor-pointer"
                >
                  {submittingCreate ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Registrando...</span>
                    </>
                  ) : (
                    <>
                      <UserPlus className="w-3.5 h-3.5" />
                      <span>Guardar Usuario</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Modificar Usuario y Rol */}
      {editingUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs overflow-y-auto">
          <div className="w-full max-w-lg rounded-2xl bg-white border border-slate-200 shadow-2xl overflow-hidden my-6">
            <div className="px-5 py-4 bg-slate-900 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Edit3 className="w-4 h-4 text-indigo-400" />
                <h3 className="text-sm font-bold">
                  Modificar Usuario y Rol · @{editingUser.username}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setEditingUser(null)}
                className="p-1 rounded-lg text-slate-300 hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleEditSubmit} className="p-5 space-y-4 text-xs">
              {editError && (
                <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  <span>{editError}</span>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="sm:col-span-2">
                  <label className="block font-bold text-slate-700 mb-1">Nombre Completo *</label>
                  <input
                    type="text"
                    required
                    value={editForm.nombre}
                    onChange={(e) => setEditForm({ ...editForm, nombre: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 text-slate-900"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Correo Institucional *</label>
                  <input
                    type="email"
                    required
                    value={editForm.email}
                    onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 text-slate-900"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Número de Contacto</label>
                  <input
                    type="tel"
                    value={editForm.telefono}
                    onChange={(e) => setEditForm({ ...editForm, telefono: e.target.value })}
                    placeholder="Ej: +51 987 654 321"
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 font-mono text-slate-900"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Rol Asignado *</label>
                  <select
                    value={editForm.rol}
                    onChange={(e) =>
                      setEditForm({ ...editForm, rol: e.target.value as UserRole })
                    }
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white font-semibold text-slate-900 cursor-pointer"
                  >
                    <option value="TECNICO">TECNICO (Soporte TI)</option>
                    <option value="ADMIN">ADMIN (Administrador de Red)</option>
                    <option value="DOCENTE">DOCENTE (Usuario General)</option>
                    <option value="ALUMNO">ALUMNO (Estudiante)</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Cargo / Especialidad</label>
                  <input
                    type="text"
                    value={editForm.cargo}
                    onChange={(e) => setEditForm({ ...editForm, cargo: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 text-slate-900"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block font-bold text-slate-700 mb-1">
                    Restablecer Contraseña (opcional, dejar vacío para mantener)
                  </label>
                  <input
                    type="password"
                    value={editForm.password}
                    onChange={(e) => setEditForm({ ...editForm, password: e.target.value })}
                    placeholder="Nueva contraseña (mín. 6 caracteres)"
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 text-slate-900"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="inline-flex items-center gap-2 font-semibold text-slate-700 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={editForm.activo}
                      onChange={(e) => setEditForm({ ...editForm, activo: e.target.checked })}
                      className="w-4 h-4 accent-indigo-600 rounded cursor-pointer"
                    />
                    <span>Cuenta habilitada para iniciar sesión</span>
                  </label>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setEditingUser(null)}
                  className="px-4 py-2 rounded-lg border border-slate-200 text-slate-700 font-semibold hover:bg-slate-50 cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={submittingEdit}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-slate-900 hover:bg-slate-800 disabled:opacity-60 text-white font-bold cursor-pointer"
                >
                  {submittingEdit ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Guardando...</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                      <span>Guardar Cambios</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
