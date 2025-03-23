import { AppConfigs } from "@/configs";
import { getCookie } from "@/lib/cookies";
import { fetchAPI } from "@/lib/fetch-api";
import { IUser } from "@/typescript/agent";
import { ICreateAuth } from "@/typescript/auth";
import { ServiceResponse } from "@/typescript";

/** Service endpoint */
const SERVICE_ENDPOINT = `${AppConfigs.api}/auth`;

export const authService = {
	/** Create authorization header */
	async createAuthHeader(): Promise<ServiceResponse<any>> {
		try {
			const sessionCookie = await getCookie(AppConfigs.cookies.accessToken.name);
			return { success: true, data: `Bearer ${sessionCookie}` };
		} catch (error: unknown) {
			const message = error instanceof Error ? error.message : "Unknown error";
			return { success: false, message };
		}
	},

	/** */
	async createAuth(dataToCreate: ICreateAuth): Promise<ServiceResponse<IUser>> {
		try {
			const { email, password, companyId } = dataToCreate;

			const formData = new URLSearchParams();
			formData.append("username", email);
			formData.append("password", password);

			const data = await fetchAPI.POST<IUser>(SERVICE_ENDPOINT, formData, true);
			return data;
		} catch (error: unknown) {
			const message = error instanceof Error ? error.message : "Unknown error";
			return { success: false, message };
		}
	},

	/** */
	async getCurrentAuth(): Promise<ServiceResponse<IUser>> {
		try {
			const data = await fetchAPI.GET<IUser>(`${SERVICE_ENDPOINT}/me`);
			return data;
		} catch (error: unknown) {
			const message = error instanceof Error ? error.message : "Unknown error";
			return { success: false, message };
		}
	},

	/** */
	async deleteCurrentAuth() {
		return { success: true };
	},
};
