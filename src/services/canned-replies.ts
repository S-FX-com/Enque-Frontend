import { fetchAPI } from '@/lib/fetch-api';

// Updated types to match backend schema
export interface CannedReply {
  id: number;
  title: string;
  content: string;
  workspace_id: number;
  created_by_agent_id: number;
  is_enabled: boolean;
  category?: string;
  tags?: string[];
  usage_count: number;
  created_at: string;
  updated_at: string;
}

export interface CannedReplyCreate {
  title: string;
  content: string;
  workspace_id: number;
  is_enabled?: boolean;
  category?: string;
  tags?: string[];
}

export interface CannedReplyUpdate {
  title?: string;
  content?: string;
  is_enabled?: boolean;
  category?: string;
  tags?: string[];
}

export interface CannedReplyListResponse {
  items: CannedReply[];
  total: number;
  skip: number;
  limit: number;
}

export interface CannedReplyStats {
  total_count: number;
  enabled_count: number;
  categories: string[];
  tags: string[];
}

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL || 'https://enque-backend-production.up.railway.app';

/**
 * Fetches all canned replies for a workspace with optional filtering.
 */
export const getCannedReplies = async (
  workspaceId: number,
  options?: {
    enabledOnly?: boolean;
    skip?: number;
    limit?: number;
  }
): Promise<CannedReply[]> => {
  if (!workspaceId) {
    throw new Error('Invalid workspace ID provided');
  }

  try {
    const params = new URLSearchParams();
    params.append('workspace_id', workspaceId.toString());
    if (options?.enabledOnly) params.append('enabled_only', 'true');
    if (options?.skip) params.append('skip', options.skip.toString());
    if (options?.limit) params.append('limit', options.limit.toString());

    const url = `${API_BASE_URL}/v1/canned-replies?${params.toString()}`;
    const response = await fetchAPI.GET<CannedReply[]>(url);

    if (!response?.data) {
      throw new Error('Failed to fetch canned replies');
    }

    return response.data;
  } catch (error) {
    console.error('Error fetching canned replies:', error);
    throw error;
  }
};

/**
 * Fetches canned replies by category.
 */
export const getCannedRepliesByCategory = async (
  workspaceId: number,
  category: string,
  options?: { skip?: number; limit?: number }
): Promise<CannedReply[]> => {
  if (!workspaceId || !category) {
    throw new Error('Invalid parameters provided');
  }

  try {
    const params = new URLSearchParams({
      workspace_id: workspaceId.toString(),
      category,
      skip: (options?.skip || 0).toString(),
      limit: (options?.limit || 100).toString(),
    });

    const url = `${API_BASE_URL}/v1/canned-replies/category?${params.toString()}`;
    const response = await fetchAPI.GET<CannedReply[]>(url);

    if (!response?.data) {
      throw new Error('Failed to fetch canned replies by category');
    }

    return response.data;
  } catch (error) {
    console.error('Error fetching canned replies by category:', error);
    throw error;
  }
};

/**
 * Searches canned replies by tags.
 */
export const searchCannedRepliesByTags = async (
  workspaceId: number,
  tags: string[],
  options?: { skip?: number; limit?: number }
): Promise<CannedReply[]> => {
  if (!workspaceId || !tags.length) {
    throw new Error('Invalid parameters provided');
  }

  try {
    const params = new URLSearchParams({
      workspace_id: workspaceId.toString(),
      skip: (options?.skip || 0).toString(),
      limit: (options?.limit || 100).toString(),
    });

    tags.forEach(tag => params.append('tags', tag));

    const url = `${API_BASE_URL}/v1/canned-replies/search?${params.toString()}`;
    const response = await fetchAPI.GET<CannedReply[]>(url);

    if (!response?.data) {
      throw new Error('Failed to search canned replies by tags');
    }

    return response.data;
  } catch (error) {
    console.error('Error searching canned replies by tags:', error);
    throw error;
  }
};

/**
 * Fetches a specific canned reply by ID.
 */
export const getCannedReply = async (id: number): Promise<CannedReply> => {
  if (!id) {
    throw new Error('Invalid canned reply ID provided');
  }

  try {
    const url = `${API_BASE_URL}/v1/canned-replies/${id}`;
    const response = await fetchAPI.GET<CannedReply>(url);

    if (!response?.data) {
      throw new Error('Failed to fetch canned reply');
    }

    return response.data;
  } catch (error) {
    console.error(`Error fetching canned reply ${id}:`, error);
    throw error;
  }
};

/**
 * Creates a new canned reply.
 */
export const createCannedReply = async (data: CannedReplyCreate): Promise<CannedReply> => {
  if (!data.title || !data.content || !data.workspace_id) {
    throw new Error('Title, content, and workspace ID are required');
  }

  try {
    const url = `${API_BASE_URL}/v1/canned-replies/`;
    const response = await fetchAPI.POST<CannedReply>(url, data as unknown as Record<string, unknown>);

    if (!response?.data) {
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
 */
export const updateCannedReply = async (
  id: number,
  data: CannedReplyUpdate
): Promise<CannedReply> => {
  if (!id) {
    throw new Error('Invalid canned reply ID provided');
  }

  try {
    const url = `${API_BASE_URL}/v1/canned-replies/${id}`;
    const response = await fetchAPI.PUT<CannedReply>(url, data as unknown as Record<string, unknown>);

    if (!response?.data) {
      throw new Error('Failed to update canned reply');
    }

    return response.data;
  } catch (error) {
    console.error(`Error updating canned reply ${id}:`, error);
    throw error;
  }
};

/**
 * Deletes a canned reply.
 */
export const deleteCannedReply = async (id: number): Promise<void> => {
  if (!id) {
    throw new Error('Invalid canned reply ID provided');
  }

  try {
    const url = `${API_BASE_URL}/v1/canned-replies/${id}`;
    await fetchAPI.DELETE<void>(url);
  } catch (error) {
    console.error(`Error deleting canned reply ${id}:`, error);
    throw error;
  }
};

/**
 * Gets canned reply statistics for a workspace.
 */
export const getCannedReplyStats = async (workspaceId: number): Promise<CannedReplyStats> => {
  if (!workspaceId) {
    throw new Error('Invalid workspace ID provided');
  }

  try {
    const url = `${API_BASE_URL}/v1/canned-replies/stats?workspace_id=${workspaceId}`;
    const response = await fetchAPI.GET<CannedReplyStats>(url);

    if (!response?.data) {
      throw new Error('Failed to fetch canned reply stats');
    }

    return response.data;
  } catch (error) {
    console.error('Error fetching canned reply stats:', error);
    throw error;
  }
};
