import type { Accuracy, Completeness, Evaluation, Question, QuestionResult } from "@/types";

/**
 * Transparent scoring rule (no model-invented scores):
 *   base = 60% accuracy + 40% completeness   (strong/complete = 2, partial = 1, weak/incomplete = 0)
 *   final = base - 10 per hint used (max -30)
 *   outcome: >= 80 strong, >= 40 partial, otherwise weak
 *   session score = average of final question scores
 */
const A: Record<Accuracy, number> = { strong: 2, partial: 1, weak: 0 };
const C: Record<Completeness, number> = { complete: 2, partial: 1, incomplete: 0 };
export const HINT_PENALTY = 10;
export const MAX_HINT_PENALTY = 30;
export const MAX_FOLLOW_UPS = 2;

export const baseScore = (a: Accuracy, c: Completeness) => Math.round(100 * (0.6 * (A[a] / 2) + 0.4 * (C[c] / 2)));
export const finalScore = (base: number, hints: number) => Math.max(0, base - Math.min(hints * HINT_PENALTY, MAX_HINT_PENALTY));
export const categorize = (score: number): Accuracy => (score >= 80 ? "strong" : score >= 40 ? "partial" : "weak");

export function buildResult(q: Question, ev: Evaluation | null, hints: number, followUps: number, skipped: boolean): QuestionResult {
  const score = skipped || !ev ? 0 : finalScore(baseScore(ev.accuracy, ev.completeness), hints);
  return {
    questionId: q.id,
    concept: q.concept,
    question: q.question,
    score,
    outcome: categorize(score),
    hintsUsed: hints,
    followUpsUsed: followUps,
    skipped,
    correctPoints: ev?.correctPoints ?? [],
    missingPoints: skipped || !ev ? q.expectedKeyConcepts : ev.missingPoints,
    incorrectClaims: ev?.incorrectClaims ?? [],
    satisfactoryAnswer: q.satisfactoryAnswer,
    sourceContext: q.sourceContext,
  };
}

export function summarize(results: QuestionResult[]) {
  const n = results.length;
  return {
    attempted: n,
    strong: results.filter((r) => r.outcome === "strong").length,
    partial: results.filter((r) => r.outcome === "partial").length,
    weak: results.filter((r) => r.outcome === "weak").length,
    score: n ? Math.round(results.reduce((s, r) => s + r.score, 0) / n) : 0,
    hintsUsed: results.reduce((s, r) => s + r.hintsUsed, 0),
    followUpsUsed: results.reduce((s, r) => s + r.followUpsUsed, 0),
    recalled: results.filter((r) => r.outcome === "strong").map((r) => r.concept),
    revise: results.filter((r) => r.outcome !== "strong").map((r) => r.concept),
  };
}
