import { fetchAPI } from '@/lib/fetch-api';
import { Activity } from '../typescript/activity'; // Use relative path

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

// Add other activity-related service functions here later if needed
