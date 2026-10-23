import type { SessionRecord } from "@/types";

// Only study summaries are stored (no API keys, no recordings, no document text).
const KEY = "recallmate.history.v1";
const MAX = 30;

export function loadHistory(): SessionRecord[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(KEY);
    const data = raw ? JSON.parse(raw) : [];
    return Array.isArray(data) ? (data as SessionRecord[]) : [];
  } catch {
    return [];
  }
}

export function saveSession(record: SessionRecord) {
  try {
    window.localStorage.setItem(KEY, JSON.stringify([record, ...loadHistory()].slice(0, MAX)));
  } catch {
    /* storage may be unavailable (private mode / quota); history is optional */
  }
}

export function clearHistory() {
  try { window.localStorage.removeItem(KEY); } catch { /* ignore */ }
}

/** Concepts to prioritise: recent revision concepts from sessions on the same topic. */
export function priorityConcepts(history: SessionRecord[], topic: string): string[] {
  const t = topic.trim().toLowerCase();
  const set = new Set<string>();
  history.filter((h) => h.topic.trim().toLowerCase() === t).slice(0, 5).forEach((h) => h.revise.forEach((c) => set.add(c)));
  return [...set].slice(0, 6);
}
