"use client";

import { useState } from "react";

/**
 * Photo picker: drag and drop, choose from the device, or (on phones/tablets)
 * open the camera directly. Hands the chosen image files to `onFiles`.
 */
export function PhotoDropzone({
  onFiles,
  disabled,
  hint = "Up to 5 photos, 8MB each",
}: {
  onFiles: (files: File[]) => void;
  disabled?: boolean;
  hint?: string;
}) {
  const [dragging, setDragging] = useState(false);

  function handle(list: FileList | null) {
    const images = Array.from(list || []).filter((f) => f.type.startsWith("image/"));
    if (images.length > 0) onFiles(images);
  }

  const buttonClass =
    "cursor-pointer rounded-full border border-brand/40 bg-white px-3 py-1.5 text-xs font-semibold text-brand-dark shadow-sm hover:bg-brand/5";

  return (
    <div
      onDragOver={(e) => {
        e.preventDefault();
        setDragging(true);
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDragging(false);
        if (!disabled) handle(e.dataTransfer.files);
      }}
      className={`flex flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed px-4 py-5 text-center transition-colors ${
        dragging ? "border-brand bg-brand/10" : "border-brand/40 bg-brand/5"
      }`}
    >
      <span className="text-sm font-semibold text-brand-dark">Drag and drop photos here</span>
      <div className="flex flex-wrap items-center justify-center gap-2">
        <label className={buttonClass}>
          📷 Take photo
          <input
            type="file"
            accept="image/*"
            capture="environment"
            disabled={disabled}
            className="hidden"
            onChange={(e) => {
              handle(e.target.files);
              e.target.value = "";
            }}
          />
        </label>
        <label className={buttonClass}>
          Choose photos
          <input
            type="file"
            accept="image/*"
            multiple
            disabled={disabled}
            className="hidden"
            onChange={(e) => {
              handle(e.target.files);
              e.target.value = "";
            }}
          />
        </label>
      </div>
      <span className="text-xs text-zinc-400">{hint}</span>
    </div>
  );
}
