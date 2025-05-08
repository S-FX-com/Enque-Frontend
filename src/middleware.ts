import { NextRequest, NextResponse } from 'next/server';
import { AppConfigs } from '@/configs';

// Make the middleware async to use await for fetch
export async function middleware(request: NextRequest) {
  const url = request.nextUrl;
  const hostname = request.headers.get('host') || '';
  const pathname = url.pathname;

  // Extract potential subdomain
  const subdomainMatch = hostname.match(`^(.*)\\.${AppConfigs.domain.replace('.', '\\.')}`);
  const subdomain = subdomainMatch ? subdomainMatch[1] : null;

  // Check if we are on the base URL or a subdomain
  const isBaseUrl = hostname === AppConfigs.baseUrl;
  const isSubdomain = subdomain !== null && subdomain !== 'app'; // Ensure 'app' is not treated as a workspace subdomain

  // If on a subdomain, verify its existence before proceeding
  if (isSubdomain) {
    console.log(`Detected subdomain: ${subdomain}`);
    const workspaceCheckUrl = `${AppConfigs.api}/workspaces/subdomain/${subdomain}`;

    try {
      const response = await fetch(workspaceCheckUrl, { method: 'GET' });
      console.log(`Workspace check for ${subdomain} status: ${response.status}`);

      if (!response.ok) {
        // If workspace doesn't exist (e.g., 404), redirect to base URL with an error
        if (response.status === 404) {
          const redirectUrl = new URL(request.url);
          redirectUrl.hostname = AppConfigs.baseUrl; // Redirect to app.enque.cc
          redirectUrl.pathname = '/'; // Go to the root page
          redirectUrl.searchParams.set('error', 'invalid_subdomain');
          redirectUrl.searchParams.set('subdomain', subdomain); // Pass subdomain for potential display
          console.log(`Redirecting invalid subdomain ${subdomain} to ${redirectUrl.toString()}`);
          return NextResponse.redirect(redirectUrl);
        }
        // Handle other potential errors if needed, otherwise let it pass for now
      }

      // Workspace exists, proceed with subdomain logic
      // If at the root of a VALID subdomain, redirect to its signin page
      if (pathname === '/') {
        console.log(`Redirecting root of valid subdomain ${subdomain} to /signin`);
        return NextResponse.redirect(new URL('/signin', request.url));
      }
    } catch (error) {
      console.error(`Error checking workspace ${subdomain}:`, error);
      // Optional: Redirect to an error page or the base URL on fetch failure
      const errorRedirectUrl = new URL(request.url);
      errorRedirectUrl.hostname = AppConfigs.baseUrl;
      errorRedirectUrl.pathname = '/';
      errorRedirectUrl.searchParams.set('error', 'workspace_check_failed');
      return NextResponse.redirect(errorRedirectUrl);
    }
  } else if (isBaseUrl && pathname === '/') {
    // If on the base URL root (app.enque.cc/), maybe redirect to workspace selection or a landing page?
    // For now, just let it pass to the default page handler for app.enque.cc/
    console.log('On base URL root, allowing request.');
  }

  // Allow other requests (e.g., specific pages on valid subdomains, base URL pages) to continue
  return NextResponse.next();
}

// Configure the routes to which the middleware will be applied
// Keep the existing matcher
export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * 1. Static files (/_next/, /static/, etc.)
     * 2. Image files (/favicon.ico, etc.)
     * 3. API routes (/api/)
     */
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
};
