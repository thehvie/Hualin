// Terms & conditions are plain text with a little light formatting, so a company can paste in what it already has:
//   ### Heading        **bold**        1. numbered item        - or * or • bullet
// Anything else is a normal paragraph. Used by the PDFs, the customer pages and the Settings preview.

export interface Run {
  text: string;
  bold: boolean;
}

export type TermBlock =
  | { kind: "heading"; runs: Run[] }
  | { kind: "paragraph"; runs: Run[] }
  | { kind: "bullet"; runs: Run[]; depth: number }
  | { kind: "numbered"; label: string; runs: Run[] }
  | { kind: "space" };

/** Splits a line on **bold** markers. An unmatched marker is simply dropped, never shown. */
export function inlineRuns(line: string): Run[] {
  return line
    .split("**")
    .map((text, i) => ({ text, bold: i % 2 === 1 }))
    .filter((r) => r.text.length > 0);
}

export function parseTerms(text: string): TermBlock[] {
  const blocks: TermBlock[] = [];
  for (const raw of text.replace(/\r\n?/g, "\n").split("\n")) {
    const line = raw.replace(/\s+$/, "");
    if (!line.trim()) {
      if (blocks.length > 0 && blocks[blocks.length - 1].kind !== "space") blocks.push({ kind: "space" });
      continue;
    }

    const heading = line.match(/^\s*#{1,6}\s+(.*)$/);
    if (heading) {
      blocks.push({ kind: "heading", runs: inlineRuns(heading[1]).map((r) => ({ ...r, bold: true })) });
      continue;
    }
    const numbered = line.match(/^\s*(\d+)[.)]\s+(.*)$/);
    if (numbered) {
      blocks.push({ kind: "numbered", label: `${numbered[1]}.`, runs: inlineRuns(numbered[2]) });
      continue;
    }
    // A single * - or • followed by a space; "**bold**" at the start of a line is not a bullet.
    const bullet = line.match(/^(\s*)[*\-\u2022]\s+(.*)$/);
    if (bullet) {
      blocks.push({ kind: "bullet", runs: inlineRuns(bullet[2]), depth: bullet[1].length >= 2 ? 1 : 0 });
      continue;
    }
    blocks.push({ kind: "paragraph", runs: inlineRuns(line.trim()) });
  }
  while (blocks.length > 0 && blocks[blocks.length - 1].kind === "space") blocks.pop();
  return blocks;
}
