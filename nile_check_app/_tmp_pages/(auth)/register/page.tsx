"use client";

import { useState } from "react";
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

export default function RegisterPage() {
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
    <div className="flex justify-center items-center min-h-screen bg-slate-50 px-4 py-12">
      <Card className="w-full max-w-md shadow-lg">
        <CardHeader className="space-y-2 text-center">
          <CardTitle className="text-2xl font-bold">Nile Check 회원가입</CardTitle>
          <CardDescription>
            {step === 'verify' 
              ? '전화번호 인증을 완료해주세요.' 
              : '회원 정보를 입력해주세요.'}
          </CardDescription>
        </CardHeader>
        
        <CardContent>
          {error && (
            <Alert variant="destructive" className="mb-4">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          
          {successMessage && (
            <Alert className="mb-4 border-green-200 bg-green-50">
              <CheckCircle2 className="h-4 w-4 text-green-500" />
              <AlertDescription className="text-green-700">
                {successMessage}
                {process.env.NODE_ENV === 'development' && (
                  <div className="mt-1 p-1 bg-yellow-100 border border-yellow-300 rounded text-yellow-800">
                    <strong>개발 환경:</strong> 인증번호는 항상 <code className="bg-white px-1 rounded">000000</code> 입니다.
                  </div>
                )}
              </AlertDescription>
            </Alert>
          )}
          
          {step === 'verify' ? (
            // Phone verification form
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="phoneNumber">전화번호</Label>
                <div className="flex gap-2">
                  <Input
                    id="phoneNumber"
                    type="tel"
                    placeholder="010-0000-0000"
                    value={phoneNumber}
                    onChange={handlePhoneNumberChange}
                    disabled={isVerified}
                    required
                    autoComplete="tel"
                    className="bg-white flex-1"
                  />
                  <Button 
                    type="button" 
                    variant="outline"
                    onClick={handleSendVerificationCode}
                    disabled={isSendingCode || isVerified}
                    className="whitespace-nowrap"
                  >
                    {isSendingCode ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : null}
                    인증번호 발송
                  </Button>
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="verificationCode">인증번호</Label>
                <div className="flex gap-2">
                  <Input
                    id="verificationCode"
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    maxLength={6}
                    placeholder="6자리 인증번호"
                    value={verificationCode}
                    onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, ''))}
                    disabled={isVerified}
                    required
                    className="bg-white flex-1"
                  />
                  <Button 
                    type="button"
                    variant={isVerified ? "outline" : "default"}
                    onClick={handleVerifyCode}
                    disabled={isVerifyingCode || isVerified || !verificationCode || verificationCode.length !== 6}
                    className="whitespace-nowrap"
                  >
                    {isVerifyingCode ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : isVerified ? (
                      <CheckCircle2 className="mr-2 h-4 w-4 text-green-500" />
                    ) : null}
                    {isVerified ? "인증 완료" : "인증 확인"}
                  </Button>
                </div>
              </div>
              
              {isVerified && (
                <Button 
                  className="w-full mt-4" 
                  onClick={() => setStep('register')}
                >
                  다음 단계
                </Button>
              )}
            </div>
          ) : (
            // Registration form
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">이름</Label>
                <Input
                  id="name"
                  type="text"
                  placeholder="이름을 입력하세요"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  autoComplete="name"
                  className="bg-white"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="verifiedPhone">전화번호</Label>
                <Input
                  id="verifiedPhone"
                  type="tel"
                  value={phoneNumber}
                  disabled
                  className="bg-slate-50"
                />
                <p className="text-xs text-green-600 flex items-center">
                  <CheckCircle2 className="h-3 w-3 mr-1" /> 인증 완료
                </p>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="email">이메일 (선택사항)</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="이메일을 입력하세요"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoComplete="email"
                  className="bg-white"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="password">비밀번호</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="비밀번호를 입력하세요 (6자 이상)"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={6}
                  autoComplete="new-password"
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
                  autoComplete="new-password"
                  className="bg-white"
                />
              </div>
              
              <div className="flex gap-2 mt-6">
                <Button 
                  type="button" 
                  variant="outline" 
                  className="flex-1"
                  onClick={() => setStep('verify')}
                >
                  이전
                </Button>
                <Button 
                  type="submit" 
                  className="flex-1" 
                  disabled={isSubmitting}
                >
                  {isSubmitting && (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  )}
                  회원가입
                </Button>
              </div>
            </form>
          )}
        </CardContent>
        
        <CardFooter className="flex justify-center">
          <p className="text-sm text-muted-foreground">
            이미 계정이 있으신가요?{" "}
            <Link href="/login" className="text-primary hover:underline">
              로그인
            </Link>
          </p>
        </CardFooter>
      </Card>
    </div>
  );
}