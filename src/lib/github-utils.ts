// Utilities for normalizing and validating GitHub handle / profile input
export type NormalizedGithubInput = {
  handle: string;
  host?: string; // e.g. github.com or github.mycompany.com
  isUrl: boolean;
  error?: string;
}

export function normalizeGithubInput(raw?: string): NormalizedGithubInput {
  const value = (raw || '').trim();
  if (!value) return { handle: '', isUrl: false, error: 'Empty input' };

  // remove leading @ if present
  let v = value.replace(/^@+/, '');

  // If the user pasted a URL, attempt to parse and extract host + username
  try {
    if (v.startsWith('http://') || v.startsWith('https://') || v.includes('.')) {
      const url = new URL(v.startsWith('http') ? v : `https://${v}`);
      const parts = url.pathname.split('/').filter(Boolean);
      if (parts.length === 0) return { handle: '', isUrl: true, host: url.host, error: 'No username in URL' };
      const handle = parts[0];
      return { handle, host: url.host, isUrl: true };
    }
  } catch (e) {
    // fallthrough to treat as plain handle
  }

  // Final cleanup: strip any leftover slashes or query-like fragments
  v = v.replace(/^github\.com\//i, '').replace(/\/.*$/, '').replace(/\?.*$/, '').replace(/#.*$/, '');
  // common bad characters
  v = v.replace(/[^A-Za-z0-9-_.]/g, '');

  // Sanity checks: GitHub usernames are 1-39 chars
  if (v.length === 0) return { handle: '', isUrl: false, error: 'No valid characters found' };
  if (v.length > 39) return { handle: v.slice(0,39), isUrl: false, error: 'Truncated to 39 chars' };

  return { handle: v, isUrl: false };
}

export function displayGithubHint(norm: NormalizedGithubInput) {
  if (!norm.handle) return norm.error || 'Enter a GitHub handle or profile URL';
  if (norm.host && norm.host !== 'github.com') return `${norm.handle} @ ${norm.host}`;
  return norm.handle;
}
