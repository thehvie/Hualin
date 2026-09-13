"use client";

import { useState } from "react";

export function CopySnippet({ value, multiline }: { value: string; multiline?: boolean }) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    await navigator.clipboard.writeText(value);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="flex items-start gap-2">
      {multiline ? (
        <pre className="flex-1 overflow-x-auto rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2 text-xs text-zinc-700">
          {value}
        </pre>
      ) : (
        <input
          readOnly
          value={value}
          className="flex-1 rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm text-zinc-700"
        />
      )}
      <button
        onClick={handleCopy}
        className="shrink-0 rounded-lg border border-zinc-300 px-3 py-2 text-sm font-semibold text-zinc-700 hover:bg-zinc-50"
      >
        {copied ? "Copied!" : "Copy"}
      </button>
    </div>
  );
}
