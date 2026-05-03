"use client";
import { useState, memo } from "react";
import dynamic from "next/dynamic";
import type { Question, TextScore } from "@/lib/types";
import { TYPE_GROUPS } from "@/lib/data";
import { glass, FONT, SmallBtn, InnerBtn, IcoSpeaker, IcoPause, IcoHeart, Wave } from "./ui";
import { scoreText } from "@/lib/api";

// bundle-dynamic-imports: VoiceRecorder is heavy (audio API), load only when needed
const VoiceRecorder = dynamic(() => import("./VoiceRecorder"), { ssr: false });

/* ── Text score display ─────────────────────────────── */
const TextScoreDisplay = memo(function TextScoreDisplay({ r }: { r: TextScore }) {
  const sc = r.score;
  const alpha = sc >= 8 ? 0.9 : sc >= 6 ? 0.72 : sc >= 4 ? 0.5 : 0.35;
  return (
    <div style={{ ...glass({ padding: 18, marginTop: 14, background: "rgba(255,255,255,.06)" }), animation: "fadeUp .35s ease" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 12 }}>
        <div style={{ width: 54, height: 54, borderRadius: "50%", background: `rgba(255,255,255,${alpha})`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, border: "1px solid rgba(255,255,255,.25)" }}>
          <span style={{ fontWeight: 800, fontSize: "1.35rem", color: "#000" }}>{sc}</span>
        </div>
        <div>
          <div style={{ fontWeight: 700, fontSize: "0.92rem", marginBottom: 2 }}>Điểm: {sc} / 10</div>
          <div style={{ fontSize: "0.77rem", color: "rgba(255,255,255,.45)", lineHeight: 1.5 }}>
            Tương đương cấp <strong style={{ color: "rgba(255,255,255,.85)" }}>{r.estimatedLevel}</strong>
          </div>
        </div>
      </div>
      <p style={{ fontSize: "0.875rem", color: "rgba(255,255,255,.7)", lineHeight: 1.72, marginBottom: r.strengths?.length ? 12 : 0 }}>{r.overall}</p>
      {r.strengths?.length > 0 && (
        <div style={{ marginBottom: 8 }}>
          <div style={{ fontSize: "0.68rem", fontWeight: 700, color: "rgba(255,255,255,.5)", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 6 }}>Điểm mạnh</div>
          {r.strengths.map((s, i) => <p key={i} style={{ fontSize: "0.84rem", color: "rgba(255,255,255,.68)", padding: "2px 0", lineHeight: 1.6 }}>✓ {s}</p>)}
        </div>
      )}
      {r.improvements?.length > 0 && (
        <div>
          <div style={{ fontSize: "0.68rem", fontWeight: 700, color: "rgba(255,255,255,.45)", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 6 }}>Cần cải thiện</div>
          {r.improvements.map((s, i) => <p key={i} style={{ fontSize: "0.84rem", color: "rgba(255,255,255,.6)", padding: "2px 0", lineHeight: 1.6 }}>↑ {s}</p>)}
        </div>
      )}
    </div>
  );
});

/* ── Flashcard ──────────────────────────────────────── */
const FlashCards = memo(function FlashCards({ vocabs }: { vocabs: Question["vocabulary"] }) {
  const [idx, setIdx] = useState(0);
  const [flip, setFlip] = useState(false);
  if (!vocabs?.length) return null;
  const v = vocabs[idx];
  return (
    <div style={{ marginTop: 16 }}>
      <div style={{ fontSize: "0.68rem", fontWeight: 700, color: "rgba(255,255,255,.4)", textTransform: "uppercase", letterSpacing: "0.8px", marginBottom: 10 }}>
        Từ vựng ({vocabs.length} từ)
      </div>
      <div
        onClick={() => setFlip(f => !f)}
        style={{
          ...glass({
            padding: "22px 18px", textAlign: "center", cursor: "pointer", minHeight: 100,
            transition: "all .25s",
            background: flip ? "rgba(255,255,255,.1)" : "rgba(255,255,255,.04)",
            borderColor: flip ? "rgba(255,255,255,.3)" : "rgba(255,255,255,.09)",
          }),
          display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 8,
        }}
      >
        {flip ? (
          <>
            <div style={{ fontWeight: 700, fontSize: "1.05rem", marginBottom: 4, lineHeight: 1.4 }}>{v.meaning}</div>
            {v.example ? <div style={{ fontSize: "0.82rem", color: "rgba(255,255,255,.5)", fontStyle: "italic", lineHeight: 1.6 }}>"{v.example}"</div> : null}
          </>
        ) : (
          <>
            <div style={{ fontWeight: 700, fontSize: "1.3rem" }}>{v.word}</div>
            <div style={{ fontSize: "0.7rem", color: "rgba(255,255,255,.35)" }}>Nhấn để xem nghĩa tiếng Việt</div>
          </>
        )}
      </div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 14, marginTop: 10 }}>
        <InnerBtn label="←" onClick={() => { setIdx(i => Math.max(0, i - 1)); setFlip(false); }} variant="sm" disabled={idx === 0} />
        <span style={{ fontSize: "0.78rem", color: "rgba(255,255,255,.4)", fontWeight: 500 }}>{idx + 1} / {vocabs.length}</span>
        <InnerBtn label="→" onClick={() => { setIdx(i => Math.min(vocabs.length - 1, i + 1)); setFlip(false); }} variant="sm" disabled={idx === vocabs.length - 1} />
      </div>
    </div>
  );
});

/* ── Key points ─────────────────────────────────────── */
const KeyPoints = memo(function KeyPoints({ points }: { points: string[] }) {
  if (!points?.length) return null;
  return (
    <div style={{ marginTop: 16 }}>
      <div style={{ fontSize: "0.68rem", fontWeight: 700, color: "rgba(255,255,255,.4)", textTransform: "uppercase", letterSpacing: "0.8px", marginBottom: 10 }}>
        Cấu trúc bài mẫu
      </div>
      <div style={{ display: "grid", gap: 7 }}>
        {points.map((p, i) => (
          <div key={i} style={{ display: "flex", gap: 10, alignItems: "flex-start", ...glass({ padding: "10px 14px" }) }}>
            <span style={{ width: 20, height: 20, borderRadius: "50%", background: "rgba(255,255,255,.12)", border: "1px solid rgba(255,255,255,.2)", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "0.65rem", fontWeight: 700, flexShrink: 0 }}>{i + 1}</span>
            <span style={{ fontSize: "0.855rem", color: "rgba(255,255,255,.78)", lineHeight: 1.65 }}>{p}</span>
          </div>
        ))}
      </div>
    </div>
  );
});

/* ── TTS hook (local to card) ───────────────────────── */
function useTTS() {
  const [speaking, setSpeaking] = useState(false);
  const stop = () => { window.speechSynthesis?.cancel(); setSpeaking(false); };
  const toggle = (text: string) => {
    if (speaking) { stop(); return; }
    if (!window.speechSynthesis) return;
    setSpeaking(true);
    const u = new SpeechSynthesisUtterance(text);
    u.lang = "en-US"; u.rate = 0.88;
    u.onend = () => setSpeaking(false);
    u.onerror = () => setSpeaking(false);
    window.speechSynthesis.speak(u);
  };
  return { speaking, toggle, stop };
}

/* ── QuestionCard ───────────────────────────────────── */
export interface QuestionCardProps {
  q: Question;
  qi: number;
  level: string;
  topicName?: string;
  showGroup?: boolean;
  isFav: boolean;
  onToggleFav: () => void;
}

export default function QuestionCard({
  q, qi, level, topicName = "", showGroup = false, isFav, onToggleFav,
}: QuestionCardProps) {
  const [sampleOpen, setSampleOpen] = useState(false);
  const [vocabOpen,  setVocabOpen]  = useState(false);
  const [kpOpen,     setKpOpen]     = useState(false);
  const [voiceOpen,  setVoiceOpen]  = useState(false);
  const [answer,     setAnswer]     = useState("");
  const [textScore,  setTextScore]  = useState<TextScore | null>(null);
  const [scoring,    setScoring]    = useState(false);
  const { speaking, toggle: ttsToggle } = useTTS();

  const grp = showGroup ? TYPE_GROUPS.find(g => qi >= g.range[0] && qi <= g.range[1]) : undefined;

  const handleScore = async () => {
    if (!answer.trim() || scoring) return;
    setScoring(true);
    try {
      const r = await scoreText(q.question, answer, level);
      setTextScore(r);
    } catch {
      alert("Lỗi chấm điểm. Vui lòng thử lại!");
    } finally {
      setScoring(false);
    }
  };

  return (
    <div style={{ ...glass({ padding: 24, marginBottom: 12 }), animation: "fadeUp .3s ease" }}>
      {/* Group label */}
      {grp && (
        <div style={{ ...glass({ padding: "8px 14px", marginBottom: 14, background: "rgba(255,255,255,.03)" }), display: "flex", gap: 10, alignItems: "center" }}>
          <span style={{ fontWeight: 600, fontSize: "0.7rem", color: "rgba(255,255,255,.32)", textTransform: "uppercase", letterSpacing: "0.8px" }}>{grp.tag}</span>
          <span style={{ fontWeight: 600, fontSize: "0.85rem" }}>{grp.label}</span>
          <span style={{ color: "rgba(255,255,255,.28)", fontSize: "0.8rem" }}>— {grp.vi}</span>
        </div>
      )}

      {/* Question number + badge + text */}
      <div style={{ display: "flex", alignItems: "flex-start", gap: 14, marginBottom: 14 }}>
        <div style={{ width: 36, height: 36, borderRadius: "50%", background: "rgba(255,255,255,.08)", border: "1px solid rgba(255,255,255,.14)", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: "0.85rem", color: "rgba(255,255,255,.78)", flexShrink: 0 }}>{qi + 1}</div>
        <div style={{ flex: 1 }}>
          <span style={{ display: "inline-block", padding: "2px 10px", borderRadius: 20, fontSize: "0.68rem", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.4px", marginBottom: 10, color: "rgba(255,255,255,.82)", background: "rgba(255,255,255,.09)", border: "1px solid rgba(255,255,255,.12)" }}>
            {q.type.charAt(0).toUpperCase() + q.type.slice(1)}
          </span>
          <div style={{ ...glass({ padding: "14px 16px", borderLeft: "2px solid rgba(255,255,255,.18)", background: "rgba(255,255,255,.04)" }), fontWeight: 600, fontSize: "0.97rem", lineHeight: 1.68 }}>
            {q.question}
          </div>
        </div>
      </div>

      {/* Tip */}
      <div style={{ ...glass({ padding: "12px 15px", borderLeft: "2px solid rgba(255,255,255,.14)", background: "rgba(255,255,255,.03)" }), marginBottom: 12 }}>
        <div style={{ fontSize: "0.68rem", fontWeight: 600, color: "rgba(255,255,255,.38)", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 6 }}>Gợi ý trả lời</div>
        <p style={{ fontSize: "0.875rem", color: "rgba(255,255,255,.68)", lineHeight: 1.7 }}>{q.tip}</p>
      </div>

      {/* Action row */}
      <div style={{ display: "flex", gap: 7, flexWrap: "wrap", marginBottom: 10 }}>
        <SmallBtn onClick={() => setSampleOpen(o => !o)}>
          {sampleOpen ? "▲ Ẩn bài mẫu" : "▼ Xem bài mẫu"}
        </SmallBtn>

        {sampleOpen && (
          <>
            <SmallBtn onClick={() => ttsToggle(q.sample)} active={speaking}>
              {speaking ? <IcoPause /> : <IcoSpeaker />}
              {speaking ? <><span>Đang đọc</span><Wave /></> : "Đọc to"}
            </SmallBtn>
            {q.vocabulary?.length > 0 && (
              <SmallBtn onClick={() => setVocabOpen(o => !o)} active={vocabOpen}>
                {vocabOpen ? "Ẩn từ vựng" : "📖 Từ vựng"}
              </SmallBtn>
            )}
            {q.keyPoints?.length > 0 && (
              <SmallBtn onClick={() => setKpOpen(o => !o)} active={kpOpen}>
                {kpOpen ? "Ẩn cấu trúc" : "🔍 Cấu trúc"}
              </SmallBtn>
            )}
            <SmallBtn onClick={onToggleFav} active={isFav}>
              <IcoHeart filled={isFav} />
              {isFav ? "Đã lưu" : "Lưu"}
            </SmallBtn>
          </>
        )}

        {/* Voice recorder toggle */}
        <SmallBtn onClick={() => setVoiceOpen(o => !o)} active={voiceOpen}>
          {voiceOpen ? "🎤 Đóng thu âm" : "🎤 Thu âm & Chấm điểm"}
        </SmallBtn>
      </div>

      {/* Sample */}
      {sampleOpen && (
        <div style={{ ...glass({ padding: 18, borderLeft: "2px solid rgba(255,255,255,.28)", background: "rgba(255,255,255,.05)", marginBottom: 10 }), animation: "fadeUp .3s ease" }}>
          <div style={{ fontSize: "0.68rem", fontWeight: 600, color: "rgba(255,255,255,.42)", textTransform: "uppercase", letterSpacing: "0.6px", marginBottom: 10 }}>Bài mẫu — Cấp {level}</div>
          <p style={{ fontSize: "0.9rem", color: "rgba(255,255,255,.83)", lineHeight: 1.82 }}>{q.sample}</p>
        </div>
      )}

      {sampleOpen && vocabOpen && <FlashCards vocabs={q.vocabulary} />}
      {sampleOpen && kpOpen && <KeyPoints points={q.keyPoints} />}

      {/* Text scoring area */}
      <div style={{ marginTop: 14, ...glass({ padding: 16 }) }}>
        <div style={{ fontSize: "0.68rem", fontWeight: 600, color: "rgba(255,255,255,.32)", textTransform: "uppercase", letterSpacing: "0.8px", marginBottom: 10 }}>
          ✦ Viết câu trả lời — Chấm điểm AI
        </div>
        <textarea
          value={answer}
          onChange={e => setAnswer(e.target.value)}
          placeholder="Nhập câu trả lời của bạn bằng tiếng Anh..."
          style={{ minHeight: 90 }}
        />
        <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 10 }}>
          <InnerBtn
            label={scoring ? "⏳ Đang chấm..." : "✦ Chấm điểm AI"}
            onClick={handleScore}
            variant="primary"
            disabled={!answer.trim() || scoring}
          />
        </div>
        {textScore !== null && <TextScoreDisplay r={textScore} />}
      </div>

      {/* Voice recorder — lazy-loaded */}
      {voiceOpen && <VoiceRecorder question={q.question} level={level} />}
    </div>
  );
}
