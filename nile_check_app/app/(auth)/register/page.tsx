"use client";

import { useState, Suspense } from "react";
import { useRouter } from "next/navigation";
import useAuth from "@/hooks/useAuth";
import { isValidKoreanPhoneNumber } from "@/lib/solapi";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertCircle, Loader2, CheckCircle2 } from "lucide-react";
import Link from "next/link";
import { Alert, AlertDescription } from "@/components/ui/alert";

// 클라이언트 컴포넌트 - useRouter를 사용하는 부분
function RegisterForm() {
  const router = useRouter();
  const { register } = useAuth();
  
  // Form fields
  const [name, setName] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [verificationCode, setVerificationCode] = useState("");
  
  // UI states
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSendingCode, setIsSendingCode] = useState(false);
  const [isVerifyingCode, setIsVerifyingCode] = useState(false);
  const [isVerified, setIsVerified] = useState(false);
  const [step, setStep] = useState<'verify' | 'register'>('verify');
  const [verificationRequestId, setVerificationRequestId] = useState<string | null>(null);
  
  const handleSendVerificationCode = async () => {
    // Reset states
    setError(null);
    setSuccessMessage(null);
    
    // Validate phone number
    if (!isValidKoreanPhoneNumber(phoneNumber)) {
      setError("유효한 전화번호를 입력해주세요.");
      return;
    }
    
    setIsSendingCode(true);
    
    try {
      // Call our verification API endpoint
      const response = await fetch('/api/auth/verify/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ phoneNumber })
      });
      
      const data = await response.json();
      
      if (data.success) {
        setVerificationRequestId(data.requestId);
        setSuccessMessage("인증번호가 발송되었습니다. 실제 문자는 발송되지 않으며, 테스트 코드는 000000입니다.");
      } else {
        setError(data.message || "인증번호 발송에 실패했습니다.");
      }
    } catch (err) {
      setError("인증번호 발송 중 오류가 발생했습니다. 다시 시도해주세요.");
      console.error(err);
    } finally {
      setIsSendingCode(false);
    }
  };
  
  const handleVerifyCode = async () => {
    // Reset states
    setError(null);
    setSuccessMessage(null);
    
    // Validate verification code
    if (!verificationCode || verificationCode.length !== 6) {
      setError("유효한 인증번호를 입력해주세요.");
      return;
    }
    
    if (!verificationRequestId) {
      setError("인증번호를 먼저 요청해주세요.");
      return;
    }
    
    setIsVerifyingCode(true);
    
    try {
      const response = await fetch('/api/auth/verify/check', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ 
          requestId: verificationRequestId,
          phoneNumber,
          code: verificationCode
        })
      });
      
      const data = await response.json();
      
      if (data.success) {
        setIsVerified(true);
        setSuccessMessage("전화번호 인증이 완료되었습니다.");
        setStep('register');
      } else {
        setError(data.message || "인증번호가 일치하지 않습니다.");
      }
    } catch (err) {
      setError("인증번호 확인 중 오류가 발생했습니다. 다시 시도해주세요.");
      console.error(err);
    } finally {
      setIsVerifyingCode(false);
    }
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
    
    // Reset verification if phone number changes
    if (formatted !== phoneNumber) {
      setIsVerified(false);
      setVerificationRequestId(null);
    }
    
    setPhoneNumber(formatted);
  };
  
  return (
    <Card className="w-full max-w-md shadow-lg">
      <CardHeader className="space-y-2 text-center">
        <CardTitle className="text-2xl font-bold">Nile Check 회원가입</CardTitle>
        <CardDescription>
          {step === 'verify' 
            ? "전화번호 인증 후 회원가입을 진행해주세요." 
            : "회원 정보를 입력해주세요."}
        </CardDescription>
      </CardHeader>
      
      <CardContent>
        <form onSubmit={step === 'register' ? handleSubmit : undefined} className="space-y-4">
          {error && (
            <Alert variant="destructive" className="mb-4">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          
          {successMessage && (
            <Alert className="mb-4 bg-green-50 border-green-200 text-green-800">
              <CheckCircle2 className="h-4 w-4 text-green-500" />
              <AlertDescription>{successMessage}</AlertDescription>
            </Alert>
          )}
          
          {/* 1단계: 전화번호 인증 */}
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="phoneNumber" className="flex items-center">
                전화번호
                {isVerified && (
                  <span className="ml-2 text-xs text-green-600 flex items-center">
                    <CheckCircle2 className="h-3 w-3 mr-1" /> 인증됨
                  </span>
                )}
              </Label>
              <div className="flex space-x-2">
                <Input
                  id="phoneNumber"
                  type="tel"
                  placeholder="010-0000-0000"
                  value={phoneNumber}
                  onChange={handlePhoneNumberChange}
                  disabled={isVerified || step === 'register'}
                  required
                  className="bg-white flex-1"
                />
                <Button 
                  type="button" 
                  onClick={handleSendVerificationCode}
                  disabled={isSendingCode || isVerified || step === 'register'}
                  className="whitespace-nowrap"
                >
                  {isSendingCode ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      전송 중
                    </>
                  ) : "인증번호 전송"}
                </Button>
              </div>
            </div>
            
            {(verificationRequestId || step === 'verify') && (
              <div className="space-y-2">
                <Label htmlFor="verificationCode">인증번호</Label>
                <div className="flex space-x-2">
                  <Input
                    id="verificationCode"
                    type="text"
                    inputMode="numeric"
                    placeholder="000000"
                    maxLength={6}
                    value={verificationCode}
                    onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, ''))}
                    disabled={isVerified || step === 'register'}
                    className="bg-white flex-1"
                  />
                  <Button 
                    type="button" 
                    onClick={handleVerifyCode}
                    disabled={isVerifyingCode || !verificationCode || isVerified || step === 'register'}
                  >
                    {isVerifyingCode ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        확인 중
                      </>
                    ) : "확인"}
                  </Button>
                </div>
              </div>
            )}
          </div>
          
          {/* 2단계: 회원 정보 입력 */}
          {step === 'register' && (
            <div className="space-y-4 pt-3 border-t">
              <div className="space-y-2">
                <Label htmlFor="name">이름</Label>
                <Input
                  id="name"
                  placeholder="이름을 입력하세요"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  className="bg-white"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="email">이메일 (선택)</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="example@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="bg-white"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="password">비밀번호</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="6자 이상 입력하세요"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="bg-white"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="confirmPassword">비밀번호 확인</Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  placeholder="비밀번호를 다시 입력하세요"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  className="bg-white"
                />
              </div>
              
              <Button 
                type="submit" 
                className="w-full mt-6" 
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    처리 중...
                  </>
                ) : "회원가입"}
              </Button>
            </div>
          )}
          
          {step === 'verify' && isVerified && (
            <Button 
              type="button" 
              className="w-full"
              onClick={() => setStep('register')}
            >
              다음 단계
            </Button>
          )}
        </form>
      </CardContent>
      
      <CardFooter className="flex justify-center border-t pt-4">
        <div className="text-center text-sm">
          <span className="text-muted-foreground">이미 계정이 있으신가요?</span>{" "}
          <Link href="/login" className="text-primary hover:underline">
            로그인
          </Link>
        </div>
      </CardFooter>
    </Card>
  );
}

// 메인 회원가입 페이지 컴포넌트
export default function RegisterPage() {
  return (
    <div className="flex justify-center items-center min-h-screen bg-slate-50 px-4 py-12">
      <Suspense fallback={
        <div className="w-full max-w-md p-8 flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      }>
        <RegisterForm />
      </Suspense>
    </div>
  );
} 