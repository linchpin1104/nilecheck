/**
 * 인증 문제 해결을 위한 유틸리티 함수
 * 미들웨어 없이 직접 인증 상태를 조작합니다.
 */

export interface EmergencyUser {
  id: string;
  phoneNumber: string;
  name: string;
  email?: string;
  createdAt: string;
}

// Auth data interface
interface AuthData {
  state: {
    currentUser: EmergencyUser | null;
    isAuthenticated: boolean;
    users: Array<EmergencyUser & { password: string }>;
    verificationRequests: unknown[];
  };
  version: number;
}

/**
 * 브라우저 서비스 없이 직접 인증 상태를 설정합니다
 */
export function setDirectAuth(user: EmergencyUser): { success: boolean; message: string } {
  try {
    // 브라우저 환경인지 확인
    if (typeof window === 'undefined' || typeof localStorage === 'undefined') {
      return { success: false, message: '브라우저 환경에서만 호출 가능합니다' };
    }

    // localStorage에 사용자 정보 저장
    localStorage.setItem('nile-check-auth', JSON.stringify({
      isAuthenticated: true,
      currentUser: user
    }));
    
    // 세션 스토리지에도 저장 (백업용)
    sessionStorage.setItem('nile-check-user', JSON.stringify(user));
    
    return {
      success: true,
      message: `사용자 ${user.name}(${user.phoneNumber})로 로그인 되었습니다.`
    };
  } catch (error) {
    console.error("인증 설정 오류:", error);
    return {
      success: false,
      message: `로그인 설정 중 오류 발생: ${error instanceof Error ? error.message : String(error)}`
    };
  }
}

/**
 * 인증 데이터를 초기화합니다
 */
export function clearAuthData(): { success: boolean; message: string } {
  try {
    // 브라우저 환경인지 확인
    if (typeof window === 'undefined' || typeof localStorage === 'undefined') {
      return { success: false, message: '브라우저 환경에서만 호출 가능합니다' };
    }

    localStorage.removeItem('nile-check-auth');
    sessionStorage.removeItem('nile-check-user');
    
    return {
      success: true,
      message: "인증 데이터가 삭제되었습니다."
    };
  } catch (error) {
    return {
      success: false,
      message: `인증 데이터 삭제 중 오류 발생: ${error instanceof Error ? error.message : String(error)}`
    };
  }
}

/**
 * 인증 데이터를 검사합니다
 */
export function checkAuthData(): { success: boolean; message: string; data?: AuthData } {
  try {
    const authData = localStorage.getItem('nile-check-auth');
    if (!authData) {
      return {
        success: false,
        message: "저장된 인증 데이터가 없습니다."
      };
    }
    
    return {
      success: true,
      message: "인증 데이터 확인 성공",
      data: JSON.parse(authData)
    };
  } catch (error) {
    return {
      success: false,
      message: `인증 데이터 확인 중 오류 발생: ${error instanceof Error ? error.message : String(error)}`
    };
  }
}

/**
 * 간단한 테스트 사용자 생성
 */
export function createTestUser(): EmergencyUser {
  return {
    id: "test_user_1",
    phoneNumber: "010-5299-5990",
    name: "테스트 사용자",
    email: "test@example.com",
    createdAt: new Date().toISOString()
  };
} 