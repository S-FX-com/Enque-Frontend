import { fetchAPI } from "@/lib/fetch-api"; 
import { IUser } from "@/typescript/user"; // Assuming IUser type exists

// Use the production backend URL provided by the user
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'https://enque-backend-production.up.railway.app'; 

/**
 * Fetches a list of users from the backend.
 * @returns A promise that resolves to an array of IUser objects.
 */
export async function getUsers(): Promise<IUser[]> {
  try {
    const url = `${API_BASE_URL}/v1/users/`; 
    const response = await fetchAPI.GET<IUser[]>(url); 
    if (response && response.success && response.data) {
      return response.data;
    } else {
      console.error("Error fetching users:", response?.message || "Unknown API error");
      return [];
    }
  } catch (error) {
    console.error("Error fetching users (catch block):", error);
    return []; 
  }
}
