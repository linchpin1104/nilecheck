
"use client";

import type { SleepEntry } from "@/types";
import { useTranslation } from "@/hooks/useTranslation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { format, parseISO, differenceInHours, differenceInMinutes } from "date-fns";
import { BedDouble } from "lucide-react";

interface SleepListProps {
  sleepEntries: SleepEntry[];
}

export function SleepList({ sleepEntries }: SleepListProps) {
  const { t, dateLocale } = useTranslation();

  if (!sleepEntries || sleepEntries.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><BedDouble /> {t('myPage.tabs.sleep')}</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">{t('myPage.noData')}</p>
        </CardContent>
      </Card>
    );
  }
  
  const getSleepQualityLabel = (qualityValue: number) => {
    const key = `mealLogForm.qualityOption.${qualityValue}`; // Reusing meal quality keys
    const fullLabel = t(key);
    return fullLabel.substring(0, fullLabel.lastIndexOf(" (")).trim() || String(qualityValue);
  };

  const formatDuration = (startTime: string, endTime: string): string => {
    try {
        const start = parseISO(startTime);
        const end = parseISO(endTime);
        const totalMinutes = differenceInMinutes(end, start);
        const hours = Math.floor(totalMinutes / 60);
        const minutes = totalMinutes % 60;
        if (hours > 0 && minutes > 0) {
            return `${hours}h ${minutes}m`;
        } else if (hours > 0) {
            return `${hours}h`;
        } else {
            return `${minutes}m`;
        }
    } catch (e) {
        return "N/A";
    }
  };


  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2"><BedDouble /> {t('myPage.tabs.sleep')}</CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t('myPage.sleep.table.date')}</TableHead>
              <TableHead>{t('myPage.sleep.table.duration')}</TableHead>
              <TableHead>{t('myPage.sleep.table.quality')}</TableHead>
              <TableHead className="hidden sm:table-cell">{t('myPage.sleep.table.wokeUp')}</TableHead>
              <TableHead className="hidden sm:table-cell">{t('myPage.sleep.table.wakeUpCount')}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sleepEntries.map((sleep) => (
              <TableRow key={sleep.id}>
                <TableCell>
                    {format(parseISO(sleep.startTime), "MMM d", { locale: dateLocale })} - {format(parseISO(sleep.endTime), "MMM d, yyyy", { locale: dateLocale })}
                    <p className="text-xs text-muted-foreground">
                        {format(parseISO(sleep.startTime), "p", { locale: dateLocale })} - {format(parseISO(sleep.endTime), "p", { locale: dateLocale })}
                    </p>
                </TableCell>
                <TableCell>{formatDuration(sleep.startTime, sleep.endTime)}</TableCell>
                <TableCell>{getSleepQualityLabel(sleep.quality)}</TableCell>
                <TableCell className="hidden sm:table-cell">{sleep.wokeUpDuringNight ? t('yes') : t('no')}</TableCell>
                <TableCell className="hidden sm:table-cell">{sleep.wokeUpDuringNight ? sleep.wakeUpCount : "-"}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
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
