"use client";

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { User } from '@/lib/auth-server';

// Add session cache mechanism
interface SessionCache {
  data: {
    user: User | null;
    isAuthenticated: boolean;
  } | null;
  timestamp: number;
}

// Cache will last for 30 seconds
const SESSION_CACHE_DURATION = 10 * 1000; // 10 seconds in milliseconds
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
        console.log('Using cached session data');
        setState({
          user: sessionCache.data.user,
          isAuthenticated: sessionCache.data.isAuthenticated,
          isLoading: false,
          error: null
        });
        return;
      }
      
      // Proceed with API call if no cache or cache expired
      console.log('Fetching fresh session data');
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
      
      if (data.success && data.authenticated) {
        // Update cache
        sessionCache = {
          data: {
            user: data.user,
            isAuthenticated: true
          },
          timestamp: now
        };
        
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
  
  return {
    ...state,
    login,
    logout,
    register,
    refreshSession: () => fetchSession(true)  // Added option to force refresh
  };
} 