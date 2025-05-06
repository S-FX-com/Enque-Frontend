import { fetchAPI, BaseResponse } from "@/lib/fetch-api"; // Import BaseResponse
import { ITicket, IGetTicket } from "@/typescript/ticket"; // Import IGetTicket
import { IComment } from "@/typescript/comment"; // Import IComment

/**
 * Fetches a list of tickets (tasks) from the backend.
 * @param filters - Optional filters including skip, limit, status, etc.
 * @param endpointPath - Optional endpoint path (defaults to /v1/tasks/)
 * @returns A promise that resolves to an array of ITicket objects.
 */
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'https://enque-backend-production.up.railway.app';

// Update getTickets to accept filters and an optional endpoint path
export async function getTickets(
    filters: IGetTicket = {},
    endpointPath: string = '/v1/tasks/' // Default path for all tickets
): Promise<ITicket[]> {
  // Destructure filters, excluding assignee_id as it's handled by endpointPath
  const { skip = 0, limit = 100, status, priority, type, user_id, team_id } = filters;

  try {
    // Construct query parameters, including potential filters
    const queryParams = new URLSearchParams({
      skip: skip.toString(),
      limit: limit.toString(),
    });

    // Add other filters if they have values
    if (status !== undefined) queryParams.append('status', status);
    if (priority !== undefined) queryParams.append('priority', priority);
    if (type !== undefined) queryParams.append('type', type);
    if (user_id !== undefined) queryParams.append('user_id', String(user_id));
    if (team_id !== undefined) queryParams.append('team_id', String(team_id));

    // Construct URL using the provided endpointPath and query parameters
    const url = `${API_BASE_URL}${endpointPath}?${queryParams.toString()}`;
    console.log("Fetching tickets with URL:", url); // Log the URL for debugging filters

    // Use fetchAPI.GET and expect BaseResponse<ITicket[]>
    const response = await fetchAPI.GET<ITicket[]>(url);
    // Extract data from the BaseResponse object
    // Ensure response and response.data exist before returning
    if (response && response.success && response.data) {
      return response.data;
    } else {
      // Log error message from response if available
      console.error("Error fetching tickets:", response?.message || "Unknown API error");
      return [];
    }
  } catch (error) {
    console.error("Error fetching tickets (catch block):", error);
    // Depending on requirements, you might want to throw the error
    // or return an empty array / handle it differently.
    return [];
  }
}

/**
 * Fetches the comments/conversation history for a specific ticket.
 * @param ticketId The ID of the ticket.
 * @returns A promise that resolves to an array of IComment objects.
 */
export async function getTicketComments(ticketId: number): Promise<IComment[]> {
  try {
    // Construct the full URL for the comments endpoint
    const url = `${API_BASE_URL}/v1/tasks/${ticketId}/comments`; // Corrected path based on user provided info
    const response = await fetchAPI.GET<IComment[]>(url);

    if (response && response.success && response.data) {
      // Sort comments by creation date, oldest first (optional, but common)
      return response.data.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
    } else {
      console.error(`Error fetching comments for ticket ${ticketId}:`, response?.message || "Unknown API error");
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
// Define a type for the update payload that allows null for assignee_id
// Define a type for the update payload that allows null for assignee_id and team_id
type TicketUpdatePayload = {
    status?: ITicket['status'];
    priority?: ITicket['priority'];
    assignee_id?: number | null;
    team_id?: number | null;
    category_id?: number | null; // Add category_id
};

// Update function signature to accept category_id in updates
export async function updateTicket(ticketId: number, updates: Partial<Pick<ITicket, 'status' | 'priority' | 'assignee_id' | 'team_id' | 'category_id'>>): Promise<ITicket | null> {
    try {
        const url = `${API_BASE_URL}/v1/tasks/${ticketId}`;

        // Create the payload with the correct type
        const payload: TicketUpdatePayload = {};
        if (updates.status !== undefined) payload.status = updates.status;
        if (updates.priority !== undefined) payload.priority = updates.priority;

        // Handle assignee_id specifically to allow null
        if ('assignee_id' in updates) {
            const assigneeValue = updates.assignee_id;
            payload.assignee_id = assigneeValue === null || assigneeValue === undefined ? null : Number(assigneeValue);
             if (typeof payload.assignee_id === 'string') {
                 const parsed = parseInt(payload.assignee_id, 10);
                 payload.assignee_id = isNaN(parsed) ? null : parsed;
             }
        }
        // Add logic for team_id
        if ('team_id' in updates) {
            const teamValue = updates.team_id;
            payload.team_id = teamValue === null || teamValue === undefined ? null : Number(teamValue);
             if (typeof payload.team_id === 'string') {
                 const parsed = parseInt(payload.team_id, 10);
                  payload.team_id = isNaN(parsed) ? null : parsed;
              }
         }
         // Add logic for category_id
         if ('category_id' in updates) {
             const categoryValue = updates.category_id;
             payload.category_id = categoryValue === null || categoryValue === undefined ? null : Number(categoryValue);
              if (typeof payload.category_id === 'string') {
                  const parsed = parseInt(payload.category_id, 10);
                  payload.category_id = isNaN(parsed) ? null : parsed;
              }
         }

        console.log("Sending update payload:", payload); // Log the payload being sent
        const response = await fetchAPI.PUT<ITicket>(url, payload);

        if (response && response.success && response.data) {
            return response.data;
        } else {
            console.error(`Error updating ticket ${ticketId}:`, response?.message || "Unknown API error");
            // Consider throwing an error here to be caught by the calling component
            // throw new Error(response?.message || `Failed to update ticket ${ticketId}`);
            return null; // Or return null/handle error as needed
        }
    } catch (error) {
        console.error(`Error updating ticket ${ticketId} (catch block):`, error);
        // throw error; // Re-throw the error for the component to handle
        return null;
    }
}

/**
 * Deletes a specific ticket (task).
 * @param ticketId The ID of the ticket to delete.
 * @returns A promise that resolves to the BaseResponse from the API.
 */
export async function deleteTicket(ticketId: number): Promise<BaseResponse<unknown>> {
    const url = `${API_BASE_URL}/v1/tasks/${ticketId}`;
    // Assuming fetchAPI.DELETE returns a BaseResponse similar to other methods
    // Adjust the expected return type if necessary based on fetchAPI implementation
    return fetchAPI.DELETE<unknown>(url);
}

/**
 * Creates a new ticket (task).
 * @param ticketData The data for the new ticket.
 * @returns A promise that resolves to the created ITicket object or null on failure.
 */
// Define the expected payload type for creating a ticket
type TicketCreatePayload = {
  title: string;
  description: string;
  user_id: number;
  status: ITicket['status'];
  priority: ITicket['priority'];
  team_id?: number;
  category_id?: number;
  workspace_id: number; // Add workspace_id as required
  due_date?: string; // Add due_date as optional string
  sent_from_id: number; // Add sent_from_id as required
};

export async function createTicket(ticketData: TicketCreatePayload): Promise<ITicket | null> {
  try {
    const url = `${API_BASE_URL}/v1/tasks/`;
    console.log("Sending create ticket payload:", ticketData); // Log the payload
    const response = await fetchAPI.POST<ITicket>(url, ticketData);

    if (response && response.success && response.data) {
      return response.data;
    } else {
      console.error("Error creating ticket:", response?.message || "Unknown API error");
      // Throw an error to be caught by the mutation's onError
      throw new Error(response?.message || "Failed to create ticket");
    }
  } catch (error) {
    console.error("Error creating ticket (catch block):", error);
    // Re-throw the error for the mutation's onError handler
    throw error;
  }
}

// You can add more ticket-related service functions
