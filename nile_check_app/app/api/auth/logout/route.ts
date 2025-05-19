import { NextResponse } from 'next/server';
import { clearAuthCookie } from '@/lib/auth-server';

export async function POST() {
  try {
    console.log('[Auth API] 로그아웃 요청 처리');
    
    // 응답 생성
    const response = NextResponse.json({
      success: true,
      message: '로그아웃 되었습니다.'
    });
    
    // 인증 쿠키 제거
    clearAuthCookie(response);
    
    // 추가로 전화번호 쿠키 제거
    response.cookies.set({
      name: 'user-phone',
      value: '',
      path: '/',
      maxAge: 0
    });
    
    // 기타 세션 관련 쿠키들도 제거
    const cookieNames = ['user-id', 'user-name', 'user-email'];
    cookieNames.forEach(name => {
      response.cookies.set({
        name,
        value: '',
        path: '/',
        maxAge: 0
      });
    });
    
    console.log('[Auth API] 모든 인증 관련 쿠키 삭제 완료');
    
    return response;
  } catch (error) {
    console.error('[Auth API] 로그아웃 처리 중 오류:', error);
    return NextResponse.json(
      { success: false, message: '로그아웃 처리 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
} 