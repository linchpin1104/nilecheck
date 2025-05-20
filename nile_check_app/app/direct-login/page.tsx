"use client";

import { createTestUser, setDirectAuth, checkAuthData, clearAuthData } from "@/lib/fix-auth";
import { useState, useEffect } from "react";
import { useSession } from "@/contexts/SessionProvider";

export default function DirectLoginPage() {
  const [authStatus, setAuthStatus] = useState<{cookie: boolean, localStorage: boolean}>({
    cookie: false,
    localStorage: false
  });
  
  const { login: contextLogin } = useSession();
  
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
                
                // 세션 컨텍스트 업데이트
                if (authResult.success) {
                  // SessionProvider의 login 함수 호출하여 클라이언트 상태 업데이트
                  contextLogin(testUser);
                  
                  // 인증 상태 갱신
                  checkAuthStatus();
                  
                  alert("로그인 성공! 대시보드로 이동합니다.");
                  // 지연 후 이동 - pathname 기반 상대 경로 사용
                  setTimeout(() => {
                    // 현재 URL의 오리진을 유지하여 도메인 간 전환 방지
                    const currentOrigin = window.location.origin;
                    window.location.href = `${currentOrigin}/dashboard`;
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
                
                // 쿠키도 삭제 시도 - SameSite와 Secure 속성 추가
                document.cookie = "nile-check-auth=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Lax; Secure";
                
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
      
      <div className="mt-6 p-4 border border-blue-200 bg-blue-50 rounded-md">
        <h2 className="text-lg font-semibold mb-2">현재 도메인 정보</h2>
        <p className="text-sm mb-1">현재 URL: <code className="bg-white px-1 rounded">{typeof window !== 'undefined' ? window.location.href : '클라이언트에서 확인 필요'}</code></p>
        <p className="text-sm mb-1">현재 도메인: <code className="bg-white px-1 rounded">{typeof window !== 'undefined' ? window.location.hostname : '클라이언트에서 확인 필요'}</code></p>
        <p className="text-sm">쿠키 도메인은 현재 브라우저 URL의 도메인과 일치해야 합니다.</p>
      </div>
    </div>
  );
} 