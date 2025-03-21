import { type NextRequest, NextResponse } from "next/server";
import { AppConfigs, PlatformConfigs } from "./configs";

// Rutas Excluídas de Autorización
const authPaths = ["/signin", "/signup"];

/** Función para excluír rutas de la autenticación */
function isAuthPath(path: string): boolean {
	return authPaths.some((prefix) => path.startsWith(prefix));
}

/** Middleware principal */
export async function middleware(request: NextRequest) {
	const { headers, nextUrl } = request;
	const host = headers.get("host");
	const path = nextUrl.pathname;
	let rewritePath = "";

	// Condición para sobreescribir el path
	if (host?.startsWith("www") || host?.startsWith(AppConfigs.host)) rewritePath = `/main${path}`;
	else rewritePath = `/${host}${path}`;

	// Manejar solicitudes de www
	if (host?.startsWith("www") || host?.startsWith(AppConfigs.host)) {
	} else {
		// Obtener token de acceso de la Cookie
		const accessToken = request.cookies.get(AppConfigs.cookies.accessToken.name)?.value;

		if (isAuthPath(path)) {
			if (accessToken) return NextResponse.redirect(PlatformConfigs.url("app"));
		} else {
			if (!accessToken) return NextResponse.redirect(PlatformConfigs.url("app") + "/signin");
		}
	}

	// Sobreescribir el path
	nextUrl.pathname = rewritePath;
	return NextResponse.rewrite(nextUrl);
}

// Configuración del middleware principal
export const config = {
	matcher: ["/((?!_next|static|.*\\.).*)"],
};
