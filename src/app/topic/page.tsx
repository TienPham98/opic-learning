"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { InnerHeader } from "@/app/_components/Header";
import QuestionCard from "@/app/_components/QuestionCard";
import { InnerBtn, Spinner, FONT, glass } from "@/app/_components/ui";
import { store, KEYS } from "@/lib/store";
import { TOPICS } from "@/lib/data";
import { fetchTopicQuestions } from "@/lib/api";
import { loadFavs, saveFavs, toggleFav } from "@/lib/favs";
import type { Question, Fav } from "@/lib/types";

export default function TopicPage() {
  const router = useRouter();
  const [questions, setQuestions] = useState<Question[]>([]);
  const [favs,      setFavs]      = useState<Fav[]>([]);
  const [loading,   setLoading]   = useState(true);
  const [error,     setError]     = useState<string | null>(null);

  const topicId   = store.get<string>(KEYS.topicId, "");
  const level     = store.get<string>(KEYS.topicLevel, "IM2");
  // topicName covers both preset (e.g. "Xem phim") and custom (e.g. "Du học Nhật Bản")
  const topicName = store.get<string>(KEYS.topicName, "")
    || TOPICS.find(t => t.id === topicId)?.name
    || topicId;
  const tp = TOPICS.find(t => t.id === topicId);
  const displayTitle = tp ? `${tp.icon} ${topicName}` : `✏️ ${topicName}`;

  useEffect(() => {
    if (!topicId) { router.replace("/"); return; }
    setFavs(loadFavs());

    const cached = store.get<Question[]>(KEYS.topicQuestions, []);
    if (cached.length > 0) { setQuestions(cached); setLoading(false); return; }

    fetchTopicQuestions(topicName, level)
      .then(qs => { store.set(KEYS.topicQuestions, qs); setQuestions(qs); })
      .catch(e  => setError(e instanceof Error ? e.message : "Lỗi tải câu hỏi"))
      .finally(()=> setLoading(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function regenerate() {
    store.remove(KEYS.topicQuestions);
    setQuestions([]); setError(null); setLoading(true);
    fetchTopicQuestions(topicName, level)
      .then(qs => { store.set(KEYS.topicQuestions, qs); setQuestions(qs); })
      .catch(e  => setError(e instanceof Error ? e.message : "Lỗi tải câu hỏi"))
      .finally(()=> setLoading(false));
  }

  function handleToggleFav(q: Question) {
    const next = toggleFav(favs, q, topicName, level);
    setFavs(next); saveFavs(next);
  }

  return (
    <div style={{ minHeight: "100vh", background: "#000" }}>
      <InnerHeader />
      <div style={{ maxWidth: 780, margin: "0 auto", padding: "94px 20px 56px" }}>

        {/* Top bar */}
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 24 }}>
          <InnerBtn label="← Quay lại" onClick={() => router.push("/")} variant="sm" />
          <div style={{ flex: 1 }}>
            <span style={{ fontWeight: 700, fontSize: "0.95rem", fontFamily: FONT }}>
              {displayTitle} — Cấp {level}
            </span>
          </div>
          {!loading && !error && (
            <InnerBtn label="🔄 Tạo lại" onClick={regenerate} variant="sm" />
          )}
        </div>

        {/* Loading */}
        {loading && (
          <div style={{ textAlign: "center", padding: "80px 20px" }}>
            <Spinner />
            <p style={{ fontSize: "0.93rem", color: "rgba(255,255,255,.55)", fontFamily: FONT }}>
              AI đang tạo câu hỏi cho "{topicName}"...
            </p>
            <p style={{ fontSize: "0.8rem", color: "rgba(255,255,255,.3)", marginTop: 4, fontFamily: FONT }}>
              Bao gồm từ vựng và cấu trúc bài mẫu
            </p>
          </div>
        )}

        {/* Error */}
        {error !== null && (
          <div style={{ ...glass({ padding: 28 }), textAlign: "center" }}>
            <p style={{ fontSize: "0.95rem", color: "rgba(255,100,100,.9)", marginBottom: 20, fontFamily: FONT }}>⚠️ {error}</p>
            <div style={{ display: "flex", gap: 10, justifyContent: "center" }}>
              <InnerBtn label="Thử lại" onClick={regenerate} variant="primary" />
              <InnerBtn label="Quay lại" onClick={() => router.push("/")} variant="ghost" />
            </div>
          </div>
        )}

        {/* Questions */}
        {!loading && error === null && questions.map((q, i) => (
          <QuestionCard
            key={i}
            q={q}
            qi={i}
            level={level}
            topicName={topicName}
            isFav={favs.some(f => f.questionText === q.question)}
            onToggleFav={() => handleToggleFav(q)}
          />
        ))}
      </div>
    </div>
  );
}
