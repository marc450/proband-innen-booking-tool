"use client";

// Drag-and-drop / click video uploader for the video block. Asks our
// server for a one-time Cloudflare Stream upload URL, then uploads the
// file straight to Cloudflare (with progress), and stores the returned
// video uid. Cloudflare needs a few minutes to encode before playback.
import { useRef, useState, useCallback } from "react";
import { Upload } from "tus-js-client";
import { UploadCloud, Loader2, X, CheckCircle2 } from "lucide-react";

// Resumable chunked upload via Cloudflare's direct-creator flow. The tus
// client POSTs its creation request to our backend (`endpoint`), which
// returns Cloudflare's one-time upload URL; the client then uploads the
// file directly to Cloudflare in chunks. Resolves with the video uid,
// which is the last path segment of the upload URL (…/tus/<uid>).
//
// Chunk size must be a multiple of 256 KiB; 50 MB is Cloudflare's
// recommendation. Resume-fingerprinting is disabled so a failed attempt
// never tries to resume a dead URL (which Cloudflare's tusv2 rejects).
function tusUpload(file: File, onProgress: (pct: number) => void): Promise<string> {
  return new Promise((resolve, reject) => {
    const upload = new Upload(file, {
      endpoint: "/api/admin/lms/video-upload-url",
      chunkSize: 52_428_800, // 50 MB (200 * 256 KiB)
      retryDelays: [0, 3000, 6000, 12000],
      storeFingerprintForResuming: false,
      removeFingerprintOnSuccess: true,
      metadata: { maxDurationSeconds: "7200", name: file.name, filetype: file.type },
      onError: (err) => reject(err instanceof Error ? err : new Error(String(err))),
      onProgress: (sent, total) => onProgress(Math.round((sent / total) * 100)),
      onSuccess: () => {
        const m = (upload.url || "").match(/\/tus\/([^/?]+)/);
        if (m) resolve(m[1]);
        else reject(new Error("Konnte die Video-ID nicht ermitteln."));
      },
    });
    upload.start();
  });
}

export function VideoDropzone({
  value,
  onChange,
}: {
  value: string;
  onChange: (uid: string) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [busy, setBusy] = useState(false);
  const [pct, setPct] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const handleFile = useCallback(
    async (file: File | undefined) => {
      if (!file) return;
      if (!file.type.startsWith("video/")) {
        setError("Bitte eine Videodatei auswählen.");
        return;
      }
      setBusy(true);
      setError(null);
      setPct(0);
      try {
        const uid = await tusUpload(file, setPct);
        onChange(uid);
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        // The backend returns 501 when the Cloudflare env vars are unset.
        setError(
          /\b501\b/.test(msg)
            ? "Video-Upload ist noch nicht konfiguriert. Bitte CLOUDFLARE_ACCOUNT_ID und CLOUDFLARE_STREAM_API_TOKEN in Railway setzen, oder die Video-ID manuell eingeben."
            : msg,
        );
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

  if (value && !busy) {
    return (
      <div className="space-y-2">
        <div className="flex items-center gap-2 rounded-md border bg-emerald-50 px-3 py-2.5">
          <CheckCircle2 className="h-4 w-4 text-emerald-600 flex-shrink-0" />
          <div className="flex-1 min-w-0 text-sm">
            <span className="text-emerald-800 font-medium">Video gesetzt</span>
            <span className="block text-[11px] text-muted-foreground font-mono truncate">{value}</span>
          </div>
          <button type="button" title="Video entfernen" onClick={() => onChange("")}
            className="h-6 w-6 rounded-full hover:bg-black/5 flex items-center justify-center text-muted-foreground hover:text-red-600">
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
        <p className="text-[11px] text-muted-foreground">
          Nach dem Upload verarbeitet Cloudflare das Video. Bis es abspielbar ist, kann es einige
          Minuten dauern.
        </p>
        <button type="button" onClick={() => inputRef.current?.click()}
          className="text-xs text-[#0066FF] hover:underline">
          Anderes Video hochladen
        </button>
        <input ref={inputRef} type="file" accept="video/*" className="hidden"
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
        onDragOver={(e) => { e.preventDefault(); if (!busy) setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => !busy && onDrop(e)}
        className={`flex flex-col items-center justify-center gap-2 rounded-[10px] border-2 border-dashed px-4 py-8 text-center transition-colors ${
          busy ? "cursor-default" : "cursor-pointer"
        } ${dragging ? "border-[#0066FF] bg-[#0066FF]/5" : "border-input hover:border-foreground/30 bg-gray-50/50"}`}
      >
        {busy ? (
          <>
            <Loader2 className="h-6 w-6 text-[#0066FF] animate-spin" />
            <p className="text-sm text-muted-foreground">Video wird hochgeladen… {pct}%</p>
            <div className="w-full max-w-xs h-1.5 bg-black/10 rounded-full overflow-hidden">
              <div className="h-full bg-[#0066FF] transition-all" style={{ width: `${pct}%` }} />
            </div>
          </>
        ) : (
          <>
            <UploadCloud className="h-6 w-6 text-muted-foreground" />
            <p className="text-sm text-foreground font-medium">Video hierher ziehen oder klicken</p>
            <p className="text-[11px] text-muted-foreground">MP4, MOV, WEBM · auch große Dateien (in Teilen)</p>
          </>
        )}
      </div>
      {error && <p className="text-xs text-red-600">{error}</p>}
      <input ref={inputRef} type="file" accept="video/*" className="hidden"
        onChange={(e) => handleFile(e.target.files?.[0])} />
    </div>
  );
}
