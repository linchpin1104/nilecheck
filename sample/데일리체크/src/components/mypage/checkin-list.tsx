
"use client";

import type { WellbeingCheckinRecord } from "@/types";
import { useTranslation } from "@/hooks/useTranslation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { format, parseISO } from "date-fns";
import { HeartPulse } from "lucide-react"; // Removed Brain, Sparkles

interface CheckinListProps {
  checkinRecords: WellbeingCheckinRecord[];
}

export function CheckinList({ checkinRecords }: CheckinListProps) {
  const { t, dateLocale } = useTranslation();

  if (!checkinRecords || checkinRecords.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><HeartPulse /> {t('myPage.tabs.checkins')}</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">{t('myPage.noData')}</p>
        </CardContent>
      </Card>
    );
  }

  const formatActivityDisplay = (activityKey: string, otherDetail?: string): string => {
    if (activityKey === 'other') {
      return `${t('activity.other')}${otherDetail ? ` (${otherDetail})` : ''}`;
    }
    return t(`activity.${activityKey}`) || activityKey;
  };


  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2"><HeartPulse /> {t('myPage.tabs.checkins')}</CardTitle>
      </CardHeader>
      <CardContent>
        <Accordion type="multiple" className="w-full">
          {checkinRecords.map((record) => (
            <AccordionItem value={record.id} key={record.id}>
              <AccordionTrigger>
                {t('myPage.checkins.checkedInOn', { date: format(parseISO(record.dateTime), "PP", { locale: dateLocale }) })}
              </AccordionTrigger>
              <AccordionContent className="space-y-4">
                <div>
                  <h4 className="font-semibold text-sm text-muted-foreground">{t('myPage.checkins.stressLevel')}:</h4>
                  <p className="text-sm">{record.input.stressLevel} / 10</p>
                </div>
                <div>
                  <h4 className="font-semibold text-sm text-muted-foreground">{t('myPage.checkins.emotions')}:</h4>
                  <p className="text-sm">
                    {record.input.mainEmotions.map(key => {
                      if (key === 'other') {
                        return `${t('emotion.other')}${record.input.otherEmotionDetail ? ` (${record.input.otherEmotionDetail})` : ''}`;
                      }
                      return t(`emotion.${key}`);
                    }).join(", ")}
                  </p>
                </div>
                <div>
                  <h4 className="font-semibold text-sm text-muted-foreground">{t('myPage.checkins.activities')}:</h4>
                  <p className="text-sm">
                    {record.input.todayActivities.map(activityKey => formatActivityDisplay(activityKey, record.input.otherActivityDetail)).join(", ")}
                  </p>
                </div>
                {record.input.conversationPartner && record.input.conversationPartner.toLowerCase() !== 'none' && (
                  <div>
                    <h4 className="font-semibold text-sm text-muted-foreground">{t('myPage.checkins.conversationPartner')}:</h4>
                    <p className="text-sm">
                        {t(`partner.${record.input.conversationPartner}`)}
                        {record.input.conversationPartner === 'other' && record.input.otherConversationPartnerDetail && ` (${record.input.otherConversationPartnerDetail})`}
                    </p>
                  </div>
                )}
                {record.input.conversationPartner === 'spouse' && record.input.spouseConversationTopics && record.input.spouseConversationTopics.length > 0 && (
                  <div>
                    <h4 className="font-semibold text-sm text-muted-foreground">{t('myPage.checkins.spouseTopics')}:</h4>
                    <p className="text-sm">
                        {record.input.spouseConversationTopics.map(key => {
                           if (key === 'other') {
                             return `${t('spouseTopic.other')}${record.input.otherSpouseTopicDetail ? ` (${record.input.otherSpouseTopicDetail})` : ''}`;
                           }
                           return t(`spouseTopic.${key}`);
                        }).join(", ")}
                    </p>
                  </div>
                )}
                {/* Removed AI output display as record.output will be null */}
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </CardContent>
    </Card>
  );
}

// Add "yes" and "no" to your locale files
// en.json:
// "yes": "Yes",
// "no": "No",

// ko.json:
// "yes": "예",
// "no": "아니오",
