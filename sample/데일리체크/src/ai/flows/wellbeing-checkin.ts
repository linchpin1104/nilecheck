
'use server';
/**
 * @fileOverview A mental well-being check-in flow for parents.
 *
 * - wellbeingCheckin - A function that handles the well-being check-in process.
 * - WellbeingCheckinInput - The input type for the wellbeingCheckin function.
 * - WellbeingCheckinOutput - The return type for the wellbeingCheckin function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

// The schema reflects that `todayActivities` will be an array of descriptive strings.
// e.g., "Exercise (exercise)", "Relaxation (relaxation)", or "Other (User typed detail for other activity)"
// Other fields might be keys or descriptive strings depending on user selection (e.g. "other" details).
const WellbeingCheckinInputSchema = z.object({
  stressLevel: z
    .number()
    .min(1)
    .max(10)
    .describe('Rate your current stress level on a scale of 1 to 10.'),
  mainEmotions: z
    .array(z.string()) // Could be "Joy (joy)", "기쁨 (Joy)", or "Other (User typed detail for other emotion)"
    .min(1)
    .max(3)
    .describe('Up to 3 main emotions felt today. These are descriptive strings, possibly including (key) or user detail for "Other".'),
  // otherEmotionDetail is no longer a separate field for AI; it's embedded in the mainEmotions string if "other" is chosen.
  todayActivities: z
    .array(z.string()) // Will be descriptive strings like "Exercise (exercise)", or "Other (User typed detail for other activity)"
    .min(1)
    .describe("Main activities performed today, as descriptive strings. e.g., 'Exercise (exercise)', 'Other (Went to the park)'. Activity keys may be in parenthesis."),
  // otherActivityDetail is no longer a separate field for AI; it's embedded in the todayActivities string if "other" activity is chosen.
  conversationPartner: z.string() // Could be "Spouse", "배우자 (Spouse)", or a key like "other" or "none"
    .optional()
    .describe('Person talked to today, if any. Might be a key or descriptive string. If "Other", details follow.'),
  otherConversationPartnerDetail: z.string().optional().describe('If "Other" partner, specify details. This is still sent if partner is "other" key.'),
  spouseConversationTopics: z.array(z.string()).optional().describe('Topics discussed with spouse. These might be keys or descriptive strings. If "Other topic", details follow in otherSpouseTopicDetail.'),
  otherSpouseTopicDetail: z.string().optional().describe('If "Other topic" with spouse, specify details. This is still sent if topics include "other" key.'),
});
export type WellbeingCheckinInput = z.infer<typeof WellbeingCheckinInputSchema>;

const WellbeingCheckinOutputSchema = z.object({
  assessment: z.string().describe('An assessment of the parent\'s current mental state.'),
  recommendations: z
    .string()
    .describe('Personalized self-care tips and resources based on the check-in responses.'),
});
export type WellbeingCheckinOutput = z.infer<typeof WellbeingCheckinOutputSchema>;

export async function wellbeingCheckin(input: WellbeingCheckinInput): Promise<WellbeingCheckinOutput> {
  return wellbeingCheckinFlow(input);
}

const prompt = ai.definePrompt({
  name: 'wellbeingCheckinPrompt',
  input: {schema: WellbeingCheckinInputSchema},
  output: {schema: WellbeingCheckinOutputSchema},
  prompt: `You are a mental health expert providing support and guidance to new parents.

  Based on the following information about the parent, assess their current mental state and provide personalized self-care recommendations.
  The user input for emotions, activities, and conversation partner might be in English, Korean, or a mix if they are bilingual terms.
  Parentheses in emotions or activities often contain the original English key or user-provided details for "Other".

  Stress Level (1-10): {{{stressLevel}}}
  {{#if mainEmotions.length}}
  Main Emotions Today: {{#each mainEmotions}}{{{this}}}{{#unless @last}}, {{/unless}}{{/each}}
  {{/if}}
  {{#if todayActivities.length}}
  Main Activities Today: {{#each todayActivities}}{{{this}}}{{#unless @last}}, {{/unless}}{{/each}}
  {{/if}}
  {{#if conversationPartner}}
    {{#if (eq conversationPartner "other")}}
  Conversation Partner: Other ({{{otherConversationPartnerDetail}}})
    {{else if (eq conversationPartner "none")}}
  Conversation Partner: None
    {{else}}
  Conversation Partner: {{{conversationPartner}}}
    {{/if}}
    {{#if (eq conversationPartner "Spouse" or eq conversationPartner "배우자" or eq conversationPartner "spouse")}}
      {{#if spouseConversationTopics.length}}
  Spouse Conversation Topics: {{#each spouseConversationTopics}}{{{this}}}{{#unless @last}}, {{/unless}}{{/each}}
        {{#if otherSpouseTopicDetail}}
  (Other Spouse Topic Detail: {{{otherSpouseTopicDetail}}})
        {{/if}}
      {{/if}}
    {{/if}}
  {{/if}}

  Provide a concise assessment and actionable recommendations. Ensure the response is in Korean.
  Assessment:
  Recommendations: `,
});

const wellbeingCheckinFlow = ai.defineFlow(
  {
    name: 'wellbeingCheckinFlow',
    inputSchema: WellbeingCheckinInputSchema,
    outputSchema: WellbeingCheckinOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);

