import { type NextRequest, NextResponse } from "next/server";
import { AppConfigs, PlatformConfigs } from "./configs";
import { getLocalSubdomainByHost } from "./lib/utils";

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
		// Silence is gold
	} else {
		// Get cookie access token
		const accessToken = request.cookies.get(AppConfigs.cookies.accessToken.name)?.value;

		if (isAuthPath(path)) {
			if (accessToken) return NextResponse.redirect(PlatformConfigs.url(getLocalSubdomainByHost(host as string)));
		} else {
			if (!accessToken) return NextResponse.redirect(PlatformConfigs.url(getLocalSubdomainByHost(host as string)) + "/signin");
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
