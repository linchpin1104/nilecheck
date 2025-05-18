
"use client";

import { Bar, BarChart, CartesianGrid, XAxis, YAxis, Tooltip as RechartsTooltip } from "recharts";
import {
  ChartConfig,
  ChartContainer,
  ChartTooltipContent,
} from "@/components/ui/chart";
import type { SleepEntry } from "@/types";
import { format, subDays, differenceInHours } from "date-fns";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { BedDouble } from "lucide-react";
import { useTranslation } from "@/hooks/useTranslation";

interface SleepDurationChartProps {
  sleepData: SleepEntry[];
}

export function SleepDurationChart({ sleepData }: SleepDurationChartProps) {
  const { t, dateLocale } = useTranslation();

  const chartConfig = {
    duration: {
      label: t('sleepDurationChart.yAxisLabel'),
      color: "hsl(var(--chart-1))",
    },
  } satisfies ChartConfig;
  
  const processSleepData = () => {
    const last7Days = Array.from({ length: 7 }).map((_, i) => {
      const day = subDays(new Date(), i);
      return {
        date: format(day, "MMM d", { locale: dateLocale }),
        shortDate: format(day, "E", { locale: dateLocale }), 
        duration: 0,
      };
    }).reverse(); 

    sleepData.forEach(entry => {
      const entryDate = format(new Date(entry.startTime), "MMM d", { locale: dateLocale });
      const dayIndex = last7Days.findIndex(d => d.date === entryDate);
      if (dayIndex !== -1) {
        const duration = differenceInHours(new Date(entry.endTime), new Date(entry.startTime));
        last7Days[dayIndex].duration += duration; 
      }
    });
    return last7Days;
  };

  const chartData = processSleepData();

  if (!chartData || chartData.every(d => d.duration === 0)) {
    return (
       <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><BedDouble className="text-primary" /> {t('sleepDurationChart.title')}</CardTitle>
          <CardDescription>{t('sleepDurationChart.description')}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-[200px] flex items-center justify-center text-muted-foreground">
            {t('sleepDurationChart.noData')}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2"><BedDouble className="text-primary" /> {t('sleepDurationChart.title')}</CardTitle>
        <CardDescription>{t('sleepDurationChart.description')}</CardDescription>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig} className="h-[200px] w-full">
          <BarChart accessibilityLayer data={chartData} margin={{ top: 5, right: 20, left: -20, bottom: 5 }}>
            <CartesianGrid vertical={false} />
            <XAxis
              dataKey="shortDate"
              tickLine={false}
              tickMargin={10}
              axisLine={false}
            />
            <YAxis 
              tickFormatter={(value) => `${value}h`}
              allowDecimals={false}
              label={{ value: t('sleepDurationChart.yAxisLabel'), angle: -90, position: 'insideLeft', style: {textAnchor: 'middle'}, dx:-10 }}
            />
            <RechartsTooltip cursor={false} content={<ChartTooltipContent indicator="dot" />} />
            <Bar dataKey="duration" fill="var(--color-duration)" radius={4} />
          </BarChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}
