'use server';
import { ai } from '../genkit';
import { z } from 'genkit';

const EntityExtractorInput = z.object({
  repoName: z.string().optional(),
  repoUrl: z.string().optional(),
  text: z.string(), // README or aggregated content
});

// Extended output: include technical and business summaries, detected business functions,
// and a confidence score (0-1) for the extraction.
const EntityExtractorOutput = z.object({
  skills: z.array(z.string()),
  topics: z.array(z.string()),
  senioritySignals: z.array(z.string()),
  languages: z.array(z.string()),
  technicalSummary: z.string().optional(),
  businessSummary: z.string().optional(),
  businessFunctions: z.array(z.string()).optional(),
  confidence: z.number().min(0).max(1).optional(),
});

export type EntityExtractorInput = z.infer<typeof EntityExtractorInput>;
export type EntityExtractorOutput = z.infer<typeof EntityExtractorOutput>;

const prompt = ai.definePrompt({
  name: 'entityExtractorPrompt',
  input: { schema: EntityExtractorInput },
  output: { schema: EntityExtractorOutput },
  prompt: `You are an expert at extracting structured technical entities and business signals from repository text.
Given the following text, return a JSON object matching the output schema with:
- skills: a prioritized list of concrete skills/technologies (e.g., React, Next.js, PostgreSQL, Docker).
- topics: broader themes or domains (e.g., embeddings, search, authentication, devops).
- senioritySignals: textual phrases that indicate seniority or leadership (e.g., "architected", "led", "10+ years", "senior engineer").
- languages: programming languages mentioned.
- technicalSummary: a concise 1-2 sentence technical summary (architecture, main components, key technologies).
- businessSummary: a concise 1-2 sentence summary of the product/business purpose (who benefits, primary use cases).
- businessFunctions: short list of business functions the project supports (e.g., "analytics", "search", "recommendation", "auth", "billing").
- confidence: a number between 0 and 1 representing how confident you are in the extracted entities.

Be conservative: prefer canonical names (e.g., "Next.js" not "next"), deduplicate, and order by importance/likelihood. When in doubt, leave fields empty rather than inventing. Return strictly valid JSON matching the schema.
`,
});

const flow = ai.defineFlow(
  { name: 'entityExtractorFlow', inputSchema: EntityExtractorInput, outputSchema: EntityExtractorOutput },
  async (input) => {
    const { output } = await prompt(input);
    return output!;
  }
);

export async function extractEntities(input: EntityExtractorInput): Promise<EntityExtractorOutput> {
  return flow(input);
}
