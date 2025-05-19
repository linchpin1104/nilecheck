import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { AES, enc } from 'crypto-js';
import { formatPhoneNumber } from '@/lib/verification/phone-utils';
import { createVerificationRequest, updateVerificationRequest } from '@/lib/firebase/db-service';
import { mockVerificationStore } from '@/lib/verification/store';
import { Timestamp } from 'firebase/firestore';

export async function POST(req: NextRequest) {
  try {
    const { requestId, phoneNumber, countryCode = "KR", code } = await req.json();
    
    if (!requestId || !phoneNumber || !code) {
      return NextResponse.json({
        success: false,
        message: "Missing required parameters"
      }, { status: 400 });
    }
    
    // Get the verification record from cookies
    const cookieStore = await cookies();
    const verificationCookie = cookieStore.get(`verify_${requestId}`);
    
    if (!verificationCookie) {
      return NextResponse.json({
        success: false,
        message: "Verification request expired or not found"
      }, { status: 404 });
    }
    
    // Decrypt the verification data
    try {
      const decryptedBytes = AES.decrypt(
        verificationCookie.value,
        process.env.VERIFICATION_SECRET || 'verification-secret-key'
      );
      
      const verificationRecord = JSON.parse(
        decryptedBytes.toString(enc.Utf8)
      );
      
      // Format the incoming phone number in the same way as the stored one
      const formattedInput = formatPhoneNumber(phoneNumber, countryCode);
      
      // Check if phone number matches
      if (verificationRecord.phoneNumber !== formattedInput) {
        return NextResponse.json({
          success: false,
          message: "Phone number doesn't match verification request"
        }, { status: 400 });
      }
      
      // Check if the verification has expired
      const expirationTime = 10 * 60 * 1000; // 10 minutes in milliseconds
      if (Date.now() - verificationRecord.timestamp > expirationTime) {
        // Clean up the expired cookie
        cookieStore.delete(`verify_${requestId}`);
        
        return NextResponse.json({
          success: false,
          message: "Verification code expired"
        }, { status: 400 });
      }
      
      // Update attempts counter
      verificationRecord.attempts += 1;
      
      // Check if max attempts reached
      if (verificationRecord.attempts > 5) {
        // Clean up the cookie
        cookieStore.delete(`verify_${requestId}`);
        
        return NextResponse.json({
          success: false,
          message: "Too many failed attempts. Please request a new code."
        }, { status: 400 });
      }
      
      // Check if the code matches
      if (verificationRecord.code !== code) {
        // Update and store the record with incremented attempts
        const encryptedData = AES.encrypt(
          JSON.stringify(verificationRecord),
          process.env.VERIFICATION_SECRET || 'verification-secret-key'
        ).toString();
        
        cookieStore.set(`verify_${requestId}`, encryptedData, { 
          maxAge: 10 * 60, // 10 minutes
          httpOnly: true,
          path: '/'
        });
        
        return NextResponse.json({
          success: false,
          message: "Invalid verification code",
          attemptsLeft: 5 - verificationRecord.attempts
        }, { status: 400 });
      }
      
      // Verification successful - clean up the cookie
      cookieStore.delete(`verify_${requestId}`);
      
      // 인증 정보를 Firestore에 영구 저장
      console.log(`[API] 인증 성공: ${formattedInput}. Firestore에 저장 중...`);
      try {
        // 1. 먼저 Firestore에 인증 기록 저장
        const firestoreRequestId = await createVerificationRequest(formattedInput, code);
        const verification = {
          _id: firestoreRequestId,
          phoneNumber: formattedInput,
          code: code,
          requestId: firestoreRequestId,
          createdAt: Timestamp.fromDate(new Date()),
          verified: true,
          attempts: verificationRecord.attempts
        };
        
        // 인증 상태를 true로 업데이트
        await updateVerificationRequest(verification);
        console.log(`[API] 전화번호 ${formattedInput}의 인증 정보가 Firestore에 저장되었습니다.`);
      } catch (firestoreError) {
        // Firestore 저장 실패 시에도 백업으로 메모리에 저장
        console.error(`[API] Firestore 저장 실패:`, firestoreError);
      }
      
      // 2. 메모리 스토어에도 백업으로 저장 (개발 환경용)
      mockVerificationStore[formattedInput] = {
        phoneNumber: formattedInput,
        code: code,
        requestId: requestId,
        createdAt: Date.now(),
        verified: true,
        attempts: verificationRecord.attempts
      };
      console.log(`[API] 전화번호 ${formattedInput}의 인증 정보가 메모리 스토어에 저장되었습니다.`);
      
      return NextResponse.json({
        success: true,
        message: "Phone number verified successfully"
      });
      
    } catch (error) {
      console.error('Error decrypting verification data:', error);
      return NextResponse.json({
        success: false,
        message: "Invalid verification data"
      }, { status: 500 });
    }
    
  } catch (error) {
    console.error('Error checking verification code:', error);
    return NextResponse.json({
      success: false,
      message: error instanceof Error ? error.message : "Unknown error occurred"
    }, { status: 500 });
  }
} 