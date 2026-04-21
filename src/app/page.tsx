"use client";
import { useState, useCallback, useEffect, useRef, memo } from "react";

/* ═══════════════ TYPES ═══════════════ */
interface Vocab    { word: string; meaning: string; example: string; }
interface Question { type: string; question: string; tip: string; sample: string; vocabulary: Vocab[]; keyPoints: string[]; }
interface ScoreResult { score: number; estimatedLevel: string; strengths: string[]; improvements: string[]; overall: string; }
interface Fav { id: string; questionText: string; sample: string; topicName: string; level: string; type: string; savedAt: string; }
type Page = "home" | "topic" | "survey" | "level" | "exam" | "done" | "favs" | "guide";

/* ═══════════════ STATIC DATA — hoisted out of component (rendering-hoist-jsx) ═══════════════ */
const TOPICS = [
  { id: "movies",      icon: "🎬", name: "Xem phim" },
  { id: "music",       icon: "🎵", name: "Âm nhạc" },
  { id: "sports",      icon: "⚽", name: "Thể thao" },
  { id: "travel",      icon: "✈️", name: "Du lịch" },
  { id: "cooking",     icon: "🍳", name: "Nấu ăn" },
  { id: "reading",     icon: "📚", name: "Đọc sách" },
  { id: "technology",  icon: "💻", name: "Công nghệ" },
  { id: "environment", icon: "🌿", name: "Môi trường" },
  { id: "health",      icon: "🏃", name: "Sức khỏe" },
  { id: "shopping",    icon: "🛍️", name: "Mua sắm" },
  { id: "family",      icon: "👨‍👩‍👧", name: "Gia đình" },
  { id: "work",        icon: "💼", name: "Công việc" },
] as const;

const SQS = [
  { id: "job",       q: "Nghề nghiệp của bạn là gì?",             multi: false, opts: ["Nhân viên văn phòng", "Nội trợ", "Giáo viên", "Học sinh / Sinh viên", "Chưa có việc làm"] },
  { id: "study",     q: "Nếu là sinh viên, mục đích học tập?",    multi: false, opts: ["Lấy bằng cấp", "Học nâng cao", "Học ngôn ngữ", "Không áp dụng"] },
  { id: "dwelling",  q: "Bạn đang sống ở đâu?",                   multi: false, opts: ["Nhà/căn hộ (một mình)", "Nhà/căn hộ (với bạn bè)", "Nhà/căn hộ (với gia đình)", "Ký túc xá", "Nhà tập thể"] },
  { id: "freetime",  q: "Bạn làm gì trong thời gian rảnh?",       multi: true,  opts: ["Xem phim", "Đi xem hòa nhạc", "Đi công viên", "Cắm trại", "Đi biển", "Xem thể thao", "Chơi game", "Giúp việc nhà"] },
  { id: "hobbies",   q: "Sở thích của bạn là gì?",                multi: true,  opts: ["Nghe nhạc", "Chơi nhạc cụ", "Hát", "Nhảy múa", "Viết lách", "Vẽ tranh", "Nấu ăn", "Làm vườn", "Nuôi thú cưng"] },
  { id: "sports_q",  q: "Bạn chơi thể thao hoặc tập thể dục gì?", multi: true,  opts: ["Bóng đá", "Bơi lội", "Đi xe đạp", "Chạy bộ", "Đi bộ", "Yoga", "Cầu lông", "Bóng bàn", "Tập gym", "Không tập"] },
  { id: "travel_q",  q: "Bạn đã từng đi du lịch loại nào?",       multi: true,  opts: ["Công tác trong nước", "Công tác nước ngoài", "Nghỉ tại nhà", "Du lịch trong nước", "Du lịch nước ngoài"] },
];

const LEVELS = [
  { id: "IM1", label: "IM1", sub: "Intermediate Mid 1" },
  { id: "IM2", label: "IM2", sub: "Intermediate Mid 2" },
  { id: "IM3", label: "IM3", sub: "Intermediate Mid 3" },
  { id: "IH",  label: "IH",  sub: "Intermediate High" },
  { id: "AL",  label: "AL",  sub: "Advanced Low" },
];

const TYPE_GROUPS = [
  { range: [0, 2]   as [number, number], tag: "Q1–3",   label: "Describe",         vi: "Mô tả" },
  { range: [3, 5]   as [number, number], tag: "Q4–6",   label: "Compare",          vi: "So sánh" },
  { range: [6, 8]   as [number, number], tag: "Q7–9",   label: "Past Experience",  vi: "Kinh nghiệm" },
  { range: [9, 11]  as [number, number], tag: "Q10–12", label: "Role-play",         vi: "Tình huống" },
  { range: [12, 14] as [number, number], tag: "Q13–15", label: "Mixed",             vi: "Hỗn hợp" },
];

/* ═══════════════ STORAGE (js-cache-storage) ═══════════════ */
const FAV_KEY = "opic-favs-v1";
let _favsCache: Fav[] | null = null;
function loadFavs(): Fav[] {
  if (_favsCache !== null) return _favsCache;
  if (typeof window === "undefined") return [];
  try { _favsCache = JSON.parse(localStorage.getItem(FAV_KEY) ?? "[]"); return _favsCache!; }
  catch { return []; }
}
function saveFavs(f: Fav[]) { _favsCache = f; localStorage.setItem(FAV_KEY, JSON.stringify(f)); }

/* ═══════════════ API — FIXED PROMPTS ═══════════════ */
async function callAI<T = Record<string, unknown>>(prompt: string, max = 2000): Promise<T> {
  const res = await fetch("/api/generate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ prompt, maxTokens: max }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: "Unknown error" }));
    throw new Error(err.error ?? `HTTP ${res.status}`);
  }
  return res.json() as Promise<T>;
}

// Simplified prompts — no embedded JSON schema, clear field-by-field instructions
function buildTopicPrompt(topicName: string, level: string): string {
  return `Generate 5 OPIc practice questions about "${topicName}" at ${level} level.

Return a JSON object with a "questions" array of exactly 5 items. Each item must have:
- "type": one of: describe, compare, past, roleplay (use describe twice, one each for others)
- "question": English question string
- "tip": 1-2 sentence Vietnamese study tip
- "sample": Natural English answer at ${level} level, 4-5 sentences, first person
- "vocabulary": array of exactly 4 objects, each with "word" (English), "meaning" (Vietnamese), "example" (English sentence)
- "keyPoints": array of exactly 4 Vietnamese strings: opening, main content, specific details, conclusion

Make questions vary in difficulty appropriate for ${level}.`;
}

function buildExamPrompt(profile: string, level: string): string {
  return `Generate a personalised 15-question OPIc exam.

Test taker profile:
${profile}

Target level: ${level}

Return a JSON object with a "questions" array of exactly 15 items. Each item must have:
- "type": string (Q1-3: "describe", Q4-6: "compare", Q7-9: "past", Q10-12: "roleplay", Q13-15: "mixed")
- "question": English question, personalised to the test taker's profile
- "tip": Vietnamese study tip (1-2 sentences)
- "sample": English answer at ${level} level, 4-5 sentences, natural and conversational
- "vocabulary": empty array []
- "keyPoints": empty array []

Vary question difficulty. Reference the test taker's actual hobbies, job, and interests.`;
}

async function callScore(question: string, answer: string, level: string): Promise<ScoreResult> {
  const res = await fetch("/api/score", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ question, answer, level }),
  });
  if (!res.ok) throw new Error("Score API error");
  return res.json();
}

/* ═══════════════ TTS HOOK ═══════════════ */
function useTTS() {
  const [speakIdx, setSpeakIdx] = useState<number | null>(null);
  const stop = useCallback(() => {
    if (typeof window !== "undefined") window.speechSynthesis?.cancel();
    setSpeakIdx(null);
  }, []);
  const toggle = useCallback((i: number, text: string) => {
    if (speakIdx === i) { stop(); return; }
    stop();
    if (typeof window === "undefined" || !window.speechSynthesis) return;
    setSpeakIdx(i);
    const u = new SpeechSynthesisUtterance(text);
    u.lang = "en-US"; u.rate = 0.88;
    u.onend = () => setSpeakIdx(null);
    u.onerror = () => setSpeakIdx(null);
    window.speechSynthesis.speak(u);
  }, [speakIdx, stop]);
  return { speakIdx, toggle, stop };
}

/* ═══════════════ DESIGN TOKENS ═══════════════ */
const FONT = "'Be Vietnam Pro', system-ui, sans-serif";

// Glass card style factory
const glass = (extra?: React.CSSProperties): React.CSSProperties => ({
  background: "rgba(255,255,255,0.055)",
  backdropFilter: "blur(20px)",
  WebkitBackdropFilter: "blur(20px)",
  border: "1px solid rgba(255,255,255,0.11)",
  borderRadius: 16,
  ...extra,
});

/* ═══════════════ ATOMS — MEMOIZED (rerender-memo) ═══════════════ */

// Chevron icon — static, hoisted
const ChevronDown = memo(function ChevronDown() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" style={{ flexShrink: 0 }}>
      <path d="M3 5l4 4 4-4" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
});

const IcoSpeaker = memo(function IcoSpeaker() {
  return (
    <svg width="13" height="13" viewBox="0 0 14 14" fill="none">
      <path d="M2 4.5v5l4-2.5-4-2.5z" fill="currentColor" />
      <path d="M8 3.5c1.4.9 2.5 2 2.5 3.5S9.4 10.1 8 11" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
      <path d="M9.5 1.5c2.5 1.5 3.5 3 3.5 5.5s-1 4-3.5 5.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
    </svg>
  );
});

const IcoPause = memo(function IcoPause() {
  return (
    <svg width="13" height="13" viewBox="0 0 14 14" fill="none">
      <rect x="2" y="2" width="4" height="10" rx="1" fill="currentColor" />
      <rect x="8" y="2" width="4" height="10" rx="1" fill="currentColor" />
    </svg>
  );
});

const IcoCheck = memo(function IcoCheck() {
  return (
    <svg width="9" height="9" viewBox="0 0 10 10">
      <polyline points="1,5 4,8 9,2" stroke="white" strokeWidth="2.2" fill="none" />
    </svg>
  );
});

function IcoHeart({ filled }: { filled: boolean }) {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14"
      fill={filled ? "#fff" : "none"}
      stroke={filled ? "#fff" : "rgba(255,255,255,0.45)"}
      strokeWidth="1.5">
      <path d="M7 12S1 8.5 1 4.5A3 3 0 0 1 7 3.2 3 3 0 0 1 13 4.5C13 8.5 7 12 7 12z" />
    </svg>
  );
}

function WaveDots() {
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 2, marginLeft: 3 }}>
      {[8, 13, 6, 10].map((h, i) => (
        <span key={i} style={{
          display: "inline-block", width: 3, height: h, borderRadius: 2,
          background: "rgba(255,255,255,0.7)",
          animation: `wave .7s ease ${[0, 0.12, 0.24, 0.06][i]}s infinite`,
        }} />
      ))}
    </span>
  );
}

/* ═══════════════ PILL BUTTON ═══════════════ */
function PillBtn({ label, onClick, white = false, style: ext }: {
  label: string; onClick: () => void; white?: boolean; style?: React.CSSProperties;
}) {
  return (
    <button
      onClick={onClick}
      style={{
        position: "relative", display: "inline-flex", alignItems: "center",
        justifyContent: "center", border: "0.6px solid rgba(255,255,255,0.85)",
        borderRadius: 9999, background: "transparent", padding: 2,
        cursor: "pointer", transition: "opacity .18s", fontFamily: FONT,
        ...ext,
      }}
    >
      {/* Glow streak */}
      <span style={{
        position: "absolute", top: -1, left: "50%", transform: "translateX(-50%)",
        width: "60%", height: 8,
        background: "radial-gradient(ellipse at 50% 0%, rgba(255,255,255,0.5) 0%, transparent 80%)",
        borderRadius: "50%", filter: "blur(3px)", pointerEvents: "none",
      }} />
      <span style={{
        display: "inline-flex", alignItems: "center", justifyContent: "center",
        borderRadius: 9999, padding: "11px 29px",
        background: white ? "#fff" : "#000",
        color: white ? "#000" : "#fff",
        fontSize: 14, fontWeight: 500, fontFamily: FONT,
        letterSpacing: "0.01em", whiteSpace: "nowrap", position: "relative", zIndex: 1,
      }}>{label}</span>
    </button>
  );
}

/* ═══════════════ INNER BTN ═══════════════ */
const InnerBtn = memo(function InnerBtn({
  label, onClick, variant = "ghost", disabled = false,
}: { label: string; onClick: () => void; variant?: "primary" | "ghost" | "sm"; disabled?: boolean; }) {
  const styles: Record<string, React.CSSProperties> = {
    primary: { padding: "10px 22px", borderRadius: 9999, background: "#fff", color: "#000", fontSize: "0.875rem", fontWeight: 600 },
    ghost:   { padding: "9px 18px", borderRadius: 10, background: "rgba(255,255,255,0.08)", color: "#fff", border: "1px solid rgba(255,255,255,0.14)", fontSize: "0.875rem", fontWeight: 500 },
    sm:      { padding: "6px 14px", borderRadius: 8, background: "rgba(255,255,255,0.07)", color: "rgba(255,255,255,0.72)", border: "1px solid rgba(255,255,255,0.11)", fontSize: "0.78rem", fontWeight: 500 },
  };
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        display: "inline-flex", alignItems: "center", gap: 6,
        cursor: disabled ? "not-allowed" : "pointer",
        fontFamily: FONT, border: "none",
        transition: "all .18s", opacity: disabled ? 0.42 : 1,
        ...styles[variant],
      }}
    >{label}</button>
  );
});

/* ═══════════════ SHARED UI ═══════════════ */
const ProgBar = memo(function ProgBar({ pct }: { pct: number }) {
  return (
    <div style={{ height: 2, background: "rgba(255,255,255,0.08)", borderRadius: 2, overflow: "hidden", marginBottom: 22 }}>
      <div style={{ height: "100%", width: `${pct}%`, background: "#fff", borderRadius: 2, transition: "width .45s ease" }} />
    </div>
  );
});

function Spinner() {
  return <div style={{ width: 44, height: 44, border: "2px solid rgba(255,255,255,0.08)", borderTopColor: "rgba(255,255,255,0.75)", borderRadius: "50%", animation: "spin .75s linear infinite", margin: "0 auto 18px" }} />;
}

function TopBar({ title, onBack, extra }: { title: string; onBack: () => void; extra?: React.ReactNode }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 24 }}>
      <InnerBtn label="← Quay lại" onClick={onBack} variant="sm" />
      <span style={{ fontWeight: 600, fontSize: "0.95rem" }}>{title}</span>
      {extra !== undefined ? <div style={{ marginLeft: "auto" }}>{extra}</div> : null}
    </div>
  );
}

function LvGrid({ level, setLevel }: { level: string; setLevel: (v: string) => void }) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(5,1fr)", gap: 8, marginBottom: 16 }}>
      {LEVELS.map(lv => (
        <div key={lv.id}
          onClick={() => setLevel(lv.id)}
          style={{
            ...glass({ padding: "12px 8px",
              background: level === lv.id ? "rgba(255,255,255,0.13)" : "rgba(255,255,255,0.04)",
              borderColor: level === lv.id ? "rgba(255,255,255,0.45)" : "rgba(255,255,255,0.09)",
            }),
            cursor: "pointer", textAlign: "center", transition: "all .18s",
          }}>
          <div style={{ fontWeight: 700, fontSize: "0.95rem", color: level === lv.id ? "#fff" : "rgba(255,255,255,0.7)", marginBottom: 2 }}>{lv.label}</div>
          <div style={{ fontSize: "0.64rem", color: "rgba(255,255,255,0.35)", lineHeight: 1.4 }}>{lv.sub}</div>
        </div>
      ))}
    </div>
  );
}

/* ═══════════════ FLASHCARD ═══════════════ */
const FlashCards = memo(function FlashCards({ vocabs }: { vocabs: Vocab[] }) {
  const [idx, setIdx] = useState(0);
  const [flip, setFlip] = useState(false);
  if (!vocabs?.length) return null;
  const v = vocabs[idx];
  return (
    <div style={{ marginTop: 16 }}>
      <div style={{ fontSize: "0.68rem", fontWeight: 600, color: "rgba(255,255,255,0.4)", textTransform: "uppercase", letterSpacing: "0.8px", marginBottom: 10 }}>Từ vựng quan trọng ({vocabs.length} từ)</div>
      <div
        onClick={() => setFlip(f => !f)}
        style={{
          ...glass({ padding: "22px 18px", textAlign: "center", cursor: "pointer", minHeight: 100, transition: "all .25s",
            background: flip ? "rgba(255,255,255,0.1)" : "rgba(255,255,255,0.04)",
            borderColor: flip ? "rgba(255,255,255,0.3)" : "rgba(255,255,255,0.09)",
          }),
          display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 8,
        }}>
        {flip ? (
          <>
            <div style={{ fontWeight: 700, fontSize: "1.05rem", marginBottom: 4, lineHeight: 1.4 }}>{v.meaning}</div>
            {v.example ? <div style={{ fontSize: "0.82rem", color: "rgba(255,255,255,0.5)", fontStyle: "italic", lineHeight: 1.6 }}>"{v.example}"</div> : null}
          </>
        ) : (
          <>
            <div style={{ fontWeight: 700, fontSize: "1.3rem" }}>{v.word}</div>
            <div style={{ fontSize: "0.7rem", color: "rgba(255,255,255,0.35)" }}>Nhấn để xem nghĩa tiếng Việt</div>
          </>
        )}
      </div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 14, marginTop: 10 }}>
        <InnerBtn label="←" onClick={() => { setIdx(i => Math.max(0, i - 1)); setFlip(false); }} variant="sm" disabled={idx === 0} />
        <span style={{ fontSize: "0.78rem", color: "rgba(255,255,255,0.4)", fontWeight: 500 }}>{idx + 1} / {vocabs.length}</span>
        <InnerBtn label="→" onClick={() => { setIdx(i => Math.min(vocabs.length - 1, i + 1)); setFlip(false); }} variant="sm" disabled={idx === vocabs.length - 1} />
      </div>
    </div>
  );
});

/* ═══════════════ KEY POINTS ═══════════════ */
const KeyPoints = memo(function KeyPoints({ points }: { points: string[] }) {
  if (!points?.length) return null;
  return (
    <div style={{ marginTop: 16 }}>
      <div style={{ fontSize: "0.68rem", fontWeight: 600, color: "rgba(255,255,255,0.4)", textTransform: "uppercase", letterSpacing: "0.8px", marginBottom: 10 }}>Cấu trúc bài mẫu</div>
      <div style={{ display: "grid", gap: 7 }}>
        {points.map((p, i) => (
          <div key={i} style={{ display: "flex", gap: 10, alignItems: "flex-start", ...glass({ padding: "10px 14px" }) }}>
            <span style={{ width: 20, height: 20, borderRadius: "50%", background: "rgba(255,255,255,0.12)", border: "1px solid rgba(255,255,255,0.2)", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "0.65rem", fontWeight: 700, flexShrink: 0 }}>{i + 1}</span>
            <span style={{ fontSize: "0.855rem", color: "rgba(255,255,255,0.78)", lineHeight: 1.65 }}>{p}</span>
          </div>
        ))}
      </div>
    </div>
  );
});

/* ═══════════════ SCORE DISPLAY ═══════════════ */
const ScoreDisplay = memo(function ScoreDisplay({ r }: { r: ScoreResult }) {
  const sc = r.score;
  const alpha = sc >= 8 ? 0.9 : sc >= 6 ? 0.72 : sc >= 4 ? 0.5 : 0.35;
  return (
    <div style={{ ...glass({ padding: 18, marginTop: 14, background: "rgba(255,255,255,0.06)" }), animation: "fadeUp .35s ease" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 12 }}>
        <div style={{ width: 54, height: 54, borderRadius: "50%", background: `rgba(255,255,255,${alpha})`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, border: "1px solid rgba(255,255,255,0.25)" }}>
          <span style={{ fontWeight: 800, fontSize: "1.35rem", color: "#000" }}>{sc}</span>
        </div>
        <div>
          <div style={{ fontWeight: 700, fontSize: "0.92rem", marginBottom: 2 }}>Điểm: {sc} / 10</div>
          <div style={{ fontSize: "0.77rem", color: "rgba(255,255,255,0.45)", lineHeight: 1.5 }}>Tương đương cấp <strong style={{ color: "rgba(255,255,255,0.85)" }}>{r.estimatedLevel}</strong></div>
        </div>
      </div>
      <p style={{ fontSize: "0.875rem", color: "rgba(255,255,255,0.7)", lineHeight: 1.72, marginBottom: 12 }}>{r.overall}</p>
      {r.strengths?.length > 0 && (
        <div style={{ marginBottom: 10 }}>
          <div style={{ fontSize: "0.68rem", fontWeight: 600, color: "rgba(255,255,255,0.5)", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 6 }}>Điểm mạnh</div>
          {r.strengths.map((s, i) => <div key={i} style={{ fontSize: "0.84rem", color: "rgba(255,255,255,0.68)", padding: "2px 0", lineHeight: 1.6 }}>✓ {s}</div>)}
        </div>
      )}
      {r.improvements?.length > 0 && (
        <div>
          <div style={{ fontSize: "0.68rem", fontWeight: 600, color: "rgba(255,255,255,0.45)", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 6 }}>Cần cải thiện</div>
          {r.improvements.map((s, i) => <div key={i} style={{ fontSize: "0.84rem", color: "rgba(255,255,255,0.6)", padding: "2px 0", lineHeight: 1.6 }}>↑ {s}</div>)}
        </div>
      )}
    </div>
  );
});

/* ═══════════════ SAMPLE BLOCK ═══════════════ */
interface SBP {
  q: Question; qi: number; level: string; topicName: string;
  speakIdx: number | null; toggleTTS: (i: number, t: string) => void;
  shown: boolean; onToggle: () => void;
  isFav: boolean; onToggleFav: () => void;
  userAnswer: string; onAnswerChange: (v: string) => void;
  score: ScoreResult | null; scoring: boolean; onScore: () => void;
  vocabOpen: boolean; onVocabToggle: () => void;
  kpOpen: boolean; onKpToggle: () => void;
}

const SmallBtn = memo(function SmallBtn({ label, onClick, active = false, children }: {
  label?: string; onClick: () => void; active?: boolean; children?: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      style={{
        display: "inline-flex", alignItems: "center", gap: 5, padding: "5px 13px",
        borderRadius: 8,
        background: active ? "rgba(255,255,255,0.12)" : "rgba(255,255,255,0.06)",
        color: active ? "#fff" : "rgba(255,255,255,0.65)",
        border: `1px solid ${active ? "rgba(255,255,255,0.24)" : "rgba(255,255,255,0.1)"}`,
        cursor: "pointer", fontSize: "0.78rem", fontWeight: 500, fontFamily: FONT,
        transition: "all .15s",
      }}>
      {children}{label}
    </button>
  );
});

function SampleBlock(p: SBP) {
  const speaking = p.speakIdx === p.qi;
  return (
    <>
      <div style={{ display: "flex", gap: 7, alignItems: "center", marginTop: 12, flexWrap: "wrap" }}>
        <SmallBtn onClick={p.onToggle} label={p.shown ? "▲ Ẩn bài mẫu" : "▼ Xem bài mẫu"} />
        {p.shown && (
          <>
            <SmallBtn onClick={() => p.toggleTTS(p.qi, p.q.sample)} active={speaking}>
              {speaking ? <IcoPause /> : <IcoSpeaker />}
              {speaking ? <><span>Đang đọc</span><WaveDots /></> : "Đọc to"}
            </SmallBtn>
            {p.q.vocabulary?.length > 0 && (
              <SmallBtn onClick={p.onVocabToggle} active={p.vocabOpen} label={p.vocabOpen ? "Ẩn từ vựng" : "📖 Từ vựng"} />
            )}
            {p.q.keyPoints?.length > 0 && (
              <SmallBtn onClick={p.onKpToggle} active={p.kpOpen} label={p.kpOpen ? "Ẩn cấu trúc" : "🔍 Cấu trúc"} />
            )}
            <SmallBtn onClick={p.onToggleFav} active={p.isFav}>
              <IcoHeart filled={p.isFav} />{p.isFav ? "Đã lưu" : "Lưu"}
            </SmallBtn>
          </>
        )}
      </div>
      {p.shown && (
        <div style={{ ...glass({ padding: 18, borderLeft: "2px solid rgba(255,255,255,0.28)", background: "rgba(255,255,255,0.05)", marginTop: 12 }), animation: "fadeUp .3s ease" }}>
          <div style={{ fontSize: "0.68rem", fontWeight: 600, color: "rgba(255,255,255,0.42)", textTransform: "uppercase", letterSpacing: "0.6px", marginBottom: 10 }}>Bài mẫu — Cấp {p.level}</div>
          <p style={{ fontSize: "0.9rem", color: "rgba(255,255,255,0.83)", lineHeight: 1.82 }}>{p.q.sample}</p>
        </div>
      )}
      {p.shown && p.vocabOpen && p.q.vocabulary?.length > 0 && <FlashCards vocabs={p.q.vocabulary} />}
      {p.shown && p.kpOpen && p.q.keyPoints?.length > 0 && <KeyPoints points={p.q.keyPoints} />}
      {/* Score practice area */}
      <div style={{ marginTop: 14, ...glass({ padding: 16 }) }}>
        <div style={{ fontSize: "0.68rem", fontWeight: 600, color: "rgba(255,255,255,0.32)", textTransform: "uppercase", letterSpacing: "0.8px", marginBottom: 10 }}>✦ Viết câu trả lời — Chấm điểm AI</div>
        <textarea
          value={p.userAnswer}
          onChange={e => p.onAnswerChange(e.target.value)}
          placeholder="Nhập câu trả lời của bạn bằng tiếng Anh..."
          style={{ minHeight: 90 }}
        />
        <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 10 }}>
          <InnerBtn
            label={p.scoring ? "⏳ Đang chấm..." : "✦ Chấm điểm AI"}
            onClick={p.onScore}
            variant="primary"
            disabled={!p.userAnswer.trim() || p.scoring}
          />
        </div>
        {p.score !== null && <ScoreDisplay r={p.score} />}
      </div>
    </>
  );
}

/* ═══════════════ QUESTION CARD ═══════════════ */
function QCard(p: SBP & { showGroup?: boolean }) {
  const grp = p.showGroup ? TYPE_GROUPS.find(g => p.qi >= g.range[0] && p.qi <= g.range[1]) : undefined;
  return (
    <div style={{ ...glass({ padding: 24, marginBottom: 12 }), animation: "fadeUp .3s ease" }}>
      {grp !== undefined && (
        <div style={{ ...glass({ padding: "8px 14px", marginBottom: 14, background: "rgba(255,255,255,0.03)" }), display: "flex", gap: 10, alignItems: "center" }}>
          <span style={{ fontWeight: 600, fontSize: "0.7rem", color: "rgba(255,255,255,0.32)", textTransform: "uppercase", letterSpacing: "0.8px" }}>{grp.tag}</span>
          <span style={{ fontWeight: 600, fontSize: "0.85rem" }}>{grp.label}</span>
          <span style={{ color: "rgba(255,255,255,0.28)", fontSize: "0.8rem" }}>— {grp.vi}</span>
        </div>
      )}
      <div style={{ display: "flex", alignItems: "flex-start", gap: 14, marginBottom: 14 }}>
        <div style={{ width: 36, height: 36, borderRadius: "50%", background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.14)", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: "0.85rem", color: "rgba(255,255,255,0.78)", flexShrink: 0 }}>{p.qi + 1}</div>
        <div style={{ flex: 1 }}>
          <span style={{ display: "inline-block", padding: "2px 10px", borderRadius: 20, fontSize: "0.68rem", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.4px", marginBottom: 10, color: "rgba(255,255,255,0.82)", background: "rgba(255,255,255,0.09)", border: "1px solid rgba(255,255,255,0.12)" }}>
            {p.q.type.charAt(0).toUpperCase() + p.q.type.slice(1)}
          </span>
          <div style={{ ...glass({ padding: "14px 16px", borderLeft: "2px solid rgba(255,255,255,0.18)", background: "rgba(255,255,255,0.04)" }), fontWeight: 600, fontSize: "0.97rem", lineHeight: 1.68 }}>{p.q.question}</div>
        </div>
      </div>
      <div style={{ ...glass({ padding: "12px 15px", borderLeft: "2px solid rgba(255,255,255,0.14)", background: "rgba(255,255,255,0.03)" }), marginBottom: 12 }}>
        <div style={{ fontSize: "0.68rem", fontWeight: 600, color: "rgba(255,255,255,0.38)", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 6 }}>Gợi ý trả lời</div>
        <p style={{ fontSize: "0.875rem", color: "rgba(255,255,255,0.68)", lineHeight: 1.7 }}>{p.q.tip}</p>
      </div>
      <SampleBlock {...p} />
    </div>
  );
}

/* ═══════════════ INNER HEADER ═══════════════ */
function InnerHeader({ page, onHome, onFavs, favCount }: { page: Page; onHome: () => void; onFavs: () => void; favCount: number; }) {
  return (
    <header style={{ position: "fixed", top: 0, left: 0, right: 0, zIndex: 100, padding: "18px 48px", display: "flex", alignItems: "center", justifyContent: "space-between", background: "rgba(0,0,0,0.72)", backdropFilter: "blur(24px)", WebkitBackdropFilter: "blur(24px)", borderBottom: "1px solid rgba(255,255,255,0.07)" }}>
      <span style={{ fontWeight: 700, fontSize: "1.05rem", letterSpacing: "-0.2px", cursor: "pointer" }} onClick={onHome}>OPIc Learn</span>
      <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
        <button
          onClick={onFavs}
          style={{ background: "none", border: "none", cursor: "pointer", color: "rgba(255,255,255,0.52)", fontSize: "0.8rem", fontFamily: FONT, fontWeight: 500, display: "flex", alignItems: "center", gap: 5 }}>
          <IcoHeart filled={favCount > 0} />Đã lưu
          {favCount > 0 && <span style={{ background: "rgba(255,255,255,0.14)", borderRadius: 20, fontSize: "0.6rem", fontWeight: 700, padding: "1px 7px" }}>{favCount}</span>}
        </button>
        <PillBtn label="Trang chủ" onClick={onHome} />
      </div>
    </header>
  );
}

/* ═══════════════ INNER LAYOUT ═══════════════ */
function InnerPage({ children, page, onHome, onFavs, favCount, maxW = 780 }: {
  children: React.ReactNode; page: Page; onHome: () => void; onFavs: () => void; favCount: number; maxW?: number;
}) {
  return (
    <div style={{ minHeight: "100vh", background: "#000" }}>
      <InnerHeader page={page} onHome={onHome} onFavs={onFavs} favCount={favCount} />
      <div style={{ maxWidth: maxW, margin: "0 auto", padding: "94px 20px 56px", minHeight: "100vh" }}>
        {children}
      </div>
    </div>
  );
}

/* ═══════════════ MAIN APP ═══════════════ */
export default function App() {
  const [page, setPage]           = useState<Page>("home");
  const [mode, setMode]           = useState<"topic" | "exam" | null>(null);
  const [topic, setTopic]         = useState<string | null>(null);
  const [topicLv, setTopicLv]     = useState("IM2");
  const [sqIdx, setSqIdx]         = useState(0);
  const [sqAns, setSqAns]         = useState<Record<string, number | number[]>>({});
  const [examLv, setExamLv]       = useState("IM2");
  const [examQs, setExamQs]       = useState<Question[]>([]);
  const [examIdx, setExamIdx]     = useState(0);
  const [topicQs, setTopicQs]     = useState<Question[]>([]);
  const [loading, setLoading]     = useState(false);
  const [loadErr, setLoadErr]     = useState<string | null>(null);
  const [favs, setFavs]           = useState<Fav[]>([]);
  const [shown, setShown]         = useState<Record<number, boolean>>({});
  const [vocabOpen, setVocabOpen] = useState<Record<number, boolean>>({});
  const [kpOpen, setKpOpen]       = useState<Record<number, boolean>>({});
  const [answers, setAnswers]     = useState<Record<number, string>>({});
  const [scores, setScores]       = useState<Record<number, ScoreResult>>({});
  const [scoring, setScoring]     = useState<Record<number, boolean>>({});
  const { speakIdx, toggle: tts, stop: stopSpeech } = useTTS();

  useEffect(() => { setFavs(loadFavs()); }, []);

  const tp = TOPICS.find(t => t.id === topic);
  const topicName = tp?.name ?? "";

  const goHome = useCallback(() => {
    stopSpeech();
    setPage("home"); setMode(null); setTopic(null);
    setTopicQs([]); setExamQs([]); setExamIdx(0);
    setShown({}); setVocabOpen({}); setKpOpen({});
    setAnswers({}); setScores({}); setScoring({});
    setLoading(false); setLoadErr(null);
    setSqIdx(0); setSqAns({});
  }, [stopSpeech]);

  const isFav = useCallback((q: string) => favs.some(f => f.questionText === q), [favs]);

  const toggleFav = useCallback((q: Question, level: string) => {
    const ex = favs.find(f => f.questionText === q.question);
    const next = ex
      ? favs.filter(f => f.questionText !== q.question)
      : [...favs, { id: Date.now().toString(), questionText: q.question, sample: q.sample, topicName, level, type: q.type, savedAt: new Date().toLocaleDateString("vi-VN") }];
    setFavs(next); saveFavs(next);
  }, [favs, topicName]);

  const handleScore = useCallback(async (qi: number, q: Question, level: string) => {
    const ans = answers[qi]?.trim();
    if (!ans) return;
    setScoring(p => ({ ...p, [qi]: true }));
    try {
      const r = await callScore(q.question, ans, level);
      setScores(p => ({ ...p, [qi]: r }));
    } catch { alert("Lỗi chấm điểm. Vui lòng thử lại!"); }
    finally { setScoring(p => ({ ...p, [qi]: false })); }
  }, [answers]);

  // Survey helpers
  const curSQ = SQS[sqIdx];
  const canNext = (() => {
    const a = sqAns[curSQ?.id];
    return curSQ?.multi ? Array.isArray(a) && a.length > 0 : a !== undefined && a !== null;
  })();

  const selOpt = useCallback((i: number) => {
    const q = SQS[sqIdx];
    if (q.multi) {
      const cur = (sqAns[q.id] as number[] | undefined) ?? [];
      setSqAns(p => ({ ...p, [q.id]: cur.includes(i) ? cur.filter(x => x !== i) : [...cur, i] }));
    } else {
      setSqAns(p => ({ ...p, [q.id]: i }));
    }
  }, [sqIdx, sqAns]);

  // AI calls with fixed prompts
  const startTopic = useCallback(async () => {
    if (!topic) return;
    setPage("topic"); setLoading(true); setLoadErr(null);
    setTopicQs([]); setShown({}); setVocabOpen({}); setKpOpen({}); setAnswers({}); setScores({});
    try {
      type TopicResp = { questions: Question[] };
      const data = await callAI<TopicResp>(buildTopicPrompt(topicName, topicLv), 2200);
      if (!data.questions?.length) throw new Error("Không nhận được câu hỏi từ AI");
      setTopicQs(data.questions);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Lỗi không xác định";
      setLoadErr(msg);
    } finally {
      setLoading(false);
    }
  }, [topic, topicName, topicLv]);

  const generateExam = useCallback(async () => {
    setPage("exam"); setLoading(true); setLoadErr(null);
    setExamQs([]); setExamIdx(0); setShown({}); setAnswers({}); setScores({});
    const profile = SQS.map(q => {
      const a = sqAns[q.id];
      return q.multi
        ? `${q.q}: ${((a as number[]) ?? []).map(i => q.opts[i]).join(", ") || "N/A"}`
        : `${q.q}: ${a !== undefined ? q.opts[a as number] : "N/A"}`;
    }).join("\n");
    try {
      type ExamResp = { questions: Question[] };
      const data = await callAI<ExamResp>(buildExamPrompt(profile, examLv), 3200);
      if (!data.questions?.length) throw new Error("Không nhận được đề thi từ AI");
      setExamQs(data.questions);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Lỗi không xác định";
      setLoadErr(msg);
    } finally {
      setLoading(false);
    }
  }, [sqAns, examLv]);

  // QCard props builder
  const qp = useCallback((q: Question, qi: number, level: string, showGroup = false) => ({
    q, qi, level, topicName, speakIdx, toggleTTS: tts,
    shown: !!shown[qi], onToggle: () => setShown(p => ({ ...p, [qi]: !p[qi] })),
    isFav: isFav(q.question), onToggleFav: () => toggleFav(q, level),
    userAnswer: answers[qi] ?? "", onAnswerChange: (v: string) => setAnswers(p => ({ ...p, [qi]: v })),
    score: scores[qi] ?? null, scoring: !!scoring[qi], onScore: () => handleScore(qi, q, level),
    vocabOpen: !!vocabOpen[qi], onVocabToggle: () => setVocabOpen(p => ({ ...p, [qi]: !p[qi] })),
    kpOpen: !!kpOpen[qi], onKpToggle: () => setKpOpen(p => ({ ...p, [qi]: !p[qi] })),
    showGroup,
  }), [topicName, speakIdx, tts, shown, isFav, toggleFav, answers, scores, scoring, vocabOpen, kpOpen, handleScore]);

  const innerProps = { page, onHome: goHome, onFavs: () => setPage("favs"), favCount: favs.length };

  // Shared loading/error screen
  function LoadScreen({ text, sub }: { text: string; sub?: string }) {
    return (
      <div style={{ textAlign: "center", padding: "80px 20px" }}>
        {loadErr !== null ? (
          <>
            <div style={{ fontSize: 36, marginBottom: 16 }}>⚠️</div>
            <p style={{ fontSize: "0.95rem", color: "rgba(255,255,255,0.7)", marginBottom: 8 }}>{loadErr}</p>
            <div style={{ display: "flex", gap: 10, justifyContent: "center", marginTop: 18 }}>
              <InnerBtn label="Thử lại" onClick={() => { setLoadErr(null); if (page === "topic") startTopic(); else generateExam(); }} variant="primary" />
              <InnerBtn label="Quay lại" onClick={goHome} variant="ghost" />
            </div>
          </>
        ) : (
          <>
            <Spinner />
            <p style={{ fontSize: "0.93rem", color: "rgba(255,255,255,0.55)", marginBottom: 4 }}>{text}</p>
            {sub !== undefined && <p style={{ fontSize: "0.8rem", color: "rgba(255,255,255,0.3)" }}>{sub}</p>}
          </>
        )}
      </div>
    );
  }

  /* ══════════ HOME ══════════ */
  if (page === "home") return (
    <div style={{ position: "relative", minHeight: "100vh", background: "#000", overflow: "hidden" }}>
      {/* Fullscreen video */}
      <video autoPlay loop muted playsInline
        src="https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260217_030345_246c0224-10a4-422c-b324-070b7c0eceda.mp4"
        style={{ position: "fixed", inset: 0, width: "100%", height: "100%", objectFit: "cover", zIndex: 0 }}
      />
      {/* 50% black overlay */}
      <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 1, pointerEvents: "none" }} />

      {/* ── Navbar ── */}
      <nav style={{ position: "fixed", top: 0, left: 0, right: 0, zIndex: 50, padding: "20px 120px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 30 }}>
          <div style={{ width: 187, height: 25, display: "flex", alignItems: "center" }}>
            <span style={{ fontWeight: 800, fontSize: "1.15rem", color: "#fff", letterSpacing: "-0.3px" }}>OPIc Learn</span>
          </div>
          {(["Bắt đầu", "Tính năng", "Hướng dẫn", "Cấp độ"] as const).map(label => (
            <button key={label}
              onClick={() => { if (label === "Hướng dẫn") setPage("guide"); }}
              style={{ display: "flex", alignItems: "center", gap: 5, background: "none", border: "none", cursor: "pointer", color: "#fff", fontSize: 14, fontWeight: 500, fontFamily: FONT, whiteSpace: "nowrap" }}>
              {label}<ChevronDown />
            </button>
          ))}
        </div>
        <PillBtn label="Bắt đầu học" onClick={() => setMode("topic")} />
      </nav>

      {/* ── Hero (centered, paddingTop 280px) ── */}
      <div style={{ position: "relative", zIndex: 10, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", paddingTop: 280, paddingBottom: 102, paddingLeft: 20, paddingRight: 20, minHeight: "100vh" }}>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 40, maxWidth: 780, width: "100%" }}>

          {/* Badge */}
          <div style={{ display: "inline-flex", alignItems: "center", gap: 8, background: "rgba(255,255,255,0.1)", border: "1px solid rgba(255,255,255,0.2)", borderRadius: 20, padding: "6px 16px" }}>
            <span style={{ width: 4, height: 4, borderRadius: "50%", background: "#fff", display: "inline-block", flexShrink: 0 }} />
            <span style={{ fontSize: 13, fontWeight: 500, lineHeight: 1.5 }}>
              <span style={{ color: "rgba(255,255,255,0.6)" }}>Tính năng mới ra mắt từ </span>
              <span style={{ color: "#fff" }}>May 1, 2026</span>
            </span>
          </div>

          {/* Heading — gradient clip text */}
          <h1 style={{
            maxWidth: 613, textAlign: "center",
            fontSize: "clamp(36px,5vw,56px)", fontWeight: 500, lineHeight: 1.28,
            fontFamily: FONT, letterSpacing: "-0.3px",
            background: "linear-gradient(144.5deg, #ffffff 28%, rgba(0,0,0,0) 115%)",
            WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text",
          }}>
            Luyện thi OPIc<br />ở tốc độ của trải nghiệm thật
          </h1>

          {/* Subtitle */}
          <p style={{ fontSize: 15, fontWeight: 400, color: "rgba(255,255,255,0.7)", maxWidth: 680, textAlign: "center", lineHeight: 1.75, marginTop: -16 }}>
            Nền tảng luyện thi OPIc thông minh với AI — khảo sát nền cá nhân hoá, 15 câu theo đúng cấu trúc, flashcard từ vựng và chấm điểm tức thì.
          </p>

          {/* CTA — white pill */}
          <PillBtn label="Bắt đầu học ngay" onClick={() => setMode("topic")} white />
        </div>
      </div>

      {/* ── Mode panel ── */}
      {mode !== null && (
        <div style={{ position: "fixed", bottom: 0, left: 0, right: 0, zIndex: 60, background: "rgba(0,0,0,0.88)", backdropFilter: "blur(32px)", WebkitBackdropFilter: "blur(32px)", borderTop: "1px solid rgba(255,255,255,0.1)", borderRadius: "20px 20px 0 0", padding: 32, maxHeight: "75vh", overflow: "auto", animation: "fadeUp .32s ease" }}>
          <div style={{ maxWidth: 800, margin: "0 auto" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24 }}>
              <span style={{ fontSize: "1rem", fontWeight: 600 }}>{mode === "topic" ? "📝 Luyện theo chủ đề" : "🎯 Thi thử OPIc thật"}</span>
              <InnerBtn label="✕ Đóng" onClick={() => setMode(null)} variant="sm" />
            </div>

            {mode === "topic" && (
              <>
                <div style={{ fontSize: "0.78rem", fontWeight: 600, color: "rgba(255,255,255,0.38)", marginBottom: 10, textTransform: "uppercase", letterSpacing: "0.6px" }}>① Chọn cấp độ mong muốn</div>
                <LvGrid level={topicLv} setLevel={setTopicLv} />
                <div style={{ fontSize: "0.78rem", fontWeight: 600, color: "rgba(255,255,255,0.38)", marginBottom: 10, marginTop: 20, textTransform: "uppercase", letterSpacing: "0.6px" }}>② Chọn chủ đề luyện tập</div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(118px,1fr))", gap: 8, marginBottom: 22 }}>
                  {TOPICS.map(t => (
                    <div key={t.id}
                      onClick={() => setTopic(t.id)}
                      style={{ ...glass({ padding: "12px 8px", background: topic === t.id ? "rgba(255,255,255,0.12)" : "rgba(255,255,255,0.04)", borderColor: topic === t.id ? "rgba(255,255,255,0.42)" : "rgba(255,255,255,0.08)" }), cursor: "pointer", textAlign: "center", transition: "all .18s", fontSize: "0.78rem", fontWeight: topic === t.id ? 600 : 400, color: topic === t.id ? "#fff" : "rgba(255,255,255,0.55)" }}>
                      <span style={{ fontSize: 18, display: "block", marginBottom: 5 }}>{t.icon}</span>{t.name}
                    </div>
                  ))}
                </div>
                <div style={{ display: "flex", justifyContent: "flex-end" }}>
                  <InnerBtn label="Bắt đầu luyện tập →" onClick={() => { if (topic) startTopic(); }} variant="primary" disabled={!topic} />
                </div>
              </>
            )}

            {mode === "exam" && (
              <>
                <div style={{ display: "flex", gap: 16, marginBottom: 22 }}>
                  <span style={{ fontSize: 24, flexShrink: 0 }}>📋</span>
                  <div>
                    <div style={{ fontWeight: 600, marginBottom: 10 }}>Quy trình thi thử OPIc</div>
                    <ol style={{ paddingLeft: 18, color: "rgba(255,255,255,0.5)", fontSize: "0.875rem", lineHeight: 2.2 }}>
                      <li><strong style={{ color: "rgba(255,255,255,0.82)" }}>Khảo sát nền</strong> — 7 câu giống Background Survey thật</li>
                      <li><strong style={{ color: "rgba(255,255,255,0.82)" }}>Chọn cấp độ</strong> — IM1 / IM2 / IM3 / IH / AL</li>
                      <li><strong style={{ color: "rgba(255,255,255,0.82)" }}>15 câu cá nhân hoá</strong> + bài mẫu, flashcard, chấm điểm</li>
                    </ol>
                  </div>
                </div>
                <div style={{ display: "flex", justifyContent: "flex-end" }}>
                  <InnerBtn label="Bắt đầu khảo sát →" onClick={() => { setSqIdx(0); setSqAns({}); setPage("survey"); }} variant="primary" />
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );

  /* ══════════ TOPIC ══════════ */
  if (page === "topic") return (
    <InnerPage {...innerProps}>
      {(loading || loadErr !== null) ? (
        <LoadScreen text={`AI đang tạo câu hỏi cho "${tp?.name}"...`} sub="Bao gồm từ vựng và cấu trúc bài mẫu" />
      ) : (
        <>
          <TopBar
            title={`${tp?.icon} ${tp?.name} — Cấp ${topicLv}`}
            onBack={goHome}
            extra={<InnerBtn label="🔄 Tạo lại" onClick={() => { stopSpeech(); setTopicQs([]); setShown({}); setVocabOpen({}); setKpOpen({}); setAnswers({}); setScores({}); startTopic(); }} variant="sm" />}
          />
          {topicQs.map((q, i) => <QCard key={i} {...qp(q, i, topicLv)} />)}
        </>
      )}
    </InnerPage>
  );

  /* ══════════ SURVEY ══════════ */
  if (page === "survey") {
    const q = SQS[sqIdx];
    const ans = sqAns[q.id];
    const isMul = q.multi;
    const selArr = isMul ? ((ans as number[]) ?? []) : [];
    const selS = isMul ? -1 : (ans as number ?? -1);
    return (
      <InnerPage {...innerProps} maxW={620}>
        <TopBar title="Khảo sát nền OPIc" onBack={goHome} />
        {/* Stepper */}
        <div style={{ display: "flex", alignItems: "center", marginBottom: 24 }}>
          {SQS.map((_, i) => (
            <span key={i} style={{ display: "flex", alignItems: "center", flex: i < SQS.length - 1 ? 1 : "none" }}>
              <span style={{ width: 24, height: 24, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "0.68rem", fontWeight: 700, flexShrink: 0, background: i < sqIdx ? "rgba(255,255,255,0.14)" : i === sqIdx ? "#fff" : "rgba(255,255,255,0.05)", color: i < sqIdx ? "rgba(255,255,255,0.65)" : i === sqIdx ? "#000" : "rgba(255,255,255,0.22)", border: `1px solid ${i === sqIdx ? "rgba(255,255,255,0.5)" : "rgba(255,255,255,0.09)"}` }}>{i < sqIdx ? "✓" : i + 1}</span>
              {i < SQS.length - 1 && <span style={{ flex: 1, height: 1, background: "rgba(255,255,255,0.07)", minWidth: 6 }} />}
            </span>
          ))}
        </div>
        <div style={{ ...glass({ padding: 28 }) }}>
          <ProgBar pct={(sqIdx / SQS.length) * 100} />
          <div style={{ fontSize: "0.68rem", fontWeight: 600, color: "rgba(255,255,255,0.28)", textTransform: "uppercase", letterSpacing: "0.7px", marginBottom: 8 }}>Câu {sqIdx + 1} / {SQS.length}</div>
          <div style={{ fontWeight: 600, fontSize: "1.05rem", lineHeight: 1.62, marginBottom: 18 }}>{q.q}</div>
          {isMul && <p style={{ fontSize: "0.75rem", color: "rgba(255,255,255,0.3)", marginBottom: 12, lineHeight: 1.5 }}>Có thể chọn nhiều đáp án</p>}
          <div style={{ display: "grid", gap: 8 }}>
            {q.opts.map((opt, i) => {
              const sel = isMul ? selArr.includes(i) : selS === i;
              return (
                <div key={i}
                  onClick={() => selOpt(i)}
                  style={{ ...glass({ padding: "11px 15px", background: sel ? "rgba(255,255,255,0.1)" : "rgba(255,255,255,0.04)", borderColor: sel ? "rgba(255,255,255,0.34)" : "rgba(255,255,255,0.08)" }), cursor: "pointer", display: "flex", alignItems: "center", gap: 10, fontSize: "0.875rem", fontWeight: sel ? 500 : 400, color: sel ? "#fff" : "rgba(255,255,255,0.62)", transition: "all .18s" }}>
                  {isMul
                    ? <span style={{ width: 17, height: 17, borderRadius: 4, border: `1.5px solid ${sel ? "rgba(255,255,255,0.7)" : "rgba(255,255,255,0.2)"}`, background: sel ? "rgba(255,255,255,0.88)" : "transparent", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>{sel && <IcoCheck />}</span>
                    : <span style={{ width: 17, height: 17, borderRadius: "50%", border: `1.5px solid ${sel ? "rgba(255,255,255,0.7)" : "rgba(255,255,255,0.2)"}`, background: sel ? "rgba(255,255,255,0.88)" : "transparent", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>{sel && <span style={{ width: 7, height: 7, borderRadius: "50%", background: "#000", display: "block" }} />}</span>
                  }
                  {opt}
                </div>
              );
            })}
          </div>
          <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 22 }}>
            {sqIdx > 0 && <InnerBtn label="← Trước" onClick={() => setSqIdx(sqIdx - 1)} variant="ghost" />}
            <InnerBtn
              label={sqIdx < SQS.length - 1 ? "Tiếp theo →" : "Hoàn thành →"}
              onClick={() => { if (canNext) { if (sqIdx < SQS.length - 1) setSqIdx(sqIdx + 1); else setPage("level"); } }}
              variant="primary" disabled={!canNext}
            />
          </div>
        </div>
      </InnerPage>
    );
  }

  /* ══════════ LEVEL ══════════ */
  if (page === "level") return (
    <InnerPage {...innerProps} maxW={580}>
      <TopBar title="Chọn cấp độ mục tiêu" onBack={() => { setSqIdx(SQS.length - 1); setPage("survey"); }} />
      <div style={{ ...glass({ padding: 28 }) }}>
        <p style={{ color: "rgba(255,255,255,0.52)", fontSize: "0.875rem", marginBottom: 18, lineHeight: 1.65 }}>AI sẽ tạo 15 câu hỏi cá nhân hoá theo hồ sơ và cấp độ bạn chọn.</p>
        <LvGrid level={examLv} setLevel={setExamLv} />
        <div style={{ ...glass({ padding: "13px 15px", background: "rgba(255,255,255,0.03)" }), fontSize: "0.79rem", color: "rgba(255,255,255,0.38)", lineHeight: 1.9, marginBottom: 18 }}>
          NL → NM → NH → <strong style={{ color: "rgba(255,255,255,0.72)" }}>IM1 → IM2 → IM3</strong> → IH → AL
        </div>
        <div style={{ display: "flex", justifyContent: "flex-end" }}>
          <InnerBtn label="🎯 Tạo đề thi (15 câu) →" onClick={generateExam} variant="primary" />
        </div>
      </div>
    </InnerPage>
  );

  /* ══════════ EXAM ══════════ */
  if (page === "exam") return (
    <InnerPage {...innerProps}>
      {(loading || loadErr !== null) ? (
        <LoadScreen text="AI đang tạo đề thi cá nhân hoá..." sub={`Cấp ${examLv} · 15 câu`} />
      ) : examQs.length > 0 ? (
        <>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
            <InnerBtn label="✕ Thoát" onClick={() => { stopSpeech(); goHome(); }} variant="sm" />
            <div style={{ textAlign: "center" }}>
              <div style={{ fontWeight: 600, fontSize: "0.88rem" }}>Đề thi thử · Cấp {examLv}</div>
              <div style={{ fontSize: "0.73rem", color: "rgba(255,255,255,0.32)" }}>Câu {examIdx + 1} / {examQs.length}</div>
            </div>
            <span style={{ fontSize: "0.8rem", fontWeight: 600, color: "rgba(255,255,255,0.55)" }}>{Math.round(((examIdx + 1) / examQs.length) * 100)}%</span>
          </div>
          <ProgBar pct={((examIdx + 1) / examQs.length) * 100} />
          <QCard {...qp(examQs[examIdx], examIdx, examLv, true)} />
          <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 6 }}>
            {examIdx > 0 && <InnerBtn label="← Câu trước" onClick={() => { stopSpeech(); setExamIdx(examIdx - 1); setShown({}); }} variant="ghost" />}
            {examIdx < examQs.length - 1
              ? <InnerBtn label="Câu tiếp →" onClick={() => { stopSpeech(); setExamIdx(examIdx + 1); setShown({}); }} variant="primary" />
              : <InnerBtn label="🏁 Hoàn thành" onClick={() => { stopSpeech(); setPage("done"); }} variant="primary" />
            }
          </div>
        </>
      ) : null}
    </InnerPage>
  );

  /* ══════════ DONE ══════════ */
  if (page === "done") return (
    <InnerPage {...innerProps}>
      <div style={{ textAlign: "center", padding: "64px 24px" }}>
        <div style={{ fontSize: 52, marginBottom: 20 }}>🏁</div>
        <h2 style={{ fontWeight: 700, fontSize: "1.55rem", marginBottom: 8, letterSpacing: "-0.2px" }}>Hoàn thành bài thi thử!</h2>
        <p style={{ color: "rgba(255,255,255,0.5)", marginBottom: 6, lineHeight: 1.65 }}>Cấp độ: <strong style={{ color: "rgba(255,255,255,0.85)" }}>{examLv}</strong> · {examQs.length} câu</p>
        <p style={{ color: "rgba(255,255,255,0.38)", marginBottom: 36, lineHeight: 1.65 }}>Xem lại bài mẫu và tự chấm điểm từng câu.</p>
        <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
          <InnerBtn label="Xem lại bài thi" onClick={() => { setPage("exam"); setExamIdx(0); setShown({}); }} variant="ghost" />
          <InnerBtn label="Xem bài đã lưu" onClick={() => setPage("favs")} variant="ghost" />
          <InnerBtn label="Thi thử lại" onClick={goHome} variant="primary" />
        </div>
      </div>
    </InnerPage>
  );

  /* ══════════ FAVS ══════════ */
  if (page === "favs") return (
    <InnerPage {...innerProps}>
      <TopBar title={`Bài đã lưu (${favs.length})`} onBack={goHome} />
      {favs.length === 0 ? (
        <div style={{ ...glass({ padding: "48px 24px" }), textAlign: "center" }}>
          <div style={{ fontSize: 38, marginBottom: 14 }}>💔</div>
          <div style={{ fontWeight: 600, marginBottom: 8 }}>Chưa có bài nào được lưu</div>
          <p style={{ color: "rgba(255,255,255,0.4)", fontSize: "0.875rem", marginBottom: 22, lineHeight: 1.65 }}>Mở bài mẫu và nhấn "Lưu" để lưu vào đây.</p>
          <InnerBtn label="Bắt đầu luyện tập" onClick={goHome} variant="primary" />
        </div>
      ) : favs.map(f => (
        <div key={f.id} style={{ ...glass({ padding: 22, marginBottom: 12 }) }}>
          <div style={{ display: "flex", justifyContent: "space-between", gap: 12, marginBottom: 10 }}>
            <div style={{ flex: 1 }}>
              <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 8, flexWrap: "wrap" }}>
                <span style={{ display: "inline-block", padding: "2px 9px", borderRadius: 20, fontSize: "0.68rem", fontWeight: 600, textTransform: "uppercase", color: "rgba(255,255,255,0.82)", background: "rgba(255,255,255,0.09)", border: "1px solid rgba(255,255,255,0.12)" }}>
                  {f.type.charAt(0).toUpperCase() + f.type.slice(1)}
                </span>
                <span style={{ fontSize: "0.72rem", color: "rgba(255,255,255,0.3)" }}>{f.topicName} · Cấp {f.level} · {f.savedAt}</span>
              </div>
              <div style={{ fontWeight: 600, fontSize: "0.95rem", lineHeight: 1.6, marginBottom: 12 }}>{f.questionText}</div>
            </div>
            <InnerBtn label="✕" onClick={() => { const n = favs.filter(x => x.id !== f.id); setFavs(n); saveFavs(n); }} variant="sm" />
          </div>
          <div style={{ ...glass({ padding: 16, borderLeft: "2px solid rgba(255,255,255,0.2)", background: "rgba(255,255,255,0.04)" }) }}>
            <div style={{ fontSize: "0.68rem", fontWeight: 600, color: "rgba(255,255,255,0.38)", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 8 }}>Bài mẫu</div>
            <p style={{ fontSize: "0.875rem", color: "rgba(255,255,255,0.72)", lineHeight: 1.8 }}>{f.sample}</p>
          </div>
        </div>
      ))}
    </InnerPage>
  );

  /* ══════════ GUIDE ══════════ */
  if (page === "guide") return (
    <InnerPage {...innerProps} maxW={660}>
      <TopBar title="Cấp độ & Hướng dẫn OPIc" onBack={goHome} />
      <div style={{ ...glass({ padding: 24, marginBottom: 12 }) }}>
        <div style={{ fontWeight: 600, fontSize: "0.9rem", marginBottom: 16, color: "rgba(255,255,255,0.78)" }}>Thang cấp độ OPIc</div>
        {[
          { lv: "Novice Low / Mid / High", d: "Trả lời bằng từ đơn, cụm từ ngắn. Rất hạn chế về từ vựng và ngữ pháp." },
          { lv: "IM1 / IM2 / IM3",         d: "Câu đơn giản, mô tả được chủ đề quen thuộc. Phổ biến nhất cho người đi làm." },
          { lv: "Intermediate High (IH)",  d: "Câu ghép, mô tả và so sánh tốt. Xử lý được tình huống bất ngờ." },
          { lv: "Advanced Low (AL)",        d: "Đoạn văn dài, lập luận logic, thuyết phục. Gần như lưu loát." },
        ].map(x => (
          <div key={x.lv} style={{ display: "flex", alignItems: "flex-start", gap: 12, padding: "12px 0", borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
            <span style={{ display: "inline-block", padding: "3px 10px", borderRadius: 20, fontSize: "0.68rem", fontWeight: 600, textTransform: "uppercase", color: "rgba(255,255,255,0.82)", background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.12)", flexShrink: 0, whiteSpace: "nowrap" }}>{x.lv}</span>
            <p style={{ fontSize: "0.855rem", color: "rgba(255,255,255,0.5)", paddingTop: 4, lineHeight: 1.65 }}>{x.d}</p>
          </div>
        ))}
      </div>
      <div style={{ ...glass({ padding: 24 }) }}>
        <div style={{ fontWeight: 600, fontSize: "0.9rem", marginBottom: 14, color: "rgba(255,255,255,0.78)" }}>Cấu trúc 15 câu OPIc</div>
        {TYPE_GROUPS.map(g => (
          <div key={g.tag} style={{ display: "flex", gap: 14, padding: "11px 0", borderBottom: "1px solid rgba(255,255,255,0.05)", alignItems: "center" }}>
            <span style={{ fontWeight: 700, fontSize: "0.75rem", color: "rgba(255,255,255,0.65)", minWidth: 52 }}>{g.tag}</span>
            <span style={{ fontWeight: 600, fontSize: "0.85rem" }}>{g.label}</span>
            <span style={{ color: "rgba(255,255,255,0.3)", fontSize: "0.8rem" }}>— {g.vi}</span>
          </div>
        ))}
      </div>
      <div style={{ display: "flex", justifyContent: "center", marginTop: 24 }}>
        <InnerBtn label="Bắt đầu thi thử →" onClick={() => { setMode("exam"); setPage("home"); }} variant="primary" />
      </div>
    </InnerPage>
  );

  return null;
}
