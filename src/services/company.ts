import { fetchAPI } from '@/lib/fetch-api';
import type { BaseResponse } from '@/lib/fetch-api';
// Import all needed types from company typescript file
import type { ICompany, CompanyCreate, CompanyUpdatePayload } from '@/typescript/company';
import type { IUser } from '@/typescript/user';

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || 'https://enque-backend-production.up.railway.app';

/**
 * Creates a new company.
 */
export async function createCompany(companyData: CompanyCreate): Promise<BaseResponse<ICompany>> {
  try {
    const url = `${API_BASE_URL}/v1/companies/`;
    const response = await fetchAPI.POST<ICompany>(
      url,
      companyData as unknown as Record<string, unknown>
    );
    return response;
  } catch (error) {
    console.error('Error creating company (catch block):', error);
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Failed to create company',
      data: undefined,
    };
  }
}

/**
 * Fetches a list of companies for the current workspace.
 */
export async function getCompanies(params?: {
  skip?: number;
  limit?: number;
}): Promise<ICompany[]> {
  try {
    const url = new URL(`${API_BASE_URL}/v1/companies/`);
    if (params?.skip !== undefined) url.searchParams.append('skip', String(params.skip));
    if (params?.limit !== undefined) url.searchParams.append('limit', String(params.limit));
    const response = await fetchAPI.GET<ICompany[]>(url.toString());
    if (response.success && response.data) {
      return response.data;
    } else {
      console.error('Error fetching companies:', response?.message || 'Unknown API error');
      return [];
    }
  } catch (error) {
    console.error('Error fetching companies (catch block):', error);
    return [];
  }
}

/**
 * Fetches a single company by its ID.
 */
export async function getCompanyById(companyId: number | string): Promise<ICompany | null> {
  try {
    const url = `${API_BASE_URL}/v1/companies/${companyId}`;
    const response = await fetchAPI.GET<ICompany>(url);
    if (response.success && response.data) {
      return response.data;
    } else {
      console.error(
        `Error fetching company ${companyId}:`,
        response?.message || 'Unknown API error'
      );
      return null;
    }
  } catch (error) {
    console.error(`Error fetching company ${companyId} (catch block):`, error);
    return null;
  }
}

/**
 * Fetches a list of users for a specific company.
 */
export async function getCompanyUsers(
  companyId: number | string,
  params?: { skip?: number; limit?: number }
): Promise<IUser[]> {
  try {
    const url = new URL(`${API_BASE_URL}/v1/companies/${companyId}/users`);
    if (params?.skip !== undefined) url.searchParams.append('skip', String(params.skip));
    if (params?.limit !== undefined) url.searchParams.append('limit', String(params.limit));
    const response = await fetchAPI.GET<IUser[]>(url.toString());
    if (response.success && response.data) {
      return response.data;
    } else {
      console.error(
        `Error fetching users for company ${companyId}:`,
        response?.message || 'Unknown API error'
      );
      return [];
    }
  } catch (error) {
    console.error(`Error fetching users for company ${companyId} (catch block):`, error);
    return [];
  }
}

/**
 * Deletes a company by its ID.
 */
export async function deleteCompany(companyId: number | string): Promise<BaseResponse<ICompany>> {
  try {
    const url = `${API_BASE_URL}/v1/companies/${companyId}`;
    const response = await fetchAPI.DELETE<ICompany>(url);
    return response;
  } catch (error) {
    console.error(`Error deleting company ${companyId} (catch block):`, error);
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Failed to delete company',
      data: undefined,
    };
  }
}

/**
 * Updates a company by its ID.
 */
export async function updateCompany(
  companyId: number | string,
  updateData: CompanyUpdatePayload // Use the specific update payload type
): Promise<BaseResponse<ICompany>> {
  try {
    const url = `${API_BASE_URL}/v1/companies/${companyId}`;
    // Assuming update requires authentication
    // Cast via unknown first for type compatibility with fetchAPI.PUT
    const response = await fetchAPI.PUT<ICompany>(
      url,
      updateData as unknown as Record<string, unknown>
    );
    return response;
  } catch (error) {
    console.error(`Error updating company ${companyId} (catch block):`, error);
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Failed to update company',
      data: undefined,
    };
  }
}
