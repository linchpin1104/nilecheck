import { db } from './firebase';
import { doc, getDoc, setDoc, collection, query, where, getDocs, updateDoc, Timestamp, addDoc, deleteDoc } from 'firebase/firestore';
import { User } from '@/lib/auth-server';
import bcrypt from 'bcrypt';

// Collection names
const USERS_COLLECTION = 'users';
const USER_DATA_COLLECTION = 'user_data';
const VERIFICATION_COLLECTION = 'verifications';

// Interface for user document in Firestore
export interface FirestoreUser extends Omit<User, 'id'> {
  uid: string;
  passwordHash: string; // 해시된 비밀번호
  password?: string; // 이전 호환성을 위해 유지 (점진적으로 제거 예정)
  phoneNumber: string;
  verified: boolean;
}

// Interface for verification request in Firestore
export interface VerificationRequest {
  phoneNumber: string;
  code: string;
  requestId: string;
  createdAt: Timestamp;
  verified: boolean;
  attempts: number;
}

// 테스트 데이터 - 실제 구현에서는 데이터베이스로 대체
interface UserWithPassword extends User {
  password: string;
}

// 전역 테스트 사용자 배열 (세션 로그인용)
export const TEST_USERS: UserWithPassword[] = [
  {
    id: 'user_default',
    phoneNumber: '010-1234-5678',
    name: '테스트 사용자',
    email: 'test@example.com',
    createdAt: new Date().toISOString(),
    password: '123456'
  }
];

/**
 * 전화번호를 표준 형식으로 변환 (xxx-xxxx-xxxx)
 */
export function standardizePhoneNumber(phoneNumber: string): string {
  // 숫자만 남기기
  const digitsOnly = phoneNumber.replace(/[^0-9]/g, '');
  
  // 한국 휴대폰 번호 형식 (11자리)에 맞는지 확인
  if (digitsOnly.length === 11) {
    return `${digitsOnly.substring(0, 3)}-${digitsOnly.substring(3, 7)}-${digitsOnly.substring(7)}`;
  }
  
  // 원래 형식 반환 (기본적으로는 입력값 그대로)
  return phoneNumber;
}

/**
 * 전화번호에서 하이픈 제거
 */
export function removeHyphens(phoneNumber: string): string {
  return phoneNumber.replace(/-/g, '');
}

/**
 * Create or update a user in Firestore
 */
export async function createFirestoreUser(user: Omit<User, 'id' | 'createdAt'>, password: string): Promise<string> {
  try {
    console.log(`[DB] 사용자 생성 시작 - 전화번호: ${user.phoneNumber}`);
    
    // DB 연결 확인
    if (!db) {
      console.error('[DB] Firestore 인스턴스가 초기화되지 않았습니다.');
      throw new Error('Firestore 연결 오류');
    }
    
    // 전화번호 표준화 - 하이픈이 있는 형식(xxx-xxxx-xxxx)으로 통일
    const standardPhoneNumber = standardizePhoneNumber(user.phoneNumber);
    console.log(`[DB] 전화번호 표준화: ${user.phoneNumber} -> ${standardPhoneNumber}`);
    
    // 전화번호에서 숫자만 추출하여 ID 생성 (일관된 사용자 ID 생성)
    const userId = removeHyphens(standardPhoneNumber);
    console.log(`[DB] 생성된 사용자 ID: ${userId}`);
    
    // 비밀번호 해시 처리 (개발 환경에서도 해시 처리)
    let passwordHash;
    try {
      passwordHash = await bcrypt.hash(password, 10);
      console.log(`[DB] 비밀번호 해시 처리 완료`);
    } catch (hashError) {
      console.error('[DB] 비밀번호 해시 처리 중 오류:', hashError);
      // 해시 처리에 실패하면 일반 텍스트로 저장하지 않고 오류 발생
      throw new Error('비밀번호 해시 처리 중 오류가 발생했습니다.');
    }
    
    // Create user document with standardized phone number and hashed password
    const userDoc: FirestoreUser = {
      uid: userId,
      phoneNumber: standardPhoneNumber, // 표준화된 번호 사용
      name: user.name,
      email: user.email || '',
      passwordHash: passwordHash, // 해시된 비밀번호 저장
      createdAt: new Date().toISOString(),
      verified: true
    };
    
    console.log(`[DB] 사용자 문서 준비 완료`, { 
      uid: userDoc.uid,
      phoneNumber: userDoc.phoneNumber,
      name: userDoc.name,
      hasEmail: !!userDoc.email
    });
    
    // Reference to the user document
    const userRef = doc(db, USERS_COLLECTION, userId);
    console.log(`[DB] 콜렉션 경로: ${USERS_COLLECTION}/${userId}`);
    
    // 이미 존재하는 전화번호인지 확인
    try {
      // 우선 정확히 같은 ID로 문서가 있는지 확인
      const existingUserDoc = await getDoc(userRef);
      
      if (existingUserDoc.exists()) {
        console.log(`[DB] 이미 존재하는 사용자 ID: ${userId}`);
        const existingUser = existingUserDoc.data() as FirestoreUser;
        
        // 기존 사용자 정보 업데이트 (비밀번호 포함)
        const updatedUserDoc = {
          ...existingUser,
          name: user.name,
          email: user.email || existingUser.email,
          passwordHash: passwordHash, // 업데이트된 해시 비밀번호
          phoneNumber: standardPhoneNumber, // 표준화된 번호로 항상 업데이트
        };
        
        // 기존 사용자 문서 업데이트
        await setDoc(userRef, updatedUserDoc);
        console.log(`[DB] 기존 사용자 정보 업데이트 완료: ${userId}`);
        
        // 개발 환경에서만 테스트 사용자 배열에 추가
        if (process.env.NODE_ENV === 'development') {
          updateTestUsers(userId, standardPhoneNumber, user.name, user.email || '', password, existingUser.createdAt);
        }
        
        return userId;
      }
      
      // ID로 찾을 수 없으면 전화번호로 검색
      const existingUserByPhone = await getFirestoreUserByPhone(standardPhoneNumber);
      
      if (existingUserByPhone) {
        console.log(`[DB] 해당 전화번호로 이미 가입한 사용자가 있습니다: ${existingUserByPhone.uid}`);
        
        // 사용자 ID가 다를 경우 - 기존 문서 업데이트 및 새 ID 문서 생성
        if (existingUserByPhone.uid !== userId) {
          console.log(`[DB] 기존 ID(${existingUserByPhone.uid})와 새 ID(${userId})가 다릅니다. 문서 이전 필요`);
          
          // 같은 전화번호에 대한 문서가 두 개 생기지 않도록 기존 문서 제거
          await deleteDoc(doc(db, USERS_COLLECTION, existingUserByPhone.uid));
          console.log(`[DB] 기존 문서 삭제 완료: ${existingUserByPhone.uid}`);
        }
        
        // 사용자 정보 업데이트 
        const updatedUserDoc = {
          ...existingUserByPhone,
          uid: userId, // 새 ID로 업데이트
          name: user.name,
          email: user.email || existingUserByPhone.email,
          passwordHash: passwordHash, // 해시된 비밀번호로 업데이트
          phoneNumber: standardPhoneNumber, // 표준화된 번호 사용
        };
        
        // 기존 password 필드가 있다면 제거 (보안 강화)
        if ('password' in updatedUserDoc) {
          delete updatedUserDoc.password;
        }
        
        // 새 ID로 문서 생성
        await setDoc(userRef, updatedUserDoc);
        console.log(`[DB] 사용자 정보 새 ID로 이전 완료: ${userId}`);
        
        // 개발 환경에서만 테스트 사용자 배열에 추가
        if (process.env.NODE_ENV === 'development') {
          updateTestUsers(userId, standardPhoneNumber, user.name, user.email || '', password, existingUserByPhone.createdAt);
        }
        
        return userId;
      }
    } catch (error) {
      console.warn('[DB] 기존 사용자 조회 중 오류:', error);
      // 오류가 발생해도 계속 진행 (새 사용자 생성)
    }
    
    // 새 사용자 생성
    console.log(`[DB] Firestore에 사용자 문서 저장 시도...`);
    await setDoc(userRef, userDoc);
    
    console.log(`[DB] 사용자가 Firestore에 성공적으로 생성됨. ID: ${userId}`);
    
    // 개발 환경에서만 테스트 사용자 배열에 추가
    if (process.env.NODE_ENV === 'development') {
      updateTestUsers(userId, standardPhoneNumber, user.name, user.email || '', password, userDoc.createdAt);
    }
    
    return userId;
  } catch (error) {
    console.error('[DB] Firestore에 사용자 생성/업데이트 중 오류:', error);
    
    // 에러 세부 정보 로깅
    if (error instanceof Error) {
      console.error(`[DB] 에러 메시지: ${error.message}`);
      console.error(`[DB] 에러 스택: ${error.stack}`);
    }
    
    throw error;
  }
}

/**
 * TEST_USERS 배열 업데이트 헬퍼 함수
 */
function updateTestUsers(
  userId: string,
  phoneNumber: string,
  name: string,
  email: string, 
  password: string,
  createdAt: string
): void {
  // 전화번호로 기존 사용자 찾기
  const testUserIndex = TEST_USERS.findIndex((u: UserWithPassword) => 
    u.phoneNumber === phoneNumber || u.id === userId
  );
  
  const userData = {
    id: userId,
    phoneNumber,
    name,
    email,
    createdAt,
    password
  };
  
  if (testUserIndex >= 0) {
    TEST_USERS[testUserIndex] = userData;
    console.log(`[DB] TEST_USERS 배열에서 사용자 업데이트됨: ${userId}`);
  } else {
    TEST_USERS.push(userData);
    console.log(`[DB] TEST_USERS 배열에 사용자 추가됨: ${userId}`);
  }
}

/**
 * Get a user from Firestore by ID
 */
export async function getFirestoreUserById(userId: string): Promise<FirestoreUser | null> {
  try {
    const userRef = doc(db, USERS_COLLECTION, userId);
    const userDoc = await getDoc(userRef);
    
    if (userDoc.exists()) {
      return userDoc.data() as FirestoreUser;
    }
    
    return null;
  } catch (error) {
    console.error('Error getting user from Firestore:', error);
    throw error;
  }
}

/**
 * Get a user from Firestore by phone number
 */
export async function getFirestoreUserByPhone(phoneNumber: string): Promise<FirestoreUser | null> {
  try {
    console.log(`[DB] 전화번호로 사용자 찾기 시작: ${phoneNumber}`);
    
    // DB 연결 확인
    if (!db) {
      console.error('[DB] Firestore 인스턴스가 초기화되지 않았습니다.');
      throw new Error('Firestore 연결 오류');
    }
    
    // 전화번호 표준화
    const standardPhone = standardizePhoneNumber(phoneNumber);
    console.log(`[DB] 검색할 표준 전화번호: ${standardPhone}`);
    
    // 사용자 ID로 직접 조회 (가장 빠른 방법)
    const userId = removeHyphens(standardPhone);
    console.log(`[DB] 사용자 ID로 직접 조회: ${userId}`);
    
    const userRef = doc(db, USERS_COLLECTION, userId);
    const userDoc = await getDoc(userRef);
    
    if (userDoc.exists()) {
      const userData = userDoc.data() as FirestoreUser;
      console.log(`[DB] 사용자 ID로 직접 발견: ${userData.uid}`);
      return userData;
    }
    
    // +82 형식 ID로 검색 (한국 번호만 해당)
    if (standardPhone.startsWith('010-')) {
      const e164Format = standardPhone.replace(/^010-/, '+82');
      const e164FormatNoHyphen = removeHyphens(e164Format);
      console.log(`[DB] 국제 형식 ID로 검색: ${e164FormatNoHyphen}`);
      
      const e164UserRef = doc(db, USERS_COLLECTION, e164FormatNoHyphen);
      const e164UserDoc = await getDoc(e164UserRef);
      
      if (e164UserDoc.exists()) {
        const userData = e164UserDoc.data() as FirestoreUser;
        console.log(`[DB] 국제 형식 ID로 사용자 발견: ${userData.uid}`);
        return userData;
      }
    }
    
    // ID로 찾을 수 없는 경우, 전화번호로 쿼리 수행
    console.log(`[DB] ID로 찾을 수 없어 전화번호로 검색: ${standardPhone}`);
    
    // 표준화된 번호로 쿼리
    const usersRef = collection(db, USERS_COLLECTION);
    const q = query(usersRef, where('phoneNumber', '==', standardPhone));
    const querySnapshot = await getDocs(q);
    
    console.log(`[DB] 표준 번호 쿼리 결과 수: ${querySnapshot.size}`);
    
    if (!querySnapshot.empty) {
      const userData = querySnapshot.docs[0].data() as FirestoreUser;
      console.log(`[DB] 표준 번호로 사용자 발견: ${userData.uid}`);
      return userData;
    }
    
    // 국제 형식 (+82) 검색 - 한국 번호의 경우
    if (standardPhone.startsWith('010-')) {
      const e164Format = standardPhone.replace(/^010-/, '+82');
      console.log(`[DB] 국제 형식으로 검색: ${e164Format}`);
      
      const e164Query = query(usersRef, where('phoneNumber', '==', e164Format));
      const e164QuerySnapshot = await getDocs(e164Query);
      
      if (!e164QuerySnapshot.empty) {
        const userData = e164QuerySnapshot.docs[0].data() as FirestoreUser;
        console.log(`[DB] 국제 형식으로 사용자 발견: ${userData.uid}`);
        return userData;
      }
      
      // 하이픈 없는 국제 형식 검색
      const e164NoHyphen = removeHyphens(e164Format);
      console.log(`[DB] 하이픈 없는 국제 형식으로 검색: ${e164NoHyphen}`);
      
      const e164NoHyphenQuery = query(usersRef, where('phoneNumber', '==', e164NoHyphen));
      const e164NoHyphenSnapshot = await getDocs(e164NoHyphenQuery);
      
      if (!e164NoHyphenSnapshot.empty) {
        const userData = e164NoHyphenSnapshot.docs[0].data() as FirestoreUser;
        console.log(`[DB] 하이픈 없는 국제 형식으로 사용자 발견: ${userData.uid}`);
        return userData;
      }
    }
    
    // 국내 형식 (010) 검색 - 국제 형식으로 저장된 번호의 경우
    if (phoneNumber.startsWith('+82')) {
      const localFormat = `010-${phoneNumber.substring(3, 7)}-${phoneNumber.substring(7)}`;
      console.log(`[DB] 국내 형식으로 검색: ${localFormat}`);
      
      const localQuery = query(usersRef, where('phoneNumber', '==', localFormat));
      const localQuerySnapshot = await getDocs(localQuery);
      
      if (!localQuerySnapshot.empty) {
        const userData = localQuerySnapshot.docs[0].data() as FirestoreUser;
        console.log(`[DB] 국내 형식으로 사용자 발견: ${userData.uid}`);
        return userData;
      }
    }
    
    // 하이픈이 없는 형식으로 시도
    const noHyphenPhone = removeHyphens(phoneNumber);
    
    // 하이픈 없는 번호로 사용자 ID로 직접 조회
    const altUserRef = doc(db, USERS_COLLECTION, noHyphenPhone);
    const altUserDoc = await getDoc(altUserRef);
    
    if (altUserDoc.exists()) {
      const userData = altUserDoc.data() as FirestoreUser;
      console.log(`[DB] 하이픈 없는 ID로 사용자 발견: ${userData.uid}`);
      return userData;
    }
    
    // 하이픈 없는 전화번호로 쿼리
    const altQ = query(usersRef, where('phoneNumber', '==', noHyphenPhone));
    const altQuerySnapshot = await getDocs(altQ);
    
    if (!altQuerySnapshot.empty) {
      const userData = altQuerySnapshot.docs[0].data() as FirestoreUser;
      console.log(`[DB] 하이픈 없는 번호로 사용자 발견: ${userData.uid}`);
      return userData;
    }
    
    // 디버깅: 모든 사용자 정보 조회
    try {
      const allUsersSnapshot = await getDocs(collection(db, USERS_COLLECTION));
      console.log(`[DB] 전체 사용자 수: ${allUsersSnapshot.size}`);
      
      if (allUsersSnapshot.size > 0) {
        console.log('[DB] 저장된 사용자 목록:');
        allUsersSnapshot.forEach((doc) => {
          const user = doc.data() as FirestoreUser;
          console.log(`- ID: ${user.uid}, 전화번호: ${user.phoneNumber}, 이름: ${user.name}`);
        });
      }
    } catch (error) {
      console.error('[DB] 전체 사용자 조회 중 오류:', error);
    }
    
    console.log(`[DB] ${phoneNumber} 전화번호로 사용자를 찾을 수 없음`);
    return null;
  } catch (error) {
    console.error('Error getting user by phone from Firestore:', error);
    
    // 상세 오류 로깅
    if (error instanceof Error) {
      console.error(`[DB] 오류 메시지: ${error.message}`);
      console.error(`[DB] 오류 스택: ${error.stack}`);
    }
    
    throw error;
  }
}

/**
 * Update user data in Firestore
 */
export async function updateFirestoreUser(userId: string, userData: Partial<FirestoreUser>): Promise<void> {
  try {
    const userRef = doc(db, USERS_COLLECTION, userId);
    await updateDoc(userRef, userData);
  } catch (error) {
    console.error('Error updating user in Firestore:', error);
    throw error;
  }
}

/**
 * Save user-specific data to Firestore
 */
export async function saveUserData(userId: string, dataType: string, data: Record<string, unknown>): Promise<void> {
  try {
    const userDataRef = doc(db, USER_DATA_COLLECTION, userId);
    await setDoc(userDataRef, { 
      [dataType]: data,
      updatedAt: new Date().toISOString()
    }, { merge: true });
  } catch (error) {
    console.error(`Error saving ${dataType} data for user ${userId}:`, error);
    throw error;
  }
}

/**
 * Get user-specific data from Firestore
 */
export async function getUserData(userId: string, dataType?: string): Promise<Record<string, unknown> | null> {
  try {
    const userDataRef = doc(db, USER_DATA_COLLECTION, userId);
    const userDataDoc = await getDoc(userDataRef);
    
    if (userDataDoc.exists()) {
      const data = userDataDoc.data();
      return dataType ? data[dataType] as Record<string, unknown> : data as Record<string, unknown>;
    }
    
    return null;
  } catch (error) {
    console.error(`Error getting ${dataType || 'all'} data for user ${userId}:`, error);
    throw error;
  }
}

/**
 * Create a new verification request in Firestore
 */
export async function createVerificationRequest(phoneNumber: string, code: string): Promise<string> {
  try {
    console.log(`Attempting to create verification request for phone: ${phoneNumber}`);
    
    // Generate unique request ID
    const requestId = `verify_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    console.log(`Generated request ID: ${requestId}`);
    
    // Create verification request document
    const verificationDoc: Omit<VerificationRequest, 'createdAt'> & { createdAt: Date } = {
      phoneNumber,
      code,
      requestId,
      createdAt: new Date(),
      verified: false,
      attempts: 0
    };
    
    console.log(`Verification document prepared:`, verificationDoc);
    console.log(`Using Firestore instance:`, db ? "Valid" : "Invalid");
    
    // Add to Firestore
    const verificationRef = await addDoc(collection(db, VERIFICATION_COLLECTION), verificationDoc);
    
    console.log(`Verification request created in Firestore with ID: ${verificationRef.id}`);
    return requestId;
  } catch (error) {
    console.error('Error creating verification request in Firestore:', error);
    throw error;
  }
}

/**
 * Get a verification request from Firestore by request ID and phone number
 */
export async function getVerificationRequest(requestId: string, phoneNumber: string): Promise<(VerificationRequest & { _id: string }) | null> {
  try {
    console.log(`Attempting to get verification request. RequestID: ${requestId}, Phone: ${phoneNumber}`);
    
    // Query verification collection
    const verificationsRef = collection(db, VERIFICATION_COLLECTION);
    const q = query(
      verificationsRef, 
      where('requestId', '==', requestId),
      where('phoneNumber', '==', phoneNumber)
    );
    
    console.log(`Executing Firestore query for verification request`);
    const querySnapshot = await getDocs(q);
    
    console.log(`Query completed. Found ${querySnapshot.size} documents.`);
    
    if (!querySnapshot.empty) {
      const verificationDoc = querySnapshot.docs[0];
      const verification = verificationDoc.data() as VerificationRequest;
      
      // Add document ID for future updates
      const result = { ...verification, _id: verificationDoc.id };
      
      console.log(`Retrieved verification:`, result);
      return result;
    }
    
    console.log(`No verification found with requestId: ${requestId} and phone: ${phoneNumber}`);
    return null;
  } catch (error) {
    console.error('Error getting verification request from Firestore:', error);
    throw error;
  }
}

/**
 * Update a verification request in Firestore
 */
export async function updateVerificationRequest(verification: VerificationRequest & { _id?: string }): Promise<void> {
  try {
    if (!verification._id) {
      throw new Error('Verification document ID is required for update');
    }
    
    const verificationRef = doc(db, VERIFICATION_COLLECTION, verification._id);
    
    // Remove document ID from the data to update
    const updateData = Object.entries(verification)
      .filter(([key]) => key !== '_id')
      .reduce((obj, [key, value]) => ({ ...obj, [key]: value }), {});
    
    await updateDoc(verificationRef, updateData);
  } catch (error) {
    console.error('Error updating verification request in Firestore:', error);
    throw error;
  }
}

/**
 * Delete expired verification requests older than 5 minutes
 */
export async function cleanExpiredVerifications(): Promise<void> {
  try {
    const fiveMinutesAgo = new Date();
    fiveMinutesAgo.setMinutes(fiveMinutesAgo.getMinutes() - 5);
    
    const verificationsRef = collection(db, VERIFICATION_COLLECTION);
    const q = query(verificationsRef, where('createdAt', '<', Timestamp.fromDate(fiveMinutesAgo)));
    
    const querySnapshot = await getDocs(q);
    
    const deletePromises = querySnapshot.docs.map(doc => deleteDoc(doc.ref));
    await Promise.all(deletePromises);
    
    console.log(`Deleted ${querySnapshot.size} expired verification requests`);
  } catch (error) {
    console.error('Error cleaning expired verifications in Firestore:', error);
    throw error;
  }
}

/**
 * Check if a phone number has been verified
 */
export async function isPhoneNumberVerified(phoneNumber: string): Promise<boolean> {
  try {
    console.log(`Checking if phone number ${phoneNumber} has been verified`);
    
    const verificationsRef = collection(db, VERIFICATION_COLLECTION);
    const q = query(
      verificationsRef, 
      where('phoneNumber', '==', phoneNumber),
      where('verified', '==', true)
    );
    
    console.log(`Executing Firestore query for verified phone`);
    const querySnapshot = await getDocs(q);
    
    const isVerified = !querySnapshot.empty;
    console.log(`Phone ${phoneNumber} verification status: ${isVerified ? 'Verified' : 'Not Verified'}`);
    
    return isVerified;
  } catch (error) {
    console.error('Error checking phone verification status in Firestore:', error);
    throw error;
  }
} 