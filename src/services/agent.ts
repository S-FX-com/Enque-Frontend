// frontend/src/services/agent.ts
import { fetchAPI } from '@/lib/fetch-api';
import { Agent, AgentUpdate } from '@/typescript/agent';
import { Team } from '@/typescript/team'; // Import Team type
// Removed unused BaseResponse import

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || 'https://enque-backend-production.up.railway.app';

/**
 * Fetches a list of agents from the backend.
 * @returns A promise that resolves to an array of Agent objects.
 */
export async function getAgents(): Promise<Agent[]> {
  try {
    const url = `${API_BASE_URL}/v1/agents/`;
    // Assuming GET returns BaseResponse<Agent[]>
    const response = await fetchAPI.GET<Agent[]>(url);
    if (response && response.success && response.data) {
      return response.data;
    } else {
      console.error('Error fetching agents:', response?.message || 'Unknown API error');
      return [];
    }
  } catch (error) {
    console.error('Error fetching agents (catch block):', error);
    return [];
  }
}

/**
 * Fetches a single agent by their ID.
 * @param agentId The ID of the agent to fetch.
 * @returns A promise that resolves to the Agent object.
 * @throws An error if the agent is not found or the request fails.
 */
export async function getAgentById(agentId: number): Promise<Agent> {
  try {
    const url = `${API_BASE_URL}/v1/agents/${agentId}`;
    // Assuming GET by ID returns BaseResponse<Agent>
    const response = await fetchAPI.GET<Agent>(url);
    if (response && response.success && response.data) {
      return response.data;
    } else {
      console.error(`Error fetching agent ${agentId}:`, response?.message || 'Unknown API error');
      throw new Error(response?.message || `Agent with ID ${agentId} not found`);
    }
  } catch (error) {
    console.error(`Error fetching agent ${agentId} (catch block):`, error);
    throw error; // Re-throw the error
  }
}

/**
 * Updates the profile of a specific agent.
 * @param agentId The ID of the agent to update.
 * @param updateData The data to update.
 * @returns A promise that resolves to the updated Agent object or null on failure.
 */
export async function updateAgentProfile(
  agentId: number,
  updateData: AgentUpdate
): Promise<Agent | null> {
  try {
    const url = `${API_BASE_URL}/v1/agents/${agentId}`;
    // Tell fetchAPI.PUT that the expected data payload *inside* the response is Agent
    const response = await fetchAPI.PUT<Agent>(
      url,
      updateData as unknown as Record<string, unknown>
    );

    // Check the success flag and data within the BaseResponse returned by fetchAPI.PUT
    if (response && response.success && response.data) {
      console.log('Agent profile updated successfully:', response.data);
      // response.data should now correctly be of type Agent
      return response.data;
    } else {
      console.error(
        `Error updating agent ${agentId}:`,
        response?.message || 'API did not return successful data.'
      );
      throw new Error(response?.message || `Failed to update agent ${agentId}`);
    }
  } catch (error) {
    // Catches errors thrown by fetchAPI (network, non-2xx status)
    console.error(`Error updating agent ${agentId} (catch block):`, error);
    // Re-throw the error so the calling component (useMutation) can handle it
    // Ensure the error message is passed along if available
    throw new Error(error instanceof Error ? error.message : `Failed to update agent ${agentId}`);
  }
}

/**
 * Fetches the teams associated with a specific agent.
 * @param agentId The ID of the agent.
 * @returns A promise that resolves to an array of Team objects.
 */
export async function getAgentTeams(agentId: number): Promise<Team[]> {
  try {
    const url = `${API_BASE_URL}/v1/agents/${agentId}/teams`;
    // Assuming the endpoint returns the list directly, wrapped in BaseResponse
    const response = await fetchAPI.GET<Team[]>(url);
    if (response && response.success && response.data) {
      return response.data;
    } else {
      console.error(
        `Error fetching teams for agent ${agentId}:`,
        response?.message || 'Unknown API error'
      );
      return [];
    }
  } catch (error) {
    console.error(`Error fetching teams for agent ${agentId} (catch block):`, error);
    return [];
  }
}

/**
 * Deletes a specific agent by their ID.
 * @param agentId The ID of the agent to delete.
 * @returns A promise that resolves when the deletion is successful.
 * @throws An error if the deletion fails.
 */
export async function deleteAgent(agentId: number): Promise<void> {
  try {
    const url = `${API_BASE_URL}/v1/agents/${agentId}`;
    // Use 'unknown' as we don't expect specific data from a successful DELETE
    const response = await fetchAPI.DELETE<unknown>(url);

    if (!response || !response.success) {
      console.error(`Error deleting agent ${agentId}:`, response?.message || 'Unknown API error');
      throw new Error(response?.message || `Failed to delete agent ${agentId}`);
    }
    console.log(`Agent ${agentId} deleted successfully.`);
    // No return value needed for void Promise
  } catch (error) {
    console.error(`Error deleting agent ${agentId} (catch block):`, error);
    throw error; // Re-throw the error
  }
}

interface AgentInviteCreatePayload {
  name: string;
  email: string;
  role: 'agent' | 'admin' | 'manager';
  workspace_id: number;
}

/**
 * Invites a new agent to the workspace.
 * @param inviteData The data for the new agent invitation.
 * @returns A promise that resolves to the invited Agent object (or a success message).
 * @throws An error if the invitation fails.
 */
export async function inviteAgent(inviteData: AgentInviteCreatePayload): Promise<Agent> { // Assuming backend returns the created (inactive) agent
  try {
    const url = `${API_BASE_URL}/v1/agents/invite`;
    // Assuming POST returns BaseResponse<Agent> where Agent is the created (inactive) agent
    const response = await fetchAPI.POST<Agent>(url, inviteData as unknown as Record<string, unknown>); 

    if (response && response.success && response.data) {
      return response.data; // Return the agent data
    } else {
      console.error('Error inviting agent:', response?.message || 'Unknown API error');
      throw new Error(response?.message || 'Failed to invite agent');
    }
  } catch (error) {
    console.error('Error inviting agent (catch block):', error);
    throw error; // Re-throw the error
  }
}

interface TokenResponse {
  access_token: string;
  token_type: string;
}

/**
 * Accepts an agent invitation by sending the token and new password to the backend.
 * @param token The invitation token.
 * @param password The new password for the agent.
 * @returns A promise that resolves to the token response (JWT).
 * @throws An error if the acceptance fails.
 */
export async function acceptAgentInvitation(token: string, password: string): Promise<TokenResponse> {
  try {
    const url = `${API_BASE_URL}/v1/agents/accept-invitation`;
    const payload = { token, password };
    // Assuming POST returns BaseResponse<TokenResponse>
    const response = await fetchAPI.POST<TokenResponse>(url, payload as unknown as Record<string, unknown>);

    if (response && response.success && response.data) {
      return response.data; // Return the token data
    } else {
      console.error('Error accepting agent invitation:', response?.message || 'Unknown API error');
      throw new Error(response?.message || 'Failed to accept agent invitation');
    }
  } catch (error) {
    console.error('Error accepting agent invitation (catch block):', error);
    throw error; // Re-throw the error
  }
}


// Add other agent-related service functions if needed
