
"use client";

import * as React from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, Controller } from "react-hook-form";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import { useAppStore } from "@/lib/app-store";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Utensils, BedDouble, Loader2 } from "lucide-react";
import { format, isToday, subDays, formatISO, setHours, setMinutes, setSeconds, setMilliseconds, parseISO } from "date-fns";
import type { MealEntry, SleepEntry } from "@/types";
import { useTranslation } from "@/hooks/useTranslation";
import { useAuth } from "@/contexts/AuthContext";


const mealSchema = z.object({
  type: z.enum(["breakfast", "lunch", "dinner", "snack"], { required_error: "Please select a meal type." }),
  mealTime: z.string({ required_error: "Please select a meal time." }),
  status: z.enum(["eaten", "skipped"], { required_error: "Please select if the meal was eaten or skipped." }),
  description: z.string().optional(),
  quality: z.coerce.number().min(1).max(5).optional(),
}).superRefine((data, ctx) => {
  if (data.status === "eaten") {
    if (!data.description || data.description.trim() === "") {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Description is required if the meal was eaten.", 
        path: ["description"],
      });
    }
    if (data.quality === undefined || data.quality === null) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Meal quality is required if the meal was eaten.", 
        path: ["quality"],
      });
    }
  }
});

const sleepSchema = z.object({
  startTime: z.string().refine((val) => !isNaN(Date.parse(val)), { message: "Invalid start date" }),
  endTime: z.string().refine((val) => !isNaN(Date.parse(val)), { message: "Invalid end date" }),
  quality: z.coerce.number().min(1).max(5), 
  wokeUpDuringNight: z.boolean().default(false),
  wakeUpCount: z.coerce.number().int().min(0).optional(),
}).refine(data => new Date(data.endTime) > new Date(data.startTime), {
  message: "End time must be after start time", 
  path: ["endTime"],
}).superRefine((data, ctx) => {
  if (data.wokeUpDuringNight && (data.wakeUpCount === undefined || data.wakeUpCount < 1)) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "If you woke up, please specify how many times (at least 1).", 
      path: ["wakeUpCount"],
    });
  }
});


interface MealLogFormProps {
  selectedDate: Date;
  onSuccess?: () => void;
  isDisabled?: boolean;
}

export function MealLogForm({ selectedDate, onSuccess, isDisabled = false }: MealLogFormProps) {
  const { addMeal, updateMeal, getMealsOnDate } = useAppStore();
  const { toast } = useToast();
  const { t, dateLocale } = useTranslation();
  const [currentEditingMeal, setCurrentEditingMeal] = React.useState<MealEntry | null>(null);
  const { user, loading: authLoading } = useAuth();
  const [isSaving, setIsSaving] = React.useState(false);
  
  const mealQualityOptions = React.useMemo(() => [
    { label: t("mealLogForm.qualityOption.1"), value: 1 },
    { label: t("mealLogForm.qualityOption.2"), value: 2 },
    { label: t("mealLogForm.qualityOption.3"), value: 3 },
    { label: t("mealLogForm.qualityOption.4"), value: 4 },
    { label: t("mealLogForm.qualityOption.5"), value: 5 },
  ], [t]);

  const mealTypeOptions: { label: string; value: z.infer<typeof mealSchema>['type'] }[] = React.useMemo(() => [
    { label: t("mealLogForm.mealTypeOption.breakfast"), value: "breakfast" },
    { label: t("mealLogForm.mealTypeOption.lunch"), value: "lunch" },
    { label: t("mealLogForm.mealTypeOption.dinner"), value: "dinner" },
    { label: t("mealLogForm.mealTypeOption.snack"), value: "snack" },
  ], [t]);
  
  const mealTimeOptionsDefinition: Record<z.infer<typeof mealSchema>['type'], { label: string; value: string }[]> = React.useMemo(() => ({
    breakfast: [
      { label: t("mealLogForm.mealTime.breakfast.1"), value: "07:00" }, { label: t("mealLogForm.mealTime.breakfast.2"), value: "08:00" },
      { label: t("mealLogForm.mealTime.breakfast.3"), value: "09:00" }, { label: t("mealLogForm.mealTime.breakfast.4"), value: "10:00" },
    ],
    lunch: [
      { label: t("mealLogForm.mealTime.lunch.1"), value: "12:00" }, { label: t("mealLogForm.mealTime.lunch.2"), value: "13:00" },
      { label: t("mealLogForm.mealTime.lunch.3"), value: "14:00" }, { label: t("mealLogForm.mealTime.lunch.4"), value: "15:00" },
    ],
    dinner: [
      { label: t("mealLogForm.mealTime.dinner.1"), value: "18:00" }, { label: t("mealLogForm.mealTime.dinner.2"), value: "19:00" },
      { label: t("mealLogForm.mealTime.dinner.3"), value: "20:00" }, { label: t("mealLogForm.mealTime.dinner.4"), value: "21:00" },
      { label: t("mealLogForm.mealTime.dinner.5"), value: "22:00" },
    ],
    snack: [
      { label: t("mealLogForm.mealTime.snack.1"), value: "10:00" }, 
      { label: t("mealLogForm.mealTime.snack.2"), value: "15:00" },
      { label: t("mealLogForm.mealTime.snack.3"), value: "22:00" },
    ],
  }), [t]);

  const stableGetDefaultMealTimeValue = React.useCallback((mealType: z.infer<typeof mealSchema>['type']): string => {
    return mealTimeOptionsDefinition[mealType]?.[0]?.value || "08:00";
  }, [mealTimeOptionsDefinition]);

  const initialMealType: z.infer<typeof mealSchema>['type'] = "breakfast";

  const form = useForm<z.infer<typeof mealSchema>>({
    resolver: zodResolver(mealSchema),
    defaultValues: {
      type: initialMealType,
      mealTime: stableGetDefaultMealTimeValue(initialMealType),
      status: "eaten",
      description: "",
      quality: 3,
    },
    disabled: isDisabled || authLoading,
  });

  const watchedStatus = form.watch("status");
  const watchedMealType = form.watch("type");
  const watchedMealTime = form.watch("mealTime"); 

  React.useEffect(() => {
    if (isDisabled) {
      if (currentEditingMeal !== null) {
        setTimeout(() => setCurrentEditingMeal(null), 0);
      }
      return;
    }

    const selectedDateStr = formatISO(selectedDate, { representation: 'date' });
    const mealsOnDate = getMealsOnDate(selectedDateStr); 
    
    const existingMealForSlot = mealsOnDate.find(meal => {
        const mealDateTime = parseISO(meal.dateTime);
        const timeParts = watchedMealTime?.split(':');
        if (!timeParts || timeParts.length !== 2) return false;
        const formMealTimeDate = setMinutes(setHours(new Date(0), parseInt(timeParts[0])), parseInt(timeParts[1]));
        
        return meal.type === watchedMealType && 
               mealDateTime.getHours() === formMealTimeDate.getHours() &&
               mealDateTime.getMinutes() === formMealTimeDate.getMinutes();
    });

    if (currentEditingMeal?.id !== existingMealForSlot?.id) {
       setTimeout(() => setCurrentEditingMeal(existingMealForSlot || null), 0);
    }
  }, [
    selectedDate, 
    watchedMealType, 
    watchedMealTime, 
    getMealsOnDate, 
    isDisabled, 
    currentEditingMeal?.id, // Only depend on ID to avoid loop with object itself
    form, // Added form as it's used for form.setValue
    authLoading // Added authLoading as it can affect form state
  ]);

  React.useEffect(() => {
    let targetFormState;
    if (isDisabled) {
      targetFormState = {
        type: initialMealType,
        mealTime: stableGetDefaultMealTimeValue(initialMealType),
        status: "eaten" as "eaten" | "skipped",
        description: "",
        quality: 3,
      };
    } else if (currentEditingMeal) {
        targetFormState = {
            type: currentEditingMeal.type,
            mealTime: format(parseISO(currentEditingMeal.dateTime), "HH:mm"),
            status: currentEditingMeal.status,
            description: currentEditingMeal.description || "",
            quality: currentEditingMeal.quality || 3,
        };
    } else {
        targetFormState = {
            type: watchedMealType || initialMealType,
            mealTime: watchedMealTime || stableGetDefaultMealTimeValue(watchedMealType || initialMealType),
            status: "eaten" as "eaten" | "skipped",
            description: "",
            quality: 3,
        };
    }

    const currentValues = form.getValues();
    const needsReset = 
        currentValues.type !== targetFormState.type ||
        currentValues.mealTime !== targetFormState.mealTime ||
        currentValues.status !== targetFormState.status ||
        (currentValues.description ?? "") !== (targetFormState.description ?? "") || // Handle undefined for description
        currentValues.quality !== targetFormState.quality;

    if (needsReset) {
      setTimeout(() => form.reset(targetFormState), 0);
    }
  }, [
    currentEditingMeal, 
    isDisabled, 
    form, 
    initialMealType, 
    stableGetDefaultMealTimeValue, 
    watchedMealType, 
    watchedMealTime
  ]);

  React.useEffect(() => {
    if (isDisabled || currentEditingMeal || form.formState.isDirty || authLoading) {
      return; 
    }
    if (!watchedMealType) return; 

    const currentMealTimeValue = form.getValues("mealTime");
    const availableTimesForType = mealTimeOptionsDefinition[watchedMealType] || [];
    const defaultTimeForType = stableGetDefaultMealTimeValue(watchedMealType);

    if (!availableTimesForType.find(opt => opt.value === currentMealTimeValue) || currentMealTimeValue !== defaultTimeForType) {
      setTimeout(() => {
        form.setValue("mealTime", defaultTimeForType, { shouldValidate: true, shouldDirty: false });
      }, 0);
    }
  }, [
    watchedMealType,
    isDisabled,
    currentEditingMeal,
    form, 
    stableGetDefaultMealTimeValue,
    mealTimeOptionsDefinition,
    authLoading
  ]);


  async function onSubmit(values: z.infer<typeof mealSchema>) {
     if (!user) {
      toast({
        title: t('auth.required.title'),
        description: t('auth.required.description'),
        variant: "destructive",
      });
      return;
    }
    setIsSaving(true);
    try {
      const [hoursStr, minutesStr] = values.mealTime.split(':');
      const hours = parseInt(hoursStr, 10);
      const minutes = parseInt(minutesStr, 10);

      let dateTimeAtSlotStart = setHours(selectedDate, hours);
      dateTimeAtSlotStart = setMinutes(dateTimeAtSlotStart, minutes);
      dateTimeAtSlotStart = setSeconds(dateTimeAtSlotStart, 0);
      dateTimeAtSlotStart = setMilliseconds(dateTimeAtSlotStart, 0);
      
      const isoDateTime = formatISO(dateTimeAtSlotStart);

      const mealData: Partial<MealEntry> & Pick<MealEntry, 'type' | 'dateTime' | 'status'> = {
        type: values.type,
        dateTime: isoDateTime,
        status: values.status,
      };

      if (values.status === "eaten") {
        mealData.description = values.description;
        mealData.quality = values.quality;
      }
      
      if (currentEditingMeal) {
        await updateMeal({ ...currentEditingMeal, ...mealData } as MealEntry);
        toast({ 
            title: t('mealLogForm.toast.updateSuccess'), 
            description: t('mealLogForm.toast.updateSuccess.description', {type: t(`mealLogForm.mealTypeOption.${values.type}`), date: format(selectedDate, "PP", { locale: dateLocale }) })
        });
      } else {
        await addMeal(mealData as Omit<MealEntry, 'id'>);
        toast({ 
            title: t('mealLogForm.toast.success'), 
            description: t('mealLogForm.toast.success.description', {type: t(`mealLogForm.mealTypeOption.${values.type}`), status: t(`mealLogForm.status.${values.status}`)})
        });
      }
      onSuccess?.();
    } catch (error) {
        console.error("Error submitting meal form:", error);
        toast({ title: t('toast.genericError.title'), description: t('toast.genericError.description'), variant: 'destructive' });
    } finally {
        setIsSaving(false);
    }
  }

  const currentMealTimeOptions = mealTimeOptionsDefinition[watchedMealType] || [];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2"><Utensils className="text-primary"/> {t('mealLogForm.title', { date: format(selectedDate, "MMM d, yyyy", { locale: dateLocale }) })}</CardTitle>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="type"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('mealLogForm.mealType')}</FormLabel>
                  <FormControl>
                    <RadioGroup
                      onValueChange={(value) => {
                        field.onChange(value as z.infer<typeof mealSchema>['type']);
                      }}
                      value={field.value}
                      className="flex flex-wrap gap-x-4 gap-y-2"
                    >
                      {mealTypeOptions.map(opt => (
                        <FormItem key={opt.value} className="flex items-center space-x-2 space-y-0">
                          <FormControl>
                            <RadioGroupItem value={opt.value} id={`meal-type-${opt.value}`} disabled={isDisabled || form.formState.isSubmitting || authLoading || isSaving} />
                          </FormControl>
                          <FormLabel htmlFor={`meal-type-${opt.value}`} className="font-normal cursor-pointer hover:text-primary">
                            {opt.label}
                          </FormLabel>
                        </FormItem>
                      ))}
                    </RadioGroup>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="mealTime"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('mealLogForm.mealTime')}</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value} disabled={isDisabled || form.formState.isSubmitting || authLoading || isSaving}>
                    <FormControl>
                      <SelectTrigger><SelectValue placeholder={t('mealLogForm.selectMealTime')} /></SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {currentMealTimeOptions.map(option => (
                        <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

             <FormField
              control={form.control}
              name="status"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('mealLogForm.status')}</FormLabel>
                  <FormControl>
                    <RadioGroup
                      onValueChange={(value) => {
                        field.onChange(value);
                        if (value === "skipped") {
                          form.setValue("description", undefined);
                          form.setValue("quality", undefined);
                        } else {
                           form.setValue("quality", form.getValues("quality") || 3); 
                        }
                      }}
                      value={field.value}
                      className="flex space-x-4"
                    >
                      <FormItem className="flex items-center space-x-2">
                        <FormControl><RadioGroupItem value="eaten" id="status-eaten" disabled={isDisabled || form.formState.isSubmitting || authLoading || isSaving}/></FormControl>
                        <FormLabel htmlFor="status-eaten" className="font-normal cursor-pointer">{t('mealLogForm.status.eaten')}</FormLabel>
                      </FormItem>
                      <FormItem className="flex items-center space-x-2">
                        <FormControl><RadioGroupItem value="skipped" id="status-skipped" disabled={isDisabled || form.formState.isSubmitting || authLoading || isSaving}/></FormControl>
                        <FormLabel htmlFor="status-skipped" className="font-normal cursor-pointer">{t('mealLogForm.status.skipped')}</FormLabel>
                      </FormItem>
                    </RadioGroup>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {watchedStatus === "eaten" && (
              <>
                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('mealLogForm.description')}</FormLabel>
                      <FormControl><Textarea placeholder={t('mealLogForm.description.placeholder')} {...field} value={field.value ?? ""} disabled={isDisabled || form.formState.isSubmitting || authLoading || isSaving} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="quality"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('mealLogForm.quality')}</FormLabel>
                      <FormControl>
                        <RadioGroup
                          onValueChange={(value) => field.onChange(Number(value))}
                          value={String(field.value ?? "")}
                          className="flex flex-wrap gap-x-4 gap-y-2"
                        >
                          {mealQualityOptions.map(opt => (
                            <FormItem key={opt.value} className="flex items-center space-x-2 space-y-0">
                              <FormControl>
                                <RadioGroupItem value={String(opt.value)} id={`meal-quality-${opt.value}`} disabled={isDisabled || form.formState.isSubmitting || authLoading || isSaving}/>
                              </FormControl>
                              <FormLabel htmlFor={`meal-quality-${opt.value}`} className="font-normal cursor-pointer hover:text-primary">
                                {opt.label}
                              </FormLabel>
                            </FormItem>
                          ))}
                        </RadioGroup>
                      </FormControl>
                      <FormDescription>{t('mealLogForm.quality.description')}</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </>
            )}
            <Button 
              type="submit" 
              className="w-full sm:w-auto" 
              disabled={isDisabled || form.formState.isSubmitting || authLoading || isSaving || !user}
            >
                {(authLoading || form.formState.isSubmitting || isSaving) && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {currentEditingMeal ? t('mealLogForm.updateMealButton') : t('mealLogForm.logMealButton')}
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}

const useStableSleepDefaultTimes = (selectedDate: Date) => {
  return React.useMemo(() => {
    const sleepEndTime = setMilliseconds(setSeconds(setMinutes(setHours(new Date(selectedDate), 6), 0), 0), 0);
    const sleepStartTime = setMilliseconds(setSeconds(setMinutes(setHours(subDays(new Date(selectedDate), 1), 22), 0), 0), 0);
    
    return {
      startTime: format(sleepStartTime, "yyyy-MM-dd'T'HH:mm"),
      endTime: format(sleepEndTime, "yyyy-MM-dd'T'HH:mm"),
    };
  }, [selectedDate]);
};


interface SleepLogFormProps {
  selectedDate: Date;
  onSuccess?: () => void;
  isDisabled?: boolean;
}

export function SleepLogForm({ selectedDate, onSuccess, isDisabled = false }: SleepLogFormProps) {
  const { addSleep, updateSleep, getSleepEntryForNightOf } = useAppStore();
  const { toast } = useToast();
  const { t, dateLocale } = useTranslation();
  const [currentEditingSleep, setCurrentEditingSleep] = React.useState<SleepEntry | null>(null);
  const { user, loading: authLoading } = useAuth();
  const [isSaving, setIsSaving] = React.useState(false);

  const sleepQualityRatingOptions = React.useMemo(() => [
    { label: t("mealLogForm.qualityOption.1"), value: 1 },
    { label: t("mealLogForm.qualityOption.2"), value: 2 },
    { label: t("mealLogForm.qualityOption.3"), value: 3 },
    { label: t("mealLogForm.qualityOption.4"), value: 4 },
    { label: t("mealLogForm.qualityOption.5"), value: 5 },
  ], [t]);

  const stableGetSleepDefaultTimes = useStableSleepDefaultTimes(selectedDate);

  const form = useForm<z.infer<typeof sleepSchema>>({
    resolver: zodResolver(sleepSchema),
    defaultValues: {
      ...stableGetSleepDefaultTimes,
      quality: 3,
      wokeUpDuringNight: false,
      wakeUpCount: 0,
    },
    disabled: isDisabled || authLoading,
  });

  const watchedWokeUp = form.watch("wokeUpDuringNight");

  React.useEffect(() => {
    if (!watchedWokeUp) {
      form.setValue("wakeUpCount", 0);
      form.clearErrors("wakeUpCount");
    }
  }, [watchedWokeUp, form]);
  
  React.useEffect(() => {
    // Effect 1: Determine current editing sleep entry
    if (isDisabled || authLoading) {
      if (currentEditingSleep !== null) {
        setTimeout(() => setCurrentEditingSleep(null), 0);
      }
      return;
    }

    const selectedDateStr = formatISO(selectedDate, { representation: 'date' });
    const existingSleepForNight = getSleepEntryForNightOf(selectedDateStr); 
    
    if (currentEditingSleep?.id !== existingSleepForNight?.id) {
      setTimeout(() => setCurrentEditingSleep(existingSleepForNight || null), 0);
    }
  }, [selectedDate, getSleepEntryForNightOf, isDisabled, currentEditingSleep?.id, form, authLoading]);


  React.useEffect(() => {
    // Effect 2: Sync form state with currentEditingSleep or defaults
    let targetFormState;

    if (isDisabled) {
      targetFormState = {
        ...stableGetSleepDefaultTimes, 
        quality: 3,
        wokeUpDuringNight: false,
        wakeUpCount: 0,
      };
    } else if (currentEditingSleep) {
        targetFormState = {
            startTime: format(parseISO(currentEditingSleep.startTime), "yyyy-MM-dd'T'HH:mm"),
            endTime: format(parseISO(currentEditingSleep.endTime), "yyyy-MM-dd'T'HH:mm"),
            quality: currentEditingSleep.quality,
            wokeUpDuringNight: currentEditingSleep.wokeUpDuringNight || false,
            wakeUpCount: currentEditingSleep.wakeUpCount || 0,
        };
    } else {
        targetFormState = {
            ...stableGetSleepDefaultTimes, 
            quality: 3,
            wokeUpDuringNight: false,
            wakeUpCount: 0,
        };
    }
    
    const currentValues = form.getValues();
    const needsReset = 
        currentValues.startTime !== targetFormState.startTime ||
        currentValues.endTime !== targetFormState.endTime ||
        currentValues.quality !== targetFormState.quality ||
        currentValues.wokeUpDuringNight !== targetFormState.wokeUpDuringNight ||
        (currentValues.wakeUpCount ?? 0) !== (targetFormState.wakeUpCount ?? 0);

    if (needsReset) {
       setTimeout(() => form.reset(targetFormState), 0);
    }
  }, [currentEditingSleep, isDisabled, form, stableGetSleepDefaultTimes]);


  async function onSubmit(values: z.infer<typeof sleepSchema>) {
     if (!user) {
      toast({
        title: t('auth.required.title'),
        description: t('auth.required.description'),
        variant: "destructive",
      });
      return;
    }
    setIsSaving(true);
    try {
      const dataToStore: Omit<SleepEntry, 'id'> & {id?: string} = { ...values };
      if (!dataToStore.wokeUpDuringNight) {
        dataToStore.wakeUpCount = 0;
      }

      if (currentEditingSleep) {
          await updateSleep({ ...currentEditingSleep, ...dataToStore } as SleepEntry);
          toast({ 
              title: t('sleepLogForm.toast.updateSuccess'), 
              description: t('sleepLogForm.toast.updateSuccess.description', { date: format(selectedDate, "PP", { locale: dateLocale })}) 
          });
      } else {
          await addSleep(dataToStore as Omit<SleepEntry, 'id'>);
          toast({ title: t('sleepLogForm.toast.success'), description: t('sleepLogForm.toast.success.description') });
      }
      onSuccess?.();
    } catch (error) {
        console.error("Error submitting sleep form:", error);
        toast({ title: t('toast.genericError.title'), description: t('toast.genericError.description'), variant: 'destructive' });
    } finally {
        setIsSaving(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
            <BedDouble className="text-primary"/> 
            {t('sleepLogForm.title', { 
                startDate: format(subDays(selectedDate,1), "MMM d", { locale: dateLocale }), 
                endDate: format(selectedDate, "MMM d, yyyy", { locale: dateLocale }) 
            })}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="startTime"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('sleepLogForm.startTime')}</FormLabel>
                  <FormControl><Input type="datetime-local" {...field} disabled={isDisabled || form.formState.isSubmitting || authLoading || isSaving} /></FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="endTime"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('sleepLogForm.endTime')}</FormLabel>
                  <FormControl><Input type="datetime-local" {...field} disabled={isDisabled || form.formState.isSubmitting || authLoading || isSaving} /></FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="quality"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('sleepLogForm.quality')}</FormLabel>
                  <FormControl>
                     <RadioGroup
                        onValueChange={(value) => field.onChange(Number(value))}
                        value={String(field.value)}
                        className="flex flex-wrap gap-x-4 gap-y-2"
                      >
                        {sleepQualityRatingOptions.map(opt => (
                          <FormItem key={opt.value} className="flex items-center space-x-2 space-y-0">
                            <FormControl>
                              <RadioGroupItem value={String(opt.value)} id={`sleep-log-quality-${opt.value}`} disabled={isDisabled || form.formState.isSubmitting || authLoading || isSaving}/>
                            </FormControl>
                            <FormLabel htmlFor={`sleep-log-quality-${opt.value}`} className="font-normal cursor-pointer hover:text-primary">
                              {opt.label}
                            </FormLabel>
                          </FormItem>
                        ))}
                      </RadioGroup>
                  </FormControl>
                   <FormDescription>{t('sleepLogForm.quality.description')}</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
             <FormField
              control={form.control}
              name="wokeUpDuringNight"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center space-x-3 space-y-0 rounded-md border p-3 shadow-sm">
                  <FormControl>
                    <Checkbox
                      checked={field.value}
                      onCheckedChange={field.onChange}
                      disabled={isDisabled || form.formState.isSubmitting || authLoading || isSaving}
                    />
                  </FormControl>
                  <div className="space-y-1 leading-none">
                    <FormLabel>
                     {t('sleepLogForm.wokeUpDuringNight')}
                    </FormLabel>
                  </div>
                </FormItem>
              )}
            />
            {watchedWokeUp && (
              <FormField
                control={form.control}
                name="wakeUpCount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('sleepLogForm.wakeUpCount')}</FormLabel>
                    <FormControl>
                      <Input 
                        type="number" 
                        placeholder={t('sleepLogForm.wakeUpCount.placeholder')}
                        {...field} 
                        onChange={e => field.onChange(parseInt(e.target.value, 10) || 0)}
                        value={field.value ?? ""}
                        disabled={isDisabled || form.formState.isSubmitting || authLoading || isSaving}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}
            <Button 
              type="submit" 
              className="w-full sm:w-auto" 
              disabled={isDisabled || form.formState.isSubmitting || authLoading || isSaving || !user}
            >
                {(authLoading || form.formState.isSubmitting || isSaving) && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {currentEditingSleep ? t('sleepLogForm.updateSleepButton') : t('sleepLogForm.logSleepButton')}
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}

