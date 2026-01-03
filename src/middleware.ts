import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { LRUCache } from 'lru-cache';
import { AppConfigs } from '@/configs';

// ⚡ OPTIMIZADO: LRU Cache con límite de tamaño y TTL automático
// Previene memory leaks por crecimiento ilimitado de subdomains
const workspaceCache = new LRUCache<string, boolean>({
  max: 100, // Máximo 100 workspaces en cache (~10-20KB)
  ttl: 5 * 60 * 1000, // 5 minutos - TTL automático
  updateAgeOnGet: true, // Renovar TTL en cada acceso
});

function isWorkspaceCacheValid(subdomain: string): boolean | null {
  const cached = workspaceCache.get(subdomain);
  return cached !== undefined ? cached : null;
}

function setCacheWorkspace(subdomain: string, valid: boolean): void {
  workspaceCache.set(subdomain, valid);
}

// Dominios base válidos (no son workspaces)
const BASE_DOMAINS = [
  'old.enque.cc',
  'enque-production.up.railway.app',
];

// Make the middleware async to use await for fetch
export async function middleware(request: NextRequest) {
  const hostname = request.headers.get('host') || '';
  const pathname = request.nextUrl.pathname;

  // Si es un dominio base, no es un subdomain de workspace
  if (BASE_DOMAINS.includes(hostname)) {
    return NextResponse.next();
  }

  // Check if it's a subdomain request
  const isSubdomain = hostname.endsWith('.enque.cc') || hostname.endsWith('.old.enque.cc') || hostname.endsWith('.up.railway.app');

  if (isSubdomain) {
    // Determinar qué dominio base usar para redirecciones
    let baseDomain = 'old.enque.cc';
    let domainSuffix = '.enque.cc';

    if (hostname.endsWith('.old.enque.cc')) {
      baseDomain = 'old.enque.cc';
      domainSuffix = '.old.enque.cc';
    } else if (hostname.endsWith('.up.railway.app')) {
      baseDomain = 'enque-production.up.railway.app';
      domainSuffix = '.up.railway.app';
    }

    const subdomain = hostname.replace(domainSuffix, '');

    // Check cache first
    const cachedResult = isWorkspaceCacheValid(subdomain);

    if (cachedResult === false) {
      // Cached as invalid - redirect immediately
      const redirectUrl = new URL('/', `https://${baseDomain}`);
      redirectUrl.searchParams.set('error', 'workspace_not_found');
      redirectUrl.searchParams.set('subdomain', subdomain);
      return NextResponse.redirect(redirectUrl);
    }

    if (cachedResult === null) {
      // Not cached or expired - validate
      const workspaceCheckUrl = `${AppConfigs.api}/workspaces/by-subdomain/${subdomain}`;

      try {
        const response = await fetch(workspaceCheckUrl, { method: 'GET' });

        if (!response.ok && response.status === 404) {
          // Cache as invalid and redirect
          setCacheWorkspace(subdomain, false);
          const redirectUrl = new URL('/', `https://${baseDomain}`);
          redirectUrl.searchParams.set('error', 'workspace_not_found');
          redirectUrl.searchParams.set('subdomain', subdomain);
          return NextResponse.redirect(redirectUrl);
        }

        // Cache as valid
        setCacheWorkspace(subdomain, true);
      } catch {
        const errorRedirectUrl = new URL('/', `https://${baseDomain}`);
        errorRedirectUrl.searchParams.set('error', 'workspace_check_failed');
        return NextResponse.redirect(errorRedirectUrl);
      }
    }

    // Workspace exists (cached or validated), if at root, redirect to signin
    if (pathname === '/') {
      return NextResponse.redirect(new URL('/signin', request.url));
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
