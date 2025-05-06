import { getAuthToken } from '@/lib/auth';
import { logger } from './logger';

// Definición de respuesta base de servicios (Exported)
export interface BaseResponse<T> {
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

      // Removed incorrect 204 check from GET method
      // if (response.status === 204) { ... }

      // For successful GET statuses (assume JSON body)
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

      // 1. Handle 204 No Content immediately (Success)
      if (response.status === 204) {
        return { success: true };
      }

      // 2. Handle non-OK statuses (Errors)
      if (!response.ok) {
        // This catches 4xx, 5xx etc.
        throw new Error(`Error ${response.status}: ${response.statusText}`);
      }

      // 3. Handle other OK statuses (e.g., 200 OK) - Try reading body
      try {
        const text = await response.text(); // Read body as text first
        if (!text) {
          // 4. OK status but empty body - Treat as success without data
          logger.warn(`Response for DELETE ${url} (Status: ${response.status}) was OK but had an empty body.`)
          return { success: true };
        }
        // 5. OK status with non-empty body - Try parsing as JSON
        try {
          const data = JSON.parse(text);
          return { success: true, data };
        } catch (parseError: unknown) { // Type as unknown
          // JSON parsing failed
          const parseErrorMsg = parseError instanceof Error ? parseError.message : String(parseError);
          logger.error(`Failed to parse JSON response for DELETE ${url} (Status: ${response.status})`, parseErrorMsg); // Use string message
          throw new Error("Failed to parse successful response body as JSON.");
        }
      } catch (readError: unknown) { // Type as unknown
          // Error reading response body
          const readErrorMsg = readError instanceof Error ? readError.message : String(readError);
          logger.error(`Failed to read response body for DELETE ${url} (Status: ${response.status})`, readErrorMsg); // Use string message
          throw new Error("Failed to read response body.");
      }

    } catch (error) { // Catches errors from fetch(), !response.ok, or reading/parsing body
      return handleFetchError(error, url);
    }
  },
};
