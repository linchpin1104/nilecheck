import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { jwtVerify } from 'jose';

// JWT 시크릿 키
const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || 'nile-check-default-secret-key-for-development'
);

// 토큰 쿠키 이름
const TOKEN_COOKIE_NAME = 'nile-check-auth';

export async function middleware(request: NextRequest) {
  // Get the pathname of the request
  const path = request.nextUrl.pathname;
  
  // Define public paths that don't require authentication
  const isPublicPath = path === '/login' || 
                      path === '/register' || 
                      path === '/forgot-password' || 
                      path === '/debug-login' || 
                      path === '/test-auth' || 
                      path === '/direct-login' ||
                      path.startsWith('/api/auth/') ||
                      path.startsWith('/api/meals') ||  // API 엔드포인트 인증 제외 (테스트용)
                      path.startsWith('/api/sleep') ||  // API 엔드포인트 인증 제외 (테스트용)
                      path.startsWith('/api/checkins') ||  // API 엔드포인트 인증 제외 (테스트용)
                      path.startsWith('/api/clear-test-data');  // 테스트 데이터 정리 API
  
  // Special handling for the home page - redirect to log-activity
  if (path === '/') {
    return NextResponse.redirect(new URL('/log-activity', request.url));
  }
  
  // Allow access to public paths without authentication check
  if (isPublicPath) {
    return NextResponse.next();
  }
  
  // Get authentication token from cookies
  const token = request.cookies.get(TOKEN_COOKIE_NAME)?.value;
  let isAuthenticated = false;
  
  // Verify JWT token if it exists
  if (token) {
    try {
      const verified = await jwtVerify(token, JWT_SECRET);
      isAuthenticated = !!verified.payload.user;
    } catch (error) {
      console.error('Invalid auth token:', error);
    }
  }
  
  // If not authenticated and trying to access a protected route, redirect to login
  if (!isAuthenticated) {
    // Store the original path for redirecting back after login
    const params = new URLSearchParams();
    params.set('callbackUrl', path);
    
    return NextResponse.redirect(new URL(`/login?${params.toString()}`, request.url));
  }
  
  // Otherwise, proceed with the request
  return NextResponse.next();
}

// Specify which paths this middleware should run on
export const config = {
  matcher: [
    '/((?!api/auth|_next/static|_next/image|favicon.ico|.*\\.svg).*)',
  ],
}; 