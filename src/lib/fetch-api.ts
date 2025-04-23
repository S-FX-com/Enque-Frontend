import { getAuthToken } from '@/lib/auth';
import { logger } from './logger';

// Definición de respuesta base de servicios
interface BaseResponse<T> {
  success: boolean;
  message?: string;
  data?: T;
}

// Función genérica para manejar errores de fetching
const handleFetchError = <T>(error: unknown, url: string): BaseResponse<T> => {
  logger.error(`Error en la llamada a la API: ${url}`, error instanceof Error ? error.message : 'Error desconocido');
  const message = error instanceof Error ? error.message : 'Error desconocido';
  return { success: false, message };
};

// Opciones base para las peticiones
const getBaseOptions = (includeAuth: boolean = true): RequestInit => {
  const options: RequestInit = {
    headers: {
      'Content-Type': 'application/json',
    },
  };

  if (includeAuth) {
    const token = getAuthToken();
    if (token) {
      options.headers = {
        ...options.headers,
        Authorization: `Bearer ${token}`,
      };
    }
  }

  return options;
};

// Utilidad para realizar peticiones fetch
export const fetchAPI = {
  // GET
  async GET<T>(url: string, includeAuth: boolean = true): Promise<BaseResponse<T>> {
    const startTime = performance.now();
    try {
      const options = getBaseOptions(includeAuth);
      const response = await fetch(url, {
        method: 'GET',
        ...options,
      });

      const endTime = performance.now();
      const duration = Math.round(endTime - startTime);
      
      // Log the request result
      logger.logRequest('GET', url, response.status, duration);

      if (!response.ok) {
        throw new Error(`Error ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      return { success: true, data };
    } catch (error) {
      return handleFetchError(error, url);
    }
  },

  // POST
  async POST<T>(url: string, body: Record<string, unknown>, includeAuth: boolean = true): Promise<BaseResponse<T>> {
    const startTime = performance.now();
    try {
      const options = getBaseOptions(includeAuth);
      const response = await fetch(url, {
        method: 'POST',
        ...options,
        body: JSON.stringify(body),
      });

      const endTime = performance.now();
      const duration = Math.round(endTime - startTime);
      
      // Log the request result
      logger.logRequest('POST', url, response.status, duration);

      if (!response.ok) {
        let errorMessage = `Error ${response.status}: ${response.statusText}`;
        let errorDetails = null;
        // Attempt to parse error details from response body, especially for 422 errors
        try {
          const errorData = await response.json();
          if (errorData && errorData.detail) {
            // FastAPI often puts validation errors in 'detail'
            errorDetails = JSON.stringify(errorData.detail); 
            errorMessage += ` - Details: ${errorDetails}`;
          } else {
            // Log the whole error data if 'detail' is not found
            errorDetails = JSON.stringify(errorData);
            errorMessage += ` - Body: ${errorDetails}`;
          }
          // Removed console log for errorData
        } catch { // Remove unused 'parseError' variable
          // If parsing fails, log that too
          // Removed console log for parsing failure
        }
        // Throw the enhanced error message
        throw new Error(errorMessage);
      }

      const data = await response.json();
      return { success: true, data };
    } catch (error) {
      // Removed detailed error logging from catch block, handleFetchError already logs
      // Return the standardized error response
      return handleFetchError(error, url); 
    }
  },

  // PUT
  async PUT<T>(url: string, body: Record<string, unknown>, includeAuth: boolean = true): Promise<BaseResponse<T>> {
    const startTime = performance.now();
    try {
      const options = getBaseOptions(includeAuth);
      const response = await fetch(url, {
        method: 'PUT',
        ...options,
        body: JSON.stringify(body),
      });

      const endTime = performance.now();
      const duration = Math.round(endTime - startTime);
      
      // Log the request result
      logger.logRequest('PUT', url, response.status, duration);

      if (!response.ok) {
        throw new Error(`Error ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      return { success: true, data };
    } catch (error) {
      return handleFetchError(error, url);
    }
  },

  // DELETE
  async DELETE<T>(url: string, includeAuth: boolean = true): Promise<BaseResponse<T>> {
    const startTime = performance.now();
    try {
      const options = getBaseOptions(includeAuth);
      const response = await fetch(url, {
        method: 'DELETE',
        ...options,
      });

      const endTime = performance.now();
      const duration = Math.round(endTime - startTime);
      
      // Log the request result
      logger.logRequest('DELETE', url, response.status, duration);

      if (!response.ok) {
        throw new Error(`Error ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      return { success: true, data };
    } catch (error) {
      return handleFetchError(error, url);
    }
  },
};
