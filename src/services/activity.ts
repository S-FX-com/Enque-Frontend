import { fetchAPI } from '@/lib/fetch-api';
import { Activity } from '../typescript/activity'; // Use relative path
import { toast } from 'sonner'; // Importar toast de sonner

// Use the production URL directly. Ensure NEXT_PUBLIC_API_BASE_URL is set in the production environment.
const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL || 'https://enque-backend-production.up.railway.app';

/**
 * Fetches recent notifications (activities).
 * @param limit Optional limit for the number of notifications to fetch.
 * @returns A promise that resolves to an array of activities.
 */
export const getNotifications = async (limit: number = 10): Promise<Activity[]> => {
  try {
    const url = `${API_BASE_URL}/v1/notifications?limit=${limit}`;
    // Assuming the endpoint returns ActivityWithDetails which matches our Activity type
    const response = await fetchAPI.GET<Activity[]>(url);

    if (!response || !response.data) {
      console.error('Failed to fetch notifications or data is missing');
      return []; // Return empty array on failure
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
 * Shows a toast notification when a new activity is received.
 * @param notification The notification to display
 */
export const showNotificationToast = (notification: Activity): void => {
  // Determine the content type based on notification type
  const isTicketCreation = notification.source_type === 'Ticket';
  const isComment = notification.source_type === 'Comment';
  const isUserCreator = isTicketCreation && 
    (notification.creator_user_id || notification.creator_user_email);
  
  const displayName = isUserCreator
    ? notification.creator_user_name || 'User'
    : notification.agent?.name || 'System';

  // Text for toast notification title and description
  let title = '';
  let description = '';
  
  if (isTicketCreation && notification.source_id) {
    title = `New ticket from ${displayName}`;
    description = `${displayName} logged a new ticket #${notification.source_id}`;
  } else if (isComment && notification.source_id) {
    title = `New comment from ${displayName}`;
    description = notification.action || `${displayName} commented on ticket #${notification.source_id}`;
  } else {
    title = `New notification from ${displayName}`;
    description = notification.action || 'Unspecified action';
  }

  // Determine URL for when notification is clicked - use action button for tickets and comments
  if ((isTicketCreation || isComment) && notification.source_id) {
    // Para notificaciones de tickets y comentarios, usar estilo default (gris claro tipo iPhone)
    toast(title, {
      description,
      duration: 5000, // 5 seconds
      action: {
        label: 'View',
        onClick: () => {
          window.location.href = `/tickets?openTicket=${notification.source_id}`;
        }
      }
    });
  } else {
    // For other notifications use normal toast
    toast(title, {
      description,
      duration: 5000 // 5 seconds
    });
  }
};

// Add other activity-related service functions here later if needed
