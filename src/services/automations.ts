import { fetchAPI } from '@/lib/fetch-api';

// Define types for automations
export interface Automation {
  id: number;
  name: string;
  description: string;
  type: string;
  is_enabled: boolean;
  schedule: {
    frequency: string;
    day: string;
    time: string;
  };
  template: {
    subject: string;
    content: string;
  };
  filters: Record<string, any>;
  workspace_id: number;
  created_at: string;
  updated_at: string;
}

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL || 'https://enque-backend-production.up.railway.app';

/**
 * Fetches all automations for a workspace.
 * @param workspaceId The ID of the workspace.
 * @returns A promise that resolves to an array of automations.
 */
export const getAutomations = async (workspaceId: number): Promise<Automation[]> => {
  if (!workspaceId) {
    console.error('getAutomations requires a valid workspaceId');
    throw new Error('Invalid workspace ID provided');
  }

  try {
    const url = `${API_BASE_URL}/v1/workspaces/${workspaceId}/automations`;
    const response = await fetchAPI.GET<Automation[]>(url);

    if (!response || !response.data) {
      console.error('Failed to fetch automations or data is missing');
      throw new Error('Failed to fetch automations');
    }

    return response.data;
  } catch (error) {
    console.error('Error fetching automations:', error);
    throw error;
  }
};

/**
 * Fetches a specific automation.
 * @param workspaceId The ID of the workspace.
 * @param automationId The ID of the automation.
 * @returns A promise that resolves to the automation.
 */
export const getAutomation = async (
  workspaceId: number,
  automationId: number
): Promise<Automation> => {
  if (!workspaceId || !automationId) {
    console.error('getAutomation requires valid workspaceId and automationId');
    throw new Error('Invalid IDs provided');
  }

  try {
    const url = `${API_BASE_URL}/v1/workspaces/${workspaceId}/automations/${automationId}`;
    const response = await fetchAPI.GET<Automation>(url);

    if (!response || !response.data) {
      console.error(`Failed to fetch automation ${automationId} or data is missing`);
      throw new Error('Failed to fetch automation');
    }

    return response.data;
  } catch (error) {
    console.error(`Error fetching automation ${automationId}:`, error);
    throw error;
  }
};

/**
 * Creates a new automation.
 * @param workspaceId The ID of the workspace.
 * @param automationData The data for the new automation.
 * @returns A promise that resolves to the created automation.
 */
export const createAutomation = async (
  workspaceId: number,
  automationData: Omit<Automation, 'id' | 'workspace_id' | 'created_at' | 'updated_at'>
): Promise<Automation> => {
  if (!workspaceId) {
    console.error('createAutomation requires a valid workspaceId');
    throw new Error('Invalid workspace ID provided');
  }

  try {
    const url = `${API_BASE_URL}/v1/workspaces/${workspaceId}/automations`;
    const response = await fetchAPI.POST<Automation>(url, automationData);

    if (!response || !response.data) {
      console.error('Failed to create automation or data is missing');
      throw new Error('Failed to create automation');
    }

    return response.data;
  } catch (error) {
    console.error('Error creating automation:', error);
    throw error;
  }
};

/**
 * Updates an existing automation.
 * @param workspaceId The ID of the workspace.
 * @param automationId The ID of the automation to update.
 * @param automationData The data to update.
 * @returns A promise that resolves to the updated automation.
 */
export const updateAutomation = async (
  workspaceId: number,
  automationId: number,
  automationData: Partial<Omit<Automation, 'id' | 'workspace_id' | 'created_at' | 'updated_at'>>
): Promise<Automation> => {
  if (!workspaceId || !automationId) {
    console.error('updateAutomation requires valid workspaceId and automationId');
    throw new Error('Invalid IDs provided');
  }

  try {
    const url = `${API_BASE_URL}/v1/workspaces/${workspaceId}/automations/${automationId}`;
    const response = await fetchAPI.PUT<Automation>(url, automationData);

    if (!response || !response.data) {
      console.error(`Failed to update automation ${automationId} or data is missing`);
      throw new Error('Failed to update automation');
    }

    return response.data;
  } catch (error) {
    console.error(`Error updating automation ${automationId}:`, error);
    throw error;
  }
};

/**
 * Deletes an automation.
 * @param workspaceId The ID of the workspace.
 * @param automationId The ID of the automation to delete.
 * @returns A promise that resolves when the deletion is successful.
 */
export const deleteAutomation = async (
  workspaceId: number,
  automationId: number
): Promise<void> => {
  if (!workspaceId || !automationId) {
    console.error('deleteAutomation requires valid workspaceId and automationId');
    throw new Error('Invalid IDs provided');
  }

  try {
    const url = `${API_BASE_URL}/v1/workspaces/${workspaceId}/automations/${automationId}`;
    await fetchAPI.DELETE<void>(url);
    console.log(`Automation ${automationId} deleted successfully.`);
  } catch (error) {
    console.error(`Error deleting automation ${automationId}:`, error);
    throw error;
  }
};

/**
 * Toggles an automation on or off.
 * @param workspaceId The ID of the workspace.
 * @param automationId The ID of the automation to toggle.
 * @param isEnabled Whether the automation should be enabled or disabled.
 * @returns A promise that resolves to the updated automation.
 */
export const toggleAutomation = async (
  workspaceId: number,
  automationId: number,
  isEnabled: boolean
): Promise<Automation> => {
  if (!workspaceId || !automationId) {
    console.error('toggleAutomation requires valid workspaceId and automationId');
    throw new Error('Invalid IDs provided');
  }

  try {
    const url = `${API_BASE_URL}/v1/workspaces/${workspaceId}/automations/${automationId}/toggle`;
    const response = await fetchAPI.PUT<Automation>(url, { is_enabled: isEnabled });

    if (!response || !response.data) {
      console.error(`Failed to toggle automation ${automationId} or data is missing`);
      throw new Error('Failed to toggle automation');
    }

    return response.data;
  } catch (error) {
    console.error(`Error toggling automation ${automationId}:`, error);
    throw error;
  }
};

/**
 * Runs an automation immediately (for testing).
 * @param workspaceId The ID of the workspace.
 * @param automationId The ID of the automation to run.
 * @returns A promise that resolves to a status object.
 */
export const runAutomation = async (
  workspaceId: number,
  automationId: number
): Promise<{ success: boolean; message: string }> => {
  if (!workspaceId || !automationId) {
    console.error('runAutomation requires valid workspaceId and automationId');
    throw new Error('Invalid IDs provided');
  }

  try {
    const url = `${API_BASE_URL}/v1/workspaces/${workspaceId}/automations/${automationId}/run`;
    const response = await fetchAPI.POST<{ success: boolean; message: string }>(url, {});

    if (!response || !response.data) {
      console.error(`Failed to run automation ${automationId} or data is missing`);
      throw new Error('Failed to run automation');
    }

    return response.data;
  } catch (error) {
    console.error(`Error running automation ${automationId}:`, error);
    throw error;
  }
};
