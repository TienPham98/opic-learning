import type { Question, TextScore, VoiceScore } from "./types";
import { SURVEY_QUESTIONS } from "./data";
import type { SurveyAnswers } from "./types";

/* ── Generic AI caller ─────────────────────────────────── */
export async function callAI<T = Record<string, unknown>>(
  prompt: string,
  maxTokens = 2000,
): Promise<T> {
  const res = await fetch("/api/generate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ prompt, maxTokens }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: "Unknown error" }));
    throw new Error((err as { error?: string }).error ?? `HTTP ${res.status}`);
  }
  return res.json() as Promise<T>;
}

/* ── Text scoring ──────────────────────────────────────── */
export async function scoreText(
  question: string,
  answer: string,
  level: string,
): Promise<TextScore> {
  const res = await fetch("/api/score", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ question, answer, level }),
  });
  if (!res.ok) throw new Error("Score API error");
  return res.json();
}

/* ── Speech-to-text ────────────────────────────────────── */
export async function transcribeAudio(blob: Blob): Promise<string> {
  const form = new FormData();
  // Groq Whisper accepts webm, mp4, m4a, ogg etc.
  form.append("audio", blob, "recording.webm");
  const res = await fetch("/api/transcribe", { method: "POST", body: form });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error((body as { error?: string }).error ?? "Transcription failed");
  }
  const data = await res.json();
  return (data as { transcript: string }).transcript ?? "";
}

/* ── Voice scoring ─────────────────────────────────────── */
export async function scoreVoice(
  question: string,
  transcript: string,
  level: string,
): Promise<VoiceScore> {
  const res = await fetch("/api/score-voice", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ question, transcript, level }),
  });
  if (!res.ok) throw new Error("Voice score API error");
  return res.json();
}

/* ── Topic questions prompt ────────────────────────────── */
export function buildTopicPrompt(topicName: string, level: string): string {
  return `Generate 5 OPIc English speaking practice questions about "${topicName}" at ${level} level.

Return a JSON object with a "questions" array of exactly 5 items. Each item must have:
- "type": one of: describe, compare, past, roleplay
- "question": English question string
- "tip": 1-2 sentence Vietnamese study tip
- "sample": Natural English answer at ${level} level, 4-5 sentences, first person
- "vocabulary": array of 4 objects each with "word" (English), "meaning" (Vietnamese), "example" (short English sentence)
- "keyPoints": array of 4 Vietnamese strings: opening sentence, main body, specific details, conclusion

Vary types: use describe twice, and one each of compare, past, roleplay.`;
}

/* ── Exam questions prompt ─────────────────────────────── */
export function buildExamPrompt(
  surveyAnswers: SurveyAnswers,
  level: string,
): string {
  const profile = SURVEY_QUESTIONS.map(q => {
    const a = surveyAnswers[q.id];
    if (q.multi) {
      const selected = ((a as number[]) ?? []).map(i => q.opts[i]).join(", ");
      return `${q.q}: ${selected || "N/A"}`;
    }
    return `${q.q}: ${a !== undefined ? q.opts[a as number] : "N/A"}`;
  }).join("\n");

  return `Generate a personalised 15-question OPIc exam.

Test taker profile:
${profile}

Target level: ${level}

Return a JSON object with a "questions" array of exactly 15 items. Each must have:
- "type": Q1-3 "describe", Q4-6 "compare", Q7-9 "past", Q10-12 "roleplay", Q13-15 "mixed"
- "question": English question personalised to their profile
- "tip": Vietnamese study tip (1-2 sentences)
- "sample": English answer at ${level} level, 4-5 sentences, conversational
- "vocabulary": empty array []
- "keyPoints": empty array []

Personalise every question using their actual hobbies, job, and interests.`;
}

/* ── Build questions ───────────────────────────────────── */
export async function fetchTopicQuestions(
  topicName: string,
  level: string,
): Promise<Question[]> {
  const data = await callAI<{ questions: Question[] }>(
    buildTopicPrompt(topicName, level),
    2400,
  );
  if (!data.questions?.length) throw new Error("AI không trả về câu hỏi");
  return data.questions;
}

export async function fetchExamQuestions(
  surveyAnswers: SurveyAnswers,
  level: string,
): Promise<Question[]> {
  const data = await callAI<{ questions: Question[] }>(
    buildExamPrompt(surveyAnswers, level),
    3400,
  );
  if (!data.questions?.length) throw new Error("AI không trả về đề thi");
  return data.questions;
}
