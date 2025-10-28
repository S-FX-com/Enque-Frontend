import { AppConfigs } from '@/configs';
import { getAuthToken } from '@/lib/auth';

/**
 * Uploads multiple files as attachments.
 * @param files - Array of File objects to upload
 * @returns Promise with attachment info including IDs for each uploaded file
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const uploadAttachments = async (files: File[]): Promise<any[]> => {
  if (!files || files.length === 0) {
    return [];
  }

  try {
    // Optimización: crear un solo FormData para todos los archivos
    const formData = new FormData();

    // Añadir todos los archivos con el mismo nombre de parámetro 'files'
    files.forEach(file => {
      formData.append('files', file);
    });

    // Get authentication token
    const token = getAuthToken();
    if (!token) {
      throw new Error('Authentication token not found');
    }

    // Realizar la petición con timeout más largo para permitir archivos grandes
    const response = await fetch(`${AppConfigs.api}/attachments/upload-multiple`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        // No incluir Content-Type para que el navegador establezca el boundary correcto
      },
      body: formData,
      // Aumentar timeout para archivos grandes
      signal: AbortSignal.timeout(60000), // 60 segundos de timeout
    });

    // Si la respuesta no es ok, lanzar error
    if (!response.ok) {
      const errorText = await response.text();
      let errorMessage = 'Failed to upload attachments';
      try {
        const errorData = JSON.parse(errorText);
        errorMessage = errorData.detail || errorData.message || errorMessage;
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
      } catch (e) {
        // Use text as error if not JSON
        errorMessage = errorText || errorMessage;
      }
      throw new Error(errorMessage);
    }

    // Parsear respuesta exitosa
    const data = await response.json();

    const parsedData = data.data || data;

    return parsedData;
  } catch (error) {
    console.error('Error uploading files:', error);
    throw error;
  }
};

/**
 * Removes a temporary attachment by ID.
 * Use this if user decides to remove an attachment before sending the message.
 * @param attachmentId - ID of the attachment to remove
 */
