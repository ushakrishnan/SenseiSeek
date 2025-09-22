
'use server';
/**
 * @fileOverview This file defines a Genkit flow for creating an introductory message from a startup to an executive.
 *
 * - createIntroductionMessage - A function that generates a professional and engaging outreach message.
 * - IntroductionMessageInput - The input type for the function.
 * - IntroductionMessageOutput - The output type for the function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const IntroductionMessageInputSchema = z.object({
  startupName: z.string().describe('The name of the startup.'),
  executiveName: z.string().describe('The name of the executive being contacted.'),
  startupMission: z.string().describe("The startup's core mission or short description."),
  startupChallenge: z.string().describe("The key challenge the startup is currently facing."),
  executiveExpertise: z.string().describe("A summary of the executive's skills and expertise."),
  executiveAccomplishment: z.string().describe("One key accomplishment from the executive's profile.")
});
export type IntroductionMessageInput = z.infer<typeof IntroductionMessageInputSchema>;

export type IntroductionMessageOutput = string;

export async function createIntroductionMessage(input: IntroductionMessageInput): Promise<IntroductionMessageOutput> {
  const {output} = await prompt(input);
  return output!.message;
}

const prompt = ai.definePrompt({
  name: 'createIntroductionMessagePrompt',
  input: {schema: IntroductionMessageInputSchema},
  output: {schema: z.object({ message: z.string() })},
  prompt: `You are an expert at writing professional, concise, and compelling outreach messages.
  A startup founder wants to contact an executive about a potential fractional role.
  Your task is to write a warm, personalized, and professional introductory message from the startup to the executive.

  **Instructions:**
  1.  **Acknowledge Expertise:** Start by acknowledging a specific skill or accomplishment from the executive's profile to show you've done your research. Reference their accomplishment: {{{executiveAccomplishment}}}.
  2.  **State the Mission:** Briefly introduce the startup ({{{startupName}}}) and its core mission ({{{startupMission}}}).
  3.  **Connect to a Need:** Connect the executive's expertise ({{{executiveExpertise}}}) to a specific challenge the startup is facing ({{{startupChallenge}}}).
  4.  **Call to Action:** End with a clear and low-friction call to action, like suggesting a brief, exploratory chat.
  5.  **Keep it Concise:** The entire message should be around 3-4 short paragraphs.
  6.  **Tone:** Maintain a tone that is professional, respectful, and slightly informal, suitable for a startup environment.

  Generate only the body of the message. Do not include a subject line or greetings like "Hi {{{executiveName}}},".
  The message should be from the perspective of the startup founder reaching out.
  `,
});
