
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Define paths that are public (don't require authentication)
const PUBLIC_FILE = /\.(.*)$/; // Allow static files
const PUBLIC_PATHS = ['/about', '/login', '/signup', '/log-activity']; // Added /log-activity

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const sessionCookie = request.cookies.get('firebaseIdToken'); // Example cookie name, adjust if Firebase SDK uses a different one or if you manage it manually

  // Allow requests for static files and API routes (which might have their own auth)
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/api') ||
    PUBLIC_FILE.test(pathname)
  ) {
    return NextResponse.next();
  }

  const isPublicPath = PUBLIC_PATHS.some(path => pathname === path || pathname.startsWith(path + '/'));

  if (!sessionCookie && !isPublicPath) {
    // If no session and trying to access a protected path, redirect to log-activity
    const logActivityUrl = new URL('/log-activity', request.url);
    // Optional: pass redirect path if you want to return after login, 
    // but for now, just redirecting to log-activity as the main unauthenticated hub.
    // logActivityUrl.searchParams.set('redirect_to', pathname); 
    return NextResponse.redirect(logActivityUrl);
  }

  if (sessionCookie && (pathname === '/login' || pathname === '/signup')) {
    // If session exists and trying to access login/signup, redirect to dashboard
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }
  
  if (pathname === '/') {
     if (sessionCookie) {
        return NextResponse.redirect(new URL('/dashboard', request.url));
     } else {
        return NextResponse.redirect(new URL('/log-activity', request.url)); // Changed from /about
     }
  }

  return NextResponse.next();
}

// See "Matching Paths" below to learn more
export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * Feel free to modify this pattern to fit your needs.
     */
    '/((?!_next/static|_next/image|favicon.ico|api/).*)',
  ],
};

