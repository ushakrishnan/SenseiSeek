'use server';
import { ai } from '../genkit';
import { z } from 'genkit';

const ReadmeSummarizerInput = z.object({
  repoName: z.string(),
  repoUrl: z.string(),
  readme: z.string(),
});

const ReadmeSummarizerOutput = z.object({
  summary: z.string(),
  themes: z.array(z.string()),
});

export type ReadmeSummarizerInput = z.infer<typeof ReadmeSummarizerInput>;
export type ReadmeSummarizerOutput = z.infer<typeof ReadmeSummarizerOutput>;

const prompt = ai.definePrompt({
  name: 'readmeSummarizerPrompt',
  input: { schema: ReadmeSummarizerInput },
  output: { schema: ReadmeSummarizerOutput },
  prompt: `You are an expert software engineer and technical writer.
Given the README content for the repository {{repoName}} (URL: {{repoUrl}}), produce:

- A concise summary (3-5 sentences) describing the repository's purpose, key features, and architectural shape.
- A short list (5 max) of technical themes or keywords (e.g., Next.js, Firebase, embeddings, OpenAI, Docker) extracted from the README.

Be concise and prefer actionable phrases useful for matching the project to job roles. Return JSON matching the output schema.`,
});

const flow = ai.defineFlow(
  {
    name: 'readmeSummarizerFlow',
    inputSchema: ReadmeSummarizerInput,
    outputSchema: ReadmeSummarizerOutput,
  },
  async (input) => {
    const { output } = await prompt(input);
    return output!;
  }
);

export async function summarizeReadme(input: ReadmeSummarizerInput): Promise<ReadmeSummarizerOutput> {
  return flow(input);
}
