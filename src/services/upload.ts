// frontend/src/services/upload.ts
import { getAuthToken } from '@/lib/auth'; // Need token for potential auth on upload endpoint
import { logger } from '@/lib/logger';

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || 'https://enque-backend-production.up.railway.app';
const UPLOAD_ENDPOINT = `${API_BASE_URL}/v1/uploads/image`;

interface UploadResponse {
  url: string; // Expecting the relative URL from the backend
}

/**
 * Uploads an image file to the backend.
 * @param file The image file to upload.
 * @returns A promise that resolves to an object containing the relative URL of the uploaded image.
 * @throws An error if the upload fails.
 */
export async function uploadImage(file: File): Promise<UploadResponse> {
  const token = getAuthToken();
  const formData = new FormData();
  formData.append('file', file); // The backend expects the file under the key 'file'

  try {
    const response = await fetch(UPLOAD_ENDPOINT, {
      method: 'POST',
      headers: {
        // Content-Type is automatically set by the browser for FormData
        // 'Content-Type': 'multipart/form-data', // Don't set this manually!
        ...(token && { Authorization: `Bearer ${token}` }), // Add auth header if token exists
      },
      body: formData,
    });

    if (!response.ok) {
      let errorDetail = `HTTP error ${response.status}: ${response.statusText}`;
      try {
        // Try to get more specific error detail from the response body
        const errorJson = await response.json();
        errorDetail = errorJson.detail || errorDetail;
      } catch {
        // Ignore if response body is not JSON or empty
      }
      logger.error(`Image upload failed: ${errorDetail}`);
      throw new Error(`Image upload failed: ${errorDetail}`);
    }

    const result: UploadResponse = await response.json();
    logger.info(`Image uploaded successfully: ${result.url}`);

    // IMPORTANTE: Verificar si la URL devuelta es relativa o absoluta
    // Si es relativa, añadir el API base URL
    // Si es absoluta o una URL externa, dejarla sin cambios
    if (result.url) {
      // Una URL que comienza con '/static' es una URL relativa desde el backend
      if (result.url.startsWith('/static')) {
        return { url: `${API_BASE_URL}${result.url}` };
      }
      // Si la URL ya tiene http o https, es absoluta y la dejamos como está
      else if (result.url.startsWith('http://') || result.url.startsWith('https://')) {
        return result;
      }
      // Para cualquier otro caso (por ejemplo, URLs relativas que no empiezan con /static)
      else {
        // Añadir una barra si es necesario
        const separator = result.url.startsWith('/') ? '' : '/';
        return { url: `${API_BASE_URL}${separator}${result.url}` };
      }
    }

    return result; // Devolver el resultado sin modificar si no hay URL
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error('Error during image upload request:', errorMessage);
    // Re-throw the error with a consistent message format
    throw new Error(`Image upload failed: ${errorMessage}`);
  }
}
