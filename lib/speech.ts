"use client";
import { useCallback, useEffect, useRef, useState } from "react";

interface RecogResult { isFinal: boolean; 0: { transcript: string } }
interface RecogEvent { results: ArrayLike<RecogResult> }
interface Recog {
  lang: string; interimResults: boolean; continuous: boolean;
  onresult: ((e: RecogEvent) => void) | null;
  onerror: ((e: { error: string }) => void) | null;
  onend: (() => void) | null;
  start(): void; stop(): void; abort(): void;
}
type RecogCtor = new () => Recog;

const getCtor = (): RecogCtor | null => {
  if (typeof window === "undefined") return null;
  const w = window as unknown as { SpeechRecognition?: RecogCtor; webkitSpeechRecognition?: RecogCtor };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
};

export const canSpeak = () => typeof window !== "undefined" && "speechSynthesis" in window;

export function speak(text: string) {
  if (!canSpeak()) return;
  window.speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text.replace(/\n+/g, ". "));
  u.lang = "en-US";
  u.rate = 1;
  window.speechSynthesis.speak(u);
}
export const stopSpeaking = () => { if (canSpeak()) window.speechSynthesis.cancel(); };

const ERRORS: Record<string, string> = {
  "not-allowed": "Microphone access was blocked. Allow it in your browser's site settings, or type your answer instead.",
  "service-not-allowed": "Speech recognition isn't allowed in this browser. Type your answer instead.",
  "no-speech": "We didn't hear anything. Tap the mic and try again, or type your answer.",
  "audio-capture": "No microphone was found. Connect one, or type your answer instead.",
  network: "Speech recognition needs a network connection in this browser. Try again or type your answer.",
};

export function useSpeechRecognition(onTranscript: (text: string) => void) {
  const [state, setState] = useState<"idle" | "listening" | "error">("idle");
  const [error, setError] = useState<string | null>(null);
  const [supported, setSupported] = useState(true);
  const ref = useRef<Recog | null>(null);
  const cb = useRef(onTranscript);
  cb.current = onTranscript;

  useEffect(() => {
    setSupported(getCtor() !== null);
    return () => ref.current?.abort();
  }, []);

  const start = useCallback(() => {
    const Ctor = getCtor();
    if (!Ctor) { setError("Voice input isn't supported in this browser (try Chrome or Edge). Type your answer instead."); setState("error"); return; }
    stopSpeaking();
    const r = new Ctor();
    r.lang = "en-US";
    r.interimResults = true;
    r.continuous = false;
    r.onresult = (e) => {
      let t = "";
      for (let i = 0; i < e.results.length; i++) t += e.results[i][0].transcript;
      cb.current(t.trim());
    };
    r.onerror = (e) => { setError(ERRORS[e.error] ?? "Voice input failed. Type your answer instead."); setState("error"); };
    r.onend = () => setState((s) => (s === "error" ? "error" : "idle"));
    try {
      r.start();
      ref.current = r;
      setError(null);
      setState("listening");
    } catch {
      setError("Couldn't start the microphone. Type your answer instead.");
      setState("error");
    }
  }, []);

  const stop = useCallback(() => { ref.current?.stop(); setState("idle"); }, []);
  return { state, error, supported, start, stop };
}
