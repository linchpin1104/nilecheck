import { SleepEntry } from '@/types';
import { parseISO, isWithinInterval, startOfDay, endOfDay } from 'date-fns';
import { 
  createApiResponse, 
  createApiErrorResponse, 
  updateUserAppData, 
  generateId,
  logApiAction,
  getUserAppData
} from '@/lib/api/utils';

// 수면 데이터 조회
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const uid = searchParams.get('uid');
    const date = searchParams.get('date');

    if (!uid) {
      return createApiErrorResponse('사용자 ID가 필요합니다.', 400);
    }

    logApiAction('수면 데이터 조회 요청', { uid, date });
    
    try {
      const { exists, data } = await getUserAppData(uid);
      
      if (!exists) {
        return createApiResponse({ sleep: [] });
      }
      
      let sleepEntries = data?.sleep || [];
      
      // 특정 날짜의 수면 데이터 필터링
      if (date) {
        const targetDate = startOfDay(parseISO(date));
        const targetDateEnd = endOfDay(parseISO(date));
        
        sleepEntries = (sleepEntries as SleepEntry[]).filter((entry: SleepEntry) => {
          const sleepStart = parseISO(entry.startTime);
          return isWithinInterval(sleepStart, { start: targetDate, end: targetDateEnd });
        });
      }
      
      return createApiResponse({ sleep: sleepEntries });
    } catch (error) {
      return createApiErrorResponse('수면 데이터 조회 중 오류가 발생했습니다.', 500, error);
    }
  } catch (error) {
    return createApiErrorResponse('요청 처리 중 오류가 발생했습니다.', 500, error);
  }
}

// 수면 데이터 추가
export async function POST(request: Request) {
  try {
    const { uid, sleepData } = await request.json();

    if (!uid || !sleepData) {
      return createApiErrorResponse('사용자 ID와 수면 데이터가 필요합니다.', 400);
    }

    // 필수 필드 검증
    if (!sleepData.startTime || !sleepData.endTime || !sleepData.quality) {
      return createApiErrorResponse('수면 시작 시간, 종료 시간, 수면 품질 정보가 필요합니다.', 400);
    }

    logApiAction('수면 데이터 저장 시작', { uid, quality: sleepData.quality });

    try {
      // 앱 데이터에 수면 정보 추가 또는 업데이트
      const result = await updateUserAppData(uid, (appData) => {
        const sleep = appData.sleep || [];
        
        // 새 수면 객체 생성
        const newSleep: SleepEntry = {
          id: generateId('sleep'),
          ...sleepData
        };
        
        logApiAction('새 수면 기록 추가', { id: newSleep.id });
        return { ...appData, sleep: [...(sleep as SleepEntry[]), newSleep] };
      });
      
      // 성공 응답 반환
      if (result.success) {
        const appData = result.data as Record<string, unknown>;
        const sleepEntries = appData.sleep as SleepEntry[];
        
        if (Array.isArray(sleepEntries) && sleepEntries.length > 0) {
          const addedSleep = sleepEntries[sleepEntries.length - 1];
          
          return createApiResponse({
            sleep: addedSleep
          }, true, '수면 데이터가 저장되었습니다.');
        }
      }
      
      return createApiErrorResponse('수면 데이터 처리 중 오류가 발생했습니다.', 500);
    } catch (error) {
      return createApiErrorResponse('수면 데이터 저장 중 오류가 발생했습니다.', 500, error);
    }
  } catch (error) {
    return createApiErrorResponse('요청 처리 중 오류가 발생했습니다.', 500, error);
  }
}

// 수면 데이터 업데이트
export async function PUT(request: Request) {
  try {
    const { uid, sleepData } = await request.json();

    if (!uid || !sleepData || !sleepData.id) {
      return createApiErrorResponse('사용자 ID, 수면 ID 및 데이터가 필요합니다.', 400);
    }

    logApiAction('수면 데이터 업데이트', { uid, sleepId: sleepData.id });
    
    try {
      const result = await updateUserAppData(uid, (appData) => {
        const sleepEntries = appData.sleep || [];
        
        // 업데이트할 수면 데이터 찾기
        const sleepIndex = (sleepEntries as SleepEntry[]).findIndex((entry: SleepEntry) => entry.id === sleepData.id);
        
        if (sleepIndex === -1) {
          throw new Error('해당 수면 데이터를 찾을 수 없습니다.');
        }
        
        // 수면 데이터 업데이트
        (sleepEntries as SleepEntry[])[sleepIndex] = { ...(sleepEntries as SleepEntry[])[sleepIndex], ...sleepData };
        
        return { ...appData, sleep: sleepEntries };
      });
      
      if (result.success) {
        const sleepEntries = result.data.sleep as SleepEntry[];
        const updatedSleep = (sleepEntries as SleepEntry[]).find((entry: SleepEntry) => entry.id === sleepData.id);
        
        if (updatedSleep) {
          return createApiResponse({
            sleep: updatedSleep
          }, true, '수면 데이터가 업데이트되었습니다.');
        }
      }
      
      return createApiErrorResponse('수면 데이터 업데이트 중 오류가 발생했습니다.', 500);
    } catch (error) {
      if (error instanceof Error && error.message === '해당 수면 데이터를 찾을 수 없습니다.') {
        return createApiErrorResponse(error.message, 404);
      }
      return createApiErrorResponse('수면 데이터 업데이트 중 오류가 발생했습니다.', 500, error);
    }
  } catch (error) {
    return createApiErrorResponse('요청 처리 중 오류가 발생했습니다.', 500, error);
  }
} 