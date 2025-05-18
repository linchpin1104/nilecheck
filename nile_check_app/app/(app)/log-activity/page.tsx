"use client";

import { useState, useEffect } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Utensils, BedDouble, HeartPulse, Droplets, Check, X, Moon, MessageSquare, Smile, Coffee, FileText, ArrowLeft, Users2, Edit, Save, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Slider } from "@/components/ui/slider";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { WeeklyCalendar } from "@/components/weekly-calendar";
import Link from "next/link";
import { format, isFuture, isSameDay, parseISO } from "date-fns";
import { useAppStore } from "@/lib/store";
import { MealEntry, SleepEntry, WellbeingCheckinRecord } from "@/lib/store";
import { useAuthStore } from "@/lib/auth";

export default function LogActivityPage() {
  const { 
    getMealsOnDate, 
    getSleepEntryForNightOf, 
    getCheckinForDate,
    addMeal,
    addSleepEntry,
    addCheckin,
    syncData
  } = useAppStore();

  const { currentUser: user, isAuthenticated } = useAuthStore();
  const [isRefreshing, setIsRefreshing] = useState(false);

  // 페이지 진입 시 Firebase에서 데이터 동기화
  useEffect(() => {
    if (isAuthenticated && user) {
      console.log(`[LogActivity] 사용자 데이터 동기화 시작 - 사용자 ID: ${user.id}`);
      setIsRefreshing(true);
      syncData(user.id).then((success) => {
        if (success) {
          console.log('[LogActivity] 데이터 동기화 완료');
        } else {
          console.error('[LogActivity] 데이터 동기화 실패');
        }
        setIsRefreshing(false);
      });
    }
  }, [isAuthenticated, user, syncData]);

  const [selectedDate, setSelectedDate] = useState(new Date());
  const [selectedMealType, setSelectedMealType] = useState<string | null>(null);
  const [mealStatus, setMealStatus] = useState<"eaten" | "skipped" | null>(null);
  const [foodTypes, setFoodTypes] = useState({
    rice: false,
    vegetables: false,
    fruits: false,
    meat: false,
    fish: false,
    dairy: false,
    snack: false,
    fastFood: false
  });
  const [waterIntake, setWaterIntake] = useState(1.0);
  const [didDrinkWater, setDidDrinkWater] = useState<boolean | null>(null);
  
  // Sleep tracking
  const [bedtime, setBedtime] = useState("22:00");
  const [sleepDuration, setSleepDuration] = useState("8.0");
  const [sleepQuality, setSleepQuality] = useState<number>(3);
  const [wokeUpDuringNight, setWokeUpDuringNight] = useState(false);
  const [wakeUpCount, setWakeUpCount] = useState(0);
  
  // Check-in tracking
  const [stressLevel, setStressLevel] = useState(5);
  const [selectedEmotions, setSelectedEmotions] = useState<string[]>([]);
  const [otherEmotionText, setOtherEmotionText] = useState("");
  const [todayActivities, setTodayActivities] = useState<string[]>([]);
  const [conversationPartner, setConversationPartner] = useState<string | null>(null);
  const [spouseConversationTopics, setSpouseConversationTopics] = useState<string[]>([]);
  const [otherSpouseTopicText, setOtherSpouseTopicText] = useState("");

  // Edit mode flags
  const [sleepEditMode, setSleepEditMode] = useState(false);
  const [checkinEditMode, setCheckinEditMode] = useState(false);
  
  // Store current date data
  const [dateRecord, setDateRecord] = useState<{
    meals: MealEntry[];
    sleep?: SleepEntry;
    checkin?: WellbeingCheckinRecord;
  }>({
    meals: [],
  });

  // Fetch data for selected date
  useEffect(() => {
    const dateStr = format(selectedDate, 'yyyy-MM-dd');
    const dateMeals = getMealsOnDate(dateStr);
    const dateSleep = getSleepEntryForNightOf(dateStr);
    const dateCheckin = getCheckinForDate(dateStr);
    
    setDateRecord({
      meals: dateMeals,
      sleep: dateSleep,
      checkin: dateCheckin
    });

    // Reset edit modes when changing date
    setSleepEditMode(false);
    setCheckinEditMode(false);
    
    // Initialize form with existing data or reset if none
    if (dateSleep) {
      // Calculate bedtime from startTime
      const startTime = new Date(dateSleep.startTime);
      setBedtime(`${startTime.getHours().toString().padStart(2, '0')}:${startTime.getMinutes().toString().padStart(2, '0')}`);
      
      // Calculate sleep duration
      const sleepHours = (new Date(dateSleep.endTime).getTime() - startTime.getTime()) / (1000 * 60 * 60);
      setSleepDuration(sleepHours.toFixed(1));
      
      setSleepQuality(dateSleep.quality);
      setWokeUpDuringNight(dateSleep.wokeUpDuringNight);
      setWakeUpCount(dateSleep.wakeUpCount);
    } else {
      // Reset sleep form
      setBedtime("22:00");
      setSleepDuration("8.0");
      setSleepQuality(3);
      setWokeUpDuringNight(false);
      setWakeUpCount(0);
    }
    
    if (dateCheckin) {
      setStressLevel(dateCheckin.input.stressLevel);
      setSelectedEmotions(dateCheckin.input.mainEmotions);
      setOtherEmotionText(dateCheckin.input.otherEmotionDetail || "");
      setTodayActivities(dateCheckin.input.todayActivities);
      setConversationPartner(dateCheckin.input.conversationPartner || null);
      setSpouseConversationTopics(dateCheckin.input.spouseConversationTopics || []);
      setOtherSpouseTopicText(dateCheckin.input.otherSpouseTopicDetail || "");
    } else {
      // Reset checkin form
      setStressLevel(5);
      setSelectedEmotions([]);
      setOtherEmotionText("");
      setTodayActivities([]);
      setConversationPartner(null);
      setSpouseConversationTopics([]);
      setOtherSpouseTopicText("");
    }
    
    // Reset meal selection when date changes
    setSelectedMealType(null);
    setMealStatus(null);
    setFoodTypes({
      rice: false,
      vegetables: false,
      fruits: false,
      meat: false,
      fish: false,
      dairy: false,
      snack: false,
      fastFood: false
    });
    setWaterIntake(1.0);
    setDidDrinkWater(null);
    
  }, [selectedDate, getMealsOnDate, getSleepEntryForNightOf, getCheckinForDate]);

  // Save sleep data
  const handleSaveSleep = () => {
    // Check authentication
    if (!useAuthStore.getState().isAuthenticated) {
      // Redirect to login page
      window.location.href = `/login?callbackUrl=${encodeURIComponent(window.location.pathname)}`;
      return;
    }
    
    const dateStr = format(selectedDate, 'yyyy-MM-dd');
    
    // Create start time from bedtime
    const [hours, minutes] = bedtime.split(':').map(n => parseInt(n));
    const startTime = new Date(selectedDate);
    startTime.setHours(hours, minutes, 0, 0);
    
    // If bedtime is PM (after noon), and we're creating the record for "today",
    // the actual sleep start time might be from yesterday
    if (hours < 12 && !isSameDay(selectedDate, new Date())) {
      startTime.setDate(startTime.getDate() - 1);
    }
    
    // Create end time from duration
    const durationHours = parseFloat(sleepDuration);
    const endTime = new Date(startTime);
    endTime.setTime(startTime.getTime() + durationHours * 60 * 60 * 1000);
    
    const sleepEntry: Omit<SleepEntry, 'id'> = {
      startTime: startTime.toISOString(),
      endTime: endTime.toISOString(),
      quality: sleepQuality as 1 | 2 | 3 | 4 | 5,
      wokeUpDuringNight,
      wakeUpCount,
      date: dateStr
    };
    
    addSleepEntry(sleepEntry);
    setSleepEditMode(false);
  };

  // Save checkin data
  const handleSaveCheckin = () => {
    // Check authentication
    if (!useAuthStore.getState().isAuthenticated) {
      // Redirect to login page
      window.location.href = `/login?callbackUrl=${encodeURIComponent(window.location.pathname)}`;
      return;
    }
    
    const checkinInput = {
      stressLevel,
      mainEmotions: selectedEmotions,
      otherEmotionDetail: otherEmotionText,
      todayActivities,
      conversationPartner,
      spouseConversationTopics,
      otherSpouseTopicDetail: otherSpouseTopicText,
    };
    
    addCheckin(checkinInput, selectedDate);
    setCheckinEditMode(false);
  };

  // Save meal data
  const handleSaveMeal = () => {
    // Check authentication
    if (!useAuthStore.getState().isAuthenticated) {
      // Redirect to login page
      window.location.href = `/login?callbackUrl=${encodeURIComponent(window.location.pathname)}`;
      return;
    }
    
    if (!selectedMealType || !mealStatus) return;
    
    const mealTime = new Date(selectedDate);
    
    // Set appropriate hours based on meal type
    switch (selectedMealType) {
      case 'breakfast':
        mealTime.setHours(8, 0, 0, 0);
        break;
      case 'lunch':
        mealTime.setHours(13, 0, 0, 0);
        break;
      case 'dinner':
        mealTime.setHours(19, 0, 0, 0);
        break;
      case 'snack':
        mealTime.setHours(15, 30, 0, 0);
        break;
    }
    
    const selectedFoodTypes = Object.entries(foodTypes)
      .filter(([, selected]) => selected)
      .map(([type]) => type);
    
    const meal: Omit<MealEntry, 'id'> = {
      type: selectedMealType as 'breakfast' | 'lunch' | 'dinner' | 'snack',
      status: mealStatus,
      dateTime: mealTime.toISOString(),
      waterIntake: didDrinkWater ? waterIntake : undefined,
      foodTypes: selectedFoodTypes.length > 0 ? selectedFoodTypes : undefined,
    };
    
    addMeal(meal);
    setSelectedMealType(null);
    setMealStatus(null);
    resetMealForm();
  };
  
  const emotionOptions = [
    { value: "joy", emoji: "😊", label: "기쁨" },
    { value: "sadness", emoji: "😢", label: "슬픔" },
    { value: "anger", emoji: "😠", label: "분노" },
    { value: "anxiety", emoji: "😟", label: "불안" },
    { value: "calmness", emoji: "😌", label: "평온" },
    { value: "gratitude", emoji: "🙏", label: "감사" },
    { value: "stress", emoji: "😫", label: "스트레스" },
    { value: "hope", emoji: "✨", label: "희망" },
    { value: "other", emoji: "✍️", label: "기타" }
  ];
  
  const activityOptions = [
    { key: "exercise", emoji: "🏃‍♀️", label: "운동" },
    { key: "relaxation", emoji: "🧘", label: "휴식" },
    { key: "hobbies", emoji: "🎨", label: "취미" },
    { key: "socializing", emoji: "💬", label: "사교 활동" },
    { key: "householdChores", emoji: "🧹", label: "집안일" },
    { key: "workStudy", emoji: "💼", label: "업무/학업" },
    { key: "selfCare", emoji: "💅", label: "자기 관리" },
    { key: "outdoors", emoji: "🌳", label: "야외 활동" },
    { key: "errands", emoji: "🛒", label: "용무" },
    { key: "other", emoji: "✍️", label: "기타 활동" }
  ];
  
  const spouseTopicOptions = [
    { key: "everyday", label: "일상적인 대화" },
    { key: "children", label: "자녀 이야기" },
    { key: "concerns", label: "힘든 점/고민" },
    { key: "future", label: "미래 계획" },
    { key: "finance", label: "재정/경제" },
    { key: "hobby", label: "취미/여가" },
    { key: "other", label: "기타 주제" }
  ];
  
  // Generate time options in 30-minute increments
  const generateTimeOptions = () => {
    const options = [];
    for (let hour = 0; hour < 24; hour++) {
      for (let min = 0; min < 60; min += 30) {
        const hourString = hour.toString().padStart(2, '0');
        const minString = min.toString().padStart(2, '0');
        options.push(`${hourString}:${minString}`);
      }
    }
    return options;
  };
  
  // Generate sleep duration options in 30-minute increments
  const generateDurationOptions = () => {
    const options = [];
    for (let hour = 0; hour <= 12; hour++) {
      for (let halfHour = 0; halfHour < 2; halfHour++) {
        const value = hour + (halfHour * 0.5);
        options.push(value.toFixed(1));
      }
    }
    return options;
  };
  
  const handleFoodTypeChange = (type: keyof typeof foodTypes) => {
    setFoodTypes(prev => ({
      ...prev,
      [type]: !prev[type]
    }));
  };
  
  const resetMealForm = () => {
    setMealStatus(null);
    setFoodTypes({
      rice: false,
      vegetables: false,
      fruits: false,
      meat: false,
      fish: false,
      dairy: false,
      snack: false,
      fastFood: false
    });
  };
  
  const handleEmotionSelect = (emotion: string) => {
    if (selectedEmotions.includes(emotion)) {
      setSelectedEmotions(prev => prev.filter(e => e !== emotion));
      if (emotion === "other") {
        setOtherEmotionText("");
      }
    } else {
      if (selectedEmotions.length < 3) {
        setSelectedEmotions(prev => [...prev, emotion]);
      }
    }
  };
  
  const handleActivityToggle = (activity: string) => {
    setTodayActivities(prev => 
      prev.includes(activity) 
        ? prev.filter(a => a !== activity) 
        : [...prev, activity]
    );
  };
  
  const handleSpouseTopicToggle = (topic: string) => {
    setSpouseConversationTopics(prev => 
      prev.includes(topic) 
        ? prev.filter(t => t !== topic) 
        : [...prev, topic]
    );
    
    if (topic === "other" && spouseConversationTopics.includes("other")) {
      setOtherSpouseTopicText("");
    }
  };
  
  // 미래 날짜 체크 함수 추가
  const isFutureDate = (date: Date) => {
    return isFuture(date);
  };
  
  // 새로고침 버튼 핸들러 추가
  const handleRefreshData = async () => {
    if (!isAuthenticated || !user) return;
    
    try {
      setIsRefreshing(true);
      console.log(`[LogActivity] 수동 데이터 새로고침 시작 - 사용자 ID: ${user.id}`);
      
      const success = await syncData(user.id);
      
      if (success) {
        console.log('[LogActivity] 데이터 새로고침 성공');
        // 선택된 날짜 데이터 다시 불러오기
        const dateStr = format(selectedDate, 'yyyy-MM-dd');
        const dateMeals = getMealsOnDate(dateStr);
        const dateSleep = getSleepEntryForNightOf(dateStr);
        const dateCheckin = getCheckinForDate(dateStr);
        
        setDateRecord({
          meals: dateMeals,
          sleep: dateSleep,
          checkin: dateCheckin
        });
      }
      
      setTimeout(() => {
        setIsRefreshing(false);
      }, 600);
    } catch (error) {
      console.error('[LogActivity] 데이터 새로고침 중 오류:', error);
      setIsRefreshing(false);
    }
  };

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-primary">활동 기록</h1>
        <Button asChild variant="outline">
          <Link href="/dashboard">
            <ArrowLeft className="mr-2 h-4 w-4" />
            대시보드로 돌아가기
          </Link>
        </Button>
      </div>
      
      <div className="text-muted-foreground mb-8">
        캘린더를 사용하여 식사 또는 수면 기록 날짜를 선택하세요. 웰빙 체크인은 현재 상태를 위한 것입니다.
      </div>
      
      {/* 날짜 선택 영역 - WeeklyCalendar 사용 */}
      <WeeklyCalendar 
        selectedDate={selectedDate} 
        onDateSelect={setSelectedDate} 
      />
      
      {/* 새로고침 버튼 추가 */}
      <div className="flex justify-end mb-4">
        <Button 
          variant="outline" 
          size="sm" 
          onClick={handleRefreshData} 
          disabled={isRefreshing || !isAuthenticated}
          className="flex items-center"
        >
          <RefreshCw className={`mr-2 h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
          {isRefreshing ? '동기화 중...' : '데이터 새로고침'}
        </Button>
      </div>
      
      {/* 일일 요약 카드 */}
      <Card className="mb-8 shadow-md">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-xl">
            <FileText className="text-primary h-5 w-5" /> 
            {format(selectedDate, "yyyy. M. d.")} 기록 요약
          </CardTitle>
          <CardDescription>
            {format(selectedDate, "yyyy. M. d.")}의 기록된 식사, 수면 및 체크인 요약입니다.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isFutureDate(selectedDate) ? (
            <p className="text-center text-muted-foreground py-6">미래 날짜에는 데이터가 없습니다.</p>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="space-y-3">
                <h4 className="text-lg font-semibold text-primary flex items-center gap-2">
                  <Coffee size={18}/> 식사 기록
                </h4>
                <div className="space-y-2">
                  {dateRecord.meals.length > 0 ? (
                    dateRecord.meals.map((meal) => (
                      <div key={meal.id} className="p-3 border rounded-lg bg-background hover:shadow-md transition-shadow">
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-semibold text-sm">
                            {meal.type === 'breakfast' ? '아침' : 
                             meal.type === 'lunch' ? '점심' : 
                             meal.type === 'dinner' ? '저녁' : '간식'}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {format(parseISO(meal.dateTime), "HH:mm")}
                          </span>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {meal.status === 'eaten' ? '식사함' : '식사 건너뜀'}{meal.description && `: ${meal.description}`}
                        </p>
                        {meal.quality && (
                          <p className="text-xs text-muted-foreground">
                            품질: <span className="font-medium">
                            {meal.quality === 'very_poor' ? '매우 나쁨' :
                             meal.quality === 'poor' ? '나쁨' :
                             meal.quality === 'average' ? '보통' :
                             meal.quality === 'good' ? '좋음' : '매우 좋음'}
                          </span>
                          </p>
                        )}
                      </div>
                    ))
                  ) : (
                    <p className="text-sm text-muted-foreground">기록된 식사가 없습니다.</p>
                  )}
                </div>
              </div>
              
              <div className="space-y-3">
                <h4 className="text-lg font-semibold text-primary flex items-center gap-2">
                  <Moon size={18}/> 수면 기록
                </h4>
                {dateRecord.sleep ? (
                  <div className="p-3 border rounded-lg bg-background hover:shadow-md transition-shadow">
                    <p className="text-sm text-muted-foreground">
                      수면 시간: <span className="font-medium">
                        {((new Date(dateRecord.sleep.endTime).getTime() - new Date(dateRecord.sleep.startTime).getTime()) / (1000 * 60 * 60)).toFixed(1)}시간
                      </span>
                    </p>
                    <p className="text-xs text-muted-foreground">
                      수면 품질: <span className="font-medium">
                        {dateRecord.sleep.quality === 1 ? '매우 나쁨' :
                         dateRecord.sleep.quality === 2 ? '나쁨' :
                         dateRecord.sleep.quality === 3 ? '보통' :
                         dateRecord.sleep.quality === 4 ? '좋음' : '매우 좋음'}
                      </span>
                    </p>
                    <p className="text-xs text-muted-foreground">
                      깬 횟수: <span className="font-medium">{dateRecord.sleep.wakeUpCount}회</span>
                    </p>
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">기록된 수면이 없습니다.</p>
                )}
              </div>
              
              <div className="space-y-3">
                <h4 className="text-lg font-semibold text-primary flex items-center gap-2">
                  <MessageSquare size={18}/> 체크인
                </h4>
                {dateRecord.checkin ? (
                  <div className="p-3 border rounded-lg bg-background hover:shadow-md transition-shadow">
                    <div className="flex items-center mb-2">
                      <HeartPulse className="w-4 h-4 mr-2 text-yellow-500" />
                      <span className="text-muted-foreground">스트레스 지수: </span>
                      <Badge className="ml-1 bg-secondary text-secondary-foreground">{dateRecord.checkin.input.stressLevel}/10</Badge>
                    </div>
                    <div className="flex items-start">
                      <Smile className="w-4 h-4 mr-2 mt-0.5 text-primary shrink-0" />
                      <span className="text-muted-foreground mr-1">감정: </span>
                      <div className="inline-flex flex-wrap gap-1">
                        {dateRecord.checkin.input.mainEmotions.map(emotion => {
                          const emotionData = emotionOptions.find(e => e.value === emotion);
                          return (
                            <Badge key={emotion} variant="outline" className="py-0.5 px-1.5 text-xs">
                              {emotionData?.label || emotion}
                            </Badge>
                          );
                        })}
                      </div>
                    </div>
                    <div className="flex items-start mt-2">
                      <Coffee className="w-4 h-4 mr-2 mt-0.5 text-primary shrink-0" />
                      <span className="text-muted-foreground mr-1">활동: </span>
                      <div className="inline-flex flex-wrap gap-1">
                        {dateRecord.checkin.input.todayActivities.map(activity => {
                          const activityData = activityOptions.find(a => a.key === activity);
                          return (
                            <Badge key={activity} variant="outline" className="py-0.5 px-1.5 text-xs">
                              {activityData?.label || activity}
                            </Badge>
                          );
                        })}
                      </div>
                    </div>
                    {dateRecord.checkin.input.conversationPartner && dateRecord.checkin.input.conversationPartner !== "없음" && (
                      <div className="flex items-start mt-2">
                        <Users2 className="w-4 h-4 mr-2 mt-0.5 text-primary shrink-0" />
                        <span className="text-muted-foreground mr-1">대화 상대: </span>
                        <Badge variant="outline" className="py-0.5 px-1.5 text-xs">
                          {dateRecord.checkin.input.conversationPartner}
                        </Badge>
                      </div>
                    )}
                    {dateRecord.checkin.input.conversationPartner === "배우자" && 
                      dateRecord.checkin.input.spouseConversationTopics && 
                      dateRecord.checkin.input.spouseConversationTopics.length > 0 && (
                      <div className="flex items-start mt-2 pl-6">
                        <span className="text-muted-foreground mr-1">대화 주제: </span>
                        <div className="inline-flex flex-wrap gap-1">
                          {dateRecord.checkin.input.spouseConversationTopics.map(topic => {
                            const topicData = spouseTopicOptions.find(t => t.key === topic);
                            return (
                              <Badge key={topic} variant="outline" className="py-0.5 px-1.5 text-xs">
                                {topic === "other" && dateRecord.checkin?.input.otherSpouseTopicDetail 
                                  ? `${topicData?.label || topic} (${dateRecord.checkin.input.otherSpouseTopicDetail})` 
                                  : topicData?.label || topic}
                              </Badge>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">기록된 체크인이 없습니다.</p>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
      
      <Tabs defaultValue="meals" className="w-full">
        <TabsList className="grid grid-cols-3 mb-8">
          <TabsTrigger value="meals" className="flex items-center gap-2">
            <Utensils className="h-4 w-4" /> 식사
          </TabsTrigger>
          <TabsTrigger value="sleep" className="flex items-center gap-2">
            <BedDouble className="h-4 w-4" /> 수면
          </TabsTrigger>
          <TabsTrigger value="checkin" className="flex items-center gap-2">
            <HeartPulse className="h-4 w-4" /> 체크인
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="meals">
          {isFutureDate(selectedDate) ? (
            <Card>
              <CardContent className="pt-6 text-center">
                <p className="text-muted-foreground">미래 날짜에는 기록할 수 없습니다.</p>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardHeader>
                <CardTitle>식사 기록</CardTitle>
                <CardDescription>
                  {selectedMealType ? `${
                    selectedMealType === 'breakfast' ? '아침' :
                    selectedMealType === 'lunch' ? '점심' :
                    selectedMealType === 'dinner' ? '저녁' : '간식'
                  } 식사 정보를 기록하세요` : '식사 종류를 선택하세요'}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* 식사 종류 선택 */}
                <div>
                  <h3 className="text-lg font-medium mb-2">식사 종류</h3>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <Button 
                      variant={selectedMealType === "breakfast" ? "default" : "outline"} 
                      className="h-auto py-4 justify-start"
                      onClick={() => {
                        setSelectedMealType("breakfast");
                        resetMealForm();
                      }}
                    >
                      <Utensils className="mr-2 h-4 w-4" /> 아침
                    </Button>
                    <Button 
                      variant={selectedMealType === "lunch" ? "default" : "outline"} 
                      className="h-auto py-4 justify-start"
                      onClick={() => {
                        setSelectedMealType("lunch");
                        resetMealForm();
                      }}
                    >
                      <Utensils className="mr-2 h-4 w-4" /> 점심
                    </Button>
                    <Button 
                      variant={selectedMealType === "dinner" ? "default" : "outline"} 
                      className="h-auto py-4 justify-start"
                      onClick={() => {
                        setSelectedMealType("dinner");
                        resetMealForm();
                      }}
                    >
                      <Utensils className="mr-2 h-4 w-4" /> 저녁
                    </Button>
                    <Button 
                      variant={selectedMealType === "snack" ? "default" : "outline"} 
                      className="h-auto py-4 justify-start"
                      onClick={() => {
                        setSelectedMealType("snack");
                        resetMealForm();
                      }}
                    >
                      <Utensils className="mr-2 h-4 w-4" /> 간식
                    </Button>
                  </div>
                </div>
                
                {selectedMealType && (
                  <>
                    {/* 식사 상태 선택 */}
                    <div className="pt-4 border-t">
                      <h3 className="text-lg font-medium mb-4">식사 여부</h3>
                      <div className="grid grid-cols-2 gap-3">
                        <Button 
                          variant={mealStatus === "eaten" ? "default" : "outline"} 
                          className="flex items-center justify-center h-12"
                          onClick={() => setMealStatus("eaten")}
                        >
                          <Check className="mr-2 h-4 w-4 text-green-500" />
                          식사 했어요
                        </Button>
                        <Button 
                          variant={mealStatus === "skipped" ? "default" : "outline"} 
                          className="flex items-center justify-center h-12"
                          onClick={() => setMealStatus("skipped")}
                        >
                          <X className="mr-2 h-4 w-4 text-red-500" />
                          식사 건너뛰었어요
                        </Button>
                      </div>
                    </div>
                  
                    {mealStatus === "eaten" && (
                      <>
                        {/* 음식 종류 다중 선택 */}
                        <div className="pt-4 border-t">
                          <h3 className="text-lg font-medium mb-3">어떤 음식을 드셨나요? (해당되는 항목 모두 선택)</h3>
                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                            <div className="flex items-center space-x-2">
                              <Checkbox 
                                id="rice" 
                                checked={foodTypes.rice}
                                onCheckedChange={() => handleFoodTypeChange('rice')}
                              />
                              <Label htmlFor="rice">밥/곡류</Label>
                            </div>
                            <div className="flex items-center space-x-2">
                              <Checkbox 
                                id="vegetables" 
                                checked={foodTypes.vegetables}
                                onCheckedChange={() => handleFoodTypeChange('vegetables')}
                              />
                              <Label htmlFor="vegetables">채소류</Label>
                            </div>
                            <div className="flex items-center space-x-2">
                              <Checkbox 
                                id="fruits" 
                                checked={foodTypes.fruits}
                                onCheckedChange={() => handleFoodTypeChange('fruits')}
                              />
                              <Label htmlFor="fruits">과일류</Label>
                            </div>
                            <div className="flex items-center space-x-2">
                              <Checkbox 
                                id="meat" 
                                checked={foodTypes.meat}
                                onCheckedChange={() => handleFoodTypeChange('meat')}
                              />
                              <Label htmlFor="meat">육류</Label>
                            </div>
                            <div className="flex items-center space-x-2">
                              <Checkbox 
                                id="fish" 
                                checked={foodTypes.fish}
                                onCheckedChange={() => handleFoodTypeChange('fish')}
                              />
                              <Label htmlFor="fish">어류/해산물</Label>
                            </div>
                            <div className="flex items-center space-x-2">
                              <Checkbox 
                                id="dairy" 
                                checked={foodTypes.dairy}
                                onCheckedChange={() => handleFoodTypeChange('dairy')}
                              />
                              <Label htmlFor="dairy">유제품</Label>
                            </div>
                            <div className="flex items-center space-x-2">
                              <Checkbox 
                                id="snack" 
                                checked={foodTypes.snack}
                                onCheckedChange={() => handleFoodTypeChange('snack')}
                              />
                              <Label htmlFor="snack">간식/디저트</Label>
                            </div>
                            <div className="flex items-center space-x-2">
                              <Checkbox 
                                id="fastFood" 
                                checked={foodTypes.fastFood}
                                onCheckedChange={() => handleFoodTypeChange('fastFood')}
                              />
                              <Label htmlFor="fastFood">패스트푸드</Label>
                            </div>
                          </div>
                        </div>
                      </>
                    )}
                  </>
                )}
                
                {/* 물 섭취량 */}
                <div className="pt-4 border-t">
                  <h3 className="text-lg font-medium mb-3">물 섭취</h3>
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-3">
                      <Button 
                        variant={didDrinkWater === true ? "default" : "outline"} 
                        className="flex items-center justify-center h-12"
                        onClick={() => setDidDrinkWater(true)}
                      >
                        <Droplets className="mr-2 h-4 w-4 text-blue-500" />
                        물을 마셨어요
                      </Button>
                      <Button 
                        variant={didDrinkWater === false ? "default" : "outline"} 
                        className="flex items-center justify-center h-12"
                        onClick={() => setDidDrinkWater(false)}
                      >
                        <X className="mr-2 h-4 w-4 text-red-500" />
                        물을 안 마셨어요
                      </Button>
                    </div>
                    
                    {didDrinkWater && (
                      <div className="space-y-3">
                        <div className="space-y-1">
                          <div className="flex justify-between">
                            <Label>물 섭취량: {waterIntake.toFixed(1)}L</Label>
                          </div>
                          <Slider
                            value={[waterIntake]}
                            min={0}
                            max={5}
                            step={0.1}
                            onValueChange={(value) => setWaterIntake(value[0])}
                          />
                        </div>
                        <div className="flex justify-between text-xs text-muted-foreground">
                          <span>0L</span>
                          <span>1L</span>
                          <span>2L</span>
                          <span>3L</span>
                          <span>4L</span>
                          <span>5L</span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
                
                {/* 저장 버튼 */}
                <div className="pt-4 flex justify-end">
                  <Button 
                    onClick={handleSaveMeal}
                    disabled={!selectedMealType || !mealStatus}
                  >
                    <Save className="mr-2 h-4 w-4" />
                    저장하기
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>
        
        <TabsContent value="sleep">
          {isFutureDate(selectedDate) ? (
            <Card>
              <CardContent className="pt-6 text-center">
                <p className="text-muted-foreground">미래 날짜에는 기록할 수 없습니다.</p>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Moon className="text-primary h-5 w-5" /> 수면 기록
                  </CardTitle>
                  <CardDescription>수면 시간과 품질을 기록하세요</CardDescription>
                </div>
                
                {dateRecord.sleep && !sleepEditMode && (
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => setSleepEditMode(true)}
                  >
                    <Edit className="h-4 w-4 mr-2" />
                    수정하기
                  </Button>
                )}
              </CardHeader>
              <CardContent>
                {dateRecord.sleep && !sleepEditMode ? (
                  // 조회 모드
                  <div className="space-y-4">
                    <div className="grid gap-4 p-4 rounded-lg border">
                      <div className="grid grid-cols-2 gap-4 items-center">
                        <div>
                          <Label className="text-sm text-muted-foreground">취침 시간</Label>
                          <p className="font-medium">
                            {format(parseISO(dateRecord.sleep.startTime), "HH:mm")}
                          </p>
                        </div>
                        <div>
                          <Label className="text-sm text-muted-foreground">기상 시간</Label>
                          <p className="font-medium">
                            {format(parseISO(dateRecord.sleep.endTime), "HH:mm")}
                          </p>
                        </div>
                      </div>
                      
                      <div>
                        <Label className="text-sm text-muted-foreground">수면 시간</Label>
                        <p className="font-medium">
                          {((new Date(dateRecord.sleep.endTime).getTime() - 
                            new Date(dateRecord.sleep.startTime).getTime()) / 
                            (1000 * 60 * 60)).toFixed(1)} 시간
                        </p>
                      </div>
                      
                      <div>
                        <Label className="text-sm text-muted-foreground">수면 품질</Label>
                        <div className="flex space-x-1 mt-1">
                          {[1, 2, 3, 4, 5].map((rating) => (
                            <div 
                              key={rating} 
                              className={`h-8 w-8 rounded-full flex items-center justify-center text-sm ${
                                rating <= (dateRecord.sleep?.quality || 0)
                                  ? "bg-primary text-primary-foreground" 
                                  : "bg-muted text-muted-foreground"
                              }`}
                            >
                              {rating}
                            </div>
                          ))}
                        </div>
                      </div>
                      
                      <div>
                        <Label className="text-sm text-muted-foreground">수면 중 깬 적이 있나요?</Label>
                        <p className="font-medium">
                          {dateRecord.sleep.wokeUpDuringNight ? '예' : '아니오'}
                          {dateRecord.sleep.wokeUpDuringNight && `, ${dateRecord.sleep.wakeUpCount}회`}
                        </p>
                      </div>
                    </div>
                  </div>
                ) : (
                  // 편집 모드
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <Label className="text-sm font-medium mb-2">취침 시간</Label>
                        <Select value={bedtime} onValueChange={setBedtime}>
                          <SelectTrigger className="w-full">
                            <SelectValue placeholder="취침 시간 선택" />
                          </SelectTrigger>
                          <SelectContent>
                            {generateTimeOptions().map((time) => (
                              <SelectItem key={time} value={time}>
                                {time}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label className="text-sm font-medium mb-2">수면 시간 (시간)</Label>
                        <Select value={sleepDuration} onValueChange={setSleepDuration}>
                          <SelectTrigger className="w-full">
                            <SelectValue placeholder="수면 시간 선택" />
                          </SelectTrigger>
                          <SelectContent>
                            {generateDurationOptions().map((hours) => (
                              <SelectItem key={hours} value={hours}>
                                {hours}시간
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    
                    <div>
                      <Label className="text-sm font-medium mb-2">수면 품질 (1-5)</Label>
                      <div className="flex space-x-2">
                        {[1, 2, 3, 4, 5].map((rating) => (
                          <Button 
                            key={rating} 
                            variant={sleepQuality === rating ? "default" : "outline"} 
                            size="sm" 
                            className="h-10 w-10"
                            onClick={() => setSleepQuality(rating)}
                          >
                            {rating}
                          </Button>
                        ))}
                      </div>
                    </div>
                    
                    <div className="flex flex-row items-center space-x-3 space-y-0 rounded-md border p-3 shadow-sm">
                      <Checkbox
                        id="woke-up"
                        checked={wokeUpDuringNight}
                        onCheckedChange={() => setWokeUpDuringNight(!wokeUpDuringNight)}
                      />
                      <div className="space-y-1 leading-none">
                        <Label htmlFor="woke-up">
                          수면 중 깬 적이 있나요?
                        </Label>
                      </div>
                    </div>
                    
                    {wokeUpDuringNight && (
                      <div>
                        <Label htmlFor="wake-up-count">깬 횟수</Label>
                        <Input 
                          id="wake-up-count"
                          type="number" 
                          placeholder="깬 횟수를 입력하세요"
                          value={wakeUpCount}
                          onChange={(e: React.ChangeEvent<HTMLInputElement>) => setWakeUpCount(parseInt(e.target.value) || 0)}
                          min={0}
                          className="mt-1"
                        />
                      </div>
                    )}
                    
                    <div className="pt-4 flex justify-end gap-2">
                      {dateRecord.sleep && (
                        <Button variant="outline" onClick={() => setSleepEditMode(false)}>
                          취소
                        </Button>
                      )}
                      <Button onClick={handleSaveSleep}>
                        <Save className="mr-2 h-4 w-4" />
                        저장하기
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </TabsContent>
        
        <TabsContent value="checkin">
          {isFutureDate(selectedDate) ? (
            <Card>
              <CardContent className="pt-6 text-center">
                <p className="text-muted-foreground">미래 날짜에는 기록할 수 없습니다.</p>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <HeartPulse className="text-primary h-5 w-5" /> 정서 체크인
                  </CardTitle>
                  <CardDescription>오늘의 정서 상태를 체크인하세요</CardDescription>
                </div>
                
                {dateRecord.checkin && !checkinEditMode && (
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => setCheckinEditMode(true)}
                  >
                    <Edit className="h-4 w-4 mr-2" />
                    수정하기
                  </Button>
                )}
              </CardHeader>
              <CardContent>
                {dateRecord.checkin && !checkinEditMode ? (
                  // 조회 모드
                  <div className="space-y-4 p-4 rounded-lg border">
                    <div>
                      <Label className="text-sm text-muted-foreground">스트레스 수준</Label>
                      <div className="mt-2 bg-slate-100 rounded-full h-2.5">
                        <div 
                          className="bg-primary h-2.5 rounded-full" 
                          style={{ width: `${(dateRecord.checkin.input.stressLevel / 10) * 100}%` }}
                        ></div>
                      </div>
                      <div className="flex justify-between text-xs text-muted-foreground mt-1">
                        <span>낮음 (1)</span>
                        <span>보통 (5)</span>
                        <span>높음 (10)</span>
                      </div>
                    </div>
                    
                    <div>
                      <Label className="text-sm text-muted-foreground mb-1">주요 감정</Label>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {dateRecord.checkin.input.mainEmotions.map(emotion => {
                          const emotionData = emotionOptions.find(e => e.value === emotion);
                          return (
                            <Badge key={emotion} className="py-1 px-2">
                              {emotionData?.emoji} {emotionData?.label || emotion}
                            </Badge>
                          );
                        })}
                      </div>
                    </div>
                    
                    <div>
                      <Label className="text-sm text-muted-foreground mb-1">오늘 한 활동</Label>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {dateRecord.checkin.input.todayActivities.map(activity => {
                          const activityData = activityOptions.find(a => a.key === activity);
                          return (
                            <Badge key={activity} variant="outline" className="py-1 px-2">
                              {activityData?.emoji} {activityData?.label || activity}
                            </Badge>
                          );
                        })}
                      </div>
                    </div>
                    
                    {dateRecord.checkin.input.conversationPartner && (
                      <div>
                        <Label className="text-sm text-muted-foreground mb-1">대화 상대</Label>
                        <p className="font-medium">{dateRecord.checkin.input.conversationPartner}</p>
                        
                        {dateRecord.checkin.input.conversationPartner === "배우자" && 
                          dateRecord.checkin.input.spouseConversationTopics && 
                          dateRecord.checkin.input.spouseConversationTopics.length > 0 && (
                          <div className="mt-2">
                            <Label className="text-sm text-muted-foreground mb-1">대화 주제</Label>
                            <div className="flex flex-wrap gap-1 mt-1">
                              {dateRecord.checkin.input.spouseConversationTopics.map(topic => {
                                const topicData = spouseTopicOptions.find(t => t.key === topic);
                                return (
                                  <Badge key={topic} variant="outline" className="py-0.5 px-1.5">
                                    {topicData?.label || topic}
                                  </Badge>
                                );
                              })}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ) : (
                  // 편집 모드
                  <div className="space-y-6">
                    <div>
                      <Label className="text-sm font-medium mb-3">스트레스 수준 (1-10)</Label>
                      <div className="mt-2">
                        <Slider
                          value={[stressLevel]}
                          min={1}
                          max={10}
                          step={1}
                          onValueChange={(value) => setStressLevel(value[0])}
                          className="mb-2"
                        />
                        <div className="flex justify-between text-xs text-muted-foreground mt-2">
                          <span>낮음 (1)</span>
                          <span>보통 (5)</span>
                          <span>높음 (10)</span>
                        </div>
                      </div>
                    </div>
                    
                    <div>
                      <Label className="text-sm font-medium mb-3">주요 감정 (최대 3개)</Label>
                      <div className="flex flex-wrap gap-2 mt-2">
                        {emotionOptions.map((emotion) => (
                          <Button 
                            key={emotion.value}
                            type="button"
                            variant={selectedEmotions.includes(emotion.value) ? "default" : "outline"}
                            size="sm" 
                            onClick={() => handleEmotionSelect(emotion.value)}
                            className="rounded-full"
                          >
                            {emotion.emoji} <span className="ml-1">{emotion.label}</span>
                          </Button>
                        ))}
                      </div>
                      {selectedEmotions.includes("other") && (
                        <div className="mt-3">
                          <Label htmlFor="other-emotion">기타 감정 상세 설명</Label>
                          <Input
                            id="other-emotion"
                            placeholder="다른 감정을 입력하세요"
                            value={otherEmotionText}
                            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setOtherEmotionText(e.target.value)}
                            className="mt-1"
                          />
                        </div>
                      )}
                    </div>
                    
                    <div>
                      <Label className="text-sm font-medium mb-3">오늘 한 활동</Label>
                      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 mt-2">
                        {activityOptions.map((activity) => (
                          <div 
                            key={activity.key}
                            className="flex flex-row items-start space-x-2 space-y-0 p-2 border rounded-md hover:bg-accent/50 transition-colors"
                          >
                            <Checkbox
                              id={`activity-${activity.key}`}
                              checked={todayActivities.includes(activity.key)}
                              onCheckedChange={() => handleActivityToggle(activity.key)}
                            />
                            <Label htmlFor={`activity-${activity.key}`} className="font-normal cursor-pointer w-full">
                              {activity.emoji} <span className="ml-1">{activity.label}</span>
                            </Label>
                          </div>
                        ))}
                      </div>
                    </div>
                    
                    <div>
                      <Label className="text-sm font-medium mb-3">오늘 대화를 나눈 사람</Label>
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mt-2">
                        <Button
                          variant={conversationPartner === "친구" ? "default" : "outline"}
                          className="justify-start"
                          onClick={() => setConversationPartner("친구")}
                        >
                          친구
                        </Button>
                        <Button
                          variant={conversationPartner === "배우자" ? "default" : "outline"}
                          className="justify-start"
                          onClick={() => setConversationPartner("배우자")}
                        >
                          배우자
                        </Button>
                        <Button
                          variant={conversationPartner === "부모님" ? "default" : "outline"}
                          className="justify-start"
                          onClick={() => setConversationPartner("부모님")}
                        >
                          부모님
                        </Button>
                        <Button
                          variant={conversationPartner === "동료" ? "default" : "outline"}
                          className="justify-start"
                          onClick={() => setConversationPartner("동료")}
                        >
                          동료
                        </Button>
                        <Button
                          variant={conversationPartner === "기타" ? "default" : "outline"}
                          className="justify-start"
                          onClick={() => setConversationPartner("기타")}
                        >
                          기타
                        </Button>
                        <Button
                          variant={conversationPartner === "없음" ? "default" : "outline"}
                          className="justify-start"
                          onClick={() => setConversationPartner("없음")}
                        >
                          없음
                        </Button>
                      </div>
                    </div>
                    
                    {conversationPartner === "배우자" && (
                      <div className="mt-4 border-t pt-4">
                        <Label className="text-sm font-medium mb-3">배우자와 나눈 대화 주제 (여러 개 선택 가능)</Label>
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mt-2">
                          {spouseTopicOptions.map((topic) => (
                            <div 
                              key={topic.key}
                              className="flex flex-row items-start space-x-2 space-y-0 p-2 border rounded-md hover:bg-accent/50 transition-colors"
                            >
                              <Checkbox
                                id={`spouse-topic-${topic.key}`}
                                checked={spouseConversationTopics.includes(topic.key)}
                                onCheckedChange={() => handleSpouseTopicToggle(topic.key)}
                              />
                              <Label htmlFor={`spouse-topic-${topic.key}`} className="font-normal cursor-pointer w-full">
                                {topic.label}
                              </Label>
                            </div>
                          ))}
                        </div>
                        
                        {spouseConversationTopics.includes("other") && (
                          <div className="mt-3">
                            <Label htmlFor="other-spouse-topic">기타 주제 상세 설명</Label>
                            <Input
                              id="other-spouse-topic"
                              placeholder="다른 대화 주제를 입력하세요"
                              value={otherSpouseTopicText}
                              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setOtherSpouseTopicText(e.target.value)}
                              className="mt-1"
                            />
                          </div>
                        )}
                      </div>
                    )}
                    
                    <div className="pt-4 flex justify-end gap-2">
                      {dateRecord.checkin && (
                        <Button variant="outline" onClick={() => setCheckinEditMode(false)}>
                          취소
                        </Button>
                      )}
                      <Button onClick={handleSaveCheckin}>
                        <Save className="mr-2 h-4 w-4" />
                        저장하기
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
} 