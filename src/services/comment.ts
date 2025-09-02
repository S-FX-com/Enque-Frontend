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

export interface CreateCommentPayload {
  content: string;
  ticket_id: number;
  agent_id: number;
  workspace_id: number;
  is_private: boolean;
  attachment_ids?: number[]; 
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
  status: 'content_in_database' | 'loaded_from_s3' | 's3_error_fallback' | 'presigned_url_generated';
  content?: string;
  presigned_url?: string;
  message: string;
}

const s3ContentCache = new Map<number, string>();

export async function getCommentS3Content(commentId: number): Promise<S3ContentResponse> {
  if (s3ContentCache.has(commentId)) {
    return {
      status: 'loaded_from_s3',
      content: s3ContentCache.get(commentId)!,
      message: 'Content loaded from cache',
    };
  }

  try {
    const apiUrl = `${AppConfigs.api}/comments/${commentId}/s3-content`;
    const response = await fetchAPI.GET<S3ContentResponse>(apiUrl);

    if (!response.success || !response.data) {
      throw new Error(response.message || 'Failed to get S3 content metadata');
    }

    const data = response.data;

    if (data.status === 'presigned_url_generated' && data.presigned_url) {
      // Si tenemos una URL prefirmada, la usamos para descargar el contenido
      const s3Response = await fetch(data.presigned_url);
      if (!s3Response.ok) {
        throw new Error(`Failed to fetch content from S3: ${s3Response.statusText}`);
      }
      const htmlContent = await s3Response.text();

      // Guardar el contenido HTML final en el caché
      s3ContentCache.set(commentId, htmlContent);
      setTimeout(() => s3ContentCache.delete(commentId), 5 * 60 * 1000);

      return {
        status: 'loaded_from_s3',
        content: htmlContent,
        message: 'Content successfully fetched from S3',
      };
    } else if (data.content) {
      // Si el contenido está en la base de datos, lo usamos directamente
      s3ContentCache.set(commentId, data.content);
      setTimeout(() => s3ContentCache.delete(commentId), 5 * 60 * 1000);
      return {
        status: 'content_in_database',
        content: data.content,
        message: data.message,
      };
    } else {
      throw new Error('API response did not provide content or a presigned URL.');
    }
  } catch (error) {
    console.error(`💥 Exception in getCommentS3Content for comment ${commentId}:`, error);
    throw error;
  }
}
