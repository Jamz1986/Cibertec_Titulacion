import React, { createContext, useContext, useState, useEffect } from 'react';
import { AppUser, UserRole } from '../types/helpdesk';

export interface TeamMemberAccount extends AppUser {
  username: string;
  password: string;
  especialidad: string;
}

// Cuentas oficiales de los 4 miembros autores del proyecto de titulación CIBERTEC 2026
export const TEAM_MEMBERS: TeamMemberAccount[] = [
  {
    id: 'usr-jhinojosa',
    username: 'jhinojosa',
    nombre: 'Josealejandro Jhojan Hinojosa Quispe',
    email: 'jhinojosa@cibertec.edu.pe',
    password: 'hinojosa2026',
    rol: 'ADMIN',
    rolLabel: 'Jefe de Proyecto / SysAdmin NOC & Zabbix',
    institucionSede: 'Centro de Operaciones de Red (NOC) - DRELM',
    ugel: 'UGEL 03',
    departamento: 'Jefatura de Redes y Telecomunicaciones',
    cargo: 'Jefe de Proyecto / Administrador NOC Zabbix & VMware',
    especialidad: 'Administración de Redes y Comunicaciones',
  },
  {
    id: 'usr-lgranados',
    username: 'lgranados',
    nombre: 'Leonardo Ruben Granados Ortega',
    email: 'lgranados@cibertec.edu.pe',
    password: 'granados2026',
    rol: 'TECNICO',
    rolLabel: 'Analista de Infraestructura TI & Soporte VMware',
    institucionSede: 'Mesa de Ayuda TI - UGEL 03 / CIBERTEC',
    ugel: 'UGEL 03',
    departamento: 'Área de Soporte Técnico y Virtualización',
    cargo: 'Especialista en Infraestructura VMware & Help Desk',
    especialidad: 'Administración de Redes y Comunicaciones',
  },
  {
    id: 'usr-rfonseca',
    username: 'rfonseca',
    nombre: 'Renzo Erick Fonseca Vilchez',
    email: 'rfonseca@cibertec.edu.pe',
    password: 'fonseca2026',
    rol: 'ADMIN',
    rolLabel: 'Analista de Redes y Telecomunicaciones (Packet Tracer)',
    institucionSede: 'Laboratorio de Redes y Enrutamiento Cisco',
    ugel: 'UGEL 03',
    departamento: 'Diseño de Redes & Ciberseguridad Perimetral',
    cargo: 'Analista de Redes Cisco / Packet Tracer & SNMPv3',
    especialidad: 'Administración de Redes y Comunicaciones',
  },
  {
    id: 'usr-mgonzales',
    username: 'mgonzales',
    nombre: 'Maria Soledad Gonzales Lozano',
    email: 'mgonzales@cibertec.edu.pe',
    password: 'gonzales2026',
    rol: 'TECNICO',
    rolLabel: 'Analista Desarrolladora de Software & Gestión de BD',
    institucionSede: 'Área de Desarrollo e Integración Web - CIBERTEC',
    ugel: 'UGEL 03',
    departamento: 'Ingeniería de Software & Arquitectura de Datos',
    cargo: 'Desarrolladora Backend Java/Spring Boot & Base de Datos',
    especialidad: 'Computación e Informática',
  },
];

export const PRESET_ACCOUNTS: AppUser[] = TEAM_MEMBERS;

interface AuthContextType {
  currentUser: TeamMemberAccount | null;
  isAuthenticated: boolean;
  login: (identifier: string, password: string) => { success: boolean; error?: string };
  logout: () => void;
  hasRole: (roles: UserRole[]) => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const AUTH_STORAGE_KEY = 'cibertec_helpdesk_auth_member';

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<TeamMemberAccount | null>(() => {
    try {
      const saved = sessionStorage.getItem(AUTH_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        const found = TEAM_MEMBERS.find((u) => u.id === parsed.id);
        if (found) return found;
      }
    } catch {
      // fallback
    }
    return null;
  });

  useEffect(() => {
    if (currentUser) {
      sessionStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(currentUser));
    } else {
      sessionStorage.removeItem(AUTH_STORAGE_KEY);
      localStorage.removeItem(AUTH_STORAGE_KEY);
    }
  }, [currentUser]);

  const login = (identifier: string, password: string): { success: boolean; error?: string } => {
    const cleanId = identifier.trim().toLowerCase();
    const cleanPass = password.trim();

    if (!cleanId) {
      return { success: false, error: 'Por favor ingrese su usuario o correo institucional.' };
    }
    if (!cleanPass) {
      return { success: false, error: 'Por favor ingrese su contraseña.' };
    }

    const member = TEAM_MEMBERS.find(
      (m) =>
        m.username.toLowerCase() === cleanId ||
        m.email.toLowerCase() === cleanId
    );

    if (!member) {
      return {
        success: false,
        error: 'Usuario no registrado. Utilice las credenciales oficiales de los 4 miembros del proyecto.',
      };
    }

    if (member.password !== cleanPass) {
      return {
        success: false,
        error: 'Contraseña incorrecta. Verifique sus credenciales institucionales.',
      };
    }

    setCurrentUser(member);
    return { success: true };
  };

  const logout = () => {
    setCurrentUser(null);
  };

  const hasRole = (roles: UserRole[]): boolean => {
    if (!currentUser) return false;
    return roles.includes(currentUser.rol);
  };

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        isAuthenticated: !!currentUser,
        login,
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
