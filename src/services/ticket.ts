import { fetchAPI, BaseResponse } from '@/lib/fetch-api';
import { ITicket, IGetTicket } from '@/typescript/ticket';
import { IComment } from '@/typescript/comment';

/**
 * Fetches a list of tickets (tasks) from the backend.
 * @param filters - Optional filters including skip, limit, status, etc.
 * @param endpointPath - Optional endpoint path (defaults to /v1/tasks/)
 * @returns A promise that resolves to an array of ITicket objects.
 */
const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || 'https://enque-backend-production.up.railway.app';

export async function getTickets(
  filters: IGetTicket = {},
  endpointPath: string = '/v1/tasks/'
): Promise<ITicket[]> {
  const { skip = 0, limit = 100, status, priority, type, user_id, team_id } = filters;

  try {
    const queryParams = new URLSearchParams({
      skip: skip.toString(),
      limit: limit.toString(),
    });
    if (status !== undefined) queryParams.append('status', status);
    if (priority !== undefined) queryParams.append('priority', priority);
    if (type !== undefined) queryParams.append('type', type);
    if (user_id !== undefined) queryParams.append('user_id', String(user_id));
    if (team_id !== undefined) queryParams.append('team_id', String(team_id));
    const url = `${API_BASE_URL}${endpointPath}?${queryParams.toString()}`;
    console.log('Fetching tickets with URL:', url);
    const response = await fetchAPI.GET<ITicket[]>(url);
    if (response && response.success && response.data) {
      return response.data;
    } else {
      console.error('Error fetching tickets:', response?.message || 'Unknown API error');
      return [];
    }
  } catch (error) {
    console.error('Error fetching tickets (catch block):', error);
    return [];
  }
}

/**
 * Fetches the comments/conversation history for a specific ticket.
 * @param ticketId
 * @returns
 */
export async function getTicketComments(ticketId: number): Promise<IComment[]> {
  try {
    const url = `${API_BASE_URL}/v1/tasks/${ticketId}/comments`;
    const response = await fetchAPI.GET<IComment[]>(url);

    if (response && response.success && response.data) {
      return response.data.sort(
        (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
      );
    } else {
      console.error(
        `Error fetching comments for ticket ${ticketId}:`,
        response?.message || 'Unknown API error'
      );
      return [];
    }
  } catch (error) {
    console.error(`Error fetching comments for ticket ${ticketId} (catch block):`, error);
    return [];
  }
}

/**
 * Updates specific fields of a ticket.
 * @param ticketId The ID of the ticket to update.
 * @param updates An object containing the fields to update (e.g., { status: 'closed', priority: 'high', assignee_id: 5 }).
 * @returns A promise that resolves to the updated ITicket object or null on failure.
 */

type TicketUpdatePayload = {
  status?: ITicket['status'];
  priority?: ITicket['priority'];
  assignee_id?: number | null;
  team_id?: number | null;
  category_id?: number | null;
};

export async function updateTicket(
  ticketId: number,
  updates: Partial<Pick<ITicket, 'status' | 'priority' | 'assignee_id' | 'team_id' | 'category_id'>>
): Promise<ITicket> {
  try {
    const url = `${API_BASE_URL}/v1/tasks/${ticketId}`;

    const payload: TicketUpdatePayload = {};
    if (updates.status !== undefined) payload.status = updates.status;
    if (updates.priority !== undefined) payload.priority = updates.priority;

    if ('assignee_id' in updates) {
      const assigneeValue = updates.assignee_id;
      payload.assignee_id =
        assigneeValue === null || assigneeValue === undefined ? null : Number(assigneeValue);
      if (typeof payload.assignee_id === 'string') {
        const parsed = parseInt(payload.assignee_id, 10);
        payload.assignee_id = isNaN(parsed) ? null : parsed;
      }
    }
    if ('team_id' in updates) {
      const teamValue = updates.team_id;
      payload.team_id = teamValue === null || teamValue === undefined ? null : Number(teamValue);
      if (typeof payload.team_id === 'string') {
        const parsed = parseInt(payload.team_id, 10);
        payload.team_id = isNaN(parsed) ? null : parsed;
      }
    }
    if ('category_id' in updates) {
      const categoryValue = updates.category_id;
      payload.category_id =
        categoryValue === null || categoryValue === undefined ? null : Number(categoryValue);
      if (typeof payload.category_id === 'string') {
        const parsed = parseInt(payload.category_id, 10);
        payload.category_id = isNaN(parsed) ? null : parsed;
      }
    }

    console.log('Sending update payload:', payload);
    const response = await fetchAPI.PUT<ITicket>(url, payload);

    if (response && response.success && response.data) {
      return response.data;
    } else {
      console.error(`Error updating ticket ${ticketId}:`, response?.message || 'Unknown API error');
      throw new Error(response?.message || `Failed to update ticket ${ticketId}`);
    }
  } catch (error) {
    console.error(`Error updating ticket ${ticketId} (catch block):`, error);
    if (error instanceof Error) {
      throw error;
    }
    throw new Error(`An unexpected error occurred while updating ticket ${ticketId}`);
  }
}

/**
 * Deletes a specific ticket (task).
 * @param ticketId The ID of the ticket to delete.
 * @returns A promise that resolves to the BaseResponse from the API.
 */
export async function deleteTicket(ticketId: number): Promise<BaseResponse<unknown>> {
  const url = `${API_BASE_URL}/v1/tasks/${ticketId}`;

  return fetchAPI.DELETE<unknown>(url);
}

/**
 * Creates a new ticket (task).
 * @param ticketData The data for the new ticket.
 * @returns A promise that resolves to the created ITicket object or null on failure.
 */

type TicketCreatePayload = {
  title: string;
  description: string;
  user_id: number;
  status: ITicket['status'];
  priority: ITicket['priority'];
  team_id?: number;
  category_id?: number;
  workspace_id: number;
  due_date?: string;
  sent_from_id: number;
};
export async function createTicket(ticketData: TicketCreatePayload): Promise<ITicket | null> {
  try {
    const url = `${API_BASE_URL}/v1/tasks/`;
    console.log('Sending create ticket payload:', ticketData);
    const response = await fetchAPI.POST<ITicket>(url, ticketData);

    if (response && response.success && response.data) {
      return response.data;
    } else {
      console.error('Error creating ticket:', response?.message || 'Unknown API error');
      throw new Error(response?.message || 'Failed to create ticket');
    }
  } catch (error) {
    console.error('Error creating ticket (catch block):', error);

    throw error;
  }
}
