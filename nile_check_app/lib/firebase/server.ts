import { initializeApp, getApp, getApps, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';
import { db } from './firebase';

// 클라이언트 측 Firestore 인스턴스를 서버에서도 사용할 수 있도록 함
export async function connectToFirestore() {
  try {
    console.log('[Firebase Server] Firestore 연결 시도...');
    
    // 이미 클라이언트 측 Firebase가 초기화되어 있으면 그것을 사용
    if (db) {
      console.log('[Firebase Server] 클라이언트 측 Firestore 인스턴스 사용');
      return db;
    }
    
    // 아직 초기화되지 않았으면 오류
    console.error('[Firebase Server] Firestore 인스턴스가 초기화되지 않음');
    throw new Error('Firestore 인스턴스가 초기화되지 않았습니다.');
  } catch (error) {
    console.error('[Firebase Server] Firestore 연결 오류:', error);
    
    // 오류가 발생해도 일단 진행 시도
    if (db) return db;
    
    // db가 없으면 null 반환, 이후 코드에서 처리해야 함
    return null;
  }
} 