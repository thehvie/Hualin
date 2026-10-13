/** A prominent "pay" link under the total on the customer's estimate and invoice pages. */
export function PayButton({ url, label, note }: { url: string; label: string; note?: string }) {
  return (
    <div className="flex flex-col items-center gap-1.5 rounded-xl border border-zinc-200 bg-white p-5">
      <a
        href={url}
        target="_blank"
        rel="noreferrer noopener"
        className="w-full rounded-lg bg-brand px-5 py-3 text-center text-base font-semibold text-white hover:bg-brand-dark sm:w-auto sm:min-w-60"
      >
        {label}
      </a>
      {note && <p className="text-xs text-zinc-400">{note}</p>}
    </div>
  );
}
