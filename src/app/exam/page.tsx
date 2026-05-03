"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { InnerHeader } from "@/app/_components/Header";
import QuestionCard from "@/app/_components/QuestionCard";
import { InnerBtn, Spinner, ProgBar, glass, FONT } from "@/app/_components/ui";
import { store, KEYS } from "@/lib/store";
import { fetchExamQuestions } from "@/lib/api";
import { loadFavs, saveFavs, toggleFav } from "@/lib/favs";
import type { Question, Fav, SurveyAnswers } from "@/lib/types";

export default function ExamPage() {
  const router = useRouter();
  const [questions, setQuestions] = useState<Question[]>([]);
  const [idx,       setIdx]       = useState(0);
  const [favs,      setFavs]      = useState<Fav[]>([]);
  const [loading,   setLoading]   = useState(true);
  const [error,     setError]     = useState<string | null>(null);

  const level = store.get<string>(KEYS.examLevel, "IM2");

  useEffect(() => {
    setFavs(loadFavs());

    const cached = store.get<Question[]>(KEYS.examQuestions, []);
    const savedIdx = store.get<number>(KEYS.examIndex, 0);
    if (cached.length > 0) {
      setQuestions(cached);
      setIdx(savedIdx);
      setLoading(false);
      return;
    }

    const surveyAnswers = store.get<SurveyAnswers>(KEYS.surveyAnswers, {});
    fetchExamQuestions(surveyAnswers, level)
      .then(qs => {
        store.set(KEYS.examQuestions, qs);
        store.set(KEYS.examIndex, 0);
        setQuestions(qs);
      })
      .catch(e => setError(e instanceof Error ? e.message : "Lỗi tạo đề thi"))
      .finally(() => setLoading(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function goToQuestion(newIdx: number) {
    store.set(KEYS.examIndex, newIdx);
    setIdx(newIdx);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function handleToggleFav(q: Question) {
    const next = toggleFav(favs, q, `Đề thi ${level}`, level);
    setFavs(next);
    saveFavs(next);
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

  const q = questions[idx];
  const pct = questions.length > 0 ? ((idx + 1) / questions.length) * 100 : 0;

  return (
    <div style={{ minHeight: "100vh", background: "#000" }}>
      <InnerHeader />
      <div style={{ maxWidth: 780, margin: "0 auto", padding: "94px 20px 56px" }}>
        {/* Exam nav bar */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
          <InnerBtn label="✕ Thoát" onClick={() => router.push("/")} variant="sm" />
          <div style={{ textAlign: "center" }}>
            <p style={{ fontWeight: 600, fontSize: "0.88rem", fontFamily: FONT }}>Đề thi thử · Cấp {level}</p>
            <p style={{ fontSize: "0.73rem", color: "rgba(255,255,255,.32)", fontFamily: FONT }}>Câu {idx + 1} / {questions.length}</p>
          </div>
          <span style={{ fontSize: "0.8rem", fontWeight: 600, color: "rgba(255,255,255,.55)", fontFamily: FONT }}>
            {Math.round(pct)}%
          </span>
        </div>

        <ProgBar pct={pct} />

        {q && (
          <QuestionCard
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
          {idx < questions.length - 1 ? (
            <InnerBtn label="Câu tiếp →" onClick={() => goToQuestion(idx + 1)} variant="primary" />
          ) : (
            <InnerBtn label="🏁 Hoàn thành" onClick={() => router.push("/done")} variant="primary" />
          )}
        </div>
      </div>
    </div>
  );
}
