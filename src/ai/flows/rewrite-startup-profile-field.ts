
'use server';
/**
 * @fileOverview This file defines a Genkit flow for rewriting specific fields of a startup profile.
 *
 * - rewriteStartupProfileField - A function that takes text for a specific field and rewrites it.
 * - RewriteFieldInput - The input type for the rewrite function.
 * - RewriteFieldOutput - The output type for the rewrite function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const RewriteFieldInputSchema = z.object({
  fieldName: z.string().describe('The name of the field being rewritten (e.g., "Short Description", "Current Challenge").'),
  currentValue: z.string().describe('The current text value of the field.'),
});
export type RewriteFieldInput = z.infer<typeof RewriteFieldInputSchema>;

const RewriteFieldOutputSchema = z.object({
  rewrittenText: z.string().describe('The new, rewritten text for the field.'),
});
export type RewriteFieldOutput = z.infer<typeof RewriteFieldOutputSchema>;

export async function rewriteStartupProfileField(input: RewriteFieldInput): Promise<RewriteFieldOutput> {
  return rewriteStartupProfileFieldFlow(input);
}

const prompt = ai.definePrompt({
  name: 'rewriteStartupProfileFieldPrompt',
  input: {schema: RewriteFieldInputSchema},
  output: {schema: RewriteFieldOutputSchema},
  prompt: `You are an expert in writing compelling and professional company profiles that attract top-tier executive talent.
  Your task is to rewrite a specific part of a startup's profile to make it clearer, more engaging, and more appealing.

  You will be given the field name and its current value. Rewrite the value.

  Field to rewrite: {{{fieldName}}}
  Current content: {{{currentValue}}}

  Based on the field and content, provide a polished and improved version.
  
  - For "Short Description", create a concise and powerful summary of the company's mission and value proposition.
  - For "Current Challenge", articulate the core business problem in a way that is both honest and presents a compelling opportunity for an executive to solve.
  - For "Why Us", craft a compelling narrative about the company's unique strengths, culture, and market opportunity that would attract a high-caliber executive.
  
  Return only the rewritten text in the rewrittenText field.
  `,
});

const rewriteStartupProfileFieldFlow = ai.defineFlow(
  {
    name: 'rewriteStartupProfileFlow',
    inputSchema: RewriteFieldInputSchema,
    outputSchema: RewriteFieldOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
