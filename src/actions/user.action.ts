"use server";

import { PlatformConfigs } from "@/configs";
import { fetchAPI } from "@/lib/fetch-api";
import { redirect } from "next/navigation";
import { z } from "zod";

export type CreateUserFormState = {
	success?: boolean;
	errors?: {
		name?: string[];
		email?: string[];
		password?: string[];
		confirmPassword?: string[];
		_form?: string[];
	};
	message?: string;
};

/** Endpoint en la API */
const API_ENDPOINT = `${PlatformConfigs.url("api")}/user`;

/** Esquema de validación para crear un usuario */
const CreateUserSchema = z
	.object({
		name: z.string().min(3, "El nombre debe tener al menos 3 caracteres"),
		email: z.string().email("El correo electrónico no es válido"),
		password: z.string().min(8, "La contraseña debe tener al menos 8 caracteres"),
		confirmPassword: z.string().min(8, "La confirmación de contraseña debe tener al menos 8 caracteres"),
	})
	.refine((data) => data.password === data.confirmPassword, {
		message: "Las contraseñas no coinciden",
		path: ["confirmPassword"],
	});

/** Crear un usuario */
export async function CreateUser(prevState: CreateUserFormState, formData: FormData) {
	const name = formData.get("name");
	const email = formData.get("email");
	const password = formData.get("password");
	const confirmPassword = formData.get("confirmPassword");

	const validation = CreateUserSchema.safeParse({ name, email, password, confirmPassword });
	if (!validation.success) return { success: false, errors: validation.error.flatten().fieldErrors };

	const response = await fetchAPI.POST<any>(API_ENDPOINT, { name, email, password });
	if (!response.success)
		return {
			errors: {
				_form: [response.message],
			},
		};

	redirect(PlatformConfigs.url() + "/signin");
}
