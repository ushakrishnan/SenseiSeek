
'use server';
/**
 * @fileOverview This file defines a Genkit flow to extract executive profile information from a resume.
 *
 * - executiveProfileFromResume - A function that takes a resume (as a URL, text, or data URI) and extracts profile information.
 * - ExecutiveProfileFromResumeInput - The input type for the executiveProfileFromResume function.
 * - ExecutiveProfileFromResumeOutput - The output type for the executiveProfileFromResume function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const ExecutiveProfileFromResumeInputSchema = z.object({
  resume: z.string().describe('The resume content as a URL, text, or data URI.'),
});
export type ExecutiveProfileFromResumeInput = z.infer<typeof ExecutiveProfileFromResumeInputSchema>;

const ExecutiveProfileFromResumeOutputSchema = z.object({
  name: z.string().describe('The name of the executive.'),
  expertise: z.string().describe("A summary of the executive's expertise."),
  industryExperience: z.array(z.string()).describe('A list of industries the executive has experience in.'),
  availability: z.string().describe("The executive's availability."),
  desiredCompensation: z.string().describe("The executive's desired compensation."),
  locationPreference: z.string().describe("The executive's location preference for work (e.g., Remote, Hybrid, or specific cities)."),
  city: z.string().describe("The executive's current city of residence.").optional(),
  state: z.string().describe("The executive's current state or province of residence.").optional(),
  country: z.string().describe("The executive's current country of residence.").optional(),
  keyAccomplishments: z.array(z.string()).describe("A list of the executive's key accomplishments, ideally with metrics."),
});
export type ExecutiveProfileFromResumeOutput = z.infer<typeof ExecutiveProfileFromResumeOutputSchema>;

export async function executiveProfileFromResume(input: ExecutiveProfileFromResumeInput): Promise<ExecutiveProfileFromResumeOutput> {
  return executiveProfileFromResumeFlow(input);
}

const prompt = ai.definePrompt({
  name: 'executiveProfileFromResumePrompt',
  input: {schema: ExecutiveProfileFromResumeInputSchema},
  output: {schema: ExecutiveProfileFromResumeOutputSchema},
  prompt: `You are an expert in extracting information from resumes to create executive profiles.
  Given the following resume content, extract the following information:

  - Name
  - Expertise (a short summary)
  - Industry Experience (a list of industries)
  - Availability
  - Desired Compensation
  - Location Preference (their preference for where to WORK, e.g., Remote, On-site)
  - Current Residence (City, State/Province, Country)
  - Key Accomplishments (as a list of strings, summarizing the top 3-4 achievements with metrics if available)

  Resume Content: {{{resume}}}

  For availability, desiredCompensation, and locationPreference, match the extracted value to one of the available options if possible. If a direct match is not found, infer the most likely category.
  - Availability Options: "Full-time (40 hours/week)", "Part-time (20-30 hours/week)", "Part-time (10-20 hours/week)", "Project-based", "Advisory"
  - Compensation Options: "$5,000 - $8,000 / month", "$8,000 - $12,000 / month", "$12,000 - $18,000 / month", "$18,000 - $25,000 / month", "$25,000+ / month", "Equity only"
  - Location Preference Options: "Remote", "Hybrid", "On-site"

  Ensure that the extracted information is accurate and well-formatted.
`,
});

const executiveProfileFromResumeFlow = ai.defineFlow(
  {
    name: 'executiveProfileFromResumeFlow',
    inputSchema: ExecutiveProfileFromResumeInputSchema,
    outputSchema: ExecutiveProfileFromResumeOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
