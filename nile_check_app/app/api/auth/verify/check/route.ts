import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { AES, enc } from 'crypto-js';
import { formatPhoneNumber } from '@/lib/verification/phone-service';

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