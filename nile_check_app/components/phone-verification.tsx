"use client";

import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CountrySelector } from "@/components/ui/country-selector";
import { useToast } from "@/hooks/use-toast";
import { 
  formatPhoneNumber, 
  validatePhoneNumber, 
  standardizePhoneNumber,
  sendVerificationSMS,
  verifyCode
} from "@/lib/verification/phone-service";

interface PhoneVerificationProps {
  onVerified: (phoneNumber: string, countryCode: string) => void;
  initialCountryCode?: string;
}

export function PhoneVerification({ 
  onVerified, 
  initialCountryCode = "KR" 
}: PhoneVerificationProps) {
  const { toast } = useToast();
  
  // State for phone number and verification
  const [countryCode, setCountryCode] = useState(initialCountryCode);
  const [phoneNumber, setPhoneNumber] = useState("");
  const [isPhoneValid, setIsPhoneValid] = useState(false);
  const [codeSent, setCodeSent] = useState(false);
  const [requestId, setRequestId] = useState("");
  const [userEnteredCode, setUserEnteredCode] = useState("");
  const [isVerifying, setIsVerifying] = useState(false);
  const [isSendingCode, setIsSendingCode] = useState(false);
  const [resendEnabled, setResendEnabled] = useState(false);
  const [resendCountdown, setResendCountdown] = useState(0);

  // Format phone number as user types
  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const input = e.target.value;
    
    // Only allow digits, spaces, and hyphens
    const filtered = input.replace(/[^\d\s-]/g, '');
    setPhoneNumber(filtered);
    
    // Validate the phone number
    setIsPhoneValid(validatePhoneNumber(filtered, countryCode));
  };

  // Handle country selection change
  const handleCountryChange = (code: string) => {
    setCountryCode(code);
    // Re-validate phone number when country changes
    setIsPhoneValid(validatePhoneNumber(phoneNumber, code));
  };

  // Send verification code
  const handleSendCode = async () => {
    try {
      setIsSendingCode(true);
      
      // Call the API to send verification code
      const result = await sendVerificationSMS(phoneNumber, countryCode, "");
      
      if (result.success) {
        setCodeSent(true);
        setRequestId(result.requestId || "");
        
        // Start countdown for resend button
        setResendCountdown(60);
        
        toast({
          title: "Verification code sent",
          description: `We sent a code to ${standardizePhoneNumber(phoneNumber, countryCode)}`,
        });
        
        // Show test code in development
        if (result.testCode) {
          console.log(`[Dev] Verification code: ${result.testCode}`);
          toast({
            title: "Dev Mode: Verification Code",
            description: `Code: ${result.testCode}`,
            variant: "default",
          });
        }
      } else {
        toast({
          title: "Failed to send code",
          description: result.message,
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Error sending code",
        description: error instanceof Error ? error.message : "An unknown error occurred",
        variant: "destructive",
      });
    } finally {
      setIsSendingCode(false);
    }
  };

  // Verify the code entered by the user
  const handleVerifyCode = async () => {
    setIsVerifying(true);
    
    try {
      // Call the API to verify the code
      const result = await verifyCode(
        requestId,
        phoneNumber,
        countryCode,
        userEnteredCode
      );
      
      if (result.success) {
        // Format the phone number for storage
        const formattedNumber = formatPhoneNumber(phoneNumber, countryCode);
        
        toast({
          title: "Verification successful",
          description: "Your phone number has been verified.",
        });
        
        // Call the callback function with verified phone info
        onVerified(formattedNumber, countryCode);
      } else {
        toast({
          title: "Verification failed",
          description: result.message || "The code you entered is incorrect.",
          variant: "destructive",
        });
        
        // Show attempts left if provided
        if (result.attemptsLeft !== undefined) {
          toast({
            title: "Attempts remaining",
            description: `You have ${result.attemptsLeft} attempts left.`,
            variant: "default",
          });
        }
      }
    } catch (error) {
      toast({
        title: "Error verifying code",
        description: error instanceof Error ? error.message : "An unknown error occurred",
        variant: "destructive",
      });
    } finally {
      setIsVerifying(false);
    }
  };

  // Countdown timer for resend button
  useEffect(() => {
    if (resendCountdown > 0) {
      const timer = setTimeout(() => {
        setResendCountdown(prev => prev - 1);
      }, 1000);
      
      return () => clearTimeout(timer);
    } else if (codeSent) {
      setResendEnabled(true);
    }
  }, [resendCountdown, codeSent]);

  return (
    <div className="space-y-4 w-full">
      <div className="space-y-2">
        <Label htmlFor="phone">Phone Number</Label>
        <div className="flex gap-2">
          <div className="w-32">
            <CountrySelector
              value={countryCode}
              onChange={handleCountryChange}
            />
          </div>
          <div className="flex-1">
            <Input
              id="phone"
              type="tel"
              placeholder={countryCode === "KR" ? "010-1234-5678" : "Phone number"}
              value={phoneNumber}
              onChange={handlePhoneChange}
              className="w-full"
              disabled={codeSent && !resendEnabled}
            />
          </div>
        </div>
        <p className="text-xs text-muted-foreground">
          {countryCode === "KR" 
            ? "Please enter your phone number without country code (e.g. 010-1234-5678)"
            : "Please enter your phone number"}
        </p>
      </div>

      {!codeSent ? (
        <Button 
          onClick={handleSendCode} 
          disabled={!isPhoneValid || isSendingCode}
          className="w-full"
        >
          {isSendingCode ? "Sending..." : "Send Verification Code"}
        </Button>
      ) : (
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="verification-code">Verification Code</Label>
            <Input
              id="verification-code"
              placeholder="Enter the 6-digit code"
              value={userEnteredCode}
              onChange={(e) => setUserEnteredCode(e.target.value)}
              maxLength={6}
            />
          </div>
          
          <div className="flex flex-col sm:flex-row gap-2">
            <Button 
              onClick={handleVerifyCode} 
              disabled={userEnteredCode.length !== 6 || isVerifying}
              className="flex-1"
            >
              {isVerifying ? "Verifying..." : "Verify Code"}
            </Button>
            
            <Button 
              variant="outline" 
              onClick={handleSendCode}
              disabled={!resendEnabled || isSendingCode}
              className="sm:w-1/3"
            >
              {resendCountdown > 0 
                ? `Resend (${resendCountdown}s)` 
                : isSendingCode ? "Sending..." : "Resend Code"}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
} 