
"use client";

import { useState, useEffect, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { useAppStore } from "@/lib/app-store";
import { getWeeklyWellnessReport, type WeeklyWellnessReportInput, type WeeklyWellnessReportOutput } from "@/ai/flows/wellness-report";
import type { MealEntry, SleepEntry, WellbeingCheckinRecord, WellnessReportRecord } from "@/types";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Lightbulb, ListChecks, Brain, CheckCircle, AlertTriangle, CalendarDays } from "lucide-react";
import { format, parseISO, subDays, differenceInHours, startOfWeek, endOfWeek, isSameDay } from 'date-fns';
import Link from "next/link";
import { useTranslation } from "@/hooks/useTranslation";

// Helper function to transform check-in responses for the AI flow input
function formatCheckinsForAI(
  checkins: WellbeingCheckinRecord[],
  t: (key: string, replacements?: Record<string, string | number>) => string
): WeeklyWellnessReportInput['dailyCheckins'] {
  if (!checkins || checkins.length === 0) return [];
  
  return checkins.map(record => {
    const inputData = record.input;
    const formattedEmotions = inputData.mainEmotions.map(key => {
      const emotionLabel = t(`emotion.${key}`);
      if (key === 'other' && inputData.otherEmotionDetail) {
        return `${emotionLabel} (${key}): ${inputData.otherEmotionDetail}`;
      }
      return `${emotionLabel} (${key})`;
    });

    const formattedActivities = inputData.todayActivities.map(activityKey => {
      const activityLabel = t(`activity.${activityKey}`);
      if (activityKey === 'other' && inputData.otherActivityDetail) {
        return `${activityLabel} (${activityKey}): ${inputData.otherActivityDetail}`;
      }
      return `${activityLabel} (${activityKey})`;
    });
    
    return {
      date: format(parseISO(record.dateTime), "yyyy-MM-dd"),
      stressLevel: inputData.stressLevel,
      emotions: formattedEmotions,
      activities: formattedActivities,
      // Conversation partner data can be added if needed by the prompt
    };
  });
}

// Helper function to summarize logged data for the AI flow input
function summarizeLogsForAI(
  meals: MealEntry[], 
  sleepEntries: SleepEntry[], 
  t: (key: string) => string 
): WeeklyWellnessReportInput['weeklyLogSummary'] {
  let totalSleepHours = 0;
  let validSleepDays = 0;
  let totalSleepQuality = 0;

  sleepEntries.forEach(s => {
    try {
      const start = parseISO(s.startTime);
      const end = parseISO(s.endTime);
      const duration = differenceInHours(end, start);
      if (!isNaN(duration) && duration > 0) {
        totalSleepHours += duration;
        totalSleepQuality += s.quality;
        validSleepDays++;
      }
    } catch (e) {
      console.warn("Skipping invalid sleep entry for weekly summary:", s, e);
    }
  });

  const averageSleepHours = validSleepDays > 0 ? parseFloat((totalSleepHours / validSleepDays).toFixed(1)) : undefined;
  const averageSleepQuality = validSleepDays > 0 ? parseFloat((totalSleepQuality / validSleepDays).toFixed(1)) : undefined;
  const mealsLoggedCount = meals.filter(m => m.status === 'eaten').length;

  return {
    averageSleepHours,
    averageSleepQuality,
    mealsLoggedCount: mealsLoggedCount > 0 ? mealsLoggedCount : undefined,
  };
}


export default function WeeklyWellnessReportPage() {
  const { 
    data: storeData, 
    addWellnessReport, 
    getAllWellnessReports, 
    getMealsForWeek,
    getSleepForWeek,
    getCheckinsForWeek,
  } = useAppStore();
  const { t, dateLocale } = useTranslation(); // Removed language
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const allReports = useMemo(() => getAllWellnessReports(), [getAllWellnessReports, storeData.wellnessReports]);

  const handleGenerateReport = async () => {
    setIsLoading(true);
    
    const today = new Date();
    const currentWeekStartDate = startOfWeek(today, { weekStartsOn: 1, locale: dateLocale }); // Monday start
    
    // Check if a report for the current week already exists to prevent duplicates for the exact same week start date.
    const existingReportForCurrentWeek = allReports.find(report => 
      isSameDay(parseISO(report.weekStartDate), currentWeekStartDate)
    );

    if (existingReportForCurrentWeek) {
        toast({
            title: t("wellnessReportPage.toast.alreadyExists.title"),
            description: t("wellnessReportPage.toast.alreadyExists.description", { weekStartDate: format(currentWeekStartDate, "PP", { locale: dateLocale }) }),
            variant: "default",
        });
        setIsLoading(false);
        return;
    }

    // Fetch data for the last 7 days ending today (or the week containing today)
    const mealsForWeek = getMealsForWeek(currentWeekStartDate);
    const sleepForWeek = getSleepForWeek(currentWeekStartDate);
    const checkinsForWeek = getCheckinsForWeek(currentWeekStartDate);

    if (checkinsForWeek.length === 0 && mealsForWeek.length === 0 && sleepForWeek.length === 0) {
      toast({
        title: t("wellnessReportPage.noData.title"),
        description: t("wellnessReportPage.noData.description"),
        variant: "destructive",
      });
      setIsLoading(false);
      return;
    }

    const reportInput: WeeklyWellnessReportInput = {
      weekStartDate: format(currentWeekStartDate, "yyyy-MM-dd"),
      dailyCheckins: formatCheckinsForAI(checkinsForWeek, t),
      weeklyLogSummary: summarizeLogsForAI(mealsForWeek, sleepForWeek, t),
      // userLanguage: language, // Removed
    };

    try {
      const aiOutput = await getWeeklyWellnessReport(reportInput);
      addWellnessReport(reportInput, aiOutput); 
      toast({
        title: t("wellnessReportPage.toast.success.title"),
        description: t("wellnessReportPage.toast.success.description"),
      });
    } catch (error) {
      console.error("Error generating weekly wellness report:", error);
      toast({
        title: t("wellnessReportPage.toast.error.title"),
        description: t("wellnessReportPage.toast.error.description"),
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };
  
  const noReportsYet = allReports.length === 0;
  const logDataLink = <Link href="/log-activity" className="text-accent hover:underline">{t("wellnessReportPage.logDataLinkText")}</Link>;

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4">
        <h1 className="text-3xl font-bold text-primary">{t("wellnessReportPage.title")}</h1>
        <Button onClick={handleGenerateReport} disabled={isLoading} className="w-full sm:w-auto">
          {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {isLoading ? t("wellnessReportPage.generatingButton") : t("wellnessReportPage.generateReportButton")}
        </Button>
      </div>

      {isLoading && allReports.length === 0 && (
        <Card className="shadow-lg">
          <CardContent className="pt-6 text-center">
            <Loader2 className="mx-auto h-12 w-12 animate-spin text-primary mb-4" />
            <p className="text-muted-foreground">{t("wellnessReportPage.generatingButton")}</p>
          </CardContent>
        </Card>
      )}

      {!isLoading && noReportsYet && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="text-primary h-5 w-5"/> {t("wellnessReportPage.noReportsYet.title")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">
              {t("wellnessReportPage.noReportsYet.descriptionLine1").replace("{logDataLink}", "")}
              {logDataLink}
              {t("wellnessReportPage.noReportsYet.descriptionLine2")}
            </p>
          </CardContent>
        </Card>
      )}

      {allReports.length > 0 && (
        <div className="space-y-6">
          {allReports.map((report) => (
            <Card key={report.id} className="shadow-lg">
              <CardHeader>
                <CardTitle className="text-xl flex items-center gap-2">
                  <Brain className="text-primary"/> 
                  {t("wellnessReportPage.reportHeader.title", { weekStartDate: format(parseISO(report.weekStartDate), "PP", { locale: dateLocale }) })}
                </CardTitle>
                <CardDescription>
                  {t("wellnessReportPage.reportHeader.generatedOn", { generatedDate: format(parseISO(report.generatedDate), "PPpp", { locale: dateLocale }) })}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {report.output ? (
                  <Accordion type="single" collapsible className="w-full" defaultValue="summary">
                    <AccordionItem value="summary">
                      <AccordionTrigger className="text-lg font-semibold">
                         <ListChecks className="mr-2 h-5 w-5 text-primary" /> {t("wellnessReportPage.accordion.overallSummary")}
                      </AccordionTrigger>
                      <AccordionContent className="text-muted-foreground whitespace-pre-wrap">
                        {report.output.overallSummary}
                      </AccordionContent>
                    </AccordionItem>
                    <AccordionItem value="positives">
                      <AccordionTrigger className="text-lg font-semibold">
                        <CheckCircle className="mr-2 h-5 w-5 text-green-600" /> {t("wellnessReportPage.accordion.positiveObservations")}
                      </AccordionTrigger>
                      <AccordionContent>
                        {report.output.positiveObservations.length > 0 ? (
                          <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
                            {report.output.positiveObservations.map((item, index) => (
                              <li key={`pos-${index}`}>{item}</li>
                            ))}
                          </ul>
                        ) : (
                          <p className="text-muted-foreground">{t("wellnessReportPage.accordion.noItems")}</p>
                        )}
                      </AccordionContent>
                    </AccordionItem>
                     <AccordionItem value="attention">
                      <AccordionTrigger className="text-lg font-semibold">
                        <AlertTriangle className="mr-2 h-5 w-5 text-yellow-500" /> {t("wellnessReportPage.accordion.areasForAttention")}
                      </AccordionTrigger>
                      <AccordionContent>
                        {report.output.areasForAttention.length > 0 ? (
                          <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
                            {report.output.areasForAttention.map((item, index) => (
                              <li key={`att-${index}`}>{item}</li>
                            ))}
                          </ul>
                        ) : (
                           <p className="text-muted-foreground">{t("wellnessReportPage.accordion.noItems")}</p>
                        )}
                      </AccordionContent>
                    </AccordionItem>
                    <AccordionItem value="advice">
                      <AccordionTrigger className="text-lg font-semibold">
                        <Lightbulb className="mr-2 h-5 w-5 text-primary" /> {t("wellnessReportPage.accordion.actionableAdvice")}
                      </AccordionTrigger>
                      <AccordionContent>
                        {report.output.actionableAdvice.length > 0 ? (
                          <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
                            {report.output.actionableAdvice.map((item, index) => (
                              <li key={`adv-${index}`}>{item}</li>
                            ))}
                          </ul>
                        ) : (
                           <p className="text-muted-foreground">{t("wellnessReportPage.accordion.noItems")}</p>
                        )}
                      </AccordionContent>
                    </AccordionItem>
                  </Accordion>
                ) : (
                  <p className="text-muted-foreground">{t("wellnessReportPage.reportOutputMissing")}</p>
                )}
              </CardContent>
               <CardFooter>
                <p className="text-xs text-muted-foreground">
                  {t("wellnessReportPage.footerNote")}
                </p>
              </CardFooter>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

    