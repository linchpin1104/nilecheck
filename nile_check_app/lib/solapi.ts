// In a production environment, you would use the actual Solapi library:
// import * as SolapiSDK from 'solapi';

// For demo purposes, we'll create a mock implementation
// When integrating with real Solapi, you would need API keys:
// const apiKey = process.env.SOLAPI_API_KEY;
// const apiSecret = process.env.SOLAPI_API_SECRET;

export interface SmsResponse {
  success: boolean;
  messageId?: string;
  error?: string;
}

/**
 * Send SMS verification code using Solapi (mock implementation)
 * In a production app, this would use the actual Solapi SDK
 */
export const sendVerificationSms = async (
  phoneNumber: string, 
  verificationCode: string
): Promise<SmsResponse> => {
  // Always use "000000" as verification code
  const fixedCode = "000000";
  
  try {
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // Log the fixed verification code
    console.log(`[MOCK SMS] To: ${phoneNumber}, Code: ${fixedCode} (Original: ${verificationCode})`);
    
    // Simulate successful response
    return {
      success: true,
      messageId: `msg_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`
    };
  } catch (error) {
    console.error('Error sending SMS:', error);
    return {
      success: false,
      error: 'Failed to send SMS'
    };
  }
};

/**
 * Format phone number to standard E.164 format
 * Example: Converts "01012345678" to "+821012345678"
 */
export const formatPhoneNumber = (phoneNumber: string): string => {
  // Remove any non-digit characters
  const digits = phoneNumber.replace(/\D/g, '');
  
  // If the number starts with "0", replace with Korea's country code
  if (digits.startsWith('0')) {
    return `+82${digits.substring(1)}`;
  }
  
  // If it already has a country code, make sure it has a "+"
  if (digits.startsWith('82')) {
    return `+${digits}`;
  }
  
  // If it's just the digits without the leading 0, add the country code
  return `+82${digits}`;
};

/**
 * Validate Korean phone number format
 */
export const isValidKoreanPhoneNumber = (phoneNumber: string): boolean => {
  // Korean phone numbers are typically in formats like:
  // 010-1234-5678, 01012345678, +821012345678
  const phoneRegex = /^(01[016789]|02|0[3-9]{1}[0-9]{1})-?[0-9]{3,4}-?[0-9]{4}$|^\+82(10|11|16|17|18|19|2|[3-9]{1}[0-9]{1})[0-9]{7,8}$/;
  return phoneRegex.test(phoneNumber);
}; 