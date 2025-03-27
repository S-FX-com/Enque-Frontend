"use server";

import { AppConfigs, PlatformConfigs } from "@/configs";
import { createCookie, deleteCookie, getCookie } from "@/lib/cookies";
import { getLocalSubdomainByHost } from "@/lib/utils";
import { authService } from "@/services/auth";
import { ServiceResponse } from "@/typescript";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";

export type AuthFormState = {
	success?: boolean;
	errors?: {
		email?: string[];
		password?: string[];
		_form?: string[];
	};
	message?: string;
};

/** Validation scheme for user authentication */
const AuthSchema = z.object({
	email: z.string().email("Email address is invalid"),
	password: z.string().min(8, "Password must be at least 8 characters long"),
});

/** Create authentication */
export async function Auth(prevState: AuthFormState, formData: FormData) {
	const email = formData.get("email") as string;
	const password = formData.get("password") as string;

	const validation = AuthSchema.safeParse({ email, password });
	if (!validation.success) return { success: false, errors: validation.error.flatten().fieldErrors };

	const response = await authService.createAuth({ email, password });
	if (!response.success)
		return {
			errors: {
				_form: [response.message],
			},
		};

	await createCookie({
		name: AppConfigs.cookies.accessToken.name,
		value: response.data?.access_token as string,
		secure: process.env.NODE_ENV === "production",
		expires: new Date(response.data?.expires_at as string),
		domain: "." + AppConfigs.hostWithoutPort,
	});

	const headersList = await headers();
	const host = headersList.get("host");

	redirect(PlatformConfigs.url(getLocalSubdomainByHost(host as string)));
}

/** Get authentication */
export async function GetAuth(): Promise<ServiceResponse<any>> {
	const headersList = await headers();
	const host = headersList.get("host");

	const accessToken = await getCookie(AppConfigs.cookies.accessToken.name);
	if (!accessToken) return redirect(PlatformConfigs.url(getLocalSubdomainByHost(host as string)) + "/signin");

	const response = await authService.getCurrentAuth();
	if (!response.success) return redirect(PlatformConfigs.url(getLocalSubdomainByHost(host as string)) + "/signin");

	return response;
}

/** Delete authentication */
export async function DeleteAuth() {
	const headersList = await headers();
	const host = headersList.get("host");

	const accessToken = await getCookie(AppConfigs.cookies.accessToken.name);
	if (!accessToken) return redirect(PlatformConfigs.url(getLocalSubdomainByHost(host as string)) + "/signin");

	const response = await authService.deleteCurrentAuth();
	if (!response.success) console.error(response);

	await deleteCookie({
		name: AppConfigs.cookies.accessToken.name as string,
		domain: "." + AppConfigs.hostWithoutPort,
	});

	return redirect(PlatformConfigs.url(getLocalSubdomainByHost(host as string)) + "/signin");
}
