import { NextResponse } from 'next/server';
import { db } from '@/lib/firebase/firebase';
import { doc, deleteDoc } from 'firebase/firestore';

export async function POST(request: Request) {
  try {
    const { phoneNumber } = await request.json();
    
    // 전화번호에서 하이픈 제거
    const userId = phoneNumber.replace(/-/g, '');
    
    console.log(`[API] 테스트 데이터 삭제 시작 - 사용자: ${userId}, 전화번호: ${phoneNumber}`);
    
    // 1. 사용자 정보 삭제 시도
    try {
      const userRef = doc(db, 'users', userId);
      await deleteDoc(userRef);
      console.log(`[API] 사용자 데이터 삭제 완료: ${userId}`);
    } catch (error) {
      console.log(`[API] 사용자 데이터 삭제 실패: ${error}`);
    }
    
    // 2. 앱 데이터 삭제 시도
    try {
      const appDataRef = doc(db, 'appData', userId);
      await deleteDoc(appDataRef);
      console.log(`[API] 앱 데이터 삭제 완료: ${userId}`);
    } catch (error) {
      console.log(`[API] 앱 데이터 삭제 실패: ${error}`);
    }
    
    // 3. user_default 데이터도 함께 삭제 (종종 이 ID가 사용됨)
    try {
      const defaultAppDataRef = doc(db, 'appData', 'user_default');
      await deleteDoc(defaultAppDataRef);
      console.log(`[API] user_default 앱 데이터 삭제 완료`);
    } catch (error) {
      console.log(`[API] user_default 앱 데이터 삭제 실패: ${error}`);
    }
    
    // 4. 인증 상태도 초기화하는 안내
    return NextResponse.json({ 
      success: true, 
      message: '테스트 데이터가 삭제되었습니다.', 
      instructions: '브라우저에서 로컬스토리지도 함께 삭제하세요. 개발자 도구(F12) > Application > Local Storage > 해당 도메인 선택 > "nile-check"로 시작하는 항목 삭제'
    });
  } catch (error) {
    console.error('테스트 데이터 삭제 중 오류 발생:', error);
    return NextResponse.json({ error: '서버 오류가 발생했습니다.' }, { status: 500 });
  }
} 