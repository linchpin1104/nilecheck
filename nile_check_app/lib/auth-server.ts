import { jwtVerify, SignJWT } from 'jose';
import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';
import { createFirestoreUser, getFirestoreUserByPhone, TEST_USERS, standardizePhoneNumber, removeHyphens } from './firebase/db-service';

export interface User {
  id: string;
  phoneNumber: string;
  name: string;
  email?: string;
  createdAt: string;
  childrenInfo?: {
    count: number;
    ageGroups: string[];
  };
}

// 로그인 결과 인터페이스
interface LoginResult {
  success: boolean;
  message: string;
  token?: string;
  user?: User;
}

// JWT 시크릿 키
const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || 'nile-check-default-secret-key-for-development'
);

// JWT 만료 시간 (7일)
const JWT_EXPIRES_IN = '7d';

// 토큰 쿠키 이름
const TOKEN_COOKIE_NAME = 'nile-check-auth';

// 인증 상태 확인
export async function getServerSession() {
  // 쿠키 스토어 접근
  const cookieStore = await cookies();
  const token = cookieStore.get(TOKEN_COOKIE_NAME)?.value;
  
  if (!token) {
    return null;
  }
  
  try {
    const verified = await jwtVerify(token, JWT_SECRET);
    return verified.payload.user as User;
  } catch (error) {
    console.error('Invalid token:', error);
    return null;
  }
}

// 로그인
export async function login(phoneNumber: string, password: string): Promise<LoginResult> {
  try {
    console.log(`[Auth] 로그인 시도 - 전화번호: ${phoneNumber}`);
    
    // 국제 전화번호 형식 처리 (+82로 시작하면 0으로 변환)
    if (phoneNumber.startsWith('+82')) {
      const originalPhone = phoneNumber;
      phoneNumber = '0' + phoneNumber.substring(3);
      console.log(`[Auth] 국제 전화번호 형식 변환: ${originalPhone} -> ${phoneNumber}`);
    }
    
    // 전화번호 표준화
    const standardizedPhone = standardizePhoneNumber(phoneNumber);
    const phoneWithoutHyphens = removeHyphens(standardizedPhone);
    console.log(`[Auth] 표준화된 전화번호: ${standardizedPhone}, 하이픈 없는 형식: ${phoneWithoutHyphens}`);
    
    let firestoreUser = null;
    
    // 실제 Firestore에서 사용자 조회 시도
    try {
      console.log(`[Auth] Firestore에서 전화번호로 사용자 조회 시도`);
      firestoreUser = await getFirestoreUserByPhone(standardizedPhone);
      console.log(`[Auth] Firestore 조회 결과:`, firestoreUser ? "사용자 발견" : "사용자 없음");
      
      if (firestoreUser) {
        console.log(`[Auth] 사용자 ID: ${firestoreUser.uid}, 이름: ${firestoreUser.name}`);
      } else {
        console.warn(`[Auth] 사용자 정보가 Firebase에 없음: ${standardizedPhone}`);
        return {
          success: false,
          message: `입력하신 전화번호(${phoneNumber})로 등록된 사용자를 찾을 수 없습니다.`
        };
      }
    } catch (firestoreError) {
      console.warn('[Auth] Firestore에서 사용자 조회 중 오류:', firestoreError);
      
      // 상세 오류 로깅
      if (firestoreError instanceof Error) {
        console.error(`[Auth] Firestore 조회 오류 메시지: ${firestoreError.message}`);
        console.error(`[Auth] Firestore 조회 오류 스택: ${firestoreError.stack}`);
      }
      
      return {
        success: false,
        message: "사용자 정보를 조회하는 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요."
      };
    }
    
    // Firestore 사용자가 존재하고 비밀번호가 일치하면 로그인
    if (firestoreUser) {
      console.log(`[Auth] 비밀번호 검증 시도`);
      
      if (firestoreUser.password === password) {
        console.log(`[Auth] Firestore에서 인증 성공: ${firestoreUser.uid}`);
        
        // User from Firestore for session
        const user: User = {
          id: firestoreUser.uid,
          phoneNumber: firestoreUser.phoneNumber,
          name: firestoreUser.name,
          email: firestoreUser.email,
          createdAt: firestoreUser.createdAt
        };
        
        console.log(`[Auth] 세션 생성 중: ${user.id}`);
        const token = await createSession(user);
        
        if (!token) {
          console.error('[Auth] 세션 토큰 생성 실패');
          return {
            success: false,
            message: "로그인 세션을 생성하는데 실패했습니다. 잠시 후 다시 시도해주세요."
          };
        }
        
        console.log(`[Auth] 세션 토큰 생성됨`);
        return {
          success: true,
          message: "로그인 성공",
          token,
          user
        };
      } else {
        console.log(`[Auth] 비밀번호 불일치 - 전화번호: ${standardizedPhone}`);
        return {
          success: false,
          message: "비밀번호가 일치하지 않습니다."
        };
      }
    }
    
    // 테스트 사용자 로그인 (개발용)
    if (standardizedPhone === '010-1234-5678' && password === '123456') {
      console.log('[Auth] 테스트 사용자로 로그인');
      const user: User = {
        id: 'user_default',
        phoneNumber: '010-1234-5678',
        name: '테스트 사용자',
        email: 'test@example.com',
        createdAt: new Date().toISOString()
      };
      
      const token = await createSession(user);
      
      if (!token) {
        console.error('[Auth] 테스트 세션 토큰 생성 실패');
        return {
          success: false,
          message: "테스트 로그인 세션을 생성하는데 실패했습니다."
        };
      }
      
      console.log(`[Auth] 테스트 사용자 세션 토큰 생성됨`);
      return {
        success: true,
        message: "테스트 사용자로 로그인 성공",
        token,
        user
      };
    }
    
    // 새로 가입한 회원도 로그인 할 수 있도록 동일한 전화번호 검사 (비상 대체 로직)
    for (const testUser of TEST_USERS) {
      // 전화번호의 다양한 형식을 모두 비교
      if ((testUser.phoneNumber === standardizedPhone || 
           testUser.phoneNumber === phoneWithoutHyphens ||
           removeHyphens(testUser.phoneNumber) === phoneWithoutHyphens) && 
          testUser.password === password) {
        console.log(`[Auth] TEST_USERS 배열에서 회원 정보 발견: ${testUser.id}`);
        const token = await createSession(testUser);
        
        if (!token) {
          return {
            success: false,
            message: "로그인 세션을 생성하는데 실패했습니다."
          };
        }
        
        return {
          success: true,
          message: "로그인 성공 (메모리 저장소)",
          token,
          user: testUser
        };
      }
    }
    
    console.log(`[Auth] 로그인 실패 - 전화번호: ${standardizedPhone}`);
    return {
      success: false,
      message: `입력하신 정보로 로그인할 수 없습니다. 회원가입 여부를 확인해주세요.`
    };
  } catch (error) {
    console.error('[Auth] 로그인 오류:', error);
    
    // 상세 오류 로깅
    if (error instanceof Error) {
      console.error(`[Auth] 오류 메시지: ${error.message}`);
      console.error(`[Auth] 오류 스택: ${error.stack}`);
    }
    
    return {
      success: false,
      message: "로그인 처리 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요."
    };
  }
}

// 세션 생성 및 쿠키 설정
export async function createSession(user: User): Promise<string> {
  const token = await new SignJWT({ user })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(JWT_EXPIRES_IN)
    .sign(JWT_SECRET);
  
  return token;
}

// 응답에 인증 쿠키 설정
export function setAuthCookie(response: NextResponse, token: string) {
  response.cookies.set({
    name: TOKEN_COOKIE_NAME,
    value: token,
    httpOnly: true,
    path: '/',
    secure: process.env.NODE_ENV === 'production',
    maxAge: 60 * 60 * 24 * 7, // 7일
    sameSite: 'lax',
    domain: undefined // 도메인 지정을 제거하여 현재 도메인에만 쿠키 적용
  });
  
  // Set cookie in headers directly as well for maximum compatibility
  const cookieHeader = `${TOKEN_COOKIE_NAME}=${token}; Path=/; Max-Age=${60 * 60 * 24 * 7}; HttpOnly; SameSite=Lax`;
  
  // Append to existing Set-Cookie headers if any
  const existingCookies = response.headers.get('Set-Cookie');
  if (existingCookies) {
    response.headers.set('Set-Cookie', `${existingCookies}, ${cookieHeader}`);
  } else {
    response.headers.set('Set-Cookie', cookieHeader);
  }
  
  return response;
}

// 쿠키 제거
export function clearAuthCookie(response: NextResponse) {
  // 인증 쿠키 제거
  response.cookies.set({
    name: TOKEN_COOKIE_NAME,
    value: '',
    httpOnly: true,
    path: '/',
    secure: process.env.NODE_ENV === 'production',
    maxAge: 0,
    sameSite: 'lax',
    domain: undefined // 도메인 지정을 제거하여 현재 도메인에만 쿠키 적용
  });
  
  // 전화번호 쿠키도 제거
  response.cookies.set({
    name: 'user-phone',
    value: '',
    path: '/',
    maxAge: 0,
    sameSite: 'lax',
  });
  
  // Clear cookie in headers directly as well for maximum compatibility
  const cookieHeader = `${TOKEN_COOKIE_NAME}=; Path=/; Max-Age=0; HttpOnly; SameSite=Lax`;
  const phoneHeader = `user-phone=; Path=/; Max-Age=0; SameSite=Lax`;
  
  // Append to existing Set-Cookie headers if any
  const existingCookies = response.headers.get('Set-Cookie');
  if (existingCookies) {
    response.headers.set('Set-Cookie', `${existingCookies}, ${cookieHeader}, ${phoneHeader}`);
  } else {
    response.headers.set('Set-Cookie', `${cookieHeader}, ${phoneHeader}`);
  }
  
  return response;
}

// 사용자 등록
export async function register(userData: Omit<User, 'id' | 'createdAt'>, password: string): Promise<LoginResult> {
  try {
    console.log('[Auth] 회원가입 시작:', { 
      phoneNumber: userData.phoneNumber, 
      name: userData.name,
      hasEmail: !!userData.email
    });
    
    let userId: string;
    
    // Firestore에 사용자 추가 시도
    try {
      console.log('[Auth] Firestore에 사용자 생성 시도 중');
      userId = await createFirestoreUser(userData, password);
      console.log(`[Auth] Firestore에 사용자 생성 성공. ID: ${userId}`);
    } catch (firestoreError) {
      // Firebase 오류 발생 시 전화번호 기반 ID 생성
      console.warn('[Auth] Firestore에 사용자 생성 실패, 대체 ID 사용:', firestoreError);
      
      // 상세 오류 로깅
      if (firestoreError instanceof Error) {
        console.error(`[Auth] Firestore 오류 메시지: ${firestoreError.message}`);
        console.error(`[Auth] Firestore 오류 스택: ${firestoreError.stack}`);
      }
      
      userId = removeHyphens(userData.phoneNumber) || `user_${Date.now()}`;
      console.log(`[Auth] 대체 사용자 ID 생성: ${userId}`);
      
      return {
        success: false,
        message: "회원가입 처리 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요."
      };
    }
    
    // JWT 토큰용 사용자 객체
    const newUser: User = {
      id: userId,
      ...userData,
      createdAt: new Date().toISOString()
    };
    
    console.log(`[Auth] 세션 생성을 위한 사용자 객체 준비:`, { 
      id: newUser.id, 
      phoneNumber: newUser.phoneNumber, 
      name: newUser.name 
    });
    
    // 인증 세션 생성
    const token = await createSession(newUser);
    console.log('[Auth] 세션 토큰 생성 완료');
    
    if (!token) {
      console.error('[Auth] 토큰 생성 실패');
      return {
        success: false,
        message: "회원가입은 성공했지만 자동 로그인에 실패했습니다. 로그인 페이지에서 로그인해주세요."
      };
    }
    
    return {
      success: true,
      message: "회원가입이 완료되었습니다.",
      token,
      user: newUser
    };
  } catch (err) {
    console.error('[Auth] 회원가입 오류:', err);
    
    // 상세 오류 로깅
    if (err instanceof Error) {
      console.error(`[Auth] 오류 메시지: ${err.message}`);
      console.error(`[Auth] 오류 스택: ${err.stack}`);
    }
    
    return {
      success: false,
      message: "회원가입 처리 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요."
    };
  }
}

// 요청의 인증 확인 미들웨어 헬퍼 함수
export async function authenticateRequest(request: NextRequest) {
  const token = request.cookies.get(TOKEN_COOKIE_NAME)?.value;
  
  if (!token) {
    return null;
  }
  
  try {
    const verified = await jwtVerify(token, JWT_SECRET);
    return verified.payload.user as User;
  } catch {
    return null;
  }
} 