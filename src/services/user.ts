import { AppConfigs } from "@/configs";
import { fetchAPI } from "@/lib/fetch-api";
import { ServiceResponse } from "@/typescript";
import { IUser, ICreateUser, IUpdateUser, IGetUser } from "@/typescript/user";

/** Service endpoint */
const SERVICE_ENDPOINT = `${AppConfigs.api}/users`;

export const userService = {
	/** */
	async getUser(paramsObj: IUser): Promise<ServiceResponse<IUser>> {
		try {
			const queryParams = new URLSearchParams();
			Object.entries(paramsObj).forEach(([key, value]) => {
				if (value !== undefined) {
					queryParams.append(`filter[${key}]`, String(value));
				}
			});

			const data = await fetchAPI.GET<IUser[]>(`${SERVICE_ENDPOINT}?${queryParams.toString()}`);
			if (data.success && data.data && data.data.length > 0) return { success: true, data: data.data[0] };

			return { success: false, message: "User not found" };
		} catch (error: unknown) {
			const message = error instanceof Error ? error.message : "Unknown error";
			return { success: false, message };
		}
	},

	/** */
	async createUser(dataToCreate: ICreateUser): Promise<ServiceResponse<IUser>> {
		try {
			const data = await fetchAPI.POST<IUser>(`${SERVICE_ENDPOINT}`, dataToCreate);
			return data;
		} catch (error: unknown) {
			const message = error instanceof Error ? error.message : "Unknown error";
			return { success: false, message };
		}
	},

	/** */
	async updateUserById(user_id: number, dataToUpdate: IUpdateUser): Promise<ServiceResponse<IUser>> {
		try {
			const data = await fetchAPI.PUT<IUser>(`${SERVICE_ENDPOINT}/${user_id}`, dataToUpdate);
			return data;
		} catch (error: unknown) {
			const message = error instanceof Error ? error.message : "Unknown error";
			return { success: false, message };
		}
	},

	/** */
	async deleteUserById(user_id: number): Promise<ServiceResponse<IUser>> {
		try {
			const data = await fetchAPI.DELETE<IUser>(`${SERVICE_ENDPOINT}/${user_id}`);
			return data;
		} catch (error: unknown) {
			const message = error instanceof Error ? error.message : "Unknown error";
			return { success: false, message };
		}
	},

	/** */
	async getUsers(paramsObj: Partial<IGetUser> = {}): Promise<ServiceResponse<IUser[]>> {
		try {
			const queryParams = new URLSearchParams();
			Object.entries(paramsObj).forEach(([key, value]) => {
				if (value !== undefined) {
					queryParams.append(`filter[${key}]`, String(value));
				}
			});

			const data = await fetchAPI.GET<IUser[]>(`${SERVICE_ENDPOINT}?${queryParams.toString()}`);
			return data;
		} catch (error: unknown) {
			const message = error instanceof Error ? error.message : "Unknown error";
			return { success: false, message };
		}
	},
};
