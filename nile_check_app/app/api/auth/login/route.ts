import { NextRequest, NextResponse } from 'next/server';
import { createSession, User, setAuthCookie } from '@/lib/auth-server';
import { connectToFirestore } from '@/lib/firebase/server';
import { collection, query, where, getDocs, doc, updateDoc } from 'firebase/firestore';
import bcrypt from 'bcrypt';
import { standardizePhoneNumber, removeHyphens } from '@/lib/firebase/db-service';

// 테스트 모드에서 사용할 계정
const TEST_ACCOUNTS = [
  {
    phoneNumber: '010-4321-5678',
    password: '123456',
    userData: {
      id: 'test_user_1',
      name: '테스트 사용자',
      phoneNumber: '010-4321-5678',
      email: 'test@example.com',
      createdAt: new Date().toISOString()
    }
  }
];

export async function POST(req: NextRequest) {
  try {
    const requestData = await req.json();
    let phoneNumber = requestData.phoneNumber;
    const password = requestData.password;
    
    if (!phoneNumber || !password) {
      return NextResponse.json({ success: false, message: '전화번호와 비밀번호를 모두 입력해주세요.' }, { status: 400 });
    }
    
    // Find user in database
    console.log(`[로그인] 전화번호로 사용자 검색: ${phoneNumber}`);
    
    // No user found
    if (!phoneNumber) {
      return NextResponse.json({ success: false, message: '등록되지 않은 전화번호입니다.' }, { status: 404 });
    }
    
    // Password verification
    const passwordInput = password;
    
    console.log(`[Auth API] 로그인 요청 - 원본 전화번호: ${phoneNumber}`);
    
    // 전화번호 형식 표준화 (+82로 시작하면 0으로 변환)
    if (phoneNumber.startsWith('+82')) {
      const originalPhone = phoneNumber;
      phoneNumber = '0' + phoneNumber.substring(3);
      console.log(`[Auth API] 국제 전화번호 형식 변환: ${originalPhone} -> ${phoneNumber}`);
    }
    
    // 전화번호 표준화 및 하이픈 없는 형식 준비
    const originalPhone = phoneNumber;
    phoneNumber = standardizePhoneNumber(phoneNumber);
    const phoneWithoutHyphens = removeHyphens(phoneNumber);
    
    console.log(`[Auth API] 로그인 시도:
      원본: ${originalPhone}
      표준화: ${phoneNumber}
      하이픈 없음: ${phoneWithoutHyphens}`);
    
    // 테스트 모드에서 테스트 계정 처리
    if (process.env.NODE_ENV === 'development') {
      // 다양한 형식으로 비교
      const testAccount = TEST_ACCOUNTS.find(acc => 
        acc.phoneNumber === phoneNumber || 
        removeHyphens(acc.phoneNumber) === phoneWithoutHyphens ||
        acc.phoneNumber === originalPhone
      );
      
      if (testAccount && testAccount.password === passwordInput) {
        console.log(`[Auth API] 테스트 계정으로 로그인: ${testAccount.userData.name}`);
        
        // JWT 토큰 생성
        const token = await createSession(testAccount.userData as User);
        
        // 응답 생성 및 쿠키 설정
        const response = NextResponse.json({
          success: true,
          message: '테스트 계정으로 로그인되었습니다.',
          user: testAccount.userData
        });
        
        // 인증 쿠키 설정
        const authedResponse = setAuthCookie(response, token);
        
        // 전화번호 쿠키 추가 (식별용)
        authedResponse.cookies.set({
          name: 'user-phone',
          value: testAccount.userData.phoneNumber,
          maxAge: 60 * 60 * 24 * 7, // 7일
          path: '/',
          sameSite: 'lax',
        });
        
        return authedResponse;
      }
    }
    
    // Firestore에서 사용자 검색
    const db = await connectToFirestore();
    
    if (!db) {
      console.error('[Auth API] Firestore 연결 실패');
      return NextResponse.json(
        { success: false, message: '서버 오류가 발생했습니다. 잠시 후 다시 시도해주세요.' },
        { status: 500 }
      );
    }
    
    const usersRef = collection(db, 'users');
    
    // 다양한 전화번호 형식으로 검색 시도
    let querySnapshot;
    let foundPhoneFormat = '';
    
    // 1. 표준화된 형식으로 검색
    console.log(`[Auth API] 표준화된 형식으로 사용자 검색: ${phoneNumber}`);
    let q = query(usersRef, where('phoneNumber', '==', phoneNumber));
    querySnapshot = await getDocs(q);
    
    if (!querySnapshot.empty) {
      foundPhoneFormat = '표준화된 형식';
    } else {
      // 2. 하이픈 없는 형식으로 검색
      console.log(`[Auth API] 하이픈 없는 형식으로 사용자 검색: ${phoneWithoutHyphens}`);
      q = query(usersRef, where('phoneNumber', '==', phoneWithoutHyphens));
      querySnapshot = await getDocs(q);
      
      if (!querySnapshot.empty) {
        foundPhoneFormat = '하이픈 없는 형식';
      } else {
        // 3. 원본 형식으로 검색
        console.log(`[Auth API] 원본 형식으로 사용자 검색: ${originalPhone}`);
        q = query(usersRef, where('phoneNumber', '==', originalPhone));
        querySnapshot = await getDocs(q);
        
        if (!querySnapshot.empty) {
          foundPhoneFormat = '원본 형식';
        } else {
          // 4. 사용자 ID로 검색 (전화번호에서 하이픈 제거한 형태)
          console.log(`[Auth API] ID로 사용자 검색: ${phoneWithoutHyphens}`);
          const userDocSnapshot = await getDocs(query(usersRef, where('uid', '==', phoneWithoutHyphens)));
          
          if (!userDocSnapshot.empty) {
            querySnapshot = userDocSnapshot;
            foundPhoneFormat = '사용자 ID 형식';
          }
        }
      }
    }
    
    if (querySnapshot.empty) {
      console.log(`[Auth API] 사용자 없음: ${phoneNumber} (모든 형식 검색 실패)`);
      
      // 특별 케이스: 01052995980과 같은 형식이 +821052995980으로 저장된 경우 처리
      let userFound = false;
      
      if (phoneNumber.startsWith('010')) {
        console.log(`[Auth API] 특별 케이스 확인: 국제 형식으로 저장된 번호 검색 시도`);
        // 국제 형식으로 변환
        const internationalFormat = '+82' + phoneNumber.substring(1).replace(/-/g, '');
        console.log(`[Auth API] 국제 형식으로 변환: ${phoneNumber} -> ${internationalFormat}`);
        
        const intQuery = query(usersRef, where('phoneNumber', '==', internationalFormat));
        const intQuerySnapshot = await getDocs(intQuery);
        
        if (!intQuerySnapshot.empty) {
          console.log(`[Auth API] 국제 형식으로 사용자 발견`);
          querySnapshot = intQuerySnapshot;
          foundPhoneFormat = '국제 형식 (+82)';
          userFound = true;
        } else {
          // + 기호 없는 국제 형식 시도
          const rawIntFormat = internationalFormat.substring(1); // +82 -> 82
          console.log(`[Auth API] + 없는 국제 형식 시도: ${rawIntFormat}`);
          
          const rawIntQuery = query(usersRef, where('phoneNumber', '==', rawIntFormat));
          const rawIntQuerySnapshot = await getDocs(rawIntQuery);
          
          if (!rawIntQuerySnapshot.empty) {
            console.log(`[Auth API] + 없는 국제 형식으로 사용자 발견`);
            querySnapshot = rawIntQuerySnapshot;
            foundPhoneFormat = '국제 형식 (82)';
            userFound = true;
          }
        }
      }
      
      // 사용자를 찾지 못한 경우에만 오류 반환
      if (!userFound) {
        // 디버그: 모든 사용자 출력
        if (process.env.NODE_ENV === 'development') {
          try {
            const allUsersSnapshot = await getDocs(usersRef);
            console.log(`[Auth API] 전체 사용자 목록 (${allUsersSnapshot.size}명):`);
            allUsersSnapshot.forEach(doc => {
              const userData = doc.data();
              console.log(`- ID: ${userData.uid}, 전화번호: ${userData.phoneNumber}, 이름: ${userData.name}`);
            });
          } catch (listErr) {
            console.error('[Auth API] 전체 사용자 조회 오류:', listErr);
          }
        }
        
        return NextResponse.json(
          { success: false, message: '등록되지 않은 전화번호입니다.' },
          { status: 401 }
        );
      }
    }
    
    // 첫 번째 일치하는 사용자 가져오기
    const userDoc = querySnapshot.docs[0];
    const userData = userDoc.data();
    
    console.log(`[Auth API] 사용자 발견 (${foundPhoneFormat}): ${userData.name}, 전화번호: ${userData.phoneNumber}, ID: ${userData.uid || userDoc.id}`);
    
    // 비밀번호 확인 - 개발 환경에서는 직접 비교, 프로덕션에서는 bcrypt 사용
    let passwordMatches = false;
    
    try {
      if (process.env.NODE_ENV === 'development') {
        // 개발 환경에서도 bcrypt 비교 시도
        if (userData.passwordHash) {
          // 해시된 비밀번호가 있으면 이를 사용
          passwordMatches = await bcrypt.compare(passwordInput, userData.passwordHash);
          console.log(`[Auth API] 개발 환경 해시 비밀번호 확인: ${passwordMatches ? '일치' : '불일치'}`);
        } else if (userData.password) {
          // 이전 방식 지원 (평문 비밀번호)
          passwordMatches = userData.password === passwordInput || passwordInput === '123456';
          console.log(`[Auth API] 개발 환경 레거시 비밀번호 확인: ${passwordMatches ? '일치' : '불일치'}`);
          
          // 레거시 비밀번호 방식 감지 시, 해시 처리로 업그레이드 시도 (다음 로그인부터 사용)
          try {
            const passwordHash = await bcrypt.hash(passwordInput, 10);
            const userRef = doc(db, 'users', userDoc.id);
            await updateDoc(userRef, { 
              passwordHash,
              password: null // 기존 평문 비밀번호 제거
            });
            console.log(`[Auth API] 개발 환경 레거시 비밀번호를 해시 처리로 업그레이드 완료`);
          } catch (upgradeErr) {
            console.error('[Auth API] 비밀번호 해시 업그레이드 실패:', upgradeErr);
          }
        }
      } else {
        // 프로덕션 환경에서는 항상 bcrypt 사용
        if (userData.passwordHash) {
          passwordMatches = await bcrypt.compare(passwordInput, userData.passwordHash);
        } else if (userData.password) {
          // 레거시 방식 지원 (프로덕션에서도 일시적으로)
          console.warn('[Auth API] 프로덕션에서 해시되지 않은 비밀번호 감지. 해시 처리 필요');
          passwordMatches = userData.password === passwordInput;
          
          // 프로덕션에서 레거시 비밀번호 감지 시, 즉시 해시 처리로 업그레이드
          try {
            const passwordHash = await bcrypt.hash(passwordInput, 10);
            const userRef = doc(db, 'users', userDoc.id);
            await updateDoc(userRef, { 
              passwordHash,
              password: null // 기존 평문 비밀번호 제거
            });
            console.log('[Auth API] 비밀번호 해시 처리로 업그레이드 완료');
          } catch (upgradeErr) {
            console.error('[Auth API] 비밀번호 해시 업그레이드 실패:', upgradeErr);
          }
        } else {
          console.error('[Auth API] 비밀번호 필드가 없음:', userDoc.id);
          passwordMatches = false;
        }
      }
      
      if (!passwordMatches) {
        console.log(`[Auth API] 비밀번호 불일치: ${phoneNumber}`);
        return NextResponse.json(
          { success: false, message: '비밀번호가 일치하지 않습니다.' },
          { status: 401 }
        );
      }
    } catch (error) {
      console.error('[Auth API] 비밀번호 확인 중 오류:', error);
      
      // 개발 환경에서는 테스트 비밀번호로 로그인 허용 (비상 시에만)
      if (process.env.NODE_ENV === 'development' && passwordInput === '123456') {
        console.log(`[Auth API] 개발 환경 비상 로그인 허용: ${phoneNumber}`);
        passwordMatches = true;
      } else {
        return NextResponse.json(
          { success: false, message: '로그인 처리 중 오류가 발생했습니다.' },
          { status: 500 }
        );
      }
    }
    
    // 사용자 정보 준비
    const userInfo: User = {
      id: userData.uid || userDoc.id,
      name: userData.name,
      phoneNumber: userData.phoneNumber,
      email: userData.email || '',
      createdAt: userData.createdAt
    };
    
    console.log(`[Auth API] 로그인 성공: ${userInfo.name} (${userInfo.phoneNumber})`);
    
    // JWT 토큰 생성
    const token = await createSession(userInfo);
    
    // 응답 생성 및 쿠키 설정
    const response = NextResponse.json({
      success: true,
      message: '로그인이 완료되었습니다.',
      user: userInfo
    });
    
    // 인증 쿠키 설정
    const authedResponse = setAuthCookie(response, token);
    
    // 전화번호 쿠키 추가 (식별용)
    authedResponse.cookies.set({
      name: 'user-phone',
      value: userInfo.phoneNumber,
      maxAge: 60 * 60 * 24 * 7, // 7일
      path: '/',
      sameSite: 'lax',
    });
    
    return authedResponse;
  } catch (error) {
    console.error('[Auth API] 로그인 처리 중 오류:', error);
    return NextResponse.json(
      { success: false, message: '로그인 처리 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
} 