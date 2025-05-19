"use client";

import { createContext, useState, useEffect, ReactNode } from "react";
import { useRouter, usePathname } from "next/navigation";
import { User } from "@/types";

export type SessionContextType = {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  checkSession: () => Promise<boolean>;
  setUser: (user: User | null) => void;
  setIsAuthenticated: (state: boolean) => void;
  login: (user: User) => void;
  logout: () => void;
};

export const SessionContext = createContext<SessionContextType | null>(null);

export default function SessionProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [sessionChecked, setSessionChecked] = useState<boolean>(false);

  const router = useRouter();
  const pathname = usePathname();

  // 세션 체크 함수
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
        setSessionChecked(true);
        setIsLoading(false);
        return true;
      } else {
        console.log("[SessionProvider] 인증되지 않은 세션");
        setIsAuthenticated(false);
        setUser(null);
        setSessionChecked(true);
        setIsLoading(false);
        return false;
      }
    } catch (error) {
      console.error("[SessionProvider] 세션 확인 중 오류:", error);
      setIsAuthenticated(false);
      setUser(null);
      setSessionChecked(true);
      setIsLoading(false);
      return false;
    }
  };

  // 초기 세션 체크
  useEffect(() => {
    if (!sessionChecked) {
      checkSession();
    }
  }, [sessionChecked]);

  // 페이지 변경 시 세션 재검사 (미들웨어 헤더 확인)
  useEffect(() => {
    // 미들웨어에서 설정한 인증 헤더 확인
    const checkAuthHeaders = async () => {
      try {
        // 현재 경로에 대한 HEAD 요청을 보내 헤더 확인
        const response = await fetch(pathname, {
          method: 'HEAD',
          headers: { 'x-check-auth': '1' }
        });
        
        const authStatus = response.headers.get('x-auth-status');
        const userId = response.headers.get('x-user-id');
        
        console.log(`[SessionProvider] 경로 ${pathname}의 인증 상태: ${authStatus}, 사용자: ${userId || 'none'}`);
        
        // 헤더와 현재 상태가 불일치하면 세션 재검사
        if ((authStatus === 'authenticated' && !isAuthenticated) || 
            (authStatus === 'unauthenticated' && isAuthenticated)) {
          console.log('[SessionProvider] 인증 상태 불일치, 세션 재확인');
          checkSession();
        }
      } catch (error) {
        console.error('[SessionProvider] 인증 헤더 확인 중 오류:', error);
      }
    };
    
    // 쿠키가 있는데 인증 상태가 아니면 세션 확인
    const checkAuthCookie = () => {
      const hasCookie = document.cookie.includes('nile-check-auth=');
      if (hasCookie && !isAuthenticated) {
        console.log('[SessionProvider] 인증 쿠키 발견, 세션 재확인');
        checkSession();
      } else if (!hasCookie && isAuthenticated) {
        console.log('[SessionProvider] 인증 쿠키 없음, 로그아웃 처리');
        setIsAuthenticated(false);
        setUser(null);
      }
    };
    
    // 페이지 변경시에만 수행
    if (sessionChecked) {
      checkAuthCookie();
      // checkAuthHeaders(); // HEAD 요청 방식은 일단 비활성화
    }
  }, [pathname, sessionChecked, isAuthenticated]);

  // 로그인 함수
  const login = (userData: User) => {
    setUser(userData);
    setIsAuthenticated(true);
  };

  // 로그아웃 함수
  const logout = () => {
    fetch("/api/auth/logout", {
      method: "POST",
    })
      .then(() => {
        setUser(null);
        setIsAuthenticated(false);
        router.push("/login");
      })
      .catch((error) => {
        console.error("로그아웃 중 오류 발생:", error);
      });
  };

  return (
    <SessionContext.Provider
      value={{
        user,
        isAuthenticated,
        isLoading,
        checkSession,
        setUser,
        setIsAuthenticated,
        login,
        logout,
      }}
    >
      {children}
    </SessionContext.Provider>
  );
} 