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
 * @returns A promise that resolves to an array of notification settings.
 */
export const getNotificationSettings = async (
  workspaceId: number
): Promise<NotificationSetting[]> => {
  if (!workspaceId) {
    console.error('getNotificationSettings requires a valid workspaceId');
    throw new Error('Invalid workspace ID provided');
  }

  try {
    const url = `${API_BASE_URL}/v1/workspaces/${workspaceId}/notifications/settings`;
    const response = await fetchAPI.GET<NotificationSetting[]>(url);

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
 * Updates a notification template.
 * @param workspaceId The ID of the workspace.
 * @param templateId The ID of the template to update.
 * @param content The new content for the template.
 * @returns A promise that resolves to the updated notification template.
 */
export const updateNotificationTemplate = async (
  workspaceId: number,
  templateId: number,
  content: string
): Promise<NotificationTemplate> => {
  if (!workspaceId || !templateId) {
    console.error('updateNotificationTemplate requires valid workspaceId and templateId');
    throw new Error('Invalid IDs provided');
  }

  try {
    const url = `${API_BASE_URL}/v1/workspaces/${workspaceId}/notifications/templates/${templateId}`;
    const response = await fetchAPI.PUT<NotificationTemplate>(url, { content });

    if (!response || !response.data) {
      console.error(`Failed to update notification template ${templateId} or data is missing`);
      throw new Error('Failed to update notification template');
    }

    return response.data;
  } catch (error) {
    console.error(`Error updating notification template ${templateId}:`, error);
    throw error;
  }
};

/**
 * Toggles a notification setting on or off.
 * @param workspaceId The ID of the workspace.
 * @param settingId The ID of the setting to toggle.
 * @param isEnabled Whether the setting should be enabled or disabled.
 * @returns A promise that resolves to the updated notification setting.
 */
export const toggleNotificationSetting = async (
  workspaceId: number,
  settingId: number,
  isEnabled: boolean
): Promise<NotificationSetting> => {
  if (!workspaceId || !settingId) {
    console.error('toggleNotificationSetting requires valid workspaceId and settingId');
    throw new Error('Invalid IDs provided');
  }

  try {
    const url = `${API_BASE_URL}/v1/workspaces/${workspaceId}/notifications/settings/${settingId}`;
    const response = await fetchAPI.PUT<NotificationSetting>(url, { is_enabled: isEnabled });

    if (!response || !response.data) {
      console.error(`Failed to toggle notification setting ${settingId} or data is missing`);
      throw new Error('Failed to toggle notification setting');
    }

    return response.data;
  } catch (error) {
    console.error(`Error toggling notification setting ${settingId}:`, error);
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
 * Connects a notification channel (e.g., Microsoft Teams).
 * @param workspaceId The ID of the workspace.
 * @param channelType The type of channel to connect.
 * @param config Configuration data for the connection.
 * @returns A promise that resolves to the connected notification channel.
 */
export const connectNotificationChannel = async (
  workspaceId: number,
  channelType: string,
  config: Record<string, any>
): Promise<NotificationChannel> => {
  if (!workspaceId || !channelType) {
    console.error('connectNotificationChannel requires valid workspaceId and channelType');
    throw new Error('Invalid parameters provided');
  }

  try {
    const url = `${API_BASE_URL}/v1/workspaces/${workspaceId}/notifications/channels/${channelType}/connect`;
    const response = await fetchAPI.POST<NotificationChannel>(url, { config });

    if (!response || !response.data) {
      console.error(`Failed to connect ${channelType} channel or data is missing`);
      throw new Error(`Failed to connect ${channelType} channel`);
    }

    return response.data;
  } catch (error) {
    console.error(`Error connecting ${channelType} channel:`, error);
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
