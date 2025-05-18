
"use client";

import { Pie, PieChart, Tooltip as RechartsTooltip, ResponsiveContainer, Cell } from "recharts";
import {
  ChartConfig,
  ChartContainer,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent
} from "@/components/ui/chart";
import type { WellbeingCheckinRecord } from "@/types";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ListChecks } from "lucide-react";
import { useTranslation } from "@/hooks/useTranslation";
import * as React from "react";

interface CheckinActivityBreakdownChartProps {
  checkinData: WellbeingCheckinRecord[];
}

const chartColors = [
  "hsl(var(--chart-1))",
  "hsl(var(--chart-2))",
  "hsl(var(--chart-3))",
  "hsl(var(--chart-4))",
  "hsl(var(--chart-5))",
  "hsl(var(--chart-1) / 0.7)",
  "hsl(var(--chart-2) / 0.7)",
  "hsl(var(--chart-3) / 0.7)",
  "hsl(var(--chart-4) / 0.7)",
  "hsl(var(--chart-5) / 0.7)",
];


export function CheckinActivityBreakdownChart({ checkinData }: CheckinActivityBreakdownChartProps) {
  const { t } = useTranslation();

  const activityCounts = React.useMemo(() => {
    const counts: Record<string, number> = {};
    checkinData.forEach(record => {
      record.input.todayActivities?.forEach(activityKey => { 
        counts[activityKey] = (counts[activityKey] || 0) + 1;
      });
    });
    return counts;
  }, [checkinData]);

  const chartData = React.useMemo(() => 
    Object.entries(activityCounts)
      .map(([activityKey, value], index) => {
        let name = t(`activity.${activityKey}`);
        if (activityKey === "other" && checkinData.some(c => c.input.todayActivities.includes("other") && c.input.otherActivityDetail)) {
            // If there are "other" activities with details, we might list them separately or aggregate.
            // For this chart, we'll keep it simple and label it as "Other".
            // Detailed breakdown of "other" activities could be a separate table or chart.
            name = t("activity.other") || "Other";
        } else if (activityKey === "other") {
            name = t("activity.other") || "Other";
        }
        
        return {
          key: activityKey, 
          name: name || activityKey.charAt(0).toUpperCase() + activityKey.slice(1),
          value,
          fill: chartColors[index % chartColors.length],
        };
      })
      .sort((a, b) => b.value - a.value) 
  , [activityCounts, t, checkinData]); // Added checkinData to dependencies for "other" logic
  
  const chartConfig = React.useMemo(() => {
    const config: ChartConfig = {};
    chartData.forEach(item => {
      config[item.key] = { 
        label: item.name, 
        color: item.fill,
      };
    });
    return config;
  }, [chartData]);


  if (!checkinData || checkinData.length === 0 || chartData.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><ListChecks className="text-primary" /> {t('charts.checkinActivityBreakdown.title')}</CardTitle>
          <CardDescription>{t('charts.checkinActivityBreakdown.description')}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-[250px] flex items-center justify-center text-muted-foreground">
            {t('charts.common.noData')}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2"><ListChecks className="text-primary" /> {t('charts.checkinActivityBreakdown.title')}</CardTitle>
        <CardDescription>{t('charts.checkinActivityBreakdown.description')}</CardDescription>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig} className="h-[250px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <RechartsTooltip content={<ChartTooltipContent nameKey="name" hideLabel />} />
              <Pie
                data={chartData}
                dataKey="value"
                nameKey="name" 
                cx="50%"
                cy="50%"
                outerRadius={80}
                labelLine={false}
                label={({ cx, cy, midAngle, innerRadius, outerRadius, percent, index }) => {
                  const RADIAN = Math.PI / 180;
                  const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
                  const x = cx + radius * Math.cos(-midAngle * RADIAN);
                  const y = cy + radius * Math.sin(-midAngle * RADIAN);
                  if ( (percent*100) < 5 ) return null; 
                  return (
                    <text x={x} y={y} fill="white" textAnchor={x > cx ? 'start' : 'end'} dominantBaseline="central" fontSize="10px">
                      {`${(percent * 100).toFixed(0)}%`}
                    </text>
                  );
                }}
              >
                {chartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.fill} />
                ))}
              </Pie>
               <ChartLegend content={<ChartLegendContent nameKey="name" className="flex-wrap justify-center"/>} /> 
            </PieChart>
          </ResponsiveContainer>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}

