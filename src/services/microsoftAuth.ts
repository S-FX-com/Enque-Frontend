import { AppConfigs } from '@/configs';
import { ServiceResponse } from '@/typescript';
import { logger } from '@/lib/logger';
import { getAuthToken } from '@/lib/auth';
//import { ConfidentialClientApplication } from '@azure/msal-node';
//const { ConfidentialClientApplication } = await import('@azure/msal-browser');
import { Url } from 'next/dist/shared/lib/router/router';

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
const AUTH_ENDPOINT = `${AppConfigs.api}/auth`;

export const microsoftAuthService = {
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

  handleAuthCallback(): { token?: string; error?: string; isNew?: boolean } {
    if (typeof window === 'undefined') {
      return {};
    }

    const urlParams = new URLSearchParams(window.location.search);
    const token = urlParams.get('token');
    const isNew = urlParams.get('is_new') === 'true';
    const m365Auth = urlParams.get('m365_auth');
    const error = urlParams.get('error');

    if (m365Auth === 'success' && token) {
      const newUrl = window.location.pathname;
      window.history.replaceState({}, document.title, newUrl);

      return { token, isNew };
    }

    if (error) {
      const newUrl = window.location.pathname;
      window.history.replaceState({}, document.title, newUrl);

      return { error: decodeURIComponent(error) };
    }

    return {};
  },

  async getWorkspaceIdFromSubdomain(): Promise<number> {
    if (typeof window === 'undefined') {
      return 1;
    }

    const hostname = window.location.hostname;
    const isSubdomain = hostname !== 'app.enque.cc' && hostname.endsWith('.enque.cc');

    if (isSubdomain) {
      const subdomain = hostname.replace('.enque.cc', '');

      try {
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

    return 1;
  },

  async initiateLogin(): Promise<void> {
    try {
      const workspaceId = await this.getWorkspaceIdFromSubdomain();

      const response = await fetch(
        `${AUTH_ENDPOINT}/microsoft/auth/url?workspace_id=${workspaceId}`,
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

  async checkM365Email(email: string): Promise<ServiceResponse<undefined>> {
    try {
      const response = await fetch(`${AUTH_ENDPOINT}/microsoft/check-user/${email}`, {
        method: 'GET',
      });

      if (response.status === 200) {
        return { success: true, message: 'User is linked to M365', data: undefined };
      }
      return { success: false, message: 'User is not linked to M365', data: undefined };
    } catch (error: unknown) {
      if (error instanceof Error) {
        console.error('Error checking email:', error.message);
      }

      return { success: false, message: 'Unexpected error', data: undefined };
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
  async loginWithMicrosoftTest(): // Promise<ServiceResponse<{ access_token: string; token_type: string }>>
  Promise<string> {
    const tenantId = '76d9eabb-931c-452b-9e08-058b058b6581'; // or "your-tenant-id"
    const clientId = '6e2e4d52-8f3c-49b2-9495-09845e5090fa';
    const redirectUri = encodeURIComponent('http://users.localhost:3000/dashboard');
    const scopes = encodeURIComponent('openid email profile User.Read');
    const state = Math.random().toString(36).substring(2);

    const authUrl = `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/authorize?client_id=${clientId}&response_type=code&redirect_uri=${redirectUri}&response_mode=query&scope=${scopes}&state=${state}`;
    return authUrl;
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
   * Link Microsoft 365 account to existing authenticated agent
   */
  async linkMicrosoftAccount(
    microsoftData: {
      microsoft_id: string;
      microsoft_email: string;
      microsoft_tenant_id: string;
      microsoft_profile_data?: string;
    },
    authToken: string
  ): Promise<ServiceResponse<{ message: string; auth_method: string; microsoft_email: string }>> {
    try {
      const response = await fetch(`${AUTH_ENDPOINT}/microsoft/link`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify(microsoftData),
      });

      const data = await response.json();

      if (!response.ok) {
        return {
          success: false,
          message: data.detail || 'Failed to link Microsoft account',
          data: undefined,
        };
      }

      return {
        success: true,
        message: data.message || 'Microsoft account linked successfully',
        data: data,
      };
    } catch (error) {
      logger.error(
        'Microsoft account linking error:',
        error instanceof Error ? error.message : 'Unknown error'
      );
      return {
        success: false,
        message: 'Network error during Microsoft account linking',
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

  async initiateLinking(): Promise<void> {
    try {
      // Get current user info
      const authToken = getAuthToken();
      if (!authToken) {
        throw new Error('User must be authenticated to link Microsoft account');
      }

      const apiUrlBase =
        process.env.NEXT_PUBLIC_API_BASE_URL || 'https://enque-backend-production.up.railway.app';
      const originUrl = window.location.origin;
      const fullApiUrl = `${apiUrlBase}/v1/microsoft/profile/auth/url?origin_url=${encodeURIComponent(originUrl)}`;

      const response = await fetch(fullApiUrl, {
        headers: {
          Authorization: `Bearer ${authToken}`,
        },
      });

      const data = await response.json();

      if (response.ok && data.auth_url) {
        window.location.href = data.auth_url;
      } else {
        throw new Error(
          (data as { detail?: string }).detail || 'Failed to get authorization URL for linking'
        );
      }
    } catch (error) {
      logger.error(
        'Microsoft account linking initiation error:',
        error instanceof Error ? error.message : 'Unknown error'
      );
      throw error;
    }
  },
};
