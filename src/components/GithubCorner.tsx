'use client';
import React from "react";

export default function GithubCorner({
  repo = "https://github.com/ushakrishnan/SenseiSeek",
  size = 80,
}: {
  repo?: string;
  size?: number;
}) {
  return (
    <a
      href={repo}
      className="fixed top-3 right-3 z-[9999]"
      aria-label="Fork me on GitHub"
      target="_blank"
      rel="noopener noreferrer"
    >
      <svg
        width={size}
        height={size}
        viewBox="0 0 250 250"
        className="fill-gray-900 text-white hover:fill-gray-800 dark:fill-gray-100 dark:text-gray-900"
        role="img"
        aria-hidden="true"
      >
        <path d="M0 0l115 0 15 15 120 0 0 120-15 15 0 115-235 0z"></path>
        <path
          className="origin-[130px_106px] octo-arm"
          d="M128.3,109.0
             C113.8,99.7 119.0,89.6 119.0,89.6
             C122.0,82.7 120.5,78.6 120.5,78.6
             C119.2,72.0 123.4,76.3 123.4,76.3
             C127.3,80.9 125.5,87.3 125.5,87.3
             C122.9,97.6 130.6,101.9 134.4,103.2"
          fill="currentColor"
        ></path>
        <path
          className="octo-body"
          d="M115.0,115.0
             C114.9,115.1 114.9,115.1 114.8,115.2
             C100.1,126.9 98.1,145.0 98.1,145.0
             C98.1,145.0 95.0,155.0 110.0,160.0
             C110.0,160.0 122.0,161.0 130.0,150.0
             C130.0,150.0 139.0,138.0 132.0,128.0
             C132.0,128.0 130.0,123.0 128.3,109.0 Z"
          fill="currentColor"
        ></path>
      </svg>

      <style jsx>{`
        .octo-arm {
          transform-origin: 130px 106px;
        }
        a:hover .octo-arm {
          animation: octo-wave 560ms ease-in-out;
        }
        @keyframes octo-wave {
          0%,
          100% {
            transform: rotate(0);
          }
          20%,
          60% {
            transform: rotate(-25deg);
          }
          40%,
          80% {
            transform: rotate(10deg);
          }
        }
        @media (prefers-reduced-motion: reduce) {
          a:hover .octo-arm {
            animation: none;
          }
        }
      `}</style>
    </a>
  );
}
