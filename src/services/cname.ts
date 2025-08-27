import { fetchAPI } from '@/lib/fetch-api';

// Define types for CNAME settings
export interface DnsRecord {
  type: string;
  name: string;
  value: string;
  status: 'pending' | 'verified' | 'failed';
}

export interface CnameSettings {
  id: number;
  is_enabled: boolean;
  domain: string;
  verification_status: 'pending' | 'verified' | 'failed';
  dns_records: DnsRecord[];
  workspace_id: number;
  created_at: string;
  updated_at: string;
}

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL || 'https://enque-backend-production.up.railway.app';

/**
 * Fetches CNAME settings for a workspace.
 * @param workspaceId The ID of the workspace.
 * @returns A promise that resolves to the CNAME settings.
 */
export const getCnameSettings = async (workspaceId: number): Promise<CnameSettings> => {
  if (!workspaceId) {
    console.error('getCnameSettings requires a valid workspaceId');
    throw new Error('Invalid workspace ID provided');
  }

  try {
    const url = `${API_BASE_URL}/v1/workspaces/${workspaceId}/cname`;
    const response = await fetchAPI.GET<CnameSettings>(url);

    if (!response || !response.data) {
      console.error('Failed to fetch CNAME settings or data is missing');
      throw new Error('Failed to fetch CNAME settings');
    }

    return response.data;
  } catch (error) {
    console.error('Error fetching CNAME settings:', error);
    throw error;
  }
};

/**
 * Updates CNAME settings for a workspace.
 * @param workspaceId The ID of the workspace.
 * @param domain The custom domain to set.
 * @returns A promise that resolves to the updated CNAME settings.
 */
export const updateCnameSettings = async (
  workspaceId: number,
  domain: string
): Promise<CnameSettings> => {
  if (!workspaceId) {
    console.error('updateCnameSettings requires a valid workspaceId');
    throw new Error('Invalid workspace ID provided');
  }

  if (!domain) {
    console.error('updateCnameSettings requires a domain');
    throw new Error('Domain is required');
  }

  try {
    const url = `${API_BASE_URL}/v1/workspaces/${workspaceId}/cname`;
    const response = await fetchAPI.PUT<CnameSettings>(url, { domain });

    if (!response || !response.data) {
      console.error('Failed to update CNAME settings or data is missing');
      throw new Error('Failed to update CNAME settings');
    }

    return response.data;
  } catch (error) {
    console.error('Error updating CNAME settings:', error);
    throw error;
  }
};

/**
 * Toggles CNAME settings on or off.
 * @param workspaceId The ID of the workspace.
 * @param isEnabled Whether the CNAME settings should be enabled or disabled.
 * @returns A promise that resolves to the updated CNAME settings.
 */
export const toggleCnameSettings = async (
  workspaceId: number,
  isEnabled: boolean
): Promise<CnameSettings> => {
  if (!workspaceId) {
    console.error('toggleCnameSettings requires a valid workspaceId');
    throw new Error('Invalid workspace ID provided');
  }

  try {
    const url = `${API_BASE_URL}/v1/workspaces/${workspaceId}/cname/toggle`;
    const response = await fetchAPI.PUT<CnameSettings>(url, { is_enabled: isEnabled });

    if (!response || !response.data) {
      console.error('Failed to toggle CNAME settings or data is missing');
      throw new Error('Failed to toggle CNAME settings');
    }

    return response.data;
  } catch (error) {
    console.error('Error toggling CNAME settings:', error);
    throw error;
  }
};

/**
 * Verifies CNAME settings for a workspace.
 * @param workspaceId The ID of the workspace.
 * @returns A promise that resolves to the updated CNAME settings.
 */
export const verifyCnameSettings = async (workspaceId: number): Promise<CnameSettings> => {
  if (!workspaceId) {
    console.error('verifyCnameSettings requires a valid workspaceId');
    throw new Error('Invalid workspace ID provided');
  }

  try {
    const url = `${API_BASE_URL}/v1/workspaces/${workspaceId}/cname/verify`;
    const response = await fetchAPI.POST<CnameSettings>(url, {});

    if (!response || !response.data) {
      console.error('Failed to verify CNAME settings or data is missing');
      throw new Error('Failed to verify CNAME settings');
    }

    return response.data;
  } catch (error) {
    console.error('Error verifying CNAME settings:', error);
    throw error;
  }
};

/**
 * Checks if a domain is available for use.
 * @param workspaceId The ID of the workspace.
 * @param domain The domain to check.
 * @returns A promise that resolves to a status object.
 */
