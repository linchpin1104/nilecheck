"use client";

import { useEffect } from "react";
import { useSession } from "@/contexts/SessionProvider";

export function AuthInitializer() {
  const { isAuthenticated, user, isLoading, checkSession } = useSession();

  // 앱 초기화 시 세션 확인
  useEffect(() => {
    console.log("[AuthInitializer] 세션 확인 시작");
    checkSession();
  }, [checkSession]);

  // 세션 상태가 변경될 때 처리
  useEffect(() => {
    if (!isLoading) {
      console.log("[AuthInitializer] 세션 상태 변경:", isAuthenticated ? "인증됨" : "인증되지 않음");
      
      if (isAuthenticated && user) {
        console.log("[AuthInitializer] 인증된 사용자:", user.name);
      } else {
        console.log("[AuthInitializer] 인증되지 않은 상태");
      }
    }
  }, [isAuthenticated, user, isLoading]);

  // 이 컴포넌트는 실제로 UI를 렌더링하지 않음
  return null;
} 