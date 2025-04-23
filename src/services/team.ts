import { fetchAPI } from '@/lib/fetch-api'; // Corrected import name
import { Team, TeamMember } from '../typescript/team'; // Using relative path and adding TeamMember import

// Use the production URL directly. Ensure NEXT_PUBLIC_API_BASE_URL is set in the production environment.
const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'https://enque-backend-production.up.railway.app';

export const getTeams = async (): Promise<Team[]> => {
  try {
    const url = `${API_BASE_URL}/v1/teams/`;
    // Use the GET method from the fetchAPI object
    // Assuming fetchAPI.GET handles response checking and JSON parsing internally
    // Adjust based on the actual implementation of fetchAPI.GET
    const response = await fetchAPI.GET<Team[]>(url); // Pass the expected return type

    // Assuming fetchAPI.GET throws an error on failure or returns data directly
    // If fetchAPI.GET returns the raw response object, uncomment and adapt the checks below
    /*
    if (!response.ok) { // Or check a success flag if fetchAPI.GET returns a custom object
      console.error('Failed to fetch teams:', response.statusText); // Adjust property access if needed
      throw new Error('Failed to fetch teams');
    }
    const data: Team[] = await response.json(); // Adjust if data is already parsed
    */

    // If fetchAPI.GET returns the parsed data directly on success:
    if (!response || !response.data) { // Adjust based on actual return structure
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
 * @param teamData The data for the new team (name, description, workspace_id).
 * @returns A promise that resolves to the newly created team object.
 */
export const createTeam = async (teamData: { name: string; description?: string | null; workspace_id: number }): Promise<Team> => {
  try {
    const url = `${API_BASE_URL}/v1/teams/`;
    // Assuming fetchAPI.POST handles sending the body and returns the created object
    const response = await fetchAPI.POST<Team>(url, teamData);

    if (!response || !response.data) {
      console.error('Failed to create team or data is missing');
      throw new Error('Failed to create team');
    }
    return response.data;
  } catch (error) {
    console.error('Error creating team:', error);
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
        agent_id: agentId
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
    console.log(`Team ${teamId} deleted successfully.`);
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
export const updateTeam = async (teamId: number, teamData: { name?: string | null; description?: string | null; logo_url?: string | null }): Promise<Team> => {
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
    console.log(`Member ${agentId} removed from team ${teamId} successfully.`);
  } catch (error) {
    console.error(`Error removing member ${agentId} from team ${teamId}:`, error);
    throw error;
  }
};


// Add other team-related service functions here later
