
'use server';
/**
 * @fileOverview This file defines a Genkit flow for rewriting specific fields of a job description.
 *
 * - rewriteJobDescriptionField - A function that takes text for a specific field and rewrites it.
 * - RewriteFieldInput - The input type for the rewrite function.
 * - RewriteFieldOutput - The output type for the rewrite function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const RewriteFieldInputSchema = z.object({
  fieldName: z.string().describe('The name of the field being rewritten (e.g., "Role Title", "Project Scope", "Key Deliverables", "Key Challenges").'),
  currentValue: z.string().describe('The current text value of the field.'),
});
export type RewriteFieldInput = z.infer<typeof RewriteFieldInputSchema>;

const RewriteFieldOutputSchema = z.object({
  rewrittenText: z.string().describe('The new, rewritten text for the field.'),
});
export type RewriteFieldOutput = z.infer<typeof RewriteFieldOutputSchema>;

export async function rewriteJobDescriptionField(input: RewriteFieldInput): Promise<RewriteFieldOutput> {
  return rewriteStartupNeedDescriptionFlow(input);
}

const prompt = ai.definePrompt({
  name: 'rewriteJobDescriptionFieldPrompt',
  input: {schema: RewriteFieldInputSchema},
  output: {schema: RewriteFieldOutputSchema},
  prompt: `You are an expert in writing compelling and professional job descriptions for executive roles at startups.
  Your task is to rewrite a specific part of a job description to make it clearer, more engaging, and more appealing to top-tier executive talent.

  You will be given the field name and its current value. Rewrite the value.

  Field to rewrite: {{{fieldName}}}
  Current content: {{{currentValue}}}

  Based on the field and content, provide a polished and improved version.
  
  - For "Role Title", ensure it is concise, professional, and accurately reflects a fractional or interim executive position. Keep it under 50 characters.
  - For "Project Scope", expand on the objectives, clarify the mission, and articulate the expected impact in a compelling narrative. This is the role summary.
  - For "Key Deliverables", rewrite the text into a clear, results-oriented plain text list. Use a dash (-) for each bullet point. Do not use markdown asterisks.
  - For "Key Challenges", frame the challenges as exciting opportunities for a high-impact leader to solve. If creating a list, use a dash (-) for each bullet point.
  
  Return only the rewritten text in the rewrittenText field.
  `,
});

const rewriteStartupNeedDescriptionFlow = ai.defineFlow(
  {
    name: 'rewriteStartupNeedDescriptionFlow',
    inputSchema: RewriteFieldInputSchema,
    outputSchema: RewriteFieldOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
