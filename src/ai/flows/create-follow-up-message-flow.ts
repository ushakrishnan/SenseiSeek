
'use server';
/**
 * @fileOverview This file defines a Genkit flow for creating a follow-up message from an executive to a startup after applying.
 *
 * - createFollowUpMessage - A function that generates a professional follow-up message.
 * - FollowUpMessageInput - The input type for the function.
 * - FollowUpMessageOutput - The output type for the function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const FollowUpMessageInputSchema = z.object({
  executiveName: z.string().describe('The name of the executive sending the message.'),
  startupName: z.string().describe('The name of the startup being contacted.'),
  roleTitle: z.string().describe('The title of the role the executive applied for.'),
  executiveExpertise: z.string().describe("A brief summary of the executive's core expertise.")
});
export type FollowUpMessageInput = z.infer<typeof FollowUpMessageInputSchema>;

export type FollowUpMessageOutput = string;

export async function createFollowUpMessage(input: FollowUpMessageInput): Promise<FollowUpMessageOutput> {
  const {output} = await prompt(input);
  return output!.message;
}

const prompt = ai.definePrompt({
  name: 'createFollowUpMessagePrompt',
  input: {schema: FollowUpMessageInputSchema},
  output: {schema: z.object({ message: z.string() })},
  prompt: `You are an expert at writing professional, concise, and engaging business correspondence.
  An executive, {{{executiveName}}}, has just applied for the role of {{{roleTitle}}} at {{{startupName}}} and wants to send a brief follow-up message.

  Your task is to write a warm, professional, and non-pushy message from the executive to the startup.

  **Instructions:**
  1.  **Acknowledge Application:** Start by mentioning that they have recently applied for the {{{roleTitle}}} position.
  2.  **Express Enthusiasm:** Briefly state their excitement about the company's mission or the role itself.
  3.  **Reinforce Fit:** Subtly reinforce their suitability by briefly mentioning their core expertise ({{{executiveExpertise}}}) and how it relates to the startup's goals.
  4.  **Polite Closing:** End with a polite closing, indicating they are looking forward to hearing from the team.
  5.  **Keep it Concise:** The entire message should be around 2-3 short paragraphs.
  6.  **Tone:** Maintain a tone that is professional, confident, and respectful.

  Generate only the body of the message. Do not include a subject line or greetings like "Hi {{{startupName}}} team,".
  The message should be from the perspective of the executive.
  `,
});
