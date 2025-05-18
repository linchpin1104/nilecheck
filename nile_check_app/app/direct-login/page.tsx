"use client";

import { createTestUser, setDirectAuth, checkAuthData, clearAuthData } from "@/lib/fix-auth";

export default function DirectLoginPage() {
  return (
    <div className="p-8">
      <h1 className="text-xl font-bold mb-4">직접 로그인 설정</h1>
      <p className="mb-4">이 페이지는 미들웨어를 완전히 우회하여 인증 상태를 직접 설정합니다.</p>
      
      <button
        className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
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
            
            if (authResult.success) {
              alert("로그인 성공! 대시보드로 이동합니다.");
              // 즉시 이동
              window.location.href = '/dashboard';
            } else {
              alert("로그인 실패: " + authResult.message);
            }
          } catch (error) {
            console.error("오류 발생:", error);
            alert("오류 발생: " + String(error));
          }
        }}
      >
        긴급 로그인 및 대시보드로 이동
      </button>
      
      <div className="mt-8">
        <h2 className="text-lg font-semibold mb-2">디버깅 도구</h2>
        <button
          className="px-4 py-2 bg-gray-200 text-gray-800 rounded hover:bg-gray-300 mr-2"
          onClick={() => {
            const result = checkAuthData();
            if (result.success && result.data) {
              alert("현재 인증 데이터:\n" + JSON.stringify(result.data, null, 2));
            } else {
              alert(result.message);
            }
          }}
        >
          현재 인증 데이터 확인
        </button>
        
        <button
          className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600"
          onClick={() => {
            const result = clearAuthData();
            alert(result.message);
            window.location.reload();
          }}
        >
          인증 데이터 삭제
        </button>
        
        <button
          className="mt-4 px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 block w-full"
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
      </div>
    </div>
  );
} 