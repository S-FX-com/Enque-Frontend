import { AppConfigs } from "@/configs";
import { fetchAPI } from "@/lib/fetch-api";
import { ServiceResponse } from "@/typescript";
import { IActivity, ICreateActivity, IUpdateActivity } from "@/typescript/activity";

/** Service endpoint */
const SERVICE_ENDPOINT = `${AppConfigs.api}/activities`;

export const activityService = {
	/** */
	async getActivity(paramsObj: IActivity): Promise<ServiceResponse<IActivity>> {
		try {
			const queryParams = new URLSearchParams();
			Object.entries(paramsObj).forEach(([key, value]) => {
				if (value !== undefined) {
					queryParams.append(`filter[${key}]`, String(value));
				}
			});

			const data = await fetchAPI.GET<IActivity[]>(`${SERVICE_ENDPOINT}?${queryParams.toString()}`);
			if (data.success && data.data && data.data.length > 0) return { success: true, data: data.data[0] };

			return { success: false, message: "Activity not found" };
		} catch (error: unknown) {
			const message = error instanceof Error ? error.message : "Unknown error";
			return { success: false, message };
		}
	},

	/** */
	async createActivity(dataToCreate: ICreateActivity): Promise<ServiceResponse<IActivity>> {
		try {
			const data = await fetchAPI.POST<IActivity>(`${SERVICE_ENDPOINT}`, dataToCreate);
			return data;
		} catch (error: unknown) {
			const message = error instanceof Error ? error.message : "Unknown error";
			return { success: false, message };
		}
	},

	/** */
	async updateActivityById(ticket_id: number, dataToUpdate: IUpdateActivity): Promise<ServiceResponse<IActivity>> {
		try {
			const data = await fetchAPI.PUT<IActivity>(`${SERVICE_ENDPOINT}/${ticket_id}`, dataToUpdate);
			return data;
		} catch (error: unknown) {
			const message = error instanceof Error ? error.message : "Unknown error";
			return { success: false, message };
		}
	},

	/** */
	async deleteActivityById(ticket_id: number): Promise<ServiceResponse<IActivity>> {
		try {
			const data = await fetchAPI.DELETE<IActivity>(`${SERVICE_ENDPOINT}/${ticket_id}`);
			return data;
		} catch (error: unknown) {
			const message = error instanceof Error ? error.message : "Unknown error";
			return { success: false, message };
		}
	},

	/** */
	async getActivitys(paramsObj: IActivity): Promise<ServiceResponse<IActivity[]>> {
		try {
			const queryParams = new URLSearchParams();
			Object.entries(paramsObj).forEach(([key, value]) => {
				if (value !== undefined) {
					queryParams.append(`filter[${key}]`, String(value));
				}
			});

			const data = await fetchAPI.GET<IActivity[]>(`${SERVICE_ENDPOINT}?${queryParams.toString()}`);
			return data;
		} catch (error: unknown) {
			const message = error instanceof Error ? error.message : "Unknown error";
			return { success: false, message };
		}
	},
};
