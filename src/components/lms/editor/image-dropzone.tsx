"use client";

// Drag-and-drop / click image uploader for the figure block. Uploads to
// the lms-images bucket via /api/admin/lms/upload-image and returns the
// public URL. Shows a preview once set, with replace/remove actions.
import { useRef, useState, useCallback } from "react";
import { UploadCloud, Loader2, X } from "lucide-react";

async function uploadImage(file: File): Promise<string> {
  const form = new FormData();
  form.append("file", file);
  const res = await fetch("/api/admin/lms/upload-image", { method: "POST", body: form });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json.error || "Upload fehlgeschlagen.");
  return json.url as string;
}

export function ImageDropzone({
  value,
  onChange,
}: {
  value: string;
  onChange: (url: string) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFile = useCallback(
    async (file: File | undefined) => {
      if (!file) return;
      setBusy(true);
      setError(null);
      try {
        const url = await uploadImage(file);
        onChange(url);
      } catch (e) {
        setError(e instanceof Error ? e.message : String(e));
      } finally {
        setBusy(false);
      }
    },
    [onChange],
  );

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    handleFile(e.dataTransfer.files?.[0]);
  };

  if (value) {
    return (
      <div className="space-y-2">
        <div className="relative inline-block">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={value} alt="" className="max-h-48 rounded-md border object-contain bg-gray-50" />
          <button
            type="button"
            title="Bild entfernen"
            onClick={() => onChange("")}
            className="absolute -top-2 -right-2 h-6 w-6 rounded-full bg-white border shadow flex items-center justify-center text-muted-foreground hover:text-red-600"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
        <div>
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={busy}
            className="text-xs text-[#0066FF] hover:underline disabled:opacity-50"
          >
            {busy ? "Lädt…" : "Bild ersetzen"}
          </button>
        </div>
        {error && <p className="text-xs text-red-600">{error}</p>}
        <input ref={inputRef} type="file" accept="image/*" className="hidden"
          onChange={(e) => handleFile(e.target.files?.[0])} />
      </div>
    );
  }

  return (
    <div className="space-y-1.5">
      <div
        role="button"
        tabIndex={0}
        onClick={() => !busy && inputRef.current?.click()}
        onKeyDown={(e) => { if ((e.key === "Enter" || e.key === " ") && !busy) inputRef.current?.click(); }}
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        className={`flex flex-col items-center justify-center gap-2 rounded-[10px] border-2 border-dashed px-4 py-8 cursor-pointer transition-colors text-center ${
          dragging ? "border-[#0066FF] bg-[#0066FF]/5" : "border-input hover:border-foreground/30 bg-gray-50/50"
        }`}
      >
        {busy ? (
          <>
            <Loader2 className="h-6 w-6 text-[#0066FF] animate-spin" />
            <p className="text-sm text-muted-foreground">Bild wird hochgeladen…</p>
          </>
        ) : (
          <>
            <UploadCloud className="h-6 w-6 text-muted-foreground" />
            <p className="text-sm text-foreground font-medium">Bild hierher ziehen oder klicken</p>
            <p className="text-[11px] text-muted-foreground">PNG, JPG, WEBP, GIF, AVIF · max. 15 MB</p>
          </>
        )}
      </div>
      {error && <p className="text-xs text-red-600">{error}</p>}
      <input ref={inputRef} type="file" accept="image/*" className="hidden"
        onChange={(e) => handleFile(e.target.files?.[0])} />
    </div>
  );
}
