export interface NotificationSetting {
  id: number;
  is_enabled: boolean;
  template?: string | null;
}

export interface AgentNotificationsConfig {
  email: {
    new_ticket_created: NotificationSetting;
    new_response: NotificationSetting;
    ticket_assigned: NotificationSetting;
  };
  enque_popup: {
    new_ticket_created: NotificationSetting;
    new_response: NotificationSetting;
    ticket_assigned: NotificationSetting;
  };
  teams: {
    is_connected: boolean;
    is_enabled: boolean;
    id?: number;
  };
}

export interface UserNotificationsConfig {
  email: {
    new_ticket_created: NotificationSetting;
    ticket_closed: NotificationSetting;
    new_agent_response: NotificationSetting;
  };
}

export interface NotificationSettingsResponse {
  agents: AgentNotificationsConfig;
  users: UserNotificationsConfig;
}
