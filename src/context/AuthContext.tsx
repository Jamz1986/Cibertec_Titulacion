import React, { createContext, useContext, useState, useEffect } from 'react';
import { AppUser, UserRole } from '../types/helpdesk';

interface AuthActionResult {
  success: boolean;
  error?: string;
}

interface ClaimAdminInput {
  username: string;
  nombre?: string;
  email?: string;
  password: string;
}

interface AuthContextType {
  currentUser: AppUser | null;
  token: string | null;
  isAuthenticated: boolean;
  needsSetup: boolean;
  configuredByEnv: boolean;
  isAuthLoading: boolean;
  login: (identifier: string, password: string) => Promise<AuthActionResult>;
  claimInitialAdmin: (input: ClaimAdminInput) => Promise<AuthActionResult>;
  logout: () => void;
  hasRole: (roles: UserRole[]) => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // La sesión y el token se mantienen exclusivamente en memoria del estado React
  const [currentUser, setCurrentUser] = useState<AppUser | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [needsSetup, setNeedsSetup] = useState<boolean>(false);
  const [configuredByEnv, setConfiguredByEnv] = useState<boolean>(false);
  const [isAuthLoading, setIsAuthLoading] = useState<boolean>(true);

  useEffect(() => {
    let active = true;
    const fetchStatus = async () => {
      try {
        const res = await fetch('/api/auth/status');
        if (res.ok && active) {
          const data = await res.json();
          setNeedsSetup(Boolean(data.needsSetup));
          setConfiguredByEnv(Boolean(data.configuredByEnv));
        }
      } catch {
        // Fallback silencioso si el servidor aún está iniciando
      } finally {
        if (active) setIsAuthLoading(false);
      }
    };
    fetchStatus();
    return () => {
      active = false;
    };
  }, []);

  const login = async (identifier: string, password: string): Promise<AuthActionResult> => {
    const cleanId = identifier.trim();
    const cleanPass = password.trim();

    if (!cleanId) {
      return { success: false, error: 'Por favor ingrese su usuario o correo institucional.' };
    }
    if (!cleanPass) {
      return { success: false, error: 'Por favor ingrese su contraseña.' };
    }

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifier: cleanId, password: cleanPass }),
      });
      const data = await res.json();
      if (!res.ok || !data.success || !data.user || !data.token) {
        return {
          success: false,
          error: data.error || 'Usuario o contraseña incorrectos.',
        };
      }
      setCurrentUser(data.user);
      setToken(data.token);
      setNeedsSetup(false);
      return { success: true };
    } catch {
      return {
        success: false,
        error: 'No se pudo conectar con el servicio de autenticación del servidor.',
      };
    }
  };

  const claimInitialAdmin = async (input: ClaimAdminInput): Promise<AuthActionResult> => {
    try {
      const res = await fetch('/api/auth/bootstrap', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
      });
      const data = await res.json();
      if (!res.ok || !data.success || !data.user || !data.token) {
        return {
          success: false,
          error: data.error || 'No se pudo registrar la cuenta administradora inicial.',
        };
      }
      setCurrentUser(data.user);
      setToken(data.token);
      setNeedsSetup(false);
      return { success: true };
    } catch {
      return {
        success: false,
        error: 'Error de red al configurar la cuenta inicial.',
      };
    }
  };

  const logout = () => {
    setCurrentUser(null);
    setToken(null);
  };

  const hasRole = (roles: UserRole[]): boolean => {
    if (!currentUser) return false;
    return roles.includes(currentUser.rol);
  };

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        token,
        isAuthenticated: !!currentUser && !!token,
        needsSetup,
        configuredByEnv,
        isAuthLoading,
        login,
        claimInitialAdmin,
        logout,
        hasRole,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
