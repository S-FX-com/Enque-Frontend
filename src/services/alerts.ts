import { fetchAPI } from '@/lib/fetch-api';

// Define types for alerts
export interface AlertAction {
  label: string;
  action_type: string;
  action_value: string;
}

export interface SystemAlert {
  id: number;
  key: string;
  is_enabled: boolean;
  display_type: 'banner' | 'modal' | 'notification';
  message: string;
  severity: 'critical' | 'warning' | 'info';
  actions: AlertAction[];
  workspace_id: number;
  created_at: string;
  updated_at: string;
}

export interface AdminNotification {
  id: number;
  key: string;
  is_enabled: boolean;
  channels: string[];
  template: string;
  threshold?: number;
  workspace_id: number;
  created_at: string;
  updated_at: string;
}

export interface AlertSettings {
  system_alerts: Record<string, SystemAlert>;
  admin_notifications: Record<string, AdminNotification>;
}

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL || 'https://enque-backend-production.up.railway.app';

/**
 * Fetches alert settings for a workspace.
 * @param workspaceId The ID of the workspace.
 * @returns A promise that resolves to the alert settings.
 */
export const getAlertSettings = async (workspaceId: number): Promise<AlertSettings> => {
  if (!workspaceId) {
    console.error('getAlertSettings requires a valid workspaceId');
    throw new Error('Invalid workspace ID provided');
  }

  try {
    const url = `${API_BASE_URL}/v1/workspaces/${workspaceId}/alerts`;
    const response = await fetchAPI.GET<AlertSettings>(url);

    if (!response || !response.data) {
      console.error('Failed to fetch alert settings or data is missing');
      throw new Error('Failed to fetch alert settings');
    }

    return response.data;
  } catch (error) {
    console.error('Error fetching alert settings:', error);
    throw error;
  }
};

/**
 * Updates a system alert.
 * @param workspaceId The ID of the workspace.
 * @param alertKey The key of the alert to update.
 * @param alertData The data to update.
 * @returns A promise that resolves to the updated system alert.
 */
export const updateSystemAlert = async (
  workspaceId: number,
  alertKey: string,
  alertData: Partial<Omit<SystemAlert, 'id' | 'key' | 'workspace_id' | 'created_at' | 'updated_at'>>
): Promise<SystemAlert> => {
  if (!workspaceId || !alertKey) {
    console.error('updateSystemAlert requires valid workspaceId and alertKey');
    throw new Error('Invalid parameters provided');
  }

  try {
    const url = `${API_BASE_URL}/v1/workspaces/${workspaceId}/alerts/system/${alertKey}`;
    const response = await fetchAPI.PUT<SystemAlert>(url, alertData);

    if (!response || !response.data) {
      console.error(`Failed to update system alert ${alertKey} or data is missing`);
      throw new Error('Failed to update system alert');
    }

    return response.data;
  } catch (error) {
    console.error(`Error updating system alert ${alertKey}:`, error);
    throw error;
  }
};

/**
 * Toggles a system alert on or off.
 * @param workspaceId The ID of the workspace.
 * @param alertKey The key of the alert to toggle.
 * @param isEnabled Whether the alert should be enabled or disabled.
 * @returns A promise that resolves to the updated system alert.
 */
export const toggleSystemAlert = async (
  workspaceId: number,
  alertKey: string,
  isEnabled: boolean
): Promise<SystemAlert> => {
  if (!workspaceId || !alertKey) {
    console.error('toggleSystemAlert requires valid workspaceId and alertKey');
    throw new Error('Invalid parameters provided');
  }

  try {
    const url = `${API_BASE_URL}/v1/workspaces/${workspaceId}/alerts/system/${alertKey}/toggle`;
    const response = await fetchAPI.PUT<SystemAlert>(url, { is_enabled: isEnabled });

    if (!response || !response.data) {
      console.error(`Failed to toggle system alert ${alertKey} or data is missing`);
      throw new Error('Failed to toggle system alert');
    }

    return response.data;
  } catch (error) {
    console.error(`Error toggling system alert ${alertKey}:`, error);
    throw error;
  }
};

/**
 * Updates an admin notification.
 * @param workspaceId The ID of the workspace.
 * @param notificationKey The key of the notification to update.
 * @param notificationData The data to update.
 * @returns A promise that resolves to the updated admin notification.
 */
export const updateAdminNotification = async (
  workspaceId: number,
  notificationKey: string,
  notificationData: Partial<
    Omit<AdminNotification, 'id' | 'key' | 'workspace_id' | 'created_at' | 'updated_at'>
  >
): Promise<AdminNotification> => {
  if (!workspaceId || !notificationKey) {
    console.error('updateAdminNotification requires valid workspaceId and notificationKey');
    throw new Error('Invalid parameters provided');
  }

  try {
    const url = `${API_BASE_URL}/v1/workspaces/${workspaceId}/alerts/admin/${notificationKey}`;
    const response = await fetchAPI.PUT<AdminNotification>(url, notificationData);

    if (!response || !response.data) {
      console.error(`Failed to update admin notification ${notificationKey} or data is missing`);
      throw new Error('Failed to update admin notification');
    }

    return response.data;
  } catch (error) {
    console.error(`Error updating admin notification ${notificationKey}:`, error);
    throw error;
  }
};

/**
 * Toggles an admin notification on or off.
 * @param workspaceId The ID of the workspace.
 * @param notificationKey The key of the notification to toggle.
 * @param isEnabled Whether the notification should be enabled or disabled.
 * @returns A promise that resolves to the updated admin notification.
 */
export const toggleAdminNotification = async (
  workspaceId: number,
  notificationKey: string,
  isEnabled: boolean
): Promise<AdminNotification> => {
  if (!workspaceId || !notificationKey) {
    console.error('toggleAdminNotification requires valid workspaceId and notificationKey');
    throw new Error('Invalid parameters provided');
  }

  try {
    const url = `${API_BASE_URL}/v1/workspaces/${workspaceId}/alerts/admin/${notificationKey}/toggle`;
    const response = await fetchAPI.PUT<AdminNotification>(url, { is_enabled: isEnabled });

    if (!response || !response.data) {
      console.error(`Failed to toggle admin notification ${notificationKey} or data is missing`);
      throw new Error('Failed to toggle admin notification');
    }

    return response.data;
  } catch (error) {
    console.error(`Error toggling admin notification ${notificationKey}:`, error);
    throw error;
  }
};

/**
 * Tests a connection (e.g., M365 connector).
 * @param workspaceId The ID of the workspace.
 * @param connectionType The type of connection to test.
 * @returns A promise that resolves to a status object.
 */
export const testConnection = async (
  workspaceId: number,
  connectionType: string
): Promise<{ is_connected: boolean; message?: string }> => {
  if (!workspaceId || !connectionType) {
    console.error('testConnection requires valid workspaceId and connectionType');
    throw new Error('Invalid parameters provided');
  }

  try {
    const url = `${API_BASE_URL}/v1/workspaces/${workspaceId}/connections/${connectionType}/test`;
    const response = await fetchAPI.POST<{ is_connected: boolean; message?: string }>(url, {});

    if (!response || !response.data) {
      console.error(`Failed to test ${connectionType} connection or data is missing`);
      throw new Error(`Failed to test ${connectionType} connection`);
    }

    return response.data;
  } catch (error) {
    console.error(`Error testing ${connectionType} connection:`, error);
    throw error;
  }
};

/**
 * Gets active system alerts for the current user.
 * @returns A promise that resolves to an array of active system alerts.
 */
