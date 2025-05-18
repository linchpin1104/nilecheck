"use client";

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { User } from '@/lib/auth-server';

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
  const fetchSession = useCallback(async () => {
    try {
      setState(prev => ({ ...prev, isLoading: true, error: null }));
      
      const response = await fetch('/api/auth/session');
      const data = await response.json();
      
      if (data.success && data.authenticated) {
        setState({
          user: data.user,
          isAuthenticated: true,
          isLoading: false,
          error: null
        });
      } else {
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
        await fetchSession();
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
        await fetchSession();
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
    refreshSession: fetchSession
  };
} 