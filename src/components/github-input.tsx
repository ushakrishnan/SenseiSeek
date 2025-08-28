"use client";
import React from 'react';
import { normalizeGithubInput, displayGithubHint } from '@/lib/github-utils';

type Props = {
  value?: string;
  onChange?: (val: string) => void;
  id?: string;
  label?: string;
}

export default function GithubInput({ value = '', onChange, id = 'github', label = 'GitHub' }: Props) {
  const [input, setInput] = React.useState(value);
  const [hint, setHint] = React.useState('');

  React.useEffect(() => {
    setInput(value);
  }, [value]);

  const update = (v: string) => {
    setInput(v);
    const norm = normalizeGithubInput(v);
    setHint(displayGithubHint(norm));
    onChange?.(v);
  };

  const norm = normalizeGithubInput(input);

  return (
    <div className="space-y-1">
      <label htmlFor={id} className="text-sm font-medium text-gray-700">{label}</label>
      <input
        id={id}
        value={input}
        onChange={e => update(e.target.value)}
        className="w-full rounded-md border px-3 py-2"
        placeholder="e.g. ushakrishnan or https://github.com/username"
      />
      <p className="text-xs text-gray-500">{norm.error ? `Invalid: ${norm.error}` : `Normalized: ${displayGithubHint(norm)}`}</p>
    </div>
  );
}
