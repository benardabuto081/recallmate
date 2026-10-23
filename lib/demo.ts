import type { Evaluation, Exchange, Question } from "@/types";

// Demo mode: predefined questions and keyword rules. This is NOT a live AI model.
export const DEMO_TOPIC = "Operating Systems (demo)";

export const DEMO_MATERIAL = `Processes and threads
A process is a program in execution. Each process has its own address space and resources. A thread is a unit of execution inside a process. Threads in the same process share the process's memory and open files, but each thread has its own stack, registers and program counter.

Deadlock
A deadlock occurs when processes wait forever for resources held by each other. Four conditions must hold together: mutual exclusion, hold and wait, no preemption and circular wait.

Virtual memory and paging
Paging divides virtual memory into fixed-size pages and physical memory into frames of the same size. A page table maps virtual pages to physical frames. If a page isn't in RAM, a page fault occurs and the OS loads it from disk.

Context switching
During a context switch the OS saves the state of the running process (registers, program counter) in its process control block and loads the saved state of the next process. No useful work happens during the switch, so it is overhead.

CPU scheduling
First-come-first-served runs processes in arrival order until they finish; a long job can delay everything behind it (the convoy effect). Round robin gives each process a fixed time quantum and then preempts it, improving response time and fairness.`;

interface Key { label: string; re: RegExp; hint: string; followUp: string }
interface Def { concept: string; question: string; difficulty: Question["difficulty"]; type: Question["type"]; answer: string; source: string; keys: Key[] }

const DEFS: Def[] = [
  {
    concept: "Process vs thread", question: "What is the difference between a process and a thread?", difficulty: "easy", type: "comparison",
    answer: "A process is a running program with its own address space; threads live inside a process, share its memory, and each keep their own stack and registers.",
    source: "Threads in the same process share the process's memory and open files, but each thread has its own stack, registers and program counter.",
    keys: [
      { label: "A process is a running program with its own memory", re: /(running|executing) program|program (that is |that's |which is )?(running|executing|in execution)|instance of a program|own (memory|address space|resources)/i, hint: "Start with the process: what does it have that is entirely its own?", followUp: "Good start. What does a process own that separate processes don't share?" },
      { label: "Threads share the process's memory and resources", re: /shar(e|es|ed|ing)\s+(the\s+|its\s+|their\s+)?(same\s+)?(memory|address space|heap|resources|data|code|files)/i, hint: "Think about what threads inside the same process have in common.", followUp: "Can you explain how threads belonging to the same process share memory?" },
      { label: "Each thread has its own stack and registers", re: /(own|separate|private|individual)\s+(call\s+)?(stack|registers?|program counter)|stacks?\s+(and|&)\s+registers?/i, hint: "What must each thread keep private so it can run independently?", followUp: "What does each thread still keep to itself so it can run independently?" },
    ],
  },
  {
    concept: "Deadlock conditions", question: "Name the four conditions that must hold for a deadlock to occur.", difficulty: "medium", type: "recall",
    answer: "Mutual exclusion, hold and wait, no preemption, and circular wait — all four together.",
    source: "Four conditions must hold together: mutual exclusion, hold and wait, no preemption and circular wait.",
    keys: [
      { label: "Mutual exclusion", re: /mutual exclusion|mutex|one process at a time|exclusive/i, hint: "One condition is about a resource being usable by only one process at a time.", followUp: "Which condition says a resource can be used by only one process at a time?" },
      { label: "Hold and wait", re: /hold (and|&|while) wait|holding .*waiting|hold.* while waiting/i, hint: "Another is about a process keeping what it has while asking for more.", followUp: "What's the condition about a process holding resources while it waits for others?" },
      { label: "No preemption", re: /no preemption|non-?preempt|cannot be (forcibly )?(taken|preempted)|can't be (forcibly )?(taken|preempted)/i, hint: "One concerns whether the OS can forcibly take a resource back.", followUp: "Which condition says resources can't be forcibly taken away?" },
      { label: "Circular wait", re: /circular|cycle|chain of (processes|waiting)/i, hint: "The last one describes the shape of the waiting relationships between processes.", followUp: "What shape do the waiting relationships form between the processes?" },
    ],
  },
  {
    concept: "Paging and virtual memory", question: "How does paging let a program use more memory than is physically installed?", difficulty: "hard", type: "conceptual",
    answer: "Memory is split into fixed-size pages and frames; a page table maps virtual pages to frames; pages not in RAM are loaded from disk on a page fault.",
    source: "Paging divides virtual memory into fixed-size pages... A page table maps virtual pages to physical frames. If a page isn't in RAM, a page fault occurs.",
    keys: [
      { label: "Memory is divided into fixed-size pages and frames", re: /fixed[- ]?size|same size|equal[- ]sized?|pages?.*frames?|frames?.*pages?/i, hint: "How is memory carved up — in what kind of units?", followUp: "How is memory divided up under paging?" },
      { label: "A page table maps virtual to physical addresses", re: /page table|map(s|ping|ped)?\b.*(virtual|physical)|virtual.*(to|into)\s+physical|translat/i, hint: "What structure connects the addresses a program sees to real memory?", followUp: "What does the OS use to connect virtual addresses to physical memory?" },
      { label: "Missing pages are loaded from disk on a page fault", re: /page fault|swap|(from|on|to)\s+(the\s+)?(disk|secondary storage|hard drive|ssd)|not in (ram|memory)/i, hint: "What happens when the page a program needs isn't in RAM?", followUp: "What happens when a needed page isn't in RAM?" },
    ],
  },
  {
    concept: "Context switching", question: "What happens during a context switch, and why is it a cost?", difficulty: "medium", type: "conceptual",
    answer: "The OS saves the running process's state (registers, program counter) in its PCB, loads the next process's saved state, and no useful work happens meanwhile — it's overhead.",
    source: "The OS saves the state of the running process in its process control block and loads the saved state of the next process. No useful work happens during the switch.",
    keys: [
      { label: "The running process's state is saved (e.g. in its PCB)", re: /(sav|stor)\w*.*(state|registers?|program counter|pcb|context)|pcb|process control block/i, hint: "What must happen to the current process so it can resume later?", followUp: "What happens to the current process's state so it can resume later?" },
      { label: "The next process's saved state is loaded", re: /(load|restor|resum|reinstat)\w*/i, hint: "And then what happens to the process that runs next?", followUp: "And what happens for the process that runs next?" },
      { label: "It is overhead: no useful work happens during the switch", re: /overhead|no useful work|wasted|expensive|cost|slows?/i, hint: "Why is this time considered a cost rather than progress?", followUp: "Why is the time spent switching considered a cost?" },
    ],
  },
  {
    concept: "FCFS vs round robin", question: "Compare first-come-first-served with round robin scheduling.", difficulty: "medium", type: "comparison",
    answer: "FCFS runs processes in arrival order to completion (long jobs can cause the convoy effect); round robin gives each a fixed time quantum then preempts, improving response time and fairness.",
    source: "First-come-first-served runs processes in arrival order until they finish... Round robin gives each process a fixed time quantum and then preempts it.",
    keys: [
      { label: "FCFS runs processes in arrival order until they finish", re: /first[- ]come|fcfs|arrival order|order (of )?arriv|(to|until) (completion|it finishes|finish)/i, hint: "Start with FCFS: who goes first, and for how long?", followUp: "How does FCFS decide who runs, and for how long?" },
      { label: "Round robin gives each process a fixed time quantum", re: /time (quantum|slice)|quantum|slice/i, hint: "What does round robin hand out to each process?", followUp: "What does round robin give each process in turn?" },
      { label: "Round robin improves response time/fairness; FCFS can suffer the convoy effect", re: /convoy|response time|fair(ness)?|long (job|process).*(block|delay|wait)|short .* wait/i, hint: "What's the downside of FCFS for short jobs, and what does round robin improve?", followUp: "What's the main downside of FCFS for short jobs, and what does round robin improve?" },
    ],
  },
];

export function getDemoQuestions(count: number, priority: string[]): Question[] {
  const all = DEFS.map((d, i): Question => ({
    id: `demo-${i + 1}`, question: d.question, concept: d.concept, difficulty: d.difficulty, type: d.type,
    expectedKeyConcepts: d.keys.map((k) => k.label), satisfactoryAnswer: d.answer, sourceContext: d.source,
  }));
  const p = new Set(priority);
  return [...all.filter((q) => p.has(q.concept)), ...all.filter((q) => !p.has(q.concept))].slice(0, Math.min(count, all.length));
}

const defFor = (q: Question) => DEFS[Number(q.id.replace("demo-", "")) - 1];
const joined = (ex: Exchange[]) => ex.map((e) => e.answer).join(" ");

export function evaluateDemo(q: Question, ex: Exchange[]): Evaluation {
  const def = defFor(q);
  const text = joined(ex);
  const hit = def.keys.filter((k) => k.re.test(text));
  const miss = def.keys.filter((k) => !k.re.test(text));
  const ratio = hit.length / def.keys.length;
  const good = ratio >= 0.75;
  const ev: Evaluation = {
    accuracy: good ? "strong" : hit.length > 0 ? "partial" : "weak",
    completeness: good ? "complete" : ratio >= 0.5 ? "partial" : "incomplete",
    correctPoints: hit.map((k) => k.label),
    missingPoints: miss.map((k) => k.label),
    incorrectClaims: [],
    feedback: good
      ? hit.length === def.keys.length ? "Nice — you covered every key point." : `Good answer — you covered the main ideas. Still worth a glance: ${miss.map((k) => k.label.toLowerCase()).join("; ")}.`
      : hit.length > 0 ? `You've got part of it (${hit.map((k) => k.label.toLowerCase()).join("; ")}), but there's more to this one.`
      : "I'm not seeing the key ideas yet — that's okay, this is exactly what recall practice is for.",
    nextAction: good ? "continue" : hit.length > 0 ? "follow_up" : "hint",
    followUp: good ? undefined : miss[0].followUp,
  };
  return ev;
}

export function demoHint(q: Question, ex: Exchange[], level: number): string {
  const def = defFor(q);
  const text = joined(ex);
  const miss = def.keys.filter((k) => !k.re.test(text));
  return miss[Math.min(level - 1, miss.length - 1)]?.hint ?? "You've covered the main ideas — try pulling them together into one clear explanation.";
}
