"use client";

import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { useAuthStore } from "@/lib/auth";
import { isValidKoreanPhoneNumber } from "@/lib/solapi";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertCircle, Loader2 } from "lucide-react";
import Link from "next/link";
import { Alert, AlertDescription } from "@/components/ui/alert";

// 서버 컴포넌트가 이 페이지를 정적 생성하지 않도록 지정
export const dynamic = 'force-dynamic';

export default function LoginPage() {
  const searchParams = useSearchParams();
  const { isLoading } = useAuthStore();
  
  const [phoneNumber, setPhoneNumber] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [callbackUrl, setCallbackUrl] = useState<string | null>(null);
  
  useEffect(() => {
    // Get the callback URL from the query parameters
    if (searchParams) {
      const callback = searchParams.get('callbackUrl');
      if (callback) {
        setCallbackUrl(callback);
      }
    }
  }, [searchParams]);
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Reset error state
    setError(null);
    
    // Validate phone number
    if (!isValidKoreanPhoneNumber(phoneNumber)) {
      setError("유효한 전화번호를 입력해주세요.");
      return;
    }
    
    // Validate password
    if (!password || password.length < 6) {
      setError("비밀번호는 6자 이상이어야 합니다.");
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      console.log("로그인 시도:", { phoneNumber, password });
      
      // 서버 API 직접 호출
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ phoneNumber, password }),
      });
      
      const result = await response.json();
      console.log("로그인 결과:", result);
      
      if (result.success) {
        console.log("로그인 성공, 페이지 이동:", callbackUrl || "/dashboard");
        
        // 세션 가져오기
        await fetch('/api/auth/session').then(res => res.json());
        
        // 모든 사용자에 대해 window.location.href 사용
        // router.push() 대신 직접 이동하여 문제 우회
        if (callbackUrl) {
          window.location.href = callbackUrl;
        } else {
          window.location.href = "/dashboard";
        }
        return;
      } else {
        console.log("로그인 실패:", result.message);
        setError(result.message);
      }
    } catch (err) {
      console.error("로그인 예외 발생:", err);
      setError("로그인 중 오류가 발생했습니다. 다시 시도해주세요.");
    } finally {
      setIsSubmitting(false);
    }
  };
  
  const handlePhoneNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Only allow digits and hyphens
    const value = e.target.value.replace(/[^\d-]/g, '');
    
    // Automatic formatting: XXX-XXXX-XXXX
    let formatted = value.replace(/-/g, '');
    if (formatted.length > 3 && formatted.length <= 7) {
      formatted = `${formatted.slice(0, 3)}-${formatted.slice(3)}`;
    } else if (formatted.length > 7) {
      formatted = `${formatted.slice(0, 3)}-${formatted.slice(3, 7)}-${formatted.slice(7, 11)}`;
    }
    
    setPhoneNumber(formatted);
  };
  
  return (
    <div className="flex justify-center items-center min-h-screen bg-slate-50 px-4">
      <Card className="w-full max-w-md shadow-lg">
        <CardHeader className="space-y-2 text-center">
          <CardTitle className="text-2xl font-bold">Nile Check 로그인</CardTitle>
          <CardDescription>전화번호와 비밀번호를 입력하여 로그인하세요.</CardDescription>
        </CardHeader>
        
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <Alert variant="destructive" className="mb-4">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
            
            <div className="space-y-2">
              <Label htmlFor="phoneNumber">전화번호</Label>
              <Input
                id="phoneNumber"
                type="tel"
                placeholder="010-0000-0000"
                value={phoneNumber}
                onChange={handlePhoneNumberChange}
                required
                autoComplete="tel"
                className="bg-white"
              />
            </div>
            
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="password">비밀번호</Label>
                <Link 
                  href="/forgot-password" 
                  className="text-xs text-primary hover:underline"
                >
                  비밀번호 찾기
                </Link>
              </div>
              <Input
                id="password"
                type="password"
                placeholder="비밀번호를 입력하세요"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="current-password"
                className="bg-white"
              />
            </div>
            
            <Button 
              type="submit" 
              className="w-full mt-6" 
              disabled={isSubmitting || isLoading}
            >
              {(isSubmitting || isLoading) && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              로그인
            </Button>
            
            <div className="text-center text-sm mt-4">
              <span className="text-muted-foreground">계정이 없으신가요?</span>{" "}
              <Link href="/register" className="text-primary hover:underline">
                회원가입
              </Link>
            </div>
            
            {process.env.NODE_ENV === 'development' && (
              <Button 
                type="button" 
                className="w-full mt-4" 
                variant="secondary"
                onClick={() => {
                  // 테스트 계정 자동 입력
                  setPhoneNumber("010-4321-5678");
                  setPassword("123456");
                }}
              >
                테스트 계정 자동 입력
              </Button>
            )}
          </form>
        </CardContent>
      </Card>
    </div>
  );
} 