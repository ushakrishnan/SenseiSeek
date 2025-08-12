
'use server';
/**
 * @fileOverview This file defines a Genkit flow for rewriting a chat message.
 *
 * - rewriteMessage - A function that takes a message and rewrites it for clarity and professionalism.
 * - RewriteMessageInput - The input type for the rewrite function.
 * - RewriteMessageOutput - The output type for the rewrite function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const RewriteMessageInputSchema = z.object({
  currentValue: z.string().describe('The current text of the message.'),
});
export type RewriteMessageInput = z.infer<typeof RewriteMessageInputSchema>;

const RewriteMessageOutputSchema = z.object({
  rewrittenText: z.string().describe('The new, rewritten text for the message.'),
});
export type RewriteMessageOutput = z.infer<typeof RewriteMessageOutputSchema>;

export async function rewriteMessage(input: RewriteMessageInput): Promise<RewriteMessageOutput> {
  return rewriteMessageFlow(input);
}

const prompt = ai.definePrompt({
  name: 'rewriteMessagePrompt',
  input: {schema: RewriteMessageInputSchema},
  output: {schema: RewriteMessageOutputSchema},
  prompt: `You are an expert business communicator specializing in correspondence between startup founders and senior executives.
  Your task is to rewrite the following message to be more professional, clear, and engaging, while maintaining the original intent.

  Keep the tone appropriate for a professional conversation, but not overly formal. The message should be concise.

  Current message: {{{currentValue}}}

  Return only the rewritten text in the rewrittenText field. Do not add any greetings or sign-offs.
  `,
});

const rewriteMessageFlow = ai.defineFlow(
  {
    name: 'rewriteChatMessageFlow',
    inputSchema: RewriteMessageInputSchema,
    outputSchema: RewriteMessageOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
