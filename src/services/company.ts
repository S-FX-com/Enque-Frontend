import { AppConfigs } from "@/configs";
import { fetchAPI } from "@/lib/fetch-api";
import { ServiceResponse } from "@/typescript";
import { ICompany, ICreateCompany, IGetCompany, IUpdateCompany } from "@/typescript/company";

/** Service endpoint */
const SERVICE_ENDPOINT = `${AppConfigs.api}/companies`;

export const companyService = {
	/** */
	async getCompany(paramsObj: ICompany): Promise<ServiceResponse<ICompany>> {
		try {
			const queryParams = new URLSearchParams();
			Object.entries(paramsObj).forEach(([key, value]) => {
				if (value !== undefined) {
					queryParams.append(`filter[${key}]`, String(value));
				}
			});

			const data = await fetchAPI.GET<ICompany[]>(`${SERVICE_ENDPOINT}?${queryParams.toString()}`);
			if (data.success && data.data && data.data.length > 0) return { success: true, data: data.data[0] };

			return { success: false, message: "Company not found" };
		} catch (error: unknown) {
			const message = error instanceof Error ? error.message : "Unknown error";
			return { success: false, message };
		}
	},

	/** */
	async createCompany(dataToCreate: ICreateCompany): Promise<ServiceResponse<ICompany>> {
		try {
			const data = await fetchAPI.POST<ICompany>(`${SERVICE_ENDPOINT}`, dataToCreate);
			return data;
		} catch (error: unknown) {
			const message = error instanceof Error ? error.message : "Unknown error";
			return { success: false, message };
		}
	},

	/** */
	async updateCompanyById(company_id: number, dataToUpdate: IUpdateCompany): Promise<ServiceResponse<ICompany>> {
		try {
			const data = await fetchAPI.PUT<ICompany>(`${SERVICE_ENDPOINT}/${company_id}`, dataToUpdate);
			return data;
		} catch (error: unknown) {
			const message = error instanceof Error ? error.message : "Unknown error";
			return { success: false, message };
		}
	},

	/** */
	async deleteCompanyById(company_id: number): Promise<ServiceResponse<ICompany>> {
		try {
			const data = await fetchAPI.DELETE<ICompany>(`${SERVICE_ENDPOINT}/${company_id}`);
			return data;
		} catch (error: unknown) {
			const message = error instanceof Error ? error.message : "Unknown error";
			return { success: false, message };
		}
	},

	/** */
	async getCompanies(paramsObj: Partial<IGetCompany>): Promise<ServiceResponse<ICompany[]>> {
		try {
			const queryParams = new URLSearchParams();
			Object.entries(paramsObj).forEach(([key, value]) => {
				if (value !== undefined) {
					queryParams.append(`filter[${key}]`, String(value));
				}
			});

			const data = await fetchAPI.GET<ICompany[]>(`${SERVICE_ENDPOINT}?${queryParams.toString()}`);
			return data;
		} catch (error: unknown) {
			const message = error instanceof Error ? error.message : "Unknown error";
			return { success: false, message };
		}
	},
};
