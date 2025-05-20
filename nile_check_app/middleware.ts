import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { jwtVerify } from 'jose';

interface UserPayload {
  id: string;
  [key: string]: string | number | boolean | null | undefined;
}

// JWT 시크릿 키
const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || 'nile-check-default-secret-key-for-development'
);

// 토큰 쿠키 이름
const TOKEN_COOKIE_NAME = 'nile-check-auth';

export async function middleware(request: NextRequest) {
  // Get the pathname of the request
  const path = request.nextUrl.pathname;
  
  // Define public paths that don't require authentication (인증이 필요 없는 공개 경로)
  const isPublicPath = path === '/login' || 
                      path === '/register' || 
                      path === '/forgot-password' || 
                      path === '/debug-login' || 
                      path === '/test-auth' || 
                      path === '/direct-login' ||
                      path.startsWith('/api/auth/');
  
  // Special handling for the home page - redirect to login (홈페이지 리다이렉션 변경)
  if (path === '/') {
    return NextResponse.redirect(new URL('/login', request.url));
  }
  
  // Allow access to public paths without authentication check
  if (isPublicPath) {
    return NextResponse.next();
  }
  
  // Allow access to API endpoints (handled by the API routes themselves)
  if (path.startsWith('/api/')) {
    // API 요청은 각 API 라우트에서 인증 처리
    return NextResponse.next();
  }
  
  // Get authentication token from cookies
  const token = request.cookies.get(TOKEN_COOKIE_NAME)?.value;
  let isAuthenticated = false;
  let userId = '';
  
  // Verify JWT token if it exists
  if (token) {
    try {
      const verified = await jwtVerify(token, JWT_SECRET);
      
      // 사용자 정보 검증 및 추출 개선
      if (verified && verified.payload && verified.payload.user) {
        isAuthenticated = true;
        // 사용자 ID 추출 - 객체 형태로 통일
        const userPayload = verified.payload.user as any;
        userId = userPayload.id || '';
        console.log(`[Middleware] Token verified: user=${userId}, auth=${isAuthenticated}`);
      }
    } catch (error) {
      console.error('[Middleware] Invalid auth token:', error);
    }
  } else {
    console.log('[Middleware] No auth token found in cookies');
  }
  
  // If not authenticated and trying to access any protected route, redirect to login
  if (!isAuthenticated) {
    // Store the original path for redirecting back after login
    const params = new URLSearchParams();
    params.set('callbackUrl', path);
    
    console.log(`[Middleware] Redirecting to login from protected path: ${path}`);
    return NextResponse.redirect(new URL(`/login?${params.toString()}`, request.url));
  }
  
  // Authenticated user - proceed with the request
  const response = NextResponse.next();
  // 인증 상태 헤더 추가
  response.headers.set('x-auth-status', 'authenticated');
  response.headers.set('x-user-id', userId);
  return response;
}

// Specify which paths this middleware should run on
export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.svg).*)',
  ],
}; 