"use client";

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { User } from '@/lib/auth-server';
import { sessionStore } from '@/contexts/SessionProvider';

// Add session cache mechanism
interface SessionCache {
  data: {
    user: User | null;
    isAuthenticated: boolean;
  } | null;
  timestamp: number;
}

// Cache will last for 30 seconds (extended from 10 seconds)
const SESSION_CACHE_DURATION = 30 * 1000; // 30 seconds in milliseconds
let sessionCache: SessionCache = {
  data: null,
  timestamp: 0
};

interface AuthState {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  error: string | null;
}

interface LoginCredentials {
  phoneNumber: string;
  password: string;
}

interface RegisterData extends LoginCredentials {
  name: string;
  email?: string;
  countryCode: string;
}

export default function useAuth() {
  const [state, setState] = useState<AuthState>({
    user: null,
    isLoading: true,
    isAuthenticated: false,
    error: null
  });
  
  const router = useRouter();
  
  // 세션 정보 가져오기
  const fetchSession = useCallback(async (forceRefresh = false) => {
    try {
      setState(prev => ({ ...prev, isLoading: true, error: null }));
      
      console.log('[useAuth] 세션 정보 요청 시작');
      
      // Check if we have valid cached data and not forcing a refresh
      const now = Date.now();
      if (!forceRefresh && 
          sessionCache.data && 
          (now - sessionCache.timestamp < SESSION_CACHE_DURATION)) {
        // Use cached data
        console.log('[useAuth] 캐시된 세션 데이터 사용');
        
        // sessionStore와 동기화
        if (sessionCache.data && sessionCache.data.user?.id) {
          console.log('[useAuth] 캐시된 세션으로 sessionStore 업데이트:', {
            userId: sessionCache.data.user.id,
            isAuthenticated: sessionCache.data.isAuthenticated
          });
          sessionStore.updateUserId(sessionCache.data.user.id);
          sessionStore.isAuthenticated = sessionCache.data.isAuthenticated;
          
          // 로컬 스토리지에도 세션 정보 유지 (추가)
          if (sessionCache.data.isAuthenticated && typeof window !== 'undefined') {
            try {
              localStorage.setItem('nile-check-auth', JSON.stringify({
                isAuthenticated: true, 
                currentUser: sessionCache.data.user
              }));
              console.log('[useAuth] 로컬 스토리지에 세션 정보 저장 완료');
            } catch (e) {
              console.error('[useAuth] 로컬 스토리지 저장 실패:', e);
            }
          }
        }
        
        setState(prev => ({ 
          ...prev, 
          isLoading: false,
          isAuthenticated: sessionCache.data?.isAuthenticated || false,
          user: sessionCache.data?.user || null
        }));
        return;
      }
      
      console.log('[useAuth] 서버에서 세션 정보 요청');
      
      // 쿠키가 있는지 확인 (클라이언트에서 빠르게 확인)
      const hasCookie = document.cookie.includes('nile-check-auth=');
      if (!hasCookie) {
        console.log('[useAuth] 인증 쿠키가 없음 - 로그인되지 않은 상태');
        setState(prev => ({ 
          ...prev, 
          isLoading: false,
          isAuthenticated: false,
          user: null
        }));
        
        // sessionStore 업데이트
        sessionStore.updateUserId(null);
        sessionStore.isAuthenticated = false;
        
        // 캐시 초기화
        sessionCache.data = { isAuthenticated: false, user: null };
        sessionCache.timestamp = now;
        return;
      }
      
      // API 요청하여 세션 정보 가져오기
      const response = await fetch('/api/auth/session', {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include'
      });
      
      if (!response.ok) {
        console.error(`[useAuth] 세션 요청 실패: ${response.status} ${response.statusText}`);
        // API 오류 발생 시 상태 초기화 및 오류 설정
        setState(prev => ({ 
          ...prev, 
          isLoading: false,
          isAuthenticated: false,
          user: null,
          error: `세션 정보를 가져오는데 실패했습니다: ${response.status}`
        }));
        
        // sessionStore도 초기화
        sessionStore.updateUserId(null);
        sessionStore.isAuthenticated = false;
        
        // 캐시 초기화
        sessionCache.data = null;
        sessionCache.timestamp = 0;
        return;
      }
      
      const data = await response.json();
      console.log('[useAuth] 세션 응답 받음:', {
        success: data.success,
        hasUser: !!data.user,
        userId: data.user?.id
      });
      
      // 결과 설정
      if (data.success && data.user) {
        console.log('[useAuth] 로그인된 세션:', {
          id: data.user.id,
          name: data.user.name,
          phoneNumber: data.user.phoneNumber
        });
        
        // sessionStore 업데이트
        sessionStore.updateUserId(data.user.id);
        sessionStore.isAuthenticated = true;
        console.log('[useAuth] sessionStore 업데이트:', {
          userId: sessionStore.userId,
          isAuthenticated: sessionStore.isAuthenticated
        });
        
        // 국제 형식 전화번호 처리 (UI 표시용)
        if (data.user.phoneNumber?.startsWith('+82')) {
          console.log('[useAuth] 국제 형식 전화번호 변환:', data.user.phoneNumber);
          data.user.phoneNumber = '0' + data.user.phoneNumber.substring(3);
        }
        
        setState(prev => ({ 
          ...prev, 
          isLoading: false,
          isAuthenticated: true,
          user: data.user
        }));
        
        // 캐시 업데이트
        sessionCache.data = { isAuthenticated: true, user: data.user };
        sessionCache.timestamp = now;
        
        // 로컬 스토리지에 세션 정보 저장 (추가)
        if (typeof window !== 'undefined') {
          try {
            localStorage.setItem('nile-check-auth', JSON.stringify({
              isAuthenticated: true, 
              currentUser: data.user
            }));
            console.log('[useAuth] 로컬 스토리지에 세션 정보 저장 완료 (API 응답)');
          } catch (e) {
            console.error('[useAuth] 로컬 스토리지 저장 실패:', e);
          }
        }
      } else {
        console.log('[useAuth] 로그인되지 않은 세션');
        setState(prev => ({ 
          ...prev, 
          isLoading: false,
          isAuthenticated: false,
          user: null
        }));
        
        // sessionStore 초기화
        sessionStore.updateUserId(null);
        sessionStore.isAuthenticated = false;
        
        // 캐시 업데이트
        sessionCache.data = { isAuthenticated: false, user: null };
        sessionCache.timestamp = now;
      }
    } catch (error) {
      console.error('[useAuth] 세션 정보 요청 오류:', error);
      
      // 에러 발생 시 상태 업데이트
      setState(prev => ({ 
        ...prev, 
        isLoading: false,
        error: error instanceof Error ? error.message : '세션 정보를 가져오는데 실패했습니다.'
      }));
      
      // 캐시 초기화
      sessionCache.data = null;
      sessionCache.timestamp = 0;
    }
  }, []);
  
  // 로그인
  const login = useCallback(async (credentials: LoginCredentials) => {
    try {
      setState(prev => ({ ...prev, isLoading: true, error: null }));
      
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(credentials)
      });
      
      const data = await response.json();
      
      if (data.success) {
        // Force refresh session cache after login
        await fetchSession(true);
        return { 
          success: true, 
          message: data.message,
          redirectUrl: data.redirectUrl 
        };
      } else {
        setState(prev => ({ 
          ...prev, 
          isLoading: false, 
          error: data.message || '로그인에 실패했습니다.' 
        }));
        return { success: false, message: data.message };
      }
    } catch (error) {
      console.error('Login error:', error);
      setState(prev => ({ 
        ...prev, 
        isLoading: false, 
        error: '로그인 처리 중 오류가 발생했습니다.' 
      }));
      return { success: false, message: '로그인 처리 중 오류가 발생했습니다.' };
    }
  }, [fetchSession]);
  
  // 로그아웃
  const logout = useCallback(async () => {
    try {
      setState(prev => ({ ...prev, isLoading: true }));
      
      await fetch('/api/auth/logout', {
        method: 'POST'
      });
      
      // Clear session cache after logout
      sessionCache = {
        data: null,
        timestamp: 0
      };
      
      // sessionStore와 동기화 - 로그아웃
      sessionStore.updateUserId(null);
      sessionStore.isAuthenticated = false;
      
      setState({
        user: null,
        isAuthenticated: false,
        isLoading: false,
        error: null
      });
      
      router.push('/login');
    } catch (error) {
      console.error('Logout error:', error);
      setState(prev => ({ 
        ...prev, 
        isLoading: false, 
        error: '로그아웃 처리 중 오류가 발생했습니다.' 
      }));
    }
  }, [router]);
  
  // 회원가입
  const register = useCallback(async (userData: RegisterData) => {
    try {
      setState(prev => ({ ...prev, isLoading: true, error: null }));
      
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(userData)
      });
      
      const data = await response.json();
      
      if (data.success) {
        // Force refresh session cache after registration
        await fetchSession(true);
        return { 
          success: true, 
          message: data.message,
          redirectUrl: data.redirectUrl
        };
      } else {
        setState(prev => ({ 
          ...prev, 
          isLoading: false, 
          error: data.message || '회원가입에 실패했습니다.' 
        }));
        return { success: false, message: data.message };
      }
    } catch (error) {
      console.error('Registration error:', error);
      setState(prev => ({ 
        ...prev, 
        isLoading: false, 
        error: '회원가입 처리 중 오류가 발생했습니다.' 
      }));
      return { success: false, message: '회원가입 처리 중 오류가 발생했습니다.' };
    }
  }, [fetchSession]);
  
  // 초기화 시 localStorage에서 세션 복구
  useEffect(() => {
    // 첫 로드 시에만 실행
    const initializeAuth = async () => {
      try {
        const authData = localStorage.getItem('nile-check-auth');
        if (authData) {
          console.log('[useAuth] localStorage에서 인증 데이터 발견');
          try {
            const parsed = JSON.parse(authData);
            if (parsed.isAuthenticated && parsed.currentUser) {
              console.log('[useAuth] 로컬 스토리지 데이터로 상태 초기화');
              
              // 상태 업데이트 (캐시 업데이트)
              sessionCache.data = { 
                isAuthenticated: true, 
                user: parsed.currentUser 
              };
              sessionCache.timestamp = Date.now();
              
              // sessionStore 업데이트
              sessionStore.updateUserId(parsed.currentUser.id);
              sessionStore.isAuthenticated = true;
              
              // 상태 업데이트
              setState({
                isLoading: false,
                isAuthenticated: true,
                user: parsed.currentUser,
                error: null
              });
              
              // 그 후 서버와 세션 동기화
              setTimeout(() => fetchSession(true), 100);
              return;
            }
          } catch (e) {
            console.error('[useAuth] localStorage 데이터 파싱 오류:', e);
          }
        }
        
        // localStorage에 데이터가 없거나 파싱 실패 시 서버에서 세션 가져오기
        fetchSession();
      } catch (error) {
        console.error('[useAuth] 인증 초기화 오류:', error);
        setState(prev => ({ ...prev, isLoading: false, error: '인증 초기화 오류' }));
      }
    };
    
    initializeAuth();
  }, []);
  
  // sessionStore에서 사용자 ID를 직접 가져오는 메서드 추가
  const getUserId = () => {
    // 로컬 상태가 있으면 우선 사용
    if (state.user?.id) {
      return state.user.id;
    }
    // 그 다음 sessionStore에서 확인
    return sessionStore.userId;
  };
  
  return {
    ...state,
    login,
    logout,
    register,
    refreshSession: () => fetchSession(true),  // 세션 강제 갱신 옵션
    getUserId  // 사용자 ID 가져오기 메서드 추가
  };
} 