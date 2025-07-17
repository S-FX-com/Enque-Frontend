import { apiClient } from '@/lib/api';

// Tipos para automations
export interface AutomationSetting {
  id: number;
  is_enabled: boolean;
  type: string;
  name: string;
  description: string;
}

export interface AutomationsResponse {
  team_notifications: AutomationSetting;
  weekly_agent_summary: AutomationSetting;
}

interface ApiSuccessResponse {
  success: boolean;
  message: string;
}

/**
 * Get automation settings for a workspace
 */
export const getAutomationSettings = async (
  workspaceId: number
): Promise<AutomationsResponse> => {
  const response = await apiClient.get<AutomationsResponse>(`/automation-settings/${workspaceId}`);
  return response.data;
};

/**
 * Toggle an automation setting on or off
 */
export const toggleAutomationSetting = async (
  workspaceId: number,
  settingId: number,
  enabled: boolean
): Promise<ApiSuccessResponse> => {
  const response = await apiClient.put<ApiSuccessResponse>(
    `/automation-settings/${workspaceId}/toggle/${settingId}`,
    {
      is_enabled: enabled,
    }
  );
  return response.data;
};

/**
 * Toggle weekly agent summary setting
 */
export const toggleWeeklySummarySetting = async (
  workspaceId: number,
  enabled: boolean
): Promise<ApiSuccessResponse> => {
  const response = await apiClient.post<ApiSuccessResponse>(
    `/automation-settings/${workspaceId}/weekly-summary`,
    {
      is_enabled: enabled,
    }
  );
  return response.data;
}; 