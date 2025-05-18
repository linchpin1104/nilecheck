import { NextRequest, NextResponse } from 'next/server';
import { validatePhoneNumber, sendVerificationSMS as sendSMS } from '@/lib/verification/server';
import { formatPhoneNumber, generateVerificationCode } from '@/lib/verification/phone-utils';
import { cookies } from 'next/headers';
import { AES } from 'crypto-js';

export async function POST(req: NextRequest) {
  try {
    const { phoneNumber, countryCode = "KR" } = await req.json();
    
    // Validate the phone number based on country
    if (!(await validatePhoneNumber(phoneNumber, countryCode))) {
      return NextResponse.json({
        success: false,
        message: "유효하지 않은 전화번호 형식입니다."
      }, { status: 400 });
    }
    
    // Format the phone number for verification
    const formattedPhoneNumber = formatPhoneNumber(phoneNumber, countryCode);
    
    // Generate a verification code
    const verificationCode = generateVerificationCode(6);
    
    // Create a unique request ID for this verification attempt
    const requestId = Math.random().toString(36).substring(2, 15);
    
    // Create a verification record
    const verificationRecord = {
      phoneNumber: formattedPhoneNumber,
      countryCode,
      code: verificationCode,
      timestamp: Date.now(),
      attempts: 0
    };
    
    // Encrypt the verification record
    const encryptedData = AES.encrypt(
      JSON.stringify(verificationRecord),
      process.env.VERIFICATION_SECRET || 'verification-secret-key'
    ).toString();
    
    // Store in cookie that expires in 10 minutes
    const cookieStore = await cookies();
    cookieStore.set(`verify_${requestId}`, encryptedData, { 
      maxAge: 10 * 60, // 10 minutes
      httpOnly: true,
      path: '/'
    });

    // Always attempt to send the SMS regardless of environment
    const smsResult = await sendSMS(phoneNumber, countryCode, verificationCode);
    
    // Check if the SMS was sent successfully
    if (!smsResult.success) {
      console.error(`[SMS Error] ${smsResult.message}`);
      
      // In development, continue despite SMS failure
      if (process.env.NODE_ENV === 'development') {
        console.log(`[Development] Proceeding despite SMS error: ${smsResult.message}`);
      } else {
        // In production, return error
        return NextResponse.json({
          success: false,
          message: smsResult.message || "문자 발송에 실패했습니다."
        }, { status: 500 });
      }
    }
    
    // Return success response with the requestId
    return NextResponse.json({
      success: true,
      requestId,
      message: smsResult.success 
        ? "인증번호가 발송되었습니다."
        : "개발 환경에서는 문자가 발송되지 않습니다. 아래 인증번호를 사용하세요.",
      // Include test code only in development
      ...(process.env.NODE_ENV === 'development' && {
        testCode: verificationCode
      })
    });
    
  } catch (error) {
    console.error('Error sending verification code:', error);
    return NextResponse.json({
      success: false,
      message: error instanceof Error ? error.message : "Unknown error occurred"
    }, { status: 500 });
  }
} 