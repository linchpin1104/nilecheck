"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertCircle, Loader2 } from "lucide-react";
import Link from "next/link";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { CountrySelector } from "@/components/ui/country-selector";
import { validatePhoneNumber, formatPhoneNumber } from "@/lib/verification/phone-service";

export default function ForgotPasswordPage() {
  const [phoneNumber, setPhoneNumber] = useState("");
  const [countryCode, setCountryCode] = useState("KR");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Reset error and success state
    setError(null);
    setSuccess(false);
    
    // Validate phone number
    if (!validatePhoneNumber(phoneNumber, countryCode)) {
      setError("유효한 전화번호를 입력해주세요.");
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      // 전화번호를 E.164 형식으로 변환
      const formattedPhoneNumber = formatPhoneNumber(phoneNumber, countryCode);
      
      // 비밀번호 찾기 요청 구현 예정
      // 현재는 가짜 응답만 처리
      setTimeout(() => {
        setSuccess(true);
        setIsSubmitting(false);
      }, 1000);
      
    } catch (err) {
      console.error("비밀번호 찾기 중 오류:", err);
      setError("요청 처리 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.");
      setIsSubmitting(false);
    }
  };
  
  const handlePhoneNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Only allow digits and hyphens
    const value = e.target.value.replace(/[^\d-]/g, '');
    setPhoneNumber(value);
  };
  
  const handleCountryChange = (code: string) => {
    setCountryCode(code);
  };
  
  return (
    <div className="flex justify-center items-center min-h-screen bg-slate-50 px-4">
      <Card className="w-full max-w-md shadow-lg">
        <CardHeader className="space-y-2 text-center">
          <CardTitle className="text-2xl font-bold">비밀번호 찾기</CardTitle>
          <CardDescription>가입하신 전화번호를 입력해주세요.</CardDescription>
        </CardHeader>
        
        <CardContent>
          {success ? (
            <div className="text-center space-y-4">
              <Alert className="bg-green-50 border-green-200">
                <AlertDescription className="text-green-800">
                  비밀번호 재설정 안내가 발송되었습니다. 전화번호로 전송된 메시지를 확인해주세요.
                </AlertDescription>
              </Alert>
              
              <Button 
                asChild
                className="w-full mt-4"
              >
                <Link href="/login">로그인 페이지로 돌아가기</Link>
              </Button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <Alert variant="destructive" className="mb-4">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}
              
              <div className="space-y-2">
                <Label htmlFor="phoneNumber">전화번호</Label>
                <div className="flex gap-2">
                  <div className="w-32">
                    <CountrySelector
                      value={countryCode}
                      onChange={handleCountryChange}
                    />
                  </div>
                  <div className="flex-1">
                    <Input
                      id="phoneNumber"
                      type="tel"
                      inputMode="tel"
                      placeholder={countryCode === "KR" ? "010-0000-0000" : "Phone number"}
                      value={phoneNumber}
                      onChange={handlePhoneNumberChange}
                      required
                      autoComplete="tel"
                      className="bg-white w-full"
                    />
                  </div>
                </div>
              </div>
              
              <Button 
                type="submit" 
                className="w-full mt-6" 
                disabled={isSubmitting}
              >
                {isSubmitting && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                비밀번호 찾기
              </Button>
              
              <div className="text-center text-sm mt-4">
                <Link href="/login" className="text-primary hover:underline">
                  로그인 페이지로 돌아가기
                </Link>
              </div>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
} 