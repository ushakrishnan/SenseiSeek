
'use server';
/**
 * @fileOverview This file defines a Genkit flow for rewriting specific fields of an executive profile.
 *
 * - rewriteExecutiveProfileField - A function that takes text for a specific field and rewrites it.
 * - RewriteFieldInput - The input type for the rewrite function.
 * - RewriteFieldOutput - The output type for the rewrite function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const RewriteFieldInputSchema = z.object({
  fieldName: z.string().describe('The name of the field being rewritten (e.g., "Expertise Summary", "Key Accomplishments").'),
  currentValue: z.string().describe('The current text value of the field.'),
});
export type RewriteFieldInput = z.infer<typeof RewriteFieldInputSchema>;

const RewriteFieldOutputSchema = z.object({
  rewrittenText: z.string().describe('The new, rewritten text for the field.'),
});
export type RewriteFieldOutput = z.infer<typeof RewriteFieldOutputSchema>;

export async function rewriteExecutiveProfileField(input: RewriteFieldInput): Promise<RewriteFieldOutput> {
  return rewriteExecutiveProfileFieldFlow(input);
}

const prompt = ai.definePrompt({
  name: 'rewriteExecutiveProfileFieldPrompt',
  input: {schema: RewriteFieldInputSchema},
  output: {schema: RewriteFieldOutputSchema},
  prompt: `You are an expert in crafting compelling executive profiles that attract high-value opportunities.
  Your task is to rewrite a specific part of an executive's profile to make it more impactful, concise, and appealing to startup founders.

  You will be given the field name and its current value. Rewrite the value.

  Field to rewrite: {{{fieldName}}}
  Current content: {{{currentValue}}}

  Based on the field and content, provide a polished and improved version.
  
  - For "Expertise Summary", create a powerful "elevator pitch" that highlights the executive's primary value proposition. It should be a short, compelling paragraph. Use the following structure as a loose guide, but adapt it for a senior executive audience: "I am a [Role/Title] with expertise in [Area 1, Area 2]. I specialize in [Action/Value Proposition, e.g., scaling tech startups, driving GTM strategy]. I recently [achieved X, e.g., led a company through a Series B funding round], and I am passionate about solving [Type of problem] for innovative companies. I'm looking for opportunities where I can help [specific outcome, e.g., accelerate growth, build a world-class team]."
  
  - For "Key Accomplishments", rewrite the text to follow the STAR method (Situation, Task, Action, Result) to make it more impactful and results-oriented. The accomplishment should be a single, powerful sentence.
    - Situation: Briefly describe the context.
    - Task: Describe your responsibility.
    - Action: What did you do? Use strong action verbs.
    - Result: What was the outcome? Quantify it with metrics if possible.
    Example: "In my role as Fractional CMO at a Series A fintech (Situation/Task), I launched a new GTM strategy (Action) that resulted in a 300% increase in MQLs and contributed to a successful $25M Series B fundraise (Result)."

  Return only the rewritten text in the rewrittenText field.
  `,
});

const rewriteExecutiveProfileFieldFlow = ai.defineFlow(
  {
    name: 'rewriteExecutiveProfileFieldFlow',
    inputSchema: RewriteFieldInputSchema,
    outputSchema: RewriteFieldOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
