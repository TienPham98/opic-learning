import type { Fav } from "./types";

const KEY = "opic-favs-v1";

// Module-level cache (js-cache-storage)
let _cache: Fav[] | null = null;

export function loadFavs(): Fav[] {
  if (_cache !== null) return _cache;
  if (typeof window === "undefined") return [];
  try {
    _cache = JSON.parse(localStorage.getItem(KEY) ?? "[]");
    return _cache!;
  } catch {
    return [];
  }
}

export function saveFavs(favs: Fav[]): void {
  _cache = favs;
  localStorage.setItem(KEY, JSON.stringify(favs));
}

export function toggleFav(
  favs: Fav[],
  question: { question: string; sample: string; type: string },
  topicName: string,
  level: string,
): Fav[] {
  const exists = favs.find(f => f.questionText === question.question);
  if (exists) return favs.filter(f => f.questionText !== question.question);
  return [
    ...favs,
    {
      id:           Date.now().toString(),
      questionText: question.question,
      sample:       question.sample,
      topicName,
      level,
      type:         question.type,
      savedAt:      new Date().toLocaleDateString("vi-VN"),
    },
  ];
}
