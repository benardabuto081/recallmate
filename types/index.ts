export type Mode = "groupmate" | "quiz";
export type Accuracy = "strong" | "partial" | "weak";
export type Completeness = "complete" | "partial" | "incomplete";
export type NextAction = "continue" | "follow_up" | "hint";
export type Source = "upload" | "description" | "demo";

export interface Question {
  id: string;
  question: string;
  concept: string;
  difficulty: "easy" | "medium" | "hard";
  type: "recall" | "conceptual" | "comparison" | "application";
  expectedKeyConcepts: string[];
  satisfactoryAnswer: string;
  sourceContext: string;
}

export interface Evaluation {
  accuracy: Accuracy;
  completeness: Completeness;
  correctPoints: string[];
  missingPoints: string[];
  incorrectClaims: string[];
  feedback: string;
  nextAction: NextAction;
  followUp?: string;
}

export interface Exchange { prompt: string; answer: string }

export interface QuestionResult {
  questionId: string;
  concept: string;
  question: string;
  score: number;
  outcome: Accuracy;
  hintsUsed: number;
  followUpsUsed: number;
  skipped: boolean;
  correctPoints: string[];
  missingPoints: string[];
  incorrectClaims: string[];
  satisfactoryAnswer: string;
  sourceContext: string;
}

export interface SessionConfig {
  topic: string;
  mode: Mode;
  count: number;
  voice: boolean;
  source: Source;
  liveAvailable: boolean;
  material: string;
  priorityConcepts: string[];
}

export interface SessionRecord {
  id: string;
  date: string;
  topic: string;
  mode: Mode;
  source: Source;
  attempted: number;
  concepts: string[];
  strong: number;
  partial: number;
  weak: number;
  score: number;
  revise: string[];
  hintsUsed: number;
  followUpsUsed: number;
}
