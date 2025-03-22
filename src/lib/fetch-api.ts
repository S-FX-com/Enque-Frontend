import { authService } from "@/services/auth";
import { ServiceResponse } from "@/typescript";

type IFetchAPI =
	| {
			method: "POST" | "PUT" | "DELETE";
			url: string;
			headers: HeadersInit;
			body?: object | URLSearchParams;
	  }
	| {
			method: "GET";
			url: string;
			headers: HeadersInit;
	  };

/** Handle requests */
async function handleFetchAPI<T>(request: IFetchAPI): Promise<ServiceResponse<T>> {
	try {
		const response = await fetch(request.url, {
			method: request.method,
			headers: request.headers,
			...(request.method !== "GET" && request.body
				? { body: request.body instanceof URLSearchParams ? request.body.toString() : JSON.stringify(request.body) }
				: {}),
		});

		const data = await response.json();
		if (!response.ok) {
			if (typeof data.detail === "string") return { success: false, message: data.detail };
			else throw new Error(`${response.status} - ${response.statusText}`);
		}

		return { success: true, data };
	} catch (error: unknown) {
		const message = error instanceof Error ? error.message : "Unknown error";
		console.error("Fetch Error:", message);
		return { success: false, message };
	}
}

/** Get authentication header */
async function getAuthorizationHeader(): Promise<string> {
	const result = await authService.createAuthHeader();
	if (!result.success) return "";
	return result.data as string;
}

export const fetchAPI = {
	/** GET request */
	async GET<T>(url: string) {
		return handleFetchAPI<T>({
			method: "GET",
			url,
			headers: {
				"Content-Type": "application/json",
				Authorization: await getAuthorizationHeader(),
			},
		});
	},

	/** POST request */
	async POST<T>(url: string, body: object | URLSearchParams, isFormUrlEncoded = false) {
		return handleFetchAPI<T>({
			method: "POST",
			url,
			body,
			headers: {
				"Content-Type": isFormUrlEncoded ? "application/x-www-form-urlencoded" : "application/json",
				Authorization: await getAuthorizationHeader(),
			},
		});
	},

	/** PUT request */
	async PUT<T>(url: string, body: object | URLSearchParams, isFormUrlEncoded = false) {
		return handleFetchAPI<T>({
			method: "PUT",
			url,
			body,
			headers: {
				"Content-Type": isFormUrlEncoded ? "application/x-www-form-urlencoded" : "application/json",
				Authorization: await getAuthorizationHeader(),
			},
		});
	},

	/** DELETE request */
	async DELETE<T>(url: string, body: object) {
		return handleFetchAPI<T>({
			method: "DELETE",
			url,
			body,
			headers: {
				"Content-Type": "application/json",
				Authorization: await getAuthorizationHeader(),
			},
		});
	},
};
