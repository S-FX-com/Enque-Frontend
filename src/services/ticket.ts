import { fetchAPI } from "@/lib/fetch-api";
import { ServiceResponse } from "@/typescript";
import { ITicket } from "@/typescript/ticket";

/** Endpoint del servicio */
const SERVICE_ENDPOINT = "http://localhost:8000/tickets";

export const ticketService = {
	/** */
	async getTickets(): Promise<ServiceResponse<ITicket[]>> {
		try {
			const data = await fetchAPI.GET<ITicket[]>(`${SERVICE_ENDPOINT}`);
			return data;
		} catch (error: unknown) {
			const message = error instanceof Error ? error.message : "Error desconocido";
			return { success: false, message };
		}
	},
};
