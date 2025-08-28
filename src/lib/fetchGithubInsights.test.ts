import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { fetchGithubInsights, GithubInsightsState } from './github-insights';
import * as extractor from '../ai/flows/entity-extractor';

const idleState: GithubInsightsState = { formState: 'idle', message: '', insights: '' };

describe('fetchGithubInsights', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('returns an error when no handle is provided', async () => {
    const res = await fetchGithubInsights(idleState, { githubHandle: '' });
    expect(res.formState).toBe('error');
    expect(res.message).toMatch(/Please provide a GitHub handle/i);
  });

  it('returns an error when GitHub user is not found (404)', async () => {
  vi.stubGlobal('fetch', vi.fn(async () => ({ ok: false, status: 404 })) as unknown as typeof global.fetch);
  vi.spyOn(extractor, 'extractEntities').mockResolvedValue({ skills: [], topics: [], senioritySignals: [], languages: [], technicalSummary: '', businessSummary: '', businessFunctions: [], confidence: 0 });

    const res = await fetchGithubInsights(idleState, { githubHandle: 'not-real-user-12345' });
    expect(res.formState).toBe('error');
    expect(res.message).toBe('GitHub user not found.');
  });

  it('handles a user with no public repos', async () => {
  vi.stubGlobal('fetch', vi.fn(async () => ({ ok: true, status: 200, json: async () => [] })) as unknown as typeof global.fetch);
  vi.spyOn(extractor, 'extractEntities').mockResolvedValue({ skills: [], topics: [], senioritySignals: [], languages: [], technicalSummary: '', businessSummary: '', businessFunctions: [], confidence: 0 });

    const res = await fetchGithubInsights(idleState, { githubHandle: 'user-without-repos' });
    expect(res.formState).toBe('success');
    expect(res.message).toBe('No public repositories found.');
    expect(res.insights).toContain('No public repositories found');
  });

  it('builds insights when repos are present', async () => {
    const fakeRepos = [
      { name: 'a', stargazers_count: 5, language: 'JavaScript', pushed_at: '2025-08-27T00:00:00Z', description: 'Repo A' },
      { name: 'b', stargazers_count: 8, language: 'TypeScript', pushed_at: '2025-08-26T00:00:00Z', description: 'Repo B' },
      { name: 'c', stargazers_count: 3, language: 'JavaScript', pushed_at: '2025-08-25T00:00:00Z', description: 'Repo C' },
    ];

  vi.stubGlobal('fetch', vi.fn(async () => ({ ok: true, status: 200, json: async () => fakeRepos })) as unknown as typeof global.fetch);
  vi.spyOn(extractor, 'extractEntities').mockResolvedValue({ skills: ['Next.js','React'], topics: ['web','ssr'], senioritySignals: ['senior'], languages: ['TypeScript'], technicalSummary: 'Technical summary', businessSummary: 'Business summary', businessFunctions: ['search'], confidence: 0.9 });

    const res = await fetchGithubInsights(idleState, { githubHandle: 'real-user' });
    expect(res.formState).toBe('success');
    expect(res.insights).toBeTruthy();
    expect(res.insights).toContain('Top languages');
    expect(res.insights).toContain('Most starred repo');
  });
});
