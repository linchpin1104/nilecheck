import { db } from '@/lib/firebase/firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { NextResponse } from 'next/server';

/**
 * API 응답을 생성하는 유틸리티 함수
 */
export function createApiResponse(data: Record<string, unknown>, success = true, message = '', status = 200) {
  return NextResponse.json({
    success,
    message,
    ...data
  }, { status });
}

/**
 * API 에러 응답을 생성하는 유틸리티 함수
 */
export function createApiErrorResponse(message: string, status = 400, errorDetails?: unknown) {
  console.error(`[API Error] ${message}`, errorDetails);
  return NextResponse.json({
    success: false,
    message,
    error: errorDetails ? String(errorDetails) : undefined
  }, { status });
}

/**
 * 사용자 데이터를 가져오는 유틸리티 함수
 */
export async function getUserAppData(uid: string) {
  if (!uid) {
    throw new Error('사용자 ID가 필요합니다.');
  }

  try {
    const appDataRef = doc(db, 'appData', uid);
    const appDataDoc = await getDoc(appDataRef);
    
    if (!appDataDoc.exists()) {
      return { exists: false, data: null, ref: appDataRef };
    }
    
    return { 
      exists: true, 
      data: appDataDoc.data(), 
      ref: appDataRef 
    };
  } catch (error) {
    console.error(`[API] 사용자 데이터 조회 오류 - ID: ${uid}`, error);
    throw new Error(`사용자 데이터 조회 중 오류가 발생했습니다: ${error}`);
  }
}

/**
 * 새 ID를 생성하는 유틸리티 함수
 */
export function generateId(prefix = 'item') {
  return `${prefix}_${crypto.randomUUID()}`;
}

/**
 * 트랜잭션 안전한 업데이트 유틸리티
 */
export async function updateUserAppData(uid: string, updateFn: (data: Record<string, unknown>) => Record<string, unknown>) {
  try {
    const { exists, data, ref } = await getUserAppData(uid);
    
    const defaultData = { 
      meals: [],
      sleep: [],
      checkins: [],
      wellnessReports: []
    };
    
    const updatedData = updateFn(exists && data ? data : defaultData);
    
    await setDoc(ref, updatedData, { merge: true });
    return { success: true, data: updatedData };
  } catch (error) {
    console.error(`[API] 사용자 데이터 업데이트 오류 - ID: ${uid}`, error);
    throw new Error(`사용자 데이터 업데이트 중 오류가 발생했습니다: ${error}`);
  }
}

/**
 * 로그 유틸리티
 */
export function logApiAction(action: string, details?: Record<string, unknown>) {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[API] ${action}${detailsStr}`);
} 