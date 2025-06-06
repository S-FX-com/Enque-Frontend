import { logger } from '@/lib/logger';
import { AppConfigs } from '@/configs';
import { ServiceResponse } from '@/typescript';
import {
  IWorkspace,
  ICreateWorkspace,
  IWorkspaceSetup,
  IWorkspaceSetupResponse,
} from '@/typescript/workspace';
import { fetchAPI } from '@/lib/fetch-api';

const SERVICE_ENDPOINT = `${AppConfigs.api}/workspaces`;

const workspaceService = {
  // Get workspace by subdomain
  async getWorkspaceBySubdomain(subdomain: string): Promise<ServiceResponse<IWorkspace>> {
    try {
      logger.info(`Getting workspace for subdomain: ${subdomain}`);

      const data = await fetchAPI.GET<IWorkspace>(
        `${SERVICE_ENDPOINT}/by-subdomain/${subdomain}`,
        false
      );

      if (data.success) {
        logger.info(`Workspace found: ${data.data?.subdomain}`);
      } else {
        logger.warn(`Workspace not found for subdomain: ${subdomain}`);
      }

      return data;
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      logger.error(`Error getting workspace by subdomain ${subdomain}:`, message);
      return { success: false, message };
    }
  },

  // Create a workspace (requires admin)
  async createWorkspace(dataToCreate: ICreateWorkspace): Promise<ServiceResponse<IWorkspace>> {
    try {
      const data = await fetchAPI.POST<IWorkspace>(
        `${SERVICE_ENDPOINT}`,
        dataToCreate as unknown as Record<string, unknown>
      );
      return data;
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      return { success: false, message };
    }
  },

  // Initial workspace setup (public)
  async setupWorkspace(
    setupData: IWorkspaceSetup
  ): Promise<ServiceResponse<IWorkspaceSetupResponse>> {
    try {
      logger.info(`Setting up workspace: ${setupData.subdomain}`);

      const data = await fetchAPI.POST<IWorkspaceSetupResponse>(
        `${SERVICE_ENDPOINT}/setup`,
        setupData as unknown as Record<string, unknown>,
        false // No authentication required
      );

      if (data.success) {
        logger.info(`Workspace setup successful: ${data.data?.workspace.subdomain}`);
      } else {
        logger.error(`Workspace setup failed: ${data.message}`);
      }

      return data;
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      logger.error(`Error during workspace setup:`, message);
      return { success: false, message };
    }
  },

  // Get workspace by ID
  async getWorkspaceById(id: number): Promise<ServiceResponse<IWorkspace>> {
    try {
      const data = await fetchAPI.GET<IWorkspace>(`${SERVICE_ENDPOINT}/${id}`);
      return data;
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      return { success: false, message };
    }
  },

  // List all workspaces (admin)
  async getWorkspaces(): Promise<ServiceResponse<IWorkspace[]>> {
    try {
      const data = await fetchAPI.GET<IWorkspace[]>(SERVICE_ENDPOINT);
      return data;
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      return { success: false, message };
    }
  },

  // Delete workspace
  async deleteWorkspace(id: number): Promise<ServiceResponse<{ message: string }>> {
    try {
      const data = await fetchAPI.DELETE<{ message: string }>(`${SERVICE_ENDPOINT}/${id}`);
      return data;
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      return { success: false, message };
    }
  },
};

export { workspaceService };
