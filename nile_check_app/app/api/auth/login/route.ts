import { NextRequest, NextResponse } from 'next/server';
import { login, setAuthCookie } from '@/lib/auth-server';
import { standardizePhoneNumber } from '@/lib/firebase/db-service';

export async function POST(request: NextRequest) {
  try {
    const { phoneNumber, password } = await request.json();
    
    if (!phoneNumber || !password) {
      return NextResponse.json(
        { success: false, message: '전화번호와 비밀번호가 필요합니다.' },
        { status: 400 }
      );
    }
    
    // 전화번호 표준화 (로그인 시에도 일관된 형식 적용)
    const standardizedPhoneNumber = standardizePhoneNumber(phoneNumber);
    console.log(`[Login API] 표준화된 전화번호: ${standardizedPhoneNumber} (원본: ${phoneNumber})`);
    
    // 로그인 시도
    const loginResult = await login(standardizedPhoneNumber, password);
    
    if (!loginResult.success) {
      return NextResponse.json(
        { success: false, message: loginResult.message || '로그인 정보가 잘못되었습니다.' },
        { status: 401 }
      );
    }
    
    // 성공 응답 생성
    const response = NextResponse.json({
      success: true,
      message: '로그인 성공'
    });
    
    // 인증 쿠키 설정
    if (loginResult.token) {
      setAuthCookie(response, loginResult.token);
    }
    
    return response;
  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json(
      { success: false, message: '로그인 처리 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
} 