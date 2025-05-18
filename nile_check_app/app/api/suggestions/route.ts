import { NextResponse } from 'next/server';
import { db } from '@/lib/firebase/firebase';
import { doc, getDoc } from 'firebase/firestore';
import { MealEntry, SleepEntry, WellbeingCheckinRecord } from '@/types';
import { parseISO, subDays, differenceInHours } from 'date-fns';

// OpenAI API 설정
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const OPENAI_API_URL = 'https://api.openai.com/v1/chat/completions';

// 데이터 가공 및 GPT 프롬프트 생성 함수
function preparePrompt(data: {
  meals: MealEntry[];
  sleep: SleepEntry[];
  checkins: WellbeingCheckinRecord[];
}) {
  const { meals, sleep, checkins } = data;
  
  // 최근 7일 데이터만 필터링
  const today = new Date();
  const sevenDaysAgo = subDays(today, 7);
  
  const recentMeals = meals.filter(m => {
    const mealDate = parseISO(m.dateTime);
    return mealDate >= sevenDaysAgo;
  });
  
  const recentSleep = sleep.filter(s => {
    const sleepDate = parseISO(s.startTime);
    return sleepDate >= sevenDaysAgo;
  });
  
  const recentCheckins = checkins.filter(c => {
    const checkinDate = parseISO(c.dateTime);
    return checkinDate >= sevenDaysAgo;
  });
  
  // 수면 데이터 분석
  const sleepStats = recentSleep.length > 0 ? {
    averageDuration: recentSleep.reduce((acc, s) => {
      const startTime = parseISO(s.startTime);
      const endTime = parseISO(s.endTime);
      return acc + differenceInHours(endTime, startTime);
    }, 0) / recentSleep.length,
    averageQuality: recentSleep.reduce((acc, s) => acc + s.quality, 0) / recentSleep.length,
    wakeUpCount: recentSleep.reduce((acc, s) => acc + (s.wokeUpDuringNight ? (s.wakeUpCount || 0) : 0), 0),
  } : null;
  
  // 식사 데이터 분석
  const skippedMeals = recentMeals.filter(m => m.status === 'skipped').length;
  const mealTypes = recentMeals.reduce((acc, m) => {
    if (m.foodTypes && m.foodTypes.length > 0) {
      m.foodTypes.forEach(type => {
        acc[type] = (acc[type] || 0) + 1;
      });
    }
    return acc;
  }, {} as Record<string, number>);
  
  // 정서 데이터 분석
  const emotions = recentCheckins.reduce((acc, c) => {
    if (c.input.mainEmotions && c.input.mainEmotions.length > 0) {
      c.input.mainEmotions.forEach(emotion => {
        acc[emotion] = (acc[emotion] || 0) + 1;
      });
    }
    return acc;
  }, {} as Record<string, number>);
  
  const activities = recentCheckins.reduce((acc, c) => {
    if (c.input.todayActivities && c.input.todayActivities.length > 0) {
      c.input.todayActivities.forEach(activity => {
        acc[activity] = (acc[activity] || 0) + 1;
      });
    }
    return acc;
  }, {} as Record<string, number>);
  
  // 주요 정서 상태 찾기
  const topEmotions = Object.entries(emotions)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([name]) => name);
  
  // 주요 활동 찾기
  const topActivities = Object.entries(activities)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([name]) => name);
  
  // 한국어로 정서 변환
  const emotionNameMap: Record<string, string> = {
    joy: "기쁨",
    sadness: "슬픔",
    anger: "분노",
    anxiety: "불안",
    calmness: "평온",
    gratitude: "감사",
    stress: "스트레스",
    hope: "희망"
  };
  
  // 한국어로 활동 변환
  const activityNameMap: Record<string, string> = {
    exercise: "운동",
    relaxation: "휴식",
    hobbies: "취미",
    socializing: "사교 활동",
    householdChores: "집안일",
    workStudy: "업무/학업",
    selfCare: "자기 관리",
    outdoors: "야외 활동",
    errands: "용무"
  };
  
  // 프롬프트 생성
  let prompt = `당신은 부모를 위한 웰니스 코치입니다. 양육 책임이 있는 부모의 최근 7일간의 활동, 식사, 수면, 정서 데이터를 기반으로 맞춤형 웰니스 제안을 3가지 제공해주세요. 
  
각 제안은 부모의 웰빙을 향상시키는 데 중점을 두어야 하며, 바쁜 부모 일정에 쉽게 통합될 수 있도록 실용적이고 구체적이어야 합니다. 양육과 자기 관리 사이에서 균형을 찾는 데 도움이 되는 팁을 제공해주세요.

사용자 데이터:
`;
  
  if (sleepStats) {
    prompt += `
1. 수면 데이터:
   - 평균 수면 시간: ${sleepStats.averageDuration.toFixed(1)}시간
   - 평균 수면 질: ${sleepStats.averageQuality.toFixed(1)}/5점
   - 야간 깨어남 횟수: ${sleepStats.wakeUpCount}회
`;
  }
  
  prompt += `
2. 식사 데이터:
   - 거른 식사 횟수: ${skippedMeals}회
   - 주요 식품 유형: ${Object.entries(mealTypes).sort((a, b) => b[1] - a[1]).slice(0, 3).map(([type]) => type).join(', ') || '데이터 없음'}

3. 정서 데이터:
   - 주요 감정: ${topEmotions.map(e => emotionNameMap[e] || e).join(', ') || '데이터 없음'}

4. 활동 데이터:
   - 주요 활동: ${topActivities.map(a => activityNameMap[a] || a).join(', ') || '데이터 없음'}
`;

  prompt += `
위의 데이터를 기반으로, 부모로서의 사용자에게 도움이 될 구체적인 웰니스 제안을 3가지 제공해주세요. 각 제안은 2-3문장 정도의 길이로, 서로 다른 영역(수면, 식사, 활동, 정서 등)에 대한 것이 좋습니다.

부모를 위한 제안이므로 다음 사항을 고려해주세요:
1. 시간이 제한된 부모가 실행할 수 있는 간단하고 실용적인 제안
2. 자녀와 함께 할 수 있는 활동을 통해 부모의 웰빙도 향상시키는 방법
3. 부모 역할의 스트레스를 관리하는 방법
4. 육아 중에도 자신의 건강과 웰빙을 돌볼 수 있는 균형 잡힌 접근법

제안은 한국어로 작성해주세요. 결과는 JSON 배열 형식으로 제공해주세요.

format:
[
  "첫 번째 제안",
  "두 번째 제안",
  "세 번째 제안"
]
`;

  return prompt;
}

// 개인화 제안 생성 엔드포인트
export async function POST(request: Request) {
  try {
    const { uid } = await request.json();

    if (!uid) {
      return NextResponse.json({ error: '사용자 ID가 필요합니다.' }, { status: 400 });
    }

    if (!OPENAI_API_KEY) {
      console.error('OpenAI API 키가 설정되지 않았습니다.');
      // OpenAI API 키가 없으면 기본 추천 제공
      return NextResponse.json({
        suggestions: [
          "아이들이 잠든 후 10-15분이라도 자신만의 시간을 가져보세요. 간단한 스트레칭이나 조용한 독서 시간은 부모로서의 일상에서 정신적 균형을 찾는데 도움이 됩니다.",
          "가족 식사 준비 시 주말에 미리 건강한 반찬을 준비해두면 평일 저녁 시간의 스트레스를 줄일 수 있습니다. 이는 규칙적인 식사 패턴을 유지하는 데도 도움이 됩니다.",
          "아이와 함께하는 15분 산책을 일상에 추가해보세요. 이는 부모와 자녀 모두에게 신선한 공기와 가벼운 운동을 제공하며, 귀중한 대화 시간이 됩니다."
        ]
      });
    }

    console.log(`[API] 사용자 ${uid}의 개인화된 웰니스 제안 생성 시작`);

    // 사용자 데이터 불러오기
    const appDataRef = doc(db, 'appData', uid);
    const appDataDoc = await getDoc(appDataRef);
    
    if (!appDataDoc.exists()) {
      console.log(`[API] 사용자 ${uid}의 데이터가 없습니다. 기본 제안을 제공합니다.`);
      return NextResponse.json({
        suggestions: [
          "육아 중에도 자신의 영양을 챙기는 것이 중요합니다. 간식으로 손쉽게 먹을 수 있는 견과류나 과일을 냉장고에 준비해두면 바쁜 순간에도 건강한 선택을 할 수 있습니다.",
          "자녀의 취침 시간을 활용해 하루 10분이라도 명상이나 심호흡을 해보세요. 이 짧은 시간도 부모로서의 스트레스를 줄이고 정서적 안정을 찾는 데 도움이 됩니다.",
          "주말에는 아이와 함께 공원에서 놀이 활동을 하며 신체 활동량을 높여보세요. 함께하는 활동은 가족 유대감도 강화하면서 부모의 운동 부족도 해결할 수 있습니다."
        ]
      });
    }
    
    const appData = appDataDoc.data();
    const userData = {
      meals: appData.meals || [],
      sleep: appData.sleep || [],
      checkins: appData.checkins || []
    };
    
    // 데이터가 매우 적을 경우 기본 제안 제공
    if (userData.meals.length === 0 && userData.sleep.length === 0 && userData.checkins.length === 0) {
      console.log(`[API] 사용자 ${uid}의 데이터가 충분하지 않습니다. 기본 제안을 제공합니다.`);
      return NextResponse.json({
        suggestions: [
          "아이의 낮잠 시간에 5분이라도 물을 마시며 휴식을 취하세요. 간단한 습관이지만 부모의 수분 섭취와 짧은 휴식 시간을 확보하는 데 도움이 됩니다.",
          "매일 아침 아이를 어린이집에 데려다주는 길에 5분 더 걸어보세요. 이 작은 습관은 부모의 신체 활동량을 늘리고 하루를 활기차게 시작하는 데 도움이 됩니다.",
          "자녀가 일찍 잠들 수 있도록 저녁 루틴을 만들어보세요. 아이가 일찍 잠들면 부모도 충분한 휴식과 수면 시간을 확보할 수 있습니다."
        ]
      });
    }
    
    // GPT API 호출 준비
    const prompt = preparePrompt(userData);
    console.log(`[API] GPT 프롬프트 준비 완료`);
    
    // OpenAI API 호출
    const response = await fetch(OPENAI_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${OPENAI_API_KEY}`
      },
      body: JSON.stringify({
        model: 'gpt-4',
        messages: [
          {
            role: 'system',
            content: '당신은 부모를 위한 웰니스 코치입니다. 부모의 건강, 수면, 식사, 정서 관련 데이터를 분석하고 양육과 자기 관리 사이에서 균형을 찾는 데 도움이 되는 맞춤형 제안을 제공합니다.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.7,
        max_tokens: 800
      })
    });
    
    if (!response.ok) {
      console.error(`[API] OpenAI API 호출 실패: ${response.status}`);
      
      // 기본 제안 반환
      return NextResponse.json({
        suggestions: [
          "육아 중 짧은 휴식을 정기적으로 가져보세요. 아이가 놀이에 집중해있는 5분이라도 활용해 심호흡을 하면 부모의 스트레스 관리에 도움이 됩니다.",
          "가족 모두가 함께하는 식사 시간을 마련해보세요. 이 시간은 아이와의 유대감을 강화하고 부모에게도 규칙적인 식사 패턴을 유지하는 데 도움이 됩니다.",
          "아이와 함께하는 15분 산책을 일상에 추가해보세요. 이는 부모와 자녀 모두에게 신선한 공기와 가벼운 운동을 제공하며, 귀중한 대화 시간이 됩니다."
        ],
        error: "AI 제안 생성 중 오류가 발생했습니다.",
        isDefaultSuggestion: true
      });
    }
    
    const data = await response.json();
    console.log(`[API] GPT 응답 받음: ${JSON.stringify(data).substring(0, 200)}...`);
    
    let suggestions;
    try {
      // GPT 응답 파싱 
      const content = data.choices[0].message.content;
      // JSON 배열 추출 시도
      const jsonMatch = content.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        suggestions = JSON.parse(jsonMatch[0]);
      } else {
        // JSON 형태가 아니면 줄바꿈 기준으로 분리
        suggestions = content
          .split('\n')
          .filter((line: string) => line.trim().length > 0 && !line.startsWith('```') && !line.includes(':'))
          .slice(0, 3);
      }
    } catch (parseError) {
      console.error(`[API] GPT 응답 파싱 오류: ${parseError}`);
      suggestions = [
        "아이들이 잠든 후 10-15분이라도 자신만의 시간을 가져보세요. 간단한 스트레칭이나 조용한 독서 시간은 부모로서의 일상에서 정신적 균형을 찾는데 도움이 됩니다.",
        "가족 식사 준비 시 주말에 미리 건강한 반찬을 준비해두면 평일 저녁 시간의 스트레스를 줄일 수 있습니다. 이는 규칙적인 식사 패턴을 유지하는 데도 도움이 됩니다.",
        "아이와 함께하는 15분 산책을 일상에 추가해보세요. 이는 부모와 자녀 모두에게 신선한 공기와 가벼운 운동을 제공하며, 귀중한 대화 시간이 됩니다."
      ];
    }
    
    return NextResponse.json({
      suggestions,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('개인화 제안 생성 중 오류 발생:', error);
    return NextResponse.json({ 
      error: '서버 오류가 발생했습니다.',
      suggestions: [
        "아이들이 잠든 후 10-15분이라도 자신만의 시간을 가져보세요. 간단한 스트레칭이나 조용한 독서 시간은 부모로서의 일상에서 정신적 균형을 찾는데 도움이 됩니다.",
        "가족 식사 준비 시 주말에 미리 건강한 반찬을 준비해두면 평일 저녁 시간의 스트레스를 줄일 수 있습니다. 이는 규칙적인 식사 패턴을 유지하는 데도 도움이 됩니다.",
        "아이와 함께하는 15분 산책을 일상에 추가해보세요. 이는 부모와 자녀 모두에게 신선한 공기와 가벼운 운동을 제공하며, 귀중한 대화 시간이 됩니다."
      ],
      isDefaultSuggestion: true
    }, { status: 500 });
  }
} 