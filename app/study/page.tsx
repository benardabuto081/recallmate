"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, ArrowRight, Lightbulb, Loader2, Mic, Send, SkipForward, Square, Volume2, VolumeX } from "lucide-react";
import { Brand } from "@/components/Brand";
import { buildResult, MAX_FOLLOW_UPS, summarize } from "@/lib/assessment";
import { errMsg, postJSON } from "@/lib/client-api";
import { demoHint, evaluateDemo, getDemoQuestions, DEMO_MATERIAL, DEMO_TOPIC } from "@/lib/demo";
import { store } from "@/lib/session-store";
import { saveSession } from "@/lib/storage";
import { canSpeak, speak, stopSpeaking, useSpeechRecognition } from "@/lib/speech";
import type { Evaluation, Exchange, Question, QuestionResult, SessionRecord } from "@/types";

type Msg = { id: number; role: "ai" | "user" | "hint"; text: string };
const delay = <T,>(v: T, ms: number) => new Promise<T>((r) => setTimeout(() => r(v), ms));

export default function StudyPage() {
  const router = useRouter();
  const cfg = store.config;
  const [demo, setDemo] = useState(cfg?.source === "demo");
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [idx, setIdx] = useState(0);
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [answer, setAnswer] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [phase, setPhase] = useState<"answering" | "reviewed">("answering");
  const [results, setResults] = useState<QuestionResult[]>([]);
  const [hints, setHints] = useState(0);
  const [followUps, setFollowUps] = useState(0);
  const [speakOn, setSpeakOn] = useState(cfg?.voice ?? false);

  const exchanges = useRef<Exchange[]>([]);
  const prompt = useRef("");
  const lastEval = useRef<Evaluation | null>(null);
  const retry = useRef<(() => void) | null>(null);
  const nextId = useRef(1);
  const init = useRef(false);
  const speakRef = useRef(speakOn);
  speakRef.current = speakOn;
  const endRef = useRef<HTMLDivElement>(null);
  const base = useRef("");
  const rec = useSpeechRecognition(useCallback((t: string) => setAnswer((base.current ? base.current + " " : "") + t), []));

  const say = useCallback((role: Msg["role"], text: string) => {
    setMsgs((m) => [...m, { id: nextId.current++, role, text }]);
    if (role !== "user" && speakRef.current) speak(text);
  }, []);

  const present = useCallback((q: Question, i: number) => {
    prompt.current = q.question; exchanges.current = []; lastEval.current = null; retry.current = null;
    setHints(0); setFollowUps(0); setPhase("answering"); setError(null); setAnswer("");
    const c = store.config!;
    const lead = i === 0
      ? c.mode === "groupmate" ? `Hi! Let's see what you remember about ${c.topic}. Without looking at your notes: ` : `Quick quiz on ${c.topic}. `
      : c.mode === "groupmate" ? "Okay, next one: " : "";
    say("ai", lead + q.question);
  }, [say]);

  const load = useCallback(async (useDemo: boolean) => {
    const c = store.config;
    if (!c) return;
    setLoading(true); setLoadError(null); setMsgs([]); setResults([]); setIdx(0);
    try {
      const qs = useDemo
        ? getDemoQuestions(c.count, c.priorityConcepts)
        : (await postJSON<{ questions: Question[] }>("/api/generate-questions", { topic: c.topic, context: c.material, count: c.count, mode: c.mode, priorityConcepts: c.priorityConcepts })).questions;
      setQuestions(qs);
      present(qs[0], 0);
    } catch (e) { setLoadError(errMsg(e)); }
    finally { setLoading(false); }
  }, [present]);

  useEffect(() => {
    if (init.current) return;
    init.current = true;
    if (!store.config) { router.replace("/"); return; }
    load(store.config.source === "demo");
  }, [load, router]);

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" }); }, [msgs, busy]);
  useEffect(() => () => stopSpeaking(), []);

  const switchToDemo = () => {
    if (!store.config) return;
    store.config = { ...store.config, source: "demo", topic: DEMO_TOPIC, material: DEMO_MATERIAL, priorityConcepts: [] };
    setDemo(true); load(true);
  };

  const q = questions[idx];

  const finalize = (question: Question, ev: Evaluation | null, skipped: boolean, h: number, f: number) => {
    const res = buildResult(question, ev, h, f, skipped);
    setResults((r) => [...r, res]);
    let text = skipped || !ev ? `No problem — here's the idea to remember: ${question.satisfactoryAnswer}` : ev.feedback;
    if (!skipped && ev && res.outcome !== "strong" && ev.missingPoints.length) text += `\n\nWorth revising: ${ev.missingPoints.join("; ")}.`;
    say("ai", text);
    setPhase("reviewed");
  };

  const runEval = async (text: string) => {
    if (!q || !cfg) return;
    setBusy(true); setError(null);
    const ex = [...exchanges.current, { prompt: prompt.current, answer: text }];
    try {
      const ev = demo
        ? await delay(evaluateDemo(q, ex), 350)
        : (await postJSON<{ evaluation: Evaluation }>("/api/evaluate-answer", { action: "evaluate", mode: cfg.mode, question: q, exchanges: ex, followUpsRemaining: MAX_FOLLOW_UPS - followUps })).evaluation;
      exchanges.current = ex; lastEval.current = ev;
      const fu = ev.followUp;
      if (cfg.mode === "groupmate" && ev.nextAction !== "continue" && fu && followUps < MAX_FOLLOW_UPS) {
        say("ai", `${ev.feedback}\n\n${fu}`);
        prompt.current = fu; setFollowUps((n) => n + 1);
      } else finalize(q, ev, false, hints, followUps);
      retry.current = null;
    } catch (e) { setError(errMsg(e)); retry.current = () => runEval(text); }
    finally { setBusy(false); }
  };

  const submit = () => {
    const text = answer.trim();
    if (!text || busy || phase !== "answering") return;
    if (rec.state === "listening") rec.stop();
    say("user", text); setAnswer("");
    runEval(text);
  };

  const getHint = async () => {
    if (!q || !cfg || busy || hints >= 3) return;
    const level = hints + 1;
    setBusy(true); setError(null);
    try {
      const h = demo
        ? await delay(demoHint(q, exchanges.current, level), 250)
        : (await postJSON<{ hint: string }>("/api/evaluate-answer", { action: "hint", mode: cfg.mode, question: q, exchanges: exchanges.current, hintLevel: level })).hint;
      setHints(level); say("hint", h); retry.current = null;
    } catch (e) { setError(errMsg(e)); retry.current = getHint; }
    finally { setBusy(false); }
  };

  const finish = (list: QuestionResult[]) => {
    if (!cfg) return;
    if (list.length === 0) { router.push("/"); return; }
    const s = summarize(list);
    const record: SessionRecord = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`, date: new Date().toISOString(), topic: cfg.topic, mode: cfg.mode,
      source: store.config?.source ?? cfg.source, attempted: s.attempted, concepts: list.map((r) => r.concept), strong: s.strong, partial: s.partial,
      weak: s.weak, score: s.score, revise: s.revise, hintsUsed: s.hintsUsed, followUpsUsed: s.followUpsUsed,
    };
    saveSession(record);
    store.results = list; store.record = record;
    router.push("/results");
  };

  const finishEarly = () => {
    if (!window.confirm("Finish now? Questions you haven't answered won't count.")) return;
    const list = [...results];
    if (phase === "answering" && q && lastEval.current) list.push(buildResult(q, lastEval.current, hints, followUps, false));
    finish(list);
  };

  const next = () => (idx + 1 >= questions.length ? finish(results) : (setIdx(idx + 1), present(questions[idx + 1], idx + 1)));

  const toggleMic = () => {
    if (rec.state === "listening") rec.stop();
    else { base.current = answer.trim(); rec.start(); }
  };

  if (!cfg) return <div className="grid min-h-screen place-items-center text-slate-500">Taking you back to the dashboard…</div>;
  const total = questions.length || cfg.count;

  return (
    <div className="mx-auto flex h-[100dvh] max-w-3xl flex-col px-4 sm:px-6">
      <header className="py-3">
        <div className="flex items-center justify-between gap-3">
          <Brand />
          <div className="flex items-center gap-1">
            {canSpeak() && (
              <button type="button" onClick={() => { if (speakOn) stopSpeaking(); setSpeakOn(!speakOn); }} aria-pressed={speakOn} aria-label={speakOn ? "Turn off spoken responses" : "Turn on spoken responses"}
                className="rounded-lg p-2 text-slate-600 hover:bg-slate-100">{speakOn ? <Volume2 className="h-5 w-5" /> : <VolumeX className="h-5 w-5" />}</button>
            )}
            <button type="button" onClick={finishEarly} className="rounded-lg px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100">Finish early</button>
          </div>
        </div>
        <div className="mt-2 flex items-center gap-3">
          <p className="shrink-0 text-sm font-medium" aria-live="polite">Question {Math.min(idx + 1, total)} of {total}</p>
          <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-slate-200" role="progressbar" aria-valuemin={0} aria-valuemax={total} aria-valuenow={results.length}>
            <div className="h-full rounded-full bg-indigo-600 transition-all" style={{ width: `${(results.length / total) * 100}%` }} />
          </div>
          <p className="hidden shrink-0 text-xs text-slate-500 sm:block">{cfg.mode === "groupmate" ? "Groupmate" : "Quick Quiz"}</p>
        </div>
        {demo && (
          <p className="mt-2 rounded-lg bg-amber-50 px-3 py-1.5 text-xs text-amber-900">
            {cfg.liveAvailable ? "Demo mode — predefined questions and rule-based feedback, not live AI." : "Demo mode — configure your AI API key for live AI sessions."}
          </p>
        )}
      </header>

      <main className="flex-1 space-y-4 overflow-y-auto py-4" aria-live="polite">
        {loading && <p className="flex items-center gap-2 text-slate-600" role="status"><Loader2 className="h-5 w-5 animate-spin" /> Preparing questions from your notes…</p>}
        {loadError && (
          <div role="alert" className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">
            <p className="flex items-start gap-2"><AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" /> {loadError}</p>
            <div className="mt-3 flex flex-wrap gap-2">
              <button type="button" onClick={() => load(demo)} className="rounded-lg bg-white px-3 py-1.5 font-medium shadow-sm">Retry</button>
              {!demo && <button type="button" onClick={switchToDemo} className="rounded-lg bg-white px-3 py-1.5 font-medium shadow-sm">Switch to demo mode</button>}
              <button type="button" onClick={() => router.push("/")} className="rounded-lg px-3 py-1.5 font-medium">Back to dashboard</button>
            </div>
          </div>
        )}
        {msgs.map((m) => (
          <div key={m.id} className={m.role === "user" ? "flex justify-end" : "flex justify-start"}>
            <div className={`max-w-[85%] whitespace-pre-wrap rounded-2xl px-4 py-3 text-[15px] leading-relaxed ${
              m.role === "user" ? "rounded-br-md bg-indigo-600 text-white" : m.role === "hint" ? "rounded-bl-md border border-indigo-200 bg-indigo-50 text-slate-800" : "rounded-bl-md border border-slate-200 bg-white text-slate-800 shadow-sm"}`}>
              {m.role === "hint" && <span className="mb-1 flex items-center gap-1 text-xs font-semibold text-indigo-700"><Lightbulb className="h-3.5 w-3.5" aria-hidden /> Hint</span>}
              {m.text}
            </div>
          </div>
        ))}
        {busy && <p className="flex items-center gap-2 text-sm text-slate-500" role="status"><Loader2 className="h-4 w-4 animate-spin" /> RecallMate is thinking…</p>}
        {error && (
          <div role="alert" className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">
            <p>{error}</p>
            <div className="mt-3 flex flex-wrap gap-2">
              <button type="button" onClick={() => retry.current?.()} className="rounded-lg bg-white px-3 py-1.5 font-medium shadow-sm">Retry</button>
              {!demo && <button type="button" onClick={() => { if (window.confirm("Switching to demo mode restarts this session with the demo study pack. Continue?")) switchToDemo(); }} className="rounded-lg bg-white px-3 py-1.5 font-medium shadow-sm">Switch to demo mode</button>}
            </div>
          </div>
        )}
        <div ref={endRef} />
      </main>

      <footer className="border-t border-slate-200 bg-[#f7f8fc] py-3">
        {phase === "reviewed" ? (
          <button type="button" onClick={next} className="flex w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 px-5 py-3 font-medium text-white hover:bg-indigo-700">
            {idx + 1 >= questions.length ? "See my recall report" : "Next question"} <ArrowRight className="h-4 w-4" aria-hidden />
          </button>
        ) : (
          <>
            {rec.error && <p role="alert" className="mb-2 text-sm text-red-700">{rec.error}</p>}
            {cfg.voice && !rec.supported && !rec.error && <p className="mb-2 text-sm text-slate-600">Voice input isn&apos;t supported in this browser — type your answer below.</p>}
            <div className="flex items-end gap-2">
              <button type="button" onClick={toggleMic} disabled={busy || loading || !!loadError || (!rec.supported && rec.state !== "listening")}
                aria-label={rec.state === "listening" ? "Stop recording" : "Start recording your answer"}
                className={`grid shrink-0 place-items-center rounded-full text-white disabled:opacity-40 ${cfg.voice ? "h-16 w-16" : "h-11 w-11"} ${rec.state === "listening" ? "animate-pulse bg-red-600" : "bg-indigo-600 hover:bg-indigo-700"}`}>
                {rec.state === "listening" ? <Square className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
              </button>
              <textarea value={answer} onChange={(e) => setAnswer(e.target.value)} rows={2} maxLength={4000} aria-label="Your answer"
                disabled={busy || loading || !!loadError}
                onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); submit(); } }}
                placeholder={rec.state === "listening" ? "Listening… your words appear here." : "Type your answer, or tap the mic and speak…"}
                className="min-h-[3rem] flex-1 resize-none rounded-xl border border-slate-300 bg-white px-3 py-2.5 outline-none focus:border-indigo-500 disabled:bg-slate-100" />
              <button type="button" onClick={submit} disabled={!answer.trim() || busy || loading} aria-label="Send answer"
                className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-40"><Send className="h-5 w-5" /></button>
            </div>
            <div className="mt-2 flex items-center justify-between text-xs text-slate-500">
              <span>{rec.state === "listening" ? "Recording — tap the square to stop, then edit before sending." : busy ? "Processing…" : "Speech is transcribed by your browser. You can edit the text before sending."}</span>
              <span className="flex gap-1">
                <button type="button" onClick={getHint} disabled={busy || loading || !!loadError || hints >= 3 || !q} className="inline-flex items-center gap-1 rounded-lg px-2 py-1.5 font-medium text-indigo-700 hover:bg-indigo-50 disabled:opacity-40"><Lightbulb className="h-4 w-4" aria-hidden /> Hint{hints > 0 ? ` (${hints}/3)` : ""}</button>
                <button type="button" onClick={() => q && finalize(q, null, true, hints, followUps)} disabled={busy || loading || !!loadError || !q} className="inline-flex items-center gap-1 rounded-lg px-2 py-1.5 font-medium text-slate-600 hover:bg-slate-100 disabled:opacity-40"><SkipForward className="h-4 w-4" aria-hidden /> Skip</button>
              </span>
            </div>
          </>
        )}
      </footer>
    </div>
  );
}
