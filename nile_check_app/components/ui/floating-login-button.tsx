"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { LogIn } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuthStore } from "@/lib/auth";
import { useSession } from "@/contexts/SessionProvider";

export function FloatingLoginButton() {
  const { isAuthenticated: authStoreAuthenticated } = useAuthStore();
  const { isAuthenticated: sessionAuthenticated, isLoading, checkSession } = useSession();
  const pathname = usePathname();
  const [showButton, setShowButton] = useState(false);
  
  // 두 인증 상태 중 하나라도 true면 인증된 것으로 처리
  const isAuthenticated = authStoreAuthenticated || sessionAuthenticated;
  
  // 현재 페이지에 대한 URL 인코딩
  const loginLink = `/login?callbackUrl=${encodeURIComponent(pathname || '')}`;
  
  useEffect(() => {
    // 페이지 로드될 때 세션 상태 강제 확인
    const verifySession = async () => {
      try {
        await checkSession();
      } catch (error) {
        console.error("세션 확인 오류:", error);
      }
    };
    
    verifySession();
    
    // 로그인되지 않은 상태에서만 버튼 표시
    const timer = setTimeout(() => {
      // isLoading이 false이고 인증되지 않은 상태일 때만 표시
      if (!isAuthenticated && !isLoading) {
        setShowButton(true);
      } else {
        setShowButton(false);
      }
    }, 1500);
    
    return () => clearTimeout(timer);
  }, [isAuthenticated, pathname, isLoading, checkSession]);
  
  // 인증 상태나 로딩 상태가 변경될 때마다 버튼 상태 업데이트
  useEffect(() => {
    if (isAuthenticated || isLoading) {
      setShowButton(false);
    }
  }, [isAuthenticated, isLoading]);
  
  if (isAuthenticated || isLoading || !showButton) return null;
  
  return (
    <div className="fixed bottom-6 right-6 z-50 animate-fadeIn">
      <Link href={loginLink}>
        <Button size="lg" className="rounded-full shadow-lg flex items-center gap-2 px-4 py-6">
          <LogIn className="h-5 w-5" />
          <span>로그인</span>
        </Button>
      </Link>
    </div>
  );
} 