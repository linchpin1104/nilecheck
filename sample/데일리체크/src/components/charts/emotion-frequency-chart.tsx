
"use client";

import type { WellbeingCheckinRecord } from "@/types";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Smile } from "lucide-react";
import { useTranslation } from "@/hooks/useTranslation";
import * as React from "react";

interface EmotionFrequencyChartProps {
  checkinData: WellbeingCheckinRecord[];
}

// Helper to extract key from "Display Name (Key)" format or just the key itself
const extractEmotionKey = (emotionString: string): string => {
  const match = emotionString.match(/\(([^)]+)\)$/);
  if (match && match[1]) {
    // Handles "Joy (joy)" -> "joy"
    return match[1].toLowerCase();
  }
  // Fallback for simple strings (keys) or if format is different
  const knownEmotionKeys = ["joy", "sadness", "anger", "anxiety", "calmness", "gratitude", "stress", "hope", "tiredness", "excitement", "other"];
  const lowerEmotionString = emotionString.toLowerCase();
  const foundKey = knownEmotionKeys.find(k => lowerEmotionString.includes(k));
  return foundKey || emotionString.toLowerCase(); // return original string (lowercased) if no key found
};

const emotionDisplayConfig: Record<string, { emoji: string; labelKey: string }> = {
  joy: { emoji: "😊", labelKey: "emotion.joy" },
  sadness: { emoji: "😢", labelKey: "emotion.sadness" },
  anger: { emoji: "😠", labelKey: "emotion.anger" },
  anxiety: { emoji: "😟", labelKey: "emotion.anxiety" },
  calmness: { emoji: "😌", labelKey: "emotion.calmness" },
  gratitude: { emoji: "🙏", labelKey: "emotion.gratitude" },
  stress: { emoji: "😫", labelKey: "emotion.stress" },
  hope: { emoji: "✨", labelKey: "emotion.hope" },
  tiredness: { emoji: "😴", labelKey: "emotion.tiredness" },
  excitement: { emoji: "🎉", labelKey: "emotion.excitement" },
  other: { emoji: "✍️", labelKey: "emotion.other" },
};


export function EmotionFrequencyChart({ checkinData }: EmotionFrequencyChartProps) {
  const { t } = useTranslation();

  const emotionDataForDisplay = React.useMemo(() => {
    const counts: Record<string, number> = {};
    checkinData.forEach(record => {
      record.input.mainEmotions?.forEach(emotionStrOrKey => {
        const key = extractEmotionKey(emotionStrOrKey);
        counts[key] = (counts[key] || 0) + 1;
      });
    });
    
    return Object.entries(counts)
      .map(([key, count]) => {
        const config = emotionDisplayConfig[key] || { emoji: '❓', labelKey: key };
        return {
          key,
          name: t(config.labelKey) || key.charAt(0).toUpperCase() + key.slice(1),
          count,
          emoji: config.emoji,
        };
      })
      .sort((a, b) => b.count - a.count)
      .slice(0, 5); // Show top 5 emotions
  }, [checkinData, t]);

  if (!checkinData || checkinData.length === 0 || emotionDataForDisplay.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Smile className="text-primary" /> {t('charts.emotionFrequency.title')}</CardTitle>
          <CardDescription>{t('charts.emotionFrequency.description')}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-[150px] flex items-center justify-center text-muted-foreground">
            {t('charts.common.noData')}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2"><Smile className="text-primary" /> {t('charts.emotionFrequency.title')}</CardTitle>
        <CardDescription>{t('charts.emotionFrequency.description')}</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 py-4">
          {emotionDataForDisplay.map((emotion) => (
            <div key={emotion.key} className="flex flex-col items-center p-3 border rounded-lg shadow-sm bg-card hover:shadow-md transition-shadow">
              <span className="text-4xl mb-2" aria-label={emotion.name}>{emotion.emoji}</span>
              <span className="text-sm font-medium text-center text-card-foreground">{emotion.name}</span>
              <span className="text-xs text-muted-foreground">{t('charts.common.count')}: {emotion.count}</span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
