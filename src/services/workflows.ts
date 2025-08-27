import { fetchAPI } from '@/lib/fetch-api';

// Define types for workflows with enhanced message analysis
export interface WorkflowCondition {
  field: string;
  operator: string;
  value: string | number | boolean;
}

export interface WorkflowAction {
  type: string;
  config: Record<string, unknown>;
}

export interface MessageAnalysisRule {
  keywords: string[];
  exclude_keywords: string[];
  sentiment_threshold?: number; // -1 to 1 scale
  urgency_keywords: string[];
  language?: string;
  min_confidence: number;
}

export interface Workflow {
  id: number;
  name: string;
  description: string;
  is_enabled: boolean;
  trigger: string;
  message_analysis_rules?: MessageAnalysisRule; // New field for content analysis
  conditions: WorkflowCondition[];
  actions: WorkflowAction[];
  workspace_id: number;
  created_at: string;
  updated_at: string;
}

// Define specific types for API responses
export interface WorkflowTrigger {
  value: string;
  label: string;
  description: string;
}

export interface WorkflowActionOption {
  id: string;
  name: string;
  description: string;
  config_schema: Record<string, unknown>;
}

// Message analysis result type
export interface MessageAnalysisResult {
  sentiment: number; // -1 to 1
  urgency_level: string; // low, medium, high
  keywords_found: string[];
  categories: string[];
  language: string;
  confidence: number;
}

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL || 'https://enque-backend-production.up.railway.app';

/**
 * Fetches all workflows for a workspace.
 * @param workspaceId The ID of the workspace.
 * @returns A promise that resolves to an array of workflows.
 */

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

/**
 * Updates an existing workflow.
 * @param workspaceId The ID of the workspace.
 * @param workflowId The ID of the workflow to update.
 * @param workflowData The data to update.
 * @returns A promise that resolves to the updated workflow.
 */

/**
 * Deletes a workflow.
 * @param workspaceId The ID of the workspace.
 * @param workflowId The ID of the workflow to delete.
 * @returns A promise that resolves when the deletion is successful.
 */

/**
 * Toggles a workflow on or off.
 * @param workspaceId The ID of the workspace.
 * @param workflowId The ID of the workflow to toggle.
 * @param isEnabled Whether the workflow should be enabled or disabled.
 * @returns A promise that resolves to the updated workflow.
 */

/**
 * Duplicates a workflow.
 * @param workspaceId The ID of the workspace.
 * @param workflowId The ID of the workflow to duplicate.
 * @returns A promise that resolves to the duplicated workflow.
 */

/**
 * Fetches available workflow triggers.
 * @param workspaceId The ID of the workspace.
 * @returns A promise that resolves to available triggers.
 */

/**
 * Fetches available workflow actions.
 * @param workspaceId The ID of the workspace.
 * @returns A promise that resolves to available actions.
 */

/**
 * Test message analysis functionality.
 * @param workspaceId The ID of the workspace.
 * @param message The message to analyze.
 * @param analysisRules Optional analysis rules.
 * @returns A promise that resolves to the analysis result.
 */
