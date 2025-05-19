import { WellbeingCheckinRecord } from '@/types';
import { 
  createApiResponse, 
  createApiErrorResponse, 
  updateUserAppData, 
  generateId,
  logApiAction,
  getUserAppData
} from '@/lib/api/utils';
import { getServerSession } from '@/lib/auth-server';

// 체크인 데이터 목록 조회
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const uid = searchParams.get('uid');
    const date = searchParams.get('date');

    if (!uid) {
      return createApiErrorResponse('사용자 ID가 필요합니다.', 400);
    }

    logApiAction('체크인 데이터 조회 요청', { uid, date });

    try {
      const { exists, data } = await getUserAppData(uid);
      
      if (!exists) {
        return createApiResponse({ checkins: [] });
      }
      
      const checkins = data?.checkins || [];
      
      // 필터링 로직
      if (date) {
        const filteredCheckins = (checkins as WellbeingCheckinRecord[]).filter((checkin: WellbeingCheckinRecord) => {
          return checkin.date === date;
        });
        
        return createApiResponse({ checkins: filteredCheckins });
      }
      
      return createApiResponse({ checkins });
    } catch (error) {
      return createApiErrorResponse('체크인 데이터 조회 중 오류가 발생했습니다.', 500, error);
    }
  } catch (error) {
    return createApiErrorResponse('요청 처리 중 오류가 발생했습니다.', 500, error);
  }
}

// 체크인 데이터 생성
export async function POST(request: Request) {
  try {
    // 세션 확인하여 인증된 사용자인지 검증
    const userSession = await getServerSession();
    
    // 세션이 없으면 인증 오류 반환
    if (!userSession) {
      console.error('[API] 체크인 요청 인증 실패: 세션 없음');
      return createApiErrorResponse('인증이 필요합니다. 다시 로그인해주세요.', 401);
    }
    
    const { uid, checkinData } = await request.json();

    if (!uid || !checkinData) {
      return createApiErrorResponse('사용자 ID와 체크인 데이터가 필요합니다.', 400);
    }
    
    // 세션 사용자 ID와 요청 ID 일관성 체크
    // 전화번호 기반 ID와 세션 ID 간 상호 변환 로직 추가
    let isValidRequest = userSession.id === uid;
    
    // ID가 일치하지 않는 경우, 전화번호 기반으로 생성된 ID인지 확인
    if (!isValidRequest && userSession.phoneNumber) {
      // 전화번호에서 하이픈 제거한 ID와 비교
      const phoneBasedId = userSession.phoneNumber.replace(/-/g, '');
      isValidRequest = phoneBasedId === uid;
      
      if (isValidRequest) {
        console.log(`[API] 전화번호 기반 ID 검증 성공: ${uid}`);
      }
    }
    
    if (!isValidRequest) {
      console.error(`[API] 세션 유저 ID(${userSession?.id})와 요청 ID(${uid}) 불일치`);
      return createApiErrorResponse('인증 토큰과 사용자 ID가 일치하지 않습니다.', 401);
    }

    // 필수 필드 검증
    if (!checkinData.stressLevel || !checkinData.mainEmotions || !checkinData.todayActivities) {
      return createApiErrorResponse('스트레스 수치, 감정, 활동 정보가 필요합니다.', 400);
    }

    // 체크인 날짜 생성
    const dateStr = checkinData.date || new Date().toISOString().substring(0, 10);
    
    logApiAction('체크인 데이터 저장 시작', { 
      uid, 
      date: dateStr, 
      stressLevel: checkinData.stressLevel,
      sessionId: userSession.id
    });

    try {
      // 앱 데이터에 체크인 정보 추가 또는 업데이트
      const result = await updateUserAppData(uid, (appData) => {
        // 체킨 배열이 없으면 빈 배열 초기화
        const checkins = appData.checkins || [];
        
        // 같은 날짜의 기존 체크인 확인
        const existingIndex = (checkins as WellbeingCheckinRecord[]).findIndex((entry: WellbeingCheckinRecord) => entry.date === dateStr);
        
        if (existingIndex >= 0) {
          logApiAction('기존 체크인 기록 업데이트', { date: dateStr });
          
          // 기존 체크인 기록 업데이트
          (checkins as WellbeingCheckinRecord[])[existingIndex] = {
            ...(checkins as WellbeingCheckinRecord[])[existingIndex],
            input: checkinData,
            dateTime: new Date().toISOString(),
            date: dateStr
          };
          
          return { ...appData, checkins };
        } else {
          // 새 체크인 객체 생성
          const newCheckin: WellbeingCheckinRecord = {
            id: generateId('checkin'),
            dateTime: new Date().toISOString(),
            date: dateStr,
            input: checkinData,
            output: null
          };
          
          logApiAction('새 체크인 기록 추가', { id: newCheckin.id });
          return { ...appData, checkins: [...(checkins as WellbeingCheckinRecord[]), newCheckin] };
        }
      });
      
      // 성공 응답 반환
      if (result.success) {
        const appData = result.data as Record<string, unknown>;
        const checkins = appData.checkins as WellbeingCheckinRecord[];
        
        if (Array.isArray(checkins) && checkins.length > 0) {
          // 방금 추가/업데이트한 체크인 찾기
          const updatedCheckin = checkins.find(c => c.date === dateStr);
          
          if (updatedCheckin) {
            const response = createApiResponse({
              checkin: updatedCheckin,
              sessionValid: !!userSession, // 세션 유효성 정보 추가
              updated: checkins.length === ((appData.checkins || []) as WellbeingCheckinRecord[]).length
            }, true, `체크인 데이터가 ${checkins.length === ((appData.checkins || []) as WellbeingCheckinRecord[]).length ? '업데이트' : '저장'}되었습니다.`);
            
            return response;
          }
        }
      }
      
      return createApiErrorResponse('체크인 데이터 처리 중 오류가 발생했습니다.', 500);
    } catch (error) {
      return createApiErrorResponse('체크인 데이터 저장 중 오류가 발생했습니다.', 500, error);
    }
  } catch (error) {
    return createApiErrorResponse('요청 처리 중 오류가 발생했습니다.', 500, error);
  }
}

// 체크인 데이터 업데이트
export async function PUT(request: Request) {
  try {
    const { uid, checkinData } = await request.json();

    if (!uid || !checkinData || !checkinData.id) {
      return createApiErrorResponse('사용자 ID, 체크인 ID 및 데이터가 필요합니다.', 400);
    }

    logApiAction('체크인 데이터 업데이트', { uid, checkinId: checkinData.id });
    
    try {
      const result = await updateUserAppData(uid, (appData) => {
        const checkins = appData.checkins || [];
        
        // 업데이트할 체크인 데이터 찾기
        const checkinIndex = (checkins as WellbeingCheckinRecord[]).findIndex((entry: WellbeingCheckinRecord) => entry.id === checkinData.id);
        
        if (checkinIndex === -1) {
          throw new Error('해당 체크인 데이터를 찾을 수 없습니다.');
        }
        
        // 체크인 데이터 업데이트
        // 기존 객체 구조 유지하면서 업데이트
        let updatedCheckin = { ...(checkins as WellbeingCheckinRecord[])[checkinIndex] };
        
        // input 필드 업데이트
        if (checkinData.input) {
          updatedCheckin.input = { 
            ...updatedCheckin.input, 
            ...checkinData.input 
          };
        }
        
        // 기타 필드 업데이트
        updatedCheckin = { 
          ...updatedCheckin,
          ...checkinData,
          // input 필드는 위에서 별도로 병합했으므로 보존
          input: updatedCheckin.input
        };
        
        // 배열 업데이트
        (checkins as WellbeingCheckinRecord[])[checkinIndex] = updatedCheckin;
        
        return { ...appData, checkins };
      });
      
      if (result.success) {
        const checkins = result.data.checkins as WellbeingCheckinRecord[];
        const updatedCheckin = checkins.find((entry: WellbeingCheckinRecord) => entry.id === checkinData.id);
        
        if (updatedCheckin) {
          return createApiResponse({
            checkin: updatedCheckin
          }, true, '체크인 데이터가 업데이트되었습니다.');
        }
      }
      
      return createApiErrorResponse('체크인 데이터 업데이트 중 오류가 발생했습니다.', 500);
    } catch (error) {
      if (error instanceof Error && error.message === '해당 체크인 데이터를 찾을 수 없습니다.') {
        return createApiErrorResponse(error.message, 404);
      }
      return createApiErrorResponse('체크인 데이터 업데이트 중 오류가 발생했습니다.', 500, error);
    }
  } catch (error) {
    return createApiErrorResponse('요청 처리 중 오류가 발생했습니다.', 500, error);
  }
} 