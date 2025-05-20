"use client";

import { useEffect, useState, useMemo, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Utensils, BedDouble, Info, ListPlus, TrendingUp, TrendingDown, Minus, Lightbulb, RefreshCw } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { subWeeks } from "date-fns";
import { useAppStore } from "@/lib/store";
import useAuth from "@/hooks/useAuth";
import { 
  PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, 
  ResponsiveContainer, Legend
} from 'recharts';
import { usePathname } from "next/navigation";

export default function DashboardPage() {
  const { 
    meals, 
    sleep, 
    checkins, 
    isInitialized, 
    isLoading, 
    getTodaySummary,
    generateSampleData,
    syncData,
    suggestions,
    setSuggestions
  } = useAppStore();
  
  const { getUserId, refreshSession } = useAuth();
  const [isRefreshing, setIsRefreshing] = useState(false);
  
  const [summary, setSummary] = useState({
    todaySleepHours: 0,
    todayMealsLogged: 0,
    todayActivitiesLogged: 0,
  });

  const [sleepStats, setSleepStats] = useState({
    averageSleepHours: 0,
    lastWeekAverage: 0,
    percentChange: 0,
  });

  const [topActivities, setTopActivities] = useState<Array<{name: string, value: number}>>([]);
  const [topEmotions, setTopEmotions] = useState<Array<{name: string, value: number, emoji?: string}>>([]);
  const [topPartners, setTopPartners] = useState<Array<{name: string, value: number}>>([]);
  const [personalizedSuggestions, setPersonalizedSuggestions] = useState<string[]>([]);
  const [isGeneratingSuggestions, setIsGeneratingSuggestions] = useState(false);
  const [suggestionsGenerated, setSuggestionsGenerated] = useState(false);

  const [showWelcomePopup, setShowWelcomePopup] = useState(false);

  const pathname = usePathname();

  // Memoized flags for data existence checks
  const hasData = useMemo(() => 
    isInitialized && (meals.length > 0 || sleep.length > 0 || checkins.length > 0),
  [isInitialized, meals.length, sleep.length, checkins.length]);
  
  // Process data for charts - memoized calculation of sleep statistics
  const calculateSleepStats = useCallback(() => {
    if (!hasData) return null;
    
    const today = new Date();
    const lastWeekStart = subWeeks(today, 1);
    
    // Current week sleep data
    const thisWeekSleep = sleep.filter(entry => {
      const entryDate = new Date(entry.date);
      return entryDate >= lastWeekStart && entryDate <= today;
    });
    
    // Last week sleep data
    const twoWeeksAgo = subWeeks(today, 2);
    const lastWeekSleep = sleep.filter(entry => {
      const entryDate = new Date(entry.date);
      return entryDate >= twoWeeksAgo && entryDate < lastWeekStart;
    });
    
    // Calculate averages
    const currentAvg = thisWeekSleep.length > 0 
      ? thisWeekSleep.reduce((sum, entry) => {
          const hours = (new Date(entry.endTime).getTime() - new Date(entry.startTime).getTime()) / (1000 * 60 * 60);
          return sum + hours;
        }, 0) / thisWeekSleep.length
      : 0;
      
    const lastAvg = lastWeekSleep.length > 0
      ? lastWeekSleep.reduce((sum, entry) => {
          const hours = (new Date(entry.endTime).getTime() - new Date(entry.startTime).getTime()) / (1000 * 60 * 60);
          return sum + hours;
        }, 0) / lastWeekSleep.length
      : 0;
      
    const percentChange = lastAvg > 0 
      ? ((currentAvg - lastAvg) / lastAvg) * 100 
      : 0;
      
    return {
      averageSleepHours: currentAvg,
      lastWeekAverage: lastAvg,
      percentChange
    };
  }, [hasData, sleep]);
  
  // Memoized calculation of activity data
  const processActivityData = useCallback(() => {
    if (!hasData) return [];
    
    const activityCounts: Record<string, number> = {};
    checkins.forEach(checkin => {
      checkin.input.todayActivities.forEach(activity => {
        activityCounts[activity] = (activityCounts[activity] || 0) + 1;
      });
    });
    
    const activityNames: Record<string, string> = {
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
    
    return Object.entries(activityCounts)
      .map(([name, value]) => ({ 
        name: activityNames[name as keyof typeof activityNames] || name, 
        value 
      }))
      .sort((a, b) => b.value - a.value);
  }, [hasData, checkins]);
  
  // Memoized calculation of emotion data
  const processEmotionData = useCallback(() => {
    if (!hasData) return [];
    
    const emotionCounts: Record<string, number> = {};
    checkins.forEach(checkin => {
      checkin.input.mainEmotions.forEach(emotion => {
        emotionCounts[emotion] = (emotionCounts[emotion] || 0) + 1;
      });
    });
    
    const emotionNames: Record<string, string> = {
      joy: "기쁨",
      sadness: "슬픔",
      anger: "분노",
      anxiety: "불안",
      calmness: "평온",
      gratitude: "감사",
      stress: "스트레스",
      hope: "희망"
    };
    
    return Object.entries(emotionCounts)
      .map(([name, value]) => ({ 
        name: emotionNames[name as keyof typeof emotionNames] || name, 
        value,
        emoji: getEmotionEmoji(name)
      }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 5); // Get top 5 emotions
  }, [hasData, checkins]);
  
  // Memoized calculation of partner data
  const processPartnerData = useCallback(() => {
    if (!hasData) return [];
    
    const partnerCounts: Record<string, number> = {};
    checkins.forEach(checkin => {
      if (checkin.input.conversationPartner && checkin.input.conversationPartner !== "없음") {
        partnerCounts[checkin.input.conversationPartner] = (partnerCounts[checkin.input.conversationPartner] || 0) + 1;
      }
    });
    
    return Object.entries(partnerCounts)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 3); // Get top 3 partners
  }, [hasData, checkins]);

  // Update all stats when data changes
  useEffect(() => {
    if (hasData) {
      // Calculate sleep statistics
      const stats = calculateSleepStats();
      if (stats) {
        setSleepStats(stats);
      }
      
      // Process activity data for donut chart
      setTopActivities(processActivityData());
      
      // Process emotion data for bar chart  
      setTopEmotions(processEmotionData());
      
      // Process conversation partner data
      setTopPartners(processPartnerData());
    }
  }, [hasData, calculateSleepStats, processActivityData, processEmotionData, processPartnerData]);

  useEffect(() => {
    // 첫 로드 시 데이터가 없으면 웰컴 팝업 표시
    if (isInitialized && meals.length === 0 && sleep.length === 0 && checkins.length === 0) {
      // 더 이상 샘플 데이터를 자동 생성하지 않음
      // generateSampleData();
      
      // 대신 새 사용자에게 웰컴 팝업 표시
      setShowWelcomePopup(true);
    }
    
    // 오늘의 요약 데이터 업데이트
    if (isInitialized) {
      setSummary(getTodaySummary());
    }
  }, [isInitialized, meals.length, sleep.length, checkins.length, getTodaySummary]);
  
  const getEmotionEmoji = (emotion: string): string => {
    const emojiMap: Record<string, string> = {
      joy: "😊",
      sadness: "😢",
      anger: "😠",
      anxiety: "😟",
      calmness: "😌",
      gratitude: "🙏",
      stress: "😫",
      hope: "✨",
      other: "✍️"
    };
    return emojiMap[emotion] || "😐";
  };

  // Color arrays for charts - memoized to prevent recreating on each render
  const ACTIVITY_COLORS = useMemo(() => 
    ['#8884d8', '#83a6ed', '#8dd1e1', '#82ca9d', '#a4de6c', '#d0ed57', '#ffc658'], 
  []);
  
  const EMOTION_COLORS = useMemo(() => 
    ['#FF6B6B', '#4ECDC4', '#FFE66D', '#1A535C', '#FF9F1C'], 
  []);
  
  const PARTNER_COLORS = useMemo(() => 
    ['#6C63FF', '#5E72EB', '#FF7F50'], 
  []);
  
  // Handle generating personalized suggestions - optimized with request debouncing
  const handleGenerateSuggestions = useCallback(async () => {
    if (suggestionsGenerated || suggestions.length > 0 || isGeneratingSuggestions) return;
    
    setIsGeneratingSuggestions(true);
    
    // 데이터가 5개 미만이면 안내 메시지 고정
    const totalDataCount = meals.length + sleep.length + checkins.length;
    if (totalDataCount < 5) {
      const msg = ["데이터가 충분하지 않아 생성이 어려워요."];
      setPersonalizedSuggestions(msg);
      setSuggestions(msg); // zustand store에도 저장해 고정시킴
      setSuggestionsGenerated(true);
      setIsGeneratingSuggestions(false);
      return;
    }
    
    try {
      // 사용자 ID 일관성 있게 가져오기
      const userId = getUserId() || 'user_default';
      
      const response = await fetch('/api/suggestions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ uid: userId }),
      });
      const data = await response.json();
      setPersonalizedSuggestions(data.suggestions);
      setSuggestions(data.suggestions); // zustand store에도 저장해 고정시킴
      setSuggestionsGenerated(true);
    } catch (err) {
      console.error('제안 생성 중 오류 발생:', err);
      const fallback = [
        "규칙적인 식사와 충분한 수분 섭취는 에너지 수준을 일정하게 유지하는 데 도움이 됩니다. 하루 8잔의 물을 마시는 것을 목표로 해보세요.",
        "하루 10분씩 명상이나 깊은 호흡 연습을 통해 스트레스 수준을 관리해보세요. 단순한 기법이지만 정신 건강에 큰 영향을 줄 수 있습니다.",
        "주 3회, 30분 이상의 유산소 운동은 기분과 수면의 질을 향상시키는 데 효과적입니다. 걷기부터 시작해보세요."
      ];
      setPersonalizedSuggestions(fallback);
      setSuggestions(fallback);
      setSuggestionsGenerated(true);
    } finally {
      setIsGeneratingSuggestions(false);
    }
  }, [suggestionsGenerated, suggestions.length, meals.length, sleep.length, checkins.length, setSuggestions, isGeneratingSuggestions, getUserId]);

  // 새로고침 함수 최적화 (중복 요청 방지)
  const refreshData = useCallback(async () => {
    // 이미 로딩 중이면 중복 요청 방지
    if (isRefreshing || isLoading) {
      console.log('이미 데이터 새로고침 중, 중복 요청 방지');
      return;
    }
    
    try {
      setIsRefreshing(true);
      
      // 신뢰할 수 있는 사용자 ID 가져오기
      const userId = getUserId() || 'user_default';
      console.log(`대시보드 - ${userId} 사용자 데이터 새로고침 시작`);
      
      // syncData 메서드 사용해 데이터 새로고침
      await syncData(userId);
      
      // 통계 데이터 업데이트
      const todaySummary = getTodaySummary();
      setSummary(todaySummary);
      
      // 차트 데이터 다시 처리
      const stats = calculateSleepStats();
      if (stats) {
        setSleepStats(stats);
      }
      
      setTopActivities(processActivityData());
      setTopEmotions(processEmotionData());
      setTopPartners(processPartnerData());
      
      console.log('서버에서 데이터 동기화 성공');
      
      // 새로고침 상태 해제
      setIsRefreshing(false);
    } catch (err) {
      console.error('데이터 새로고침 중 오류 발생:', err);
      setIsRefreshing(false);
    }
  }, [
    isRefreshing,
    isLoading,
    syncData,
    getTodaySummary,
    calculateSleepStats,
    processActivityData,
    processEmotionData,
    processPartnerData,
    getUserId
  ]);

  // 라우트 변경 시 자동 데이터 동기화
  useEffect(() => {
    // 이미 데이터가 있으면 중복 동기화 방지
    if (isInitialized && hasData) {
      console.log('대시보드 - 이미 데이터가 있어 동기화 생략');
      return;
    }
    
    // 이미 동기화 중이면 중복 호출 방지
    if (isLoading || isRefreshing) {
      console.log('대시보드 - 이미 데이터 동기화 중, 중복 요청 방지');
      return;
    }
    
    // 데이터 동기화 수행
    console.log('대시보드 페이지 로드 - 데이터 동기화 시작');
    setIsRefreshing(true);
    
    // 신뢰할 수 있는 사용자 ID 가져오기
    const userId = getUserId() || 'user_default';
    
    // syncData 호출
    syncData(userId)
      .then((success) => {
        console.log(`대시보드 데이터 동기화 ${success ? '성공' : '일부 실패'}`);
        setIsRefreshing(false);
      })
      .catch(err => {
        console.error('대시보드 데이터 동기화 실패:', err);
        setIsRefreshing(false);
      });
  }, [isInitialized, hasData, pathname, isLoading, isRefreshing, syncData, getUserId]);

  // suggestions가 zustand store에 있으면 항상 그 값을 보여주고, 없을 때만 생성 버튼 노출
  useEffect(() => {
    if (suggestions && suggestions.length > 0) {
      setPersonalizedSuggestions(suggestions);
      setSuggestionsGenerated(true);
    }
  }, [suggestions]);

  // 페이지 로딩 시 세션 상태 강제 확인 및 데이터 동기화
  /* eslint-disable react-hooks/exhaustive-deps */
  useEffect(() => {
    const initPage = async () => {
      setIsRefreshing(true);
      console.log('[Dashboard] 페이지 초기화 시작, 세션 확인 중...');
      
      try {
        // 세션 강제 갱신
        await refreshSession();
        
        // 데이터 동기화
        const userId = getUserId();
        console.log('[Dashboard] 사용자 ID:', userId);
        
        if (userId) {
          await syncData(userId);
        }
        
        console.log('[Dashboard] 페이지 초기화 완료');
      } catch (error) {
        console.error('[Dashboard] 초기화 중 오류 발생:', error);
        // 오류가 발생해도 페이지 로딩은 계속 진행
      } finally {
        setIsRefreshing(false);
      }
    };
    
    initPage();
    // Only run this effect once when the component mounts
  }, []);
  /* eslint-enable react-hooks/exhaustive-deps */

  if (!isInitialized || isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        <p className="ml-4 text-muted-foreground">대시보드 불러오는 중...</p>
      </div>
    );
  }

  const hasAnyData = meals.length > 0 || sleep.length > 0 || checkins.length > 0;

  // 샘플 데이터 생성 함수 - 사용자가 직접 샘플 데이터 생성 버튼을 눌렀을 때만 호출
  const handleGenerateSampleData = () => {
    generateSampleData();
    setShowWelcomePopup(false);
  };

  // 첫 기록 생성 페이지로 이동
  const handleCreateFirstEntry = () => {
    setShowWelcomePopup(false);
    // '/log-activity' 페이지로 리다이렉트는 컴포넌트 내에서 처리됨
  };

  return (
    <div className="container mx-auto pt-6 pb-12 px-4">
      {/* 신규 사용자 환영 메시지 */}
      {showWelcomePopup && (
        <div className="mb-8 bg-primary/10 border border-primary/20 rounded-lg p-6 shadow-md animate-fadeIn">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div>
              <h2 className="text-xl font-bold text-primary mb-2">환영합니다! 👋</h2>
              <p className="text-muted-foreground mb-4">
                더나일체크에 가입해주셔서 감사합니다. 첫 번째 활동을 기록하고 웰빙 데이터를 관리해보세요.
              </p>
            </div>
            <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
              <Link href="/log-activity" className="flex-1 md:flex-auto">
                <Button onClick={handleCreateFirstEntry} className="w-full">
                  <ListPlus className="mr-2 h-4 w-4" /> 첫 기록 생성하기
                </Button>
              </Link>
              <Button 
                variant="outline" 
                className="flex-1 md:flex-auto" 
                onClick={handleGenerateSampleData}
              >
                <Info className="mr-2 h-4 w-4" /> 샘플 데이터 보기
              </Button>
            </div>
          </div>
        </div>
      )}

      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8">
        <h1 className="text-3xl font-bold text-primary mb-4 md:mb-0">대시보드</h1>
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            size="sm" 
            className="flex items-center gap-1"
            onClick={refreshData}
            disabled={isRefreshing}
          >
            <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
            {isRefreshing ? '새로고침 중...' : '데이터 새로고침'}
          </Button>
        </div>
      </div>

      {hasAnyData && (
        <>
          <Card className="mb-8 shadow-md hover:shadow-lg transition-shadow">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-xl">
                <ListPlus className="text-primary h-5 w-5" /> 나의 활동기록을 남겨보세요
              </CardTitle>
              <CardDescription>
                기록을 추가하거나 업데이트하고 웰빙 체크인을 할 수 있습니다.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Link href="/log-activity" className="block w-full">
                <Button variant="default" className="w-full">
                  <ListPlus className="mr-2 h-4 w-4" /> 활동 로그 및 체크인으로 이동
                </Button>
              </Link>
            </CardContent>
          </Card>

          <Card className="mb-8 shadow-md hover:shadow-lg transition-shadow bg-gradient-to-r from-blue-50 to-indigo-50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-xl">
                <Lightbulb className="text-amber-500 h-5 w-5" /> 이번 주 맞춤형 제안
              </CardTitle>
              <CardDescription>
                기록된 데이터를 바탕으로 한 개인화된 웰니스 제안입니다.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {personalizedSuggestions.length === 0 ? (
                <div className="flex flex-col items-center justify-center p-6">
                  <p className="text-muted-foreground mb-4 text-center">
                    데이터를 분석하여 맞춤형 웰니스 제안을 생성합니다.
                  </p>
                  <Button 
                    onClick={handleGenerateSuggestions}
                    disabled={isGeneratingSuggestions}
                    className="bg-amber-500 hover:bg-amber-600"
                  >
                    {isGeneratingSuggestions ? (
                      <>
                        <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                        생성 중...
                      </>
                    ) : (
                      <>
                        <Lightbulb className="mr-2 h-4 w-4" />
                        제안 생성하기
                      </>
                    )}
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  {personalizedSuggestions.map((suggestion, index) => (
                    <div key={index} className="flex items-start gap-3 bg-white p-3 rounded-lg shadow-sm">
                      <div className="mt-1 text-amber-500 bg-amber-50 rounded-full p-1.5 h-7 w-7 flex items-center justify-center text-xs">
                        {index + 1}
                      </div>
                      <p className="text-sm">{suggestion}</p>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}

      {!hasAnyData && (
        <Card className="mb-8 bg-blue-50 border-blue-200 shadow-md">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-blue-700"><Info className="h-5 w-5"/> 더나일체크에 오신 것을 환영합니다!</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-blue-600 mb-4">
              더나일체크는 건강한 생활 습관을 기록하고 분석하여 웰니스 여정을 지원합니다. 식사, 수면 및 정서 상태를 추적할 수 있습니다.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Link href="/log-activity">
                <Button variant="default" className="w-full">첫 활동 기록하기</Button>
              </Link>
              <Link href="/mypage">
                <Button variant="outline" className="w-full border-blue-300 hover:bg-blue-100 text-blue-700">내 정보 확인하기</Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      )}
      
      {/* Charts Section */}
      <div className="grid gap-6 md:grid-cols-1 lg:grid-cols-2 mb-8">
        <Card className="shadow-md">
          <CardHeader>
            <CardTitle>수면 시간 차트</CardTitle>
            <CardDescription>지난 주 대비 평균 수면 시간</CardDescription>
          </CardHeader>
          <CardContent className="h-80 flex items-center justify-center">
            {sleep.length > 0 ? (
              <div className="w-full h-full flex flex-col justify-center items-center">
                <div className="text-center mb-4">
                  <div className="text-4xl font-bold text-primary">
                    {sleepStats.averageSleepHours.toFixed(1)} 시간
                  </div>
                  <div className="text-sm text-muted-foreground">평균 수면 시간</div>
                </div>
                
                <div className="flex items-center justify-center gap-6 mt-4">
                  <div className="text-center">
                    <div className="text-lg font-semibold">지난주</div>
                    <div className="text-2xl">{sleepStats.lastWeekAverage.toFixed(1)} 시간</div>
                  </div>
                  
                  <div className="flex items-center gap-1">
                    {sleepStats.percentChange > 0 ? (
                      <>
                        <TrendingUp className="h-6 w-6 text-green-500" />
                        <span className="text-green-500 font-medium">+{sleepStats.percentChange.toFixed(1)}%</span>
                      </>
                    ) : sleepStats.percentChange < 0 ? (
                      <>
                        <TrendingDown className="h-6 w-6 text-red-500" />
                        <span className="text-red-500 font-medium">{sleepStats.percentChange.toFixed(1)}%</span>
                      </>
                    ) : (
                      <>
                        <Minus className="h-6 w-6 text-gray-500" />
                        <span className="text-gray-500 font-medium">변화 없음</span>
                      </>
                    )}
                  </div>
                </div>
                
                <div className="mt-8 w-full h-32">
                  <div className="relative w-full h-full">
                    <div className="absolute inset-0 bg-gradient-to-r from-blue-100 to-indigo-100 rounded-lg"></div>
                    <div className="absolute inset-0 flex items-center justify-center">
                      <BedDouble className="h-16 w-16 text-blue-500 opacity-30" />
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <p className="text-muted-foreground">데이터가 충분하지 않습니다.</p>
            )}
          </CardContent>
        </Card>
        
        <Card className="shadow-md">
          <CardHeader>
            <CardTitle>활동 내역</CardTitle>
            <CardDescription>참여한 활동 유형 분석</CardDescription>
          </CardHeader>
          <CardContent className="h-80 flex items-center justify-center">
            {topActivities.length > 0 ? (
              <div className="w-full h-full">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={topActivities}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={90}
                      paddingAngle={5}
                      dataKey="value"
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    >
                      {topActivities.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={ACTIVITY_COLORS[index % ACTIVITY_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value) => [`${value}회`, '빈도']} />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <p className="text-muted-foreground">데이터가 충분하지 않습니다.</p>
            )}
          </CardContent>
        </Card>
      </div>
      
      <div className="grid gap-6 md:grid-cols-1 lg:grid-cols-2 mb-8">
        <Card className="shadow-md">
          <CardHeader>
            <CardTitle>감정 빈도</CardTitle>
            <CardDescription>가장 많이 표현된 감정 TOP 5</CardDescription>
          </CardHeader>
          <CardContent className="h-80 flex items-center justify-center">
            {topEmotions.length > 0 ? (
              <div className="w-full h-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={topEmotions}
                    layout="vertical"
                    margin={{ top: 5, right: 30, left: 40, bottom: 5 }}
                  >
                    <XAxis type="number" />
                    <YAxis 
                      type="category" 
                      dataKey="name" 
                      tick={(props) => {
                        const { x, y, payload } = props;
                        const emotion = topEmotions.find(e => e.name === payload.value);
                        return (
                          <g transform={`translate(${x},${y})`}>
                            <text x={-30} y={4} textAnchor="end" fill="#666">
                              {emotion?.emoji} {payload.value}
                            </text>
                          </g>
                        );
                      }}
                    />
                    <Tooltip 
                      formatter={(value) => [`${value}회`, '빈도']}
                    />
                    <Bar dataKey="value" radius={[0, 6, 6, 0]}>
                      {topEmotions.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={EMOTION_COLORS[index % EMOTION_COLORS.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <p className="text-muted-foreground">데이터가 충분하지 않습니다.</p>
            )}
          </CardContent>
        </Card>
        
        <Card className="shadow-md">
          <CardHeader>
            <CardTitle>대화 파트너</CardTitle>
            <CardDescription>가장 많이 대화한 상대 TOP 3</CardDescription>
          </CardHeader>
          <CardContent className="h-80 flex items-center justify-center">
            {topPartners.length > 0 ? (
              <div className="w-full h-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={topPartners}
                    margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                  >
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip formatter={(value) => [`${value}회`, '빈도']} />
                    <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                      {topPartners.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={PARTNER_COLORS[index % PARTNER_COLORS.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <p className="text-muted-foreground">데이터가 충분하지 않습니다.</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Today's Summary Section */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 mb-8">
        <Card className="shadow-md hover:shadow-lg transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">오늘의 수면</CardTitle>
            <BedDouble className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summary.todaySleepHours.toFixed(1)} 시간</div>
            <p className="text-xs text-muted-foreground">오늘 기록된 수면 시간입니다.</p>
          </CardContent>
        </Card>
        <Card className="shadow-md hover:shadow-lg transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">오늘 먹은 식사</CardTitle>
            <Utensils className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summary.todayMealsLogged}</div>
            <p className="text-xs text-muted-foreground">오늘 기록된 식사 횟수입니다.</p>
          </CardContent>
        </Card>
        <Card className="shadow-md hover:shadow-lg transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">오늘의 활동</CardTitle>
            <ListPlus className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summary.todayActivitiesLogged}</div>
            <p className="text-xs text-muted-foreground">오늘 기록된 활동 수입니다.</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
} 