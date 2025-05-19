import { NextRequest, NextResponse } from 'next/server';
import { register, setAuthCookie } from '@/lib/auth-server';
import { isPhoneNumberVerified, standardizePhoneNumber, getFirestoreUserByPhone, removeHyphens } from '@/lib/firebase/db-service';
import { mockVerificationStore } from '@/lib/verification/store';

export async function POST(request: NextRequest) {
  try {
    console.log('[API] /api/auth/register - Request received');
    
    const userData = await request.json();
    console.log('[API] Register request data:', { 
      phoneNumber: userData.phoneNumber,
      name: userData.name, 
      hasPassword: !!userData.password
    });
    
    if (!userData.phoneNumber || !userData.name || !userData.password) {
      console.log('[API] Missing required fields for registration');
      return NextResponse.json(
        { success: false, message: '이름, 전화번호, 비밀번호가 필요합니다.' },
        { status: 400 }
      );
    }
    
    // 국제 전화번호 형식 처리 (로그인 API와 일치)
    if (userData.phoneNumber.startsWith('+82')) {
      const originalPhone = userData.phoneNumber;
      userData.phoneNumber = '0' + userData.phoneNumber.substring(3);
      console.log(`[API] 국제 전화번호 형식 변환: ${originalPhone} -> ${userData.phoneNumber}`);
    }
    
    // 전화번호 표준화
    const originalPhoneNumber = userData.phoneNumber;
    userData.phoneNumber = standardizePhoneNumber(userData.phoneNumber);
    console.log(`[API] 표준화된 전화번호: ${originalPhoneNumber} -> ${userData.phoneNumber}`);
    
    // 하이픈 없는 전화번호 형식 (사용자 ID로 사용됨)
    const phoneNumberWithoutHyphens = removeHyphens(userData.phoneNumber);
    console.log(`[API] 하이픈 없는 전화번호 (ID 형식): ${phoneNumberWithoutHyphens}`);
    
    // 이미 가입된 사용자인지 먼저 확인
    try {
      const existingUser = await getFirestoreUserByPhone(userData.phoneNumber);
      if (existingUser) {
        console.log(`[API] 이미 가입된 사용자: ${existingUser.uid}, 전화번호: ${existingUser.phoneNumber}`);
        return NextResponse.json(
          { success: false, message: '이미 가입된 전화번호입니다. 로그인을 시도해보세요.' },
          { status: 400 }
        );
      }
    } catch (err) {
      console.error('[API] 기존 사용자 확인 중 오류:', err);
      // 오류가 발생해도 계속 진행
    }
    
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
    
    console.log(`[API] Registration successful, token generated: ${!!registerResult.token}`);
    
    // 성공 후 데이터베이스에 사용자가 실제로 저장되었는지 확인
    try {
      const newUser = await getFirestoreUserByPhone(phoneNumber);
      if (!newUser) {
        console.error(`[API] 사용자 저장 확인 실패: DB에서 새로 생성된 사용자를 찾을 수 없음`);
        return NextResponse.json(
          { success: false, message: '사용자 정보 저장에 실패했습니다. 다시 시도해 주세요.' },
          { status: 500 }
        );
      }
      console.log(`[API] 사용자 저장 확인 성공: ${newUser.uid}, 전화번호: ${newUser.phoneNumber}`);
    } catch (verifyError) {
      console.error('[API] 사용자 저장 확인 중 오류:', verifyError);
      // 오류가 발생해도 계속 진행
    }
    
    // Create response with success message
    const response = NextResponse.json({
      success: true,
      message: registerResult.message || '회원가입이 완료되었습니다.',
      user: registerResult.user
    });
    
    // Set auth cookie
    if (registerResult.token) {
      setAuthCookie(response, registerResult.token);
      console.log(`[API] Auth cookie set, registration complete`);
    } else {
      console.warn('[API] No token returned from register function!');
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