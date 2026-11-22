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
}

interface StoredAccount extends PublicUser {
  username: string;
  salt: string;
  passwordHash: string;
}

const BOOTSTRAP_FILE = path.join('/tmp', 'edudesk_bootstrap_auth.json');
const SESSION_KEY_FILE = path.join('/tmp', 'edudesk_session_secret.key');

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
  const rolePairs: Array<{ role: UserRole; userKey: string; passKey: string; nameKey: string; emailKey: string }> = [
    { role: 'ADMIN', userKey: 'AUTH_ADMIN_USER', passKey: 'AUTH_ADMIN_PASSWORD', nameKey: 'AUTH_ADMIN_NAME', emailKey: 'AUTH_ADMIN_EMAIL' },
    { role: 'TECNICO', userKey: 'AUTH_TECNICO_USER', passKey: 'AUTH_TECNICO_PASSWORD', nameKey: 'AUTH_TECNICO_NAME', emailKey: 'AUTH_TECNICO_EMAIL' },
    { role: 'DOCENTE', userKey: 'AUTH_DOCENTE_USER', passKey: 'AUTH_DOCENTE_PASSWORD', nameKey: 'AUTH_DOCENTE_NAME', emailKey: 'AUTH_DOCENTE_EMAIL' },
    { role: 'ALUMNO', userKey: 'AUTH_ALUMNO_USER', passKey: 'AUTH_ALUMNO_PASSWORD', nameKey: 'AUTH_ALUMNO_NAME', emailKey: 'AUTH_ALUMNO_EMAIL' },
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
  // Merge env accounts with runtime-created accounts (env takes precedence on conflicts)
  const seen = new Set(
    envAccounts.flatMap((a) => [a.username.toLowerCase(), a.email.toLowerCase()])
  );
  const merged = [...envAccounts];
  for (const acc of bootstrapAccounts) {
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
  return accounts.map((a) => ({
    ...toPublicUser(a),
    username: a.username,
    source: envIds.has(a.id) ? 'env' : 'runtime',
  }));
}

export function createUserByAdmin(input: {
  username: string;
  nombre?: string;
  email?: string;
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
    cargo: meta.cargo,
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
    salt,
    passwordHash: hash,
  };

  saveBootstrapAccounts([account]);
  const publicUser = toPublicUser(account);
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
    salt,
    passwordHash: hash,
  };

  const currentRuntime = loadBootstrapAccounts();
  currentRuntime.push(newAccount);
  saveBootstrapAccounts(currentRuntime);

  const publicUser = toPublicUser(newAccount);
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

  const publicUser = toPublicUser(found);
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

export function getPublicTechnicians(): Array<{ id: string; nombre: string; rol: UserRole; cargo: string }> {
  const { accounts } = getAllActiveAccounts();
  return accounts
    .filter((a) => a.rol === 'TECNICO' || a.rol === 'ADMIN')
    .map((a) => ({
      id: a.id,
      nombre: a.nombre,
      rol: a.rol,
      cargo: a.cargo,
    }));
}
