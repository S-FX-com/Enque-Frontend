import { fetchAPI } from '@/lib/fetch-api';
import type { BaseResponse } from '@/lib/fetch-api';
// Import necessary types from user typescript file
import type { IUser, UserUpdate } from '@/typescript/user';

// Use the production backend URL provided by the user
const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || 'https://enque-backend-production.up.railway.app';

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
      console.error('Error fetching users:', response?.message || 'Unknown API error');
      return [];
    }
  } catch (error) {
    console.error('Error fetching users (catch block):', error);
    return [];
  }
}

/**
 * Creates a new user.
 * @param userData The data for the new user. Matches the UserCreate schema from the backend.
 * @returns A promise that resolves to the created IUser object.
 */
export async function createUser(userData: {
  name: string;
  email: string;
  phone?: string | null;
  company_id?: number | null;
  workspace_id: number; // Add workspace_id to the expected input type
}): Promise<BaseResponse<IUser>> {
  try {
    const url = `${API_BASE_URL}/v1/users/`;
    // The backend endpoint expects UserCreate which might not include workspace_id in the body
    // It gets workspace_id from the authenticated agent's context.
    const response = await fetchAPI.POST<IUser>(url, userData);
    return response; // Return the whole ApiResponse
  } catch (error) {
    console.error('Error creating user (catch block):', error);
    // Return a standard error structure with undefined data
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Failed to create user',
      data: undefined,
    };
  }
}

/**
 * Updates a user by their ID.
 */
export async function updateUser(
  userId: number | string,
  updateData: UserUpdate // Use the UserUpdate type
): Promise<BaseResponse<IUser>> {
  try {
    const url = `${API_BASE_URL}/v1/users/${userId}`;
    // Cast via unknown first for type compatibility with fetchAPI.PUT
    const response = await fetchAPI.PUT<IUser>(
      url,
      updateData as unknown as Record<string, unknown>
    );
    return response;
  } catch (error) {
    console.error(`Error updating user ${userId} (catch block):`, error);
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Failed to update user',
      data: undefined,
    };
  }
}

/**
 * Fetches a list of unassigned users from the backend.
 * @param params Optional query parameters for pagination (skip, limit).
 * @returns A promise that resolves to an array of IUser objects (or a specific UnassignedUser type if defined).
 */
export async function getUnassignedUsers(params?: {
  skip?: number;
  limit?: number;
}): Promise<IUser[]> {
  // Using IUser for now
  try {
    const url = new URL(`${API_BASE_URL}/v1/users/unassigned`);
    if (params?.skip !== undefined) url.searchParams.append('skip', String(params.skip));
    if (params?.limit !== undefined) url.searchParams.append('limit', String(params.limit));

    const response = await fetchAPI.GET<IUser[]>(url.toString()); // Using IUser for now
    if (response && response.success && response.data) {
      return response.data;
    } else {
      console.error('Error fetching unassigned users:', response?.message || 'Unknown API error');
      return [];
    }
  } catch (error) {
    console.error('Error fetching unassigned users (catch block):', error);
    return [];
  }
}

/**
 * Deletes a user by their ID.
 * @param userId The ID of the user to delete.
 * @returns A promise that resolves to the API response.
 */
export async function deleteUser(userId: number | string): Promise<BaseResponse<null>> {
  // Assuming successful delete returns no specific data object, just success status
  try {
    const url = `${API_BASE_URL}/v1/users/${userId}`;
    // The DELETE method in fetchAPI might not expect a type argument for the data part of the response if it's truly null or empty.
    // Adjusting to expect BaseResponse<null> or BaseResponse<void> if the API returns nothing in `data` on success.
    const response = await fetchAPI.DELETE<null>(url);
    return response;
  } catch (error) {
    console.error(`Error deleting user ${userId} (catch block):`, error);
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Failed to delete user',
      data: null,
    };
  }
}
