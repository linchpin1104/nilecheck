"use client";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

export default function DebugLoginPage() {
  // Emergency login function
  const forceLogin = () => {
    const testUser = {
      id: "user_default",
      phoneNumber: "010-1234-5678", 
      name: "테스트 사용자",
      email: "test@example.com",
      createdAt: new Date().toISOString()
    };
    
    // Create auth state directly in localStorage
    localStorage.setItem('nile-check-auth', JSON.stringify({
      state: {
        currentUser: testUser,
        isAuthenticated: true,
        users: [{ ...testUser, password: "123456" }],
        verificationRequests: []
      },
      version: 0
    }));
    
    alert('로그인 상태가 성공적으로 설정되었습니다. 이제 페이지로 이동합니다.');
    
    // Redirect to dashboard
    window.location.href = '/dashboard';
  };
  
  // Display current auth state
  const showCurrentAuth = () => {
    const authData = localStorage.getItem('nile-check-auth');
    
    if (authData) {
      try {
        const parsed = JSON.parse(authData);
        alert(`현재 인증 상태:\n${JSON.stringify(parsed, null, 2)}`);
      } catch (e) {
        alert(`인증 데이터를 파싱할 수 없습니다: ${e}`);
      }
    } else {
      alert('인증 데이터가 없습니다. 로그인되지 않은 상태입니다.');
    }
  };
  
  // Clear auth state
  const clearAuth = () => {
    localStorage.removeItem('nile-check-auth');
    alert('인증 데이터가 삭제되었습니다.');
    window.location.reload();
  };
  
  return (
    <div className="flex justify-center items-center min-h-screen bg-slate-50 p-4">
      <Card className="w-full max-w-md p-6 space-y-6">
        <h1 className="text-2xl font-bold text-center">개발자 긴급 로그인</h1>
        <p className="text-center text-muted-foreground">
          이 페이지는 개발 목적으로만 사용되며 배포시 제거해야 합니다.
        </p>
        
        <div className="space-y-3">
          <Button 
            className="w-full"
            onClick={forceLogin}
          >
            테스트 계정으로 강제 로그인
          </Button>
          
          <Button 
            className="w-full"
            variant="outline"
            onClick={showCurrentAuth}
          >
            현재 인증 상태 확인
          </Button>
          
          <Button 
            className="w-full"
            variant="destructive"
            onClick={clearAuth}
          >
            인증 데이터 삭제
          </Button>
          
          <Button 
            className="w-full"
            variant="secondary"
            onClick={() => window.location.href = '/dashboard'}
          >
            대시보드로 이동
          </Button>
          
          <Button 
            className="w-full"
            variant="secondary"
            onClick={() => window.location.href = '/log-activity'}
          >
            활동 기록으로 이동
          </Button>
        </div>
      </Card>
    </div>
  );
} 