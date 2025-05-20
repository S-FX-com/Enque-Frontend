import { fetchAPI } from '@/lib/fetch-api';

// Define types for canned replies
export interface CannedReply {
  id: number;
  title: string;
  content: string;
  is_enabled: boolean;
  category_id?: number;
  workspace_id: number;
  created_by: number;
  created_at: string;
  updated_at: string;
}

export interface CannedReplyCategory {
  id: number;
  name: string;
  workspace_id: number;
  created_at: string;
  updated_at: string;
}

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL || 'https://enque-backend-production.up.railway.app';

/**
 * Fetches all canned replies for a workspace.
 * @param workspaceId The ID of the workspace.
 * @returns A promise that resolves to an array of canned replies.
 */
export const getCannedReplies = async (workspaceId: number): Promise<CannedReply[]> => {
  if (!workspaceId) {
    console.error('getCannedReplies requires a valid workspaceId');
    throw new Error('Invalid workspace ID provided');
  }

  try {
    const url = `${API_BASE_URL}/v1/workspaces/${workspaceId}/canned-replies`;
    const response = await fetchAPI.GET<CannedReply[]>(url);

    if (!response || !response.data) {
      console.error('Failed to fetch canned replies or data is missing');
      throw new Error('Failed to fetch canned replies');
    }

    return response.data;
  } catch (error) {
    console.error('Error fetching canned replies:', error);
    throw error;
  }
};

/**
 * Fetches a specific canned reply.
 * @param workspaceId The ID of the workspace.
 * @param replyId The ID of the canned reply.
 * @returns A promise that resolves to the canned reply.
 */
export const getCannedReply = async (
  workspaceId: number,
  replyId: number
): Promise<CannedReply> => {
  if (!workspaceId || !replyId) {
    console.error('getCannedReply requires valid workspaceId and replyId');
    throw new Error('Invalid IDs provided');
  }

  try {
    const url = `${API_BASE_URL}/v1/workspaces/${workspaceId}/canned-replies/${replyId}`;
    const response = await fetchAPI.GET<CannedReply>(url);

    if (!response || !response.data) {
      console.error(`Failed to fetch canned reply ${replyId} or data is missing`);
      throw new Error('Failed to fetch canned reply');
    }

    return response.data;
  } catch (error) {
    console.error(`Error fetching canned reply ${replyId}:`, error);
    throw error;
  }
};

/**
 * Creates a new canned reply.
 * @param workspaceId The ID of the workspace.
 * @param title The title of the canned reply.
 * @param content The content of the canned reply.
 * @param categoryId Optional category ID for the canned reply.
 * @returns A promise that resolves to the created canned reply.
 */
export const createCannedReply = async (
  workspaceId: number,
  title: string,
  content: string,
  categoryId?: number
): Promise<CannedReply> => {
  if (!workspaceId) {
    console.error('createCannedReply requires a valid workspaceId');
    throw new Error('Invalid workspace ID provided');
  }

  if (!title || !content) {
    console.error('createCannedReply requires title and content');
    throw new Error('Title and content are required');
  }

  try {
    const url = `${API_BASE_URL}/v1/workspaces/${workspaceId}/canned-replies`;
    const data = {
      title,
      content,
      category_id: categoryId,
    };

    const response = await fetchAPI.POST<CannedReply>(url, data);

    if (!response || !response.data) {
      console.error('Failed to create canned reply or data is missing');
      throw new Error('Failed to create canned reply');
    }

    return response.data;
  } catch (error) {
    console.error('Error creating canned reply:', error);
    throw error;
  }
};

/**
 * Updates an existing canned reply.
 * @param workspaceId The ID of the workspace.
 * @param replyId The ID of the canned reply to update.
 * @param updateData The data to update.
 * @returns A promise that resolves to the updated canned reply.
 */
export const updateCannedReply = async (
  workspaceId: number,
  replyId: number,
  updateData: {
    title?: string;
    content?: string;
    is_enabled?: boolean;
    category_id?: number | null;
  }
): Promise<CannedReply> => {
  if (!workspaceId || !replyId) {
    console.error('updateCannedReply requires valid workspaceId and replyId');
    throw new Error('Invalid IDs provided');
  }

  try {
    const url = `${API_BASE_URL}/v1/workspaces/${workspaceId}/canned-replies/${replyId}`;
    const response = await fetchAPI.PUT<CannedReply>(url, updateData);

    if (!response || !response.data) {
      console.error(`Failed to update canned reply ${replyId} or data is missing`);
      throw new Error('Failed to update canned reply');
    }

    return response.data;
  } catch (error) {
    console.error(`Error updating canned reply ${replyId}:`, error);
    throw error;
  }
};

/**
 * Deletes a canned reply.
 * @param workspaceId The ID of the workspace.
 * @param replyId The ID of the canned reply to delete.
 * @returns A promise that resolves when the deletion is successful.
 */
export const deleteCannedReply = async (workspaceId: number, replyId: number): Promise<void> => {
  if (!workspaceId || !replyId) {
    console.error('deleteCannedReply requires valid workspaceId and replyId');
    throw new Error('Invalid IDs provided');
  }

  try {
    const url = `${API_BASE_URL}/v1/workspaces/${workspaceId}/canned-replies/${replyId}`;
    await fetchAPI.DELETE<void>(url);
    console.log(`Canned reply ${replyId} deleted successfully.`);
  } catch (error) {
    console.error(`Error deleting canned reply ${replyId}:`, error);
    throw error;
  }
};

/**
 * Toggles a canned reply on or off.
 * @param workspaceId The ID of the workspace.
 * @param replyId The ID of the canned reply to toggle.
 * @param isEnabled Whether the canned reply should be enabled or disabled.
 * @returns A promise that resolves to the updated canned reply.
 */
export const toggleCannedReply = async (
  workspaceId: number,
  replyId: number,
  isEnabled: boolean
): Promise<CannedReply> => {
  if (!workspaceId || !replyId) {
    console.error('toggleCannedReply requires valid workspaceId and replyId');
    throw new Error('Invalid IDs provided');
  }

  try {
    const url = `${API_BASE_URL}/v1/workspaces/${workspaceId}/canned-replies/${replyId}/toggle`;
    const response = await fetchAPI.PUT<CannedReply>(url, { is_enabled: isEnabled });

    if (!response || !response.data) {
      console.error(`Failed to toggle canned reply ${replyId} or data is missing`);
      throw new Error('Failed to toggle canned reply');
    }

    return response.data;
  } catch (error) {
    console.error(`Error toggling canned reply ${replyId}:`, error);
    throw error;
  }
};

/**
 * Fetches all canned reply categories for a workspace.
 * @param workspaceId The ID of the workspace.
 * @returns A promise that resolves to an array of canned reply categories.
 */
export const getCannedReplyCategories = async (
  workspaceId: number
): Promise<CannedReplyCategory[]> => {
  if (!workspaceId) {
    console.error('getCannedReplyCategories requires a valid workspaceId');
    throw new Error('Invalid workspace ID provided');
  }

  try {
    const url = `${API_BASE_URL}/v1/workspaces/${workspaceId}/canned-replies/categories`;
    const response = await fetchAPI.GET<CannedReplyCategory[]>(url);

    if (!response || !response.data) {
      console.error('Failed to fetch canned reply categories or data is missing');
      throw new Error('Failed to fetch canned reply categories');
    }

    return response.data;
  } catch (error) {
    console.error('Error fetching canned reply categories:', error);
    throw error;
  }
};

/**
 * Creates a new canned reply category.
 * @param workspaceId The ID of the workspace.
 * @param name The name of the category.
 * @returns A promise that resolves to the created category.
 */
export const createCannedReplyCategory = async (
  workspaceId: number,
  name: string
): Promise<CannedReplyCategory> => {
  if (!workspaceId) {
    console.error('createCannedReplyCategory requires a valid workspaceId');
    throw new Error('Invalid workspace ID provided');
  }

  if (!name) {
    console.error('createCannedReplyCategory requires a name');
    throw new Error('Category name is required');
  }

  try {
    const url = `${API_BASE_URL}/v1/workspaces/${workspaceId}/canned-replies/categories`;
    const response = await fetchAPI.POST<CannedReplyCategory>(url, { name });

    if (!response || !response.data) {
      console.error('Failed to create canned reply category or data is missing');
      throw new Error('Failed to create canned reply category');
    }

    return response.data;
  } catch (error) {
    console.error('Error creating canned reply category:', error);
    throw error;
  }
};
