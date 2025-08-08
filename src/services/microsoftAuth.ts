/**
 * Microsoft 365 Authentication Service
 * Handles OAuth flow and agent linking
 */

import { AppConfigs } from '@/configs';
import { ServiceResponse } from '@/typescript';
import { logger } from '@/lib/logger';

export interface MicrosoftAuthUrlResponse {
  auth_url: string;
  message: string;
}

export interface MicrosoftProfileData {
  id: string;
  displayName?: string;
  givenName?: string;
  surname?: string;
  mail?: string;
  userPrincipalName?: string;
  jobTitle?: string;
  mobilePhone?: string;
  tenantId?: string;
}

export interface MicrosoftAuthStatus {
  agent_id: number;
  is_linked: boolean;
  microsoft_email?: string;
  auth_method: 'password' | 'microsoft' | 'both';
  has_password: boolean;
  can_use_password: boolean;
  can_use_microsoft: boolean;
}

export interface MicrosoftLinkResponse {
  message: string;
  agent_id: number;
  microsoft_email: string;
  auth_method: string;
}

const SERVICE_ENDPOINT = `${AppConfigs.api}/microsoft/auth`;

export const microsoftAuthService = {
  /**
   * Get Microsoft OAuth authorization URL
   */
  async getAuthUrl(
    workspaceId: number,
    redirectPath: string = '/dashboard'
  ): Promise<ServiceResponse<MicrosoftAuthUrlResponse>> {
    console.log(redirectPath);
    try {
      const stateObject = {
        workspace_id: workspaceId.toString(),
        original_hostname: window.location.hostname,
      };
      const stateJsonString = JSON.stringify(stateObject);
      let base64State = Buffer.from(stateJsonString).toString('base64');
      base64State = base64State.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

      const params = new URLSearchParams({
        state: base64State,
      });

      console.log('Ok');

      const response = await fetch(`${SERVICE_ENDPOINT}/authorize?${params}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();

      if (response.ok) {
        return {
          success: true,
          data,
          message: 'Auth URL generated successfully',
        };
      } else {
        return {
          success: false,
          message: data.detail || 'Failed to generate auth URL',
        };
      }
    } catch (error) {
      logger.error(
        'Microsoft auth URL generation error:',
        error instanceof Error ? error.message : 'Network error'
      );
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Network error',
      };
    }
  },

  /**
   * Get Microsoft authentication status for current user
   */
  async getAuthStatus(token: string): Promise<ServiceResponse<MicrosoftAuthStatus>> {
    try {
      const response = await fetch(`${SERVICE_ENDPOINT}/status`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await response.json();

      if (response.ok) {
        return {
          success: true,
          data,
          message: 'Status retrieved successfully',
        };
      } else {
        return {
          success: false,
          message: data.detail || 'Failed to get auth status',
        };
      }
    } catch (error) {
      logger.error(
        'Microsoft auth status error:',
        error instanceof Error ? error.message : 'Network error'
      );
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Network error',
      };
    }
  },

  /**
   * Get Microsoft profile for current user
   */
  async getProfile(
    token: string,
    agentId?: number
  ): Promise<ServiceResponse<MicrosoftProfileData>> {
    try {
      const params = agentId ? `?agent_id=${agentId}` : '';

      const response = await fetch(`${SERVICE_ENDPOINT}/profile${params}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await response.json();

      if (response.ok) {
        return {
          success: true,
          data,
          message: 'Profile retrieved successfully',
        };
      } else {
        return {
          success: false,
          message: data.detail || 'Failed to get profile',
        };
      }
    } catch (error) {
      logger.error(
        'Microsoft profile fetch error:',
        error instanceof Error ? error.message : 'Network error'
      );
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Network error',
      };
    }
  },

  /**
   * Link existing agent to Microsoft 365
   */
  async linkAgent(
    token: string,
    agentId: number,
    microsoftAuthCode: string,
    redirectUri: string
  ): Promise<ServiceResponse<MicrosoftLinkResponse>> {
    try {
      const response = await fetch(`${SERVICE_ENDPOINT}/link`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          agent_id: agentId,
          microsoft_auth_code: microsoftAuthCode,
          redirect_uri: redirectUri,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        return {
          success: true,
          data,
          message: 'Agent linked successfully',
        };
      } else {
        return {
          success: false,
          message: data.detail || 'Failed to link agent',
        };
      }
    } catch (error) {
      logger.error(
        'Microsoft agent link error:',
        error instanceof Error ? error.message : 'Network error'
      );
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Network error',
      };
    }
  },

  /**
   * Unlink agent from Microsoft 365
   */
  async unlinkAgent(
    token: string,
    agentId: number
  ): Promise<ServiceResponse<MicrosoftLinkResponse>> {
    try {
      const response = await fetch(`${SERVICE_ENDPOINT}/unlink`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          agent_id: agentId,
          confirm: true,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        return {
          success: true,
          data,
          message: 'Agent unlinked successfully',
        };
      } else {
        return {
          success: false,
          message: data.detail || 'Failed to unlink agent',
        };
      }
    } catch (error) {
      logger.error(
        'Microsoft agent unlink error:',
        error instanceof Error ? error.message : 'Network error'
      );
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Network error',
      };
    }
  },

  /**
   * Handle Microsoft auth callback (for frontend processing)
   */
  handleAuthCallback(): { token?: string; error?: string; isNew?: boolean } {
    if (typeof window === 'undefined') {
      return {};
    }

    const urlParams = new URLSearchParams(window.location.search);

    // Check for success parameters
    const token = urlParams.get('token');
    const isNew = urlParams.get('is_new') === 'true';
    const m365Auth = urlParams.get('m365_auth');

    // Check for error parameters
    const error = urlParams.get('error');

    if (m365Auth === 'success' && token) {
      // Clean URL
      const newUrl = window.location.pathname;
      window.history.replaceState({}, document.title, newUrl);

      return { token, isNew };
    }

    if (error) {
      // Clean URL
      const newUrl = window.location.pathname;
      window.history.replaceState({}, document.title, newUrl);

      return { error: decodeURIComponent(error) };
    }

    return {};
  },

  /**
   * Get workspace ID from current subdomain
   */
  async getWorkspaceIdFromSubdomain(): Promise<number> {
    if (typeof window === 'undefined') {
      return 1; // Default workspace
    }

    const hostname = window.location.hostname;
    const isSubdomain = hostname !== 'app.enque.cc' && hostname.endsWith('.enque.cc');

    if (isSubdomain) {
      const subdomain = hostname.replace('.enque.cc', '');

      try {
        // Call workspace service to get workspace ID
        const response = await fetch(`${AppConfigs.api}/workspaces/by-subdomain/${subdomain}`);

        if (response.ok) {
          const workspace = await response.json();
          return workspace.id;
        }
      } catch (error) {
        logger.error(
          'Failed to get workspace ID from subdomain:',
          error instanceof Error ? error.message : 'Network error'
        );
      }
    }

    return 1; // Default workspace
  },

  /**
   * Initiate Microsoft 365 login flow
   */
  async initiateLogin(redirectPath: string = '/dashboard'): Promise<void> {
    try {
      const workspaceId = await this.getWorkspaceIdFromSubdomain();
      const authUrlResponse = await this.getAuthUrl(workspaceId, redirectPath);

      if (authUrlResponse.success && authUrlResponse.data?.auth_url) {
        window.location.href = authUrlResponse.data.auth_url;
      } else {
        throw new Error(authUrlResponse.message || 'Failed to get auth URL');
      }
    } catch (error) {
      logger.error(
        'Microsoft login initiation error:',
        error instanceof Error ? error.message : 'Network error'
      );
      throw error;
    }
  },
};
