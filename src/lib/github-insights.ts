// Lightweight, importable version of the GitHub insights fetcher used by actions.ts
// Kept in its own module so it can be unit-tested without importing server-only code.
import { extractEntities } from '../ai/flows/entity-extractor';
export type GithubInsightsState = {
  formState: 'idle' | 'loading' | 'success' | 'error';
  message: string;
  insights?: string;
  // structured insights for downstream consumers
  structured?: {
    topLanguages?: string[];
    topRepos?: Array<{ name: string; stars: number; description?: string; url: string }>;
    recentActivity?: { repo: string; pushedAt: string }[];
    inferredSkills?: string[];
    roleRecommendations?: string[];
    readmeSummaries?: Array<{ repo: string; summary: string; themes: string[] }>;
  };
}

export async function fetchGithubInsights(prevState: GithubInsightsState, input: { githubHandle?: string }): Promise<GithubInsightsState> {
  const raw = input.githubHandle?.trim();
  if (!raw) {
    return { formState: 'error', message: 'Please provide a GitHub handle or profile URL.' };
  }

  // Normalize input: accept either a plain username or a full GitHub profile URL
  // Examples accepted: 'ushakrishnan', 'https://github.com/ushakrishnan', 'github.com/ushakrishnan'
  let handle = raw;
  try {
    if (raw.startsWith('http://') || raw.startsWith('https://') || raw.includes('github.com/')) {
      // Extract the last path segment as the username
      const u = new URL(raw.startsWith('http') ? raw : `https://${raw}`);
      const parts = u.pathname.split('/').filter(Boolean);
      if (parts.length > 0) {
        handle = parts[0];
      }
    }
  } catch (e) {
    // fallback: attempt to remove common prefix
    handle = raw.replace(/^https?:\/\/(www\.)?github.com\//i, '').replace(/\/.*/,'');
  }

  // Allow overriding GitHub API base (for GH Enterprise instances) and optional token via env vars
  const apiBase = process.env.GITHUB_API_BASE || 'https://api.github.com';
  const perPage = 100;
  const url = `${apiBase.replace(/\/$/, '')}/users/${encodeURIComponent(handle)}/repos?per_page=${perPage}`;

  const headers: Record<string, string> = { Accept: 'application/vnd.github.v3+json' };
  if (process.env.GITHUB_TOKEN) {
    headers.Authorization = `token ${process.env.GITHUB_TOKEN}`;
  }

  try {
    // Simple in-process cache to reduce GitHub API calls
    const cacheTtlMs = Number(process.env.GITHUB_CACHE_TTL_MS || 1000 * 60 * 5); // default 5 minutes
    type CacheEntry = { ts: number; value: any };
    // store at module-level to persist across calls
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const globalAny: any = globalThis as any;
    if (!globalAny.__github_api_cache) globalAny.__github_api_cache = new Map<string, CacheEntry>();
    const cache: Map<string, CacheEntry> = globalAny.__github_api_cache;

    const cached = cache.get(url);
    if (cached && Date.now() - cached.ts < cacheTtlMs) {
      // reuse cached value
      const repos = cached.value;
      // continue using the cached repos below
    } else {
      const res = await fetch(url, { headers });

      if (!res.ok) {
        if (res.status === 404) {
          return { formState: 'error', message: 'GitHub user not found.' };
        }
        return { formState: 'error', message: `GitHub API returned status ${res.status}.` };
      }

      const repos = await res.json();
      cache.set(url, { ts: Date.now(), value: repos });
    }
    // retrieve repos (either from cache or just fetched)
    const repos = cache.get(url)!.value as any[];
    if (!Array.isArray(repos) || repos.length === 0) {
      return { formState: 'success', message: 'No public repositories found.', insights: 'No public repositories found for this account.' };
    }

    // Compute top languages and top repos
    const langCounts: Record<string, number> = {};
    repos.forEach((r: any) => {
      if (r.language) {
        langCounts[r.language] = (langCounts[r.language] || 0) + 1;
      }
    });
    const topLanguages = Object.entries(langCounts).sort((a,b) => b[1] - a[1]).slice(0,3).map(e => e[0]);

    const topStarred = [...repos].sort((a: any,b: any) => (b.stargazers_count || 0) - (a.stargazers_count || 0))[0];
    const recent = [...repos].sort((a: any,b: any) => new Date(b.pushed_at).getTime() - new Date(a.pushed_at).getTime()).slice(0,3);

    const highlights: string[] = [];
    highlights.push(`Top languages: ${topLanguages.length ? topLanguages.join(', ') : 'Not available'}.`);
    if (topStarred) {
      highlights.push(`Most starred repo: ${topStarred.name} (${topStarred.stargazers_count || 0} stars) — ${topStarred.description || 'No description'}.`);
    }
    if (recent.length) {
      highlights.push(`Recently active: ${recent.map((r: any) => r.name).join(', ')}.`);
    }
    // Add up to 3 repo highlights (name: stars — description)
    const topThree = [...repos].sort((a: any,b: any) => (b.stargazers_count || 0) - (a.stargazers_count || 0)).slice(0,3);
    topThree.forEach((r: any) => {
      highlights.push(`${r.name}: ${(r.stargazers_count || 0)} ★ — ${r.description || 'No description'}`);
    });

    const insights = `GitHub Insights for ${handle}\n\n${highlights.join('\n\n')}`;

    // Build structured hints: top repos, recent activity, inferred skills from repo names/descriptions
    const topRepos = [...repos].sort((a: any,b: any) => (b.stargazers_count || 0) - (a.stargazers_count || 0)).slice(0,5).map((r: any) => ({ name: r.name, stars: r.stargazers_count || 0, description: r.description || '', url: r.html_url }));
    const recentActivity = [...repos].sort((a: any,b: any) => new Date(b.pushed_at).getTime() - new Date(a.pushed_at).getTime()).slice(0,5).map((r: any) => ({ repo: r.name, pushedAt: r.pushed_at }));

    // Simple NLP-ish heuristics for inferred skills: collect tokens from names and descriptions
    const skillTokens: Record<string, number> = {};
    const addTokens = (text: string) => {
      text.split(/[^A-Za-z0-9+#.]+/).map(t => t.trim()).filter(Boolean).forEach(tok => {
        const key = tok.toLowerCase();
        if (key.length > 1 && key.length < 40) skillTokens[key] = (skillTokens[key] || 0) + 1;
      });
    };
    repos.forEach((r: any) => {
      addTokens(r.name || '');
      addTokens(r.description || '');
      if (Array.isArray(r.topics)) r.topics.forEach((t: string) => addTokens(t));
    });

    // Attempt to fetch README for the top 3 repos to extract deeper themes.
  const readmeSummaries: Array<{ repo: string; summary: string; themes: string[]; technicalSummary?: string; businessSummary?: string; businessFunctions?: string[]; confidence?: number }> = [];
    const readmeCount = Math.min(3, topRepos.length);
    for (let i = 0; i < readmeCount; i++) {
      const repo = topRepos[i];
      try {
        const readmeUrl = `${apiBase.replace(/\/$/, '')}/repos/${encodeURIComponent(handle)}/${encodeURIComponent(repo.name)}/readme`;
        const cachedReadme = cache.get(readmeUrl);
        let readmeJson: any = null;
        if (cachedReadme && Date.now() - cachedReadme.ts < cacheTtlMs) {
          readmeJson = cachedReadme.value;
        } else {
          const readmeRes = await fetch(readmeUrl, { headers });
          if (!readmeRes.ok) continue;
          readmeJson = await readmeRes.json();
          cache.set(readmeUrl, { ts: Date.now(), value: readmeJson });
        }
        if (!readmeJson || typeof readmeJson !== 'object' || typeof readmeJson.content !== 'string') continue;
        // content is base64 encoded
        const buf = Buffer.from(readmeJson.content, readmeJson.encoding || 'base64');
        const text = buf.toString('utf-8');
        // Try AI-based entity extraction (falls back to simple heuristics above if AI fails)
        try {
          const extracted = await extractEntities({ repoName: repo.name, repoUrl: repo.url, text });
          // merge into skillTokens with boosted weight
          (extracted.skills || []).forEach(s => { skillTokens[s.toLowerCase()] = (skillTokens[s.toLowerCase()]||0)+3; });
          (extracted.languages || []).forEach(l => { skillTokens[l.toLowerCase()] = (skillTokens[l.toLowerCase()]||0)+2; });
          const themes = (extracted.topics && extracted.topics.length) ? extracted.topics : (extracted.skills || []).slice(0,5);
          // include technical/business summaries and detected business functions if present
          readmeSummaries.push({ repo: repo.name, summary: extracted.technicalSummary || extracted.businessSummary || text.slice(0,1000), themes, technicalSummary: extracted.technicalSummary, businessSummary: extracted.businessSummary, businessFunctions: extracted.businessFunctions, confidence: extracted.confidence });
        } catch (e) {
          // fallback: basic summary
          const paragraphs = text.split(/\r?\n\r?\n/).map(p => p.trim()).filter(Boolean);
          const summary = paragraphs.slice(0,3).join('\n\n').slice(0,1000);
          const themeTokens: Record<string, number> = {};
          const addThemeTokens = (t: string) => t.split(/[^A-Za-z0-9+#.]+/).map(x => x.trim().toLowerCase()).filter(Boolean).forEach(tok => { if (tok.length>1) themeTokens[tok] = (themeTokens[tok]||0)+1; });
          addThemeTokens(text.slice(0,4000));
          const themes = Object.entries(themeTokens).sort((a,b)=>b[1]-a[1]).slice(0,8).map(e=>e[0]);
          themes.forEach(t => { if (t.length>1) skillTokens[t] = (skillTokens[t]||0)+2; });
          readmeSummaries.push({ repo: repo.name, summary, themes });
        }
      } catch (e) {
        // ignore readme failures
      }
    }

    // Convert tokens to a short inferred skills list, prefer known tech words if present
    const techWhitelist = ['next', 'next.js', 'react', 'node', 'firebase', 'openai', 'python', 'typescript', 'rust', 'go', 'docker', 'kubernetes', 'embeddings', 'ai', 'ml', 'llm', 'graphql', 'postgres', 'aws', 'gcp', 'azure'];
  const inferred = Object.entries(skillTokens).sort((a,b) => b[1] - a[1]).map(e => e[0]);
  const inferredSkills = Array.from(new Set([ ...techWhitelist.filter(t => inferred.includes(t)), ...inferred.slice(0,10) ]));

    // Role recommendations: basic mapping heuristics
    const roleRecommendations: string[] = [];
    if (inferredSkills.includes('next') || inferredSkills.includes('react') || inferredSkills.includes('next.js')) {
      roleRecommendations.push('Frontend / Next.js Engineer');
    }
    if (inferredSkills.includes('openai') || inferredSkills.includes('embeddings') || inferredSkills.includes('llm') || inferredSkills.includes('ai')) {
      roleRecommendations.push('Generative AI / ML Engineer');
    }
    if (inferredSkills.includes('firebase') || inferredSkills.includes('aws') || inferredSkills.includes('gcp')) {
      roleRecommendations.push('Full-stack / Platform Engineer');
    }

    return {
      formState: 'success',
      message: 'Insights fetched successfully.',
      insights,
      structured: {
        topLanguages,
        topRepos,
        recentActivity,
        inferredSkills,
        readmeSummaries,
        roleRecommendations,
      }
    };
  } catch (error) {
    console.error('Error fetching GitHub data:', error);
    const message = error instanceof Error ? error.message : 'An unknown error occurred while contacting GitHub.';
    return { formState: 'error', message };
  }
}
