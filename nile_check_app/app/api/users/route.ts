import { NextResponse } from 'next/server';
import { db } from '@/lib/firebase/firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { UserProfile } from '@/types';

// 사용자 프로필 조회
export async function GET(request: Request) {
  try {
    // URL에서 uid 파라미터 추출
    const { searchParams } = new URL(request.url);
    const uid = searchParams.get('uid');

    if (!uid) {
      return NextResponse.json({ error: '사용자 ID가 필요합니다.' }, { status: 400 });
    }

    // Firestore에서 사용자 프로필 조회
    const userRef = doc(db, 'users', uid);
    const userDoc = await getDoc(userRef);

    if (!userDoc.exists()) {
      return NextResponse.json({ error: '사용자를 찾을 수 없습니다.' }, { status: 404 });
    }

    const userData = userDoc.data() as UserProfile;
    return NextResponse.json(userData);
  } catch (error) {
    console.error('사용자 조회 중 오류 발생:', error);
    return NextResponse.json({ error: '서버 오류가 발생했습니다.' }, { status: 500 });
  }
}

// 사용자 프로필 생성/수정
export async function POST(request: Request) {
  try {
    const userData = await request.json();
    const { uid } = userData;

    if (!uid) {
      return NextResponse.json({ error: '사용자 ID가 필요합니다.' }, { status: 400 });
    }

    // 현재 로그인된 사용자의 uid와 일치하는지 확인 (보안 검증)
    // 실제 구현에서는 서버 미들웨어나 Firebase Admin SDK를 통한 인증 검증이 필요
    
    const userRef = doc(db, 'users', uid);
    
    // Firestore에 사용자 정보 저장
    await setDoc(userRef, userData, { merge: true });
    
    return NextResponse.json({ success: true, message: '사용자 정보가 저장되었습니다.' });
  } catch (error) {
    console.error('사용자 정보 저장 중 오류 발생:', error);
    return NextResponse.json({ error: '서버 오류가 발생했습니다.' }, { status: 500 });
  }
} 