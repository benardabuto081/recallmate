"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Brand } from "@/components/Brand";
import { summarize } from "@/lib/assessment";
import { loadHistory } from "@/lib/storage";
import { store } from "@/lib/session-store";
import type { QuestionResult, SessionRecord } from "@/types";

export default function ResultsPage() {
  const router = useRouter();
  const [record, setRecord] = useState<SessionRecord | null>(null);
  const [results, setResults] = useState<QuestionResult[] | null>(null);
  const [ready, setReady] = useState(false);
  const [review, setReview] = useState(false);

  useEffect(() => {
    if (store.record) { setRecord(store.record); setResults(store.results ?? null); }
    else setRecord(loadHistory()[0] ?? null);
    setReady(true);
  }, []);

  if (!ready) return null;
  if (!record) {
    return (
      <div className="mx-auto max-w-xl px-4 py-20 text-center">
        <p className="text-lg font-medium">No finished session to show yet.</p>
        <button type="button" onClick={() => router.push("/")} className="mt-4 rounded-xl bg-indigo-600 px-5 py-3 font-medium text-white">Back to dashboard</button>
      </div>
    );
  }

  const s = results ? summarize(results) : null;
  const recalled = s ? s.recalled : record.concepts.filter((c) => !record.revise.includes(c));
  const missed = results?.filter((r) => r.outcome !== "strong") ?? [];
  const steps: string[] = [];
  if (record.revise.length) steps.push(`Re-read your notes on: ${record.revise.join(", ")}. Your next session on this topic will ask about these first.`);
  if (record.hintsUsed > 0) steps.push(`You used ${record.hintsUsed} hint${record.hintsUsed > 1 ? "s" : ""} — try a revision concept again without hints.`);
  if (!record.revise.length) steps.push("Every assessed concept was recalled strongly. Try a longer session or a new topic.");
  if (record.source === "demo") steps.push("This was the demo pack. Upload your own notes (with an API key configured) for sessions based on your material.");

  const startAgain = () => {
    store.results = undefined; store.record = undefined;
    router.push("/#setup");
  };

  return (
    <div className="mx-auto max-w-3xl px-4 pb-16 sm:px-6">
      <header className="py-5"><Brand /></header>
      <h1 className="text-3xl font-semibold tracking-tight">Your recall report</h1>
      <p className="mt-1 text-slate-600">{record.topic} · {record.mode === "groupmate" ? "Groupmate Mode" : "Quick Quiz"} · {new Date(record.date).toLocaleDateString()}</p>

      <section className="mt-6 grid gap-4 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:grid-cols-3 sm:p-8">
        <div>
          <p className="text-5xl font-semibold text-indigo-600">{record.score}%</p>
          <p className="mt-1 text-sm text-slate-600">Session performance indicator</p>
        </div>
        <dl className="grid grid-cols-3 gap-3 text-center sm:col-span-2">
          {([["Strong", record.strong], ["Partial", record.partial], ["Weak", record.weak]] as const).map(([l, n]) => (
            <div key={l} className="rounded-2xl bg-slate-50 p-3"><dt className="text-sm text-slate-600">{l}</dt><dd className="text-2xl font-semibold">{n}</dd></div>
          ))}
        </dl>
        <p className="text-sm text-slate-600 sm:col-span-3">
          {record.attempted} question{record.attempted === 1 ? "" : "s"} attempted · {new Set(record.concepts).size} concepts assessed · {record.hintsUsed} hint{record.hintsUsed === 1 ? "" : "s"} used · {record.followUpsUsed} follow-up{record.followUpsUsed === 1 ? "" : "s"}
        </p>
        <p className="text-xs text-slate-500 sm:col-span-3">
          How it&apos;s calculated: each question scores 60% accuracy + 40% completeness from the recorded assessment, minus 10 points per hint (max 30); the session score is the average. It reflects recall of the concepts assessed in this session only — not a validated measure of memory or intelligence.
        </p>
      </section>

      <section className="mt-6 grid gap-4 sm:grid-cols-2">
        <div className="rounded-3xl border border-slate-200 bg-white p-5">
          <h2 className="font-semibold">Recalled well</h2>
          {recalled.length ? <ul className="mt-2 list-disc space-y-1 pl-5 text-sm">{recalled.map((c) => <li key={c}>{c}</li>)}</ul> : <p className="mt-2 text-sm text-slate-600">No concepts reached a strong result this time.</p>}
        </div>
        <div className="rounded-3xl border border-slate-200 bg-white p-5">
          <h2 className="font-semibold">Needs revision</h2>
          {record.revise.length ? <ul className="mt-2 list-disc space-y-1 pl-5 text-sm">{record.revise.map((c) => <li key={c}>{c}</li>)}</ul> : <p className="mt-2 text-sm text-slate-600">Nothing flagged — nice work.</p>}
        </div>
      </section>

      <section className="mt-6 rounded-3xl border border-slate-200 bg-white p-5">
        <h2 className="font-semibold">Recommended next steps</h2>
        <ul className="mt-2 list-disc space-y-1 pl-5 text-sm">{steps.map((t) => <li key={t}>{t}</li>)}</ul>
      </section>

      {review && (
        <section className="mt-6 space-y-4" aria-label="Missed concepts">
          {missed.length === 0 ? <p className="rounded-2xl bg-white p-4 text-sm">No missed concepts to review.</p> : missed.map((r) => (
            <article key={r.questionId} className="rounded-3xl border border-slate-200 bg-white p-5 text-sm">
              <h3 className="font-semibold">{r.concept}</h3>
              <p className="mt-1 text-slate-600">{r.question}</p>
              {r.skipped && <p className="mt-2 text-slate-500">You skipped this question.</p>}
              {r.missingPoints.length > 0 && <p className="mt-2"><strong>Missing:</strong> {r.missingPoints.join("; ")}</p>}
              {r.incorrectClaims.length > 0 && <p className="mt-1"><strong>Check:</strong> {r.incorrectClaims.join("; ")}</p>}
              <p className="mt-2"><strong>A satisfactory answer:</strong> {r.satisfactoryAnswer}</p>
              {r.sourceContext && <p className="mt-2 border-l-2 border-indigo-200 pl-3 text-slate-600">From your notes: {r.sourceContext}</p>}
            </article>
          ))}
        </section>
      )}

      <div className="mt-8 flex flex-wrap gap-3">
        {results ? (
          <button type="button" onClick={() => setReview((v) => !v)} aria-expanded={review} className="rounded-xl border border-slate-300 bg-white px-5 py-3 font-medium hover:bg-slate-50">
            {review ? "Hide missed concepts" : "Review missed concepts"}
          </button>
        ) : <p className="w-full text-sm text-slate-500">Detailed review is only available right after a session (answers aren&apos;t stored).</p>}
        <button type="button" onClick={startAgain} className="rounded-xl bg-indigo-600 px-5 py-3 font-medium text-white hover:bg-indigo-700">Start another session</button>
        <button type="button" onClick={() => router.push("/")} className="rounded-xl border border-slate-300 bg-white px-5 py-3 font-medium hover:bg-slate-50">Return to dashboard</button>
      </div>
    </div>
  );
}
