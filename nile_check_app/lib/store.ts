import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { format } from 'date-fns';
// 세션 스토어 임포트
import { sessionStore } from '@/contexts/SessionProvider';

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

// 추가: 동기화 상태 관리를 위한 인터페이스
interface SyncStatus {
  status: 'idle' | 'syncing' | 'success' | 'error';
  lastSync: number | null;
  error: string | null;
}

interface AppState {
  meals: MealEntry[];
  sleep: SleepEntry[];
  checkins: WellbeingCheckinRecord[];
  isInitialized: boolean;
  isLoading: boolean;
  suggestions: string[];
  lastSyncTime?: number;
  lastSessionCheckTime?: number;
  syncStatus: SyncStatus; // 추가: 동기화 상태 
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

// 사용자 정보 가져오기 함수 개선
const getUserInfo = (): { uid: string } => {
  try {
    // 1. SessionStore에서 사용자 ID 확인 (가장 신뢰할 수 있는 출처)
    if (sessionStore.isAuthenticated && sessionStore.userId) {
      return { uid: sessionStore.userId };
    }
    
    // 2. 세션 쿠키에서 사용자 ID 정보 추출 시도
    const cookieValue = document.cookie
      .split('; ')
      .find(row => row.startsWith('nile-check-auth='))
      ?.split('=')[1];
    
    if (cookieValue) {
      try {
        // 쿠키 값이 Base64 인코딩된 JWT 토큰이므로 디코드 시도
        const tokenParts = cookieValue.split('.');
        if (tokenParts.length === 3) {
          const payload = JSON.parse(atob(tokenParts[1]));
          if (payload.user && payload.user.id) {
            // 전역 세션 스토어에 사용자 ID 동기화
            sessionStore.updateUserId(payload.user.id);
            return { uid: payload.user.id };
          }
        }
      } catch (e) {
        console.warn('[Store] 세션 쿠키 디코드 실패:', e);
        // 디코드 실패 시 다음 단계로 진행
      }
    }
    
    // 3. 로컬 스토리지에서 마지막 사용자 ID 확인
    if (typeof window !== 'undefined') {
      const lastUserId = localStorage.getItem('last_user_id');
      if (lastUserId) {
        // 전역 세션 스토어에 사용자 ID 동기화 
        // (세션이 인증되지 않은 상태라면 동기화하지 않음)
        if (!sessionStore.isAuthenticated) {
          sessionStore.userId = lastUserId; // 값만 설정, localStorage는 업데이트하지 않음
        }
        return { uid: lastUserId };
      }
    }
    
    // 4. 기본값 사용
    return { uid: 'user_default' };
  } catch (e) {
    console.error('[Store] 사용자 정보 가져오기 실패:', e);
    return { uid: 'user_default' };
  }
};

// API 응답 타입 정의
interface ApiResponse {
  success: boolean;
  meal?: { id: string; [key: string]: unknown };
  sleep?: { id: string; [key: string]: unknown };
  checkin?: { id: string; [key: string]: unknown };
  sessionValid?: boolean;
  error?: string;
}

// Data saving utility
const saveData = async <T>(endpoint: string, userId: string, data: T): Promise<{ success: boolean, data?: ApiResponse, error?: string }> => {
  try {
    const response = await fetch(`/api/${endpoint}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ uid: userId, [`${endpoint.slice(0, -1)}Data`]: data }),
    });

    if (!response.ok) {
      throw new Error(`API 응답 오류: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error(`[Store] ${endpoint} 데이터 저장 중 오류:`, error);
    return { success: false, error: String(error) };
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
      lastSessionCheckTime: 0,
      // 추가: 동기화 상태 초기값 설정
      syncStatus: {
        status: 'idle',
        lastSync: null,
        error: null
      },
      setSuggestions: (suggestions) => set({ suggestions }),
      
      addMeal: (meal) => {
        // 현재 사용자 ID 가져오기
        const { uid } = getUserInfo();
        
        // 로컬 상태에 ID 생성하여 데이터 추가
        const id = `meal_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
        const newMeal = { ...meal, id };
        
        // 먼저 로컬 상태 업데이트
        set((state) => ({
          meals: [...state.meals, newMeal]
        }));
        
        // API를 통해 서버에 저장
        saveData('meals', uid, meal)
          .then(result => {
            if (result.success && result.data?.meal?.id) {
              // 서버에서 받은 ID로 로컬 데이터 업데이트
              const mealId = result.data.meal.id as string;
              set((state) => ({
                meals: state.meals.map(m => m.id === newMeal.id ? { ...m, id: mealId } : m)
              }));
            }
          });
      },
      
      getMealsOnDate: (dateStr) => {
        return get().meals.filter(meal => {
          const mealDate = new Date(meal.dateTime);
          return format(mealDate, 'yyyy-MM-dd') === dateStr;
        });
      },
      
      addSleepEntry: (sleep) => {
        // 현재 사용자 ID 가져오기
        const { uid } = getUserInfo();
        
        // 로컬 상태에 ID 생성하여 데이터 추가
        const id = `sleep_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
        const newSleep = { ...sleep, id };
        
        // 먼저 로컬 상태 업데이트
        set((state) => ({
          sleep: [...state.sleep, newSleep]
        }));
        
        // API를 통해 서버에 저장
        saveData('sleep', uid, sleep)
          .then(result => {
            if (result.success && result.data?.sleep?.id) {
              // 서버에서 받은 ID로 로컬 데이터 업데이트
              const sleepId = result.data.sleep.id as string;
              set((state) => ({
                sleep: state.sleep.map(s => s.id === newSleep.id ? { ...s, id: sleepId } : s)
              }));
            }
          });
      },
      
      getSleepEntryForNightOf: (dateStr) => {
        return get().sleep.find(entry => entry.date === dateStr);
      },
      
      addCheckin: (checkinInput, date) => {
        // 현재 사용자 ID 가져오기
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
        
        // 먼저 로컬 상태 업데이트
        set((state) => ({
          checkins: [...state.checkins, checkin]
        }));
        
        // API를 통해 서버에 저장
        saveData('checkins', uid, { ...checkinInput, date: dateStr })
          .then(result => {
            if (result.success && result.data?.checkin?.id) {
              // 서버에서 받은 ID로 로컬 데이터 업데이트
              const checkinId = result.data.checkin.id as string;
              set((state) => ({
                checkins: state.checkins.map(c => c.id === checkin.id ? { ...c, id: checkinId } : c)
              }));
              
              // 세션 유효성 확인
              if (result.data.sessionValid === false) {
                console.warn('[Store] 체크인 후 세션이 유효하지 않음, 세션 갱신 시도');
                // 세션 상태 확인 및 갱신 시도
                fetch('/api/auth/session')
                  .then(res => res.json())
                  .then(sessionData => {
                    if (!sessionData.authenticated) {
                      console.error('[Store] 세션이 만료되었습니다. 로그인 페이지로 이동합니다.');
                      // 다시 로그인하도록 리다이렉트
                      window.location.href = '/login?session_expired=true';
                    }
                  })
                  .catch(error => {
                    console.error('[Store] 세션 갱신 중 오류:', error);
                  });
              }
            }
          });
      },
      
      getCheckinForDate: (dateStr) => {
        return get().checkins.find(checkin => checkin.date === dateStr);
      },
      
      syncData: async (userId: string) => {
        try {
          // 우선 SessionStore에서 사용자 ID 확인 (더 신뢰할 수 있는 출처)
          if (sessionStore.isAuthenticated && sessionStore.userId && sessionStore.userId !== userId) {
            userId = sessionStore.userId;
            console.log(`[Store] SessionStore에서 사용자 ID 업데이트: ${userId}`);
          }
          
          console.log(`[Store] 사용자 데이터 동기화 시작 - 사용자 ID: ${userId}`);
          
          // 이미 로딩 중이면 중복 요청 방지
          if (get().isLoading) {
            console.log('[Store] 이미 데이터 동기화 중, 중복 요청 방지');
            return true;
          }
          
          // 동기화 상태 업데이트 및 로딩 상태 활성화
          set({ 
            isLoading: true,
            syncStatus: {
              status: 'syncing',
              lastSync: get().syncStatus.lastSync,
              error: null
            }
          });
          
          // 세션 유효성 확인 및 사용자 ID 검증
          let validatedUserId = userId;
          
          try {
            const response = await fetch('/api/auth/session', {
              method: 'GET',
              headers: { 'Cache-Control': 'no-cache' },
              cache: 'no-store'
            });
            
            set({ lastSessionCheckTime: Date.now() });
            
            if (response.ok) {
              const sessionData = await response.json();
              
              if (sessionData.authenticated && sessionData.user?.id) {
                validatedUserId = sessionData.user.id;
                
                // 세션에서 얻은 유효한 사용자 ID 저장
                if (typeof window !== 'undefined') {
                  localStorage.setItem('last_user_id', validatedUserId);
                }
              } else if (!sessionData.authenticated) {
                // 인증되지 않은 상태에서 로컬 스토리지 ID 삭제
                if (typeof window !== 'undefined') {
                  localStorage.removeItem('last_user_id');
                }
                
                set({ 
                  isLoading: false,
                  syncStatus: {
                    status: 'error',
                    lastSync: get().syncStatus.lastSync,
                    error: '인증되지 않은 세션'
                  }
                });
                
                return false;
              }
            }
          } catch (error) {
            console.error('[Store] 세션 확인 중 오류:', error);
            // 세션 확인 오류시에도 계속 진행 (로컬 데이터 사용)
          }
          
          // 데이터 가져오기 함수
          const fetchData = async (endpoint: string) => {
            try {
              const response = await fetch(`/api/${endpoint}?uid=${validatedUserId}`, {
                cache: 'no-store',
                headers: { 'Cache-Control': 'no-cache' }
              });
              
              if (!response.ok) {
                throw new Error(`API 오류: ${response.status}`);
              }
              
              return await response.json();
            } catch (error) {
              console.error(`[Store] ${endpoint} 데이터 로드 중 오류:`, error);
              return null;
            }
          };
          
          // 병렬로 모든 데이터 가져오기
          const [mealsData, sleepData, checkinsData] = await Promise.all([
            fetchData('meals'),
            fetchData('sleep'),
            fetchData('checkins')
          ]);
          
          // 데이터 로드 실패 여부 확인
          const hasErrors = !mealsData || !sleepData || !checkinsData;
          
          // 결과 처리
          if (mealsData?.success) {
            set({ meals: mealsData.meals || [] });
          }
          
          if (sleepData?.sleep) {
            set({ sleep: sleepData.sleep });
          }
          
          if (checkinsData?.checkins) {
            set({ checkins: checkinsData.checkins });
          }
          
          // 현재 시간
          const now = Date.now();
          
          // 데이터 로드 완료
          set({ 
            isLoading: false, 
            isInitialized: true,
            lastSyncTime: now,
            syncStatus: {
              status: hasErrors ? 'error' : 'success',
              lastSync: now,
              error: hasErrors ? '일부 데이터를 가져오는데 실패했습니다' : null
            }
          });
          
          console.log(`[Store] 데이터 동기화 완료 - 사용자 ID: ${validatedUserId}`);
          return !hasErrors;
        } catch (error) {
          console.error('[Store] 데이터 동기화 오류:', error);
          
          set({ 
            isLoading: false,
            syncStatus: {
              status: 'error',
              lastSync: get().syncStatus.lastSync,
              error: String(error)
            }
          });
          
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
        suggestions: state.suggestions,
        lastSyncTime: state.lastSyncTime,
        lastSessionCheckTime: state.lastSessionCheckTime,
        syncStatus: state.syncStatus,
        // isLoading은 저장할 필요 없음 (앱 시작 시 항상 초기값으로)
      }),
    }
  )
); 