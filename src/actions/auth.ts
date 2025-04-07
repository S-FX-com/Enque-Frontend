"use server";

import { AppConfigs, PlatformConfigs } from "@/configs";
import { createCookie, deleteCookie, getCookie } from "@/lib/cookies";
import { getLocalSubdomainByHost } from "@/lib/utils";
import { authService } from "@/services/auth";
import { FormState, ServiceResponse } from "@/typescript";
import { IAgent } from "@/typescript/agent";
import { ICreateAuth } from "@/typescript/auth";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";

export type AuthFormState = FormState<ICreateAuth>;

/** Create authentication - Schema */
const AuthSchema = z.object({
	email: z.string().email("Email address is invalid"),
	password: z.string().min(8, "Password must be at least 8 characters long"),
});

/** Create authentication - Action */
export async function Auth(prevState: AuthFormState, formData: FormData): Promise<AuthFormState> {
	const email = formData.get("email") as string;
	const password = formData.get("password") as string;

	const values = { email, password };

	const validation = AuthSchema.safeParse(values);
	if (!validation.success) return { success: false, errors: validation.error.flatten().fieldErrors, values };

	const response = await authService.createAuth(values);
	if (!response.success)
		return {
			success: false,
			message: response.message as string,
			values,
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

/** Get authentication - Action */
export async function GetAuth(): Promise<ServiceResponse<IAgent>> {
	const headersList = await headers();
	const host = headersList.get("host");

	const accessToken = await getCookie(AppConfigs.cookies.accessToken.name);
	if (!accessToken) return redirect(PlatformConfigs.url(getLocalSubdomainByHost(host as string)) + "/signin");

	const response = await authService.getCurrentAuth();
	if (!response.success) return redirect(PlatformConfigs.url(getLocalSubdomainByHost(host as string)) + "/signin");

	return response;
}

/** Delete authentication - Action */
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
