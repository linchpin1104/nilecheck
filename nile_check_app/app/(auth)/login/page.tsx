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
  const { login: contextLogin } = useSession();
  
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
      const formattedPhoneNumber = formatPhoneNumber(phoneNumber, countryCode);
      console.log("로그인 시도:", { formattedPhoneNumber, password });
      
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phoneNumber: formattedPhoneNumber, password }),
      });
      
      const result = await response.json();
      console.log("로그인 결과:", result);
      
      if (result.success && result.user) {
        console.log("로그인 성공, 세션 컨텍스트 업데이트 후 페이지 이동");
        
        // 1. Store in localStorage (for persistence across browser close/reopen)
        const authData = JSON.stringify({
          isAuthenticated: true,
          currentUser: result.user
        });
        localStorage.setItem('nile-check-auth', authData);
        console.log("로컬 스토리지에 인증 정보 저장됨:", result.user?.id || "사용자 ID 없음");

        // 2. Update SessionProvider context state
        contextLogin(result.user); 
        
        // 3. Add a small stability delay before redirecting 
        // This gives the browser time to process cookies and localStorage updates
        console.log("세션 안정화를 위해 500ms 대기 중...");
        
        // 4. Redirect
        const redirectTo = callbackUrl || result.redirectUrl || "/log-activity";
        console.log("리다이렉션 시작 - 대상:", redirectTo);
        
        try {
          // Longer delay to help ensure state updates propagate before navigation
          setTimeout(() => {
            // router.push might switch domains in some Vercel preview environments
            // Use window.location with the current origin to keep the same domain
            const currentOrigin = window.location.origin;
            
            // Check if redirectTo is a relative path (starts with /)
            if (redirectTo.startsWith('/')) {
              const fullUrl = `${currentOrigin}${redirectTo}`;
              console.log(`페이지 강제 이동 실행: ${fullUrl}`);
              
              // Try multiple ways to ensure redirection works
              try {
                window.location.href = fullUrl;
                
                // If direct assignment doesn't trigger navigation, try these alternatives
                setTimeout(() => {
                  console.log("백업 리다이렉션 시도...");
                  window.location.replace(fullUrl);
                }, 200);
              } catch (navError) {
                console.error("리다이렉션 오류:", navError);
                alert("페이지 이동 중 오류가 발생했습니다. 새로고침 후 다시 시도해주세요.");
              }
            } else {
              console.log(`페이지 이동: ${redirectTo}`);
              window.location.href = redirectTo;
            }
          }, 500); // 500ms delay to ensure cookies and state are fully processed
        } catch (redirectError) {
          console.error("리다이렉션 처리 중 오류:", redirectError);
          alert("로그인은 완료되었으나 페이지 이동에 실패했습니다. 직접 /log-activity 페이지로 이동해주세요.");
        }
        
        // No longer calling checkSession() here, SessionProvider on next page will handle it.
        // await checkSession(); 
        
        // setIsSubmitting is handled in finally block
        return; // Return to prevent falling through to error handling for success case
      } else {
        console.log("로그인 실패:", result.message || "사용자 정보 없음");
        setError(result.message || "로그인에 실패했습니다. 사용자 정보를 확인해주세요.");
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