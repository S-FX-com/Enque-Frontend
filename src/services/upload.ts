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

    // IMPORTANT: Prepend the API base URL if the backend returns a relative URL
    // Adjust this logic if your backend returns an absolute URL
    if (result.url && result.url.startsWith('/static')) {
      return { url: `${API_BASE_URL}${result.url}` };
    }

    return result; // Assuming backend returns the full URL or just the path needed
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error('Error during image upload request:', errorMessage);
    // Re-throw the error with a consistent message format
    throw new Error(`Image upload failed: ${errorMessage}`);
  }
}
