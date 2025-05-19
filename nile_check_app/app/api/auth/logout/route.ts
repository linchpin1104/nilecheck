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
    
    return response;
  } catch (error) {
    console.error('[Auth API] 로그아웃 처리 중 오류:', error);
    return NextResponse.json(
      { success: false, message: '로그아웃 처리 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
} 