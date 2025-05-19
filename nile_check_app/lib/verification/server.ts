"use server";

import { countries } from "@/lib/verification/countries";
import { formatPhoneNumber, validatePhoneNumber as validatePhone } from './phone-utils';

// Server-side validation function as async (required for server actions)
export async function validatePhoneNumber(phoneNumber: string, countryCode: string): Promise<boolean> {
  return validatePhone(phoneNumber, countryCode);
}

// Function to send verification SMS using Solapi (actual implementation)
export async function sendVerificationSMS(
  phoneNumber: string, 
  countryCode: string, 
  verificationCode: string
): Promise<{ success: boolean; message: string }> {
  try {
    const formattedPhoneNumber = formatPhoneNumber(phoneNumber, countryCode);
    
    // Get country name and flag for message customization
    const country = countries.find(c => c.code === countryCode);
    const countryName = country?.name || "International";
    
    // Prepare message content (multilingual based on country)
    let messageContent = '';
    
    switch (countryCode) {
      case 'KR':
        messageContent = `[더나일체크] 인증번호: ${verificationCode}\n이 번호를 인증 화면에 입력해주세요.`;
        break;
      case 'JP':
        messageContent = `[더나일체크] 認証番号: ${verificationCode}\nこの番号を認証画面に入力してください。`;
        break;
      case 'CN':
        messageContent = `[더나일체크] 验证码: ${verificationCode}\n请在验证屏幕上输入此号码。`;
        break;
      default:
        messageContent = `[더나일체크] Your verification code: ${verificationCode}\nPlease enter this code on the verification screen.`;
    }
    
    // Log SMS details before sending
    console.log(`[SMS Verification] Sending code ${verificationCode} to ${formattedPhoneNumber} (${countryName})`);
    console.log(`[SMS Content] ${messageContent}`);
    
    // Check if Solapi API credentials are configured
    const apiKey = process.env.SOLAPI_API_KEY;
    const apiSecret = process.env.SOLAPI_API_SECRET;
    const senderNumber = process.env.SOLAPI_SENDER_NUMBER;
    
    if (!apiKey || !apiSecret || !senderNumber) {
      console.error('[SMS Error] Missing Solapi credentials:', {
        apiKey: apiKey ? 'Set' : 'Missing',
        apiSecret: apiSecret ? 'Set' : 'Missing',
        senderNumber: senderNumber ? 'Set' : 'Missing',
      });
      
      // Return success in development mode for testing purposes
      if (process.env.NODE_ENV === 'development') {
        return { 
          success: true, 
          message: `[Development] Simulated SMS to ${formattedPhoneNumber}. Check environment variables for actual sending.` 
        };
      } else {
        throw new Error('SMS service credentials not configured');
      }
    }
    
    // Use dynamic import for Solapi
    try {
      // Import Solapi SDK
      const solapiModule = await import('solapi');
      
      // Create Solapi message service instance
      const SolapiMessageService = solapiModule.SolapiMessageService;
      const messageService = new SolapiMessageService(apiKey, apiSecret);
      
      console.log(`[Solapi] Sending SMS with sender number: ${senderNumber}`);
      
      const result = await messageService.sendOne({
        to: formattedPhoneNumber,
        from: senderNumber,
        text: messageContent
      });
      
      console.log(`[Solapi] Response:`, result);
      
      if (result.statusCode === '2000' || String(result.statusCode) === '2000') {
        return { success: true, message: 'Verification code sent successfully' };
      } else {
        throw new Error(`Failed to send SMS: ${result.statusMessage || JSON.stringify(result)}`);
      }
    } catch (err) {
      console.error('[Solapi Error]', err);
      throw new Error(`SMS sending failed: ${err instanceof Error ? err.message : String(err)}`);
    }
    
  } catch (error) {
    console.error('Error sending verification SMS:', error);
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Unknown error sending verification code'
    };
  }
}

// Verify that the provided code matches the stored code (simple comparison)
export async function verifyCodeMatch(
  providedCode: string, 
  storedCode: string
): Promise<boolean> {
  return providedCode === storedCode;
} 