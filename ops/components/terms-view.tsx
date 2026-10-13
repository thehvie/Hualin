import { parseTerms } from "@/lib/terms-format";

/** Terms & conditions text with headings, bold, bullets and numbered items shown properly. */
export function TermsView({ text, className = "" }: { text: string; className?: string }) {
  const blocks = parseTerms(text);
  return (
    <div className={`flex flex-col gap-1 ${className}`}>
      {blocks.map((b, i) => {
        if (b.kind === "space") return <div key={i} className="h-1.5" />;
        const runs = b.runs.map((r, j) => (r.bold ? <strong key={j} className="font-semibold text-zinc-700">{r.text}</strong> : <span key={j}>{r.text}</span>));
        if (b.kind === "heading") return <p key={i} className="mt-1 text-sm font-semibold text-zinc-700">{runs}</p>;
        if (b.kind === "numbered")
          return (
            <p key={i} className="flex gap-2">
              <span className="w-5 shrink-0 text-right font-semibold text-zinc-700">{b.label}</span>
              <span>{runs}</span>
            </p>
          );
        if (b.kind === "bullet")
          return (
            <p key={i} className={`flex gap-2 ${b.depth ? "pl-12" : "pl-7"}`}>
              <span className="shrink-0">•</span>
              <span>{runs}</span>
            </p>
          );
        return <p key={i}>{runs}</p>;
      })}
    </div>
  );
}
