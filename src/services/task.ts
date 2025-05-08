import { fetchAPI } from '@/lib/fetch-api';
import { Task } from '../typescript/task'; // Using relative path

// Use the production URL directly. Ensure NEXT_PUBLIC_API_BASE_URL is set in the production environment.
const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL || 'https://enque-backend-production.up.railway.app';

/**
 * Fetches tasks assigned to a specific team.
 * @param teamId The ID of the team.
 * @returns A promise that resolves to an array of tasks.
 */
export const getTeamTasks = async (teamId: number): Promise<Task[]> => {
  if (!teamId) {
    console.error('getTeamTasks requires a valid teamId');
    return []; // Return empty array if teamId is invalid
  }
  try {
    const url = `${API_BASE_URL}/v1/tasks/team/${teamId}`;
    const response = await fetchAPI.GET<Task[]>(url);

    if (!response || !response.data) {
      console.error(`Failed to fetch tasks for team ${teamId} or data is missing`);
      // Depending on requirements, might throw error or return empty array
      return [];
    }
    return response.data;
  } catch (error) {
    console.error(`Error fetching tasks for team ${teamId}:`, error);
    // Re-throw or return a default value like an empty array
    throw error; // Or return [];
  }
};

/**
 * Fetches tasks assigned to a specific agent.
 * @param agentId The ID of the agent.
 * @returns A promise that resolves to an array of tasks.
 */
export const getAssignedTasks = async (agentId: number): Promise<Task[]> => {
  if (!agentId) {
    console.error('getAssignedTasks requires a valid agentId');
    return [];
  }
  try {
    const url = `${API_BASE_URL}/v1/tasks/assignee/${agentId}`;
    const response = await fetchAPI.GET<Task[]>(url);

    if (!response || !response.data) {
      console.error(`Failed to fetch tasks for agent ${agentId} or data is missing`);
      return [];
    }
    return response.data;
  } catch (error) {
    console.error(`Error fetching tasks for agent ${agentId}:`, error);
    throw error;
  }
};

// Add other task-related service functions here later (create, update, delete, etc.)
