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

    // Send the verification SMS (in production)
    if (process.env.NODE_ENV === 'production') {
      const smsResult = await sendSMS(phoneNumber, countryCode, verificationCode);
      if (!smsResult.success) {
        return NextResponse.json({
          success: false,
          message: smsResult.message || "Failed to send verification SMS"
        }, { status: 500 });
      }
    } else {
      // Just log for development
      console.log(`[Verification] Phone: ${formattedPhoneNumber}, Code: ${verificationCode}`);
    }
    
    // Return success response with the requestId
    return NextResponse.json({
      success: true,
      requestId,
      message: "Verification code sent successfully",
      // Include test code only in development
      ...(process.env.NODE_ENV === 'development' && {
        testCode: verificationCode // Only include in development!
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