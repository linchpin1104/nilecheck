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
  let prompt = `당신은 웰니스 코치입니다. 사용자의 최근 7일간의 활동, 식사, 수면, 정서 데이터를 기반으로 맞춤형 웰니스 제안을 3가지 제공해주세요. 각 제안은 구체적이고 실행 가능해야 합니다.

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
위의 데이터를 기반으로, 사용자에게 도움이 될 구체적인 웰니스 제안을 3가지 제공해주세요. 각 제안은 2-3문장 정도의 길이로, 서로 다른 영역(수면, 식사, 활동, 정서 등)에 대한 것이 좋습니다. 
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
          "규칙적인 수면 습관을 위해 매일 같은 시간에 취침하고 기상하는 루틴을 만들어보세요. 이는 수면의 질을 향상시키고 전반적인 웰빙에 도움이 됩니다.",
          "하루에 한 끼라도 채소가 풍부한 식사를 하는 것을 목표로 삼아보세요. 다양한 색상의 채소는 필수 영양소와 항산화제를 제공합니다.",
          "짧더라도 매일 5-10분간의 명상이나 깊은 호흡 연습을 통해 스트레스를 관리해보세요. 이는 정신적 안정과 집중력 향상에 도움이 됩니다."
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
          "균형 잡힌 영양 섭취를 위해 다양한 색상의 과일과 채소를 매일 식단에 포함시켜보세요. 비타민과 미네랄 섭취에 도움이 됩니다.",
          "하루에 30분 이상 걷기와 같은 가벼운 유산소 운동을 통해 기분을 개선하고 에너지 수준을 높여보세요.",
          "하루를 마무리할 때 감사한 일 3가지를 기록하는 습관을 들여보세요. 이는 긍정적인 마음가짐을 키우는 데 도움이 됩니다."
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
          "매일 물을 충분히 마시는 것은 신체의 모든 기능을 최적화하는 데 중요합니다. 하루에 8잔의 물을 마시는 것을 목표로 하세요.",
          "규칙적인 운동은 신체적, 정신적 건강에 필수적입니다. 일주일에 3-4회, 30분씩 가벼운 운동을 시작해보세요.",
          "질 좋은 수면은 회복과 성장에 중요합니다. 취침 전 전자기기 사용을 줄이고 편안한 환경을 조성해보세요."
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
            content: '당신은 웰니스 코치입니다. 사용자의 건강, 수면, 식사, 정서 관련 데이터를 분석하고 맞춤형 제안을 제공합니다.'
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
          "하루 중 10분이라도 명상이나 마음챙김 연습을 통해 스트레스를 줄여보세요. 앱이나 가이드 영상을 활용하면 쉽게 시작할 수 있습니다.",
          "신체 활동은 기분 개선에 큰 도움이 됩니다. 하루에 30분씩 걷기만 해도 정신 건강에 긍정적인 영향을 줄 수 있습니다.",
          "숙면을 위해 취침 시간을 규칙적으로 유지하고, 자기 전 스마트폰 사용을 줄여보세요. 블루라이트는 수면을 방해할 수 있습니다."
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
        "매일 아침 운동으로 하루를 시작하면 기분과 에너지 수준을 향상시킬 수 있습니다. 10분의 가벼운 스트레칭부터 시작해보세요.",
        "스트레스 관리를 위해 심호흡 기법을 시도해보세요. 하루에 몇 분만 투자해도 마음의 안정을 찾는 데 도움이 됩니다.",
        "균형 잡힌 식단은 전반적인 웰빙의 기초입니다. 매 식사에 단백질, 건강한 지방, 복합 탄수화물을 포함시켜보세요."
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
        "충분한 수분 섭취는 건강 유지에 필수적입니다. 하루에 8잔 이상의 물을 마시는 것을 목표로 해보세요.",
        "스트레스 감소를 위해 하루에 최소 15분의 '디지털 디톡스' 시간을 가져보세요. 전자기기 없이 책을 읽거나 명상하는 시간이 도움됩니다.",
        "규칙적인 운동 루틴을 만들어보세요. 일주일에 3-4회, 30분씩의 중간 강도 운동이 신체와 정신 건강에 효과적입니다."
      ],
      isDefaultSuggestion: true
    }, { status: 500 });
  }
} 