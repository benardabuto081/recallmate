import type { QuestionResult, SessionConfig, SessionRecord } from "@/types";

/**
 * In-memory state shared across client-side navigation. Uploaded document text lives only
 * here (never in browser storage), so a page refresh means re-uploading the file.
 */
export const store: {
  config?: SessionConfig;
  results?: QuestionResult[];
  record?: SessionRecord;
  upload?: { name: string; size: number; text: string; topics: string[] };
} = {};
