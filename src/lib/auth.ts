// frontend/src/lib/auth.ts
import { redirect } from 'next/navigation';
import { AppConfigs } from '@/configs';
import { logger } from './logger';
import { jwtDecode } from 'jwt-decode';
import { UserPayload } from '@/types/auth';

// Tipos
export interface UserSession {
  id: number;
  name: string;
  email: string;
  role: string; // Keep as string, validation happens elsewhere if needed
  workspace_id: number;
  job_title?: string | null;
  phone_number?: string | null;
  email_signature?: string | null; // Add email_signature
  avatar?: string | null; // Add avatar field
  iat: number;
  exp: number;
}

// Constantes para el manejo de tokens
const AUTH_TOKEN_KEY = 'auth_token';
const USER_DATA_KEY = 'user_data';

/**
 * Guarda el token de autenticación en localStorage
 * @param token El token JWT de autenticación
 */
export const setAuthToken = (token: string): void => {
  localStorage.setItem(AUTH_TOKEN_KEY, token);
};

/**
 * Recupera el token de autenticación desde localStorage
 * @returns El token JWT o null si no existe
 */
export const getAuthToken = (): string | null => {
  return localStorage.getItem(AUTH_TOKEN_KEY);
};

/**
 * Elimina el token de autenticación de localStorage
 */
export const removeAuthToken = (): void => {
  localStorage.removeItem(AUTH_TOKEN_KEY);
};

/**
 * Verifica si existe un token de autenticación
 * @returns true si el usuario está autenticado, false en caso contrario
 */
export const isAuthenticated = (): boolean => {
  return !!getAuthToken();
};

/**
 * Guarda los datos del usuario en localStorage
 * @param userData Datos del usuario a guardar
 */
export const setUserData = (userData: Record<string, unknown>): void => {
  localStorage.setItem(USER_DATA_KEY, JSON.stringify(userData));
};

/**
 * Recupera los datos del usuario desde localStorage
 * @returns Datos del usuario o null si no existen
 */
export const getUserData = (): Record<string, unknown> | null => {
  const userData = localStorage.getItem(USER_DATA_KEY);
  return userData ? JSON.parse(userData) : null;
};

/**
 * Elimina los datos del usuario de localStorage
 */
export const removeUserData = (): void => {
  localStorage.removeItem(USER_DATA_KEY);
};

/**
 * Maneja el proceso completo de logout
 */
export const handleLogout = (): void => {
  // Limpiar el historial de navegación para prevenir volver al dashboard
  window.history.pushState(null, '', '/signin');

  // Eliminar tokens y datos de usuario
  removeAuthToken();
  removeUserData();

  // Limpiar cualquier otra data en localStorage/sessionStorage
  sessionStorage.clear();

  // Redirigir al usuario a la página de login
  window.location.replace('/signin');
};

// Obtener usuario actual
export const getCurrentUser = async (): Promise<UserSession | null> => {
  try {
    const token = getAuthToken();
    if (!token) return null;

    const userData = decodeToken(token);
    if (!userData) return null;

    // Convert workspace_id to number if it's a string (from JWT)
    let workspaceId: number;
    if (typeof userData.workspace_id === 'number') {
      workspaceId = userData.workspace_id;
    } else if (typeof userData.workspace_id === 'string') {
      workspaceId = parseInt(userData.workspace_id, 10);
      if (isNaN(workspaceId)) {
        logger.error('Invalid workspace_id in token:', userData.workspace_id);
        return null;
      }
    } else {
      logger.error('workspace_id is missing or invalid in token:', userData.workspace_id);
      return null;
    }

    // Convertir UserPayload a UserSession con valores predeterminados
    // Include new fields, defaulting to null if not present in token
    return {
      id: Number(userData.sub || 0),
      name: userData.name || 'Usuario Enque',
      email: userData.email || 'usuario@enque.cc',
      role: userData.role || 'user',
      workspace_id: workspaceId, // Use converted workspace_id
      job_title: userData.job_title || null,
      phone_number: userData.phone_number || null,
      email_signature: userData.email_signature || null, // Add email_signature
      avatar: userData.avatar || null, // Add avatar field
      iat: userData.iat || 0,
      exp: userData.exp || 0,
    };
  } catch (error) {
    logger.error(
      'Error getting current user',
      error instanceof Error ? error.message : 'Unknown error'
    );
    return null;
  }
};

// Redirect to login if not authenticated
export const redirectToLogin = () => {
  if (typeof window === 'undefined') return;

  if (!isAuthenticated()) {
    redirect(AppConfigs.routes.signin);
  }
};

// Redirect to dashboard if already authenticated
export const redirectIfAuthenticated = () => {
  if (typeof window === 'undefined') return;

  if (isAuthenticated()) {
    redirect(AppConfigs.routes.dashboard);
  }
};

// Agregar funciones de manejo de historia para navegación
export const setupHistoryProtection = () => {
  // Solo ejecutar en el cliente
  if (typeof window === 'undefined') return;

  const checkAndRedirect = () => {
    // Si estamos autenticados y en una página de auth, redirigir al dashboard
    if (
      isAuthenticated() &&
      (window.location.pathname === '/signin' || window.location.pathname === '/register')
    ) {
      console.log('Redirecting from auth page to dashboard due to active session');
      window.location.replace(AppConfigs.routes.dashboard);
      return true;
    }
    return false;
  };

  // Interceptar eventos de navegación para evitar volver a páginas de autenticación
  const handlePopState = () => {
    checkAndRedirect();
  };

  // Limpiar los listeners anteriores para evitar duplicados
  window.removeEventListener('popstate', handlePopState);

  // Agregar listener para navegación por historial
  window.addEventListener('popstate', handlePopState);

  // Verificar situación inicial al cargar la página
  return checkAndRedirect();
};

// Decodificar token para obtener información del usuario
export const decodeToken = (token: string): UserPayload | null => {
  try {
    const decoded = jwtDecode<UserPayload>(token);

    if (!decoded.sub || decoded.sub === 'undefined') {
      console.warn('Token decodificado con ID inválido', decoded);
    }

    return decoded;
  } catch (error) {
    console.error('Failed to decode token:', error);
    return null;
  }
};
