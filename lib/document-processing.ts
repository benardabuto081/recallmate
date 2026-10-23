// Runs in the browser only. Files are parsed locally; nothing is uploaded until a study session starts.
export const MAX_FILE_BYTES = 10 * 1024 * 1024;
export const MAX_CHARS = 200_000;
const MAX_PDF_PAGES = 150;
export const MODEL_CONTEXT_CHARS = 24_000;

const clean = (s: string) => s.replace(/\r/g, "").replace(/[ \t]+/g, " ").replace(/ *\n */g, "\n").replace(/\n{3,}/g, "\n\n").trim();

async function readPdf(file: File): Promise<string> {
  const pdfjs = await import("pdfjs-dist");
  pdfjs.GlobalWorkerOptions.workerSrc = new URL("pdfjs-dist/build/pdf.worker.min.mjs", import.meta.url).toString();
  const doc = await pdfjs.getDocument({ data: new Uint8Array(await file.arrayBuffer()) }).promise;
  if (doc.numPages > MAX_PDF_PAGES) throw new Error(`This PDF has ${doc.numPages} pages. The limit is ${MAX_PDF_PAGES}; try splitting it by chapter.`);
  let text = "";
  for (let p = 1; p <= doc.numPages; p++) {
    const content = await (await doc.getPage(p)).getTextContent();
    text += content.items.map((it) => ("str" in it ? it.str + (it.hasEOL ? "\n" : " ") : "")).join("") + "\n\n";
  }
  return text;
}

export async function processFile(file: File): Promise<{ text: string; topics: string[] }> {
  const ext = file.name.split(".").pop()?.toLowerCase();
  if (!ext || !["pdf", "txt", "docx"].includes(ext)) throw new Error("Unsupported file type. Please upload a PDF, TXT or DOCX file.");
  if (file.size === 0) throw new Error("This file is empty.");
  if (file.size > MAX_FILE_BYTES) throw new Error(`This file is ${(file.size / 1048576).toFixed(1)} MB. The limit is 10 MB.`);
  let raw: string;
  try {
    if (ext === "txt") raw = await file.text();
    else if (ext === "docx") raw = (await (await import("mammoth/mammoth.browser")).extractRawText({ arrayBuffer: await file.arrayBuffer() })).value;
    else raw = await readPdf(file);
  } catch (e) {
    if (e instanceof Error && /limit is/.test(e.message)) throw e;
    throw new Error("We couldn't read this file. It may be corrupted or password-protected.");
  }
  const text = clean(raw);
  if (text.length < 40)
    throw new Error("No extractable text was found. Scanned or image-only documents aren't supported — try a text-based file or paste your notes into a TXT file.");
  if (text.length > MAX_CHARS) throw new Error(`This document has about ${Math.round(text.length / 1000)}k characters; the limit is ${MAX_CHARS / 1000}k. Try uploading a single chapter or section.`);
  return { text, topics: detectTopics(text) };
}

/** Heuristic: short heading-like lines followed by body text. */
export function detectTopics(text: string): string[] {
  const lines = text.split("\n").map((l) => l.trim());
  const found: string[] = [];
  for (let i = 0; i < lines.length - 1 && found.length < 8; i++) {
    const l = lines[i];
    if (l.length < 4 || l.length > 60 || /[.:;,!?]$/.test(l) || !/^[A-Z0-9]/.test(l) || l.split(" ").length > 8) continue;
    if ((lines[i + 1] ?? "").length < 40 && !(lines[i + 2] ?? "").length) continue;
    const t = l.replace(/^\d+(\.\d+)*[.)]?\s+/, "");
    if (t.length > 3 && !found.some((f) => f.toLowerCase() === t.toLowerCase())) found.push(t);
  }
  return found;
}

export function chunkText(text: string, size = 1800): string[] {
  const chunks: string[] = [];
  let cur = "";
  for (const para of text.split(/\n\s*\n/)) {
    if (cur && cur.length + para.length > size) { chunks.push(cur); cur = ""; }
    cur += (cur ? "\n\n" : "") + para;
    while (cur.length > size * 1.5) { chunks.push(cur.slice(0, size)); cur = cur.slice(size); }
  }
  if (cur) chunks.push(cur);
  return chunks;
}

/** Whole document if it fits; otherwise topic-relevant chunks plus evenly spaced coverage, in original order. */
export function selectContext(text: string, topic: string, max = MODEL_CONTEXT_CHARS): string {
  if (text.length <= max) return text;
  const chunks = chunkText(text);
  const words = topic.toLowerCase().split(/\W+/).filter((w) => w.length > 2);
  const scored = chunks.map((c, i) => ({ i, s: words.reduce((n, w) => n + (c.toLowerCase().split(w).length - 1), 0) }));
  const picked = new Set<number>();
  let used = 0;
  const add = (i: number) => { if (!picked.has(i) && used + chunks[i].length <= max) { picked.add(i); used += chunks[i].length; } };
  [...scored].filter((x) => x.s > 0).sort((a, b) => b.s - a.s).forEach((x) => { if (used < max * 0.6) add(x.i); });
  const step = Math.max(1, Math.floor(chunks.length / Math.max(1, Math.floor(max / 1800))));
  for (let i = 0; i < chunks.length && used < max; i += step) add(i);
  for (let i = 0; i < chunks.length && used < max; i++) add(i);
  return [...picked].sort((a, b) => a - b).map((i) => chunks[i]).join("\n\n[…]\n\n");
}
