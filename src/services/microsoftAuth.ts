import { AppConfigs } from '@/configs';
import { ServiceResponse } from '@/typescript';
import { logger } from '@/lib/logger';

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

const AUTH_ENDPOINT = `${AppConfigs.api}/auth`;

export const microsoftAuthService = {
  async getWorkspaceIdFromSubdomain(): Promise<number> {
    if (typeof window === 'undefined') return 1;

    const hostname = window.location.hostname;

    // Check if this is a subdomain of enque.cc
    if (hostname !== 'old.enque.cc' && hostname.endsWith('.enque.cc')) {
      // For now, return a default workspace ID since we'd need to look up
      // the actual workspace ID from the subdomain
      // This would typically require an API call to get workspace by subdomain
      return 1;
    }

    // Default workspace for main domain
    return 1;
  },

  async initiateLogin(): Promise<void> {
    try {
      const workspaceId = await this.getWorkspaceIdFromSubdomain();

      const response = await fetch(
        `${AUTH_ENDPOINT}/microsoft/signin/auth/url?workspace_id=${workspaceId}`,
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Failed to get auth URL');
      }

      const data = await response.json();

      if (data.auth_url) {
        window.location.href = data.auth_url;
      } else {
        throw new Error('No auth URL received');
      }
    } catch (error) {
      logger.error(
        'Microsoft login initiation error:',
        error instanceof Error ? error.message : 'Network error'
      );
      throw error;
    }
  },

  async loginWithMicrosoft(microsoftData: {
    microsoft_id: string;
    microsoft_email: string;
    microsoft_tenant_id: string;
    microsoft_profile_data?: string;
    access_token: string;
    expires_in: number;
    workspace_id?: number;
  }): Promise<ServiceResponse<{ access_token: string; token_type: string }>> {
    try {
      const response = await fetch(`${AUTH_ENDPOINT}/microsoft/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(microsoftData),
      });

      const data = await response.json();

      if (!response.ok) {
        return {
          success: false,
          message: data.detail || 'Microsoft login failed',
          data: undefined,
        };
      }

      return {
        success: true,
        message: 'Successfully signed in with Microsoft 365',
        data: data,
      };
    } catch (error) {
      logger.error(
        'Microsoft login error:',
        error instanceof Error ? error.message : 'Unknown error'
      );
      return {
        success: false,
        message: 'Network error during Microsoft login',
        data: undefined,
      };
    }
  },

  async logoutMicrosoft(): Promise<ServiceResponse<{ message: string }>> {
    try {
      // 1. Call your backend logout endpoint
      const response = await fetch(`${AUTH_ENDPOINT}/microsoft/logout`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('access_token')}`,
        },
      });

      if (!response.ok) {
        const data = await response.json();
        return {
          success: false,
          message: data.detail || 'Logout failed',
          data: undefined,
        };
      }

      // 2. Clear frontend tokens
      localStorage.removeItem('access_token');
      localStorage.removeItem('token_type');

      // 3. Optionally redirect to Microsoft logout
      // window.location.href = 'https://login.microsoftonline.com/common/oauth2/v2.0/logout';

      return {
        success: true,
        message: 'Successfully logged out',
        data: { message: 'Logged out successfully' },
      };
    } catch (error) {
      logger.error('Logout error:', error instanceof Error ? error.message : 'Unknown error');
      return {
        success: false,
        message: 'Network error during logout',
        data: undefined,
      };
    }
  },

  /**
   * Get Microsoft user profile from Graph API
   */
  async getMicrosoftUserProfile(
    accessToken: string
  ): Promise<ServiceResponse<MicrosoftProfileData>> {
    try {
      const response = await fetch('https://graph.microsoft.com/v1.0/me', {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      if (!response.ok) {
        return {
          success: false,
          message: 'Failed to get Microsoft user profile',
          data: undefined,
        };
      }

      const profileData = await response.json();

      return {
        success: true,
        message: 'Profile retrieved successfully',
        data: {
          id: profileData.id,
          displayName: profileData.displayName,
          givenName: profileData.givenName,
          surname: profileData.surname,
          mail: profileData.mail,
          userPrincipalName: profileData.userPrincipalName,
          jobTitle: profileData.jobTitle,
          mobilePhone: profileData.mobilePhone,
        },
      };
    } catch (error) {
      logger.error(
        'Error getting Microsoft profile:',
        error instanceof Error ? error.message : 'Unknown error'
      );
      return {
        success: false,
        message: 'Network error getting Microsoft profile',
        data: undefined,
      };
    }
  },
};
