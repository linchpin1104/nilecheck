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
  getUserId: () => string | null;
};

export const SessionContext = createContext<SessionContextType | null>(null);

// 전역 세션 상태 저장소 - 다른 컴포넌트에서 접근 가능
export const sessionStore = {
  userId: null as string | null,
  isAuthenticated: false,
  updateUserId: (id: string | null) => {
    sessionStore.userId = id;
    // 로컬 스토리지에도 저장 (영구 저장)
    if (typeof window !== 'undefined') {
      if (id) {
        localStorage.setItem('last_user_id', id);
      } else {
        localStorage.removeItem('last_user_id');
      }
    }
  }
};

export function SessionProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [sessionChecked, setSessionChecked] = useState<boolean>(false);
  const [sessionCheckFailed, setSessionCheckFailed] = useState<boolean>(false);
  
  // 이전 인증 상태를 저장하는 ref
  const prevAuthState = useRef<boolean | null>(null);
  
  // 마지막 세션 체크 시간 추적
  const lastSessionCheckTime = useRef<number>(0);

  const router = useRouter();
  const pathname = usePathname();

  // 사용자 ID 가져오기 함수 (항상 최신 상태 반환)
  const getUserId = () => {
    if (user?.id) {
      return user.id;
    }
    return sessionStore.userId;
  };

  // 세션 체크 함수
  const checkSession = async () => {
    // 세션 체크 호출 중복 방지
    const now = Date.now();
    if (now - lastSessionCheckTime.current < 3000) { // 3초 디바운스
      console.log("[SessionProvider] 세션 체크 요청이 너무 빈번합니다. 무시합니다.");
      return prevAuthState.current ?? false;
    }
    
    lastSessionCheckTime.current = now;
    setIsLoading(true);
    
    try {
      console.log("[SessionProvider] 세션 상태 확인 중...");
      
      // 쿠키 상태 먼저 확인
      const hasCookie = document.cookie.includes('nile-check-auth=');
      console.log("[SessionProvider DEBUG] 인증 쿠키 존재 여부:", hasCookie);
      
      // 쿠키가 없으면 인증 안된 상태로 빠르게 리턴
      if (!hasCookie) {
        console.log("[SessionProvider] 인증 쿠키가 없습니다.");
        setIsAuthenticated(false);
        setUser(null);
        sessionStore.updateUserId(null);
        sessionStore.isAuthenticated = false;
        console.log("[SessionProvider DEBUG] 세션 스토어 초기화됨:", { userId: sessionStore.userId, isAuthenticated: sessionStore.isAuthenticated });
        setSessionChecked(true);
        setSessionCheckFailed(false);
        setIsLoading(false);
        prevAuthState.current = false;
        return false;
      }
      
      // 쿠키가 있으면 서버에 세션 확인
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000); // 5초 타임아웃
      
      const response = await fetch("/api/auth/session", {
        method: 'GET',
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache'
        },
        cache: 'no-store',
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        throw new Error(`Session API 응답 오류: ${response.status}`);
      }
      
      const data = await response.json();
      console.log("[SessionProvider DEBUG] 세션 API 응답:", { success: data.success, authenticated: data.authenticated, userId: data.user?.id, phoneNumber: data.user?.phoneNumber });
      
      if (data.success && data.authenticated) {
        // 국제 전화번호 형식 (예: +821052995980)이 있으면 표준 형식으로 변환
        if (data.user && data.user.phoneNumber && data.user.phoneNumber.startsWith('+82')) {
          data.user.phoneNumber = data.user.phoneNumber.replace(/^\+82/, '0');
          console.log("[SessionProvider DEBUG] 국제 전화번호 형식을 표준 형식으로 변환:", data.user.phoneNumber);
        }
        
        console.log("[SessionProvider] 인증된 세션 발견:", data.user.id);
        setIsAuthenticated(true);
        setUser(data.user);
        // 전역 저장소에 사용자 ID 업데이트
        sessionStore.updateUserId(data.user.id);
        sessionStore.isAuthenticated = true;
        console.log("[SessionProvider DEBUG] 세션 스토어 업데이트됨:", { userId: sessionStore.userId, isAuthenticated: sessionStore.isAuthenticated });
        setSessionChecked(true);
        setSessionCheckFailed(false);
        setIsLoading(false);
        prevAuthState.current = true;
        return true;
      } else {
        console.log("[SessionProvider] 인증되지 않은 세션");
        setIsAuthenticated(false);
        setUser(null);
        // 전역 저장소에서 사용자 ID 제거
        sessionStore.updateUserId(null);
        sessionStore.isAuthenticated = false;
        console.log("[SessionProvider DEBUG] 세션 스토어 초기화됨:", { userId: sessionStore.userId, isAuthenticated: sessionStore.isAuthenticated });
        setSessionChecked(true);
        setSessionCheckFailed(false);
        setIsLoading(false);
        prevAuthState.current = false;
        return false;
      }
    } catch (error) {
      console.error("[SessionProvider] 세션 확인 중 오류:", error);
      
      // 세션 체크 실패 시 기존 상태 유지 대신 인증되지 않은 상태로 전환
      setSessionCheckFailed(true);
      setIsLoading(false);
      
      // 세션 검증 실패 카운터 증가
      sessionCheckFailCount.current += 1;
      
      // 3번 이상 연속 실패 시 로그인 페이지로 리다이렉트
      if (sessionCheckFailCount.current >= 3 && prevAuthState.current) {
        console.error("[SessionProvider] 세션 확인 반복 실패. 로그인 필요");
        setIsAuthenticated(false);
        setUser(null);
        sessionStore.updateUserId(null);
        sessionStore.isAuthenticated = false;
        prevAuthState.current = false;
        
        // 비로그인 페이지가 아닌 경우에만 리다이렉트
        const publicPaths = ['/login', '/register', '/forgot-password'];
        if (!publicPaths.includes(pathname || '')) {
          router.push('/login?error=session_verification_failed');
        }
        return false;
      }
      
      return prevAuthState.current ?? false;
    }
  };

  // 세션 검증 실패 카운터
  const sessionCheckFailCount = useRef<number>(0);

  // 초기 세션 체크
  useEffect(() => {
    if (!sessionChecked) {
      checkSession();
    }
  }, [sessionChecked, checkSession]);

  // 페이지 변경 시 세션 재검사
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
          sessionStore.updateUserId(null);
          sessionStore.isAuthenticated = false;
        }
      }
    };
    
    // 페이지 변경시에만 수행하고, 세션이 확인된 상태일 때만 실행
    if (sessionChecked && pathname) {
      checkAuthCookie();
    }
  }, [pathname, sessionChecked, isAuthenticated, checkSession]);

  // 로그인 함수
  const login = (userData: User) => {
    setUser(userData);
    setIsAuthenticated(true);
    sessionStore.updateUserId(userData.id);
    sessionStore.isAuthenticated = true;
    prevAuthState.current = true;
    sessionCheckFailCount.current = 0; // 로그인 성공 시 실패 카운터 리셋
  };

  // 로그아웃 함수
  const logout = () => {
    fetch("/api/auth/logout", {
      method: "POST",
    })
      .then(() => {
        setUser(null);
        setIsAuthenticated(false);
        sessionStore.updateUserId(null);
        sessionStore.isAuthenticated = false;
        prevAuthState.current = false;
        sessionCheckFailCount.current = 0; // 로그아웃 시 실패 카운터 리셋
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
        getUserId,
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