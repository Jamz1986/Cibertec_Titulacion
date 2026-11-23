import crypto from 'crypto';
import fs from 'fs';
import path from 'path';

export type UserRole = 'DOCENTE' | 'ALUMNO' | 'TECNICO' | 'ADMIN';

export interface PublicUser {
  id: string;
  nombre: string;
  email: string;
  rol: UserRole;
  rolLabel: string;
  institucionSede: string;
  ugel: string;
  departamento: string;
  cargo: string;
  telefono?: string;
  activo?: boolean;
  conectado?: boolean;
  lastSeenAt?: string;
}

interface StoredAccount extends PublicUser {
  username: string;
  salt: string;
  passwordHash: string;
}

const BOOTSTRAP_FILE = path.join('/tmp', 'edudesk_bootstrap_auth.json');
const PRESENCE_FILE = path.join('/tmp', 'edudesk_presence.json');
const SESSION_KEY_FILE = path.join('/tmp', 'edudesk_session_secret.key');
const PRESENCE_TTL_MS = 60 * 1000;
const memoryPresence = new Map<string, { ts: number; formatted: string }>();

let cachedSessionSecret: string | null = null;

function resolveSessionSecret(): string {
  if (cachedSessionSecret) return cachedSessionSecret;

  const explicit = process.env.AUTH_SESSION_SECRET?.trim();
  if (explicit && !isPlaceholder(explicit)) {
    cachedSessionSecret = explicit;
    return cachedSessionSecret;
  }

  // Derive consistent secret across Vercel Serverless Functions from server-only/deployment env vars
  const envMaterial = [
    process.env.AUTH_USERS_JSON,
    process.env.AUTH_ADMIN_PASSWORD,
    process.env.AUTH_TECNICO_PASSWORD,
    process.env.AUTH_DOCENTE_PASSWORD,
    process.env.AUTH_ALUMNO_PASSWORD,
    process.env.GEMINI_API_KEY,
    process.env.VERCEL_DEPLOYMENT_ID,
    process.env.VERCEL_PROJECT_ID,
    process.env.VERCEL_ORG_ID,
  ]
    .filter((v) => v && !isPlaceholder(v))
    .join('|');

  if (envMaterial) {
    cachedSessionSecret = crypto
      .createHmac('sha256', 'edudesk-session-kdf-v1')
      .update(envMaterial)
      .digest('hex');
    return cachedSessionSecret;
  }

  // Single-host / local fallback persisted in /tmp across processes
  try {
    if (fs.existsSync(SESSION_KEY_FILE)) {
      const existing = fs.readFileSync(SESSION_KEY_FILE, 'utf-8').trim();
      if (existing.length >= 32) {
        cachedSessionSecret = existing;
        return cachedSessionSecret;
      }
    }
    const generated = crypto.randomBytes(32).toString('hex');
    fs.writeFileSync(SESSION_KEY_FILE, generated, 'utf-8');
    cachedSessionSecret = generated;
    return cachedSessionSecret;
  } catch {
    cachedSessionSecret = crypto.randomBytes(32).toString('hex');
    return cachedSessionSecret;
  }
}

function isPlaceholder(val?: string): boolean {
  if (!val) return true;
  const trimmed = val.trim();
  return !trimmed || (trimmed.startsWith('<') && trimmed.endsWith('>'));
}

function hashPassword(password: string, existingSalt?: string): { salt: string; hash: string } {
  const salt = existingSalt || crypto.randomBytes(16).toString('hex');
  const derived = crypto.scryptSync(password, salt, 64).toString('hex');
  return { salt, hash: derived };
}

function verifyPassword(password: string, salt: string, expectedHash: string): boolean {
  const derived = crypto.scryptSync(password, salt, 64);
  const expectedBuf = Buffer.from(expectedHash, 'hex');
  if (derived.length !== expectedBuf.length) return false;
  return crypto.timingSafeEqual(derived, expectedBuf);
}

function formatLimaTimestamp(): string {
  const formatter = new Intl.DateTimeFormat('es-PE', {
    timeZone: 'America/Lima',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });
  const parts = formatter.formatToParts(new Date());
  const map: Record<string, string> = {};
  for (const p of parts) map[p.type] = p.value;
  return `${map.year}-${map.month}-${map.day} ${map.hour}:${map.minute}:${map.second} (GMT-5)`;
}

function loadPresenceMap(): Record<string, { ts: number; formatted: string }> {
  const result: Record<string, { ts: number; formatted: string }> = {};
  try {
    if (fs.existsSync(PRESENCE_FILE)) {
      const parsed = JSON.parse(fs.readFileSync(PRESENCE_FILE, 'utf-8'));
      if (parsed && typeof parsed === 'object') {
        Object.assign(result, parsed);
      }
    }
  } catch {}
  for (const [k, v] of memoryPresence.entries()) {
    if (!result[k] || v.ts > result[k].ts) {
      result[k] = v;
    }
  }
  return result;
}

function savePresenceMap(map: Record<string, { ts: number; formatted: string }>) {
  try {
    fs.writeFileSync(PRESENCE_FILE, JSON.stringify(map), 'utf-8');
  } catch {}
}

export function recordUserHeartbeat(user: { id: string; email?: string }): {
  conectado: boolean;
  lastSeenAt: string;
} {
  const now = Date.now();
  const formatted = formatLimaTimestamp();
  const entry = { ts: now, formatted };
  const map = loadPresenceMap();
  map[user.id] = entry;
  memoryPresence.set(user.id, entry);
  if (user.email) {
    const emailKey = user.email.toLowerCase();
    map[emailKey] = entry;
    memoryPresence.set(emailKey, entry);
  }
  savePresenceMap(map);
  return { conectado: true, lastSeenAt: formatted };
}

export function clearUserPresence(user: { id: string; email?: string }): void {
  const map = loadPresenceMap();
  delete map[user.id];
  memoryPresence.delete(user.id);
  if (user.email) {
    const emailKey = user.email.toLowerCase();
    delete map[emailKey];
    memoryPresence.delete(emailKey);
  }
  savePresenceMap(map);
}

function getPresenceForAccount(acc: { id: string; email: string }): {
  conectado: boolean;
  lastSeenAt?: string;
} {
  const map = loadPresenceMap();
  const rec = map[acc.id] || map[acc.email.toLowerCase()];
  if (!rec) return { conectado: false };
  const isOnline = Date.now() - rec.ts <= PRESENCE_TTL_MS;
  return {
    conectado: isOnline,
    lastSeenAt: rec.formatted,
  };
}

function defaultRoleMeta(rol: UserRole) {
  switch (rol) {
    case 'ADMIN':
      return {
        rolLabel: 'Administrador / Coordinador NOC',
        institucionSede: 'Mesa de Ayuda TI - Sede Central',
        departamento: 'Coordinación de Redes y Mesa de Ayuda',
        cargo: 'Coordinador / Administrador de Red',
      };
    case 'TECNICO':
      return {
        rolLabel: 'Especialista de Soporte Técnico TI',
        institucionSede: 'Mesa de Ayuda TI - Soporte',
        departamento: 'Soporte Técnico e Infraestructura',
        cargo: 'Técnico Especialista TI',
      };
    case 'DOCENTE':
      return {
        rolLabel: 'Docente (Usuario General)',
        institucionSede: 'Institución Educativa - AIP',
        departamento: 'Área Académica / AIP',
        cargo: 'Docente de Aula',
      };
    case 'ALUMNO':
      return {
        rolLabel: 'Estudiante (Usuario General)',
        institucionSede: 'Institución Educativa - Lab',
        departamento: 'Laboratorio de Cómputo',
        cargo: 'Estudiante',
      };
  }
}

function loadEnvAccounts(): StoredAccount[] {
  const accounts: StoredAccount[] = [];

  // 1. JSON array in process.env.AUTH_USERS_JSON
  const rawJson = process.env.AUTH_USERS_JSON;
  if (rawJson && !isPlaceholder(rawJson)) {
    try {
      const parsed = JSON.parse(rawJson);
      if (Array.isArray(parsed)) {
        parsed.forEach((item: any, idx: number) => {
          const username = String(item?.username || item?.user || '').trim();
          const email = String(item?.email || `${username}@edudesk.edu.pe`).trim();
          const password = String(item?.password || '');
          const rol = (['ADMIN', 'TECNICO', 'DOCENTE', 'ALUMNO'].includes(String(item?.rol).toUpperCase())
            ? String(item.rol).toUpperCase()
            : 'TECNICO') as UserRole;
          if (!isPlaceholder(username) && !isPlaceholder(password)) {
            const { salt, hash } = hashPassword(password);
            const meta = defaultRoleMeta(rol);
            accounts.push({
              id: item?.id || `env-usr-${idx + 1}`,
              username,
              email,
              nombre: String(item?.nombre || username),
              rol,
              rolLabel: item?.rolLabel || meta.rolLabel,
              institucionSede: item?.institucionSede || meta.institucionSede,
              ugel: 'Mesa de Ayuda',
              departamento: item?.departamento || meta.departamento,
              cargo: item?.cargo || meta.cargo,
              telefono: item?.telefono ? String(item.telefono).trim() : undefined,
              activo: item?.activo !== false,
              salt,
              passwordHash: hash,
            });
          }
        });
      }
    } catch (err) {
      console.warn('[Auth] Error parsing AUTH_USERS_JSON:', err);
    }
  }

  // 2. Individual role env vars: AUTH_<ROLE>_USER / AUTH_<ROLE>_PASSWORD
  const rolePairs: Array<{ role: UserRole; userKey: string; passKey: string; nameKey: string; emailKey: string; phoneKey: string }> = [
    { role: 'ADMIN', userKey: 'AUTH_ADMIN_USER', passKey: 'AUTH_ADMIN_PASSWORD', nameKey: 'AUTH_ADMIN_NAME', emailKey: 'AUTH_ADMIN_EMAIL', phoneKey: 'AUTH_ADMIN_PHONE' },
    { role: 'TECNICO', userKey: 'AUTH_TECNICO_USER', passKey: 'AUTH_TECNICO_PASSWORD', nameKey: 'AUTH_TECNICO_NAME', emailKey: 'AUTH_TECNICO_EMAIL', phoneKey: 'AUTH_TECNICO_PHONE' },
    { role: 'DOCENTE', userKey: 'AUTH_DOCENTE_USER', passKey: 'AUTH_DOCENTE_PASSWORD', nameKey: 'AUTH_DOCENTE_NAME', emailKey: 'AUTH_DOCENTE_EMAIL', phoneKey: 'AUTH_DOCENTE_PHONE' },
    { role: 'ALUMNO', userKey: 'AUTH_ALUMNO_USER', passKey: 'AUTH_ALUMNO_PASSWORD', nameKey: 'AUTH_ALUMNO_NAME', emailKey: 'AUTH_ALUMNO_EMAIL', phoneKey: 'AUTH_ALUMNO_PHONE' },
  ];

  for (const cfg of rolePairs) {
    const u = process.env[cfg.userKey];
    const p = process.env[cfg.passKey];
    if (!isPlaceholder(u) && !isPlaceholder(p)) {
      const username = String(u).trim();
      const email = !isPlaceholder(process.env[cfg.emailKey])
        ? String(process.env[cfg.emailKey]).trim()
        : username.includes('@')
        ? username
        : `${username}@edudesk.edu.pe`;
      const nombre = !isPlaceholder(process.env[cfg.nameKey])
        ? String(process.env[cfg.nameKey]).trim()
        : username;
      const telefono = !isPlaceholder(process.env[cfg.phoneKey])
        ? String(process.env[cfg.phoneKey]).trim()
        : undefined;
      const { salt, hash } = hashPassword(String(p));
      const meta = defaultRoleMeta(cfg.role);
      accounts.push({
        id: `env-${cfg.role.toLowerCase()}`,
        username,
        email,
        nombre,
        rol: cfg.role,
        rolLabel: meta.rolLabel,
        institucionSede: meta.institucionSede,
        ugel: 'Mesa de Ayuda',
        departamento: meta.departamento,
        cargo: meta.cargo,
        telefono,
        activo: true,
        salt,
        passwordHash: hash,
      });
    }
  }

  return accounts;
}

function loadBootstrapAccounts(): StoredAccount[] {
  try {
    if (fs.existsSync(BOOTSTRAP_FILE)) {
      const raw = fs.readFileSync(BOOTSTRAP_FILE, 'utf-8');
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch {}
  return [];
}

function saveBootstrapAccounts(accounts: StoredAccount[]) {
  try {
    fs.writeFileSync(BOOTSTRAP_FILE, JSON.stringify(accounts, null, 2), 'utf-8');
  } catch (err) {
    console.warn('[Auth] Could not persist bootstrap accounts:', err);
  }
}

function getAllActiveAccounts(): { accounts: StoredAccount[]; configuredByEnv: boolean } {
  const envAccounts = loadEnvAccounts();
  const bootstrapAccounts = loadBootstrapAccounts();
  if (envAccounts.length === 0) {
    return { accounts: bootstrapAccounts, configuredByEnv: false };
  }
  // Runtime modifications saved in bootstrapAccounts override matching env account by id or username
  const runtimeById = new Map(bootstrapAccounts.map((a) => [a.id, a]));
  const runtimeByUser = new Map(bootstrapAccounts.map((a) => [a.username.toLowerCase(), a]));
  const usedRuntimeIds = new Set<string>();

  const merged: StoredAccount[] = envAccounts.map((envAcc) => {
    const override = runtimeById.get(envAcc.id) || runtimeByUser.get(envAcc.username.toLowerCase());
    if (override) {
      usedRuntimeIds.add(override.id);
      return {
        ...envAcc,
        ...override,
        salt: override.salt || envAcc.salt,
        passwordHash: override.passwordHash || envAcc.passwordHash,
      };
    }
    return envAcc;
  });

  const seen = new Set(merged.flatMap((a) => [a.username.toLowerCase(), a.email.toLowerCase()]));
  for (const acc of bootstrapAccounts) {
    if (usedRuntimeIds.has(acc.id)) continue;
    if (!seen.has(acc.username.toLowerCase()) && !seen.has(acc.email.toLowerCase())) {
      merged.push(acc);
      seen.add(acc.username.toLowerCase());
      seen.add(acc.email.toLowerCase());
    }
  }
  return { accounts: merged, configuredByEnv: true };
}

export function getAuthStatus() {
  const { accounts, configuredByEnv } = getAllActiveAccounts();
  return {
    needsSetup: accounts.length === 0,
    configuredByEnv,
    accountCount: accounts.length,
  };
}

export function listUsersForAdmin(): Array<PublicUser & { username: string; source: 'env' | 'runtime' }> {
  const envAccounts = loadEnvAccounts();
  const envIds = new Set(envAccounts.map((a) => a.id));
  const { accounts } = getAllActiveAccounts();
  return accounts.map((a) => {
    const presence = getPresenceForAccount(a);
    return {
      ...toPublicUser(a),
      username: a.username,
      conectado: presence.conectado,
      lastSeenAt: presence.lastSeenAt,
      activo: a.activo !== false,
      source: envIds.has(a.id) ? 'env' : 'runtime',
    };
  });
}

export function createUserByAdmin(input: {
  username: string;
  nombre?: string;
  email?: string;
  telefono?: string;
  cargo?: string;
  rol: UserRole;
  password: string;
}): { success: boolean; error?: string; user?: PublicUser & { username: string } } {
  const username = String(input.username || '').trim();
  const password = String(input.password || '').trim();
  const rol = String(input.rol || 'TECNICO').toUpperCase() as UserRole;

  if (username.length < 3) {
    return { success: false, error: 'El usuario debe tener al menos 3 caracteres.' };
  }
  if (password.length < 6) {
    return { success: false, error: 'La contraseña debe tener al menos 6 caracteres.' };
  }
  if (!['ADMIN', 'TECNICO', 'DOCENTE', 'ALUMNO'].includes(rol)) {
    return { success: false, error: 'Rol inválido. Debe ser ADMIN, TECNICO, DOCENTE o ALUMNO.' };
  }

  const email =
    String(input.email || '').trim() ||
    (username.includes('@') ? username : `${username}@edudesk.edu.pe`);
  const nombre = String(input.nombre || '').trim() || username;
  const telefono = String(input.telefono || '').trim() || undefined;

  const { accounts } = getAllActiveAccounts();
  const exists = accounts.some(
    (a) =>
      a.username.toLowerCase() === username.toLowerCase() ||
      a.email.toLowerCase() === email.toLowerCase()
  );
  if (exists) {
    return { success: false, error: 'Ya existe una cuenta registrada con ese usuario o correo.' };
  }

  const meta = defaultRoleMeta(rol);
  const { salt, hash } = hashPassword(password);
  const newAccount: StoredAccount = {
    id: `usr-${rol.toLowerCase()}-${Date.now()}`,
    username,
    email,
    nombre,
    rol,
    rolLabel: meta.rolLabel,
    institucionSede: meta.institucionSede,
    ugel: 'Mesa de Ayuda',
    departamento: meta.departamento,
    cargo: String(input.cargo || '').trim() || meta.cargo,
    telefono,
    activo: true,
    salt,
    passwordHash: hash,
  };

  const currentRuntime = loadBootstrapAccounts();
  currentRuntime.push(newAccount);
  saveBootstrapAccounts(currentRuntime);

  return {
    success: true,
    user: {
      ...toPublicUser(newAccount),
      username: newAccount.username,
    },
  };
}

export function updateUserByAdmin(
  actorUserId: string,
  input: {
    id: string;
    nombre?: string;
    email?: string;
    telefono?: string;
    cargo?: string;
    rol?: UserRole;
    activo?: boolean;
    password?: string;
  }
): { success: boolean; status?: number; error?: string; user?: PublicUser & { username: string } } {
  const targetId = String(input.id || '').trim();
  if (!targetId) {
    return { success: false, status: 400, error: 'Debe indicar el ID de la cuenta a modificar.' };
  }

  const { accounts } = getAllActiveAccounts();
  const existing = accounts.find((a) => a.id === targetId);
  if (!existing) {
    return { success: false, status: 404, error: 'Cuenta de usuario no encontrada.' };
  }

  const nextRol = input.rol
    ? (String(input.rol).toUpperCase() as UserRole)
    : existing.rol;

  if (!['ADMIN', 'TECNICO', 'DOCENTE', 'ALUMNO'].includes(nextRol)) {
    return { success: false, status: 400, error: 'Rol inválido.' };
  }

  const nextActivo = typeof input.activo === 'boolean' ? input.activo : existing.activo !== false;

  if (existing.id === actorUserId && nextRol !== 'ADMIN') {
    return {
      success: false,
      status: 400,
      error: 'No puede cambiar su propio rol de Administrador mientras mantiene la sesión activa.',
    };
  }
  if (existing.id === actorUserId && !nextActivo) {
    return {
      success: false,
      status: 400,
      error: 'No puede suspender su propia cuenta mientras mantiene la sesión activa.',
    };
  }

  const nextNombre = input.nombre !== undefined ? String(input.nombre).trim() : existing.nombre;
  if (nextNombre.length < 2) {
    return { success: false, status: 400, error: 'El nombre debe tener al menos 2 caracteres.' };
  }

  const nextEmail = input.email !== undefined ? String(input.email).trim() : existing.email;
  if (!nextEmail || !nextEmail.includes('@')) {
    return { success: false, status: 400, error: 'Ingrese un correo institucional válido.' };
  }

  const duplicateEmail = accounts.some(
    (a) => a.id !== existing.id && a.email.toLowerCase() === nextEmail.toLowerCase()
  );
  if (duplicateEmail) {
    return { success: false, status: 409, error: 'Ese correo ya está en uso por otra cuenta.' };
  }

  let nextSalt = existing.salt;
  let nextHash = existing.passwordHash;
  if (input.password !== undefined && String(input.password).trim() !== '') {
    const cleanPass = String(input.password).trim();
    if (cleanPass.length < 6) {
      return { success: false, status: 400, error: 'La nueva contraseña debe tener al menos 6 caracteres.' };
    }
    const hashed = hashPassword(cleanPass);
    nextSalt = hashed.salt;
    nextHash = hashed.hash;
  }

  const meta = defaultRoleMeta(nextRol);
  const rolChanged = nextRol !== existing.rol;

  const updatedAccount: StoredAccount = {
    ...existing,
    nombre: nextNombre,
    email: nextEmail,
    rol: nextRol,
    rolLabel: rolChanged ? meta.rolLabel : existing.rolLabel,
    departamento: rolChanged ? meta.departamento : existing.departamento,
    cargo:
      input.cargo !== undefined && String(input.cargo).trim() !== ''
        ? String(input.cargo).trim()
        : rolChanged
        ? meta.cargo
        : existing.cargo,
    telefono:
      input.telefono !== undefined
        ? String(input.telefono).trim() || undefined
        : existing.telefono,
    activo: nextActivo,
    salt: nextSalt,
    passwordHash: nextHash,
  };

  const currentRuntime = loadBootstrapAccounts();
  const idx = currentRuntime.findIndex(
    (a) => a.id === updatedAccount.id || a.username.toLowerCase() === updatedAccount.username.toLowerCase()
  );
  if (idx !== -1) {
    currentRuntime[idx] = updatedAccount;
  } else {
    currentRuntime.push(updatedAccount);
  }
  saveBootstrapAccounts(currentRuntime);

  const presence = getPresenceForAccount(updatedAccount);
  return {
    success: true,
    status: 200,
    user: {
      ...toPublicUser(updatedAccount),
      username: updatedAccount.username,
      conectado: presence.conectado,
      lastSeenAt: presence.lastSeenAt,
    },
  };
}

export function deleteUserByAdmin(
  actorUserId: string,
  targetId: string
): { success: boolean; status?: number; error?: string } {
  const cleanTargetId = String(targetId || '').trim();
  if (!cleanTargetId) {
    return { success: false, status: 400, error: 'Debe indicar el ID de la cuenta.' };
  }
  if (cleanTargetId === actorUserId) {
    return { success: false, status: 400, error: 'No puede eliminar su propia cuenta activa.' };
  }

  const envAccounts = loadEnvAccounts();
  if (envAccounts.some((a) => a.id === cleanTargetId)) {
    return {
      success: false,
      status: 400,
      error: 'Las cuentas definidas por variables de entorno no se eliminan desde aquí; puede suspenderla o editar sus datos.',
    };
  }

  const currentRuntime = loadBootstrapAccounts();
  const target = currentRuntime.find((a) => a.id === cleanTargetId);
  if (!target) {
    return { success: false, status: 404, error: 'Cuenta no encontrada.' };
  }

  const remaining = currentRuntime.filter((a) => a.id !== cleanTargetId);
  saveBootstrapAccounts(remaining);
  clearUserPresence(target);

  return { success: true, status: 200 };
}

export function claimInitialAdmin(input: {
  username: string;
  nombre?: string;
  email?: string;
  password: string;
}): { success: boolean; error?: string; user?: PublicUser; token?: string } {
  const { accounts, configuredByEnv } = getAllActiveAccounts();
  if (configuredByEnv || accounts.length > 0) {
    return {
      success: false,
      error: 'La cuenta inicial ya fue configurada. Inicie sesión con sus credenciales.',
    };
  }

  const username = String(input.username || '').trim();
  const password = String(input.password || '').trim();
  if (username.length < 3) {
    return { success: false, error: 'El usuario debe tener al menos 3 caracteres.' };
  }
  if (password.length < 6) {
    return { success: false, error: 'La contraseña debe tener al menos 6 caracteres.' };
  }

  const email = String(input.email || '').trim() || (username.includes('@') ? username : `${username}@edudesk.edu.pe`);
  const nombre = String(input.nombre || '').trim() || username;
  const meta = defaultRoleMeta('ADMIN');
  const { salt, hash } = hashPassword(password);

  const account: StoredAccount = {
    id: `boot-admin-${Date.now()}`,
    username,
    email,
    nombre,
    rol: 'ADMIN',
    rolLabel: meta.rolLabel,
    institucionSede: meta.institucionSede,
    ugel: 'Mesa de Ayuda',
    departamento: meta.departamento,
    cargo: meta.cargo,
    activo: true,
    salt,
    passwordHash: hash,
  };

  saveBootstrapAccounts([account]);
  const publicUser = toPublicUser(account);
  recordUserHeartbeat(publicUser);
  return {
    success: true,
    user: publicUser,
    token: signBearerToken(publicUser),
  };
}

export function registerSelfServiceUser(input: {
  username: string;
  rol: UserRole;
  password: string;
}): { success: boolean; status?: number; error?: string; user?: PublicUser; token?: string } {
  const username = String(input.username || '').trim();
  const password = String(input.password || '').trim();
  const rol = String(input.rol || 'TECNICO').toUpperCase() as UserRole;

  if (username.length < 3) {
    return { success: false, status: 400, error: 'El usuario debe tener al menos 3 caracteres.' };
  }
  if (password.length < 4) {
    return { success: false, status: 400, error: 'La contraseña debe tener al menos 4 caracteres.' };
  }
  if (!['ADMIN', 'TECNICO', 'DOCENTE', 'ALUMNO'].includes(rol)) {
    return { success: false, status: 400, error: 'Perfil inválido.' };
  }

  const { accounts } = getAllActiveAccounts();
  if (rol === 'ADMIN' && accounts.length > 0) {
    return {
      success: false,
      status: 403,
      error: 'Ya existe un administrador configurado. Para ingresar como ADMIN use Iniciar Sesión.',
    };
  }

  const email = username.includes('@') ? username : `${username}@edudesk.edu.pe`;
  const exists = accounts.some(
    (a) =>
      a.username.toLowerCase() === username.toLowerCase() ||
      a.email.toLowerCase() === email.toLowerCase()
  );
  if (exists) {
    return {
      success: false,
      status: 409,
      error: 'Ese usuario ya está registrado. Ingrese desde la pestaña Iniciar Sesión.',
    };
  }

  const meta = defaultRoleMeta(rol);
  const { salt, hash } = hashPassword(password);
  const newAccount: StoredAccount = {
    id: `usr-${rol.toLowerCase()}-${Date.now()}`,
    username,
    email,
    nombre: username,
    rol,
    rolLabel: meta.rolLabel,
    institucionSede: meta.institucionSede,
    ugel: 'Mesa de Ayuda',
    departamento: meta.departamento,
    cargo: meta.cargo,
    activo: true,
    salt,
    passwordHash: hash,
  };

  const currentRuntime = loadBootstrapAccounts();
  currentRuntime.push(newAccount);
  saveBootstrapAccounts(currentRuntime);

  const publicUser = toPublicUser(newAccount);
  recordUserHeartbeat(publicUser);
  return {
    success: true,
    status: 200,
    user: publicUser,
    token: signBearerToken(publicUser),
  };
}

export function authenticateUser(
  identifier: string,
  password: string
): { success: boolean; error?: string; user?: PublicUser; token?: string } {
  const cleanId = String(identifier || '').trim().toLowerCase();
  const cleanPass = String(password || '').trim();

  if (!cleanId) {
    return { success: false, error: 'Por favor ingrese su usuario o correo institucional.' };
  }
  if (!cleanPass) {
    return { success: false, error: 'Por favor ingrese su contraseña.' };
  }

  const { accounts } = getAllActiveAccounts();
  if (accounts.length === 0) {
    return {
      success: false,
      error: 'No hay credenciales configuradas en el servidor. Complete la configuración inicial o configure variables de entorno.',
    };
  }

  const found = accounts.find(
    (a) => a.username.toLowerCase() === cleanId || a.email.toLowerCase() === cleanId
  );

  if (!found || !verifyPassword(cleanPass, found.salt, found.passwordHash)) {
    return {
      success: false,
      error: 'Usuario o contraseña incorrectos. Verifique sus credenciales institucionales.',
    };
  }

  if (found.activo === false) {
    return {
      success: false,
      error: 'Esta cuenta se encuentra suspendida por el Administrador de Red.',
    };
  }

  const publicUser = toPublicUser(found);
  recordUserHeartbeat(publicUser);
  return {
    success: true,
    user: publicUser,
    token: signBearerToken(publicUser),
  };
}

function toPublicUser(acc: StoredAccount): PublicUser {
  return {
    id: acc.id,
    nombre: acc.nombre,
    email: acc.email,
    rol: acc.rol,
    rolLabel: acc.rolLabel,
    institucionSede: acc.institucionSede,
    ugel: acc.ugel,
    departamento: acc.departamento,
    cargo: acc.cargo,
    telefono: acc.telefono,
    activo: acc.activo !== false,
  };
}

export function signBearerToken(user: PublicUser): string {
  const payload = {
    user,
    exp: Date.now() + 12 * 60 * 60 * 1000, // 12 hours
  };
  const encoded = Buffer.from(JSON.stringify(payload), 'utf-8').toString('base64url');
  const sig = crypto.createHmac('sha256', resolveSessionSecret()).update(encoded).digest('base64url');
  return `${encoded}.${sig}`;
}

export function verifyBearerToken(authHeader?: string): PublicUser | null {
  if (!authHeader || !authHeader.startsWith('Bearer ')) return null;
  const token = authHeader.slice(7).trim();
  const dotIdx = token.indexOf('.');
  if (dotIdx === -1) return null;

  const encoded = token.slice(0, dotIdx);
  const sig = token.slice(dotIdx + 1);
  if (!encoded || !sig) return null;

  const expectedSig = crypto.createHmac('sha256', resolveSessionSecret()).update(encoded).digest('base64url');
  const sigBuf = Buffer.from(sig);
  const expectedBuf = Buffer.from(expectedSig);
  if (sigBuf.length !== expectedBuf.length || !crypto.timingSafeEqual(sigBuf, expectedBuf)) {
    return null;
  }

  try {
    const decoded = JSON.parse(Buffer.from(encoded, 'base64url').toString('utf-8'));
    if (!decoded?.user || !decoded?.exp || Date.now() > decoded.exp) {
      return null;
    }
    return decoded.user as PublicUser;
  } catch {
    return null;
  }
}

export function getPublicTechnicians(): Array<{
  id: string;
  nombre: string;
  rol: UserRole;
  cargo: string;
  telefono?: string;
  conectado: boolean;
}> {
  const { accounts } = getAllActiveAccounts();
  return accounts
    .filter((a) => (a.rol === 'TECNICO' || a.rol === 'ADMIN') && a.activo !== false)
    .map((a) => {
      const presence = getPresenceForAccount(a);
      return {
        id: a.id,
        nombre: a.nombre,
        rol: a.rol,
        cargo: a.cargo,
        telefono: a.telefono,
        conectado: presence.conectado,
      };
    });
}
