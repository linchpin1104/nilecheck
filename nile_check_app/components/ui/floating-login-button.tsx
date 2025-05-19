"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { LogIn } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuthStore } from "@/lib/auth";

export function FloatingLoginButton() {
  const { isAuthenticated } = useAuthStore();
  const pathname = usePathname();
  const [showButton, setShowButton] = useState(false);
  
  // 현재 페이지에 대한 URL 인코딩
  const loginLink = `/login?callbackUrl=${encodeURIComponent(pathname || '')}`;
  
  useEffect(() => {
    // 로그인되지 않은 상태에서만 버튼 표시
    if (!isAuthenticated) {
      // 페이지 로드 시 약간의 딜레이 후 버튼 표시 (애니메이션 효과 위함)
      const timer = setTimeout(() => {
        setShowButton(true);
      }, 1500);
      
      return () => clearTimeout(timer);
    } else {
      setShowButton(false);
    }
  }, [isAuthenticated, pathname]);
  
  if (isAuthenticated || !showButton) return null;
  
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