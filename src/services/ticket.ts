import { AppConfigs } from "@/configs";
import { fetchAPI } from "@/lib/fetch-api";
import { ServiceResponse } from "@/typescript";
import { ITicket } from "@/typescript/ticket";

/** Service endpoint */
const SERVICE_ENDPOINT = `${AppConfigs.api}/tickets`;

export const ticketService = {
	/** */
	async getTickets(): Promise<ServiceResponse<ITicket[]>> {
		try {
			const data = await fetchAPI.GET<ITicket[]>(`${SERVICE_ENDPOINT}`);
			return data;
		} catch (error: unknown) {
			const message = error instanceof Error ? error.message : "Unknown error";
			return { success: false, message };
		}
	},
};
