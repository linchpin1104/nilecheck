import { NextRequest, NextResponse } from 'next/server';
import { sendVerificationSms } from '../../../../../lib/solapi';
import { createVerificationRequest, cleanExpiredVerifications } from '../../../../../lib/firebase/db-service';
import { mockVerificationStore } from '@/lib/verification/store';

export async function POST(request: NextRequest) {
  try {
    console.log('[API] /api/auth/verify/send - Request received');
    
    const body = await request.json();
    console.log('[API] Request body:', body);
    
    const { phoneNumber } = body;
    
    if (!phoneNumber) {
      console.log('[API] Missing phone number in request');
      return NextResponse.json(
        { success: false, message: '전화번호가 필요합니다.' },
        { status: 400 }
      );
    }
    
    console.log(`[API] Processing verification for phone: ${phoneNumber}`);
    
    // Clean up expired requests first - 오류가 발생해도 계속 진행
    try {
      await cleanExpiredVerifications();
    } catch (cleanupError) {
      console.warn('[API] Error during cleanup of expired verifications, continuing anyway:', cleanupError);
    }
    
    // Generate a verification code (always 123456 for testing)
    const verificationCode = "123456";
    
    // Firebase용 요청 ID 생성
    const requestId = `verify_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    
    // Firebase에 저장 시도하되, 실패해도 계속 진행 
    try {
      console.log(`[API] Creating verification request in Firestore`);
      await createVerificationRequest(phoneNumber, verificationCode);
    } catch (firestoreError) {
      console.warn('[API] Error saving to Firestore, using in-memory store instead:', firestoreError);
    }
    
    // 메모리에 인증 정보 저장 (Firebase 백업용)
    mockVerificationStore[phoneNumber] = {
      phoneNumber,
      code: verificationCode,
      requestId,
      createdAt: Date.now(),
      verified: false,
      attempts: 0
    };
    
    console.log(`[API] Mock verification stored:`, mockVerificationStore[phoneNumber]);
    
    // Send SMS (mock implementation in development)
    console.log(`[API] Sending verification SMS to ${phoneNumber}`);
    await sendVerificationSms(phoneNumber, verificationCode);
    
    console.log(`[API] Verification process completed successfully, requestId: ${requestId}`);
    
    return NextResponse.json({
      success: true,
      message: '인증번호가 발송되었습니다.',
      requestId
    });
  } catch (error) {
    console.error('Verification send error', error instanceof Error ? error : 'Unknown error', { 
      phoneNumber: typeof error === 'object' && error !== null && 'phoneNumber' in error 
        ? String((error as Record<string, unknown>).phoneNumber) 
        : 'unknown' 
    });
    
    // 안전한 오류 응답
    const message = error instanceof Error 
      ? error.message 
      : '인증번호 발송 중 오류가 발생했습니다.';
    
    return NextResponse.json({ success: false, message }, { status: 500 });
  }
} 