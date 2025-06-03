import { fetchAPI } from '@/lib/fetch-api';
import { Automation, AutomationCreate, AutomationUpdate } from '@/typescript/automation';

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || 'https://enque-backend-production.up.railway.app';

/**
 * Fetches a list of automations from the backend.
 * @param activeOnly - Whether to fetch only active automations
 * @returns A promise that resolves to an array of Automation objects.
 */
export async function getAutomations(activeOnly: boolean = false): Promise<Automation[]> {
  try {
    const url = `${API_BASE_URL}/v1/automations/${activeOnly ? '?active_only=true' : ''}`;
    const response = await fetchAPI.GET<Automation[]>(url);
    if (response && response.success && response.data) {
      return response.data;
    } else {
      console.error('Error fetching automations:', response?.message || 'Unknown API error');
      return [];
    }
  } catch (error) {
    console.error('Error fetching automations (catch block):', error);
    return [];
  }
}

/**
 * Fetches a single automation by its ID.
 * @param automationId The ID of the automation to fetch.
 * @returns A promise that resolves to the Automation object.
 * @throws An error if the automation is not found or the request fails.
 */
export async function getAutomationById(automationId: number): Promise<Automation> {
  try {
    const url = `${API_BASE_URL}/v1/automations/${automationId}`;
    const response = await fetchAPI.GET<Automation>(url);
    if (response && response.success && response.data) {
      return response.data;
    } else {
      console.error(`Error fetching automation ${automationId}:`, response?.message || 'Unknown API error');
      throw new Error(response?.message || `Automation with ID ${automationId} not found`);
    }
  } catch (error) {
    console.error(`Error fetching automation ${automationId} (catch block):`, error);
    throw error;
  }
}

/**
 * Creates a new automation.
 * @param automationData The data for the new automation.
 * @returns A promise that resolves to the created Automation object.
 * @throws An error if the creation fails.
 */
export async function createAutomation(automationData: AutomationCreate): Promise<Automation> {
  try {
    const url = `${API_BASE_URL}/v1/automations/`;
    const response = await fetchAPI.POST<Automation>(
      url,
      automationData as unknown as Record<string, unknown>
    );

    if (response && response.success && response.data) {
      return response.data;
    } else {
      console.error('Error creating automation:', response?.message || 'Unknown API error');
      throw new Error(response?.message || 'Failed to create automation');
    }
  } catch (error) {
    console.error('Error creating automation (catch block):', error);
    throw error;
  }
}

/**
 * Updates an existing automation.
 * @param automationId The ID of the automation to update.
 * @param updateData The data to update.
 * @returns A promise that resolves to the updated Automation object.
 * @throws An error if the update fails.
 */
export async function updateAutomation(
  automationId: number,
  updateData: AutomationUpdate
): Promise<Automation> {
  try {
    const url = `${API_BASE_URL}/v1/automations/${automationId}`;
    const response = await fetchAPI.PUT<Automation>(
      url,
      updateData as unknown as Record<string, unknown>
    );

    if (response && response.success && response.data) {
      console.log('Automation updated successfully:', response.data);
      return response.data;
    } else {
      console.error(
        `Error updating automation ${automationId}:`,
        response?.message || 'API did not return successful data.'
      );
      throw new Error(response?.message || `Failed to update automation ${automationId}`);
    }
  } catch (error) {
    console.error(`Error updating automation ${automationId} (catch block):`, error);
    throw new Error(error instanceof Error ? error.message : `Failed to update automation ${automationId}`);
  }
}

/**
 * Deletes an automation by its ID.
 * @param automationId The ID of the automation to delete.
 * @returns A promise that resolves when the deletion is successful.
 * @throws An error if the deletion fails.
 */
export async function deleteAutomation(automationId: number): Promise<void> {
  try {
    const url = `${API_BASE_URL}/v1/automations/${automationId}`;
    const response = await fetchAPI.DELETE<unknown>(url);

    if (!response || !response.success) {
      console.error(`Error deleting automation ${automationId}:`, response?.message || 'Unknown API error');
      throw new Error(response?.message || `Failed to delete automation ${automationId}`);
    }
    console.log(`Automation ${automationId} deleted successfully.`);
  } catch (error) {
    console.error(`Error deleting automation ${automationId} (catch block):`, error);
    throw error;
  }
}

/**
 * Fetches automation statistics.
 * @returns A promise that resolves to automation statistics.
 */
export async function getAutomationStats(): Promise<{
  total_count: number;
  active_count: number;
}> {
  try {
    const url = `${API_BASE_URL}/v1/automations/stats/summary`;
    const response = await fetchAPI.GET<{
      total_count: number;
      active_count: number;
    }>(url);
    if (response && response.success && response.data) {
      return response.data;
    } else {
      console.error('Error fetching automation stats:', response?.message || 'Unknown API error');
      return { total_count: 0, active_count: 0 };
    }
  } catch (error) {
    console.error('Error fetching automation stats (catch block):', error);
    return { total_count: 0, active_count: 0 };
  }
} 