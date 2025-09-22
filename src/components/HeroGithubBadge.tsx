import React from 'react';

type Props = {
  repo?: string;
  showCounts?: boolean;
};

function parseRepo(repo: string) {
  const githubUrl = /github\.com\/([^\/]+)\/([^\/]+)/i;
  const m = repo.match(githubUrl);
  if (m) return { owner: m[1], name: m[2] };
  if (repo.includes('/')) {
    const [owner, name] = repo.split('/');
    return { owner, name };
  }
  return { owner: 'ushakrishnan', name: 'SenseiSeek' };
}

export default function HeroGithubBadge({
  repo = 'https://github.com/ushakrishnan/SenseiSeek',
  showCounts = true,
}: Props) {
  const { owner, name } = parseRepo(repo);
  const starBadge = `https://img.shields.io/github/stars/${owner}/${name}?style=social`;
  const forkBadge = `https://img.shields.io/github/forks/${owner}/${name}?style=social`;

  return (
    <a
      href={repo}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center gap-4 px-4 py-3 rounded-full bg-white/10 hover:bg-white/20 transition-colors border border-white/10 backdrop-blur text-white"
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="20"
        height="20"
        viewBox="0 0 24 24"
        fill="currentColor"
        className="text-white"
        aria-hidden="true"
      >
        <path d="M12 .297c-6.6 0-12 5.4-12 12 0 5.3 3.4 9.8 8.2 11.4.6.1.8-.3.8-.6v-2.1c-3.3.7-4-1.6-4-1.6-.5-1.2-1.1-1.5-1.1-1.5-.9-.6.1-.6.1-.6 1 .1 1.6 1 1.6 1 .9 1.6 2.3 1.2 2.8.9.1-.7.3-1.2.6-1.5-2.7-.3-5.5-1.3-5.5-6 0-1.3.4-2.3 1.1-3.2-.1-.3-.5-1.7.1-3.6 0 0 .9-.3 3.2 1.2.9-.3 1.9-.5 2.8-.5s1.9.2 2.8.5c2.3-1.5 3.2-1.2 3.2-1.2.6 1.9.2 3.3.1 3.6.7.9 1.1 1.9 1.1 3.2 0 4.7-2.9 5.7-5.6 6 .3.3.6.8.6 1.6v2.4c0 .3.2.7.8.6C20.6 22.1 24 17.6 24 12.3c0-6.6-5.4-12-12-12" />
      </svg>

      <div className="flex flex-col text-left">
        <span className="text-sm font-semibold">Fork on GitHub</span>
        <span className="text-xs text-white/80">Support the project — view the repo</span>
      </div>

      {showCounts && (
        <div className="flex items-center gap-2">
          <img src={starBadge} alt="Stars" className="h-6" />
          <img src={forkBadge} alt="Forks" className="h-6" />
        </div>
      )}
    </a>
  );
}
