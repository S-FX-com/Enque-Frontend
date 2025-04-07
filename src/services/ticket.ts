import { AppConfigs } from "@/configs";
import { fetchAPI } from "@/lib/fetch-api";
import { ServiceResponse } from "@/typescript";
import { ITicket, ICreateTicket, IUpdateTicket, IGetTicket } from "@/typescript/ticket";

/** Service endpoint */
const SERVICE_ENDPOINT = `${AppConfigs.api}/tickets`;

export const ticketService = {
	/** */
	async getTicket(paramsObj: IGetTicket): Promise<ServiceResponse<ITicket>> {
		try {
			const queryParams = new URLSearchParams();
			Object.entries(paramsObj).forEach(([key, value]) => {
				if (value !== undefined) {
					queryParams.append(`filter[${key}]`, String(value));
				}
			});

			const data = await fetchAPI.GET<ITicket[]>(`${SERVICE_ENDPOINT}?${queryParams.toString()}`);
			if (data.success && data.data && data.data.length > 0) return { success: true, data: data.data[0] };

			return { success: false, message: "Ticket not found" };
		} catch (error: unknown) {
			const message = error instanceof Error ? error.message : "Unknown error";
			return { success: false, message };
		}
	},

	/** */
	async createTicket(dataToCreate: ICreateTicket): Promise<ServiceResponse<ITicket>> {
		try {
			const data = await fetchAPI.POST<ITicket>(`${SERVICE_ENDPOINT}`, dataToCreate);
			return data;
		} catch (error: unknown) {
			const message = error instanceof Error ? error.message : "Unknown error";
			return { success: false, message };
		}
	},

	/** */
	async updateTicketById(ticket_id: number, dataToUpdate: IUpdateTicket): Promise<ServiceResponse<ITicket>> {
		try {
			const data = await fetchAPI.PUT<ITicket>(`${SERVICE_ENDPOINT}/${ticket_id}`, dataToUpdate);
			return data;
		} catch (error: unknown) {
			const message = error instanceof Error ? error.message : "Unknown error";
			return { success: false, message };
		}
	},

	/** */
	async deleteTicketById(ticket_id: number): Promise<ServiceResponse<ITicket>> {
		try {
			const data = await fetchAPI.DELETE<ITicket>(`${SERVICE_ENDPOINT}/${ticket_id}`);
			return data;
		} catch (error: unknown) {
			const message = error instanceof Error ? error.message : "Unknown error";
			return { success: false, message };
		}
	},

	/** */
	async getTickets(paramsObj: Partial<IGetTicket>): Promise<ServiceResponse<ITicket[]>> {
		try {
			const queryParams = new URLSearchParams();
			Object.entries(paramsObj).forEach(([key, value]) => {
				if (value !== undefined) {
					queryParams.append(`filter[${key}]`, String(value));
				}
			});

			const data = await fetchAPI.GET<ITicket[]>(`${SERVICE_ENDPOINT}?${queryParams.toString()}`);
			return data;
		} catch (error: unknown) {
			const message = error instanceof Error ? error.message : "Unknown error";
			return { success: false, message };
		}
	},
};
