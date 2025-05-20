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
  // Return IComment[] directly or throw error
  try {
    // Construct the full URL
    const url = `${AppConfigs.api}/tasks/${taskId}/comments?skip=${skip}&limit=${limit}`;

    // Use fetchAPI.GET and expect BaseResponse<IComment[]>
    const response = await fetchAPI.GET<IComment[]>(url); // Use GET method, no token needed

    if (!response.success || !response.data) {
      // Handle API error response based on BaseResponse structure
      const errorMessage = response.message || 'Failed to fetch comments';
      console.error('Failed to fetch comments:', errorMessage);
      throw new Error(errorMessage);
      // Or return [];
    }

    // Return the data array directly from BaseResponse
    return response.data;
  } catch (error) {
    console.error('Error fetching comments:', error);
    // Re-throw the error or return an empty array
    // Ensure the error is an instance of Error for consistent handling upstream
    if (error instanceof Error) {
      throw error;
    } else {
      // Wrap non-Error exceptions if necessary
      throw new Error('An unknown error occurred while fetching comments.');
    }
    // Or return [];
  }
};

// Interface for the data needed to create a comment
// Backend validation schema (CommentCreate) expects all these fields, even if logic uses token/path params.
export interface CreateCommentPayload {
  content: string;
  ticket_id: number;
  agent_id: number;
  workspace_id: number;
  is_private: boolean;
  attachment_ids?: number[]; // Nuevo: IDs de los archivos adjuntos
  // Index signature for compatibility with fetchAPI.POST's Record<string, unknown> type
  [key: string]: unknown;
}

/**
 * Creates a new comment for a specific task.
 * @param taskId - The ID of the task.
 * @param payload - The comment data (content, is_private).
 * @returns A promise that resolves to the newly created comment and updated task data.
 */
export interface CommentResponseData {
  comment: IComment;
  task: ITicket; // Using proper ITicket type instead of any
  assignee_changed: boolean;
}

export const createComment = async (
  taskId: number,
  payload: CreateCommentPayload
): Promise<CommentResponseData> => {
  // Return the created IComment and task data on success
  try {
    // Construct the full URL
    const url = `${AppConfigs.api}/tasks/${taskId}/comments`;

    // Use fetchAPI.POST and expect BaseResponse<CommentResponseData>
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
