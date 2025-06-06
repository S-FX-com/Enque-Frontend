import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { AppConfigs } from '@/configs';

// Types
interface CacheEntry {
  valid: boolean;
  timestamp: number;
}

interface WorkspaceCache {
  data: Map<string, CacheEntry>;
  lastCleanup: number;
}

// Configuration
const CACHE_CONFIG = {
  TTL: 5 * 60 * 1000, // 5 minutes
  MAX_ENTRIES: 1000, // Prevent memory leaks
  CLEANUP_INTERVAL: 10 * 60 * 1000, // 10 minutes
} as const;

// Enhanced cache with automatic cleanup
const workspaceCache: WorkspaceCache = {
  data: new Map<string, CacheEntry>(),
  lastCleanup: Date.now(),
};

// Cache utilities
function cleanupExpiredEntries(): void {
  const now = Date.now();
  const expiredKeys: string[] = [];

  for (const [key, entry] of workspaceCache.data.entries()) {
    if (now - entry.timestamp > CACHE_CONFIG.TTL) {
      expiredKeys.push(key);
    }
  }

  expiredKeys.forEach(key => workspaceCache.data.delete(key));
  workspaceCache.lastCleanup = now;
}

function shouldCleanupCache(): boolean {
  return (
    Date.now() - workspaceCache.lastCleanup > CACHE_CONFIG.CLEANUP_INTERVAL ||
    workspaceCache.data.size > CACHE_CONFIG.MAX_ENTRIES
  );
}

function getCachedWorkspace(subdomain: string): boolean | null {
  // Periodic cleanup
  if (shouldCleanupCache()) {
    cleanupExpiredEntries();
  }

  const cached = workspaceCache.data.get(subdomain);
  if (!cached) return null;

  const isExpired = Date.now() - cached.timestamp > CACHE_CONFIG.TTL;
  if (isExpired) {
    workspaceCache.data.delete(subdomain);
    return null;
  }

  return cached.valid;
}

function setCachedWorkspace(subdomain: string, valid: boolean): void {
  // Prevent cache from growing too large
  if (workspaceCache.data.size >= CACHE_CONFIG.MAX_ENTRIES) {
    cleanupExpiredEntries();
  }

  workspaceCache.data.set(subdomain, {
    valid,
    timestamp: Date.now(),
  });
}

// URL builders (avoid repeated URL construction)
function buildRedirectUrl(error: string, subdomain?: string): URL {
  const url = new URL('/', `https://${AppConfigs.baseUrl}`);
  url.searchParams.set('error', error);
  if (subdomain) {
    url.searchParams.set('subdomain', subdomain);
  }
  return url;
}

// Workspace validation
async function validateWorkspace(subdomain: string): Promise<boolean> {
  const workspaceCheckUrl = `${AppConfigs.api}/workspaces/by-subdomain/${subdomain}`;

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000); // 5s timeout

    const response = await fetch(workspaceCheckUrl, {
      method: 'GET',
      signal: controller.signal,
      headers: {
        'User-Agent': 'Workspace-Validator/1.0',
      },
    });

    clearTimeout(timeoutId);

    if (response.status === 404) {
      return false;
    }

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    return true;
  } catch (error) {
    // Log error in development
    if (process.env.NODE_ENV === 'development') {
      console.error(`Workspace validation failed for ${subdomain}:`, error);
    }

    // Treat network errors as invalid workspace to prevent infinite loops
    return false;
  }
}

// Main middleware function
export async function middleware(request: NextRequest): Promise<NextResponse> {
  const hostname = request.headers.get('host') || '';
  const pathname = request.nextUrl.pathname;

  // Early return for non-subdomain requests
  if (hostname === AppConfigs.baseUrl || !hostname.endsWith(AppConfigs.domain)) {
    return NextResponse.next();
  }

  // Extract subdomain
  const subdomain = hostname.replace(AppConfigs.domain, '').replace(/^\./, '');

  // Validate subdomain format
  if (!subdomain || subdomain.includes('.')) {
    return NextResponse.redirect(buildRedirectUrl('invalid_subdomain', subdomain));
  }

  // Check cache first
  const cachedResult = getCachedWorkspace(subdomain);

  if (cachedResult === false) {
    // Cached as invalid - redirect immediately
    return NextResponse.redirect(buildRedirectUrl('workspace_not_found', subdomain));
  }

  // Validate workspace if not cached or expired
  if (cachedResult === null) {
    const isValid = await validateWorkspace(subdomain);
    setCachedWorkspace(subdomain, isValid);

    if (!isValid) {
      return NextResponse.redirect(buildRedirectUrl('workspace_not_found', subdomain));
    }
  }

  // Workspace exists - handle root path redirect
  if (pathname === '/') {
    return NextResponse.redirect(new URL('/signin', request.url));
  }

  // Add custom headers for debugging (optional)
  const response = NextResponse.next();
  if (process.env.NODE_ENV === 'development') {
    response.headers.set('X-Workspace-Subdomain', subdomain);
    response.headers.set('X-Cache-Hit', cachedResult !== null ? 'true' : 'false');
  }

  return response;
}

// Optimized matcher - more specific patterns
export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico, robots.txt, sitemap.xml (static files)
     * - .well-known (security files)
     */
    '/((?!api|_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml|\\.well-known).*)',
  ],
};
