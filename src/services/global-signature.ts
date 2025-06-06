import { fetchAPI } from '@/lib/fetch-api';

export interface GlobalSignature {
  id: number;
  workspace_id: number;
  content: string;
  is_enabled: boolean;
}

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || 'https://enque-backend-production.up.railway.app';

/**
 * Obtiene la firma global para un workspace
 * @param workspaceId ID del workspace
 * @returns Promise con la firma global
 */
export async function getGlobalSignature(workspaceId: number): Promise<GlobalSignature | null> {
  try {
    const response = await fetchAPI.GET<GlobalSignature>(
      `${API_BASE_URL}/v1/global-signatures/${workspaceId}`
    );

    if (response && response.success && response.data) {
      return response.data;
    }
    return null;
  } catch (error) {
    console.error('Error fetching global signature:', error);
    return null;
  }
}

/**
 * Obtiene la firma global activada para un workspace
 * @param workspaceId ID del workspace
 * @returns Promise con la firma global activada
 */
export async function getEnabledGlobalSignature(
  workspaceId: number
): Promise<GlobalSignature | null> {
  try {
    const response = await fetchAPI.GET<GlobalSignature>(
      `${API_BASE_URL}/v1/global-signatures/${workspaceId}/enabled`
    );

    if (response && response.success && response.data) {
      return response.data;
    }
    return null;
  } catch {
    // Si no hay firma global activada, retornamos null sin mostrar error
    return null;
  }
}

/**
 * Crea o actualiza la firma global para un workspace
 * @param workspaceId ID del workspace
 * @param content Contenido HTML de la firma
 * @param isEnabled Estado de activación de la firma
 * @returns Promise con la firma global actualizada
 */
export async function updateGlobalSignature(
  workspaceId: number,
  content: string,
  isEnabled?: boolean
): Promise<GlobalSignature | null> {
  try {
    const payload: { content: string; is_enabled?: boolean } = { content };
    if (isEnabled !== undefined) {
      payload.is_enabled = isEnabled;
    }

    const response = await fetchAPI.PUT<GlobalSignature>(
      `${API_BASE_URL}/v1/global-signatures/${workspaceId}`,
      payload
    );

    if (response && response.success && response.data) {
      return response.data;
    }
    return null;
  } catch (error) {
    console.error('Error updating global signature:', error);
    throw error;
  }
}

/**
 * Actualiza solo el estado de activación de la firma global
 * @param workspaceId ID del workspace
 * @param isEnabled Estado de activación de la firma
 * @returns Promise con la firma global actualizada
 */
export async function toggleGlobalSignature(
  workspaceId: number,
  isEnabled: boolean
): Promise<GlobalSignature | null> {
  try {
    const response = await fetchAPI.PUT<GlobalSignature>(
      `${API_BASE_URL}/v1/global-signatures/${workspaceId}`,
      { is_enabled: isEnabled }
    );

    if (response && response.success && response.data) {
      return response.data;
    }
    return null;
  } catch (error) {
    console.error('Error toggling global signature:', error);
    throw error;
  }
}
