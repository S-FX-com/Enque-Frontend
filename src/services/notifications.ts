import { fetchAPI } from '@/lib/fetch-api';

// Define types for notifications
export interface NotificationTemplate {
  id: number;
  type: string;
  content: string;
  is_enabled: boolean;
  created_at: string;
  updated_at: string;
}

export interface NotificationSetting {
  id: number;
  category: string;
  type: string;
  is_enabled: boolean;
  channels: string[];
  template_id?: number;
  template?: NotificationTemplate;
  workspace_id: number;
  created_at: string;
  updated_at: string;
}

// Define la estructura real de los datos utilizados en la aplicación
export interface NotificationSettingsStructure {
  agents: {
    email: {
      new_ticket_created: {
        id: number;
        is_enabled: boolean;
        template: string;
      };
      new_response: {
        id: number;
        is_enabled: boolean;
        template: string;
      };
      ticket_assigned: {
        id: number;
        is_enabled: boolean;
        template: string;
      };
    };
    enque_popup: {
      new_ticket_created: {
        id: number;
        is_enabled: boolean;
      };
      new_response: {
        id: number;
        is_enabled: boolean;
      };
      ticket_assigned: {
        id: number;
        is_enabled: boolean;
      };
    };
    teams: {
      id: number;
      is_enabled: boolean;
      is_connected: boolean;
    };
  };
  clients: {
    ticket_created: {
      id: number;
      is_enabled: boolean;
      template: string;
    };
    ticket_resolved: {
      id: number;
      is_enabled: boolean;
      template: string;
    };
  };
}

export interface NotificationChannel {
  id: number;
  name: string;
  type: string;
  is_enabled: boolean;
  is_connected: boolean;
  config: Record<string, any>;
  workspace_id: number;
  created_at: string;
  updated_at: string;
}

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL || 'https://enque-backend-production.up.railway.app';

/**
 * Fetches all notification settings for a workspace.
 * @param workspaceId The ID of the workspace.
 * @returns A promise that resolves to notification settings structure.
 */
export const getNotificationSettings = async (
  workspaceId: number
): Promise<NotificationSettingsStructure> => {
  if (!workspaceId) {
    console.error('getNotificationSettings requires a valid workspaceId');
    throw new Error('Invalid workspace ID provided');
  }

  try {
    const url = `${API_BASE_URL}/v1/workspaces/${workspaceId}/notifications/settings`;
    const response = await fetchAPI.GET<NotificationSettingsStructure>(url);

    if (!response || !response.data) {
      console.error('Failed to fetch notification settings or data is missing');
      throw new Error('Failed to fetch notification settings');
    }

    return response.data;
  } catch (error) {
    console.error('Error fetching notification settings:', error);
    throw error;
  }
};

/**
 * Fetches a specific notification template.
 * @param workspaceId The ID of the workspace.
 * @param templateId The ID of the template.
 * @returns A promise that resolves to the notification template.
 */
export const getNotificationTemplate = async (
  workspaceId: number,
  templateId: number
): Promise<NotificationTemplate> => {
  if (!workspaceId || !templateId) {
    console.error('getNotificationTemplate requires valid workspaceId and templateId');
    throw new Error('Invalid IDs provided');
  }

  try {
    const url = `${API_BASE_URL}/v1/workspaces/${workspaceId}/notifications/templates/${templateId}`;
    const response = await fetchAPI.GET<NotificationTemplate>(url);

    if (!response || !response.data) {
      console.error(`Failed to fetch notification template ${templateId} or data is missing`);
      throw new Error('Failed to fetch notification template');
    }

    return response.data;
  } catch (error) {
    console.error(`Error fetching notification template ${templateId}:`, error);
    throw error;
  }
};

/**
 * Actualiza una plantilla de notificación.
 * @param workspaceId ID del espacio de trabajo.
 * @param templateId ID de la plantilla a actualizar.
 * @param content Nuevo contenido de la plantilla.
 * @returns Promesa que se resuelve con los datos de la plantilla actualizada.
 */
export const updateNotificationTemplate = async (
  workspaceId: number,
  templateId: number,
  content: string
): Promise<{ id: number; template: string; is_enabled: boolean }> => {
  if (!workspaceId || !templateId) {
    console.error('updateNotificationTemplate requiere workspaceId y templateId válidos');
    throw new Error('IDs inválidos proporcionados');
  }

  try {
    const url = `${API_BASE_URL}/v1/workspaces/${workspaceId}/notifications/templates/${templateId}`;
    const response = await fetchAPI.PUT<{ id: number; template: string; is_enabled: boolean }>(
      url,
      { content }
    );

    if (!response || !response.data) {
      console.error(`Error al actualizar la plantilla ${templateId} o datos faltantes`);
      throw new Error('Error al actualizar la plantilla');
    }

    return response.data;
  } catch (error) {
    console.error(`Error al actualizar la plantilla ${templateId}:`, error);
    throw error;
  }
};

/**
 * Activa o desactiva una configuración de notificación.
 * @param workspaceId ID del espacio de trabajo.
 * @param settingId ID de la configuración a alternar.
 * @param isEnabled Si la configuración debe estar habilitada o deshabilitada.
 * @returns Promesa que se resuelve con la configuración de notificación actualizada.
 */
export const toggleNotificationSetting = async (
  workspaceId: number,
  settingId: number,
  isEnabled: boolean
): Promise<{ id: number; is_enabled: boolean }> => {
  if (!workspaceId || !settingId) {
    console.error('toggleNotificationSetting requiere workspaceId y settingId válidos');
    throw new Error('IDs inválidos proporcionados');
  }

  try {
    const url = `${API_BASE_URL}/v1/workspaces/${workspaceId}/notifications/settings/${settingId}`;
    const response = await fetchAPI.PUT<{ id: number; is_enabled: boolean }>(url, {
      is_enabled: isEnabled,
    });

    if (!response || !response.data) {
      console.error(`Error al alternar la configuración ${settingId} o datos faltantes`);
      throw new Error('Error al alternar la configuración de notificación');
    }

    return response.data;
  } catch (error) {
    console.error(`Error al alternar la configuración ${settingId}:`, error);
    throw error;
  }
};

/**
 * Updates notification channels for a setting.
 * @param workspaceId The ID of the workspace.
 * @param settingId The ID of the setting.
 * @param channels Array of channel types to enable.
 * @returns A promise that resolves to the updated notification setting.
 */
export const updateNotificationChannels = async (
  workspaceId: number,
  settingId: number,
  channels: string[]
): Promise<NotificationSetting> => {
  if (!workspaceId || !settingId) {
    console.error('updateNotificationChannels requires valid workspaceId and settingId');
    throw new Error('Invalid IDs provided');
  }

  try {
    const url = `${API_BASE_URL}/v1/workspaces/${workspaceId}/notifications/settings/${settingId}/channels`;
    const response = await fetchAPI.PUT<NotificationSetting>(url, { channels });

    if (!response || !response.data) {
      console.error(
        `Failed to update notification channels for setting ${settingId} or data is missing`
      );
      throw new Error('Failed to update notification channels');
    }

    return response.data;
  } catch (error) {
    console.error(`Error updating notification channels for setting ${settingId}:`, error);
    throw error;
  }
};

/**
 * Conecta un canal de notificación (por ejemplo, Microsoft Teams).
 * @param workspaceId ID del espacio de trabajo.
 * @param channelType Tipo de canal a conectar.
 * @param config Configuración opcional para la conexión.
 * @returns Promesa que se resuelve con los datos del canal conectado.
 */
export const connectNotificationChannel = async (
  workspaceId: number,
  channelType: string,
  config: Record<string, any>
): Promise<{ id: number; is_connected: boolean; is_enabled: boolean }> => {
  if (!workspaceId || !channelType) {
    console.error('connectNotificationChannel requiere workspaceId y channelType válidos');
    throw new Error('Parámetros inválidos proporcionados');
  }

  try {
    const url = `${API_BASE_URL}/v1/workspaces/${workspaceId}/notifications/channels/${channelType}/connect`;
    const response = await fetchAPI.POST<{
      id: number;
      is_connected: boolean;
      is_enabled: boolean;
    }>(url, config);

    if (!response || !response.data) {
      console.error(`Error al conectar el canal ${channelType} o datos faltantes`);
      throw new Error('Error al conectar el canal de notificación');
    }

    return response.data;
  } catch (error) {
    console.error(`Error al conectar el canal ${channelType}:`, error);
    throw error;
  }
};

/**
 * Tests a notification channel connection.
 * @param workspaceId The ID of the workspace.
 * @param channelId The ID of the channel to test.
 * @returns A promise that resolves to a status object.
 */
export const testNotificationChannel = async (
  workspaceId: number,
  channelId: number
): Promise<{ is_connected: boolean; message?: string }> => {
  if (!workspaceId || !channelId) {
    console.error('testNotificationChannel requires valid workspaceId and channelId');
    throw new Error('Invalid IDs provided');
  }

  try {
    const url = `${API_BASE_URL}/v1/workspaces/${workspaceId}/notifications/channels/${channelId}/test`;
    const response = await fetchAPI.POST<{ is_connected: boolean; message?: string }>(url, {});

    if (!response || !response.data) {
      console.error(`Failed to test notification channel ${channelId} or data is missing`);
      throw new Error('Failed to test notification channel');
    }

    return response.data;
  } catch (error) {
    console.error(`Error testing notification channel ${channelId}:`, error);
    throw error;
  }
};
