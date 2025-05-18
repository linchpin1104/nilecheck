"use client";

import { useEffect, useState } from "react";
import { useAppStore } from "@/lib/app-store";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Utensils, BedDouble, Info, ListPlus, Brain, FileText } from "lucide-react"; // Added Brain, FileText
import { SleepDurationChart } from "@/components/charts/sleep-duration-chart";
// import { ActivityCategoryChart } from "@/components/charts/activity-category-chart"; // Removed import
import { EmotionFrequencyChart } from "@/components/charts/emotion-frequency-chart";
import { CheckinActivityBreakdownChart } from "@/components/charts/checkin-activity-breakdown-chart";
import { ConversationPartnerChart } from "@/components/charts/conversation-partner-chart";
import { differenceInHours, isToday, parseISO } from "date-fns";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { useTranslation } from "@/hooks/useTranslation";

export default function DashboardPage() {
  const { data, isInitialized, isLoading: isLoadingStore } = useAppStore();
  const { t } = useTranslation();
  const [summary, setSummary] = useState({
    todaySleepHours: 0,
    todayMealsLogged: 0,
    todayActivitiesLogged: 0,
  });

  useEffect(() => {
    if (isInitialized && data) {
      const todaySleep = data.sleep.filter(s => {
        if (!s.startTime || !s.endTime) return false;
        const sEndDate = parseISO(s.endTime);
        return isToday(sEndDate);
      });

      const todaySleepHours = todaySleep.reduce((acc, s) => {
        const start = parseISO(s.startTime);
        const end = parseISO(s.endTime);
        const duration = differenceInHours(end, start);
        return acc + duration;
      }, 0);

      const todayMeals = data.meals.filter(m => m.dateTime && isToday(parseISO(m.dateTime)) && m.status === "eaten");
      
      const todayCheckins = data.checkins.filter(c => c.dateTime && isToday(parseISO(c.dateTime)));
      const todayActivitiesCount = todayCheckins.reduce((acc, curr) => acc + (curr.input.todayActivities?.length || 0), 0);


      setSummary({
        todaySleepHours: todaySleepHours,
        todayMealsLogged: todayMeals.length,
        todayActivitiesLogged: todayActivitiesCount,
      });
    }
  }, [data, isInitialized]);
  
  if (isLoadingStore || !isInitialized) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        <p className="ml-4 text-muted-foreground">{t('loadingDashboard')}</p>
      </div>
    );
  }

  const hasAnyData = data.meals.length > 0 || data.sleep.length > 0 || (data.checkins && data.checkins.length > 0);

  return (
    <div className="container mx-auto py-8 px-4">
      <h1 className="text-3xl font-bold mb-8 text-primary">{t('dashboard.title')}</h1>

      {hasAnyData && (
        <>
          <Card className="mb-8 shadow-md hover:shadow-lg transition-shadow">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-xl">
                <ListPlus className="text-primary h-5 w-5" /> {t('dashboard.addOrUpdateEntries')}
              </CardTitle>
              <CardDescription>
                {t('dashboard.addOrUpdateEntries.description')}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Link href="/log-activity" className="block w-full">
                <Button variant="default" className="w-full">
                  <ListPlus className="mr-2 h-4 w-4" /> {t('dashboard.goToLogAndCheckin')}
                </Button>
              </Link>
            </CardContent>
          </Card>

          <Card className="mb-8 shadow-md hover:shadow-lg transition-shadow">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-xl">
                <Brain className="text-primary h-5 w-5" /> {t('dashboard.wellnessReports.title')}
              </CardTitle>
              <CardDescription>
                {t('dashboard.wellnessReports.description')}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Link href="/solutions" className="block w-full">
                <Button variant="default" className="w-full">
                  <FileText className="mr-2 h-4 w-4" /> {t('dashboard.wellnessReports.viewButton')}
                </Button>
              </Link>
            </CardContent>
          </Card>
        </>
      )}

      {!hasAnyData && (
        <Card className="mb-8 bg-blue-50 border-blue-200 shadow-md">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-blue-700"><Info className="h-5 w-5"/> {t('dashboard.welcome.title')}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-blue-600 mb-4">
              {t('dashboard.welcome.description')}
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Link href="/log-activity">
                <Button variant="default" className="w-full">{t('dashboard.welcome.logFirstActivity')}</Button>
              </Link>
              <Link href="/solutions">
                <Button variant="outline" className="w-full border-blue-300 hover:bg-blue-100 text-blue-700">{t('dashboard.welcome.viewWellnessReports')}</Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      )}
      
      {/* Charts Section */}
       <div className="grid gap-6 md:grid-cols-1 lg:grid-cols-2 mb-8">
        <SleepDurationChart sleepData={data.sleep} />
        {/* <ActivityCategoryChart checkinData={data.checkins} /> Removed usage */}
        <CheckinActivityBreakdownChart checkinData={data.checkins} /> 
      </div>
      <div className="grid gap-6 md:grid-cols-1 lg:grid-cols-2 mb-8">
        <EmotionFrequencyChart checkinData={data.checkins} />
        <ConversationPartnerChart checkinData={data.checkins} />
      </div>

      {/* Today's Summary Section - Moved to the bottom */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 mb-8">
        <Card className="shadow-md hover:shadow-lg transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t('dashboard.summary.todaySleep')}</CardTitle>
            <BedDouble className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summary.todaySleepHours.toFixed(1)} {t('dashboard.summary.todaySleep.unit')}</div>
            <p className="text-xs text-muted-foreground">{t('dashboard.summary.todaySleep.description')}</p>
          </CardContent>
        </Card>
        <Card className="shadow-md hover:shadow-lg transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t('dashboard.summary.mealsEatenToday')}</CardTitle>
            <Utensils className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summary.todayMealsLogged}</div>
            <p className="text-xs text-muted-foreground">{t('dashboard.summary.mealsEatenToday.description')}</p>
          </CardContent>
        </Card>
         <Card className="shadow-md hover:shadow-lg transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{t('dashboard.summary.activitiesToday')}</CardTitle>
            <ListPlus className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summary.todayActivitiesLogged}</div>
            <p className="text-xs text-muted-foreground">{t('dashboard.summary.activitiesToday.description')}</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
