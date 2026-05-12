"use client";
import { useEffect, useState, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { InnerHeader } from "@/app/_components/Header";
import { InnerBtn, glass, FONT } from "@/app/_components/ui";
import { loadFavs, saveFavs } from "@/lib/favs";
import type { Fav } from "@/lib/types";

/* ── TTS hook ─────────────────────────────────────────── */
function useTTS() {
  const [speakingId, setSpeakingId] = useState<string | null>(null);
  const utterRef = useRef<SpeechSynthesisUtterance | null>(null);

  const stop = useCallback(() => {
    if (typeof window !== "undefined") window.speechSynthesis?.cancel();
    setSpeakingId(null);
    utterRef.current = null;
  }, []);

  const toggle = useCallback((id: string, text: string) => {
    if (speakingId === id) { stop(); return; }
    stop();
    if (typeof window === "undefined" || !window.speechSynthesis) return;
    const u = new SpeechSynthesisUtterance(text);
    u.lang = "en-US";
    u.rate = 0.88;
    u.pitch = 1;
    u.onend  = () => setSpeakingId(null);
    u.onerror = () => setSpeakingId(null);
    utterRef.current = u;
    setSpeakingId(id);
    window.speechSynthesis.speak(u);
  }, [speakingId, stop]);

  // Cleanup on unmount
  useEffect(() => () => { stop(); }, [stop]);

  return { speakingId, toggle, stop };
}

/* ── Icons ────────────────────────────────────────────── */
function IcoPlay() {
  return (
    <svg width="13" height="13" viewBox="0 0 14 14" fill="none">
      <path d="M3 2.5v9l8-4.5-8-4.5z" fill="currentColor" />
    </svg>
  );
}
function IcoPause() {
  return (
    <svg width="13" height="13" viewBox="0 0 14 14" fill="none">
      <rect x="2" y="2" width="4" height="10" rx="1" fill="currentColor" />
      <rect x="8" y="2" width="4" height="10" rx="1" fill="currentColor" />
    </svg>
  );
}
function IcoSpeaker() {
  return (
    <svg width="13" height="13" viewBox="0 0 14 14" fill="none">
      <path d="M2 4.5v5l4-2.5-4-2.5z" fill="currentColor" />
      <path d="M8 3.5c1.4.9 2.5 2 2.5 3.5S9.4 10.1 8 11" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
      <path d="M9.5 1.5c2.5 1.5 3.5 3 3.5 5.5s-1 4-3.5 5.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
    </svg>
  );
}

function WaveAnim() {
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 2, marginLeft: 2 }}>
      {[8, 13, 6, 10].map((h, i) => (
        <span key={i} style={{
          display: "inline-block", width: 3, height: h, borderRadius: 2,
          background: "currentColor",
          animation: `wave .7s ease ${[0, 0.12, 0.24, 0.06][i]}s infinite`,
        }} />
      ))}
    </span>
  );
}

/* ── FavCard ──────────────────────────────────────────── */
function FavCard({
  f, isSpeaking, onTTSToggle, onRemove,
}: {
  f: Fav;
  isSpeaking: boolean;
  onTTSToggle: () => void;
  onRemove: () => void;
}) {
  const [expanded, setExpanded] = useState(true);

  return (
    <div style={{ ...glass({ padding: 22, marginBottom: 12 }), transition: "all .2s" }}>
      {/* Header row */}
      <div style={{ display: "flex", justifyContent: "space-between", gap: 12, marginBottom: 10 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          {/* Meta badges */}
          <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 8, flexWrap: "wrap" }}>
            <span style={{ display: "inline-block", padding: "2px 9px", borderRadius: 20, fontSize: "0.68rem", fontWeight: 600, textTransform: "uppercase", color: "rgba(255,255,255,.82)", background: "rgba(255,255,255,.09)", border: "1px solid rgba(255,255,255,.12)" }}>
              {f.type.charAt(0).toUpperCase() + f.type.slice(1)}
            </span>
            <span style={{ fontSize: "0.72rem", color: "rgba(255,255,255,.3)", fontFamily: FONT }}>
              {f.topicName} · Cấp {f.level} · {f.savedAt}
            </span>
          </div>
          {/* Question */}
          <p style={{ fontWeight: 600, fontSize: "0.95rem", lineHeight: 1.6, marginBottom: 0, fontFamily: FONT }}>
            {f.questionText}
          </p>
        </div>

        {/* Actions: expand toggle + delete */}
        <div style={{ display: "flex", gap: 6, alignItems: "flex-start", flexShrink: 0 }}>
          <button
            onClick={() => setExpanded(e => !e)}
            title={expanded ? "Thu gọn" : "Xem bài mẫu"}
            style={{ padding: "6px 10px", borderRadius: 8, background: "rgba(255,255,255,.07)", border: "1px solid rgba(255,255,255,.11)", cursor: "pointer", fontSize: "0.75rem", color: "rgba(255,255,255,.55)", fontFamily: FONT, fontWeight: 500 }}
          >
            {expanded ? "▲" : "▼ Xem"}
          </button>
          <button
            onClick={onRemove}
            title="Xoá"
            style={{ padding: "6px 10px", borderRadius: 8, background: "rgba(239,68,68,.08)", border: "1px solid rgba(239,68,68,.2)", cursor: "pointer", fontSize: "0.75rem", color: "rgba(255,100,100,.85)", fontFamily: FONT, fontWeight: 500 }}
          >✕</button>
        </div>
      </div>

      {/* Sample block — collapsible */}
      {expanded && (
        <div style={{ animation: "fadeUp .22s ease" }}>
          <div style={{ ...glass({ padding: 16, borderLeft: "2px solid rgba(255,255,255,.2)", background: "rgba(255,255,255,.04)" }) }}>
            {/* Sample header + TTS controls */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10, flexWrap: "wrap", gap: 8 }}>
              <span style={{ fontSize: "0.68rem", fontWeight: 700, color: "rgba(255,255,255,.38)", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                Bài mẫu
              </span>

              {/* TTS button group */}
              <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                {/* Read full sample */}
                <button
                  onClick={onTTSToggle}
                  style={{
                    display: "inline-flex", alignItems: "center", gap: 5, padding: "5px 13px",
                    borderRadius: 20,
                    background: isSpeaking ? "rgba(255,255,255,.14)" : "rgba(255,255,255,.07)",
                    border: `1px solid ${isSpeaking ? "rgba(255,255,255,.3)" : "rgba(255,255,255,.12)"}`,
                    cursor: "pointer", fontFamily: FONT, fontSize: "0.78rem", fontWeight: 500,
                    color: isSpeaking ? "#fff" : "rgba(255,255,255,.7)",
                    transition: "all .18s",
                  }}
                >
                  {isSpeaking ? <IcoPause /> : <IcoSpeaker />}
                  {isSpeaking ? <><span>Đang đọc</span><WaveAnim /></> : "Đọc to bài mẫu"}
                </button>
              </div>
            </div>

            {/* Sample text — highlight words being spoken if playing */}
            <p style={{
              fontSize: "0.875rem", color: "rgba(255,255,255,.75)", lineHeight: 1.85, fontFamily: FONT,
              borderRadius: isSpeaking ? 8 : 0,
              padding: isSpeaking ? "10px 12px" : 0,
              background: isSpeaking ? "rgba(255,255,255,.04)" : "transparent",
              transition: "all .25s",
            }}>
              {f.sample}
            </p>

            {/* Speed controls — only show when speaking */}
            {isSpeaking && (
              <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 10, animation: "fadeUp .2s ease" }}>
                <span style={{ fontSize: "0.7rem", color: "rgba(255,255,255,.35)", fontFamily: FONT }}>Tốc độ:</span>
                {([["Chậm", 0.7], ["Bình thường", 0.9], ["Nhanh", 1.15]] as [string, number][]).map(([lbl, rate]) => (
                  <button
                    key={lbl}
                    onClick={() => {
                      // Restart utterance at new rate
                      window.speechSynthesis?.cancel();
                      const u = new SpeechSynthesisUtterance(f.sample);
                      u.lang = "en-US"; u.rate = rate;
                      window.speechSynthesis.speak(u);
                    }}
                    style={{ padding: "3px 10px", borderRadius: 20, background: "rgba(255,255,255,.08)", border: "1px solid rgba(255,255,255,.12)", cursor: "pointer", fontSize: "0.72rem", color: "rgba(255,255,255,.6)", fontFamily: FONT, fontWeight: 500 }}
                  >{lbl}</button>
                ))}
              </div>
            )}
          </div>

          {/* Also read the question */}
          <div style={{ marginTop: 8, display: "flex", justifyContent: "flex-end" }}>
            <QuestionTTS question={f.questionText} />
          </div>
        </div>
      )}
    </div>
  );
}

/* ── Read the question aloud separately ──────────────── */
function QuestionTTS({ question }: { question: string }) {
  const [active, setActive] = useState(false);

  function toggle() {
    if (active) {
      window.speechSynthesis?.cancel();
      setActive(false);
      return;
    }
    const u = new SpeechSynthesisUtterance(question);
    u.lang = "en-US"; u.rate = 0.85;
    u.onend  = () => setActive(false);
    u.onerror = () => setActive(false);
    setActive(true);
    window.speechSynthesis.speak(u);
  }

  return (
    <button
      onClick={toggle}
      style={{
        display: "inline-flex", alignItems: "center", gap: 5, padding: "4px 11px",
        borderRadius: 20, background: "rgba(255,255,255,.05)", border: "1px solid rgba(255,255,255,.09)",
        cursor: "pointer", fontSize: "0.72rem", color: "rgba(255,255,255,.45)", fontFamily: FONT, fontWeight: 500,
      }}
    >
      {active ? <IcoPause /> : <IcoPlay />}
      {active ? "Dừng câu hỏi" : "Đọc câu hỏi"}
    </button>
  );
}

/* ── Main page ───────────────────────────────────────── */
export default function FavsPage() {
  const router = useRouter();
  const [favs, setFavs] = useState<Fav[]>([]);
  const { speakingId, toggle: ttsToggle, stop } = useTTS();

  useEffect(() => {
    setFavs(loadFavs());
    return () => stop(); // stop TTS on unmount / navigate away
  }, [stop]);

  function remove(id: string) {
    if (speakingId === id) stop();
    const next = favs.filter(f => f.id !== id);
    setFavs(next);
    saveFavs(next);
  }

  function clearAll() {
    if (!confirm("Xoá tất cả bài đã lưu?")) return;
    stop();
    setFavs([]);
    saveFavs([]);
  }

  return (
    <div style={{ minHeight: "100vh", background: "#000" }}>
      <InnerHeader />
      <div style={{ maxWidth: 780, margin: "0 auto", padding: "94px 20px 56px" }}>

        {/* Top bar */}
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 24 }}>
          <InnerBtn label="← Quay lại" onClick={() => { stop(); router.back(); }} variant="sm" />
          <span style={{ fontWeight: 700, fontSize: "0.95rem", fontFamily: FONT, flex: 1 }}>
            Bài đã lưu ({favs.length})
          </span>
          {favs.length > 0 && (
            <InnerBtn label="Xoá tất cả" onClick={clearAll} variant="sm" />
          )}
        </div>

        {/* Helper tip when items exist */}
        {favs.length > 0 && (
          <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 14px", background: "rgba(255,255,255,.04)", borderRadius: 10, border: "1px solid rgba(255,255,255,.07)", marginBottom: 20 }}>
            <IcoSpeaker />
            <p style={{ fontSize: "0.78rem", color: "rgba(255,255,255,.42)", fontFamily: FONT, lineHeight: 1.55 }}>
              Nhấn <strong style={{ color: "rgba(255,255,255,.65)" }}>"Đọc to bài mẫu"</strong> trên từng bài để nghe giọng đọc tiếng Anh. Có thể điều chỉnh tốc độ đọc.
            </p>
          </div>
        )}

        {/* Empty state */}
        {favs.length === 0 && (
          <div style={{ ...glass({ padding: "48px 24px" }), textAlign: "center" }}>
            <div style={{ fontSize: 38, marginBottom: 14 }}>💔</div>
            <p style={{ fontWeight: 600, marginBottom: 8, fontFamily: FONT }}>Chưa có bài nào được lưu</p>
            <p style={{ color: "rgba(255,255,255,.4)", fontSize: "0.875rem", marginBottom: 22, lineHeight: 1.65, fontFamily: FONT }}>
              Mở bài mẫu trong câu hỏi và nhấn "Lưu" để thêm vào đây.
            </p>
            <InnerBtn label="Bắt đầu luyện tập" onClick={() => router.push("/")} variant="primary" />
          </div>
        )}

        {/* Fav cards */}
        {favs.map(f => (
          <FavCard
            key={f.id}
            f={f}
            isSpeaking={speakingId === f.id}
            onTTSToggle={() => ttsToggle(f.id, f.sample)}
            onRemove={() => remove(f.id)}
          />
        ))}
      </div>
    </div>
  );
}
