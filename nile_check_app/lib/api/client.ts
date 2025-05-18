import { UserProfile, MealEntry, SleepEntry, WellbeingCheckinInputData, WellbeingCheckinRecord } from '@/types';

// API 엔드포인트 URL을 설정하는 헬퍼 함수
const createUrl = (path: string, queryParams?: Record<string, string | undefined>) => {
  const baseUrl = `/api${path}`;
  
  if (!queryParams) return baseUrl;
  
  const searchParams = new URLSearchParams();
  Object.entries(queryParams).forEach(([key, value]) => {
    if (value !== undefined && value !== null) {
      searchParams.append(key, value);
    }
  });
  
  return `${baseUrl}?${searchParams.toString()}`;
};

// API 요청 래퍼 함수
const fetcher = async <T>(url: string, options?: RequestInit): Promise<T> => {
  const response = await fetch(url, {
    headers: {
      'Content-Type': 'application/json',
    },
    ...options,
  });
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || '요청 처리 중 오류가 발생했습니다.');
  }
  
  return response.json();
};

// 사용자 관련 API
export const UserAPI = {
  getProfile: (uid: string) => {
    return fetcher<UserProfile>(createUrl('/users', { uid }));
  },
  
  updateProfile: (userData: Partial<UserProfile> & { uid: string }) => {
    return fetcher<{ success: boolean }>(createUrl('/users'), {
      method: 'POST',
      body: JSON.stringify(userData),
    });
  },
};

// 체크인 관련 API
export const CheckinAPI = {
  getCheckins: (uid: string, startDate?: string, endDate?: string) => {
    return fetcher<{ checkins: WellbeingCheckinRecord[] }>(
      createUrl('/checkins', { uid, startDate, endDate })
    );
  },
  
  addCheckin: (uid: string, checkInData: WellbeingCheckinInputData, dateTime?: string) => {
    return fetcher<{ success: boolean; checkin: WellbeingCheckinRecord }>(
      createUrl('/checkins'), {
        method: 'POST',
        body: JSON.stringify({ uid, checkInData, dateTime }),
      }
    );
  },
};

// 수면 관련 API
export const SleepAPI = {
  getSleep: (uid: string, date?: string) => {
    return fetcher<{ sleep: SleepEntry[] }>(
      createUrl('/sleep', { uid, date })
    );
  },
  
  addSleep: (uid: string, sleepData: Omit<SleepEntry, 'id'>) => {
    return fetcher<{ success: boolean; sleep: SleepEntry }>(
      createUrl('/sleep'), {
        method: 'POST',
        body: JSON.stringify({ uid, sleepData }),
      }
    );
  },
  
  updateSleep: (uid: string, sleepData: SleepEntry) => {
    return fetcher<{ success: boolean; sleep: SleepEntry }>(
      createUrl('/sleep'), {
        method: 'PUT',
        body: JSON.stringify({ uid, sleepData }),
      }
    );
  },
};

// 식사 관련 API
export const MealAPI = {
  getMeals: (uid: string, date?: string, type?: string) => {
    return fetcher<{ meals: MealEntry[] }>(
      createUrl('/meals', { uid, date, type })
    );
  },
  
  addMeal: (uid: string, mealData: Omit<MealEntry, 'id'>) => {
    return fetcher<{ success: boolean; meal: MealEntry }>(
      createUrl('/meals'), {
        method: 'POST',
        body: JSON.stringify({ uid, mealData }),
      }
    );
  },
  
  updateMeal: (uid: string, mealData: MealEntry) => {
    return fetcher<{ success: boolean; meal: MealEntry }>(
      createUrl('/meals'), {
        method: 'PUT',
        body: JSON.stringify({ uid, mealData }),
      }
    );
  },
}; 