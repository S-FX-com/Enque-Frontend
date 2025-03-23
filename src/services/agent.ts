import { AppConfigs } from "@/configs";
import { fetchAPI } from "@/lib/fetch-api";
import { IAgent, ICreateAgent } from "@/typescript/agent";
import { ServiceResponse } from "@/typescript";

/** Service endpoint */
const SERVICE_ENDPOINT = `${AppConfigs.api}/agents`;

export const agentService = {
	/** */
	async createAgent(dataToCreate: ICreateAgent): Promise<ServiceResponse<IAgent>> {
		try {
			const data = await fetchAPI.POST<IAgent>(SERVICE_ENDPOINT, {});
			return data;
		} catch (error: unknown) {
			const message = error instanceof Error ? error.message : "Unknown error";
			return { success: false, message };
		}
	},
};
