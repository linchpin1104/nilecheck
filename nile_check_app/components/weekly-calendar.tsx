"use client";

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import {
  addDays,
  addWeeks,
  format,
  isSameDay,
  startOfWeek,
  subWeeks,
} from "date-fns";
import { cn } from "@/lib/utils";
import { ko } from 'date-fns/locale';

interface WeeklyCalendarProps {
  selectedDate: Date;
  onDateSelect: (date: Date) => void;
}

export function WeeklyCalendar({ selectedDate, onDateSelect }: WeeklyCalendarProps) {
  // 메모이제이션 적용 - 주간 시작일 계산
  const [currentWeekStart, setCurrentWeekStart] = useState(() => 
    startOfWeek(selectedDate, { weekStartsOn: 1 }) // Monday as start of week
  );

  // 선택된 날짜가 현재 보이는 주 밖에 있을 때 업데이트
  useEffect(() => {
    const currentSelectedWeekStart = startOfWeek(selectedDate, { weekStartsOn: 1 });
    if (!isSameDay(currentWeekStart, currentSelectedWeekStart)) {
      setCurrentWeekStart(currentSelectedWeekStart);
    }
  }, [selectedDate, currentWeekStart]);

  // 메모이제이션 적용 - 요일 배열 계산
  const days = useMemo(() => {
    return Array.from({ length: 7 }).map((_, i) => addDays(currentWeekStart, i));
  }, [currentWeekStart]);

  // 메모이제이션 적용 - 이벤트 핸들러
  const handlePrevWeek = useCallback(() => {
    const newWeekStart = subWeeks(currentWeekStart, 1);
    setCurrentWeekStart(newWeekStart);
    onDateSelect(newWeekStart); // Update selectedDate to the start of the new week
  }, [currentWeekStart, onDateSelect]);

  const handleNextWeek = useCallback(() => {
    const newWeekStart = addWeeks(currentWeekStart, 1);
    setCurrentWeekStart(newWeekStart);
    onDateSelect(newWeekStart); // Update selectedDate to the start of the new week
  }, [currentWeekStart, onDateSelect]);
  
  const handleToday = useCallback(() => {
    const today = new Date();
    const todayWeekStart = startOfWeek(today, { weekStartsOn: 1 });
    setCurrentWeekStart(todayWeekStart);
    onDateSelect(today);
  }, [onDateSelect]);

  return (
    <Card className="mb-6 shadow-md">
      <CardContent className="pt-6">
        <div className="flex items-center justify-between mb-4">
          <Button variant="outline" size="icon" onClick={handlePrevWeek} aria-label="이전 주">
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <div className="flex flex-col items-center">
            <h3 className="font-semibold text-center">
              {format(currentWeekStart, "yyyy년 MMMM")}
            </h3>
            <Button variant="link" size="sm" onClick={handleToday} className="text-accent">
                오늘로 이동
            </Button>
          </div>
          <Button variant="outline" size="icon" onClick={handleNextWeek} aria-label="다음 주">
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
        <div className="grid grid-cols-7 gap-1">
          {days.map((day) => (
            <Button
              key={day.toISOString()}
              variant={isSameDay(day, selectedDate) ? "default" : "outline"}
              onClick={() => onDateSelect(day)}
              className={cn(
                "flex flex-col h-auto p-2 text-xs sm:text-sm items-center justify-center",
                isSameDay(day, selectedDate) &&
                  "bg-primary text-primary-foreground hover:bg-primary/90",
                !isSameDay(day, selectedDate) &&
                  isSameDay(day, new Date()) &&
                  "border-primary text-primary"
              )}
            >
              <span className="font-medium">{format(day, "EEE", { locale: ko })}</span>
              <span>{format(day, "d")}</span>
            </Button>
          ))}
        </div>
      </CardContent>
    </Card>
  );
} 