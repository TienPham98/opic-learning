/**
 * Thin sessionStorage wrapper (js-cache-storage).
 * All exam state is stored here so it survives route navigations
 * without prop-drilling or a global store library.
 */

type Serializable = string | number | boolean | object | null;

function get<T extends Serializable>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = sessionStorage.getItem(key);
    return raw !== null ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function set<T extends Serializable>(key: string, value: T): void {
  try { sessionStorage.setItem(key, JSON.stringify(value)); } catch {}
}

function remove(...keys: string[]): void {
  keys.forEach(k => { try { sessionStorage.removeItem(k); } catch {} });
}

function clear(): void {
  const preserved: [string, string][] = [];
  // Preserve favs — they live in localStorage, not sessionStorage
  try {
    for (let i = 0; i < sessionStorage.length; i++) {
      const k = sessionStorage.key(i)!;
      if (k.startsWith("opic-")) preserved.push([k, sessionStorage.getItem(k)!]);
    }
    sessionStorage.clear();
    preserved.forEach(([k, v]) => sessionStorage.setItem(k, v));
  } catch {}
}

export const store = { get, set, remove, clear };

// Typed accessors for each piece of state
export const KEYS = {
  surveyAnswers:  "opic-survey-answers",
  examLevel:      "opic-exam-level",
  topicLevel:     "opic-topic-level",
  topicId:        "opic-topic-id",
  topicName:      "opic-topic-name",
  examQuestions:  "opic-exam-questions",
  topicQuestions: "opic-topic-questions",
  examIndex:      "opic-exam-index",
} as const;
