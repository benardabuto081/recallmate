"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, ArrowRight, Mic, Trash2, Type } from "lucide-react";
import { Brand } from "@/components/Brand";
import { UploadZone } from "@/components/UploadZone";
import { processFile, selectContext } from "@/lib/document-processing";
import { DEMO_MATERIAL, DEMO_TOPIC } from "@/lib/demo";
import { clearHistory, loadHistory, priorityConcepts } from "@/lib/storage";
import { store } from "@/lib/session-store";
import { errMsg } from "@/lib/client-api";
import type { Mode, SessionConfig, SessionRecord } from "@/types";

const seg = (on: boolean) => `rounded-xl border px-4 py-2 text-sm font-medium transition-colors ${on ? "border-indigo-600 bg-indigo-600 text-white" : "border-slate-300 bg-white hover:bg-slate-50"}`;

export default function Home() {
  const router = useRouter();
  const setupRef = useRef<HTMLElement>(null);
  const [live, setLive] = useState<boolean | null>(null);
  const [history, setHistory] = useState<SessionRecord[]>([]);
  const [file, setFile] = useState<{ name: string; size: number } | null>(store.upload ? { name: store.upload.name, size: store.upload.size } : null);
  const [topics, setTopics] = useState<string[]>(store.upload?.topics ?? []);
  const [extracting, setExtracting] = useState(false);
  const [fileError, setFileError] = useState<string | null>(null);
  const [topic, setTopic] = useState("");
  const [description, setDescription] = useState("");
  const [useDemo, setUseDemo] = useState(false);
  const [mode, setMode] = useState<Mode>("groupmate");
  const [count, setCount] = useState(5);
  const [voice, setVoice] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    setHistory(loadHistory());
    fetch("/api/status").then((r) => r.json()).then((d) => setLive(Boolean(d.live))).catch(() => setLive(false));
    if (window.location.hash === "#setup") setupRef.current?.scrollIntoView();
  }, []);

  const demoOnly = live === false;
  const demoActive = demoOnly || useDemo;

  const onFile = async (f: File) => {
    setFileError(null); setExtracting(true);
    try {
      const { text, topics: t } = await processFile(f);
      store.upload = { name: f.name, size: f.size, text, topics: t };
      setFile({ name: f.name, size: f.size }); setTopics(t); setUseDemo(false);
    } catch (e) { setFileError(errMsg(e)); }
    finally { setExtracting(false); }
  };
  const removeFile = () => { store.upload = undefined; setFile(null); setTopics([]); setFileError(null); };

  const start = () => {
    setFormError(null);
    let cfg: SessionConfig;
    const base = { mode, count, voice, liveAvailable: live === true };
    if (demoActive) {
      cfg = { ...base, topic: DEMO_TOPIC, source: "demo", material: DEMO_MATERIAL, priorityConcepts: priorityConcepts(history, DEMO_TOPIC) };
    } else if (file && store.upload) {
      const t = topic.trim() || file.name.replace(/\.[^.]+$/, "");
      cfg = { ...base, topic: t, source: "upload", material: selectContext(store.upload.text, t), priorityConcepts: priorityConcepts(history, t) };
    } else {
      const t = topic.trim();
      if (!t || description.trim().length < 20) { setFormError("Upload your notes, or enter a topic and a short description (a sentence or two), or use the demo study pack."); return; }
      cfg = { ...base, topic: t, source: "description", material: `${t}\n\n${description.trim()}`, priorityConcepts: priorityConcepts(history, t) };
    }
    store.config = cfg; store.results = undefined; store.record = undefined;
    router.push("/study");
  };

  const stats = useMemo(() => {
    const recent = history.slice(0, 5);
    const freq = new Map<string, number>();
    recent.forEach((h) => h.revise.forEach((c) => freq.set(c, (freq.get(c) ?? 0) + 1)));
    return {
      n: recent.length,
      avg: recent.length ? Math.round(recent.reduce((s, h) => s + h.score, 0) / recent.length) : 0,
      revisit: [...freq.entries()].sort((a, b) => b[1] - a[1]).slice(0, 4).map(([c]) => c),
    };
  }, [history]);

  return (
    <div className="mx-auto max-w-5xl px-4 pb-16 sm:px-6">
      <header className="flex items-center justify-between py-5"><Brand /></header>

      <section className="py-8 sm:py-12">
        <p className="text-slate-500">Your study partner. Your memory test.</p>
        <h1 className="mt-2 max-w-2xl text-4xl font-semibold tracking-tight text-slate-900 sm:text-5xl">What are we learning today?</h1>
        <p className="mt-4 max-w-xl text-slate-600">Upload your notes. RecallMate asks questions, listens to your answers, and shows what you recalled and what to revise — without you peeking at the notes.</p>
        <button type="button" onClick={() => setupRef.current?.scrollIntoView({ behavior: "smooth" })}
          className="mt-6 inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-3 font-medium text-white shadow-sm hover:bg-indigo-700">
          Start a study session <ArrowRight className="h-4 w-4" aria-hidden />
        </button>
      </section>

      {demoOnly && (
        <p role="status" className="mb-4 flex items-start gap-2 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
          <span><strong>Demo mode</strong> — configure your AI API key for live AI sessions. Sessions use the built-in Operating Systems pack with predefined questions and rule-based feedback.</span>
        </p>
      )}

      <section id="setup" ref={setupRef} className="scroll-mt-6 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-8">
        <h2 className="text-xl font-semibold">Set up your session</h2>

        {demoOnly ? (
          <div className="mt-5 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
            {file ? "Your notes were read in your browser, but they can only be used for questions once an API key is configured. " : ""}
            Uploads and custom topics need a configured API key. You can still try the full flow with the demo pack: <strong>Operating Systems</strong>.
            <div className="mt-4"><UploadZone file={file} extracting={extracting} error={fileError} onFile={onFile} onRemove={removeFile} /></div>
          </div>
        ) : (
          <div className="mt-5 space-y-5">
            <UploadZone file={file} extracting={extracting} error={fileError} onFile={onFile} onRemove={removeFile} />
            <div>
              <label htmlFor="topic" className="text-sm font-medium">Topic</label>
              <input id="topic" value={topic} onChange={(e) => { setTopic(e.target.value); setUseDemo(false); }} placeholder={file ? "Optional — defaults to the file name" : "e.g. Photosynthesis"}
                maxLength={200} className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2.5 outline-none focus:border-indigo-500" />
              {topics.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-2" aria-label="Detected topics">
                  {topics.map((t) => <button key={t} type="button" onClick={() => setTopic(t)} className={`rounded-full border px-3 py-1 text-sm ${topic === t ? "border-indigo-600 bg-indigo-50 text-indigo-700" : "border-slate-300 hover:bg-slate-50"}`}>{t}</button>)}
                </div>
              )}
            </div>
            {!file && (
              <div>
                <label htmlFor="desc" className="text-sm font-medium">Short description <span className="font-normal text-slate-500">(used when you don&apos;t upload notes)</span></label>
                <textarea id="desc" value={description} onChange={(e) => { setDescription(e.target.value); setUseDemo(false); }} rows={3} maxLength={4000}
                  placeholder="Paste a few lines of what you've learnt, or describe what the topic covers."
                  className="mt-1 w-full resize-y rounded-xl border border-slate-300 px-3 py-2.5 outline-none focus:border-indigo-500" />
              </div>
            )}
            <button type="button" onClick={() => setUseDemo((v) => !v)} aria-pressed={useDemo} className={`${seg(useDemo)} w-full sm:w-auto`}>
              {useDemo ? "Using the demo study pack (Operating Systems)" : "Or try the demo study pack (Operating Systems)"}
            </button>
          </div>
        )}

        <div className="mt-6 grid gap-6 sm:grid-cols-2">
          <fieldset>
            <legend className="text-sm font-medium">Session mode</legend>
            <div className="mt-2 grid gap-2">
              {([["groupmate", "Groupmate Mode", "Conversational, with follow-ups and hints."], ["quiz", "Quick Quiz", "One question at a time, no follow-ups."]] as const).map(([v, t, d]) => (
                <button key={v} type="button" onClick={() => setMode(v)} aria-pressed={mode === v}
                  className={`rounded-2xl border p-3 text-left ${mode === v ? "border-indigo-600 bg-indigo-50" : "border-slate-300 hover:bg-slate-50"}`}>
                  <span className="block font-medium">{t}</span><span className="text-sm text-slate-600">{d}</span>
                </button>
              ))}
            </div>
          </fieldset>
          <div className="space-y-5">
            <fieldset>
              <legend className="text-sm font-medium">Questions</legend>
              <div className="mt-2 flex gap-2">{[5, 10, 15].map((n) => <button key={n} type="button" onClick={() => setCount(n)} aria-pressed={count === n} className={seg(count === n)}>{n}</button>)}</div>
              {demoActive && count > 5 && <p className="mt-1 text-xs text-slate-500">The demo pack has 5 questions.</p>}
            </fieldset>
            <fieldset>
              <legend className="text-sm font-medium">Answer by</legend>
              <div className="mt-2 flex gap-2">
                <button type="button" onClick={() => setVoice(false)} aria-pressed={!voice} className={`${seg(!voice)} inline-flex items-center gap-2`}><Type className="h-4 w-4" aria-hidden /> Text</button>
                <button type="button" onClick={() => setVoice(true)} aria-pressed={voice} className={`${seg(voice)} inline-flex items-center gap-2`}><Mic className="h-4 w-4" aria-hidden /> Voice</button>
              </div>
              {voice && <p className="mt-1 text-xs text-slate-500">Voice needs a supported browser (Chrome or Edge), HTTPS or localhost, and microphone permission. You can always type instead.</p>}
            </fieldset>
          </div>
        </div>

        {formError && <p role="alert" className="mt-5 rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700">{formError}</p>}
        <button type="button" onClick={start} disabled={live === null || extracting}
          className="mt-6 inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-3 font-medium text-white hover:bg-indigo-700 disabled:opacity-50">
          Begin session <ArrowRight className="h-4 w-4" aria-hidden />
        </button>
      </section>

      <section className="mt-8 grid gap-6 md:grid-cols-5">
        <div className="rounded-3xl border border-slate-200 bg-white p-5 md:col-span-3">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">Recent sessions</h2>
            {history.length > 0 && (
              <button type="button" onClick={() => { if (window.confirm("Clear all saved study history on this device?")) { clearHistory(); setHistory([]); } }}
                className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-red-600"><Trash2 className="h-4 w-4" aria-hidden /> Clear history</button>
            )}
          </div>
          {history.length === 0 ? (
            <p className="mt-3 text-sm text-slate-600">No sessions yet. Finish a session and it will appear here.</p>
          ) : (
            <ul className="mt-3 divide-y divide-slate-100">
              {history.slice(0, 5).map((h) => (
                <li key={h.id} className="flex items-center justify-between gap-3 py-3">
                  <div className="min-w-0">
                    <p className="truncate font-medium">{h.topic}</p>
                    <p className="text-sm text-slate-500">{new Date(h.date).toLocaleDateString()} · {h.mode === "groupmate" ? "Groupmate" : "Quick Quiz"} · {h.attempted} questions · {h.revise.length} to revise</p>
                  </div>
                  <span className="shrink-0 rounded-lg bg-indigo-50 px-2.5 py-1 text-sm font-semibold text-indigo-700">{h.score}%</span>
                </li>
              ))}
            </ul>
          )}
        </div>
        <div className="rounded-3xl border border-slate-200 bg-white p-5 md:col-span-2">
          <h2 className="text-lg font-semibold">Recent recall</h2>
          {stats.n === 0 ? <p className="mt-3 text-sm text-slate-600">Your recall summary appears after your first session.</p> : (
            <>
              <p className="mt-3 text-3xl font-semibold">{stats.avg}%</p>
              <p className="text-sm text-slate-500">average session score across your last {stats.n} session{stats.n > 1 ? "s" : ""}</p>
              {stats.revisit.length > 0 && <p className="mt-3 text-sm"><span className="font-medium">To revisit:</span> {stats.revisit.join(", ")}</p>}
            </>
          )}
        </div>
      </section>

      <section className="mt-8 rounded-3xl border border-slate-200 bg-white p-5 sm:p-8">
        <h2 className="text-lg font-semibold">How RecallMate works</h2>
        <ol className="mt-4 grid gap-4 text-sm text-slate-700 sm:grid-cols-3">
          <li><strong className="block text-slate-900">1. Bring your notes</strong>Upload a PDF, TXT or DOCX. Text is read in your browser.</li>
          <li><strong className="block text-slate-900">2. Answer from memory</strong>Speak or type. Follow-ups and hints help you dig deeper without giving the answer away.</li>
          <li><strong className="block text-slate-900">3. See what to revise</strong>Get a recall report built from your recorded answers, then retry the weak spots.</li>
        </ol>
        <p className="mt-5 text-xs text-slate-500">History is saved only in this browser. Your notes are held in memory for the current visit, so refreshing means uploading again. The score is a session performance indicator, not a validated measure of memory or intelligence.</p>
      </section>
    </div>
  );
}
