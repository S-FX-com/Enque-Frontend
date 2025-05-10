import { fetchAPI, BaseResponse } from '@/lib/fetch-api'; // Re-add BaseResponse
import type { ICategory } from '@/typescript/category'; // Import ICategory
// Import the CategoryCreate type from the backend schema equivalent if available,
// otherwise define a simple one here or use a partial ICategory.
// Assuming a simple structure for now:
interface CategoryCreatePayload {
  name: string;
  workspace_id: number;
}

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || 'https://enque-backend-production.up.railway.app';

/**
 * Fetches a list of categories.
 */
export async function getCategories(params?: {
  skip?: number;
  limit?: number;
}): Promise<ICategory[]> {
  try {
    const url = new URL(`${API_BASE_URL}/v1/categories/`);
    if (params?.skip !== undefined) url.searchParams.append('skip', String(params.skip));
    if (params?.limit !== undefined) url.searchParams.append('limit', String(params.limit));

    // Assuming authentication might be required, adjust fetchAPI call if needed
    const response = await fetchAPI.GET<ICategory[]>(url.toString());

    if (response.success && response.data) {
      return response.data;
    } else {
      console.error('Error fetching categories:', response?.message || 'Unknown API error');
      return []; // Return empty array on failure
    }
  } catch (error) {
    console.error('Error fetching categories (catch block):', error);
    return []; // Return empty array on exception
  }
}

/**
 * Creates a new category.
 * @param categoryData - The data for the new category (name and workspace_id).
 * @returns A promise that resolves to the BaseResponse containing the created category or error info.
 */
export async function createCategory(
  categoryData: CategoryCreatePayload
): Promise<BaseResponse<ICategory>> {
  try {
    const url = `${API_BASE_URL}/v1/categories/`;
    // Use fetchAPI.POST, assuming it handles the request body correctly
    const response = await fetchAPI.POST<ICategory>(
      url,
      categoryData as unknown as Record<string, unknown>
    );
    return response; // Return the whole BaseResponse
  } catch (error) {
    console.error('Error creating category (catch block):', error);
    // Return a BaseResponse-like structure for consistency in error handling
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Failed to create category',
      data: undefined,
    };
  }
}

/**
 * Deletes a category by its ID.
 * @param categoryId - The ID of the category to delete.
 * @returns A promise that resolves to the BaseResponse indicating success or failure.
 */
export async function deleteCategory(categoryId: number | string): Promise<BaseResponse<unknown>> {
  // Use unknown instead of any
  try {
    const url = `${API_BASE_URL}/v1/categories/${categoryId}`;
    // Use fetchAPI.DELETE
    const response = await fetchAPI.DELETE<unknown>(url); // Use unknown instead of any
    return response; // Return the whole BaseResponse
  } catch (error) {
    console.error(`Error deleting category ${categoryId} (catch block):`, error);
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Failed to delete category',
      data: undefined,
    };
  }
}

// Add other category service functions (update) if needed later
