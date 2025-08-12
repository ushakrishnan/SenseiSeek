
'use server';
/**
 * @fileOverview This file defines a Genkit flow for creating a message to an executive when their application status changes.
 *
 * - createStatusChangeMessage - A function that generates a professional message based on the new status.
 * - StatusChangeMessageInput - The input type for the function.
 * - StatusChangeMessageOutput - The output type for the function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const StatusChangeMessageInputSchema = z.object({
  startupName: z.string().describe('The name of the startup.'),
  executiveName: z.string().describe('The name of the executive being contacted.'),
  roleTitle: z.string().describe('The title of the role they applied for.'),
  newStatus: z.enum(['in-review', 'hired', 'rejected']).describe('The new status of the application.')
});
export type StatusChangeMessageInput = z.infer<typeof StatusChangeMessageInputSchema>;

export type StatusChangeMessageOutput = string;

export async function createStatusChangeMessage(input: StatusChangeMessageInput): Promise<StatusChangeMessageOutput> {
  const {output} = await prompt(input);
  return output!.message;
}

const prompt = ai.definePrompt({
  name: 'createStatusChangeMessagePrompt',
  input: {schema: StatusChangeMessageInputSchema},
  output: {schema: z.object({ message: z.string() })},
  prompt: `You are an expert at writing professional, clear, and empathetic messages for a recruiting platform.
  A startup, {{{startupName}}}, has just changed the application status for an executive, {{{executiveName}}}, for the role of {{{roleTitle}}}.
  Your task is to write a message to the executive informing them of this change.

  The new status is: **{{{newStatus}}}**

  **Instructions:**
  - **If the status is 'in-review':** Write a brief, encouraging message. Let them know their application has been received and is being reviewed. Mention that the startup will reach out if there's a good fit.
  - **If the status is 'hired':** Write a warm, congratulatory message. Express excitement about offering them the position and suggest the next step would be to discuss the formal offer and onboarding process.
  - **If the status is 'rejected':** Write a polite and respectful message. Thank them for their interest and time. Inform them that the startup has decided to move forward with other candidates at this time. Wish them the best in their job search. Keep it professional and empathetic.

  **Tone:** Maintain a professional, respectful, and clear tone appropriate for the context.
  **Format:** Generate only the body of the message. Do not include a subject line or greetings like "Hi {{{executiveName}}},".
  `,
});
