import { fetchAPI } from '@/lib/fetch-api'; // Corrected import name
import { IComment } from '@/typescript/comment';
import { ITicket } from '@/typescript/ticket'; // Import ITicket type
import { AppConfigs } from '@/configs'; // Import AppConfigs

/**
 * Fetches comments for a specific task.
 * @param taskId - The ID of the task.
 * // Removed token parameter as fetchAPI handles it internally
 * @param skip - The number of comments to skip (for pagination).
 * @param limit - The maximum number of comments to return.
 * @returns A promise that resolves to an array of comments.
 */
export const getCommentsByTaskId = async (
  taskId: number,
  // token: string, // Removed token parameter
  skip: number = 0,
  limit: number = 100
): Promise<IComment[]> => {
  try {
    const url = `${AppConfigs.api}/tasks/${taskId}/comments?skip=${skip}&limit=${limit}`;
    const response = await fetchAPI.GET<IComment[]>(url);

    if (!response.success || !response.data) {
      // Handle API error response based on BaseResponse structure
      const errorMessage = response.message || 'Failed to fetch comments';
      console.error('Failed to fetch comments:', errorMessage);
      throw new Error(errorMessage);
      // Or return [];
    }
    return response.data;
  } catch (error) {
    console.error('Error fetching comments:', error);
    if (error instanceof Error) {
      throw error;
    } else {
      throw new Error('An unknown error occurred while fetching comments.');
    }
    // Or return [];
  }
};
export interface IScheduledComment {
  due_date: string;
  status: string;
}
export const getScheduledCommentsByTaskId = async (
  taskId: number
): Promise<IScheduledComment[]> => {
  try {
    const url = `${AppConfigs.api}/tasks/${taskId}/scheduled_comments`;
    const response = await fetchAPI.GET<IScheduledComment[]>(url);
    if (!response.success || !response.data) {
      const errorMessage = response.message || 'Failed to fetch scheduled comments';
      console.error('Failed to fetch scheduled comments:', errorMessage);
      throw new Error(errorMessage);
      // Or return [];
    }
    return response.data;
  } catch (error) {
    console.error('Error fetching comments:', error);
    if (error instanceof Error) {
      throw error;
    } else {
      throw new Error('An unknown error occurred while fetching comments.');
    }
    // Or return [];
  }
};

export interface CreateCommentPayload {
  content: string;
  ticket_id: number;
  agent_id: number;
  workspace_id: number;
  is_private: boolean;
  attachment_ids?: number[];
  to_recipients?: string;
  other_destinaries?: string;
  bcc_recipients?: string;
  scheduled_send_at?: string;
  [key: string]: unknown;
}
/**
 * @param taskId
 * @param payload
 * @returns
 */
export interface CommentResponseData {
  comment?: IComment;
  task: ITicket;
  assignee_changed: boolean;
  is_scheduled?: boolean;
  scheduled_comment?: {
    id: number;
    ticket_id: number;
    agent_id: number;
    workspace_id: number;
    content: string;
    scheduled_send_at: string;
    status: string;
    created_at: string;
  };
}

export const createComment = async (
  taskId: number,
  payload: CreateCommentPayload
): Promise<CommentResponseData> => {
  try {
    const url = `${AppConfigs.api}/tasks/${taskId}/comments`;
    const response = await fetchAPI.POST<CommentResponseData>(url, payload);

    if (!response.success || !response.data) {
      // Handle API error response
      const errorMessage = response.message || 'Failed to create comment';
      console.error('Failed to create comment:', errorMessage);
      throw new Error(errorMessage);
    }

    // Return the response data containing both comment and updated task
    return response.data;
  } catch (error) {
    console.error('Error creating comment:', error);
    // Re-throw the error
    if (error instanceof Error) {
      throw error;
    } else {
      throw new Error('An unknown error occurred while creating the comment.');
    }
  }
};

export interface S3ContentResponse {
  status: 'content_in_database' | 'loaded_from_s3' | 's3_error_fallback';
  content: string;
  s3_url?: string;
  message: string;
}
const s3ContentCache = new Map<number, S3ContentResponse>();
/**
 * @param commentId
 * @returns
 */
export async function getCommentS3Content(commentId: number): Promise<S3ContentResponse> {
  // Verificar cache
  if (s3ContentCache.has(commentId)) {
    return s3ContentCache.get(commentId)!;
  }

  try {
    const url = `${AppConfigs.api}/comments/${commentId}/s3-content`;
    const response = await fetchAPI.GET<S3ContentResponse>(url);

    if (response && response.success && response.data) {
      // Guardar en cache por 5 minutos
      s3ContentCache.set(commentId, response.data);

      // Limpiar cache después de 5 minutos
      setTimeout(
        () => {
          s3ContentCache.delete(commentId);
        },
        5 * 60 * 1000
      );

      return response.data;
    } else {
      const errorMsg = response?.message || 'Failed to get S3 content';
      throw new Error(errorMsg);
    }
  } catch (error) {
    console.error(`💥 Exception in getCommentS3Content for comment ${commentId}:`, error);
    throw error;
  }
}
