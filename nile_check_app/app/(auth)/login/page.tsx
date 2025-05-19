"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { useAuthStore } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertCircle, Info, Loader2 } from "lucide-react";
import Link from "next/link";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { CountrySelector } from "@/components/ui/country-selector";
import { validatePhoneNumber, formatPhoneNumber } from "@/lib/verification/phone-service";
import { useSession } from "@/contexts/SessionProvider";

// 서버 컴포넌트가 이 페이지를 정적 생성하지 않도록 지정
export const dynamic = 'force-dynamic';

// SearchParams를 사용하는 클라이언트 컴포넌트
function LoginForm() {
  const searchParams = useSearchParams();
  const { isLoading: authIsLoading } = useAuthStore();
  const { checkSession } = useSession();
  
  const [phoneNumber, setPhoneNumber] = useState("");
  const [countryCode, setCountryCode] = useState("KR");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [callbackUrl, setCallbackUrl] = useState<string | null>(null);
  const [sessionExpired, setSessionExpired] = useState(false);
  
  useEffect(() => {
    // Get the callback URL and other parameters from the query parameters
    if (searchParams) {
      const callback = searchParams.get('callbackUrl');
      if (callback) {
        setCallbackUrl(callback);
      }
      
      // 세션 만료 체크
      const expired = searchParams.get('session_expired');
      if (expired === 'true') {
        setSessionExpired(true);
      }
    }
    
    // 화면 확대 방지를 위한 추가 설정
    const preventZoom = (e: TouchEvent) => {
      if (e.touches.length > 1) {
        e.preventDefault();
      }
    };
    
    document.addEventListener('touchstart', preventZoom, { passive: false });
    
    return () => {
      document.removeEventListener('touchstart', preventZoom);
    };
  }, [searchParams]);
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Reset error state
    setError(null);
    
    // Validate phone number
    if (!validatePhoneNumber(phoneNumber, countryCode)) {
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
      // 전화번호를 E.164 형식으로 변환 (서버에서 처리할 수 있게)
      const formattedPhoneNumber = formatPhoneNumber(phoneNumber, countryCode);
      console.log("로그인 시도:", { formattedPhoneNumber, password });
      
      // 서버 API 직접 호출
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ phoneNumber: formattedPhoneNumber, password }),
      });
      
      const result = await response.json();
      console.log("로그인 결과:", result);
      
      if (result.success) {
        console.log("로그인 성공, 세션 갱신 후 페이지 이동");
        
        try {
          // 세션 정보 갱신
          await checkSession();
          
          // 강제 페이지 이동으로 변경하여 라우팅 문제 해결
          setTimeout(() => {
            if (callbackUrl) {
              window.location.href = callbackUrl;
            } else {
              window.location.href = "/dashboard";
            }
          }, 100); // 짧은 지연 후 리다이렉트하여 세션 체크가 완료될 시간 확보
        } catch (err) {
          console.error("세션 갱신 중 오류:", err);
          setError("세션 갱신 중 오류가 발생했습니다. 다시 시도해주세요.");
          setIsSubmitting(false);
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
  
  // 국가 코드 변경 핸들러
  const handleCountryChange = (code: string) => {
    setCountryCode(code);
    // 국가 코드가 변경되면 전화번호 유효성 재검사
    // setPhoneNumber(""); // 국가가 변경되면 번호를 초기화할지 여부를 결정
  };
  
  const handlePhoneNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Only allow digits and hyphens
    const value = e.target.value.replace(/[^\d-]/g, '');
    setPhoneNumber(value);
  };
  
  return (
    <Card className="w-full max-w-md shadow-lg">
      <CardHeader className="space-y-2 text-center">
        <CardTitle className="text-2xl font-bold">더나일체크 로그인</CardTitle>
        <CardDescription>전화번호와 비밀번호를 입력하여 로그인하세요.</CardDescription>
      </CardHeader>
      
      <CardContent>
        {sessionExpired && (
          <Alert className="mb-4 bg-yellow-50 border-yellow-200">
            <Info className="h-4 w-4 text-yellow-600" />
            <AlertDescription className="text-yellow-800">
              세션이 만료되었습니다. 다시 로그인해주세요.
            </AlertDescription>
          </Alert>
        )}
      
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
            disabled={isSubmitting || authIsLoading}
          >
            {(isSubmitting || authIsLoading) && (
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
  );
}

// 메인 로그인 페이지 컴포넌트
export default function LoginPage() {
  return (
    <div className="flex justify-center items-center min-h-screen bg-slate-50 px-4 touch-manipulation overscroll-none">
      <Suspense fallback={
        <div className="w-full max-w-md p-8 flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      }>
        <LoginForm />
      </Suspense>
    </div>
  );
} 