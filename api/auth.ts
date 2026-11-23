import type { VercelRequest, VercelResponse } from '@vercel/node';
import {
  authenticateUser,
  claimInitialAdmin,
  clearUserPresence,
  createUserByAdmin,
  deleteUserByAdmin,
  getAuthStatus,
  getPublicTechnicians,
  listUsersForAdmin,
  recordUserHeartbeat,
  registerSelfServiceUser,
  updateUserByAdmin,
  UserRole,
  verifyBearerToken,
} from './_auth.js';

export default function handler(req: VercelRequest, res: VercelResponse) {
  const url = String(req.url || '');
  const action = String(req.query?.action || '');

  // GET /api/auth/status
  if (req.method === 'GET' && (url.includes('/status') || action === 'status')) {
    return res.status(200).json(getAuthStatus());
  }

  // GET /api/auth/me
  if (req.method === 'GET' && (url.includes('/me') || action === 'me')) {
    const user = verifyBearerToken(req.headers.authorization as string | undefined);
    if (!user) {
      return res.status(401).json({ success: false, error: 'Sesión no válida o expirada.' });
    }
    return res.status(200).json({ success: true, user });
  }

  // POST /api/auth/heartbeat
  if (req.method === 'POST' && (url.includes('/heartbeat') || action === 'heartbeat')) {
    const user = verifyBearerToken(req.headers.authorization as string | undefined);
    if (!user) {
      return res.status(401).json({ success: false, error: 'Se requiere autenticación.' });
    }
    const presence = recordUserHeartbeat(user);
    return res.status(200).json({ success: true, ...presence });
  }

  // POST /api/auth/logout
  if (req.method === 'POST' && (url.includes('/logout') || action === 'logout')) {
    const user = verifyBearerToken(req.headers.authorization as string | undefined);
    if (user) {
      clearUserPresence(user);
    }
    return res.status(200).json({ success: true });
  }

  // GET /api/auth/users (solo ADMIN)
  if (req.method === 'GET' && (url.includes('/users') || action === 'users')) {
    const user = verifyBearerToken(req.headers.authorization as string | undefined);
    if (!user) {
      return res.status(401).json({ success: false, error: 'Se requiere autenticación.' });
    }
    if (user.rol !== 'ADMIN') {
      return res.status(403).json({ success: false, error: 'Solo el administrador puede gestionar usuarios.' });
    }
    return res.status(200).json({ success: true, users: listUsersForAdmin() });
  }

  // POST /api/auth/users (solo ADMIN)
  if (req.method === 'POST' && (url.includes('/users') || action === 'users')) {
    const user = verifyBearerToken(req.headers.authorization as string | undefined);
    if (!user) {
      return res.status(401).json({ success: false, error: 'Se requiere autenticación.' });
    }
    if (user.rol !== 'ADMIN') {
      return res.status(403).json({ success: false, error: 'Solo el administrador puede crear cuentas.' });
    }
    const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : req.body || {};
    const result = createUserByAdmin({
      username: body.username,
      nombre: body.nombre,
      email: body.email,
      telefono: body.telefono,
      cargo: body.cargo,
      rol: body.rol as UserRole,
      password: body.password,
    });
    return res.status(result.success ? 200 : 400).json(result);
  }

  // PATCH /api/auth/users (solo ADMIN)
  if ((req.method === 'PATCH' || req.method === 'PUT') && (url.includes('/users') || action === 'users')) {
    const user = verifyBearerToken(req.headers.authorization as string | undefined);
    if (!user) {
      return res.status(401).json({ success: false, error: 'Se requiere autenticación.' });
    }
    if (user.rol !== 'ADMIN') {
      return res.status(403).json({ success: false, error: 'Solo el administrador puede modificar cuentas.' });
    }
    const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : req.body || {};
    const targetId = String(req.query?.id || body.id || '').trim();
    const result = updateUserByAdmin(user.id, {
      id: targetId,
      nombre: body.nombre,
      email: body.email,
      telefono: body.telefono,
      cargo: body.cargo,
      rol: body.rol as UserRole | undefined,
      activo: typeof body.activo === 'boolean' ? body.activo : undefined,
      password: body.password,
    });
    return res.status(result.status || (result.success ? 200 : 400)).json(result);
  }

  // DELETE /api/auth/users (solo ADMIN)
  if (req.method === 'DELETE' && (url.includes('/users') || action === 'users')) {
    const user = verifyBearerToken(req.headers.authorization as string | undefined);
    if (!user) {
      return res.status(401).json({ success: false, error: 'Se requiere autenticación.' });
    }
    if (user.rol !== 'ADMIN') {
      return res.status(403).json({ success: false, error: 'Solo el administrador puede eliminar cuentas.' });
    }
    const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : req.body || {};
    const targetId = String(req.query?.id || body.id || '').trim();
    const result = deleteUserByAdmin(user.id, targetId);
    return res.status(result.status || (result.success ? 200 : 400)).json(result);
  }

  // GET /api/technicians
  if (req.method === 'GET' && (url.includes('technicians') || action === 'technicians')) {
    const user = verifyBearerToken(req.headers.authorization as string | undefined);
    if (!user) {
      return res.status(401).json({ success: false, error: 'Se requiere autenticación.' });
    }
    return res.status(200).json({ success: true, technicians: getPublicTechnicians() });
  }

  // POST /api/auth/bootstrap (one-time initial admin claim when no env accounts exist)
  if (req.method === 'POST' && (url.includes('/bootstrap') || action === 'bootstrap')) {
    const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : req.body || {};
    const result = claimInitialAdmin({
      username: body.username,
      nombre: body.nombre,
      email: body.email,
      password: body.password,
    });
    return res.status(result.success ? 200 : 400).json(result);
  }

  // POST /api/auth/register (registro rápido por perfil sin escalación a ADMIN)
  if (req.method === 'POST' && (url.includes('/register') || action === 'register')) {
    const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : req.body || {};
    const result = registerSelfServiceUser({
      username: body.username || body.identifier || '',
      rol: body.rol as UserRole,
      password: body.password || '',
    });
    return res.status(result.status || (result.success ? 200 : 400)).json(result);
  }

  // POST /api/auth/login
  if (req.method === 'POST' && (url.includes('/login') || action === 'login')) {
    const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : req.body || {};
    const result = authenticateUser(body.identifier || body.username || '', body.password || '');
    return res.status(result.success ? 200 : 401).json(result);
  }

  return res.status(405).json({ error: 'Method Not Allowed' });
}
