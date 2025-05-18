// 사용자 프로필
export interface UserProfile {
  uid: string;
  email: string | null;
  name: string | null;
  phoneNumber: string | null;
  isPhoneVerified: boolean;
  createdAt: string; // ISO 형식
  childrenInfo?: {
    count: number;
    ageGroups: string[]; // 영아, 유아, 초등학생 등
  };
}

// 식사 기록
export interface MealEntry {
  id: string;
  type: 'breakfast' | 'lunch' | 'dinner' | 'snack';
  dateTime: string; // ISO 형식
  status: 'eaten' | 'skipped';
  description?: string;
  quality?: number; // 1-5 척도
  withChildren?: boolean; // 자녀와 함께했는지
  foodTypes?: string[]; // 음식 유형 (채소, 고기 등)
  waterIntake?: number; // 물 섭취량
}

// 수면 기록
export interface SleepEntry {
  id: string;
  startTime: string; // ISO 형식
  endTime: string; // ISO 형식
  quality: number; // 1-5 척도
  wokeUpDuringNight?: boolean;
  wakeUpCount?: number;
  wakeUpReason?: 'child' | 'stress' | 'other';
}

// 정서 체크인
export interface WellbeingCheckinInputData {
  stressLevel: number; // 1-10 척도
  mainEmotions: string[]; // "joy", "sadness" 등
  otherEmotionDetail?: string;
  todayActivities: string[]; // "exercise", "childcare" 등
  otherActivityDetail?: string;
  conversationPartner?: string; // 'spouse', 'friend' 등
  otherConversationPartnerDetail?: string;
  spouseConversationTopics?: string[]; // 'dailyChat', 'kidsTalk' 등
  otherSpouseTopicDetail?: string;
  parentingChallenges?: string[]; // 'timeManagement', 'discipline' 등
  selfCareTime?: number; // 분 단위
}

// 체크인 기록
export interface WellbeingCheckinRecord {
  id: string;
  dateTime: string; // ISO 형식
  date: string; // YYYY-MM-DD 형식
  input: WellbeingCheckinInputData;
  output: null; 
}

// 웰니스 리포트
export interface WellnessReportRecord {
  id: string;
  weekStartDate: string; // ISO 형식
  generatedDate: string; // ISO 형식 
  input: { 
    weekStartDate: string;
    dailyCheckins: Array<{
      date: string; 
      stressLevel?: number;
      emotions?: string[]; 
      activities?: string[]; 
    }>;
    weeklyLogSummary: {
      averageSleepHours?: number;
      averageSleepQuality?: number; 
      mealsLoggedCount?: number;
    };
    userLanguage: string; 
  };
  output: {
    overallSummary: string;
    positiveObservations: string[];
    areasForAttention: string[];
    actionableAdvice: string[];
  } | null; 
}

// 앱 데이터 저장소
export interface AppStoreData {
  meals: MealEntry[];
  sleep: SleepEntry[];
  checkins: WellbeingCheckinRecord[];
  wellnessReports: WellnessReportRecord[];
} 