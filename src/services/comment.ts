import { AppConfigs } from "@/configs";
import { fetchAPI } from "@/lib/fetch-api";
import { ServiceResponse } from "@/typescript";
import { IComment, ICreateComment, IUpdateComment } from "@/typescript/comment";

/** Service endpoint */
const SERVICE_ENDPOINT = `${AppConfigs.api}/comments`;

export const commentService = {
	/** */
	async getComment(paramsObj: IComment): Promise<ServiceResponse<IComment>> {
		try {
			const queryParams = new URLSearchParams();
			Object.entries(paramsObj).forEach(([key, value]) => {
				if (value !== undefined && value !== null) {
					queryParams.append(`filter[${key}]`, String(value));
				}
			});

			const data = await fetchAPI.GET<IComment[]>(`${SERVICE_ENDPOINT}?${queryParams.toString()}`);
			if (data.success && data.data && data.data.length > 0) return { success: true, data: data.data[0] };

			return { success: false, message: "Comment not found" };
		} catch (error: unknown) {
			const message = error instanceof Error ? error.message : "Unknown error";
			return { success: false, message };
		}
	},

	/** */
	async createComment(dataToCreate: ICreateComment): Promise<ServiceResponse<IComment>> {
		try {
			const data = await fetchAPI.POST<IComment>(`${SERVICE_ENDPOINT}`, dataToCreate);
			return data;
		} catch (error: unknown) {
			const message = error instanceof Error ? error.message : "Unknown error";
			return { success: false, message };
		}
	},

	/** */
	async updateCommentById(comment_id: number, dataToUpdate: IUpdateComment): Promise<ServiceResponse<IComment>> {
		try {
			const data = await fetchAPI.PUT<IComment>(`${SERVICE_ENDPOINT}/${comment_id}`, dataToUpdate);
			return data;
		} catch (error: unknown) {
			const message = error instanceof Error ? error.message : "Unknown error";
			return { success: false, message };
		}
	},

	/** */
	async deleteCommentById(comment_id: number): Promise<ServiceResponse<IComment>> {
		try {
			const data = await fetchAPI.DELETE<IComment>(`${SERVICE_ENDPOINT}/${comment_id}`);
			return data;
		} catch (error: unknown) {
			const message = error instanceof Error ? error.message : "Unknown error";
			return { success: false, message };
		}
	},

	/** */
	async getComments(paramsObj: IComment): Promise<ServiceResponse<IComment[]>> {
		try {
			const queryParams = new URLSearchParams();
			Object.entries(paramsObj).forEach(([key, value]) => {
				if (value !== undefined && value !== null) {
					queryParams.append(`filter[${key}]`, String(value));
				}
			});

			const data = await fetchAPI.GET<IComment[]>(`${SERVICE_ENDPOINT}?${queryParams.toString()}`);
			return data;
		} catch (error: unknown) {
			const message = error instanceof Error ? error.message : "Unknown error";
			return { success: false, message };
		}
	},
};
