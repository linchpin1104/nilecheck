
'use server';
/**
 * @fileOverview Generates a weekly wellness report based on user's logged data and check-ins.
 *
 * - getWeeklyWellnessReport - A function that returns a weekly wellness analysis and advice.
 * - WeeklyWellnessReportInput - The input type for the getWeeklyWellnessReport function.
 * - WeeklyWellnessReportOutput - The return type for the getWeeklyWellnessReport function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const DailyCheckinSummarySchema = z.object({
  date: z.string().describe("Date of the check-in (YYYY-MM-DD)"),
  stressLevel: z.number().optional().describe("Stress level for the day (1-10)"),
  emotions: z.array(z.string()).optional().describe("Main emotions for the day, e.g., 'Joy (joy)', 'Other (Feeling blue)'"),
  activities: z.array(z.string()).optional().describe("Main activities for the day, e.g., 'Exercise (exercise)', 'Other (Gardening)'"),
});

const WeeklyLogSummarySchema = z.object({
  averageSleepHours: z.number().optional().describe("Average hours of sleep per night for the week."),
  averageSleepQuality: z.number().min(1).max(5).optional().describe("Average sleep quality for the week (1-5)."),
  mealsLoggedCount: z.number().optional().describe("Total number of meals logged as 'eaten' during the week."),
  // Consider adding meal quality summary if available and useful
});

export const WeeklyWellnessReportInputSchema = z.object({
  weekStartDate: z.string().describe("The start date of the week being analyzed (YYYY-MM-DD)."),
  dailyCheckins: z.array(DailyCheckinSummarySchema).optional().describe("Array of daily check-in summaries for the week. May be sparse or empty if no check-ins logged for some days."),
  weeklyLogSummary: WeeklyLogSummarySchema.optional().describe("Summary of logged meals and sleep for the week."),
  // userLanguage: z.string().min(2).max(2).describe("User's preferred language for the report ('en' or 'ko').") // Removed
});
export type WeeklyWellnessReportInput = z.infer<typeof WeeklyWellnessReportInputSchema>;

export const WeeklyWellnessReportOutputSchema = z.object({
  overallSummary: z.string().describe("A brief overall summary of the week's well-being, trends, and patterns. This should be in Korean."),
  positiveObservations: z.array(z.string()).describe("Specific positive patterns or achievements observed during the week. These should be in Korean."),
  areasForAttention: z.array(z.string()).describe("Areas that might need more attention or could be improved in the coming week. These should be in Korean."),
  actionableAdvice: z.array(z.string()).describe("Practical, actionable advice for the upcoming week based on the analysis. These should be in Korean."),
});
export type WeeklyWellnessReportOutput = z.infer<typeof WeeklyWellnessReportOutputSchema>;

export async function getWeeklyWellnessReport(input: WeeklyWellnessReportInput): Promise<WeeklyWellnessReportOutput> {
  return weeklyWellnessReportFlow(input);
}

const prompt = ai.definePrompt({
  name: 'weeklyWellnessReportPrompt',
  input: {schema: WeeklyWellnessReportInputSchema},
  output: {schema: WeeklyWellnessReportOutputSchema},
  prompt: `You are an AI wellness coach providing a supportive and insightful weekly wellness report for a parent.
  The report should be in Korean.

  Analyze the provided weekly data:
  Week Start Date: {{{weekStartDate}}}

  Daily Check-in Data (if available):
  {{#if dailyCheckins.length}}
  {{#each dailyCheckins}}
  - Date: {{this.date}}
    {{#if this.stressLevel}}Stress: {{this.stressLevel}}/10{{/if}}
    {{#if this.emotions.length}}Emotions: {{#each this.emotions}}{{{this}}}{{#unless @last}}, {{/unless}}{{/each}}{{/if}}
    {{#if this.activities.length}}Activities: {{#each this.activities}}{{{this}}}{{#unless @last}}, {{/unless}}{{/each}}{{/if}}
  {{/each}}
  {{else}}
  No daily check-in data provided for this week.
  {{/if}}

  Weekly Log Summary (if available):
  {{#if weeklyLogSummary}}
  Average Sleep Hours: {{weeklyLogSummary.averageSleepHours}}
  Average Sleep Quality: {{weeklyLogSummary.averageSleepQuality}}/5
  Meals Logged: {{weeklyLogSummary.mealsLoggedCount}}
  {{else}}
  No overall meal/sleep log summary provided for this week.
  {{/if}}

  Based on this information, provide:
  1.  overallSummary: A brief overall summary of the week's well-being, highlighting trends and patterns.
  2.  positiveObservations: Specific positive patterns or achievements observed (e.g., consistent sleep, varied activities, managing stress well on certain days).
  3.  areasForAttention: Constructive feedback on areas that might need more attention or could be improved (e.g., inconsistent sleep, high stress on multiple days, low variety in activities).
  4.  actionableAdvice: Practical, empathetic, and actionable advice for the parent for the upcoming week. Focus on small, manageable steps.

  Be encouraging and supportive in your tone. If data is sparse, acknowledge that and provide more general advice.
  Ensure all parts of your response (overallSummary, positiveObservations, areasForAttention, actionableAdvice) are in Korean.
`,
});

const weeklyWellnessReportFlow = ai.defineFlow(
  {
    name: 'weeklyWellnessReportFlow',
    inputSchema: WeeklyWellnessReportInputSchema,
    outputSchema: WeeklyWellnessReportOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);

    