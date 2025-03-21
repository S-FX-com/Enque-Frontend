"use server";

import { AppConfigs, PlatformConfigs } from "@/configs";
import { createCookie, deleteCookie, getCookie } from "@/lib/cookies";
import { authService } from "@/services/auth";
import { ServiceResponse } from "@/typescript";
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

/** Esquema de validación para autenticar un usuario */
const AuthSchema = z.object({
	email: z.string().email("El correo electrónico no es válido"),
	password: z.string().min(8, "La contraseña debe tener al menos 8 caracteres"),
});

/** Crear autenticación */
export async function Auth(prevState: AuthFormState, formData: FormData) {
	const email = formData.get("email") as string;
	const password = formData.get("password") as string;

	const validation = AuthSchema.safeParse({ email, password });
	if (!validation.success) return { success: false, errors: validation.error.flatten().fieldErrors };

	const response = await authService.createAuth({ email, password, companyId: "sfx" });
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

	redirect(PlatformConfigs.url("app"));
}

/** Obtener autenticación */
export async function GetAuth(): Promise<ServiceResponse<any>> {
	const accessToken = await getCookie(AppConfigs.cookies.accessToken.name);
	if (!accessToken) return redirect(PlatformConfigs.url("app") + "/signin");

	const response = await authService.getCurrentAuth();
	if (!response.success) return redirect(PlatformConfigs.url() + "/signin");

	return response;
}

/** Eliminar autenticación */
export async function DeleteAuth() {
	const accessToken = await getCookie(AppConfigs.cookies.accessToken.name);
	if (!accessToken) return redirect(PlatformConfigs.url("app") + "/signin");

	const response = await authService.deleteCurrentAuth();
	if (!response.success) console.error(response);

	await deleteCookie({
		name: AppConfigs.cookies.accessToken.name as string,
		domain: "." + AppConfigs.hostWithoutPort,
	});

	return redirect(PlatformConfigs.url() + "/signin");
}
