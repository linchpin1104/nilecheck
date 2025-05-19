"use client";

import { useEffect } from "react";
import { useSession } from "@/contexts/SessionProvider";
import { useAuthStore, setAuthUser, clearAuthUser } from "@/lib/auth";

export function AuthInitializer() {
  const { isAuthenticated, user, isLoading, checkSession } = useSession();

  // 앱 초기화 시 세션 확인
  useEffect(() => {
    console.log("[AuthInitializer] 세션 확인 시작");
    checkSession();
  }, [checkSession]);

  // 세션 상태가 변경될 때 Zustand 스토어에 동기화
  useEffect(() => {
    if (!isLoading) {
      console.log("[AuthInitializer] AuthStore 동기화:", isAuthenticated ? "인증됨" : "인증되지 않음");
      
      if (isAuthenticated && user) {
        // 세션 사용자 정보로 zustand 스토어 업데이트
        setAuthUser(user);
      } else {
        // 비인증 상태로 설정
        clearAuthUser();
      }
    }
  }, [isAuthenticated, user, isLoading]);

  // 이 컴포넌트는 실제로 UI를 렌더링하지 않음
  return null;
} 