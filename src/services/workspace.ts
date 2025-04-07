import { AppConfigs } from "@/configs";
import { fetchAPI } from "@/lib/fetch-api";
import { ServiceResponse } from "@/typescript";
import { IWorkspace, ICreateWorkspace, IUpdateWorkspace } from "@/typescript/workspace";

/** Service endpoint */
const SERVICE_ENDPOINT = `${AppConfigs.api}/workspaces`;

export const workspaceService = {
	/** */
	async getWorkspace(paramsObj: Partial<IWorkspace>): Promise<ServiceResponse<IWorkspace>> {
		try {
			const queryParams = new URLSearchParams();
			Object.entries(paramsObj).forEach(([key, value]) => {
				if (value !== undefined) {
					queryParams.append(`filter[${key}]`, String(value));
				}
			});

			const data = await fetchAPI.GET<IWorkspace[]>(`${SERVICE_ENDPOINT}?${queryParams.toString()}`);
			if (data.success && data.data && data.data.length > 0) return { success: true, data: data.data[0] };

			return { success: false, message: "Workspace not found" };
		} catch (error: unknown) {
			const message = error instanceof Error ? error.message : "Unknown error";
			return { success: false, message };
		}
	},

	/** */
	async createWorkspace(dataToCreate: ICreateWorkspace): Promise<ServiceResponse<IWorkspace>> {
		try {
			const data = await fetchAPI.POST<IWorkspace>(`${SERVICE_ENDPOINT}`, dataToCreate);
			return data;
		} catch (error: unknown) {
			const message = error instanceof Error ? error.message : "Unknown error";
			return { success: false, message };
		}
	},

	/** */
	async updateWorkspaceById(workspace_id: number, dataToUpdate: IUpdateWorkspace): Promise<ServiceResponse<IWorkspace>> {
		try {
			const data = await fetchAPI.PUT<IWorkspace>(`${SERVICE_ENDPOINT}/${workspace_id}`, dataToUpdate);
			return data;
		} catch (error: unknown) {
			const message = error instanceof Error ? error.message : "Unknown error";
			return { success: false, message };
		}
	},

	/** */
	async deleteWorkspaceById(workspace_id: number): Promise<ServiceResponse<IWorkspace>> {
		try {
			const data = await fetchAPI.DELETE<IWorkspace>(`${SERVICE_ENDPOINT}/${workspace_id}`);
			return data;
		} catch (error: unknown) {
			const message = error instanceof Error ? error.message : "Unknown error";
			return { success: false, message };
		}
	},

	/** */
	async getWorkspaces(paramsObj: IWorkspace): Promise<ServiceResponse<IWorkspace[]>> {
		try {
			const queryParams = new URLSearchParams();
			Object.entries(paramsObj).forEach(([key, value]) => {
				if (value !== undefined) {
					queryParams.append(`filter[${key}]`, String(value));
				}
			});

			const data = await fetchAPI.GET<IWorkspace[]>(`${SERVICE_ENDPOINT}?${queryParams.toString()}`);
			return data;
		} catch (error: unknown) {
			const message = error instanceof Error ? error.message : "Unknown error";
			return { success: false, message };
		}
	},
};
