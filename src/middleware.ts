import { type NextRequest, NextResponse } from "next/server";
import { AppConfigs, PlatformConfigs } from "./configs";
import { getLocalSubdomainByHost } from "./lib/utils";
import { authService } from "./services/auth";
import { workspaceService } from "./services/workspace";

// Routes excluded from authorization
const authPaths = ["/signin", "/signup"];

/** Function to exclude routes from authentication */
function isAuthPath(path: string): boolean {
	return authPaths.some((prefix) => path.startsWith(prefix));
}

/** Main middleware */
export async function middleware(request: NextRequest) {
	const { headers, nextUrl } = request;
	const host = headers.get("host");
	const path = nextUrl.pathname;
	let rewritePath = "";

	// Condition for path overwrite
	if (host?.startsWith("www") || host?.startsWith(AppConfigs.host)) rewritePath = `/main${path}`;
	else rewritePath = `/${host}${path}`;

	// Handle `www` requests
	if (host?.startsWith("www") || host?.startsWith(AppConfigs.host)) {
		if (isAuthPath(path)) return NextResponse.redirect(PlatformConfigs.url() + "/workspace");
	} else {
		// Verify workspace
		const currentWorkspace = await workspaceService.getWorkspace({ local_subdomain: getLocalSubdomainByHost(host as string) });
		if (!currentWorkspace.success || !currentWorkspace.data) return NextResponse.redirect(PlatformConfigs.url() + "/workspace");

		// Get cookie access token
		const accessToken = request.cookies.get(AppConfigs.cookies.accessToken.name)?.value;

		if (isAuthPath(path)) {
			if (accessToken) return NextResponse.redirect(PlatformConfigs.url(getLocalSubdomainByHost(host as string)));
		} else {
			if (!accessToken) return NextResponse.redirect(PlatformConfigs.url(getLocalSubdomainByHost(host as string)) + "/signin");

			const currentAuth = await authService.getCurrentAuth();
			if (currentAuth.success && currentAuth.data) {
				if (currentWorkspace.data.id != currentAuth.data.workspace.id) {
					const response = NextResponse.redirect(PlatformConfigs.url(getLocalSubdomainByHost(host as string)) + "/signin");
					response.cookies.delete({ name: AppConfigs.cookies.accessToken.name, domain: `.${AppConfigs.hostWithoutPort}` });
					return response;
				}
			} else {
				const response = NextResponse.redirect(PlatformConfigs.url(getLocalSubdomainByHost(host as string)) + "/signin");
				response.cookies.delete({ name: AppConfigs.cookies.accessToken.name, domain: `.${AppConfigs.hostWithoutPort}` });
				return response;
			}
		}
	}

	// Overwrite path
	nextUrl.pathname = rewritePath;
	return NextResponse.rewrite(nextUrl);
}

// Configuration of the main middleware
export const config = {
	matcher: ["/((?!_next|static|.*\\.).*)"],
};
