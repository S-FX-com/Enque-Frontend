import { apiClient } from '@/lib/api';

interface NotificationResponse {
  agents: {
    email: {
      new_ticket_created: { is_enabled: boolean; id: number; template: string };
      new_response: { is_enabled: boolean; id: number; template: string };
      ticket_assigned: { is_enabled: boolean; id: number; template: string };
    };
    enque_popup: {
      new_ticket_created: { is_enabled: boolean; id: number };
      new_response: { is_enabled: boolean; id: number };
      ticket_assigned: { is_enabled: boolean; id: number };
    };
    teams: {
      is_connected: boolean;
      is_enabled: boolean;
      id: number | null;
    };
  };

  users: {
    email: {
      new_ticket_created: { is_enabled: boolean; id: number; template: string };
      ticket_closed: { is_enabled: boolean; id: number; template: string };
      new_agent_response: { is_enabled: boolean; id: number; template: string };
    };
  };
}

interface ApiSuccessResponse {
  success: boolean;
  message: string;
}

/**
 * Get notification settings for a workspace
 */
export const getNotificationSettings = async (
  workspaceId: number
): Promise<NotificationResponse> => {
  const response = await apiClient.get<NotificationResponse>(`/notifications/${workspaceId}`);
  return response.data;
};

/**
 * Toggle a notification setting on or off
 */
export const toggleNotificationSetting = async (
  workspaceId: number,
  settingId: number,
  enabled: boolean
): Promise<ApiSuccessResponse> => {
  const response = await apiClient.put<ApiSuccessResponse>(
    `/notifications/${workspaceId}/toggle/${settingId}`,
    {
      is_enabled: enabled,
    }
  );
  return response.data;
};

/**
 * Update a notification template
 */
export const updateNotificationTemplate = async ({
  workspaceId,
  templateId,
  content,
}: {
  workspaceId: number;
  templateId: number;
  content: string;
}): Promise<ApiSuccessResponse> => {
  const response = await apiClient.put<ApiSuccessResponse>(
    `/notifications/${workspaceId}/template/${templateId}`,
    {
      content,
    }
  );
  return response.data;
};

/**
 * Connect a notification channel (e.g., Teams)
 */
export const connectNotificationChannel = async (
  workspaceId: number,
  channel: string,
  config: Record<string, unknown>
): Promise<ApiSuccessResponse> => {
  console.log('🔌 connectNotificationChannel called:', { workspaceId, channel, config });
  
  if (channel === 'teams') {
    const payload = {
      enable_notifications: config.enable_notifications || true,
      activity_types: config.activity_types || ["ticketCreated", "ticketAssigned", "newResponse"]
    };
    
    console.log('📤 Sending Teams connection request:', {
      url: `/notifications/${workspaceId}/connect/teams`,
      payload
    });
    
    try {
      const response = await apiClient.post<ApiSuccessResponse>(
        `/notifications/${workspaceId}/connect/teams`,
        payload
      );
      
      console.log('📨 Teams connection response:', response);
      console.log('📊 Response status:', response.status);
      console.log('📄 Response data:', response.data);
      
      return response.data;
    } catch (error) {
      console.error('❌ Teams connection service error:', error);
      throw error;
    }
  }

  throw new Error(`Unsupported notification channel: ${channel}`);
};
