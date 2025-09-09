import { fetchAPI } from '@/lib/fetch-api';
import { NotificationSettingsResponse } from '../typescript/notification';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'https://enque-backend-production.up.railway.app';

export async function getNotificationSettings(workspaceId: number): Promise<NotificationSettingsResponse> {
  const url = `${API_BASE_URL}/v1/notifications/${workspaceId}`;
  const response = await fetchAPI.GET<NotificationSettingsResponse>(url);
  if (response && response.success && response.data) {
    return response.data;
  }
  throw new Error(response?.message || 'Failed to fetch notification settings');
}

export async function toggleNotificationSetting(
  workspaceId: number,
  settingId: number,
  enabled: boolean
): Promise<void> {
  const url = `${API_BASE_URL}/v1/notifications/${workspaceId}/toggle/${settingId}`;
  const response = await fetchAPI.PUT(url, { is_enabled: enabled });
  if (!response.success) {
    throw new Error(response.message || 'Failed to toggle notification setting');
  }
}

export async function toggleTeamsChannel(
  workspaceId: number,
  enable: boolean
): Promise<void> {
  const url = `${API_BASE_URL}/v1/notifications/${workspaceId}/toggle/teams`;
  const response = await fetchAPI.POST(url, { enable });
  if (!response.success) {
    throw new Error(response.message || 'Failed to toggle Teams channel');
  }
}

export async function sendTestTeamsNotification(workspaceId: number): Promise<void> {
  const url = `${API_BASE_URL}/v1/notifications/${workspaceId}/test/teams`;
  const response = await fetchAPI.POST(url, {});
  if (!response.success) {
    throw new Error(response.message || 'Failed to send test notification');
  }
}
