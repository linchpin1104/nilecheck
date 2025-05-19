"use client";

import { useCallback } from 'react';
import { ko } from 'date-fns/locale';

// 실제 앱에서는 다국어 지원을 위한 
// i18n 라이브러리(next-intl 등)를 연동하겠지만, 
// 지금은 간단한 구현으로 시작하겠습니다.

type TranslationKey = string;
type Replacements = Record<string, string | number>;

// 간단한 번역 데이터
const translations: Record<TranslationKey, string> = {
  // 대시보드
  'dashboard.title': '대시보드',
  'dashboard.addOrUpdateEntries': '활동 기록하기',
  'dashboard.addOrUpdateEntries.description': '식사, 수면, 정서 체크인을 기록하세요',
  'dashboard.goToLogAndCheckin': '활동 기록하기',
  'dashboard.wellnessReports.title': '웰니스 리포트',
  'dashboard.wellnessReports.description': '주간 웰니스 리포트를 확인하세요',
  'dashboard.wellnessReports.viewButton': '리포트 보기',
  'dashboard.welcome.title': '더나일체크에 오신 것을 환영합니다',
  'dashboard.welcome.description': '일상 활동을 기록하고 건강 관리에 도움을 받으세요.',
  'dashboard.welcome.logFirstActivity': '첫 활동 기록하기',
  'dashboard.welcome.viewWellnessReports': '웰니스 리포트 보기',
  'dashboard.summary.todaySleep': '오늘의 수면 시간',
  'dashboard.summary.todaySleep.unit': '시간',
  'dashboard.summary.todaySleep.description': '지난 밤 기록된 수면 시간',
  'dashboard.summary.mealsEatenToday': '오늘 식사',
  'dashboard.summary.mealsEatenToday.description': '오늘 기록된 식사 횟수',
  'dashboard.summary.activitiesToday': '오늘의 활동',
  'dashboard.summary.activitiesToday.description': '오늘 기록된 활동 수',
  
  // 로딩
  'loadingDashboard': '데이터를 불러오는 중입니다...',
  
  // 식사 기록 폼
  'mealLogForm.title': '식사 기록하기',
  'mealLogForm.mealType': '식사 종류',
  'mealLogForm.mealTypeOption.breakfast': '아침',
  'mealLogForm.mealTypeOption.lunch': '점심',
  'mealLogForm.mealTypeOption.dinner': '저녁',
  'mealLogForm.mealTypeOption.snack': '간식',
  'mealLogForm.datetime': '날짜 및 시간',
  'mealLogForm.status': '상태',
  'mealLogForm.status.eaten': '먹음',
  'mealLogForm.status.skipped': '건너뜀',
  'mealLogForm.description': '식사 내용',
  'mealLogForm.quality': '식사 품질',
  'mealLogForm.qualityOption.1': '매우 나쁨 (1/5)',
  'mealLogForm.qualityOption.2': '나쁨 (2/5)',
  'mealLogForm.qualityOption.3': '보통 (3/5)',
  'mealLogForm.qualityOption.4': '좋음 (4/5)',
  'mealLogForm.qualityOption.5': '매우 좋음 (5/5)',
  'mealLogForm.withChildren': '자녀와 함께 식사했나요?',
  'mealLogForm.submit': '저장하기',
  'mealLogForm.cancel': '취소',
  
  // 수면 기록 폼
  'sleepLogForm.title': '수면 기록하기',
  'sleepLogForm.startTime': '취침 시간',
  'sleepLogForm.endTime': '기상 시간',
  'sleepLogForm.quality': '수면 품질',
  'sleepLogForm.wokeUp': '야간에 깬 적이 있나요?',
  'sleepLogForm.wakeUpCount': '깬 횟수',
  'sleepLogForm.wakeUpReason': '깬 이유',
  'sleepLogForm.wakeUpReason.child': '자녀',
  'sleepLogForm.wakeUpReason.stress': '스트레스',
  'sleepLogForm.wakeUpReason.other': '기타',
  'sleepLogForm.submit': '저장하기',
  'sleepLogForm.cancel': '취소',
  
  // 체크인 폼
  'wellbeingCheckinForm.title': '정서 상태 체크인',
  'wellbeingCheckinForm.stressLevel': '오늘의 스트레스 수준 (1-10)',
  'wellbeingCheckinForm.emotions': '오늘의 주요 감정',
  'wellbeingCheckinForm.otherEmotionDetail': '기타 감정 설명',
  'wellbeingCheckinForm.activities': '오늘 한 활동',
  'wellbeingCheckinForm.otherActivityDetail': '기타 활동 설명',
  'wellbeingCheckinForm.conversationPartner': '오늘 대화한 상대',
  'wellbeingCheckinForm.otherConversationPartnerDetail': '기타 대화 상대 설명',
  'wellbeingCheckinForm.spouseConversationTopics': '배우자와 대화한 주제',
  'wellbeingCheckinForm.otherSpouseTopicDetail': '기타 대화 주제 설명',
  'wellbeingCheckinForm.toast.submitSuccess.title': '체크인 완료',
  'wellbeingCheckinForm.toast.submitSuccess.description': '{date} 체크인이 저장되었습니다',
  
  // 감정
  'emotion.joy': '기쁨',
  'emotion.sadness': '슬픔',
  'emotion.anger': '분노',
  'emotion.anxiety': '불안',
  'emotion.calmness': '평온',
  'emotion.gratitude': '감사',
  'emotion.stress': '스트레스',
  'emotion.hope': '희망',
  'emotion.tiredness': '피로',
  'emotion.excitement': '설렘',
  'emotion.other': '기타',
  
  // 활동
  'activity.exercise': '운동',
  'activity.relaxation': '휴식',
  'activity.hobbies': '취미',
  'activity.socializing': '사교활동',
  'activity.householdChores': '집안일',
  'activity.childcare': '자녀 돌봄',
  'activity.workStudy': '일/공부',
  'activity.selfCare': '자기관리',
  'activity.outdoors': '야외활동',
  'activity.errands': '심부름',
  'activity.other': '기타',
  
  // 대화 상대
  'conversationPartner.friend': '친구',
  'conversationPartner.spouse': '배우자',
  'conversationPartner.parents': '부모님',
  'conversationPartner.colleague': '동료',
  'conversationPartner.other': '기타',
  'conversationPartner.none': '없음',
  
  // 배우자와의 대화 주제
  'spouseTopic.dailyChat': '일상 대화',
  'spouseTopic.kidsTalk': '자녀 관련',
  'spouseTopic.difficulties': '어려움/고민',
  'spouseTopic.futurePlans': '미래 계획',
  'spouseTopic.finances': '재정/경제',
  'spouseTopic.hobbiesLeisure': '취미/여가',
  'spouseTopic.other': '기타',
  
  // 마이페이지
  'myPage.noData': '데이터 없음',
  'myPage.meals.table.quality': '품질',
  'myPage.sleep.table.duration': '시간',
  'myPage.sleep.table.quality': '품질',
  'myPage.sleep.table.wakeUpCount': '기상 횟수',
  'myPage.checkins.checkedInOn': '{date}에 체크인',
  'myPage.checkins.stressLevel': '스트레스 레벨',
  'myPage.checkins.emotions': '감정',
  'myPage.checkins.activities': '활동',
  
  // 웰니스 리포트 페이지
  'wellnessReportPage.title': '웰니스 솔루션',
  'wellnessReportPage.generatingButton': '리포트 생성 중...',
  'wellnessReportPage.generateReportButton': '새 리포트 생성하기',
  'wellnessReportPage.noData.title': '데이터 부족',
  'wellnessReportPage.noData.description': '리포트 생성을 위한 충분한 데이터가 없습니다. 더 많은 활동을 기록해주세요.',
  'wellnessReportPage.toast.alreadyExists.title': '리포트 이미 존재',
  'wellnessReportPage.toast.alreadyExists.description': '{weekStartDate} 주간의 리포트가 이미 있습니다.',
  'wellnessReportPage.toast.success.title': '리포트 생성 완료',
  'wellnessReportPage.toast.success.description': '주간 웰니스 리포트가 생성되었습니다.',
  'wellnessReportPage.toast.error.title': '리포트 생성 실패',
  'wellnessReportPage.toast.error.description': '리포트 생성 중 오류가 발생했습니다.',
  'wellnessReportPage.noReportsYet.title': '리포트가 없습니다',
  'wellnessReportPage.noReportsYet.descriptionLine1': '활동을 기록하고 {logDataLink}',
  'wellnessReportPage.noReportsYet.descriptionLine2': ' 리포트를 생성해보세요.',
  'wellnessReportPage.logDataLinkText': '일상 체크인을 완료한 후',
};

export function useTranslation() {
  const t = useCallback((key: TranslationKey, replacements?: Replacements) => {
    let text = translations[key] || key;
    
    if (replacements) {
      Object.keys(replacements).forEach(placeholder => {
        text = text.replace(`{${placeholder}}`, String(replacements[placeholder]));
      });
    }
    
    return text;
  }, []);
  
  return { 
    t,
    dateLocale: ko // 한국어 날짜 포맷 사용
  };
} 