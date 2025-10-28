import { fetchAPI } from '@/lib/fetch-api';
import { Team, TeamMember } from '../typescript/team';
const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL || 'https://enque-backend-production.up.railway.app';

export const getTeams = async (): Promise<Team[]> => {
  try {
    const url = `${API_BASE_URL}/v1/teams/`;

    const response = await fetchAPI.GET<Team[]>(url);

    if (!response || !response.data) {
      // Adjust based on actual return structure
      console.error('Failed to fetch teams or data is missing');
      throw new Error('Failed to fetch teams');
    }

    return response.data; // Adjust based on actual return structure
  } catch (error) {
    console.error('Error fetching teams:', error);
    // Re-throw or return a default value like an empty array
    throw error; // Or return [];
  }
};

/**
 * Fetches members (agents) assigned to a specific team.
 * @param teamId The ID of the team.
 * @returns A promise that resolves to an array of team members.
 */
export const getTeamMembers = async (teamId: number): Promise<TeamMember[]> => {
  if (!teamId) {
    console.error('getTeamMembers requires a valid teamId');
    return []; // Return empty array if teamId is invalid
  }
  try {
    const url = `${API_BASE_URL}/v1/teams/${teamId}/members`;
    // Assuming the endpoint returns an array of TeamMember objects
    const response = await fetchAPI.GET<TeamMember[]>(url);

    if (!response || !response.data) {
      console.error(`Failed to fetch members for team ${teamId} or data is missing`);
      // Depending on requirements, might throw error or return empty array
      return [];
    }
    return response.data;
  } catch (error) {
    console.error(`Error fetching members for team ${teamId}:`, error);
    // Re-throw or return a default value like an empty array
    throw error; // Or return [];
  }
};

/**
 * Creates a new team.
 * @param teamData The data for the new team (name, description, workspace_id, icon_name).
 * @returns A promise that resolves to the newly created team object.
 */
export const createTeam = async (teamData: {
  name: string;
  description?: string | null;
  workspace_id: number;
  icon_name?: string | null;
}): Promise<Team> => {
  try {
    const url = `${API_BASE_URL}/v1/teams/`;
    const response = await fetchAPI.POST<Team>(url, teamData);

    if (!response || !response.data) {
      console.error('[createTeam service] Failed to create team or data is missing in response');
      throw new Error('Failed to create team or API response data is missing');
    }
    return response.data;
  } catch (error) {
    console.error('[createTeam service] Error during API call:', error);
    throw error;
  }
};

/**
 * Adds a member (agent) to a specific team.
 * @param teamId The ID of the team.
 * @param agentId The ID of the agent to add.
 * @returns A promise that resolves to the created team member object (or void/boolean depending on API).
 */
export const addTeamMember = async (teamId: number, agentId: number): Promise<TeamMember> => {
  if (!teamId || !agentId) {
    console.error('addTeamMember requires valid teamId and agentId');
    throw new Error('Invalid IDs provided for adding team member');
  }
  try {
    const url = `${API_BASE_URL}/v1/teams/${teamId}/members`;
    // The body should match the TeamMemberCreate schema from the backend
    const body = {
      team_id: teamId,
      agent_id: agentId,
    };
    const response = await fetchAPI.POST<TeamMember>(url, body);

    if (!response || !response.data) {
      console.error(`Failed to add member ${agentId} to team ${teamId} or data is missing`);
      throw new Error('Failed to add team member');
    }
    return response.data; // Assuming API returns the created TeamMember object
  } catch (error) {
    console.error(`Error adding member ${agentId} to team ${teamId}:`, error);
    throw error;
  }
};

/**
 * Deletes a specific team.
 * @param teamId The ID of the team to delete.
 * @returns A promise that resolves when the deletion is successful (or rejects on error).
 */
export const deleteTeam = async (teamId: number): Promise<void> => {
  if (!teamId) {
    console.error('deleteTeam requires a valid teamId');
    throw new Error('Invalid ID provided for deleting team');
  }
  try {
    const url = `${API_BASE_URL}/v1/teams/${teamId}`;
    // Assuming fetchAPI.DELETE handles the request and potential errors
    // It might not return data, so we don't expect a specific type back besides handling success/error
    await fetchAPI.DELETE<void>(url); // Use void if no data is expected on success
  } catch (error) {
    console.error(`Error deleting team ${teamId}:`, error);
    throw error; // Re-throw to be handled by the caller
  }
};

/**
 * Updates an existing team.
 * @param teamId The ID of the team to update.
 * @param teamData The data to update (using TeamUpdate type).
 * @returns A promise that resolves to the updated team object.
 */
export const updateTeam = async (
  teamId: number,
  teamData: {
    name?: string | null;
    description?: string | null;
    logo_url?: string | null;
    icon_name?: string | null;
    manager_id?: number | null;
  }
): Promise<Team> => {
  if (!teamId) {
    console.error('updateTeam requires a valid teamId');
    throw new Error('Invalid ID provided for updating team');
  }
  try {
    const url = `${API_BASE_URL}/v1/teams/${teamId}`;
    // Assuming fetchAPI.PUT handles sending the body and returns the updated object
    const response = await fetchAPI.PUT<Team>(url, teamData);

    if (!response || !response.data) {
      console.error(`Failed to update team ${teamId} or data is missing`);
      throw new Error('Failed to update team');
    }
    return response.data;
  } catch (error) {
    console.error(`Error updating team ${teamId}:`, error);
    throw error;
  }
};

/**
 * Removes a member (agent) from a specific team.
 * @param teamId The ID of the team.
 * @param agentId The ID of the agent to remove.
 * @returns A promise that resolves when the removal is successful.
 */
export const removeTeamMember = async (teamId: number, agentId: number): Promise<void> => {
  if (!teamId || !agentId) {
    console.error('removeTeamMember requires valid teamId and agentId');
    throw new Error('Invalid IDs provided for removing team member');
  }
  try {
    const url = `${API_BASE_URL}/v1/teams/${teamId}/members/${agentId}`;
    // Assuming fetchAPI.DELETE handles the request and potential errors
    await fetchAPI.DELETE<void>(url);
  } catch (error) {
    console.error(`Error removing member ${agentId} from team ${teamId}:`, error);
    throw error;
  }
};

/**
 * Fetches teams associated with a specific agent.
 * @param agentId The ID of the agent.
 * @returns A promise that resolves to an array of teams with ticket counts including mailbox tickets.
 */
export const getAgentTeams = async (agentId: number): Promise<Team[]> => {
  if (!agentId) {
    console.error('getAgentTeams requires a valid agentId');
    return []; // Return empty array if agentId is invalid
  }
  try {
    // Use the new endpoint that includes mailbox ticket counts
    const url = `${API_BASE_URL}/v1/teams/agent/${agentId}`;
    const response = await fetchAPI.GET<Team[]>(url);

    if (!response || !response.data) {
      console.error(`Failed to fetch teams for agent ${agentId} or data is missing`);
      return []; // Or throw new Error('Failed to fetch agent teams');
    }
    return response.data;
  } catch (error) {
    console.error(`Error fetching teams for agent ${agentId}:`, error);
    throw error; // Or return [];
  }
};
