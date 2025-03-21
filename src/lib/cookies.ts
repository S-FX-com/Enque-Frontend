"use server";

import { ResponseCookie } from "next/dist/compiled/@edge-runtime/cookies";
import { cookies } from "next/headers";

/** Crear cookie */
export async function createCookie(cookieData: ResponseCookie) {
	const cookieStore = await cookies();
	return cookieStore.set(cookieData);
}

/** Obtener cookie */
export async function getCookie(cookieName: string) {
	const cookieStore = await cookies();
	return cookieStore.get(cookieName)?.value;
}

/** Eliminar cookie */
export async function deleteCookie(cookieData: Omit<ResponseCookie, "value" | "expires">) {
	const cookieStore = await cookies();
	return cookieStore.delete(cookieData);
}
