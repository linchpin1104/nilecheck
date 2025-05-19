"use client";

import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { MealEntry, SleepEntry, WellbeingCheckinRecord } from "@/lib/store";
import { Utensils, BedDouble, Droplets, Coffee, CheckCircle, HeartPulse, XCircle } from "lucide-react";

interface ActivitySummaryProps {
  date: Date;
  meals: MealEntry[];
  sleep?: SleepEntry;
  checkin?: WellbeingCheckinRecord;
}

export function ActivitySummary({ date, meals, sleep, checkin }: ActivitySummaryProps) {
  // 식사 유형별로 분류
  const breakfast = meals.find(meal => meal.type === 'breakfast');
  const lunch = meals.find(meal => meal.type === 'lunch');
  const dinner = meals.find(meal => meal.type === 'dinner');
  const snacks = meals.filter(meal => meal.type === 'snack');
  
  // 물 섭취량 계산
  const waterIntakes = meals
    .filter(meal => meal.waterIntake !== undefined)
    .map(meal => meal.waterIntake as number);
  const totalWaterIntake = waterIntakes.length > 0
    ? waterIntakes.reduce((sum, intake) => sum + intake, 0)
    : 0;
  
  // 수면 시간 계산
  const sleepHours = sleep
    ? (new Date(sleep.endTime).getTime() - new Date(sleep.startTime).getTime()) / (1000 * 60 * 60)
    : 0;

  // 식사 상태 아이콘 표시용 함수
  const getMealStatusIcon = (meal?: MealEntry) => {
    if (!meal) return <XCircle className="h-4 w-4 text-gray-400" />;
    return meal.status === 'eaten' 
      ? <CheckCircle className="h-4 w-4 text-green-500" /> 
      : <XCircle className="h-4 w-4 text-red-500" />;
  };

  // 식사 정보 표시용 함수
  const getFoodTypeInfo = (meal?: MealEntry) => {
    if (!meal || meal.status === 'skipped' || !meal.foodTypes || meal.foodTypes.length === 0) {
      return "기록 없음";
    }
    
    const foodTypeLabels: Record<string, string> = {
      rice: "밥/곡물",
      vegetables: "채소",
      fruits: "과일",
      meat: "고기",
      fish: "생선",
      dairy: "유제품",
      snack: "간식",
      fastFood: "패스트푸드"
    };
    
    return meal.foodTypes.map(type => foodTypeLabels[type] || type).join(", ");
  };

  // 감정 라벨
  const emotionLabels: Record<string, {emoji: string; label: string}> = {
    joy: { emoji: "😊", label: "기쁨" },
    sadness: { emoji: "😢", label: "슬픔" },
    anger: { emoji: "😠", label: "분노" },
    anxiety: { emoji: "😟", label: "불안" },
    calmness: { emoji: "😌", label: "평온" },
    gratitude: { emoji: "🙏", label: "감사" },
    stress: { emoji: "😫", label: "스트레스" },
    hope: { emoji: "✨", label: "희망" }
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>{format(date, "yyyy년 MM월 dd일")} 기록 요약</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* 식사 기록 */}
        <div className="space-y-3">
          <h3 className="text-lg font-medium flex items-center">
            <Utensils className="mr-2 h-5 w-5" /> 식사 기록
          </h3>
          <div className="grid gap-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <Coffee className="mr-2 h-4 w-4" />
                <span>아침</span>
              </div>
              <div className="flex items-center gap-2">
                {getMealStatusIcon(breakfast)}
                <span className="text-sm">{getFoodTypeInfo(breakfast)}</span>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <Utensils className="mr-2 h-4 w-4" />
                <span>점심</span>
              </div>
              <div className="flex items-center gap-2">
                {getMealStatusIcon(lunch)}
                <span className="text-sm">{getFoodTypeInfo(lunch)}</span>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <Utensils className="mr-2 h-4 w-4" />
                <span>저녁</span>
              </div>
              <div className="flex items-center gap-2">
                {getMealStatusIcon(dinner)}
                <span className="text-sm">{getFoodTypeInfo(dinner)}</span>
              </div>
            </div>
            {snacks.length > 0 && (
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <Utensils className="mr-2 h-4 w-4" />
                  <span>간식</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  <span className="text-sm">{snacks.length}회</span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* 물 섭취량 */}
        <div className="space-y-2">
          <h3 className="text-lg font-medium flex items-center">
            <Droplets className="mr-2 h-5 w-5 text-blue-500" /> 물 섭취량
          </h3>
          <div className="flex items-center">
            {totalWaterIntake > 0 ? (
              <div className="flex items-center gap-2">
                {Array.from({ length: Math.min(Math.ceil(totalWaterIntake), 5) }).map((_, i) => (
                  <Droplets 
                    key={i}
                    className="h-6 w-6 text-blue-500" 
                    fill={i < Math.floor(totalWaterIntake) ? "currentColor" : "none"}
                  />
                ))}
                <span className="ml-2 text-sm">
                  {totalWaterIntake.toFixed(1)}잔 ({Math.round(totalWaterIntake * 0.2)}L)
                </span>
              </div>
            ) : (
              <span className="text-sm text-muted-foreground">기록된 물 섭취량이 없습니다</span>
            )}
          </div>
        </div>

        {/* 수면 기록 */}
        {sleep && (
          <div className="space-y-2">
            <h3 className="text-lg font-medium flex items-center">
              <BedDouble className="mr-2 h-5 w-5" /> 수면 기록
            </h3>
            <div className="space-y-1">
              <div className="flex justify-between">
                <span className="text-sm">수면 시간</span>
                <span className="text-sm">{sleepHours.toFixed(1)}시간</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm">수면 품질</span>
                <div className="flex">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <span key={i} className={`text-sm ${i < sleep.quality ? "text-yellow-500" : "text-gray-300"}`}>★</span>
                  ))}
                </div>
              </div>
              {sleep.wokeUpDuringNight && (
                <div className="flex justify-between">
                  <span className="text-sm">야간 기상</span>
                  <span className="text-sm">{sleep.wakeUpCount}회</span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* 체크인 기록 */}
        {checkin && (
          <div className="space-y-2">
            <h3 className="text-lg font-medium flex items-center">
              <HeartPulse className="mr-2 h-5 w-5 text-red-500" /> 웰빙 체크인
            </h3>
            <div className="space-y-1">
              <div className="flex justify-between">
                <span className="text-sm">스트레스 레벨</span>
                <div className="flex items-center">
                  <div className="w-24 h-2 bg-gray-200 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-gradient-to-r from-green-500 to-red-500"
                      style={{ width: `${(checkin.input.stressLevel / 10) * 100}%` }}
                    />
                  </div>
                  <span className="ml-2 text-sm">{checkin.input.stressLevel}/10</span>
                </div>
              </div>
              {checkin.input.mainEmotions.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-2">
                  {checkin.input.mainEmotions.map(emotion => (
                    <Badge key={emotion} variant="outline">
                      {emotionLabels[emotion]?.emoji || ""} {emotionLabels[emotion]?.label || emotion}
                    </Badge>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
} 