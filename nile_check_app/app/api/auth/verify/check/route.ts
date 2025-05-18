import { NextRequest, NextResponse } from 'next/server';
import { getVerificationRequest, updateVerificationRequest } from '@/lib/firebase/db-service';
import { mockVerificationStore } from '@/lib/verification/store';

export async function POST(req: NextRequest) {
  try {
    console.log('[API] /api/auth/verify/check - Request received');
    
    const body = await req.json();
    console.log('[API] Request body:', body);
    
    const { requestId, phoneNumber, code } = body;
    
    if (!requestId || !phoneNumber || !code) {
      console.log('[API] Missing required fields in request');
      return NextResponse.json(
        { success: false, message: '요청 ID, 전화번호, 인증번호가 모두 필요합니다.' },
        { status: 400 }
      );
    }
    
    console.log(`[API] Checking verification. RequestID: ${requestId}, Phone: ${phoneNumber}`);
    
    // Firestore에서 인증 요청 조회 시도, 실패하면 메모리 저장소 사용
    let verification = null;
    
    try {
      verification = await getVerificationRequest(requestId, phoneNumber);
    } catch (firestoreError) {
      console.warn('[API] Error getting verification from Firestore:', firestoreError);
    }
    
    // Firestore에서 찾지 못했거나 오류 발생 시 메모리 저장소 확인
    if (!verification) {
      console.log(`[API] Checking mock verification store for phone: ${phoneNumber}`);
      const mockVerification = mockVerificationStore[phoneNumber];
      
      if (mockVerification) {
        verification = {
          ...mockVerification,
          // Firestore Timestamp를 흉내내기
          createdAt: {
            toDate: () => new Date(mockVerification.createdAt)
          },
          _id: 'mock_id' // 업데이트를 위한 임시 ID 추가
        };
        console.log(`[API] Found verification in mock store:`, verification);
      } else {
        console.log(`[API] No verification found for phone: ${phoneNumber}`);
        return NextResponse.json(
          { success: false, message: '유효하지 않은 인증 요청입니다. 인증번호를 다시 요청해주세요.' },
          { status: 404 }
        );
      }
    }
    
    console.log(`[API] Verification found:`, verification);
    
    // Timestamp 객체를 JavaScript Date로 변환
    const createdAt = verification.createdAt instanceof Date ? 
                       verification.createdAt : 
                       verification.createdAt.toDate();
    
    // 만료 확인 (5분 이상 지난 경우)
    if (createdAt.getTime() < Date.now() - 5 * 60 * 1000) {
      console.log(`[API] Verification expired. Created at: ${createdAt.toISOString()}`);
      return NextResponse.json(
        { success: false, message: '인증번호가 만료되었습니다. 인증번호를 다시 요청해주세요.' },
        { status: 410 } // Gone
      );
    }
    
    // 이미 인증된 요청인지 확인
    if (verification.verified) {
      console.log(`[API] Verification already verified`);
      return NextResponse.json({
        success: true,
        message: '이미 인증된 요청입니다.'
      });
    }
    
    // 시도 횟수 초과 확인 (5회 이상)
    if (verification.attempts >= 5) {
      console.log(`[API] Too many verification attempts: ${verification.attempts}`);
      return NextResponse.json(
        { success: false, message: '인증 시도 횟수를 초과했습니다. 인증번호를 다시 요청해주세요.' },
        { status: 429 } // Too Many Requests
      );
    }
    
    // 시도 횟수 증가
    verification.attempts += 1;
    console.log(`[API] Increasing attempts to ${verification.attempts}`);
    
    // 인증번호 확인 - 테스트를 위해 "0000", "000000", "123456" 모두 허용
    if (code === verification.code || code === "0000" || code === "123456") {
      // 인증 상태 업데이트
      verification.verified = true;
      
      // Firestore 업데이트 시도
      try {
        console.log(`[API] Verification successful - updating status in Firestore`);
        if (verification._id) {
          await updateVerificationRequest(verification as any);
        }
      } catch (updateError) {
        console.warn('[API] Error updating verification in Firestore:', updateError);
      }
      
      // 메모리 저장소 업데이트
      if (mockVerificationStore[phoneNumber]) {
        mockVerificationStore[phoneNumber].verified = true;
        mockVerificationStore[phoneNumber].attempts = verification.attempts;
        console.log(`[API] Updated mock verification store:`, mockVerificationStore[phoneNumber]);
      }
      
      return NextResponse.json({
        success: true,
        message: '인증에 성공했습니다.'
      });
    } else {
      // 실패 상태 업데이트
      console.log(`[API] Verification code mismatch. Expected: ${verification.code}, Received: ${code}`);
      
      // Firestore 업데이트 시도
      try {
        if (verification._id) {
          await updateVerificationRequest(verification as any);
        }
      } catch (updateError) {
        console.warn('[API] Error updating verification attempts in Firestore:', updateError);
      }
      
      // 메모리 저장소 업데이트
      if (mockVerificationStore[phoneNumber]) {
        mockVerificationStore[phoneNumber].attempts = verification.attempts;
      }
      
      return NextResponse.json(
        { success: false, message: '인증번호가 일치하지 않습니다.' },
        { status: 400 }
      );
    }
  } catch (error) {
    console.error('[API] Verification check error:', error);
    return NextResponse.json(
      { success: false, message: '인증번호 확인 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
} 