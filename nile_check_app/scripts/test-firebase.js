// scripts/test-firebase.js
// Firebase 연결 테스트용 스크립트

const { initializeApp } = require('firebase/app');
const { getFirestore, doc, setDoc, collection, getDocs } = require('firebase/firestore');
require('dotenv').config({ path: '.env.local' });

// Firebase 설정
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

// 설정 확인
console.log('Firebase 설정 확인:');
console.log('API Key:', process.env.NEXT_PUBLIC_FIREBASE_API_KEY ? '설정됨' : '누락');
console.log('Project ID:', process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || '누락');
console.log('Auth Domain:', process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || '누락');

async function testFirebase() {
  try {
    console.log('Firebase 초기화 시작...');
    const app = initializeApp(firebaseConfig);
    console.log('Firebase 앱 초기화 성공');
    
    const db = getFirestore(app);
    console.log('Firestore 인스턴스 생성 성공');
    
    // 기존 사용자 확인
    console.log('기존 사용자 목록 확인 중...');
    try {
      const usersRef = collection(db, 'users');
      const snapshot = await getDocs(usersRef);
      
      if (snapshot.empty) {
        console.log('사용자 컬렉션이 비어 있습니다.');
      } else {
        console.log(`사용자 수: ${snapshot.size}`);
        snapshot.forEach(doc => {
          const data = doc.data();
          console.log(`- ID: ${doc.id}, 이름: ${data.name}, 전화번호: ${data.phoneNumber}`);
        });
      }
    } catch (err) {
      console.error('사용자 목록 조회 실패:', err);
    }
    
    // 테스트 문서 생성
    console.log('테스트 문서 생성 시도...');
    const testDocRef = doc(db, 'test_collection', 'test_document');
    
    await setDoc(testDocRef, {
      message: '테스트 성공',
      timestamp: new Date().toISOString(),
      phoneNumber: '01052995980' // 테스트에 사용할 전화번호
    });
    
    console.log('테스트 문서 생성 성공!');
    
    // 테스트 사용자 생성
    console.log('테스트 사용자 생성 시도...');
    const testUserRef = doc(db, 'users', '01052995980');
    
    await setDoc(testUserRef, {
      uid: '01052995980',
      name: '테스트 사용자',
      phoneNumber: '010-5299-5980',
      email: 'test@example.com',
      passwordHash: '$2a$10$abcdefghijklmnopqrstuvwxyzABCDEF', // 가짜 비밀번호 해시
      createdAt: new Date().toISOString(),
      verified: true
    });
    
    console.log('테스트 사용자 생성 성공!');
    console.log('Firebase 테스트 완료!');
  } catch (error) {
    console.error('Firebase 테스트 실패:', error);
  }
}

testFirebase(); 