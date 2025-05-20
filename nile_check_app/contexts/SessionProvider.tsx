"use client";

import { createContext, useState, useEffect, ReactNode, useContext, useRef, useCallback } from "react";
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
  
  // 이전 인증 상태를 저장하는 ref
  const prevAuthState = useRef<boolean | null>(null);
  
  // 마지막 세션 체크 시간 추적
  const lastSessionCheckTime = useRef<number>(0);

  const router = useRouter();
  const pathname = usePathname();

  // 세션 검증 실패 카운터
  const sessionCheckFailCount = useRef<number>(0);

  // Add these new refs and effect for the "justLoggedIn" grace period
  const justLoggedIn = useRef(false);
  const justLoggedInTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    // Cleanup timeout on unmount
    return () => {
      if (justLoggedInTimeoutRef.current) {
        clearTimeout(justLoggedInTimeoutRef.current);
      }
    };
  }, []); // Empty dependency array means this runs once on mount for setup and cleanup on unmount

  // 사용자 ID 가져오기 함수 (항상 최신 상태 반환)
  const getUserId = () => {
    if (user?.id) {
      return user.id;
    }
    return sessionStore.userId;
  };

  // 세션 체크 함수
  const checkSession = useCallback(async () => {
    // START: Add justLoggedIn check
    if (justLoggedIn.current) {
      console.log("[SessionProvider] checkSession: API call skipped because justLoggedIn is true.");
      // login() should have set isAuthenticated and user.
      // This ensures we don't flip to loading or a false negative.
      if (!isAuthenticated && user) { // 'user' state from useState
        console.log("[SessionProvider] checkSession (justLoggedIn): Ensuring isAuthenticated is true based on user data.");
        setIsAuthenticated(true); 
      }
      setIsLoading(false); 
      return true; // Assume session is valid as login() just established it
    }
    // END: Add justLoggedIn check

    const now = Date.now();
    if (now - lastSessionCheckTime.current < 5000) {
      console.log("[SessionProvider] Debounced session check.");
      return prevAuthState.current ?? false;
    }
    
    lastSessionCheckTime.current = now;
    console.log("[SessionProvider] Starting session check...");
    setIsLoading(true);
    
    try {
      const hasCookie = document.cookie.includes('nile-check-auth=');
      console.log("[SessionProvider DEBUG] Cookie present:", hasCookie);
      
      let localAuthData = null;
      try {
        const localStorageAuth = localStorage.getItem('nile-check-auth');
        if (localStorageAuth) {
          localAuthData = JSON.parse(localStorageAuth);
          console.log("[SessionProvider DEBUG] LocalStorage auth data:", 
            localAuthData.isAuthenticated ? "Authenticated" : "Not authenticated", 
            localAuthData.currentUser?.id || "No user ID");
        }
      } catch (localError) {
        console.error("[SessionProvider] Failed to read LocalStorage:", localError);
      }
      
      if (!hasCookie && localAuthData?.isAuthenticated && localAuthData?.currentUser) {
        console.log("[SessionProvider] No cookie, but LocalStorage data found. Attempting session restore...");
        try {
          const restoreResponse = await fetch("/api/auth/session", {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-cache' },
            body: JSON.stringify({ action: 'restore', user: localAuthData.currentUser }),
            cache: 'no-store'
          });
          
          if (restoreResponse.ok) {
            const restoreData = await restoreResponse.json();
            if (restoreData.success) {
              console.log("[SessionProvider] Session restored successfully via API.");
              setIsAuthenticated(true);
              setUser(localAuthData.currentUser);
              sessionStore.updateUserId(localAuthData.currentUser.id);
              sessionStore.isAuthenticated = true;
              setSessionChecked(true);
              prevAuthState.current = true;
              sessionCheckFailCount.current = 0; // Reset counter
              setIsLoading(false);
              return true;
            }
          }
          console.log("[SessionProvider] Session restore API call failed:", restoreResponse.status);
        } catch (restoreError) {
          console.error("[SessionProvider] Error during session restore API call:", restoreError);
        }
      }
      
      if (hasCookie && isAuthenticated && user) {
        console.log("[SessionProvider] Already authenticated with valid cookie and user state.");
        sessionCheckFailCount.current = 0; // Reset counter
        setIsLoading(false);
        return true;
      }
      
      if (!hasCookie) {
        console.log("[SessionProvider] No cookie and session restore failed or not applicable.");
        setIsAuthenticated(false);
        setUser(null);
        sessionStore.updateUserId(null);
        sessionStore.isAuthenticated = false;
        setSessionChecked(true);
        prevAuthState.current = false;
        setIsLoading(false);
        return false;
      }
      
      console.log("[SessionProvider] Verifying session with server via /api/auth/session GET...");
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);
      
      const response = await fetch("/api/auth/session", {
        method: 'GET',
        headers: { 'Cache-Control': 'no-cache, no-store, must-revalidate', 'Pragma': 'no-cache' },
        cache: 'no-store',
        signal: controller.signal,
        next: { revalidate: 0 }
      });
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        throw new Error(`Session API error: ${response.status}`);
      }
      
      const data = await response.json();
      console.log("[SessionProvider DEBUG] Server session API response:", data);
      
      if (data.success && data.authenticated) {
        if (data.user && data.user.phoneNumber && data.user.phoneNumber.startsWith('+82')) {
          data.user.phoneNumber = data.user.phoneNumber.replace(/^\\+82/, '0');
        }
        console.log("[SessionProvider] Server verified session as authenticated:", data.user.id);
        setIsAuthenticated(true);
        setUser(data.user);
        sessionStore.updateUserId(data.user.id);
        sessionStore.isAuthenticated = true;
        try {
          localStorage.setItem('nile-check-auth', JSON.stringify({ isAuthenticated: true, currentUser: data.user }));
        } catch (storageError) {
          console.error("[SessionProvider] Failed to save auth state to LocalStorage:", storageError);
        }
        setSessionChecked(true);
        prevAuthState.current = true;
        sessionCheckFailCount.current = 0; // Reset counter
        setIsLoading(false);
        return true;
      } else {
        console.log("[SessionProvider] Server verified session as NOT authenticated.");
        setIsAuthenticated(false);
        setUser(null);
        sessionStore.updateUserId(null);
        sessionStore.isAuthenticated = false;
        try {
          localStorage.removeItem('nile-check-auth');
        } catch (removeError) {
          console.error("[SessionProvider] Failed to remove auth state from LocalStorage:", removeError);
        }
        setSessionChecked(true);
        prevAuthState.current = false;
        setIsLoading(false);
        return false;
      }
    } catch (error) {
      console.error("[SessionProvider] Error during session check:", error);
      
      try {
        const localStorageAuth = localStorage.getItem('nile-check-auth');
        if (localStorageAuth) {
          const localAuthData = JSON.parse(localStorageAuth);
          if (localAuthData.isAuthenticated && localAuthData.currentUser) {
            console.warn("[SessionProvider] API error, but found valid LocalStorage auth. Using as fallback.");
            setUser(localAuthData.currentUser);
            setIsAuthenticated(true);
            sessionStore.updateUserId(localAuthData.currentUser.id);
            sessionStore.isAuthenticated = true;
            prevAuthState.current = true;
            sessionCheckFailCount.current = 0; // Reset counter
            setIsLoading(false);
            return true;
          }
        }
      } catch (localError) {
        console.error("[SessionProvider] Failed to read LocalStorage during error fallback:", localError);
      }
      
      setIsLoading(false);
      // Only increment fail count if user was previously thought to be authenticated
      if (prevAuthState.current === true) {
        sessionCheckFailCount.current += 1;
        console.warn(`[SessionProvider] Session check failed. Fail count: ${sessionCheckFailCount.current}`);
      }
      
      // Only log out if we've had 5 consecutive failures (increased from 3)
      if (sessionCheckFailCount.current >= 5 && prevAuthState.current === true) {
        console.error("[SessionProvider] Persistent session check failure for previously authenticated user. Redirecting to login.");
        setIsAuthenticated(false);
        setUser(null);
        sessionStore.updateUserId(null);
        sessionStore.isAuthenticated = false;
        prevAuthState.current = false; // Update prevAuthState to prevent loop if login page also fails checks
        
        const publicPaths = ['/login', '/register', '/forgot-password'];
        if (!publicPaths.includes(pathname || '')) {
          router.push('/login?error=session_verification_failed');
        }
        return false;
      }
      
      // If not redirecting, return the previous state or false if no previous state
      return prevAuthState.current ?? false;
    }
  }, [pathname, router, isAuthenticated, user, setIsLoading, setIsAuthenticated]); // Added setIsLoading, setIsAuthenticated

  // 초기 세션 체크
  useEffect(() => {
    if (!sessionChecked) {
      console.log("[SessionProvider] Initial session check triggered.");
      checkSession();
    }
  }, [sessionChecked, checkSession]);

  // 페이지 변경 시 세션 재검사 (개선된 로직)
  useEffect(() => {
    const checkAuthCookieAndState = () => {
      const hasCookie = document.cookie.includes('nile-check-auth=');
      const now = Date.now();
      const recentlyChecked = (now - lastSessionCheckTime.current) < 5000;

      if (recentlyChecked) return;

      if (hasCookie && !isAuthenticated) {
        console.log('[SessionProvider] Cookie present but not authenticated in state. Re-checking session.');
        checkSession();
      } else if (!hasCookie && isAuthenticated) {
        const authData = localStorage.getItem('nile-check-auth');
        if (!authData) {
          console.log('[SessionProvider] No cookie and no LocalStorage auth, but authenticated in state. Logging out.');
          setIsAuthenticated(false);
          setUser(null);
          sessionStore.updateUserId(null);
          sessionStore.isAuthenticated = false;
          prevAuthState.current = false;
        } else {
          console.log('[SessionProvider] No cookie, but LocalStorage auth found and authenticated in state. Attempting session restore.');
          checkSession(); // This will attempt restore
        }
      }
    };
    
    if (sessionChecked && pathname) { // Only run if initial check done and on a page
      checkAuthCookieAndState();
    }
    
    const tryRestoreFromLocalStorageOnLoad = () => {
      if (!isAuthenticated && !user && typeof window !== 'undefined') {
        try {
          const authData = localStorage.getItem('nile-check-auth');
          if (authData) {
            const parsed = JSON.parse(authData);
            if (parsed.isAuthenticated && parsed.currentUser) {
              console.log('[SessionProvider] Restoring auth state from LocalStorage on load.');
              setUser(parsed.currentUser);
              setIsAuthenticated(true);
              sessionStore.updateUserId(parsed.currentUser.id);
              sessionStore.isAuthenticated = true;
              prevAuthState.current = true;
              sessionCheckFailCount.current = 0; // Reset counter
            }
          }
        } catch (error) {
          console.error('[SessionProvider] Failed to restore from LocalStorage on load:', error);
        }
      }
    };
    
    if (!sessionChecked && !isLoading) { // Before initial session check completes
      tryRestoreFromLocalStorageOnLoad();
    }
  }, [pathname, sessionChecked, isAuthenticated, isLoading, user, checkSession]);

  const login = useCallback((userData: User) => {
    console.log("[SessionProvider] login function called with user:", userData);

    if (justLoggedInTimeoutRef.current) {
      clearTimeout(justLoggedInTimeoutRef.current);
    }
    justLoggedIn.current = true;
    console.log('[SessionProvider] justLoggedIn flag set to true.');
    // Increased timeout significantly to 10 seconds to ensure session validation succeeds after login
    justLoggedInTimeoutRef.current = setTimeout(() => {
      justLoggedIn.current = false;
      console.log('[SessionProvider] justLoggedIn flag reset to false after 10000ms timeout.');
    }, 10000); // 10 second grace period

    setIsAuthenticated(true);
    setUser(userData);
    // setAuthError(null); // If authError state exists, uncomment and add to deps if used
    sessionCheckFailCount.current = 0;
    prevAuthState.current = true; // User is now considered authenticated
    
    sessionStore.updateUserId(userData.id); // Sync with legacy sessionStore
    sessionStore.isAuthenticated = true;    // Sync with legacy sessionStore
    
    try {
      localStorage.setItem('nile-check-auth', JSON.stringify({ isAuthenticated: true, currentUser: userData }));
      console.log("[SessionProvider] Auth state saved to LocalStorage after login.");
    } catch (storageError) {
      console.error("[SessionProvider] Failed to save auth state to LocalStorage after login:", storageError);
    }

    console.log("[SessionProvider] State updated after login. isAuthenticated:", true, "User:", userData.id, "FailCount reset to 0");
    setIsLoading(false); // Ensure loading is false after login actions are complete
  }, [setIsAuthenticated, setUser, setIsLoading]); // Added setIsLoading. Add setAuthError if used and it's a state setter.

  const logout = useCallback(() => {
    console.log("[SessionProvider] logout function called.");
    // Optional: Clear the justLoggedIn flag immediately if logout is called,
    // though it primarily affects post-login checks.
    if (justLoggedInTimeoutRef.current) {
      clearTimeout(justLoggedInTimeoutRef.current);
      justLoggedInTimeoutRef.current = null;
    }
    justLoggedIn.current = false;

    setIsAuthenticated(false);
    setUser(null);
    // setAuthError(null); // If authError state exists
    sessionCheckFailCount.current = 0; // Reset fail count on logout
    prevAuthState.current = false; // User is no longer authenticated
    
    sessionStore.updateUserId(null); // Sync with legacy sessionStore
    sessionStore.isAuthenticated = false; // Sync with legacy sessionStore

    try {
      // Standard cookie removal
      document.cookie = "nile-check-auth=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Lax; Secure";
      localStorage.removeItem('nile-check-auth');
      localStorage.removeItem('last_user_id'); // Ensure this is cleared
      console.log("[SessionProvider] Cleared auth cookie and LocalStorage on logout.");
    } catch (e) {
      console.error("[SessionProvider] Error clearing cookie/localStorage on logout:", e);
    }
    
    // Redirect to login page
    // Check if already on a public path to avoid redundant navigation or errors
    const publicPaths = ['/login', '/register', '/forgot-password'];
    if (pathname && !publicPaths.includes(pathname)) { // Check current pathname is not null
      router.push("/login?action=logout");
    }
    setIsLoading(false); // Ensure loading state is false
  }, [pathname, router, setIsAuthenticated, setUser, setIsLoading]); // Added setIsLoading and other relevant dependencies

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