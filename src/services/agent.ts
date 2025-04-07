import { AppConfigs } from "@/configs";
import { fetchAPI } from "@/lib/fetch-api";
import { ServiceResponse } from "@/typescript";
import { IAgent, ICreateAgent, IUpdateAgent } from "@/typescript/agent";

/** Service endpoint */
const SERVICE_ENDPOINT = `${AppConfigs.api}/agents`;

export const agentService = {
	/** */
	async getAgent(paramsObj: IAgent): Promise<ServiceResponse<IAgent>> {
		try {
			const queryParams = new URLSearchParams();
			Object.entries(paramsObj).forEach(([key, value]) => {
				if (value !== undefined) {
					queryParams.append(`filter[${key}]`, String(value));
				}
			});

			const data = await fetchAPI.GET<IAgent[]>(`${SERVICE_ENDPOINT}?${queryParams.toString()}`);
			if (data.success && data.data && data.data.length > 0) return { success: true, data: data.data[0] };

			return { success: false, message: "Agent not found" };
		} catch (error: unknown) {
			const message = error instanceof Error ? error.message : "Unknown error";
			return { success: false, message };
		}
	},

	/** */
	async createAgent(dataToCreate: ICreateAgent): Promise<ServiceResponse<IAgent>> {
		try {
			const data = await fetchAPI.POST<IAgent>(`${SERVICE_ENDPOINT}`, dataToCreate);
			return data;
		} catch (error: unknown) {
			const message = error instanceof Error ? error.message : "Unknown error";
			return { success: false, message };
		}
	},

	/** */
	async updateAgentById(agent_id: number, dataToUpdate: IUpdateAgent): Promise<ServiceResponse<IAgent>> {
		try {
			const data = await fetchAPI.PUT<IAgent>(`${SERVICE_ENDPOINT}/${agent_id}`, dataToUpdate);
			return data;
		} catch (error: unknown) {
			const message = error instanceof Error ? error.message : "Unknown error";
			return { success: false, message };
		}
	},

	/** */
	async deleteAgentById(agent_id: number): Promise<ServiceResponse<IAgent>> {
		try {
			const data = await fetchAPI.DELETE<IAgent>(`${SERVICE_ENDPOINT}/${agent_id}`);
			return data;
		} catch (error: unknown) {
			const message = error instanceof Error ? error.message : "Unknown error";
			return { success: false, message };
		}
	},

	/** */
	async getAgents(paramsObj: IAgent): Promise<ServiceResponse<IAgent[]>> {
		try {
			const queryParams = new URLSearchParams();
			Object.entries(paramsObj).forEach(([key, value]) => {
				if (value !== undefined) {
					queryParams.append(`filter[${key}]`, String(value));
				}
			});

			const data = await fetchAPI.GET<IAgent[]>(`${SERVICE_ENDPOINT}?${queryParams.toString()}`);
			return data;
		} catch (error: unknown) {
			const message = error instanceof Error ? error.message : "Unknown error";
			return { success: false, message };
		}
	},
};
