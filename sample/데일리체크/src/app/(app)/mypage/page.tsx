
"use client";

import * as React from "react";
import { useAppStore } from "@/lib/app-store";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { MealList } from "@/components/mypage/meal-list";
import { SleepList } from "@/components/mypage/sleep-list";
import { CheckinList } from "@/components/mypage/checkin-list";
import { Utensils, BedDouble, HeartPulse } from "lucide-react";
import { useTranslation } from "@/hooks/useTranslation";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export default function MyPage() {
  const { data, isInitialized, isLoading } = useAppStore();
  const { t } = useTranslation();

  if (isLoading || !isInitialized) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        <p className="ml-4 text-muted-foreground">{t('loadingDashboard')}</p>
      </div>
    );
  }

  const sortedMeals = React.useMemo(() => data.meals.sort((a, b) => new Date(b.dateTime).getTime() - new Date(a.dateTime).getTime()), [data.meals]);
  const sortedSleep = React.useMemo(() => data.sleep.sort((a, b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime()), [data.sleep]);
  const sortedCheckins = React.useMemo(() => data.checkins.sort((a, b) => new Date(b.dateTime).getTime() - new Date(a.dateTime).getTime()), [data.checkins]);

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-3xl font-bold text-primary">{t('myPage.title')}</h1>
        <Button asChild variant="outline">
          <Link href="/dashboard">
            <ArrowLeft className="mr-2 h-4 w-4" />
            {t('logActivityPage.backToDashboard')}
          </Link>
        </Button>
      </div>
      <p className="text-muted-foreground mb-8">
        {t('myPage.description')}
      </p>

      <Tabs defaultValue="meals" className="w-full">
        <TabsList className="grid w-full grid-cols-2 sm:grid-cols-3 mb-6">
          <TabsTrigger value="meals" className="flex items-center gap-2">
            <Utensils className="h-4 w-4" /> {t('myPage.tabs.meals')}
          </TabsTrigger>
          <TabsTrigger value="sleep" className="flex items-center gap-2">
            <BedDouble className="h-4 w-4" /> {t('myPage.tabs.sleep')}
          </TabsTrigger>
          <TabsTrigger value="checkins" className="flex items-center gap-2">
            <HeartPulse className="h-4 w-4" /> {t('myPage.tabs.checkins')}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="meals">
          <MealList meals={sortedMeals} />
        </TabsContent>
        <TabsContent value="sleep">
          <SleepList sleepEntries={sortedSleep} />
        </TabsContent>
        <TabsContent value="checkins">
          <CheckinList checkinRecords={sortedCheckins} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

