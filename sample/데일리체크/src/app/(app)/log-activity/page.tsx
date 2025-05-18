
"use client";

import * as React from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { MealLogForm, SleepLogForm } from "@/components/activity-log-forms";
import { WellbeingCheckinForm } from "@/components/wellbeing-checkin-form";
import { Utensils, BedDouble, HeartPulse, ArrowLeft, FileText, Moon, Coffee, MessageSquare, TrendingUp, TrendingDown, SmileIcon, ListChecks, Users2, Edit3, PlusCircle } from "lucide-react";
import { WeeklyCalendar } from "@/components/weekly-calendar";
import type { WellbeingCheckinInputData, MealEntry, SleepEntry, WellbeingCheckinRecord } from "@/types";
import { useAppStore } from "@/lib/app-store";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useTranslation } from "@/hooks/useTranslation";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { format, isToday, parseISO, differenceInHours, differenceInMinutes, isAfter, startOfDay } from "date-fns";

interface EntriesForSelectedDate {
  meals: MealEntry[];
  sleep: SleepEntry | undefined;
  checkin: WellbeingCheckinRecord | undefined;
}

export default function LogActivityPage() {
  const { t, dateLocale } = useTranslation();
  const [selectedDate, setSelectedDate] = React.useState(new Date());
  const [entriesForSelectedDate, setEntriesForSelectedDate] = React.useState<EntriesForSelectedDate>({ meals: [], sleep: undefined, checkin: undefined });
  
  const [displayMealForm, setDisplayMealForm] = React.useState(false);
  const [displaySleepForm, setDisplaySleepForm] = React.useState(false);
  const [displayCheckinForm, setDisplayCheckinForm] = React.useState(false);


  const { addCheckin, getMealsOnDate, getSleepEntryForNightOf, getCheckinForDate, data: storeData, isInitialized, isLoading: isLoadingStore } = useAppStore(); 
  const { toast } = useToast();

  const isFutureDate = React.useMemo(() => {
    return isAfter(startOfDay(selectedDate), startOfDay(new Date()));
  }, [selectedDate]);

  React.useEffect(() => {
    if (isInitialized) {
      const dateStr = format(selectedDate, "yyyy-MM-dd");
      const meals = getMealsOnDate(dateStr);
      const sleep = getSleepEntryForNightOf(dateStr);
      const checkin = getCheckinForDate(dateStr);
      setEntriesForSelectedDate({ meals, sleep, checkin });

      // Reset form display states when date changes, unless it's a future date
      if (!isFutureDate) {
        const dateKey = format(selectedDate, "yyyy-MM-dd");
        // Auto-show form if no entries and not already explicitly hidden by user for THIS date
        if (meals.length === 0 && !formUserInteractionFlags.meal[dateKey]) { 
            setDisplayMealForm(true);
        } else if (meals.length > 0 && !formUserInteractionFlags.meal[dateKey]) {
            setDisplayMealForm(false);
        }

        if (sleep === undefined && !formUserInteractionFlags.sleep[dateKey]) {
            setDisplaySleepForm(true);
        } else if (sleep !== undefined && !formUserInteractionFlags.sleep[dateKey]) {
            setDisplaySleepForm(false);
        }
        
        if (checkin === undefined && !formUserInteractionFlags.checkin[dateKey]) {
             setDisplayCheckinForm(true);
        } else if (checkin !== undefined && !formUserInteractionFlags.checkin[dateKey]) {
            setDisplayCheckinForm(false);
        }

      } else {
        // For future dates, always hide forms
        setDisplayMealForm(false);
        setDisplaySleepForm(false);
        setDisplayCheckinForm(false);
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedDate, storeData, getMealsOnDate, getSleepEntryForNightOf, getCheckinForDate, isInitialized, isFutureDate]);


  // Flags to track if user explicitly showed/hid forms to prevent useEffect override
  const [formUserInteractionFlags, setFormUserInteractionFlags] = React.useState<{meal: Record<string, boolean>, sleep: Record<string,boolean>, checkin: Record<string,boolean>}>({meal:{}, sleep:{}, checkin:{}});

  const handleDisplayMealForm = (show: boolean) => {
    setDisplayMealForm(show);
    setFormUserInteractionFlags(prev => ({...prev, meal: {...prev.meal, [format(selectedDate, "yyyy-MM-dd")]: true}}));
  };
  const handleDisplaySleepForm = (show: boolean) => {
    setDisplaySleepForm(show);
    setFormUserInteractionFlags(prev => ({...prev, sleep: {...prev.sleep, [format(selectedDate, "yyyy-MM-dd")]: true}}));
  };
  const handleDisplayCheckinForm = (show: boolean) => {
    setDisplayCheckinForm(show);
    setFormUserInteractionFlags(prev => ({...prev, checkin: {...prev.checkin, [format(selectedDate, "yyyy-MM-dd")]: true}}));
  };


  const handleCheckinComplete = (inputData: WellbeingCheckinInputData) => {
    addCheckin(inputData, selectedDate); 
    toast({
      title: t('wellbeingCheckinForm.toast.submitSuccess.title'),
      description: t('wellbeingCheckinForm.toast.submitSuccess.description', { date: format(selectedDate, "PP", { locale: dateLocale}) }),
    });
    setDisplayCheckinForm(false); // Hide form on success
    setFormUserInteractionFlags(prev => ({...prev, checkin: {...prev.checkin, [format(selectedDate, "yyyy-MM-dd")]: true}}));
  };

  const handleMealLogSuccess = () => {
    setDisplayMealForm(false); // Hide form on success
    setFormUserInteractionFlags(prev => ({...prev, meal: {...prev.meal, [format(selectedDate, "yyyy-MM-dd")]: true}}));
  };

  const handleSleepLogSuccess = () => {
    setDisplaySleepForm(false); // Hide form on success
    setFormUserInteractionFlags(prev => ({...prev, sleep: {...prev.sleep, [format(selectedDate, "yyyy-MM-dd")]: true}}));
  };

  const renderMealSummary = (meal: MealEntry) => {
    const fullQualityLabel = meal.quality ? t(`mealLogForm.qualityOption.${meal.quality}`) : '';
    const qualityLabel = fullQualityLabel.substring(0, fullQualityLabel.lastIndexOf(" (")).trim() || String(meal.quality);
    return (
      <div key={meal.id} className="p-3 border rounded-lg shadow-sm bg-background hover:shadow-md transition-shadow mb-2">
        <div className="flex items-center justify-between mb-1">
            <span className="font-semibold text-sm text-foreground">{t(`mealLogForm.mealTypeOption.${meal.type}`)}</span>
            <span className="text-xs text-muted-foreground">{format(parseISO(meal.dateTime), 'p', { locale: dateLocale })}</span>
        </div>
        {meal.status === 'eaten' ? (
          <>
            <p className="text-sm text-muted-foreground mb-1">{meal.description || t('myPage.noData')}</p>
            <p className="text-xs text-muted-foreground">{t('myPage.meals.table.quality')}: <span className="font-medium text-foreground">{qualityLabel || '-'}</span></p>
          </>
        ) : (
          <Badge variant="outline" className="text-xs py-0.5 px-1.5">{t('mealLogForm.status.skipped')}</Badge>
        )}
      </div>
    );
  };

  const renderSleepSummary = (sleep: SleepEntry) => {
    const durationHours = differenceInHours(parseISO(sleep.endTime), parseISO(sleep.startTime));
    const durationMinutes = differenceInMinutes(parseISO(sleep.endTime), parseISO(sleep.startTime)) % 60;
    const fullQualityLabel = t(`mealLogForm.qualityOption.${sleep.quality}`); // Reusing meal quality translation
    const qualityLabel = fullQualityLabel.substring(0, fullQualityLabel.lastIndexOf(" (")).trim() || String(sleep.quality);
    return (
      <div className="p-3 border rounded-lg shadow-sm bg-background hover:shadow-md transition-shadow">
        <p className="text-sm text-muted-foreground mb-1">{t('myPage.sleep.table.duration')}: <span className="font-medium text-foreground">{durationHours}h {durationMinutes}m</span></p>
        <p className="text-xs text-muted-foreground mb-1">{t('myPage.sleep.table.quality')}: <span className="font-medium text-foreground">{qualityLabel}</span></p>
        {sleep.wokeUpDuringNight && (
            <p className="text-xs text-muted-foreground">{t('myPage.sleep.table.wakeUpCount')}: <span className="font-medium text-foreground">{sleep.wakeUpCount}</span></p>
        )}
      </div>
    );
  };
  
  const renderCheckinSummary = (checkin: WellbeingCheckinRecord) => {
    return (
      <div className="p-4 border rounded-lg shadow-sm bg-background hover:shadow-md transition-shadow">
        <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-muted-foreground">{t('myPage.checkins.checkedInOn', { date: format(parseISO(checkin.dateTime), 'PP', { locale: dateLocale }) })}</span>
        </div>
        <div className="space-y-3 text-sm">
            <div className="flex items-center">
                {checkin.input.stressLevel > 7 ? <TrendingUp className="w-4 h-4 mr-2 text-destructive" /> : checkin.input.stressLevel < 4 ? <TrendingDown className="w-4 h-4 mr-2 text-green-600" /> : <HeartPulse className="w-4 h-4 mr-2 text-yellow-500" />}
                <span className="text-muted-foreground">{t('myPage.checkins.stressLevel')}: </span>
                <Badge 
                  variant={checkin.input.stressLevel > 7 ? "destructive" : (checkin.input.stressLevel < 4 ? "default" : "secondary")} 
                  className="ml-1.5 py-0.5 px-1.5"
                >
                  {checkin.input.stressLevel}/10
                </Badge>
            </div>
            <div>
                <div className="flex items-start">
                    <SmileIcon className="w-4 h-4 mr-2 mt-0.5 text-primary shrink-0" />
                    <span className="text-muted-foreground mr-1">{t('myPage.checkins.emotions')}: </span>
                    <div className="inline-flex flex-wrap gap-1">
                    {checkin.input.mainEmotions.length > 0 ? checkin.input.mainEmotions.map(eKey => {
                        let emotionDisplay = t(`emotion.${eKey}`);
                        if (eKey === 'other' && checkin.input.otherEmotionDetail) {
                            emotionDisplay = `${t('emotion.other')} (${checkin.input.otherEmotionDetail})`;
                        }
                        return <Badge key={eKey} variant="outline" className="py-0.5 px-1.5 text-xs">{emotionDisplay}</Badge>;
                    }) : <span className="text-xs text-muted-foreground">{t('myPage.noData')}</span>}
                    </div>
                </div>
            </div>
            <div>
                 <div className="flex items-start">
                    <ListChecks className="w-4 h-4 mr-2 mt-0.5 text-primary shrink-0" />
                    <span className="text-muted-foreground mr-1">{t('myPage.checkins.activities')}: </span>
                    <div className="inline-flex flex-wrap gap-1">
                    {checkin.input.todayActivities.length > 0 ? checkin.input.todayActivities.map(aKey => {
                        let activityDisplay = t(`activity.${aKey}`);
                        if (aKey === 'other' && checkin.input.otherActivityDetail) {
                            activityDisplay = `${t('activity.other')} (${checkin.input.otherActivityDetail})`;
                        }
                        return <Badge key={aKey} variant="outline" className="py-0.5 px-1.5 text-xs">{activityDisplay}</Badge>;
                    }) : <span className="text-xs text-muted-foreground">{t('myPage.noData')}</span>}
                    </div>
                </div>
            </div>

            {checkin.input.conversationPartner && checkin.input.conversationPartner !== 'none' && (
                 <div>
                    <div className="flex items-center">
                        <Users2 className="w-4 h-4 mr-2 text-primary" />
                        <span className="text-muted-foreground">{t('myPage.checkins.conversationPartner')}: </span>
                        <Badge variant="outline" className="ml-1.5 py-0.5 px-1.5 text-xs">
                            {checkin.input.conversationPartner === 'other' && checkin.input.otherConversationPartnerDetail 
                                ? `${t('partner.other')} (${checkin.input.otherConversationPartnerDetail})`
                                : t(`partner.${checkin.input.conversationPartner}`)}
                        </Badge>
                    </div>
                </div>
            )}

            {checkin.input.conversationPartner === 'spouse' && checkin.input.spouseConversationTopics && checkin.input.spouseConversationTopics.length > 0 && (
                <div className="pl-6">
                    <span className="text-muted-foreground text-xs">{t('myPage.checkins.spouseTopics')}: </span>
                    <div className="inline-flex flex-wrap gap-1 mt-0.5">
                    {checkin.input.spouseConversationTopics.map(topicKey => {
                        let topicDisplay = t(`spouseTopic.${topicKey}`);
                        if (topicKey === 'other' && checkin.input.otherSpouseTopicDetail) {
                            topicDisplay = `${t('spouseTopic.other')} (${checkin.input.otherSpouseTopicDetail})`;
                        }
                        return <Badge key={topicKey} variant="outline" className="py-0.5 px-1.5 text-xs">{topicDisplay}</Badge>;
                    })}
                    </div>
                </div>
            )}
        </div>
      </div>
    );
  };

  if (isLoadingStore || !isInitialized) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        <p className="ml-4 text-muted-foreground">{t('loadingDashboard')}</p>
      </div>
    );
  }
  // Ensure this is the start of the main return for the component
  return (
    <div className="container mx-auto py-8 px-4">
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-3xl font-bold text-primary">{t('logActivityPage.title')}</h1>
        <Button asChild variant="outline">
          <Link href="/dashboard">
            <ArrowLeft className="mr-2 h-4 w-4" />
            {t('logActivityPage.backToDashboard')}
          </Link>
        </Button>
      </div>
      <p className="text-muted-foreground mb-8">
        {t('logActivityPage.description')}
      </p>
      
      <WeeklyCalendar 
        selectedDate={selectedDate} 
        onDateSelect={setSelectedDate} 
      />

      <Card className="mb-6 shadow-md">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-xl">
            <FileText className="text-primary h-5 w-5" /> 
            {t('logActivityPage.summaryFor', { date: format(selectedDate, "PP", { locale: dateLocale }) })}
          </CardTitle>
           <CardDescription>
            {t('logActivityPage.summaryFor.description', { date: format(selectedDate, "PP", { locale: dateLocale }) })}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {entriesForSelectedDate.meals.length === 0 && !entriesForSelectedDate.sleep && !entriesForSelectedDate.checkin ? (
            <p className="text-muted-foreground py-4 text-center">{t('logActivityPage.noEntriesForDate')}</p>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {entriesForSelectedDate.meals.length > 0 && (
                <div className="space-y-3">
                  <h4 className="text-lg font-semibold text-primary flex items-center gap-2"><Coffee size={18}/> {t('myPage.tabs.meals')}</h4>
                  {entriesForSelectedDate.meals.map(renderMealSummary)}
                </div>
              )}
              {entriesForSelectedDate.sleep && (
                <div className="space-y-3">
                   <h4 className="text-lg font-semibold text-primary flex items-center gap-2"><Moon size={18}/> {t('myPage.tabs.sleep')}</h4>
                  {renderSleepSummary(entriesForSelectedDate.sleep)}
                </div>
              )}
              {entriesForSelectedDate.checkin && (
                 <div className="space-y-3">
                  <h4 className="text-lg font-semibold text-primary flex items-center gap-2"><MessageSquare size={18}/> {t('myPage.tabs.checkins')}</h4>
                  {renderCheckinSummary(entriesForSelectedDate.checkin)}
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>


      <Tabs defaultValue="meal" className="w-full max-w-2xl mx-auto">
        <TabsList className="grid w-full grid-cols-2 sm:grid-cols-3 mb-6">
          <TabsTrigger value="meal" className="flex items-center gap-2">
            <Utensils className="h-4 w-4" /> {t('tabs.meal')}
          </TabsTrigger>
          <TabsTrigger value="sleep" className="flex items-center gap-2">
            <BedDouble className="h-4 w-4" /> {t('tabs.sleep')}
          </TabsTrigger>
          <TabsTrigger value="checkin" className="flex items-center gap-2">
            <HeartPulse className="h-4 w-4" /> {t('tabs.checkin')}
          </TabsTrigger>
        </TabsList>
        <TabsContent value="meal">
          {isFutureDate ? (
             <Card>
              <CardContent className="pt-6 text-center">
                <p className="text-muted-foreground">{t('logActivityPage.cannotLogFuture')}</p>
              </CardContent>
            </Card>
          ) : displayMealForm ? (
            <MealLogForm selectedDate={selectedDate} onSuccess={handleMealLogSuccess} isDisabled={isFutureDate} />
          ) : (
            <Card>
              <CardContent className="pt-6 text-center">
                <p className="mb-4 text-muted-foreground">
                    {entriesForSelectedDate.meals.length > 0 ? t('logActivityPage.mealsExistInfo') : t('logActivityPage.noEntriesForDate')}
                </p>
                <Button onClick={() => handleDisplayMealForm(true)} disabled={isFutureDate}>
                  <PlusCircle className="mr-2 h-4 w-4" /> {entriesForSelectedDate.meals.length > 0 ? t('logActivityPage.addOrEditMealsButton') : t('mealLogForm.logMealButton')}
                </Button>
              </CardContent>
            </Card>
          )}
        </TabsContent>
        <TabsContent value="sleep">
          {isFutureDate ? (
             <Card>
              <CardContent className="pt-6 text-center">
                <p className="text-muted-foreground">{t('logActivityPage.cannotLogFuture')}</p>
              </CardContent>
            </Card>
          ) : displaySleepForm ? (
            <SleepLogForm selectedDate={selectedDate} onSuccess={handleSleepLogSuccess} isDisabled={isFutureDate} />
          ) : (
            <Card>
              <CardContent className="pt-6 text-center">
                 <p className="mb-4 text-muted-foreground">
                    {entriesForSelectedDate.sleep ? t('logActivityPage.sleepExistsInfo') : t('sleepLogForm.logSleepButton')}
                 </p>
                <Button onClick={() => handleDisplaySleepForm(true)} disabled={isFutureDate}>
                  <Edit3 className="mr-2 h-4 w-4" /> {entriesForSelectedDate.sleep ? t('logActivityPage.editSleepButton') : t('sleepLogForm.logSleepButton')}
                </Button>
              </CardContent>
            </Card>
          )}
        </TabsContent>
        <TabsContent value="checkin">
           {isFutureDate ? (
             <Card>
              <CardContent className="pt-6 text-center">
                <p className="text-muted-foreground">{t('logActivityPage.cannotLogFuture')}</p>
              </CardContent>
            </Card>
           ) : displayCheckinForm ? (
             <WellbeingCheckinForm
                selectedDate={selectedDate}
                onCheckinComplete={handleCheckinComplete}
                isDisabled={isFutureDate} 
              />
           ) : entriesForSelectedDate.checkin ? ( // Already checked in, show summary
              <Card>
                <CardHeader>
                  <CardTitle className="text-xl">{t('logActivityPage.existingCheckinDetails.title', { date: format(selectedDate, "PP", { locale: dateLocale }) })}</CardTitle>
                </CardHeader>
                <CardContent className="pt-0">
                    {renderCheckinSummary(entriesForSelectedDate.checkin)}
                    {/* Add button to re-open form if needed, or make it editable directly */}
                    <Button 
                        onClick={() => handleDisplayCheckinForm(true)} 
                        disabled={isFutureDate}
                        variant="outline"
                        className="mt-4 w-full"
                    >
                      <Edit3 className="mr-2 h-4 w-4" /> {t('logActivityPage.editCheckinButton', {default: "Edit Check-in"})}
                    </Button>
                </CardContent>
              </Card>
           ) : ( // No checkin yet for today, allow new checkin.
              <Card>
                <CardContent className="pt-6 text-center">
                  <p className="mb-4 text-muted-foreground">{t('logActivityPage.noCheckinYetInfo', {default: "No check-in logged for this date yet."})}</p>
                  <Button onClick={() => handleDisplayCheckinForm(true)} disabled={isFutureDate}>
                     <PlusCircle className="mr-2 h-4 w-4" /> {t('wellbeingCheckinForm.submitButton')}
                  </Button>
                </CardContent>
              </Card>
           )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
