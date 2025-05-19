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
      
      // Check if we have valid cached data and not forcing a refresh
      const now = Date.now();
      if (!forceRefresh && 
          sessionCache.data && 
          (now - sessionCache.timestamp < SESSION_CACHE_DURATION)) {
        // Use cached data
        console.log('[useAuth] 캐시된 세션 데이터 사용');
        
        // sessionStore와 동기화
        if (sessionCache.data.user?.id) {
          sessionStore.updateUserId(sessionCache.data.user.id);
          sessionStore.isAuthenticated = sessionCache.data.isAuthenticated;
          console.log('[useAuth DEBUG] sessionStore 동기화 (캐시된 데이터):', {
            userId: sessionStore.userId,
            isAuthenticated: sessionStore.isAuthenticated
          });
        }
        
        setState({
          user: sessionCache.data.user,
          isAuthenticated: sessionCache.data.isAuthenticated,
          isLoading: false,
          error: null
        });
        return;
      }
      
      // Proceed with API call if no cache or cache expired
      console.log('[useAuth] 새로운 세션 정보 요청');
      const response = await fetch('/api/auth/session', {
        method: 'GET',
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache'
        },
        cache: 'no-store'
      });
      
      if (!response.ok) {
        throw new Error(`Session API responded with status: ${response.status}`);
      }
      
      const data = await response.json();
      console.log('[useAuth DEBUG] 세션 API 응답:', data);
      
      if (data.success && data.authenticated) {
        // 국제 전화번호 형식 처리 (+82xxxx -> 0xxxx)
        if (data.user && data.user.phoneNumber && data.user.phoneNumber.startsWith('+82')) {
          data.user.phoneNumber = data.user.phoneNumber.replace(/^\+82/, '0');
          console.log('[useAuth DEBUG] 전화번호 형식 변환:', data.user.phoneNumber);
        }
        
        // Update cache
        sessionCache = {
          data: {
            user: data.user,
            isAuthenticated: true
          },
          timestamp: now
        };
        
        // sessionStore와 동기화
        if (data.user?.id) {
          sessionStore.updateUserId(data.user.id);
          sessionStore.isAuthenticated = true;
          console.log('[useAuth DEBUG] sessionStore 동기화 (로그인):', {
            userId: sessionStore.userId,
            isAuthenticated: sessionStore.isAuthenticated,
            userName: data.user.name,
            phoneNumber: data.user.phoneNumber
          });
          
          // 로컬 스토리지에도 마지막 사용자 ID 저장
          if (typeof window !== 'undefined') {
            localStorage.setItem('last_user_id', data.user.id);
            console.log('[useAuth DEBUG] 로컬 스토리지에 마지막 사용자 ID 저장:', data.user.id);
          }
        }
        
        console.log('[useAuth] 세션 정보 업데이트:', { 
          userId: data.user.id, 
          name: data.user.name, 
          phone: data.user.phoneNumber 
        });
        
        setState({
          user: data.user,
          isAuthenticated: true,
          isLoading: false,
          error: null
        });
      } else {
        // Update cache (not authenticated)
        sessionCache = {
          data: {
            user: null,
            isAuthenticated: false
          },
          timestamp: now
        };
        
        // sessionStore와 동기화 - 인증 실패
        console.log('[useAuth] 인증되지 않은 세션');
        sessionStore.updateUserId(null);
        sessionStore.isAuthenticated = false;
        console.log('[useAuth DEBUG] sessionStore 동기화 (로그아웃):', {
          userId: sessionStore.userId,
          isAuthenticated: sessionStore.isAuthenticated
        });
        
        // 로컬 스토리지의 마지막 사용자 ID 삭제
        if (typeof window !== 'undefined') {
          localStorage.removeItem('last_user_id');
          console.log('[useAuth DEBUG] 로컬 스토리지에서 마지막 사용자 ID 삭제');
        }
        
        setState({
          user: null,
          isAuthenticated: false,
          isLoading: false,
          error: null
        });
      }
    } catch (error) {
      console.error('Error fetching session:', error);
      setState({
        user: null,
        isAuthenticated: false,
        isLoading: false,
        error: '세션 정보를 가져오는 중 오류가 발생했습니다.'
      });
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
        return { success: true, message: data.message };
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
        return { success: true, message: data.message };
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
  
  // 앱 로드 시 세션 확인
  useEffect(() => {
    fetchSession();
  }, [fetchSession]);
  
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