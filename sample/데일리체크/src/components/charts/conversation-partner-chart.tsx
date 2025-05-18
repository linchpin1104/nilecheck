
"use client";

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer } from "recharts";
import {
  ChartConfig,
  ChartContainer,
  ChartTooltipContent,
} from "@/components/ui/chart";
import type { WellbeingCheckinRecord } from "@/types";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Users } from "lucide-react";
import { useTranslation } from "@/hooks/useTranslation";
import * as React from "react";

interface ConversationPartnerChartProps {
  checkinData: WellbeingCheckinRecord[];
}

export function ConversationPartnerChart({ checkinData }: ConversationPartnerChartProps) {
  const { t } = useTranslation();

   const chartConfig = React.useMemo(() => ({
    count: {
      label: t('charts.common.count'),
      color: "hsl(var(--chart-2))",
    },
  }), [t]);

  const partnerCounts = React.useMemo(() => {
    const counts: Record<string, number> = {};
    checkinData.forEach(record => {
      const partnerKey = record.input.conversationPartner;
      if (partnerKey && partnerKey !== 'none') { // Exclude 'none'
        counts[partnerKey] = (counts[partnerKey] || 0) + 1;
      }
    });
    return Object.entries(counts)
      .map(([key, count]) => ({
        name: (key === 'other' && checkinData.find(c => c.input.conversationPartner === 'other')?.input.otherConversationPartnerDetail) 
              ? `${t(`partner.${key}`)} (${checkinData.find(c => c.input.conversationPartner === 'other')?.input.otherConversationPartnerDetail || 'Detail'})`
              : t(`partner.${key}`) || key,
        count,
        key
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 3); // Show top 3 partners
  }, [checkinData, t]);

  if (!checkinData || checkinData.length === 0 || partnerCounts.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Users className="text-primary" /> {t('charts.conversationPartner.title')}</CardTitle>
          <CardDescription>{t('charts.conversationPartner.description')}</CardDescription>
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
        <CardTitle className="flex items-center gap-2"><Users className="text-primary" /> {t('charts.conversationPartner.title')}</CardTitle>
        <CardDescription>{t('charts.conversationPartner.description')}</CardDescription>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig} className="h-[250px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart 
              data={partnerCounts}
              layout="vertical"
              margin={{
                top: 5,
                right: 20,
                left: 20, // Adjusted for longer labels
                bottom: 5,
              }}
            >
              <CartesianGrid horizontal={false} />
              <XAxis 
                type="number" 
                dataKey="count" 
                allowDecimals={false} 
                label={{ value: t('charts.common.count'), position: 'insideBottomRight', offset: 0, dy: 10 }} 
              />
              <YAxis 
                type="category" 
                dataKey="name" 
                width={100} 
                interval={0}
              />
              <RechartsTooltip 
                cursor={{ fill: "hsl(var(--muted))" }} 
                content={<ChartTooltipContent hideLabel />} 
              />
              <Bar dataKey="count" fill="var(--color-count)" radius={[0, 4, 4, 0]} barSize={30} />
            </BarChart>
          </ResponsiveContainer>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}

