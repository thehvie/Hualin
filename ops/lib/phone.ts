// Phone numbers are stored and shown as 407.555.0123.

/**
 * Formats a US phone number as ###.###.####. Accepts any common way of typing it (parentheses, dashes, spaces, a leading
 * 1 or +1) and keeps an extension ("x12", "ext 12") after the number. Anything that isn't a 10-digit US number
 * (international, or too short) is returned as typed, trimmed.
 */
export function formatPhone(raw: string | null | undefined): string {
  const text = String(raw ?? "").trim();
  if (!text) return "";

  let main = text;
  let ext = "";
  const m = text.match(/^(.*?)[\s,]*(?:ext\.?|extension|x|#)\s*(\d{1,6})\s*$/i);
  if (m) {
    main = m[1];
    ext = m[2];
  }

  let digits = main.replace(/\D/g, "");
  if (digits.length === 11 && digits.startsWith("1")) digits = digits.slice(1);
  if (digits.length !== 10) return text;

  return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6)}${ext ? ` x${ext}` : ""}`;
}

/** A tel: link target that dials correctly whatever the display format is. */
export function phoneHref(raw: string | null | undefined): string {
  // Dial the main number only; an extension is typed in after the call connects.
  const main = String(raw ?? "").replace(/[\s,]*(?:ext\.?|extension|x|#)\s*\d{1,6}\s*$/i, "");
  const digits = main.replace(/\D/g, "");
  const national = digits.length === 11 && digits.startsWith("1") ? digits.slice(1) : digits;
  return `tel:${national.length === 10 ? `+1${national}` : national}`;
}
