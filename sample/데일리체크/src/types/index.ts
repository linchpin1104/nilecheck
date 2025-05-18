
export interface MealEntry {
  id: string;
  type: 'breakfast' | 'lunch' | 'dinner' | 'snack';
  dateTime: string; // ISO string
  status: 'eaten' | 'skipped';
  description?: string; // Optional, but required if status is 'eaten'
  quality?: number; // Optional, 1-5 scale, but required if status is 'eaten'
}

export interface SleepEntry {
  id:string;
  startTime: string; // ISO string
  endTime: string; // ISO string
  quality: number; // 1-5 scale
  wokeUpDuringNight?: boolean;
  wakeUpCount?: number; // Number of times woken up, if wokeUpDuringNight is true
}

export interface WellbeingCheckinInputData {
  stressLevel: number;
  mainEmotions: string[]; // Stores emotion keys like "joy", "sadness", or "other"
  otherEmotionDetail?: string; 
  todayActivities: string[]; // Stores simple activity keys like "exercise", "reading", "other"
  otherActivityDetail?: string; // Detail for the "other" activity
  conversationPartner?: string; // Stores partner keys like 'friend', 'spouse', 'other', 'none'
  otherConversationPartnerDetail?: string; 
  spouseConversationTopics?: string[]; // Stores topic keys like 'dailyChat', 'kidsTalk', 'other'
  otherSpouseTopicDetail?: string; 
}

export interface WellbeingCheckinRecord {
  id: string;
  dateTime: string; // ISO string for the date of the check-in
  input: WellbeingCheckinInputData; // This is what's stored (raw keys from form)
  output: null; 
}

export interface WellnessReportRecord {
  id: string;
  weekStartDate: string; // ISO string for the start of the week analyzed
  generatedDate: string; // ISO string for when the report was generated
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

export interface AppStoreData {
  meals: MealEntry[];
  sleep: SleepEntry[];
  checkins: WellbeingCheckinRecord[];
  wellnessReports: WellnessReportRecord[];
}

export interface UserProfile {
  uid: string;
  email: string | null;
  name: string | null;
  phoneNumber: string | null;
  isPhoneVerified: boolean;
  createdAt: string; // ISO string
}
