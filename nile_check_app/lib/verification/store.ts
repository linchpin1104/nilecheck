// 인증 저장소 타입 정의
export interface VerificationStore {
  [phoneNumber: string]: {
    phoneNumber: string;
    code: string;
    requestId: string;
    createdAt: number;
    verified: boolean;
    attempts: number;
  };
}

// 명확한 타입 정의
export interface VerificationRequest {
  id: string;
  phoneNumber: string;
  code: string;
  createdAt: Date;
  verified: boolean;
  attempts: number;
  expiresAt: Date;
}

// Global type augmentation for global store
declare global {
  var __mockVerificationStore: VerificationStore | undefined;
}

// 개발용 가짜 인증 저장소 초기화
if (!globalThis.__mockVerificationStore) {
  globalThis.__mockVerificationStore = {};
}

// 저장소 인스턴스 export
export const mockVerificationStore: VerificationStore = globalThis.__mockVerificationStore; 