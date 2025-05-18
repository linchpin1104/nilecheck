"use client";

import { countries } from "@/components/ui/country-selector";

// Function to generate a random verification code
export function generateVerificationCode(length: number = 6): string {
  const digits = '0123456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += digits.charAt(Math.floor(Math.random() * digits.length));
  }
  return result;
}

// Format phone number to E.164 standard
export function formatPhoneNumber(phoneNumber: string, countryCode: string): string {
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

// Validate phone number format
export function validatePhoneNumber(phoneNumber: string, countryCode: string): boolean {
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

// Standardize phone number format for display
export function standardizePhoneNumber(phoneNumber: string, countryCode: string): string {
  const country = countries.find(c => c.code === countryCode);
  if (!country) return phoneNumber;
  
  const digitsOnly = phoneNumber.replace(/\D/g, '');
  
  // Format based on country
  switch (countryCode) {
    case 'KR': // Korea (010-XXXX-XXXX)
      if (digitsOnly.length === 11 && digitsOnly.startsWith('0')) {
        return `${digitsOnly.slice(0, 3)}-${digitsOnly.slice(3, 7)}-${digitsOnly.slice(7)}`;
      } else if (digitsOnly.length === 10 && digitsOnly.startsWith('10')) {
        return `0${digitsOnly.slice(0, 2)}-${digitsOnly.slice(2, 6)}-${digitsOnly.slice(6)}`;
      }
      break;
    
    case 'US': // United States (XXX-XXX-XXXX)
    case 'CA': // Canada
      if (digitsOnly.length === 10) {
        return `${digitsOnly.slice(0, 3)}-${digitsOnly.slice(3, 6)}-${digitsOnly.slice(6)}`;
      } else if (digitsOnly.length === 11 && digitsOnly.startsWith('1')) {
        return `${digitsOnly.slice(0, 1)}-${digitsOnly.slice(1, 4)}-${digitsOnly.slice(4, 7)}-${digitsOnly.slice(7)}`;
      }
      break;
    
    case 'JP': // Japan
      if (digitsOnly.length === 11 && digitsOnly.startsWith('0')) {
        return `${digitsOnly.slice(0, 3)}-${digitsOnly.slice(3, 7)}-${digitsOnly.slice(7)}`;
      }
      break;
  }
  
  // Generic format if no specific formatting is defined
  return phoneNumber;
}

// Client-side function to send verification code API request
export async function sendVerificationSMS(
  phoneNumber: string, 
  countryCode: string, 
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _verificationCode: string // Unused but kept for compatibility
): Promise<{ success: boolean; message: string; requestId?: string; testCode?: string }> {
  try {
    const response = await fetch('/api/auth/verify/send', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        phoneNumber,
        countryCode,
      })
    });
    
    return await response.json();
  } catch (error) {
    console.error('Error sending verification SMS:', error);
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Unknown error sending verification code'
    };
  }
}

// Client-side function to verify code
export async function verifyCode(
  requestId: string,
  phoneNumber: string,
  countryCode: string,
  code: string
): Promise<{ success: boolean; message: string; attemptsLeft?: number }> {
  try {
    const response = await fetch('/api/auth/verify/check', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        requestId,
        phoneNumber,
        countryCode,
        code
      })
    });
    
    return await response.json();
  } catch (error) {
    console.error('Error verifying code:', error);
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Unknown error verifying code'
    };
  }
} 