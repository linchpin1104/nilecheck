"use client";

import React, { createContext, useContext, useState, ReactNode } from "react";
import { User } from "@/lib/auth-server";

interface SessionContextType {
  isAuthenticated: boolean;
  user: User | null;
  isLoading: boolean;
  checkSession: () => Promise<void>;
  setAuthStatus: (status: boolean, userData?: User | null) => void;
}

const SessionContext = createContext<SessionContextType | undefined>(undefined);

export function SessionProvider({ children }: { children: ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const checkSession = async () => {
    setIsLoading(true);
    try {
      console.log("[SessionProvider] 세션 상태 확인 중...");
      const response = await fetch("/api/auth/session", {
        method: 'GET',
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache'
        },
        cache: 'no-store'
      });
      
      if (!response.ok) {
        throw new Error(`Session API 응답 오류: ${response.status}`);
      }
      
      const data = await response.json();
      
      if (data.success && data.authenticated) {
        console.log("[SessionProvider] 인증된 세션 발견:", data.user.id);
        setIsAuthenticated(true);
        setUser(data.user);
      } else {
        console.log("[SessionProvider] 인증되지 않은 세션");
        setIsAuthenticated(false);
        setUser(null);
      }
    } catch (error) {
      console.error("[SessionProvider] 세션 확인 오류:", error);
      setIsAuthenticated(false);
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  };

  // 인증 상태를 명시적으로 설정하는 함수
  const setAuthStatus = (status: boolean, userData?: User | null) => {
    setIsAuthenticated(status);
    if (userData !== undefined) {
      setUser(userData);
    }
  };

  // 세션 컨텍스트 값 설정
  const value: SessionContextType = {
    isAuthenticated,
    user,
    isLoading,
    checkSession,
    setAuthStatus
  };

  return (
    <SessionContext.Provider value={value}>
      {children}
    </SessionContext.Provider>
  );
}

// 세션 컨텍스트 사용 훅
export function useSession() {
  const context = useContext(SessionContext);
  if (context === undefined) {
    throw new Error("useSession must be used within a SessionProvider");
  }
  return context;
} 