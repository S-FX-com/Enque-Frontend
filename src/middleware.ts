import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { AppConfigs } from '@/configs';

// Make the middleware async to use await for fetch
export async function middleware(request: NextRequest) {
  const hostname = request.headers.get('host') || '';
  const pathname = request.nextUrl.pathname;
  
  // Check if it's a subdomain request
  const isSubdomain = hostname !== AppConfigs.baseUrl && hostname.endsWith(AppConfigs.domain);
  
  if (isSubdomain) {
    const subdomain = hostname.replace(AppConfigs.domain, '');
    console.log(`Detected subdomain: ${subdomain}`);
    
    // Validate the workspace exists
    const workspaceCheckUrl = `${AppConfigs.api}/workspaces/by-subdomain/${subdomain}`;
    
    try {
      const response = await fetch(workspaceCheckUrl, { method: 'GET' });
      console.log(`Workspace check for ${subdomain} status: ${response.status}`);

      if (!response.ok) {
        // If workspace doesn't exist, redirect to base URL with error
        if (response.status === 404) {
          const redirectUrl = new URL('/', `https://${AppConfigs.baseUrl}`);
          redirectUrl.searchParams.set('error', 'workspace_not_found');
          redirectUrl.searchParams.set('subdomain', subdomain);
          console.log(`Redirecting invalid subdomain ${subdomain} to ${redirectUrl.toString()}`);
          return NextResponse.redirect(redirectUrl);
        }
      }

      // Workspace exists, if at root, redirect to signin
      if (pathname === '/') {
        console.log(`Redirecting root of valid subdomain ${subdomain} to /signin`);
        return NextResponse.redirect(new URL('/signin', request.url));
      }
    } catch (error) {
      console.error(`Error checking workspace ${subdomain}:`, error);
      const errorRedirectUrl = new URL('/', `https://${AppConfigs.baseUrl}`);
      errorRedirectUrl.searchParams.set('error', 'workspace_check_failed');
      return NextResponse.redirect(errorRedirectUrl);
    }
  }

  return NextResponse.next();
}

// Configure the routes to which the middleware will be applied
// Keep the existing matcher
export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
};
