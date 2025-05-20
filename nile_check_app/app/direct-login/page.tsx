"use client";

import { createTestUser, setDirectAuth, checkAuthData, clearAuthData } from "@/lib/fix-auth";
import { useState, useEffect } from "react";

export default function DirectLoginPage() {
  const [authStatus, setAuthStatus] = useState<{cookie: boolean, localStorage: boolean}>({
    cookie: false,
    localStorage: false
  });
  
  // 페이지 로드 시 인증 상태 확인
  useEffect(() => {
    checkAuthStatus();
  }, []);
  
  // 인증 상태 확인 함수
  const checkAuthStatus = () => {
    // 쿠키 확인
    const hasCookie = typeof document !== 'undefined' && document.cookie.includes('nile-check-auth=');
    
    // localStorage 확인
    let hasLocalStorage = false;
    try {
      const authData = localStorage.getItem('nile-check-auth');
      hasLocalStorage = !!authData;
    } catch (e) {
      console.error("localStorage 확인 중 오류:", e);
    }
    
    setAuthStatus({
      cookie: hasCookie,
      localStorage: hasLocalStorage
    });
    
    return { hasCookie, hasLocalStorage };
  };
  
  return (
    <div className="p-8 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">직접 로그인 설정 (긴급 인증)</h1>
      <p className="mb-4">이 페이지는 미들웨어를 우회하여 인증 상태를 직접 설정합니다. 로그인 문제 해결용입니다.</p>
      
      <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-md">
        <h2 className="text-lg font-semibold mb-2">현재 인증 상태</h2>
        <div className="space-y-2">
          <div className="flex items-center">
            <div className={`w-4 h-4 rounded-full mr-2 ${authStatus.cookie ? 'bg-green-500' : 'bg-red-500'}`}></div>
            <span>인증 쿠키: {authStatus.cookie ? '있음' : '없음'}</span>
          </div>
          <div className="flex items-center">
            <div className={`w-4 h-4 rounded-full mr-2 ${authStatus.localStorage ? 'bg-green-500' : 'bg-red-500'}`}></div>
            <span>로컬 스토리지: {authStatus.localStorage ? '있음' : '없음'}</span>
          </div>
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
        <div className="p-4 border rounded-md shadow-sm">
          <h2 className="text-lg font-semibold mb-4">긴급 인증 설정</h2>
          <button
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 w-full"
            onClick={() => {
              try {
                // 테스트 유저 생성
                const testUser = createTestUser();
                
                // 저장 전 기존 데이터 확인
                const checkResult = checkAuthData();
                console.log("기존 데이터 확인 결과:", checkResult);
                
                // 새 데이터 저장
                const authResult = setDirectAuth(testUser);
                console.log("인증 설정 결과:", authResult);
                
                // 인증 상태 갱신
                checkAuthStatus();
                
                if (authResult.success) {
                  alert("로그인 성공! 대시보드로 이동합니다.");
                  // 짧은 지연 후 이동
                  setTimeout(() => {
                    window.location.href = '/dashboard';
                  }, 500);
                } else {
                  alert("로그인 실패: " + authResult.message);
                }
              } catch (error) {
                console.error("오류 발생:", error);
                alert("오류 발생: " + String(error));
              }
            }}
          >
            긴급 로그인 설정 및 대시보드로 이동
          </button>
        </div>
        
        <div className="p-4 border rounded-md shadow-sm">
          <h2 className="text-lg font-semibold mb-4">인증 정보 관리</h2>
          
          <div className="space-y-3">
            <button
              className="px-4 py-2 bg-gray-200 text-gray-800 rounded hover:bg-gray-300 w-full"
              onClick={() => {
                const result = checkAuthData();
                checkAuthStatus();
                
                if (result.success && result.data) {
                  alert("현재 인증 데이터:\n" + JSON.stringify(result.data, null, 2));
                } else {
                  alert(result.message);
                }
              }}
            >
              현재 인증 데이터 자세히 확인
            </button>
            
            <button
              className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600 w-full"
              onClick={() => {
                const result = clearAuthData();
                
                // 쿠키도 삭제 시도
                document.cookie = "nile-check-auth=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT";
                
                checkAuthStatus();
                alert(result.message);
              }}
            >
              모든 인증 데이터 삭제
            </button>
          </div>
        </div>
      </div>
      
      <div className="mt-6 p-4 border rounded-md shadow-sm">
        <h2 className="text-lg font-semibold mb-4">저장소 작동 테스트</h2>
        <button
          className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 block w-full"
          onClick={() => {
            // 테스트 - localStorage가 작동하는지 확인
            try {
              localStorage.setItem('test-key', 'test-value');
              const testValue = localStorage.getItem('test-key');
              localStorage.removeItem('test-key');
              
              if (testValue === 'test-value') {
                alert("localStorage 테스트 성공!");
              } else {
                alert("localStorage 테스트 실패: 값을 읽을 수 없습니다");
              }
            } catch (error) {
              alert("localStorage 테스트 중 오류 발생: " + String(error));
            }
          }}
        >
          localStorage 작동 테스트
        </button>
        
        <button
          className="mt-3 px-4 py-2 bg-yellow-500 text-white rounded hover:bg-yellow-600 block w-full"
          onClick={() => {
            // 상태 새로고침
            checkAuthStatus();
            alert("인증 상태 확인이 완료되었습니다.");
          }}
        >
          인증 상태 새로고침
        </button>
      </div>
    </div>
  );
} 