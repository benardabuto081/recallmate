"use client";
import { useRef, useState } from "react";
import { FileText, Loader2, Upload, X } from "lucide-react";

const fmt = (b: number) => (b > 1048576 ? `${(b / 1048576).toFixed(1)} MB` : `${Math.max(1, Math.round(b / 1024))} KB`);

export function UploadZone({ file, extracting, error, onFile, onRemove }: {
  file: { name: string; size: number } | null;
  extracting: boolean;
  error: string | null;
  onFile: (f: File) => void;
  onRemove: () => void;
}) {
  const input = useRef<HTMLInputElement>(null);
  const [drag, setDrag] = useState(false);

  return (
    <div>
      {file ? (
        <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white p-4">
          <FileText className="h-6 w-6 shrink-0 text-indigo-600" aria-hidden />
          <div className="min-w-0 flex-1">
            <p className="truncate font-medium">{file.name}</p>
            <p className="text-sm text-slate-500">{fmt(file.size)} · text extracted in your browser</p>
          </div>
          <button type="button" onClick={onRemove} aria-label={`Remove ${file.name}`} className="rounded-lg p-2 text-slate-500 hover:bg-slate-100">
            <X className="h-5 w-5" />
          </button>
        </div>
      ) : (
        <div
          onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
          onDragLeave={() => setDrag(false)}
          onDrop={(e) => { e.preventDefault(); setDrag(false); const f = e.dataTransfer.files?.[0]; if (f) onFile(f); }}
          className={`rounded-2xl border-2 border-dashed p-8 text-center transition-colors ${drag ? "border-indigo-500 bg-indigo-50" : "border-slate-300 bg-white"}`}
        >
          {extracting ? (
            <p className="flex items-center justify-center gap-2 text-slate-600" role="status"><Loader2 className="h-5 w-5 animate-spin" /> Reading your notes…</p>
          ) : (
            <>
              <Upload className="mx-auto h-7 w-7 text-indigo-600" aria-hidden />
              <p className="mt-3 font-medium">Drag your lecture notes here</p>
              <p className="text-sm text-slate-500">PDF, TXT or DOCX · up to 10 MB</p>
              <button type="button" onClick={() => input.current?.click()} className="mt-4 rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-medium hover:bg-slate-50">
                Choose a file
              </button>
            </>
          )}
          <input ref={input} type="file" accept=".pdf,.txt,.docx" className="sr-only" aria-label="Upload study notes"
            onChange={(e) => { const f = e.target.files?.[0]; if (f) onFile(f); e.target.value = ""; }} />
        </div>
      )}
      {error && <p role="alert" className="mt-2 rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
    </div>
  );
}
