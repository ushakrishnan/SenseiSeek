'use server';
/**
 * @fileOverview Matches executive profiles with startup needs using AI.
 *
 * - matchExecutiveToStartup - A function that handles the matching process.
 * - MatchExecutiveToStartupInput - The input type for the matchExecutiveToStartup function.
 * - MatchExecutiveToStartupOutput - The return type for the matchExecutiveToStartup function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const MatchExecutiveToStartupInputSchema = z.object({
  executiveProfile: z.string().describe('The detailed profile of the executive, including expertise, industry experience, availability, desired compensation, and references.'),
  startupNeeds: z.string().describe('The specific executive needs of the startup, including project scope, budget, required expertise, and company stage.'),
});
export type MatchExecutiveToStartupInput = z.infer<typeof MatchExecutiveToStartupInputSchema>;

const MatchExecutiveToStartupOutputSchema = z.object({
  matchScore: z.number().describe('A score indicating the suitability of the executive for the startup, ranging from 0 to 1.'),
  rationale: z.string().describe('An explanation of why the executive is a good or bad match for the startup.'),
  recommendation: z.string().describe('A recommendation on whether to proceed with the executive.'),
});
export type MatchExecutiveToStartupOutput = z.infer<typeof MatchExecutiveToStartupOutputSchema>;

export async function matchExecutiveToStartup(input: MatchExecutiveToStartupInput): Promise<MatchExecutiveToStartupOutput> {
  return matchExecutiveToStartupFlow(input);
}

const matchExecutiveToStartupPrompt = ai.definePrompt({
  name: 'matchExecutiveToStartupPrompt',
  input: {schema: MatchExecutiveToStartupInputSchema},
  output: {schema: MatchExecutiveToStartupOutputSchema},
  prompt: `You are an expert matchmaker connecting executive talent with startup needs.

  Given the following executive profile and startup needs, determine how well they match.

  Executive Profile: {{{executiveProfile}}}

  Startup Needs: {{{startupNeeds}}}

  Provide a matchScore (0 to 1), a rationale, and a recommendation on whether to proceed with the executive.

  Format your response as a JSON object.
  `,
});

const matchExecutiveToStartupFlow = ai.defineFlow(
  {
    name: 'matchExecutiveToStartupFlow',
    inputSchema: MatchExecutiveToStartupInputSchema,
    outputSchema: MatchExecutiveToStartupOutputSchema,
  },
  async input => {
    const {output} = await matchExecutiveToStartupPrompt(input);
    return output!;
  }
);
