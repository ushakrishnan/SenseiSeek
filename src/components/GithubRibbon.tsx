'use client';
import React from 'react';
import { GitHubIcon } from './icons/github-icon';

export default function GithubRibbon({
  repo = 'https://github.com/ushakrishnan/SenseiSeek',
  text = 'Fork me on GitHub',
}: {
  repo?: string;
  text?: string;
}) {
  return (
    <a
      href={repo}
      className="github-ribbon"
      aria-label={text}
      target="_blank"
      rel="noopener noreferrer"
    >
      <span className="ribbon">
        <span className="ribbon-inner">
          <span className="icon"><GitHubIcon /></span>
          <span className="label">{text}</span>
        </span>
      </span>

      <style jsx>{`
        .github-ribbon {
          position: fixed;
          top: 6px;
          right: 6px;
          width: 160px;
          height: 160px;
          z-index: 9999;
          pointer-events: auto;
        }
        .ribbon {
          position: absolute;
          top: 12px;
          right: -60px;
          width: 320px;
          padding: 8px 14px;
          background: linear-gradient(90deg, #000 0%, #24292e 100%);
          color: #fff;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          transform: rotate(45deg);
          transform-origin: 0 0;
          box-shadow: 0 6px 18px rgba(0,0,0,0.25);
          border-radius: 6px;
          font-weight: 700;
          font-size: 13px;
          text-decoration: none;
        }
        .ribbon-inner {
          display: inline-flex;
          align-items: center;
          gap: 8px;
        }
        .ribbon .icon :global(svg) {
           width: 18px;
           height: 18px;
           display: block;
         }
        .ribbon .label {
           line-height: 1;
          white-space: nowrap;
         }
         .ribbon:hover {
           filter: brightness(1.05);
           transform: rotate(45deg) translateY(-2px);
         }
         @media (max-width: 640px) {
          .github-ribbon { display: none; }
        }
      `}</style>
    </a>
  );
}
