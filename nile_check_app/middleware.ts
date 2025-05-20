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
  
  // 요청 정보 추출
  const requestId = Date.now().toString(36) + Math.random().toString(36).substr(2, 5);
  const userAgent = request.headers.get('user-agent') || 'unknown';
  const isClient = userAgent.includes('Mozilla') || userAgent.includes('Chrome');
  const hostname = request.headers.get('host') || '';
  
  // 디버깅 로그 추가
  console.log(`[Middleware:${requestId}] 요청 경로: ${path}, 클라이언트: ${isClient ? '브라우저' : 'API/서버'}`);
  console.log(`[Middleware:${requestId}] 호스트: ${hostname}`);
  
  // Vercel preview URL 체크 - 프리뷰 도메인에서는 항상 다음 경로를 허용하고 도메인 전환을 방지
  const isPreviewDomain = hostname.includes('-healin-lees-projects.vercel.app');
  if (isPreviewDomain) {
    console.log(`[Middleware:${requestId}] Vercel 프리뷰 환경 감지. 도메인 전환 방지 모드.`);
    
    // 로그인 상태라면 인증 헤더 추가
    const token = request.cookies.get(TOKEN_COOKIE_NAME)?.value;
    let userId = '';
    
    if (token) {
      try {
        const verified = await jwtVerify(token, JWT_SECRET);
        if (verified && verified.payload && verified.payload.user) {
          const userPayload = verified.payload.user as Record<string, unknown>;
          userId = userPayload.id as string || '';
          
          // 사용자 ID 헤더 추가
          const response = NextResponse.next();
          response.headers.set('x-auth-status', 'authenticated');
          response.headers.set('x-user-id', userId);
          return response;
        }
      } catch (error) {
        // 토큰 검증 실패해도 계속 진행
        console.error(`[Middleware:${requestId}] 프리뷰 환경: 토큰 검증 실패:`, error);
      }
    }
    
    // 쿠키 없이 그냥 다음으로 진행
    return NextResponse.next();
  }
  
  // Define public paths that don't require authentication (인증이 필요 없는 공개 경로)
  const isPublicPath = path === '/login' || 
                      path === '/register' || 
                      path === '/forgot-password' || 
                      path === '/debug-login' || 
                      path === '/test-auth' || 
                      path === '/direct-login' ||
                      path.startsWith('/api/auth/');
  
  // API requests should be handled by their routes
  if (path.startsWith('/api/') && !path.startsWith('/api/auth/')) {
    console.log(`[Middleware:${requestId}] API 요청 허용: ${path}`);
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
        const userPayload = verified.payload.user as Record<string, unknown>;
        userId = userPayload.id as string || '';
        console.log(`[Middleware:${requestId}] 인증 성공: 사용자=${userId}`);
      }
    } catch (error) {
      console.error(`[Middleware:${requestId}] 인증 토큰 검증 실패:`, error);
      // Don't redirect away from public paths even if token is invalid
      if (isPublicPath) {
        console.log(`[Middleware:${requestId}] 공개 경로 접근 허용 (인증 실패 무시): ${path}`);
        const response = NextResponse.next();
        response.headers.set('x-auth-status', 'authentication-required');
        return response;
      }
    }
  } else {
    console.log(`[Middleware:${requestId}] 쿠키에 인증 토큰이 없음`);
    // Don't redirect away from public paths if no token exists
    if (isPublicPath) {
      console.log(`[Middleware:${requestId}] 공개 경로 접근 허용 (인증 필요): ${path}`);
      const response = NextResponse.next();
      response.headers.set('x-auth-status', 'authentication-required');
      return response;
    }
  }
  
  // Special handling for the home page - redirect logic
  if (path === '/') {
    // 인증된 사용자는 활동 기록 페이지로, 로그인 필요한 사용자는 로그인으로
    if (isAuthenticated) {
      console.log(`[Middleware:${requestId}] 인증 확인됨, 활동 기록 페이지로 리다이렉션`);
      return NextResponse.redirect(new URL('/log-activity', request.url));
    } else {
      console.log(`[Middleware:${requestId}] 인증 필요함, 로그인으로 리다이렉션`);
      return NextResponse.redirect(new URL('/login', request.url));
    }
  }
  
  // Allow access to public paths without authentication check
  if (isPublicPath) {
    console.log(`[Middleware:${requestId}] 공개 경로 접근 허용: ${path}`);
    return NextResponse.next();
  }
  
  // If not authenticated and trying to access any protected route, redirect to login
  if (!isAuthenticated) {
    // Store the original path for redirecting back after login
    const params = new URLSearchParams();
    params.set('callbackUrl', path);
    
    // Check if we're already coming from the login page to prevent redirect loops
    const referer = request.headers.get('referer') || '';
    const isFromLogin = referer.includes('/login');
    
    // 리다이렉트 루프 방지를 위한 추가 확인
    const loopPreventionCookie = request.cookies.get('prevent-redirect-loop');
    const preventRedirect = loopPreventionCookie?.value === 'true';
    
    if (isFromLogin || preventRedirect) {
      console.log(`[Middleware:${requestId}] 로그인 페이지에서 왔거나 리다이렉트 방지 쿠키 존재, 진행 허용`);
      const response = NextResponse.next();
      
      // 인증 상태 헤더 설정
      response.headers.set('x-auth-status', 'authentication-required');
      
      if (!preventRedirect) {
        // 잠시 동안 리다이렉트 방지 쿠키 설정 (30초)
        response.cookies.set({
          name: 'prevent-redirect-loop',
          value: 'true',
          maxAge: 30,
          path: '/',
          sameSite: 'lax',
          secure: true
        });
      }
      
      return response;
    }
    
    console.log(`[Middleware:${requestId}] 인증 필요: ${path} 접근 시도, 로그인으로 리다이렉션`);
    return NextResponse.redirect(new URL(`/login?${params.toString()}`, request.url));
  }
  
  // Authenticated user - proceed with the request
  console.log(`[Middleware:${requestId}] 인증된 사용자(${userId}) 요청 처리: ${path}`);
  const response = NextResponse.next();
  // 인증 상태 헤더 추가
  response.headers.set('x-auth-status', 'authenticated');
  response.headers.set('x-user-id', userId);
  
  // 리다이렉트 방지 쿠키가 있다면 제거
  if (request.cookies.has('prevent-redirect-loop')) {
    response.cookies.set({
      name: 'prevent-redirect-loop',
      value: '',
      maxAge: 0,
      path: '/',
      sameSite: 'lax',
      secure: true
    });
  }
  
  return response;
}

// Specify which paths this middleware should run on
export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.svg).*)',
  ],
}; 