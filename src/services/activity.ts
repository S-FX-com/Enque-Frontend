import { fetchAPI } from '@/lib/fetch-api';
import { Activity } from '../typescript/activity'; // Use relative path
import { toast } from 'sonner'; // Importar toast de sonner
const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL || 'https://enque-backend-production.up.railway.app';
/**
 * @param limit Optional limit for the number of notifications to fetch.
 * @returns A promise that resolves to an array of activities.
 */
export const getNotifications = async (limit: number = 10): Promise<Activity[]> => {
  try {
    const url = `${API_BASE_URL}/v1/notifications?limit=${limit}`;
    const response = await fetchAPI.GET<Activity[]>(url);

    if (!response || !response.data) {
      console.error('Failed to fetch notifications or data is missing');
      return []; 
    }
    return response.data;
  } catch (error) {
    console.error('Error fetching notifications:', error);
    throw error; // Re-throw error for handling in the component
  }
};

/**
 * Deletes all notifications for the current user's workspace.
 * @returns A promise that resolves to a success response.
 */
export const clearAllNotifications = async (): Promise<{
  success: boolean;
  deleted_count: number;
}> => {
  try {
    const url = `${API_BASE_URL}/v1/notifications/all`;
    const response = await fetchAPI.DELETE<{ success: boolean; deleted_count: number }>(url);

    if (!response || !response.data) {
      console.error('Failed to clear notifications or response data is missing');
      return { success: false, deleted_count: 0 };
    }
    return response.data;
  } catch (error) {
    console.error('Error clearing notifications:', error);
    // Return default error response
    return { success: false, deleted_count: 0 };
  }
};

/**
 * @param notification The notification to display
 */
export const showNotificationToast = (notification: Activity): void => {
  const isTicketCreation = notification.source_type === 'Ticket';
  const isComment = notification.source_type === 'Comment';

  let displayName = 'User';
  if (notification.creator_user_name) {
    displayName = notification.creator_user_name;
  } else if (notification.action) {
    if (notification.action.includes(' logged a new ticket')) {
      displayName = notification.action.replace(' logged a new ticket', '');
    } else if (notification.action.includes(' commented on ticket')) {
      displayName = notification.action.replace(' commented on ticket', '');
    } else if (notification.action.includes(' replied via email')) {
      displayName = notification.action.replace(' replied via email', '');
    }
  }
  let title = '';
  let description = '';

  if (isTicketCreation && notification.source_id) {
    title = `New ticket from ${displayName}`;
    description = `${displayName} logged a new ticket #${notification.source_id}`;
  } else if (isComment && notification.source_id) {
    title = `New comment from ${displayName}`;
    description = `${displayName} commented on ticket #${notification.source_id}`;
  } else {
    title = `New notification from ${displayName}`;
    description = notification.action || 'Unspecified action';
  }
  if ((isTicketCreation || isComment) && notification.source_id) {
    toast(title, {
      description,
      duration: 5000, 
      action: {
        label: 'View',
        onClick: () => {
          window.location.href = `/tickets/${notification.source_id}`;
        },
      },
    });
  } else {
    toast(title, {
      description,
      duration: 5000, 
    });
  }
};