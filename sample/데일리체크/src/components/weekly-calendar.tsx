
"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ChevronLeft, ChevronRight } from "lucide-react";
import {
  addDays,
  format,
  startOfWeek,
  subWeeks,
  addWeeks,
  isSameDay,
  isToday as checkIsToday,
} from "date-fns";
import { cn } from "@/lib/utils";
import { useTranslation } from "@/hooks/useTranslation";

interface WeeklyCalendarProps {
  selectedDate: Date;
  onDateSelect: (date: Date) => void;
}

export function WeeklyCalendar({ selectedDate, onDateSelect }: WeeklyCalendarProps) {
  const { t, dateLocale } = useTranslation();
  const [currentWeekStart, setCurrentWeekStart] = React.useState(
    startOfWeek(selectedDate, { weekStartsOn: 1, locale: dateLocale }) // Monday as start of week
  );

  React.useEffect(() => {
    // If selectedDate changes (e.g. from an external source) and is outside the current viewed week, update view
    const currentSelectedWeekStart = startOfWeek(selectedDate, { weekStartsOn: 1, locale: dateLocale });
    if (!isSameDay(currentWeekStart, currentSelectedWeekStart)) {
      setCurrentWeekStart(currentSelectedWeekStart);
    }
  }, [selectedDate, currentWeekStart, dateLocale]);

  const days = React.useMemo(() => {
    return Array.from({ length: 7 }).map((_, i) => addDays(currentWeekStart, i));
  }, [currentWeekStart]);

  const handlePrevWeek = () => {
    const newWeekStart = subWeeks(currentWeekStart, 1);
    setCurrentWeekStart(newWeekStart);
    onDateSelect(newWeekStart); // Update selectedDate to the start of the new week
  };

  const handleNextWeek = () => {
    const newWeekStart = addWeeks(currentWeekStart, 1);
    setCurrentWeekStart(newWeekStart);
    onDateSelect(newWeekStart); // Update selectedDate to the start of the new week
  };
  
  const handleToday = () => {
    const today = new Date();
    const todayWeekStart = startOfWeek(today, { weekStartsOn: 1, locale: dateLocale });
    setCurrentWeekStart(todayWeekStart);
    onDateSelect(today);
  };

  return (
    <Card className="mb-6 shadow-md">
      <CardContent className="pt-6">
        <div className="flex items-center justify-between mb-4">
          <Button variant="outline" size="icon" onClick={handlePrevWeek} aria-label={t('weeklyCalendar.prevWeek') || "Previous week"}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <div className="text-center">
            <h3 className="text-lg font-semibold text-primary">
              {format(currentWeekStart, "MMMM yyyy", { locale: dateLocale })}
            </h3>
            <Button variant="link" size="sm" onClick={handleToday} className="text-accent">
                {t('weeklyCalendar.goToToday')}
            </Button>
          </div>
          <Button variant="outline" size="icon" onClick={handleNextWeek} aria-label={t('weeklyCalendar.nextWeek') || "Next week"}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
        <div className="grid grid-cols-7 gap-1 sm:gap-2">
          {days.map((day) => (
            <Button
              key={day.toISOString()}
              variant={isSameDay(day, selectedDate) ? "default" : "outline"}
              onClick={() => onDateSelect(day)}
              className={cn(
                "flex flex-col h-auto p-2 text-xs sm:text-sm items-center justify-center",
                checkIsToday(day) && !isSameDay(day, selectedDate) && "border-primary text-primary",
                 isSameDay(day, selectedDate) ? "bg-primary text-primary-foreground" : "hover:bg-accent/50"
              )}
            >
              <span className="font-medium">{format(day, "EEE", { locale: dateLocale })}</span>
              <span>{format(day, "d", { locale: dateLocale })}</span>
            </Button>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

