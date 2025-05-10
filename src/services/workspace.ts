import { AppConfigs } from '@/configs';
import { fetchAPI } from '@/lib/fetch-api';
import { ServiceResponse } from '@/typescript';
import {
  IWorkspace,
  ICreateWorkspace,
  IUpdateWorkspace,
  IGetWorkspace,
} from '@/typescript/workspace';

// Interfaces
interface SubdomainAvailability {
  available: boolean;
}

interface Workspace {
  id: number;
  name: string;
  subdomain: string;
  created_at: string;
}

// Endpoint del servicio
const SERVICE_ENDPOINT = `${AppConfigs.api}/workspaces`;

export const workspaceService = {
  // Obtener workspace por ID o subdomain
  async getWorkspace(paramsObj: IGetWorkspace): Promise<ServiceResponse<IWorkspace>> {
    try {
      const queryParams = new URLSearchParams();
      Object.entries(paramsObj).forEach(([key, value]) => {
        if (value !== undefined) {
          queryParams.append(`filter[${key}]`, String(value));
        }
      });

      const data = await fetchAPI.GET<IWorkspace[]>(
        `${SERVICE_ENDPOINT}?${queryParams.toString()}`
      );
      if (data.success && data.data && data.data.length > 0)
        return { success: true, data: data.data[0] };

      return { success: false, message: 'Workspace not found' };
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      return { success: false, message };
    }
  },

  // Crear un workspace
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

  // Actualizar un workspace por ID
  async updateWorkspaceById(
    workspace_id: number,
    dataToUpdate: Partial<IUpdateWorkspace>
  ): Promise<ServiceResponse<IWorkspace>> {
    try {
      const data = await fetchAPI.PUT<IWorkspace>(
        `${SERVICE_ENDPOINT}/${workspace_id}`,
        dataToUpdate as unknown as Record<string, unknown>
      );
      return data;
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      return { success: false, message };
    }
  },

  // Verificar disponibilidad de subdominio
  async checkSubdomainAvailability(
    subdomain: string
  ): Promise<ServiceResponse<SubdomainAvailability>> {
    try {
      const response = await fetchAPI.GET<SubdomainAvailability>(
        `${SERVICE_ENDPOINT}/check-subdomain/${subdomain}`,
        false
      );
      return response;
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      return { success: false, message };
    }
  },

  // Obtener workspace por subdominio
  async getWorkspaceBySubdomain(subdomain: string): Promise<ServiceResponse<Workspace>> {
    try {
      const response = await fetchAPI.GET<Workspace>(
        `${SERVICE_ENDPOINT}/subdomain/${subdomain}`,
        false
      );
      return response;
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      return { success: false, message };
    }
  },

  // Obtener detalles del workspace actual (autenticado)
  async getCurrentWorkspace(): Promise<ServiceResponse<Workspace>> {
    try {
      const response = await fetchAPI.GET<Workspace>(`${SERVICE_ENDPOINT}/current`);
      return response;
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      return { success: false, message };
    }
  },
};
