import { AppConfigs } from '@/configs';
import { fetchAPI } from '@/lib/fetch-api';
import { setAuthToken, removeAuthToken } from '@/lib/auth';
import { ServiceResponse } from '@/typescript';
import { logger } from '@/lib/logger';
import { workspaceService } from '@/services/workspace';

// Interfaz para los datos de login
export interface LoginData {
  email: string;
  password: string;
  workspace_id?: number;
  subdomain?: string;
}

// Interfaz para los datos de registro
export interface RegisterData {
  name: string;
  email: string;
  password: string;
  workspace_id?: number;
  subdomain?: string;
}

// Interfaz para la respuesta de token
interface TokenResponse {
  access_token: string;
  token_type: string;
}

// Endpoint del servicio
const SERVICE_ENDPOINT = `${AppConfigs.api}/auth`;

export const authService = {
  // Login
  async login(data: LoginData): Promise<ServiceResponse<TokenResponse>> {
    try {
      // Determinar si estamos en un subdominio
      let subdomain = '';
      let workspaceId: number | undefined;

      if (typeof window !== 'undefined') {
        const hostname = window.location.hostname;
        const isSubdomain = hostname !== AppConfigs.baseUrl && hostname.endsWith(AppConfigs.domain);

        if (isSubdomain) {
          subdomain = hostname.replace(AppConfigs.domain, '');

          try {
            // Intentar obtener el workspace_id a partir del subdominio
            const workspaceResponse = await workspaceService.getWorkspaceBySubdomain(subdomain);
            if (workspaceResponse.success && workspaceResponse.data) {
              workspaceId = workspaceResponse.data.id;
              logger.info(`Workspace ID obtenido para ${subdomain}: ${workspaceId}`);
            }
          } catch (error) {
            logger.error(
              `Error obteniendo workspace_id para ${subdomain}`,
              error instanceof Error ? error.message : 'Unknown error'
            );
          }
        }
      }

      // Si estamos en un subdominio, incluir el subdomain en la petición
      const loginData = { ...data };
      if (subdomain) {
        loginData.subdomain = subdomain;
      }

      // Usamos OAuth2 para login según el backend
      const formData = new URLSearchParams();
      formData.append('username', loginData.email);
      formData.append('password', loginData.password);

      const options: RequestInit = {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: formData,
      };

      // Si tenemos un workspace_id, lo incluimos en el header como número
      if (workspaceId) {
        (options.headers as Record<string, string>)['X-Workspace-Id'] = workspaceId.toString();
      }

      const response = await fetch(`${SERVICE_ENDPOINT}/login`, options);

      if (!response.ok) {
        throw new Error(`Error ${response.status}: ${response.statusText}`);
      }

      const responseData = await response.json();

      if (responseData.access_token) {
        // Guardar token en localStorage
        setAuthToken(responseData.access_token);
        return { success: true, data: responseData };
      } else {
        return { success: false, message: 'Invalid response from server' };
      }
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      return { success: false, message };
    }
  },

  // Registro
  async register(data: RegisterData): Promise<ServiceResponse<TokenResponse>> {
    try {
      // Determinar si estamos en un subdominio
      let workspaceId: number | undefined;

      if (typeof window !== 'undefined') {
        const hostname = window.location.hostname;
        const isSubdomain = hostname !== AppConfigs.baseUrl && hostname.endsWith(AppConfigs.domain);

        if (isSubdomain && data.subdomain) {
          // Intentar obtener el workspace_id a partir del subdominio
          try {
            const workspaceResponse = await workspaceService.getWorkspaceBySubdomain(
              data.subdomain
            );
            if (workspaceResponse.success && workspaceResponse.data) {
              workspaceId = workspaceResponse.data.id;
              logger.info(`Workspace ID obtenido para ${data.subdomain}: ${workspaceId}`);
            }
          } catch (error) {
            logger.error(
              `Error obteniendo workspace_id para ${data.subdomain}`,
              error instanceof Error ? error.message : 'Unknown error'
            );
          }
        }
      }

      // Preparar los datos según el formato esperado por el backend
      const agentData = {
        name: data.name,
        email: data.email,
        password: data.password,
        role: 'agent', // Rol por defecto
        is_active: true,
        workspace_id: workspaceId || 1, // Usar el ID obtenido o valor por defecto
      };

      const response = await fetchAPI.POST<TokenResponse>(
        `${SERVICE_ENDPOINT}/register/agent`,
        agentData as unknown as Record<string, unknown>,
        false
      );

      if (response.success) {
        // En este punto no tenemos token, sólo se ha registrado el usuario
        // La autenticación se hará después del registro
        return { success: true, message: 'Registration successful' };
      }

      return response;
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      return { success: false, message };
    }
  },

  // Logout
  async logout(): Promise<ServiceResponse<null>> {
    try {
      // Intento de logout en el backend (opcional si hay invalidación de tokens)
      await fetchAPI.POST<null>(`${SERVICE_ENDPOINT}/logout`, {} as Record<string, unknown>);

      // Eliminar token de localStorage independientemente del resultado
      removeAuthToken();

      return { success: true };
    } catch (error: unknown) {
      // Eliminar token incluso si hay error
      removeAuthToken();

      const message = error instanceof Error ? error.message : 'Unknown error';
      return { success: false, message };
    }
  },

  // Request Password Reset
  async requestPasswordReset(email: string): Promise<ServiceResponse<{ message: string }>> {
    try {
      // Determinar si estamos en un subdominio y obtener el workspace_id
      let workspaceId: number | undefined;

      if (typeof window !== 'undefined') {
        const hostname = window.location.hostname;
        const isSubdomain = hostname !== AppConfigs.baseUrl && hostname.endsWith(AppConfigs.domain);

        if (isSubdomain) {
          const subdomain = hostname.replace(AppConfigs.domain, '');

          try {
            // Intentar obtener el workspace_id a partir del subdominio
            const workspaceResponse = await workspaceService.getWorkspaceBySubdomain(subdomain);
            if (workspaceResponse.success && workspaceResponse.data) {
              workspaceId = workspaceResponse.data.id;
              logger.info(
                `Workspace ID obtenido para password reset en ${subdomain}: ${workspaceId}`
              );
            }
          } catch (error) {
            logger.error(
              `Error obteniendo workspace_id para password reset en ${subdomain}`,
              error instanceof Error ? error.message : 'Unknown error'
            );
          }
        }
      }

      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };

      // Si tenemos un workspace_id, lo incluimos en el header
      if (workspaceId) {
        headers['X-Workspace-Id'] = workspaceId.toString();
      }

      // Usar fetch directamente para poder enviar headers personalizados
      const url = `${SERVICE_ENDPOINT}/request-password-reset`;
      const fetchResponse = await fetch(url, {
        method: 'POST',
        headers,
        body: JSON.stringify({ email }),
      });

      if (!fetchResponse.ok) {
        throw new Error(`Error ${fetchResponse.status}: ${fetchResponse.statusText}`);
      }

      const responseData = await fetchResponse.json();

      // The backend is designed to always return a generic success message for this endpoint
      // for security reasons (not to reveal if an email is registered or not).
      return { success: true, data: responseData };
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : 'Unknown error during password reset request.';
      return { success: false, message };
    }
  },

  // Reset Password
  async resetPassword(
    token: string,
    new_password: string
  ): Promise<ServiceResponse<TokenResponse>> {
    try {
      const response = await fetchAPI.POST<TokenResponse>(`${SERVICE_ENDPOINT}/reset-password`, {
        token,
        new_password,
      } as Record<string, unknown>);
      if (response.success && response.data) {
        return { success: true, data: response.data }; // Returns token data
      } else {
        return { success: false, message: response.message || 'Failed to reset password.' };
      }
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : 'Unknown error during password reset.';
      return { success: false, message };
    }
  },
};
