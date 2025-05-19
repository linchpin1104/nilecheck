import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { format } from 'date-fns';

export interface MealEntry {
  id: string;
  type: 'breakfast' | 'lunch' | 'dinner' | 'snack';
  status: 'eaten' | 'skipped';
  dateTime: string;
  description?: string;
  quality?: 'very_poor' | 'poor' | 'average' | 'good' | 'very_good';
  foodTypes?: string[];
  waterIntake?: number;
}

export interface SleepEntry {
  id: string;
  startTime: string;
  endTime: string;
  quality: 1 | 2 | 3 | 4 | 5;
  wokeUpDuringNight: boolean;
  wakeUpCount: number;
  date: string; // 수면 날짜 (yyyy-MM-dd 형식)
}

export interface WellbeingCheckinRecord {
  id: string;
  dateTime: string;
  date: string; // yyyy-MM-dd 형식
  input: {
    stressLevel: number;
    mainEmotions: string[];
    otherEmotionDetail?: string;
    todayActivities: string[];
    conversationPartner?: string | null;
    spouseConversationTopics?: string[];
    otherSpouseTopicDetail?: string;
  };
}

interface AppState {
  meals: MealEntry[];
  sleep: SleepEntry[];
  checkins: WellbeingCheckinRecord[];
  isInitialized: boolean;
  isLoading: boolean;
  suggestions: string[];
  lastSyncTime?: number;
  setSuggestions: (suggestions: string[]) => void;
  
  // 식사 기록 관련 메서드
  addMeal: (meal: Omit<MealEntry, 'id'>) => void;
  getMealsOnDate: (dateStr: string) => MealEntry[];
  
  // 수면 기록 관련 메서드
  addSleepEntry: (sleep: Omit<SleepEntry, 'id'>) => void;
  getSleepEntryForNightOf: (dateStr: string) => SleepEntry | undefined;
  
  // 체크인 기록 관련 메서드
  addCheckin: (checkin: Omit<WellbeingCheckinRecord['input'], 'id'>, date: Date) => void;
  getCheckinForDate: (dateStr: string) => WellbeingCheckinRecord | undefined;
  
  // 통계 관련 메서드
  getTodaySummary: () => {
    todaySleepHours: number;
    todayMealsLogged: number;
    todayActivitiesLogged: number;
  };
  
  // 서버 데이터 동기화 메서드
  syncData: (userId: string) => Promise<boolean>;
  
  // 샘플 데이터 생성
  generateSampleData: () => void;
}

// 사용자 정보 가져오기 함수 추가
const getUserInfo = (): { uid: string } => {
  try {
    // @ts-expect-error - 런타임에는 authStore가 로드됨
    const authStore = window.authStore || { getState: () => ({ currentUser: null }) };
    const user = typeof authStore.getState === 'function' 
      ? authStore.getState().currentUser 
      : authStore.user;
      
    if (!user) {
      console.warn('[Store] 사용자 정보를 찾을 수 없습니다.');
      return { uid: 'user_default' };
    }
    
    return { uid: user.id || 'user_default' };
  } catch (e) {
    console.error('[Store] 사용자 정보 가져오기 실패:', e);
    return { uid: 'user_default' };
  }
};

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      meals: [],
      sleep: [],
      checkins: [],
      isInitialized: false,
      isLoading: true,
      suggestions: [],
      lastSyncTime: 0,
      setSuggestions: (suggestions) => set({ suggestions }),
      
      addMeal: (meal) => {
        // 현재 사용자 ID 가져오기 (수정됨)
        const { uid } = getUserInfo();
        
        // 로컬 상태에 ID 생성하여 데이터 추가
        const id = `meal_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
        const newMeal = { ...meal, id };
        
        set((state) => ({
          meals: [...state.meals, newMeal]
        }));
        
        // API를 통해 서버에 저장
        fetch('/api/meals', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ uid, mealData: meal }),
        })
        .then(response => response.json())
        .then(data => {
          if (data.success) {
            console.log(`[Store] 식사 데이터 서버 저장 성공 - ID: ${data.meal.id}`);
            // 서버에서 받은 ID로 로컬 데이터 업데이트
            set((state) => ({
              meals: state.meals.map(m => m.id === newMeal.id ? { ...m, id: data.meal.id } : m)
            }));
          } else {
            console.error('[Store] 식사 데이터 서버 저장 실패:', data.error);
          }
        })
        .catch(error => {
          console.error('[Store] 식사 데이터 서버 저장 중 오류:', error);
        });
      },
      
      getMealsOnDate: (dateStr) => {
        return get().meals.filter(meal => {
          const mealDate = new Date(meal.dateTime);
          return format(mealDate, 'yyyy-MM-dd') === dateStr;
        });
      },
      
      addSleepEntry: (sleep) => {
        // 현재 사용자 ID 가져오기 (수정됨)
        const { uid } = getUserInfo();
        
        // 로컬 상태에 ID 생성하여 데이터 추가
        const id = `sleep_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
        const newSleep = { ...sleep, id };
        
        set((state) => ({
          sleep: [...state.sleep, newSleep]
        }));
        
        // API를 통해 서버에 저장
        fetch('/api/sleep', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ uid, sleepData: sleep }),
        })
        .then(response => response.json())
        .then(data => {
          if (data.success) {
            console.log(`[Store] 수면 데이터 서버 저장 성공 - ID: ${data.sleep.id}`);
            // 서버에서 받은 ID로 로컬 데이터 업데이트
            set((state) => ({
              sleep: state.sleep.map(s => s.id === newSleep.id ? { ...s, id: data.sleep.id } : s)
            }));
          } else {
            console.error('[Store] 수면 데이터 서버 저장 실패:', data.error);
          }
        })
        .catch(error => {
          console.error('[Store] 수면 데이터 서버 저장 중 오류:', error);
        });
      },
      
      getSleepEntryForNightOf: (dateStr) => {
        return get().sleep.find(entry => entry.date === dateStr);
      },
      
      addCheckin: (checkinInput, date) => {
        // 현재 사용자 ID 가져오기 (수정됨)
        const { uid } = getUserInfo();
        
        // 로컬 상태에 ID 생성하여 데이터 추가
        const id = `checkin_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
        const dateTime = new Date().toISOString();
        const dateStr = format(date, 'yyyy-MM-dd');
        
        const checkin: WellbeingCheckinRecord = {
          id,
          dateTime,
          date: dateStr,
          input: checkinInput
        };
        
        set((state) => ({
          checkins: [...state.checkins, checkin]
        }));
        
        // API를 통해 서버에 저장
        fetch('/api/checkins', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ uid, checkinData: { ...checkinInput, date: dateStr } }),
        })
        .then(response => response.json())
        .then(data => {
          if (data.success) {
            console.log(`[Store] 체크인 데이터 서버 저장 성공 - ID: ${data.checkin.id}`);
            // 서버에서 받은 ID로 로컬 데이터 업데이트
            set((state) => ({
              checkins: state.checkins.map(c => c.id === checkin.id ? { ...c, id: data.checkin.id } : c)
            }));
            
            // 세션 유효성 확인
            if (data.sessionValid === false) {
              console.warn('[Store] 체크인 후 세션이 유효하지 않음, 세션 갱신 시도');
              // 세션 상태 확인 및 갱신 시도
              fetch('/api/auth/session')
                .then(res => res.json())
                .then(sessionData => {
                  if (!sessionData.authenticated) {
                    console.error('[Store] 세션이 만료되었습니다. 로그인 페이지로 이동합니다.');
                    // 다시 로그인하도록 리다이렉트
                    window.location.href = '/login?session_expired=true';
                  } else {
                    console.log('[Store] 세션이 성공적으로 갱신되었습니다.');
                  }
                })
                .catch(error => {
                  console.error('[Store] 세션 갱신 중 오류:', error);
                });
            }
          } else {
            console.error('[Store] 체크인 데이터 서버 저장 실패:', data.error);
          }
        })
        .catch(error => {
          console.error('[Store] 체크인 데이터 서버 저장 중 오류:', error);
        });
      },
      
      getCheckinForDate: (dateStr) => {
        return get().checkins.find(checkin => checkin.date === dateStr);
      },
      
      syncData: async (userId: string) => {
        try {
          console.log(`[Store] 사용자 데이터 동기화 시작 - 사용자 ID: ${userId}`);
          
          // 이미 로딩 중이면 중복 요청 방지
          if (get().isLoading) {
            console.log('[Store] 이미 데이터 동기화 중, 중복 요청 방지');
            return false;
          }
          
          set({ isLoading: true });
          
          // 세션 상태 확인
          const sessionResponse = await fetch('/api/auth/session');
          const sessionData = await sessionResponse.json();
          
          if (!sessionData.authenticated) {
            console.error('[Store] 세션이 만료되었습니다. 데이터 동기화를 중단합니다.');
            set({ isLoading: false });
            
            // 세션 만료 시 3초 후 리다이렉트 (사용자 경험 향상)
            setTimeout(() => {
              window.location.href = '/login?session_expired=true&callbackUrl=/log-activity';
            }, 3000);
            
            return false;
          }
          
          // 마지막 동기화 시간 체크 (5초 이내 중복 요청 방지)
          const now = Date.now();
          const lastSyncTime = get().lastSyncTime || 0;
          
          if (now - lastSyncTime < 5000 && get().isInitialized) {
            console.log('[Store] 최근 5초 이내 동기화 완료, 중복 요청 방지');
            set({ isLoading: false });
            return true;
          }
          
          // 식사 데이터 가져오기
          const mealsResponse = await fetch(`/api/meals?uid=${userId}`);
          if (!mealsResponse.ok) {
            throw new Error(`식사 데이터 API 오류: ${mealsResponse.status}`);
          }
          const mealsData = await mealsResponse.json();
          if (mealsData && Array.isArray(mealsData.meals)) {
            console.log(`[Store] 식사 데이터 ${mealsData.meals.length}건 로드됨`);
            set({ meals: mealsData.meals });
          }
          
          // 수면 데이터 가져오기
          const sleepResponse = await fetch(`/api/sleep?uid=${userId}`);
          if (!sleepResponse.ok) {
            throw new Error(`수면 데이터 API 오류: ${sleepResponse.status}`);
          }
          const sleepData = await sleepResponse.json();
          if (sleepData && Array.isArray(sleepData.sleep)) {
            console.log(`[Store] 수면 데이터 ${sleepData.sleep.length}건 로드됨`);
            set({ sleep: sleepData.sleep });
          }
          
          // 체크인 데이터 가져오기
          const checkinsResponse = await fetch(`/api/checkins?uid=${userId}`);
          if (!checkinsResponse.ok) {
            throw new Error(`체크인 데이터 API 오류: ${checkinsResponse.status}`);
          }
          const checkinsData = await checkinsResponse.json();
          if (checkinsData && Array.isArray(checkinsData.checkins)) {
            console.log(`[Store] 체크인 데이터 ${checkinsData.checkins.length}건 로드됨`);
            set({ checkins: checkinsData.checkins });
          }
          
          set({ isLoading: false, isInitialized: true, lastSyncTime: Date.now() });
          console.log('[Store] 데이터 동기화 완료');
          return true;
        } catch (error) {
          console.error('[Store] 데이터 동기화 중 오류 발생:', error);
          set({ isLoading: false });
          return false;
        }
      },
      
      getTodaySummary: () => {
        const today = format(new Date(), 'yyyy-MM-dd');
        const todayMeals = get().getMealsOnDate(today);
        const todaySleep = get().getSleepEntryForNightOf(today);
        const todayCheckin = get().getCheckinForDate(today);
        
        const todaySleepHours = todaySleep 
          ? (new Date(todaySleep.endTime).getTime() - new Date(todaySleep.startTime).getTime()) / (1000 * 60 * 60) 
          : 0;
          
        const todayMealsLogged = todayMeals.length;
        
        const todayActivitiesLogged = todayCheckin?.input.todayActivities?.length || 0;
        
        return {
          todaySleepHours,
          todayMealsLogged,
          todayActivitiesLogged
        };
      },
      
      generateSampleData: () => {
        // 현재 날짜 기준의 샘플 데이터 생성
        const today = new Date();
        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);
        
        const dayBefore = new Date(today);
        dayBefore.setDate(dayBefore.getDate() - 2);
        
        // 샘플 식사 데이터
        const sampleMeals = [
          // 오늘의 식사
          {
            id: `meal_${Date.now()}_1`,
            type: 'breakfast' as const,
            status: 'eaten' as const,
            dateTime: new Date(today.setHours(8, 30)).toISOString(),
            description: '토스트와 계란 프라이',
            quality: 'good' as const,
            foodTypes: ['bread', 'egg'],
            waterIntake: 0.5
          },
          {
            id: `meal_${Date.now()}_2`,
            type: 'lunch' as const,
            status: 'eaten' as const,
            dateTime: new Date(today.setHours(12, 30)).toISOString(),
            description: '비빔밥',
            quality: 'very_good' as const,
            foodTypes: ['rice', 'vegetables', 'meat'],
            waterIntake: 0.7
          },
          // 어제 식사
          {
            id: `meal_${Date.now()}_3`,
            type: 'breakfast' as const,
            status: 'skipped' as const,
            dateTime: new Date(yesterday.setHours(8, 0)).toISOString()
          },
          {
            id: `meal_${Date.now()}_4`,
            type: 'lunch' as const,
            status: 'eaten' as const,
            dateTime: new Date(yesterday.setHours(13, 0)).toISOString(),
            description: '김치찌개',
            quality: 'good' as const,
            foodTypes: ['rice', 'meat'],
            waterIntake: 0.5
          },
          {
            id: `meal_${Date.now()}_5`,
            type: 'dinner' as const,
            status: 'eaten' as const,
            dateTime: new Date(yesterday.setHours(19, 0)).toISOString(),
            description: '파스타',
            quality: 'average' as const,
            foodTypes: ['pasta', 'vegetables'],
            waterIntake: 0.3
          }
        ];
        
        // 샘플 수면 데이터
        const sampleSleep = [
          // 어제 밤 수면 (오늘로 기록)
          {
            id: `sleep_${Date.now()}_1`,
            startTime: new Date(yesterday.setHours(23, 0)).toISOString(),
            endTime: new Date(today.setHours(7, 0)).toISOString(),
            quality: 4 as const,
            wokeUpDuringNight: true,
            wakeUpCount: 1,
            date: format(today, 'yyyy-MM-dd')
          },
          // 그저께 밤 수면 (어제로 기록)
          {
            id: `sleep_${Date.now()}_2`,
            startTime: new Date(dayBefore.setHours(22, 30)).toISOString(),
            endTime: new Date(yesterday.setHours(6, 45)).toISOString(),
            quality: 3 as const,
            wokeUpDuringNight: false,
            wakeUpCount: 0,
            date: format(yesterday, 'yyyy-MM-dd')
          }
        ];
        
        // 샘플 체크인 데이터
        const sampleCheckins = [
          // 오늘 체크인
          {
            id: `checkin_${Date.now()}_1`,
            dateTime: new Date(today.setHours(10, 0)).toISOString(),
            date: format(today, 'yyyy-MM-dd'),
            input: {
              stressLevel: 4,
              mainEmotions: ['joy', 'anxiety'],
              todayActivities: ['exercise', 'relaxation'],
              conversationPartner: '배우자',
              spouseConversationTopics: ['everyday', 'future']
            }
          },
          // 어제 체크인
          {
            id: `checkin_${Date.now()}_2`,
            dateTime: new Date(yesterday.setHours(18, 0)).toISOString(),
            date: format(yesterday, 'yyyy-MM-dd'),
            input: {
              stressLevel: 7,
              mainEmotions: ['stress', 'anger'],
              todayActivities: ['workStudy', 'socializing'],
              conversationPartner: '동료'
            }
          }
        ];
        
        set({
          meals: sampleMeals,
          sleep: sampleSleep,
          checkins: sampleCheckins,
          isInitialized: true,
          isLoading: false
        });
      }
    }),
    {
      name: 'app-store',
      partialize: (state) => ({
        meals: state.meals,
        sleep: state.sleep,
        checkins: state.checkins,
        isInitialized: state.isInitialized,
        isLoading: state.isLoading,
        suggestions: state.suggestions,
        lastSyncTime: state.lastSyncTime,
      }),
    }
  )
); 