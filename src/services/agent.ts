import { fetchAPI } from '@/lib/fetch-api';
import { Agent } from '../typescript/agent'; // Using relative path
import { Team } from '../typescript/team'; // Import Team type

// Use the production URL directly. Ensure NEXT_PUBLIC_API_BASE_URL is set in the production environment.
const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'https://enque-backend-production.up.railway.app';

/**
 * Fetches all available agents for the current workspace (assumption).
 * TODO: Verify the correct endpoint and if filtering by workspace is needed/automatic.
 * @returns A promise that resolves to an array of agents.
 */
export const getAgents = async (): Promise<Agent[]> => {
  try {
    // Assuming the endpoint to get all agents is /v1/agents/
    // The backend might automatically filter by workspace based on auth token
    const url = `${API_BASE_URL}/v1/agents/`;
    const response = await fetchAPI.GET<Agent[]>(url);

    if (!response || !response.data) {
      console.error('Failed to fetch agents or data is missing');
      return []; // Return empty array on failure
    }
    return response.data;
  } catch (error) {
    console.error('Error fetching agents:', error);
    throw error; // Re-throw error for handling in the component
  }
};

/**
 * Fetches teams that a specific agent belongs to.
 * @param agentId The ID of the agent.
 * @returns A promise that resolves to an array of teams.
 */
export const getAgentTeams = async (agentId: number): Promise<Team[]> => {
  if (!agentId) {
    console.error('getAgentTeams requires a valid agentId');
    return [];
  }
  try {
    // Assuming the endpoint exists and returns Team objects
    const url = `${API_BASE_URL}/v1/agents/${agentId}/teams`;
    const response = await fetchAPI.GET<Team[]>(url);

    if (!response || !response.data) {
      console.error(`Failed to fetch teams for agent ${agentId} or data is missing`);
      return [];
    }
    return response.data;
  } catch (error) {
    console.error(`Error fetching teams for agent ${agentId}:`, error);
    throw error;
  }
};


// Add other agent-related service functions here later (create, update, delete, etc.)
