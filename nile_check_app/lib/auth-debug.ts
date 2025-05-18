// 인증 관련 디버깅을 위한 유틸리티

// User interface
interface UserData {
  id: string;
  phoneNumber: string;
  name: string;
  email?: string;
  createdAt?: string;
  [key: string]: unknown;
}

// Auth data interface
interface AuthData {
  state: {
    currentUser: UserData | null;
    isAuthenticated: boolean;
    users: Array<UserData & { password: string }>;
    verificationRequests: unknown[];
  };
  version: number;
}

// localStorage 접근 테스트
export const testLocalStorage = (): { success: boolean; message: string } => {
  try {
    // 테스트 키-값 쓰기
    localStorage.setItem('auth-debug-test', 'test-value');
    
    // 테스트 키-값 읽기
    const value = localStorage.getItem('auth-debug-test');
    
    // 테스트 키-값 삭제
    localStorage.removeItem('auth-debug-test');
    
    if (value === 'test-value') {
      return { success: true, message: "localStorage 접근 가능" };
    } else {
      return { success: false, message: "localStorage 값 저장/읽기 실패" };
    }
  } catch (error) {
    return { 
      success: false, 
      message: `localStorage 접근 오류: ${error instanceof Error ? error.message : String(error)}` 
    };
  }
};

// Zustand 저장소 초기화 (인증 저장소 설정)
export const initAuthStore = (userData: UserData): { success: boolean; message: string } => {
  try {
    // 테스트 유저 데이터로 인증 상태 직접 생성
    const authData: AuthData = {
      state: {
        currentUser: userData,
        isAuthenticated: true,
        users: [{ ...userData, password: "123456" }],
        verificationRequests: []
      },
      version: 0
    };
    
    // localStorage에 직접 저장
    localStorage.setItem('nile-check-auth', JSON.stringify(authData));
    
    return { success: true, message: "인증 저장소 초기화 성공" };
  } catch (error) {
    return { 
      success: false, 
      message: `인증 저장소 초기화 오류: ${error instanceof Error ? error.message : String(error)}` 
    };
  }
};

// 현재 저장된 인증 데이터 확인
export const checkAuthData = (): { success: boolean; message: string; data?: AuthData } => {
  try {
    const authData = localStorage.getItem('nile-check-auth');
    
    if (!authData) {
      return { success: false, message: "인증 데이터가 없습니다" };
    }
    
    // 데이터 파싱 시도
    const parsedData = JSON.parse(authData) as AuthData;
    
    return { 
      success: true, 
      message: "인증 데이터 확인 성공", 
      data: parsedData 
    };
  } catch (error) {
    return { 
      success: false, 
      message: `인증 데이터 확인 오류: ${error instanceof Error ? error.message : String(error)}` 
    };
  }
};

// 인증 데이터 삭제
export const clearAuthData = (): { success: boolean; message: string } => {
  try {
    localStorage.removeItem('nile-check-auth');
    return { success: true, message: "인증 데이터 삭제 성공" };
  } catch (error) {
    return { 
      success: false, 
      message: `인증 데이터 삭제 오류: ${error instanceof Error ? error.message : String(error)}` 
    };
  }
}; 