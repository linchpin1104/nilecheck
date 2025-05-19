"use client";

import { useState, Suspense } from "react";
import { useRouter } from "next/navigation";
import useAuth from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertCircle, Loader2, CheckCircle2 } from "lucide-react";
import Link from "next/link";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { PhoneVerification } from "@/components/phone-verification";

// 클라이언트 컴포넌트 - useRouter를 사용하는 부분
function RegisterForm() {
  const router = useRouter();
  const { register } = useAuth();
  
  // Form fields
  const [name, setName] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [countryCode, setCountryCode] = useState("KR");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  
  // UI states
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isVerified, setIsVerified] = useState(false);
  
  const handlePhoneVerified = (formattedPhone: string, country: string) => {
    setPhoneNumber(formattedPhone);
    setCountryCode(country);
    setIsVerified(true);
  };
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Reset error state
    setError(null);
    
    // Validate form
    if (!name) {
      setError("이름을 입력해주세요.");
      return;
    }
    
    if (!isVerified) {
      setError("전화번호 인증이 필요합니다.");
      return;
    }
    
    if (!password || password.length < 6) {
      setError("비밀번호는 6자 이상이어야 합니다.");
      return;
    }
    
    if (password !== confirmPassword) {
      setError("비밀번호가 일치하지 않습니다.");
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      const result = await register({
        name, 
        phoneNumber,
        countryCode,
        email: email || undefined,
        password
      });
      
      if (result.success) {
        // Navigate to dashboard on success
        router.push("/log-activity");
      } else {
        setError(result.message);
      }
    } catch (err) {
      setError("회원가입 중 오류가 발생했습니다. 다시 시도해주세요.");
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };
  
  return (
    <Card className="w-full max-w-md shadow-lg">
      <CardHeader className="space-y-2 text-center">
        <CardTitle className="text-2xl font-bold">더나일체크 회원가입</CardTitle>
        <CardDescription>
          전화번호 인증 후 회원가입을 진행해주세요.
        </CardDescription>
      </CardHeader>
      
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          {error && (
            <Alert variant="destructive" className="mb-4">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* Phone Verification Section */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-medium">전화번호 인증</h3>
              {isVerified && (
                <span className="text-sm text-green-600 flex items-center">
                  <CheckCircle2 className="h-4 w-4 mr-1" /> 인증완료
                </span>
              )}
            </div>
            
            {isVerified ? (
              <div className="p-3 border rounded-md bg-gray-50">
                <p className="text-sm font-medium">{phoneNumber}</p>
                <p className="text-xs text-muted-foreground">
                  다른 번호로 인증하려면 페이지를 새로고침 하세요.
                </p>
              </div>
            ) : (
              <PhoneVerification onVerified={handlePhoneVerified} />
            )}
          </div>

          {/* Registration Form */}
          <div className={`space-y-4 ${isVerified ? 'opacity-100' : 'opacity-50 pointer-events-none'}`}>
            <div className="space-y-2">
              <Label htmlFor="name">이름</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                disabled={!isVerified}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="email">이메일 (선택)</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={!isVerified}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="password">비밀번호</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                disabled={!isVerified}
                minLength={6}
              />
              <p className="text-xs text-muted-foreground">
                비밀번호는 6자 이상이어야 합니다.
              </p>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="confirmPassword">비밀번호 확인</Label>
              <Input
                id="confirmPassword"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                disabled={!isVerified}
              />
            </div>
            
            <Button 
              type="submit" 
              className="w-full"
              disabled={isSubmitting || !isVerified}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  처리 중...
                </>
              ) : "회원가입"}
            </Button>
          </div>
        </form>
      </CardContent>
      
      <CardFooter className="flex justify-center border-t p-4">
        <p className="text-sm text-muted-foreground">
          이미 계정이 있으신가요? 
          <Link href="/login" className="text-primary font-medium ml-1">
            로그인하기
          </Link>
        </p>
      </CardFooter>
    </Card>
  );
}

export default function RegisterPage() {
  return (
    <div className="flex items-center justify-center min-h-screen px-4 py-12 bg-gray-50">
      <Suspense fallback={
        <div className="flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      }>
        <RegisterForm />
      </Suspense>
    </div>
  );
} 