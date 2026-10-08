// Safe to import from client components (no server-only dependencies).
export const MAX_ATTACHMENT_BYTES = 10 * 1024 * 1024; // per file
export const MAX_ATTACHMENTS = 10; // per message
export const MAX_COMPANY_ATTACHMENT_BYTES = 500 * 1024 * 1024; // all email attachments kept for one company
export const ACCEPT_ATTRIBUTE = "image/*,.pdf,.doc,.docx,.xls,.xlsx,.csv,.txt,.rtf,.odt";

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
