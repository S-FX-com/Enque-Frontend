import { fetchAPI } from '@/lib/fetch-api';

// Define types for workflows
export interface WorkflowCondition {
  field: string;
  operator: string;
  value: string | number | boolean;
}

export interface WorkflowAction {
  type: string;
  config: Record<string, any>;
}

export interface Workflow {
  id: number;
  name: string;
  description: string;
  is_enabled: boolean;
  trigger: string;
  conditions: WorkflowCondition[];
  actions: WorkflowAction[];
  workspace_id: number;
  created_at: string;
  updated_at: string;
}

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL || 'https://enque-backend-production.up.railway.app';

/**
 * Fetches all workflows for a workspace.
 * @param workspaceId The ID of the workspace.
 * @returns A promise that resolves to an array of workflows.
 */
export const getWorkflows = async (workspaceId: number): Promise<Workflow[]> => {
  if (!workspaceId) {
    console.error('getWorkflows requires a valid workspaceId');
    throw new Error('Invalid workspace ID provided');
  }

  try {
    const url = `${API_BASE_URL}/v1/workspaces/${workspaceId}/workflows`;
    const response = await fetchAPI.GET<Workflow[]>(url);

    if (!response || !response.data) {
      console.error('Failed to fetch workflows or data is missing');
      throw new Error('Failed to fetch workflows');
    }

    return response.data;
  } catch (error) {
    console.error('Error fetching workflows:', error);
    throw error;
  }
};

/**
 * Fetches a specific workflow.
 * @param workspaceId The ID of the workspace.
 * @param workflowId The ID of the workflow.
 * @returns A promise that resolves to the workflow.
 */
export const getWorkflow = async (workspaceId: number, workflowId: number): Promise<Workflow> => {
  if (!workspaceId || !workflowId) {
    console.error('getWorkflow requires valid workspaceId and workflowId');
    throw new Error('Invalid IDs provided');
  }

  try {
    const url = `${API_BASE_URL}/v1/workspaces/${workspaceId}/workflows/${workflowId}`;
    const response = await fetchAPI.GET<Workflow>(url);

    if (!response || !response.data) {
      console.error(`Failed to fetch workflow ${workflowId} or data is missing`);
      throw new Error('Failed to fetch workflow');
    }

    return response.data;
  } catch (error) {
    console.error(`Error fetching workflow ${workflowId}:`, error);
    throw error;
  }
};

/**
 * Creates a new workflow.
 * @param workspaceId The ID of the workspace.
 * @param workflowData The data for the new workflow.
 * @returns A promise that resolves to the created workflow.
 */
export const createWorkflow = async (
  workspaceId: number,
  workflowData: Omit<Workflow, 'id' | 'workspace_id' | 'created_at' | 'updated_at'>
): Promise<Workflow> => {
  if (!workspaceId) {
    console.error('createWorkflow requires a valid workspaceId');
    throw new Error('Invalid workspace ID provided');
  }

  try {
    const url = `${API_BASE_URL}/v1/workspaces/${workspaceId}/workflows`;
    const response = await fetchAPI.POST<Workflow>(url, workflowData);

    if (!response || !response.data) {
      console.error('Failed to create workflow or data is missing');
      throw new Error('Failed to create workflow');
    }

    return response.data;
  } catch (error) {
    console.error('Error creating workflow:', error);
    throw error;
  }
};

/**
 * Updates an existing workflow.
 * @param workspaceId The ID of the workspace.
 * @param workflowId The ID of the workflow to update.
 * @param workflowData The data to update.
 * @returns A promise that resolves to the updated workflow.
 */
export const updateWorkflow = async (
  workspaceId: number,
  workflowId: number,
  workflowData: Partial<Omit<Workflow, 'id' | 'workspace_id' | 'created_at' | 'updated_at'>>
): Promise<Workflow> => {
  if (!workspaceId || !workflowId) {
    console.error('updateWorkflow requires valid workspaceId and workflowId');
    throw new Error('Invalid IDs provided');
  }

  try {
    const url = `${API_BASE_URL}/v1/workspaces/${workspaceId}/workflows/${workflowId}`;
    const response = await fetchAPI.PUT<Workflow>(url, workflowData);

    if (!response || !response.data) {
      console.error(`Failed to update workflow ${workflowId} or data is missing`);
      throw new Error('Failed to update workflow');
    }

    return response.data;
  } catch (error) {
    console.error(`Error updating workflow ${workflowId}:`, error);
    throw error;
  }
};

/**
 * Deletes a workflow.
 * @param workspaceId The ID of the workspace.
 * @param workflowId The ID of the workflow to delete.
 * @returns A promise that resolves when the deletion is successful.
 */
export const deleteWorkflow = async (workspaceId: number, workflowId: number): Promise<void> => {
  if (!workspaceId || !workflowId) {
    console.error('deleteWorkflow requires valid workspaceId and workflowId');
    throw new Error('Invalid IDs provided');
  }

  try {
    const url = `${API_BASE_URL}/v1/workspaces/${workspaceId}/workflows/${workflowId}`;
    await fetchAPI.DELETE<void>(url);
    console.log(`Workflow ${workflowId} deleted successfully.`);
  } catch (error) {
    console.error(`Error deleting workflow ${workflowId}:`, error);
    throw error;
  }
};

/**
 * Toggles a workflow on or off.
 * @param workspaceId The ID of the workspace.
 * @param workflowId The ID of the workflow to toggle.
 * @param isEnabled Whether the workflow should be enabled or disabled.
 * @returns A promise that resolves to the updated workflow.
 */
export const toggleWorkflow = async (
  workspaceId: number,
  workflowId: number,
  isEnabled: boolean
): Promise<Workflow> => {
  if (!workspaceId || !workflowId) {
    console.error('toggleWorkflow requires valid workspaceId and workflowId');
    throw new Error('Invalid IDs provided');
  }

  try {
    const url = `${API_BASE_URL}/v1/workspaces/${workspaceId}/workflows/${workflowId}/toggle`;
    const response = await fetchAPI.PUT<Workflow>(url, { is_enabled: isEnabled });

    if (!response || !response.data) {
      console.error(`Failed to toggle workflow ${workflowId} or data is missing`);
      throw new Error('Failed to toggle workflow');
    }

    return response.data;
  } catch (error) {
    console.error(`Error toggling workflow ${workflowId}:`, error);
    throw error;
  }
};

/**
 * Duplicates a workflow.
 * @param workspaceId The ID of the workspace.
 * @param workflowId The ID of the workflow to duplicate.
 * @returns A promise that resolves to the duplicated workflow.
 */
export const duplicateWorkflow = async (
  workspaceId: number,
  workflowId: number
): Promise<Workflow> => {
  if (!workspaceId || !workflowId) {
    console.error('duplicateWorkflow requires valid workspaceId and workflowId');
    throw new Error('Invalid IDs provided');
  }

  try {
    const url = `${API_BASE_URL}/v1/workspaces/${workspaceId}/workflows/${workflowId}/duplicate`;
    const response = await fetchAPI.POST<Workflow>(url, {});

    if (!response || !response.data) {
      console.error(`Failed to duplicate workflow ${workflowId} or data is missing`);
      throw new Error('Failed to duplicate workflow');
    }

    return response.data;
  } catch (error) {
    console.error(`Error duplicating workflow ${workflowId}:`, error);
    throw error;
  }
};

/**
 * Gets available triggers for workflows.
 * @param workspaceId The ID of the workspace.
 * @returns A promise that resolves to an array of available triggers.
 */
export const getWorkflowTriggers = async (
  workspaceId: number
): Promise<{ id: string; name: string; description: string }[]> => {
  if (!workspaceId) {
    console.error('getWorkflowTriggers requires a valid workspaceId');
    throw new Error('Invalid workspace ID provided');
  }

  try {
    const url = `${API_BASE_URL}/v1/workspaces/${workspaceId}/workflows/triggers`;
    const response = await fetchAPI.GET<{ id: string; name: string; description: string }[]>(url);

    if (!response || !response.data) {
      console.error('Failed to fetch workflow triggers or data is missing');
      throw new Error('Failed to fetch workflow triggers');
    }

    return response.data;
  } catch (error) {
    console.error('Error fetching workflow triggers:', error);
    throw error;
  }
};

/**
 * Gets available actions for workflows.
 * @param workspaceId The ID of the workspace.
 * @returns A promise that resolves to an array of available actions.
 */
export const getWorkflowActions = async (
  workspaceId: number
): Promise<
  { id: string; name: string; description: string; config_schema: Record<string, any> }[]
> => {
  if (!workspaceId) {
    console.error('getWorkflowActions requires a valid workspaceId');
    throw new Error('Invalid workspace ID provided');
  }

  try {
    const url = `${API_BASE_URL}/v1/workspaces/${workspaceId}/workflows/actions`;
    const response =
      await fetchAPI.GET<
        { id: string; name: string; description: string; config_schema: Record<string, any> }[]
      >(url);

    if (!response || !response.data) {
      console.error('Failed to fetch workflow actions or data is missing');
      throw new Error('Failed to fetch workflow actions');
    }

    return response.data;
  } catch (error) {
    console.error('Error fetching workflow actions:', error);
    throw error;
  }
};
