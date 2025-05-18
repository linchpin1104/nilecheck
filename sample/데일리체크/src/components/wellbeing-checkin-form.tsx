
// src/components/wellbeing-checkin-form.tsx
"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
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
import { Slider } from "@/components/ui/slider";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import React, { useState, type Dispatch, type SetStateAction } from "react";
import type { WellbeingCheckinInputData } from "@/types";
import { Loader2 } from "lucide-react";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useTranslation } from "@/hooks/useTranslation";
import { Checkbox } from "@/components/ui/checkbox";
import { format } from "date-fns";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";


const wellbeingSchema = z.object({
  stressLevel: z.number().min(1).max(10),
  mainEmotions: z.array(z.string()).min(1, "Select at least one emotion.").max(3, "Select up to 3 emotions."),
  otherEmotionDetail: z.string().optional(),
  todayActivities: z.array(z.string()).min(1, "Select at least one activity."),
  otherActivityDetail: z.string().optional(),
  conversationPartner: z.enum(['friend', 'spouse', 'parents', 'colleague', 'other', 'none']).optional(),
  otherConversationPartnerDetail: z.string().optional(),
  spouseConversationTopics: z.array(z.string()).optional(),
  otherSpouseTopicDetail: z.string().optional(),
}).refine(data => {
  if (data.conversationPartner === 'other' && !data.otherConversationPartnerDetail?.trim()) {
    return false;
  }
  return true;
}, {
  message: "If 'Other' partner is selected, please provide details.",
  path: ["otherConversationPartnerDetail"],
}).refine(data => {
  if (data.conversationPartner === 'spouse' && data.spouseConversationTopics?.includes('other') && !data.otherSpouseTopicDetail?.trim()) {
    return false;
  }
  return true;
}, {
  message: "If 'Other topic' with spouse is selected, please provide details.",
  path: ["otherSpouseTopicDetail"],
}).refine(data => {
  if (data.mainEmotions.includes("other") && !data.otherEmotionDetail?.trim()) {
    return false;
  }
  return true;
}, {
  message: "If 'Other' emotion is selected, please provide details.",
  path: ["otherEmotionDetail"],
}).refine(data => {
  if (data.todayActivities.includes("other") && !data.otherActivityDetail?.trim()) {
    return false;
  }
  return true;
}, {
  message: "If 'Other' activity is selected, please provide details.",
  path: ["otherActivityDetail"],
});


interface WellbeingCheckinFormProps {
  selectedDate: Date; 
  onCheckinComplete: (input: WellbeingCheckinInputData) => void;
  isDisabled?: boolean;
}

export function WellbeingCheckinForm({ selectedDate, onCheckinComplete, isDisabled = false }: WellbeingCheckinFormProps) {
  const { t, dateLocale } = useTranslation();
  const [isSubmitting, setIsSubmitting] = useState(false); // Renamed to isSaving for clarity
  const [isSaving, setIsSaving] = React.useState(false);
  const { user, loading: authLoading } = useAuth();
  const { toast } = useToast();


  const emotionConfig: { value: string; emoji: string }[] = [
    { value: "joy", emoji: "😊" }, { value: "sadness", emoji: "😢" },
    { value: "anger", emoji: "😠" }, { value: "anxiety", emoji: "😟" },
    { value: "calmness", emoji: "😌" }, { value: "gratitude", emoji: "🙏" },
    { value: "stress", emoji: "😫" }, { value: "hope", emoji: "✨" },
    { value: "tiredness", emoji: "😴" }, { value: "excitement", emoji: "🎉" },
    { value: "other", emoji: "✍️" },
  ];

  const activityOptions: { key: string; emoji: string; labelKey: string }[] = [
    { key: "exercise", emoji: "🏃‍♀️", labelKey: "activity.exercise" },
    { key: "relaxation", emoji: "🧘", labelKey: "activity.relaxation" },
    { key: "hobbies", emoji: "🎨", labelKey: "activity.hobbies" },
    { key: "socializing", emoji: "💬", labelKey: "activity.socializing" },
    { key: "householdChores", emoji: "🧹", labelKey: "activity.householdChores" },
    { key: "childcare", emoji: "👶", labelKey: "activity.childcare" },
    { key: "workStudy", emoji: "💼", labelKey: "activity.workStudy" },
    { key: "selfCare", emoji: "💅", labelKey: "activity.selfCare" },
    { key: "outdoors", emoji: "🌳", labelKey: "activity.outdoors" },
    { key: "errands", emoji: "🛒", labelKey: "activity.errands" },
    { key: "other", emoji: "✍️", labelKey: "activity.other" },
  ];


  const conversationPartnerConfig: WellbeingCheckinInputData['conversationPartner'][] = [
    'friend', 'spouse', 'parents', 'colleague', 'other', 'none'
  ];

  const spouseTopicConfig = [
    "dailyChat", "kidsTalk", "difficulties",
    "futurePlans", "finances", "hobbiesLeisure", "other"
  ];

  const form = useForm<z.infer<typeof wellbeingSchema>>({
    resolver: zodResolver(wellbeingSchema),
    defaultValues: {
      stressLevel: 5,
      mainEmotions: [],
      otherEmotionDetail: "",
      todayActivities: [],
      otherActivityDetail: "",
      conversationPartner: 'none',
      otherConversationPartnerDetail: "",
      spouseConversationTopics: [],
      otherSpouseTopicDetail: "",
    },
    disabled: isDisabled || authLoading,
  });

  const watchedConversationPartner = form.watch("conversationPartner");
  const watchedSpouseTopics = form.watch("spouseConversationTopics");
  const watchedMainEmotions = form.watch("mainEmotions");
  const watchedTodayActivities = form.watch("todayActivities");

  React.useEffect(() => {
    if (isDisabled) {
        form.reset({ 
            stressLevel: 5,
            mainEmotions: [],
            otherEmotionDetail: "",
            todayActivities: [],
            otherActivityDetail: "",
            conversationPartner: 'none',
            otherConversationPartnerDetail: "",
            spouseConversationTopics: [],
            otherSpouseTopicDetail: "",
        });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isDisabled, form.reset]);


  async function onSubmit(values: z.infer<typeof wellbeingSchema>) {
    if (isDisabled) return;
    if (!user) {
      toast({
        title: t('auth.required.title'),
        description: t('auth.required.description'),
        variant: "destructive",
      });
      setIsSubmitting(false);
      return;
    }
    setIsSaving(true);
    try {
      // The AI flow `wellbeingCheckin` expects descriptive strings for emotions, activities, etc.
      // including details for "Other" options directly in the string.
      // This transformation ensures the AI receives data in the intended format.
      const payloadForAI: WellbeingCheckinInputData = {
        stressLevel: values.stressLevel,
        mainEmotions: values.mainEmotions.map(key => {
            const emotionLabel = t(`emotion.${key}`); 
            // If 'other' is selected and detail is provided, include it in the string
            if (key === 'other' && values.otherEmotionDetail) {
              return `${emotionLabel} (${values.otherEmotionDetail})`; 
            }
            // Otherwise, just use the key or label. AI prompt might prefer keys if known.
            return `${emotionLabel} (${key})`; // Example: "기쁨 (joy)" or "Joy (joy)"
          }),
        todayActivities: values.todayActivities.map(key => {
          const activityLabel = t(`activity.${key}`); 
          if (key === 'other' && values.otherActivityDetail) {
            return `${activityLabel} (${values.otherActivityDetail})`;
          }
          return `${activityLabel} (${key})`; // Example: "운동 (exercise)"
        }),
        // Handle conversation partner similarly, embedding "Other" details.
        conversationPartner: values.conversationPartner ? 
          (values.conversationPartner === 'other' ? `Other (${values.otherConversationPartnerDetail})` : `${t(`partner.${values.conversationPartner}`)} (${values.conversationPartner})`) 
          : undefined,
        // Handle spouse conversation topics, embedding "Other" details for topics.
        spouseConversationTopics: values.conversationPartner === 'spouse' ? values.spouseConversationTopics?.map(key => {
          const topicLabel = t(`spouseTopic.${key}`);
          if (key === 'other' && values.otherSpouseTopicDetail) {
            return `${topicLabel} (${values.otherSpouseTopicDetail})`;
          }
          return `${topicLabel} (${key})`;
        }) : undefined,
        // Explicitly pass other details if needed, but AI prompt might infer from above.
        // The AI prompt is designed to handle these embedded details.
      };
      
      // Clean up unnecessary details for the AI payload if "other" wasn't selected.
      // This aligns with the AI flow's expectation (wellbeing-checkin.ts)
      if (!values.mainEmotions?.some(e => e === "other")) { // Check against raw key "other"
        delete payloadForAI.otherEmotionDetail;
      }
       if (!values.todayActivities.includes('other')) { // Check against raw key "other"
        delete payloadForAI.otherActivityDetail;
      }
      if (values.conversationPartner !== 'other') {
        delete payloadForAI.otherConversationPartnerDetail;
      }
      if (values.conversationPartner !== 'spouse' || !values.spouseConversationTopics?.includes('other')) {
         delete payloadForAI.otherSpouseTopicDetail;
      }


      // Data to be stored in Firestore (prefers raw keys for consistency and easier querying/filtering)
      const dataToStore: WellbeingCheckinInputData = {
        stressLevel: values.stressLevel,
        mainEmotions: values.mainEmotions, // Store keys
        ...(values.mainEmotions.includes("other") && { otherEmotionDetail: values.otherEmotionDetail }),
        todayActivities: values.todayActivities, // Store keys
        ...(values.todayActivities.includes("other") && { otherActivityDetail: values.otherActivityDetail }),
        conversationPartner: values.conversationPartner, // Store key
        ...(values.conversationPartner === 'other' && { otherConversationPartnerDetail: values.otherConversationPartnerDetail }),
        ...(values.conversationPartner === 'spouse' && { 
            spouseConversationTopics: values.spouseConversationTopics, // Store keys
            ...(values.spouseConversationTopics?.includes('other') && {otherSpouseTopicDetail: values.otherSpouseTopicDetail})
        }),
      };

      onCheckinComplete(dataToStore); 
      form.reset(); 
    } catch (error) {
      console.error("Error submitting wellbeing check-in:", error);
      toast({ title: t('toast.genericError.title'), description: t('toast.genericError.description'), variant: 'destructive' });
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>{t('wellbeingCheckinForm.titleForDate', { date: format(selectedDate, "PP", {locale: dateLocale}) })}</CardTitle>
        <CardDescription>{t('wellbeingCheckinForm.description')}</CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
            <FormField
              control={form.control}
              name="stressLevel"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('wellbeingCheckinForm.stressLevel', { level: field.value })}</FormLabel>
                  <FormControl>
                    <Slider
                      defaultValue={[field.value]}
                      min={1}
                      max={10}
                      step={1}
                      onValueChange={(value) => field.onChange(value[0])}
                      disabled={isDisabled || form.formState.isSubmitting || authLoading || isSaving}
                    />
                  </FormControl>
                  <FormDescription>{t('wellbeingCheckinForm.stressLevel.description')}</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="mainEmotions"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('wellbeingCheckinForm.mainEmotions')}</FormLabel>
                  <div className="flex flex-wrap gap-2">
                    {emotionConfig.map(emotionOpt => {
                      const isSelected = field.value.includes(emotionOpt.value);
                      return (
                        <Button
                          key={emotionOpt.value}
                          type="button"
                          variant={isSelected ? "default" : "outline"}
                          size="sm"
                          onClick={() => {
                            const currentEmotions = field.value || [];
                            if (isSelected) {
                              field.onChange(currentEmotions.filter(e => e !== emotionOpt.value));
                              if (emotionOpt.value === "other") {
                                form.setValue("otherEmotionDetail", "");
                              }
                            } else if (currentEmotions.length < 3) {
                              field.onChange([...currentEmotions, emotionOpt.value]);
                            }
                          }}
                          disabled={isDisabled || form.formState.isSubmitting || authLoading || isSaving}
                          className="rounded-full"
                        >
                          {emotionOpt.emoji} <span className="ml-1">{t(`emotion.${emotionOpt.value}`)}</span>
                        </Button>
                      );
                    })}
                  </div>
                  <FormDescription>{t('wellbeingCheckinForm.mainEmotions.description')}</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {watchedMainEmotions.includes("other") && (
              <FormField
                control={form.control}
                name="otherEmotionDetail"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('wellbeingCheckinForm.otherEmotionDetail')}</FormLabel>
                    <FormControl>
                      <Input placeholder={t('wellbeingCheckinForm.otherEmotionDetail.placeholder')} {...field} value={field.value ?? ""} disabled={isDisabled || form.formState.isSubmitting || authLoading || isSaving} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            <FormField
              control={form.control}
              name="todayActivities"
              render={() => (
                <FormItem>
                  <FormLabel>{t('wellbeingCheckinForm.todayActivities')}</FormLabel>
                  <FormDescription className="mb-2">{t('wellbeingCheckinForm.todayActivities.description')}</FormDescription>
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                    {activityOptions.map((activityOpt) => (
                      <FormField
                        key={activityOpt.key}
                        control={form.control}
                        name="todayActivities"
                        render={({ field: activityField }) => (
                          <FormItem className="flex flex-row items-start space-x-2 space-y-0 p-2 border rounded-md hover:bg-accent/50 transition-colors">
                            <FormControl>
                              <Checkbox
                                checked={activityField.value?.includes(activityOpt.key)}
                                onCheckedChange={(checked) => {
                                  const updatedActivities = checked
                                    ? [...(activityField.value || []), activityOpt.key]
                                    : (activityField.value || []).filter(
                                        (value) => value !== activityOpt.key
                                      );
                                  activityField.onChange(updatedActivities);
                                  if (activityOpt.key === "other" && !checked) {
                                    form.setValue("otherActivityDetail", "");
                                  }
                                }}
                                disabled={isDisabled || form.formState.isSubmitting || authLoading || isSaving}
                              />
                            </FormControl>
                            <FormLabel className="font-normal cursor-pointer w-full">
                              {activityOpt.emoji} <span className="ml-1">{t(activityOpt.labelKey)}</span>
                            </FormLabel>
                          </FormItem>
                        )}
                      />
                    ))}
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />

            {watchedTodayActivities.includes("other") && (
              <FormField
                control={form.control}
                name="otherActivityDetail"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('wellbeingCheckinForm.otherActivityDetail')}</FormLabel>
                    <FormControl>
                      <Input placeholder={t('wellbeingCheckinForm.otherActivityDetail.placeholder')} {...field} value={field.value ?? ""} disabled={isDisabled || form.formState.isSubmitting || authLoading || isSaving} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}


            <FormField
              control={form.control}
              name="conversationPartner"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('wellbeingCheckinForm.conversationPartner')}</FormLabel>
                  <FormControl>
                    <RadioGroup
                      onValueChange={(value) => {
                        field.onChange(value);
                        if (value !== 'other') {
                          form.setValue('otherConversationPartnerDetail', '');
                        }
                        if (value !== 'spouse') {
                          form.setValue('spouseConversationTopics', []);
                          form.setValue('otherSpouseTopicDetail', '');
                        }
                      }}
                      value={field.value}
                      className="flex flex-wrap gap-x-4 gap-y-2"
                    >
                      {conversationPartnerConfig.map(partnerKey => (
                        <FormItem key={partnerKey} className="flex items-center space-x-2 space-y-0">
                          <FormControl>
                            <RadioGroupItem value={partnerKey!} id={`partner-${partnerKey}`} disabled={isDisabled || form.formState.isSubmitting || authLoading || isSaving}/>
                          </FormControl>
                          <FormLabel htmlFor={`partner-${partnerKey}`} className="font-normal cursor-pointer hover:text-primary">
                            {t(`partner.${partnerKey!}`)}
                          </FormLabel>
                        </FormItem>
                      ))}
                    </RadioGroup>
                  </FormControl>
                  <FormDescription>{t('wellbeingCheckinForm.conversationPartner.description')}</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {watchedConversationPartner === 'other' && (
              <FormField
                control={form.control}
                name="otherConversationPartnerDetail"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('wellbeingCheckinForm.otherConversationPartnerDetail')}</FormLabel>
                    <FormControl>
                      <Input placeholder={t('wellbeingCheckinForm.otherConversationPartnerDetail.placeholder')} {...field} value={field.value ?? ""} disabled={isDisabled || form.formState.isSubmitting || authLoading || isSaving} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            {watchedConversationPartner === 'spouse' && (
              <>
                <FormField
                  control={form.control}
                  name="spouseConversationTopics"
                  render={() => (
                    <FormItem>
                      <FormLabel>{t('wellbeingCheckinForm.spouseConversationTopics')}</FormLabel>
                       <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                        {spouseTopicConfig.map(topicKey => (
                          <FormField
                            key={topicKey}
                            control={form.control}
                            name="spouseConversationTopics"
                            render={({ field: topicField }) => (
                              <FormItem className="flex flex-row items-start space-x-2 space-y-0 p-2 border rounded-md hover:bg-accent/50 transition-colors">
                                <FormControl>
                                  <Checkbox
                                    checked={topicField.value?.includes(topicKey)}
                                    onCheckedChange={(checked) => {
                                      const currentTopics = topicField.value || [];
                                      const updatedTopics = checked
                                        ? [...currentTopics, topicKey]
                                        : currentTopics.filter(t => t !== topicKey);
                                      topicField.onChange(updatedTopics);
                                      if (topicKey === "other" && !checked) {
                                        form.setValue("otherSpouseTopicDetail", "");
                                      }
                                    }}
                                    disabled={isDisabled || form.formState.isSubmitting || authLoading || isSaving}
                                  />
                                </FormControl>
                                <FormLabel className="font-normal cursor-pointer">
                                  {t(`spouseTopic.${topicKey}`)}
                                </FormLabel>
                              </FormItem>
                            )}
                          />
                        ))}
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                {watchedSpouseTopics?.includes('other') && (
                  <FormField
                    control={form.control}
                    name="otherSpouseTopicDetail"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t('wellbeingCheckinForm.otherSpouseTopicDetail')}</FormLabel>
                        <FormControl>
                          <Input placeholder={t('wellbeingCheckinForm.otherSpouseTopicDetail.placeholder')} {...field} value={field.value ?? ""} disabled={isDisabled || form.formState.isSubmitting || authLoading || isSaving} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}
              </>
            )}

            <Button type="submit" disabled={isDisabled || form.formState.isSubmitting || authLoading || isSaving || !user} className="w-full sm:w-auto">
              {(authLoading || form.formState.isSubmitting || isSaving) && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isSaving ? t('wellbeingCheckinForm.submittingButton') : t('wellbeingCheckinForm.submitButton')}
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
