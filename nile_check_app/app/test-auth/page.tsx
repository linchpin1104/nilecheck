"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuthStore } from "@/lib/auth";
import { testLocalStorage, initAuthStore, checkAuthData, clearAuthData } from "@/lib/auth-debug";

export default function TestAuthPage() {
  const [localStorageContent, setLocalStorageContent] = useState<string>("");
  const [errorMessage, setErrorMessage] = useState<string>("");
  const [isLocalStorageAvailable, setIsLocalStorageAvailable] = useState<boolean>(false);
  const [authStoreState, setAuthStoreState] = useState<{
    isAuthenticated: boolean;
    currentUser: object | null;
    userCount: number;
  } | null>(null);
  
  // 1. localStorage 테스트
  useEffect(() => {
    try {
      // localStorage 가용성 테스트
      localStorage.setItem('test-item', 'test-value');
      const testValue = localStorage.getItem('test-item');
      setIsLocalStorageAvailable(testValue === 'test-value');
      localStorage.removeItem('test-item');
      
      // 현재 localStorage 상태 확인
      const authData = localStorage.getItem('nile-check-auth');
      setLocalStorageContent(authData || "인증 데이터 없음");
    } catch (error) {
      setErrorMessage(`localStorage 오류: ${error instanceof Error ? error.message : String(error)}`);
      setIsLocalStorageAvailable(false);
    }
  }, []);
  
  // 2. Zustand 저장소 테스트
  useEffect(() => {
    try {
      const currentState = {
        isAuthenticated: useAuthStore.getState().isAuthenticated,
        currentUser: useAuthStore.getState().currentUser,
        userCount: useAuthStore.getState().users.length
      };
      setAuthStoreState(currentState);
    } catch (error) {
      setErrorMessage(`Zustand 저장소 오류: ${error instanceof Error ? error.message : String(error)}`);
    }
  }, []);
  
     // 3. 테스트 유저 생성 및 인증 설정
  const createTestUserAndLogin = () => {
    try {
      // 테스트 유저 생성
      const testUser = {
        id: "test-user-" + Date.now(),
        phoneNumber: "010-1234-5678",
        name: "테스트 사용자",
        createdAt: new Date().toISOString()
      };
      
      // 디버그 유틸리티 사용
      const result = initAuthStore(testUser);
      
      if (result.success) {
        alert("테스트 유저 생성 및 로그인 상태 설정 완료");
        window.location.reload();
      } else {
        setErrorMessage(result.message);
      }
    } catch (error) {
      setErrorMessage(`테스트 유저 생성 오류: ${error instanceof Error ? error.message : String(error)}`);
    }
  };
  
  // 4. 다른 페이지로 이동 테스트
  const navigateTo = (path: string) => {
    try {
      window.location.href = path;
    } catch (error) {
      setErrorMessage(`페이지 이동 오류: ${error instanceof Error ? error.message : String(error)}`);
    }
  };
  
  // 5. localStorage 초기화
  const clearLocalStorage = () => {
    try {
      const result = clearAuthData();
      if (result.success) {
        alert(result.message);
        window.location.reload();
      } else {
        setErrorMessage(result.message);
      }
    } catch (error) {
      setErrorMessage(`localStorage 초기화 오류: ${error instanceof Error ? error.message : String(error)}`);
    }
  };
  
  // 6. localStorage 테스트 실행
  const runLocalStorageTest = () => {
    const result = testLocalStorage();
    if (result.success) {
      alert(result.message);
    } else {
      setErrorMessage(result.message);
    }
  };
  
  return (
    <div className="container mx-auto py-10 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>인증 문제 진단 페이지</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {errorMessage && (
            <div className="p-4 bg-red-100 text-red-800 rounded-md">
              <h3 className="font-bold">오류 발생:</h3>
              <p>{errorMessage}</p>
            </div>
          )}
          
          <div className="space-y-2">
            <h3 className="font-bold">1. localStorage 상태:</h3>
            <div className="p-3 bg-gray-100 rounded-md">
              <p>사용 가능 여부: {isLocalStorageAvailable ? "✅ 가능" : "❌ 불가능"}</p>
              <p className="mt-2 font-semibold">저장된 인증 데이터:</p>
              <pre className="mt-1 whitespace-pre-wrap bg-white p-2 rounded border text-sm">
                {localStorageContent}
              </pre>
            </div>
          </div>
          
          <div className="space-y-2">
            <h3 className="font-bold">2. Zustand 저장소 상태:</h3>
            <div className="p-3 bg-gray-100 rounded-md">
              {authStoreState ? (
                <div>
                  <p>인증 상태: {authStoreState.isAuthenticated ? "✅ 로그인됨" : "❌ 로그인되지 않음"}</p>
                  <p>현재 사용자: {authStoreState.currentUser ? JSON.stringify(authStoreState.currentUser) : "없음"}</p>
                  <p>저장된 사용자 수: {authStoreState.userCount}</p>
                </div>
              ) : (
                <p>Zustand 저장소 데이터를 가져올 수 없습니다.</p>
              )}
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4">
            <Button onClick={createTestUserAndLogin}>
              테스트 유저 생성 및 로그인
            </Button>
            
            <Button onClick={clearLocalStorage} variant="destructive">
              인증 데이터 초기화
            </Button>
            
            <Button onClick={runLocalStorageTest} variant="secondary">
              localStorage 접근 테스트
            </Button>
            
            <Button onClick={() => {
              const result = checkAuthData();
              if (result.success && result.data) {
                alert(JSON.stringify(result.data, null, 2));
              } else {
                alert(result.message);
              }
            }} variant="secondary">
              현재 인증 데이터 확인
            </Button>
            
            <Button onClick={() => navigateTo('/dashboard')} variant="outline">
              대시보드로 이동
            </Button>
            
            <Button onClick={() => navigateTo('/log-activity')} variant="outline">
              활동 기록으로 이동
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
} 