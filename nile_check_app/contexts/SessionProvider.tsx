"use client";

import { createContext, useState, useEffect, ReactNode, useContext, useRef } from "react";
import { useRouter, usePathname } from "next/navigation";
import { User } from "@/lib/auth-server";

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

export function SessionProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [sessionChecked, setSessionChecked] = useState<boolean>(false);
  
  // 이전 인증 상태를 저장하는 ref
  const prevAuthState = useRef<boolean | null>(null);
  
  // 마지막 세션 체크 시간 추적
  const lastSessionCheckTime = useRef<number>(0);

  const router = useRouter();
  const pathname = usePathname();

  // 세션 체크 함수
  const checkSession = async () => {
    // 세션 체크 호출 중복 방지
    const now = Date.now();
    if (now - lastSessionCheckTime.current < 2000) {
      console.log("[SessionProvider] 세션 체크 요청이 너무 빈번합니다. 무시합니다.");
      return prevAuthState.current ?? false;
    }
    
    lastSessionCheckTime.current = now;
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
        prevAuthState.current = true;
        return true;
      } else {
        console.log("[SessionProvider] 인증되지 않은 세션");
        setIsAuthenticated(false);
        setUser(null);
        setSessionChecked(true);
        setIsLoading(false);
        prevAuthState.current = false;
        return false;
      }
    } catch (error) {
      console.error("[SessionProvider] 세션 확인 중 오류:", error);
      setIsAuthenticated(false);
      setUser(null);
      setSessionChecked(true);
      setIsLoading(false);
      prevAuthState.current = false;
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
    // 쿠키가 있는데 인증 상태가 아니면 세션 확인
    const checkAuthCookie = () => {
      const hasCookie = document.cookie.includes('nile-check-auth=');
      
      // 인증 상태와 쿠키 상태가 일치하지 않을 때만 세션을 확인
      if ((hasCookie && !isAuthenticated) || (!hasCookie && isAuthenticated)) {
        if (hasCookie && !isAuthenticated) {
          console.log('[SessionProvider] 인증 쿠키 발견, 세션 재확인');
          checkSession();
        } else if (!hasCookie && isAuthenticated) {
          console.log('[SessionProvider] 인증 쿠키 없음, 로그아웃 처리');
          setIsAuthenticated(false);
          setUser(null);
        }
      }
    };
    
    // 페이지 변경시에만 수행하고, 세션이 확인된 상태일 때만 실행
    if (sessionChecked && pathname) {
      checkAuthCookie();
    }
  }, [pathname, sessionChecked]);  // isAuthenticated 의존성 제거

  // 로그인 함수
  const login = (userData: User) => {
    setUser(userData);
    setIsAuthenticated(true);
    prevAuthState.current = true;
  };

  // 로그아웃 함수
  const logout = () => {
    fetch("/api/auth/logout", {
      method: "POST",
    })
      .then(() => {
        setUser(null);
        setIsAuthenticated(false);
        prevAuthState.current = false;
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

// 세션 컨텍스트 사용 훅
export function useSession() {
  const context = useContext(SessionContext);
  if (!context) {
    throw new Error("useSession must be used within a SessionProvider");
  }
  return context;
}

export default SessionProvider; 