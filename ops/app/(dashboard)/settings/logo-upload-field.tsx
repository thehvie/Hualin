"use client";

import { useRef, useState } from "react";

const MAX_FILE_BYTES = 1.5 * 1024 * 1024; // 1.5MB source file

export function LogoUploadField({
  initialLogoDataUrl,
  onReadingChange,
}: {
  initialLogoDataUrl: string | null;
  onReadingChange?: (reading: boolean) => void;
}) {
  const [preview, setPreview] = useState<string | null>(initialLogoDataUrl);
  const [selectedFileName, setSelectedFileName] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [reading, setReading] = useState(false);
  const hiddenInputRef = useRef<HTMLInputElement>(null);

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setError(null);
    setSelectedFileName(null);
    if (file.size > MAX_FILE_BYTES) {
      setError("That image is too large — please use a file under 1.5MB.");
      e.target.value = "";
      return;
    }

    setReading(true);
    onReadingChange?.(true);

    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = String(reader.result);
      setPreview(dataUrl);
      setSelectedFileName(file.name);
      if (hiddenInputRef.current) hiddenInputRef.current.value = dataUrl;
      setReading(false);
      onReadingChange?.(false);
    };
    reader.onerror = () => {
      setError("Couldn't read that file — please try again.");
      setReading(false);
      onReadingChange?.(false);
    };
    reader.readAsDataURL(file);
  }

  return (
    <div className="flex flex-col gap-2">
      <label className="text-sm font-medium text-zinc-700">Logo</label>
      <div className="flex items-center gap-4">
        <div className="flex h-20 w-20 items-center justify-center overflow-hidden rounded-lg border border-dashed border-zinc-300 bg-zinc-50">
          {preview ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={preview} alt="Company logo" className="h-full w-full object-contain" />
          ) : (
            <span className="text-xs text-zinc-400">No logo</span>
          )}
        </div>
        <div className="flex flex-col gap-1">
          <input
            type="file"
            accept="image/png,image/jpeg,image/webp,image/svg+xml"
            onChange={handleFileChange}
            className="text-sm text-zinc-600 file:mr-3 file:rounded-lg file:border file:border-zinc-300 file:bg-white file:px-3 file:py-1.5 file:text-sm file:font-semibold file:text-zinc-700 hover:file:bg-zinc-50"
          />
          <p className="text-xs text-zinc-400">PNG, JPG, WebP, or SVG — under 1.5MB.</p>
          {reading && <p className="text-xs font-medium text-zinc-500">Reading file…</p>}
          {!reading && selectedFileName && (
            <p className="text-xs font-medium text-emerald-600">Selected: {selectedFileName} — ready to save</p>
          )}
        </div>
      </div>
      {error && <p className="text-xs font-medium text-red-600">{error}</p>}
      <input ref={hiddenInputRef} type="hidden" name="logoDataUrl" defaultValue="" />
    </div>
  );
}
