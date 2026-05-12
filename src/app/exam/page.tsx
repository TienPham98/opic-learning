"use client";
import { useEffect, useState, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { InnerHeader } from "@/app/_components/Header";
import QuestionCard from "@/app/_components/QuestionCard";
import { InnerBtn, Spinner, ProgBar, glass, FONT } from "@/app/_components/ui";
import { store, KEYS } from "@/lib/store";
import { fetchExamQuestions } from "@/lib/api";
import { loadFavs, saveFavs, toggleFav } from "@/lib/favs";
import type { Question, Fav, SurveyAnswers } from "@/lib/types";

const QUESTION_TIME = 150; // 2 phút 30 giây

/* ── Countdown Timer component ─────────────────────── */
function CountdownTimer({
  seconds,
  onExpire,
}: {
  seconds: number;
  onExpire: () => void;
}) {
  const [remaining, setRemaining] = useState(seconds);
  const onExpireRef = useRef(onExpire);
  onExpireRef.current = onExpire;

  // Reset khi seconds prop thay đổi (câu mới)
  useEffect(() => {
    setRemaining(seconds);
  }, [seconds]);

  useEffect(() => {
    if (remaining <= 0) {
      onExpireRef.current();
      return;
    }
    const id = setTimeout(() => setRemaining(r => r - 1), 1000);
    return () => clearTimeout(id);
  }, [remaining]);

  const mm = String(Math.floor(remaining / 60)).padStart(2, "0");
  const ss = String(remaining % 60).padStart(2, "0");
  const pct = (remaining / seconds) * 100;

  // Màu thay đổi theo thời gian còn lại
  const isWarning  = remaining <= 60 && remaining > 20;  // 1 phút
  const isDanger   = remaining <= 20;                     // 20 giây cuối
  const color      = isDanger ? "#ef4444" : isWarning ? "#f59e0b" : "rgba(255,255,255,0.85)";
  const trackColor = isDanger ? "rgba(239,68,68,.15)"  : isWarning ? "rgba(245,158,11,.15)" : "rgba(255,255,255,.08)";
  const fillColor  = isDanger ? "#ef4444" : isWarning ? "#f59e0b" : "rgba(255,255,255,0.7)";
  const glowColor  = isDanger ? "rgba(239,68,68,.45)"  : isWarning ? "rgba(245,158,11,.4)"  : "none";

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4, minWidth: 72 }}>
      {/* Digital readout */}
      <div style={{
        fontFamily: "'Be Vietnam Pro', monospace",
        fontWeight: 700,
        fontSize: "1.1rem",
        color,
        letterSpacing: "0.05em",
        fontVariantNumeric: "tabular-nums",
        transition: "color .4s",
        textShadow: isDanger ? `0 0 12px ${glowColor}` : "none",
        animation: isDanger ? "pulse 0.8s ease infinite" : "none",
      }}>
        {mm}:{ss}
      </div>

      {/* Arc progress bar */}
      <div style={{ width: 56, height: 5, background: trackColor, borderRadius: 3, overflow: "hidden", transition: "background .4s" }}>
        <div style={{
          height: "100%",
          width: `${pct}%`,
          background: fillColor,
          borderRadius: 3,
          transition: "width 1s linear, background .4s",
          boxShadow: isDanger ? `0 0 8px ${glowColor}` : "none",
        }} />
      </div>

      <span style={{ fontSize: "0.62rem", color: "rgba(255,255,255,.3)", fontFamily: FONT, letterSpacing: "0.3px" }}>
        {isDanger ? "Hết giờ sắp!" : isWarning ? "Chuẩn bị kết thúc" : "Thời gian"}
      </span>
    </div>
  );
}

/* ── Time-expired toast ────────────────────────────── */
function ExpiredToast({ onNext, isLast, onDismiss }: { onNext: () => void; isLast: boolean; onDismiss: () => void; }) {
  useEffect(() => {
    const t = setTimeout(onDismiss, 8000);
    return () => clearTimeout(t);
  }, [onDismiss]);

  return (
    <div style={{
      position: "fixed", bottom: 32, left: "50%", transform: "translateX(-50%)",
      zIndex: 200, display: "flex", alignItems: "center", gap: 14,
      ...glass({ padding: "14px 20px", background: "rgba(239,68,68,.12)", borderColor: "rgba(239,68,68,.35)" }),
      boxShadow: "0 8px 32px rgba(239,68,68,.2)", animation: "fadeUp .3s ease", minWidth: 320,
    }}>
      <span style={{ fontSize: "1.3rem" }}>⏰</span>
      <div style={{ flex: 1 }}>
        <p style={{ fontWeight: 700, fontSize: "0.88rem", color: "#fca5a5", marginBottom: 2, fontFamily: FONT }}>Hết thời gian!</p>
        <p style={{ fontSize: "0.78rem", color: "rgba(255,255,255,.5)", fontFamily: FONT }}>
          {isLast ? "Đây là câu cuối cùng." : "Chuyển sang câu tiếp theo."}
        </p>
      </div>
      <button
        onClick={isLast ? onDismiss : onNext}
        style={{ padding: "7px 16px", borderRadius: 9999, background: "#ef4444", color: "#fff", border: "none", cursor: "pointer", fontFamily: FONT, fontWeight: 600, fontSize: "0.82rem", flexShrink: 0 }}
      >
        {isLast ? "OK" : "Tiếp →"}
      </button>
    </div>
  );
}

/* ── Main exam page ────────────────────────────────── */
export default function ExamPage() {
  const router = useRouter();
  const [questions, setQuestions] = useState<Question[]>([]);
  const [idx,       setIdx]       = useState(0);
  const [favs,      setFavs]      = useState<Fav[]>([]);
  const [loading,   setLoading]   = useState(true);
  const [error,     setError]     = useState<string | null>(null);
  const [timerKey,  setTimerKey]  = useState(0);   // force timer reset
  const [showToast, setShowToast] = useState(false);
  const [paused,    setPaused]    = useState(false);

  const level = store.get<string>(KEYS.examLevel, "IM2");

  useEffect(() => {
    setFavs(loadFavs());
    const cached    = store.get<Question[]>(KEYS.examQuestions, []);
    const savedIdx  = store.get<number>(KEYS.examIndex, 0);
    if (cached.length > 0) {
      setQuestions(cached);
      setIdx(savedIdx);
      setLoading(false);
      return;
    }
    const surveyAnswers = store.get<SurveyAnswers>(KEYS.surveyAnswers, {});
    fetchExamQuestions(surveyAnswers, level)
      .then(qs => { store.set(KEYS.examQuestions, qs); store.set(KEYS.examIndex, 0); setQuestions(qs); })
      .catch(e  => setError(e instanceof Error ? e.message : "Lỗi tạo đề thi"))
      .finally(()=> setLoading(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const goToQuestion = useCallback((newIdx: number) => {
    store.set(KEYS.examIndex, newIdx);
    setIdx(newIdx);
    setShowToast(false);
    setTimerKey(k => k + 1); // reset timer
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, []);

  const handleExpire = useCallback(() => {
    setShowToast(true);
  }, []);

  function handleToggleFav(q: Question) {
    const next = toggleFav(favs, q, `Đề thi ${level}`, level);
    setFavs(next); saveFavs(next);
  }

  if (loading) return (
    <div style={{ minHeight: "100vh", background: "#000" }}>
      <InnerHeader />
      <div style={{ maxWidth: 780, margin: "0 auto", padding: "94px 20px 56px", textAlign: "center" }}>
        <Spinner />
        <p style={{ fontSize: "0.93rem", color: "rgba(255,255,255,.55)", fontFamily: FONT }}>AI đang tạo đề thi cá nhân hoá...</p>
        <p style={{ fontSize: "0.8rem", color: "rgba(255,255,255,.3)", marginTop: 4, fontFamily: FONT }}>Cấp {level} · 15 câu hỏi</p>
      </div>
    </div>
  );

  if (error !== null) return (
    <div style={{ minHeight: "100vh", background: "#000" }}>
      <InnerHeader />
      <div style={{ maxWidth: 780, margin: "0 auto", padding: "94px 20px 56px" }}>
        <div style={{ ...glass({ padding: 28 }), textAlign: "center" }}>
          <p style={{ fontSize: "0.95rem", color: "rgba(255,100,100,.9)", marginBottom: 20, fontFamily: FONT }}>⚠️ {error}</p>
          <div style={{ display: "flex", gap: 10, justifyContent: "center" }}>
            <InnerBtn label="Thử lại" onClick={() => { store.remove(KEYS.examQuestions); router.replace("/exam"); }} variant="primary" />
            <InnerBtn label="Quay lại" onClick={() => router.push("/level")} variant="ghost" />
          </div>
        </div>
      </div>
    </div>
  );

  const q      = questions[idx];
  const pct    = questions.length > 0 ? ((idx + 1) / questions.length) * 100 : 0;
  const isLast = idx === questions.length - 1;

  return (
    <div style={{ minHeight: "100vh", background: "#000" }}>
      <InnerHeader />
      <div style={{ maxWidth: 780, margin: "0 auto", padding: "94px 20px 56px" }}>

        {/* ── Exam top bar ─────────────────────────────── */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14, gap: 12 }}>
          {/* Left: exit */}
          <InnerBtn label="✕ Thoát" onClick={() => router.push("/")} variant="sm" />

          {/* Center: title + question counter */}
          <div style={{ textAlign: "center", flex: 1 }}>
            <p style={{ fontWeight: 600, fontSize: "0.88rem", fontFamily: FONT }}>Đề thi thử · Cấp {level}</p>
            <p style={{ fontSize: "0.73rem", color: "rgba(255,255,255,.32)", fontFamily: FONT }}>Câu {idx + 1} / {questions.length}</p>
          </div>

          {/* Right: countdown timer */}
          {!loading && questions.length > 0 && (
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              {/* Pause/resume */}
              <button
                onClick={() => setPaused(p => !p)}
                title={paused ? "Tiếp tục đếm giờ" : "Tạm dừng"}
                style={{ width: 28, height: 28, borderRadius: "50%", background: "rgba(255,255,255,.07)", border: "1px solid rgba(255,255,255,.12)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: "rgba(255,255,255,.5)", fontSize: "0.7rem" }}
              >
                {paused ? "▶" : "⏸"}
              </button>
              {!paused && (
                <CountdownTimer
                  key={timerKey}
                  seconds={QUESTION_TIME}
                  onExpire={handleExpire}
                />
              )}
              {paused && (
                <div style={{ minWidth: 72, textAlign: "center" }}>
                  <div style={{ fontWeight: 700, fontSize: "1.1rem", color: "rgba(255,255,255,.3)", fontFamily: FONT }}>⏸</div>
                  <span style={{ fontSize: "0.62rem", color: "rgba(255,255,255,.25)", fontFamily: FONT }}>Tạm dừng</span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Exam progress bar */}
        <ProgBar pct={pct} />

        {/* Question card */}
        {q && (
          <QuestionCard
            key={idx}
            q={q}
            qi={idx}
            level={level}
            topicName={`Đề thi ${level}`}
            showGroup
            isFav={favs.some(f => f.questionText === q.question)}
            onToggleFav={() => handleToggleFav(q)}
          />
        )}

        {/* Navigation */}
        <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 8 }}>
          {idx > 0 && (
            <InnerBtn label="← Câu trước" onClick={() => goToQuestion(idx - 1)} variant="ghost" />
          )}
          {!isLast ? (
            <InnerBtn label="Câu tiếp →" onClick={() => goToQuestion(idx + 1)} variant="primary" />
          ) : (
            <InnerBtn label="🏁 Hoàn thành" onClick={() => router.push("/done")} variant="primary" />
          )}
        </div>
      </div>

      {/* Time expired toast */}
      {showToast && (
        <ExpiredToast
          isLast={isLast}
          onNext={() => { if (!isLast) goToQuestion(idx + 1); }}
          onDismiss={() => setShowToast(false)}
        />
      )}
    </div>
  );
}
