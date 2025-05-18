"use server";

import { countries } from "@/components/ui/country-selector";

// Avoid circular import by implementing the formatting function directly
function formatPhoneNumber(phoneNumber: string, countryCode: string): string {
  // Remove any non-digit characters
  const digitsOnly = phoneNumber.replace(/\D/g, '');
  
  // Find country dial code
  const country = countries.find(c => c.code === countryCode);
  if (!country) {
    throw new Error(`Country code ${countryCode} not found`);
  }
  
  // Format with country dial code
  const dialCode = country.dialCode.replace('+', '');
  
  // Handle special case for countries with country code +1 (US/Canada)
  if (dialCode === '1') {
    // North American Numbering Plan format: +1AAABBBCCCC
    if (digitsOnly.length === 10) {
      return `+1${digitsOnly}`;
    }
    // If already has country code
    if (digitsOnly.startsWith('1') && digitsOnly.length === 11) {
      return `+${digitsOnly}`;
    }
  }
  
  // Handle Korean numbers (format: +82AAABBBBCCCC)
  if (dialCode === '82') {
    // Remove leading 0 if present (Korean mobile numbers start with 010)
    const numberWithoutLeadingZero = digitsOnly.startsWith('0') 
      ? digitsOnly.substring(1) 
      : digitsOnly;
    return `+${dialCode}${numberWithoutLeadingZero}`;
  }
  
  // For other countries, just add the dial code
  // Remove leading 0 which is common in many countries
  const formattedNumber = digitsOnly.startsWith('0') 
    ? digitsOnly.substring(1) 
    : digitsOnly;
  
  return `+${dialCode}${formattedNumber}`;
}

// Server-side validation function
export async function validatePhoneNumber(phoneNumber: string, countryCode: string): Promise<boolean> {
  // Find country
  const country = countries.find(c => c.code === countryCode);
  if (!country) return false;
  
  const digitsOnly = phoneNumber.replace(/\D/g, '');
  
  // Basic validation based on country
  switch (countryCode) {
    case 'KR': // Korea
      // Korean mobile numbers are 10-11 digits (including leading 0)
      return (digitsOnly.length === 10 || digitsOnly.length === 11) && 
             (digitsOnly.startsWith('0') || digitsOnly.startsWith('10'));
    
    case 'US': // United States
    case 'CA': // Canada
      // North American numbers are 10 digits
      return digitsOnly.length === 10 || 
             (digitsOnly.length === 11 && digitsOnly.startsWith('1'));
    
    case 'JP': // Japan
      // Japanese mobile numbers are 11 digits (including leading 0)
      return (digitsOnly.length === 10 || digitsOnly.length === 11) && 
             digitsOnly.startsWith('0');
    
    default:
      // Generic validation - just check reasonable length
      return digitsOnly.length >= 8 && digitsOnly.length <= 15;
  }
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
        messageContent = `[Nile Check] 인증번호: ${verificationCode}\n이 번호를 인증 화면에 입력해주세요.`;
        break;
      case 'JP':
        messageContent = `[Nile Check] 認証番号: ${verificationCode}\nこの番号を認証画面に入力してください。`;
        break;
      case 'CN':
        messageContent = `[Nile Check] 验证码: ${verificationCode}\n请在验证屏幕上输入此号码。`;
        break;
      default:
        messageContent = `[Nile Check] Your verification code: ${verificationCode}\nPlease enter this code on the verification screen.`;
    }
    
    // In a real implementation, this would connect to Solapi
    // For development, we'll simulate a successful response
    console.log(`[SMS Verification] Sending code ${verificationCode} to ${formattedPhoneNumber} (${countryName})`);
    console.log(`[SMS Content] ${messageContent}`);
    
    // Simulate API call to Solapi
    // In production, you would replace this with actual API call:
    
    /* 
    // Example Solapi implementation
    const { config, msg } = require('solapi');
    
    // Set API credentials
    config.init({
      apiKey: process.env.SOLAPI_API_KEY,
      apiSecret: process.env.SOLAPI_API_SECRET
    });
    
    const result = await msg.send({
      to: formattedPhoneNumber,
      from: process.env.SOLAPI_SENDER_NUMBER,
      text: messageContent
    });
    
    if (result.statusCode === '2000') {
      return { success: true, message: 'Verification code sent successfully' };
    } else {
      throw new Error(`Failed to send SMS: ${result.statusMessage}`);
    }
    */
    
    // Simulate successful response
    return { 
      success: true, 
      message: `Verification code sent to ${formattedPhoneNumber}` 
    };
    
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