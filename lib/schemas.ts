import { z } from "zod";

export const questionSchema = z.object({
  id: z.string().max(40).default("q"),
  question: z.string().min(5).max(600),
  concept: z.string().min(1).max(160),
  difficulty: z.enum(["easy", "medium", "hard"]).catch("medium"),
  type: z.enum(["recall", "conceptual", "comparison", "application"]).catch("recall"),
  expectedKeyConcepts: z.array(z.string().max(300)).min(1).max(8),
  satisfactoryAnswer: z.string().min(1).max(1200),
  sourceContext: z.string().max(1500).default(""),
});

export const generatedQuestionsSchema = z.object({ questions: z.array(questionSchema).min(1).max(15) });

export const evaluationSchema = z.object({
  accuracy: z.enum(["strong", "partial", "weak"]),
  completeness: z.enum(["complete", "partial", "incomplete"]),
  correctPoints: z.array(z.string().max(400)).max(10).default([]),
  missingPoints: z.array(z.string().max(400)).max(10).default([]),
  incorrectClaims: z.array(z.string().max(400)).max(10).default([]),
  feedback: z.string().min(1).max(900),
  nextAction: z.enum(["continue", "follow_up", "hint"]),
  followUp: z.string().max(500).nullish(),
});

export const hintSchema = z.object({ hint: z.string().min(1).max(500) });

export const generateRequestSchema = z.object({
  topic: z.string().trim().min(1).max(200),
  context: z.string().min(20).max(40000),
  count: z.number().int().min(1).max(15),
  mode: z.enum(["groupmate", "quiz"]),
  priorityConcepts: z.array(z.string().max(200)).max(10).default([]),
});

export const evaluateRequestSchema = z.object({
  action: z.enum(["evaluate", "hint"]),
  mode: z.enum(["groupmate", "quiz"]),
  question: questionSchema,
  exchanges: z.array(z.object({ prompt: z.string().max(1000), answer: z.string().max(4000) })).max(6),
  followUpsRemaining: z.number().int().min(0).max(3).default(0),
  hintLevel: z.number().int().min(1).max(3).default(1),
});

export type GenerateRequest = z.infer<typeof generateRequestSchema>;
export type EvaluateRequest = z.infer<typeof evaluateRequestSchema>;
