
"use client";

import type { MealEntry } from "@/types";
import { useTranslation } from "@/hooks/useTranslation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { format, parseISO } from "date-fns";
import { Utensils } from "lucide-react";

interface MealListProps {
  meals: MealEntry[];
}

export function MealList({ meals }: MealListProps) {
  const { t, dateLocale } = useTranslation();

  if (!meals || meals.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Utensils /> {t('myPage.tabs.meals')}</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">{t('myPage.noData')}</p>
        </CardContent>
      </Card>
    );
  }

  const getMealQualityLabel = (qualityValue?: number) => {
    if (qualityValue === undefined || qualityValue === null) return '-';
    const key = `mealLogForm.qualityOption.${qualityValue}`;
    // Assuming 'mealLogForm.qualityOption.X' exists and returns "Label (X)"
    // We want to extract "Label"
    const fullLabel = t(key);
    return fullLabel.substring(0, fullLabel.lastIndexOf(" (")).trim() || String(qualityValue);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2"><Utensils /> {t('myPage.tabs.meals')}</CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t('myPage.meals.table.date')}</TableHead>
              <TableHead>{t('myPage.meals.table.type')}</TableHead>
              <TableHead>{t('myPage.meals.table.status')}</TableHead>
              <TableHead className="hidden sm:table-cell">{t('myPage.meals.table.description')}</TableHead>
              <TableHead>{t('myPage.meals.table.quality')}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {meals.map((meal) => (
              <TableRow key={meal.id}>
                <TableCell>{format(parseISO(meal.dateTime), "PPpp", { locale: dateLocale })}</TableCell>
                <TableCell>{t(`mealLogForm.mealTypeOption.${meal.type}`)}</TableCell>
                <TableCell>{t(`mealLogForm.status.${meal.status}`)}</TableCell>
                <TableCell className="hidden sm:table-cell">{meal.description || "-"}</TableCell>
                <TableCell>{meal.status === 'eaten' ? getMealQualityLabel(meal.quality) : "-"}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
