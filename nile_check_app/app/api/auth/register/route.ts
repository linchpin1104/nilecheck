import { NextRequest, NextResponse } from 'next/server';
import { register, setAuthCookie } from '@/lib/auth-server';
import { isPhoneNumberVerified, standardizePhoneNumber } from '@/lib/firebase/db-service';
import { mockVerificationStore } from '@/lib/verification/store';

export async function POST(request: NextRequest) {
  try {
    console.log('[API] /api/auth/register - Request received');
    
    const userData = await request.json();
    console.log('[API] Register request data:', { ...userData, password: '***' });
    
    if (!userData.phoneNumber || !userData.name || !userData.password) {
      console.log('[API] Missing required fields for registration');
      return NextResponse.json(
        { success: false, message: '이름, 전화번호, 비밀번호가 필요합니다.' },
        { status: 400 }
      );
    }
    
    // 전화번호 표준화
    userData.phoneNumber = standardizePhoneNumber(userData.phoneNumber);
    console.log(`[API] 표준화된 전화번호: ${userData.phoneNumber}`);
    
    // Firestore에서 인증 상태 확인 시도
    let isVerified = false;
    
    try {
      console.log(`[API] Checking if phone ${userData.phoneNumber} is verified in Firestore`);
      isVerified = await isPhoneNumberVerified(userData.phoneNumber);
      console.log(`[API] Phone verification status from Firestore: ${isVerified}`);
    } catch (firestoreError) {
      console.warn('[API] Error checking verification in Firestore:', firestoreError);
    }
    
    // Firestore에서 확인 실패 시 메모리 저장소 확인
    if (!isVerified) {
      console.log(`[API] Checking mock store for phone verification: ${userData.phoneNumber}`);
      const mockVerification = mockVerificationStore[userData.phoneNumber];
      
      if (mockVerification && mockVerification.verified) {
        isVerified = true;
        console.log(`[API] Phone ${userData.phoneNumber} verified in mock store`);
      }
    }
    
    // 개발 환경에서는 검증 과정 생략 옵션 (프로덕션에서는 제거)
    const isDevelopment = process.env.NODE_ENV === 'development';
    if (isDevelopment && !isVerified) {
      console.log('[API] Development mode - bypassing verification requirement');
      isVerified = true;
    }
    
    if (!isVerified) {
      console.log(`[API] Phone ${userData.phoneNumber} is not verified, rejecting registration`);
      return NextResponse.json(
        { success: false, message: '전화번호 인증이 필요합니다.' },
        { status: 403 }
      );
    }
    
    // User registration
    const { name, phoneNumber, email, password } = userData;
    console.log(`[API] Proceeding with registration for ${phoneNumber}`);
    
    // Register user and create session
    const registerResult = await register({ name, phoneNumber, email }, password);
    
    if (!registerResult.success) {
      console.log(`[API] Registration failed: ${registerResult.message}`);
      return NextResponse.json(
        { success: false, message: registerResult.message || '회원가입 처리 중 오류가 발생했습니다.' },
        { status: 500 }
      );
    }
    
    console.log(`[API] Registration successful, token generated`);
    
    // Create response with success message
    const response = NextResponse.json({
      success: true,
      message: registerResult.message || '회원가입이 완료되었습니다.'
    });
    
    // Set auth cookie
    if (registerResult.token) {
      setAuthCookie(response, registerResult.token);
      console.log(`[API] Auth cookie set, registration complete`);
    }
    
    return response;
  } catch (error) {
    console.error('[API] Registration error:', error);
    return NextResponse.json(
      { success: false, message: '회원가입 처리 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
} 