import { 
  createApiResponse, 
  createApiErrorResponse, 
  getUserAppData, 
  updateUserAppData, 
  logApiAction 
} from '@/lib/api/utils';
import { parseISO, isWithinInterval, startOfDay, endOfDay, isSameDay, format } from 'date-fns';
import { MealEntry } from '@/types';

// 식사 데이터 조회
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const uid = searchParams.get('uid');
    const date = searchParams.get('date');
    const mealType = searchParams.get('type');

    if (!uid) {
      return createApiErrorResponse('사용자 ID가 필요합니다.', 400);
    }

    logApiAction('식사 데이터 조회 요청', { uid, date, type: mealType });

    try {
      const { exists, data } = await getUserAppData(uid);
      
      if (!exists) {
        return createApiResponse({ meals: [] });
      }
      
      let meals = data?.meals || [];
      
      // 필터링 로직
      if (mealType) {
        meals = (meals as MealEntry[]).filter((meal: MealEntry) => meal.type === mealType);
      }
      
      if (date) {
        const targetDate = startOfDay(parseISO(date));
        const targetDateEnd = endOfDay(parseISO(date));
        
        meals = (meals as MealEntry[]).filter((meal: MealEntry) => {
          const mealDate = parseISO(meal.dateTime);
          return isWithinInterval(mealDate, { start: targetDate, end: targetDateEnd });
        });
      }
      
      return createApiResponse({ meals });
    } catch (error) {
      return createApiErrorResponse('식사 데이터 조회 중 오류가 발생했습니다.', 500, error);
    }
  } catch (error) {
    return createApiErrorResponse('요청 처리 중 오류가 발생했습니다.', 500, error);
  }
}

// 식사 데이터 추가
export async function POST(request: Request) {
  try {
    const { uid, mealData } = await request.json();

    if (!uid || !mealData) {
      return createApiErrorResponse('사용자 ID와 식사 데이터가 필요합니다.', 400);
    }

    // 필수 필드 검증
    if (!mealData.type || !mealData.dateTime || !mealData.status) {
      return createApiErrorResponse('식사 종류, 일시, 상태 정보가 필요합니다.', 400);
    }

    logApiAction('식사 데이터 저장 시작', { 
      uid, 
      type: mealData.type, 
      dateTime: mealData.dateTime 
    });

    try {
      // 앱 데이터에 식사 정보 추가 또는 업데이트
      const mealDateTime = parseISO(mealData.dateTime);
      
      const result = await updateUserAppData(uid, (appData) => {
        const meals = appData.meals || [];
        
        // 같은 날짜와 같은 타입의 식사 기록 찾기
        const existingMealIndex = (meals as MealEntry[]).findIndex((meal: MealEntry) => {
          const existingDateTime = parseISO(meal.dateTime);
          return isSameDay(existingDateTime, mealDateTime) && meal.type === mealData.type;
        });
        
        if (existingMealIndex >= 0) {
          // 기존 식사 기록 업데이트
          logApiAction('기존 식사 기록 업데이트', { 
            date: format(mealDateTime, 'yyyy-MM-dd'),
            type: mealData.type
          });
          
          const existingId = (meals as MealEntry[])[existingMealIndex].id;
          (meals as MealEntry[])[existingMealIndex] = {
            ...mealData,
            id: existingId // 기존 ID 유지
          };
          
          return { ...appData, meals };
        } else {
          // 새 식사 객체 생성
          const newMeal: MealEntry = {
            id: crypto.randomUUID(),
            ...mealData
          };
          
          logApiAction('새 식사 기록 추가', { id: newMeal.id });
          return { ...appData, meals: [...(meals as MealEntry[]), newMeal] };
        }
      });
      
      // 성공 응답 반환
      if (result.success) {
        const appData = result.data;
        const meals = appData.meals as MealEntry[] || [];
        
        // 방금 추가/업데이트한 식사 찾기
        const updatedMeal = (meals as MealEntry[]).find((meal: MealEntry) => {
          const mealDate = parseISO(meal.dateTime);
          return isSameDay(mealDate, mealDateTime) && meal.type === mealData.type;
        });
        
        if (updatedMeal) {
          return createApiResponse({
            meal: updatedMeal,
            updated: meals.length === ((appData.meals || []) as MealEntry[]).length
          }, true, `식사 데이터가 ${meals.length === ((appData.meals || []) as MealEntry[]).length ? '업데이트' : '저장'}되었습니다.`);
        }
      }
      
      return createApiErrorResponse('식사 데이터 처리 중 오류가 발생했습니다.', 500);
    } catch (error) {
      return createApiErrorResponse('식사 데이터 저장 중 오류가 발생했습니다.', 500, error);
    }
  } catch (error) {
    return createApiErrorResponse('요청 처리 중 오류가 발생했습니다.', 500, error);
  }
}

// 식사 데이터 업데이트
export async function PUT(request: Request) {
  try {
    const { uid, mealData } = await request.json();

    if (!uid || !mealData || !mealData.id) {
      return createApiErrorResponse('사용자 ID, 식사 ID 및 데이터가 필요합니다.', 400);
    }

    logApiAction('식사 데이터 업데이트', { uid, mealId: mealData.id });
    
    try {
      const result = await updateUserAppData(uid, (appData) => {
        const meals = appData.meals || [];
        
        // 업데이트할 식사 데이터 찾기
        const mealIndex = (meals as MealEntry[]).findIndex((meal: MealEntry) => meal.id === mealData.id);
        
        if (mealIndex === -1) {
          throw new Error('해당 식사 데이터를 찾을 수 없습니다.');
        }
        
        // 식사 데이터 업데이트
        (meals as MealEntry[])[mealIndex] = { ...(meals as MealEntry[])[mealIndex], ...mealData };
        
        return { ...appData, meals };
      });
      
      if (result.success) {
        const meals = result.data.meals as MealEntry[] || [];
        const updatedMeal = (meals as MealEntry[]).find((meal: MealEntry) => meal.id === mealData.id);
        
        if (updatedMeal) {
          return createApiResponse({
            meal: updatedMeal
          }, true, '식사 데이터가 업데이트되었습니다.');
        }
      }
      
      return createApiErrorResponse('식사 데이터 업데이트 중 오류가 발생했습니다.', 500);
    } catch (error) {
      if (error instanceof Error && error.message === '해당 식사 데이터를 찾을 수 없습니다.') {
        return createApiErrorResponse(error.message, 404);
      }
      return createApiErrorResponse('식사 데이터 업데이트 중 오류가 발생했습니다.', 500, error);
    }
  } catch (error) {
    return createApiErrorResponse('요청 처리 중 오류가 발생했습니다.', 500, error);
  }
}