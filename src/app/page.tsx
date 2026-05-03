"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { TOPICS } from "@/lib/data";
import { store, KEYS } from "@/lib/store";
import { PillBtn, InnerBtn, LvGrid, ChevronDown, glass, FONT } from "./_components/ui";

export default function HomePage() {
  const router = useRouter();
  const [mode,        setMode]        = useState<"topic" | "exam" | null>(null);
  const [topic,       setTopic]       = useState<string | null>(null);
  const [customTopic, setCustomTopic] = useState("");
  const [topicLv,     setTopicLv]     = useState("IM2");

  // Either a preset chip is selected OR the custom input has text
  const canStart = topic !== null || customTopic.trim().length > 0;

  // Resolved display name to pass to the topic page
  const resolvedName = topic
    ? TOPICS.find(t => t.id === topic)?.name ?? topic
    : customTopic.trim();

  function selectPreset(id: string) {
    setTopic(t => t === id ? null : id); // toggle
    setCustomTopic(""); // clear custom when picking preset
  }

  function onCustomInput(val: string) {
    setCustomTopic(val);
    if (val.trim()) setTopic(null); // deselect preset when typing custom
  }

  function startTopic() {
    if (!canStart) return;
    // Use "custom" as id when topic is manually entered
    store.set(KEYS.topicId, topic ?? "custom");
    store.set(KEYS.topicName, resolvedName);
    store.set(KEYS.topicLevel, topicLv);
    store.remove(KEYS.topicQuestions);
    router.push("/topic");
  }

  function startExam() {
    store.remove(KEYS.surveyAnswers, KEYS.examQuestions, KEYS.examIndex);
    router.push("/survey");
  }

  return (
    <div style={{ position: "relative", minHeight: "100vh", background: "#000", overflow: "hidden" }}>
      <video autoPlay loop muted playsInline src="https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260217_030345_246c0224-10a4-422c-b324-070b7c0eceda.mp4"
        style={{ position: "fixed", inset: 0, width: "100%", height: "100%", objectFit: "cover", zIndex: 0 }} />
      <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 1, pointerEvents: "none" }} />

      {/* Navbar */}
      <nav style={{ position: "fixed", top: 0, left: 0, right: 0, zIndex: 50, padding: "20px 120px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 30 }}>
          <Link href="/" style={{ fontWeight: 800, fontSize: "1.15rem", color: "#fff", letterSpacing: "-0.3px", textDecoration: "none", width: 187, fontFamily: FONT }}>
            OPIc Learn
          </Link>
          {([["Bắt đầu", "/"], ["Tính năng", "/"], ["Hướng dẫn", "/guide"], ["Cấp độ", "/guide"]] as [string,string][]).map(([lbl, href]) => (
            <Link key={lbl} href={href} style={{ display: "flex", alignItems: "center", gap: 5, color: "#fff", fontSize: 14, fontWeight: 500, fontFamily: FONT, textDecoration: "none", whiteSpace: "nowrap" }}>
              {lbl}<ChevronDown />
            </Link>
          ))}
        </div>
        <PillBtn label="Bắt đầu học" onClick={() => setMode("topic")} />
      </nav>

      {/* Hero */}
      <div style={{ position: "relative", zIndex: 10, display: "flex", flexDirection: "column", alignItems: "center", paddingTop: 280, paddingBottom: 102, paddingLeft: 20, paddingRight: 20, minHeight: "100vh" }}>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 40, maxWidth: 780, width: "100%" }}>
          {/* Badge */}
          <div style={{ display: "inline-flex", alignItems: "center", gap: 8, background: "rgba(255,255,255,0.1)", border: "1px solid rgba(255,255,255,0.2)", borderRadius: 20, padding: "6px 16px" }}>
            <span style={{ width: 4, height: 4, borderRadius: "50%", background: "#fff", display: "inline-block", flexShrink: 0 }} />
            <span style={{ fontSize: 13, fontWeight: 500, fontFamily: FONT }}>
              <span style={{ color: "rgba(255,255,255,0.6)" }}>Tính năng mới ra mắt từ </span>
              <span style={{ color: "#fff" }}>May 1, 2026</span>
            </span>
          </div>

          {/* Heading with gradient text */}
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
          <p style={{ fontSize: 15, color: "rgba(255,255,255,0.7)", maxWidth: 680, textAlign: "center", lineHeight: 1.75, marginTop: -16, fontFamily: FONT }}>
            Nền tảng luyện thi OPIc thông minh với AI — khảo sát nền cá nhân hoá, 15 câu theo đúng cấu trúc, flashcard từ vựng, thu âm và chấm điểm tức thì.
          </p>

          {/* CTAs */}
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap", justifyContent: "center" }}>
            <PillBtn label="Bắt đầu học ngay" onClick={() => setMode("topic")} white />
            <PillBtn label="Thi thử OPIc" onClick={() => setMode("exam")} />
          </div>
        </div>
      </div>

      {/* Mode selection panel */}
      {mode !== null && (
        <div style={{ position: "fixed", bottom: 0, left: 0, right: 0, zIndex: 60, background: "rgba(0,0,0,0.88)", backdropFilter: "blur(32px)", WebkitBackdropFilter: "blur(32px)", borderTop: "1px solid rgba(255,255,255,0.1)", borderRadius: "20px 20px 0 0", padding: 32, maxHeight: "75vh", overflow: "auto", animation: "fadeUp .32s ease" }}>
          <div style={{ maxWidth: 800, margin: "0 auto" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24 }}>
              <span style={{ fontSize: "1rem", fontWeight: 600, fontFamily: FONT }}>
                {mode === "topic" ? "📝 Luyện theo chủ đề" : "🎯 Thi thử OPIc thật"}
              </span>
              <InnerBtn label="✕ Đóng" onClick={() => setMode(null)} variant="sm" />
            </div>

            {mode === "topic" && <>
              <p style={{ fontSize: "0.78rem", fontWeight: 600, color: "rgba(255,255,255,.38)", marginBottom: 10, textTransform: "uppercase", letterSpacing: "0.6px" }}>① Cấp độ mong muốn</p>
              <LvGrid level={topicLv} setLevel={setTopicLv} />

              <p style={{ fontSize: "0.78rem", fontWeight: 600, color: "rgba(255,255,255,.38)", marginBottom: 10, marginTop: 20, textTransform: "uppercase", letterSpacing: "0.6px" }}>② Chủ đề luyện tập</p>

              {/* Custom topic input */}
              <div style={{ position: "relative", marginBottom: 16 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 0, ...glass({ padding: 0, borderColor: customTopic.trim() ? "rgba(255,255,255,.42)" : "rgba(255,255,255,.12)", background: customTopic.trim() ? "rgba(255,255,255,.08)" : "rgba(255,255,255,.04)" }), overflow: "hidden" }}>
                  <span style={{ paddingLeft: 14, fontSize: "1rem", flexShrink: 0, userSelect: "none" }}>✏️</span>
                  <input
                    type="text"
                    value={customTopic}
                    onChange={e => onCustomInput(e.target.value)}
                    onKeyDown={e => { if (e.key === "Enter" && canStart) startTopic(); }}
                    placeholder="Nhập chủ đề bất kỳ... (vd: Du học Nhật Bản, Phỏng vấn xin việc, Môi trường biển)"
                    maxLength={80}
                    style={{
                      flex: 1, background: "transparent", border: "none", outline: "none",
                      padding: "12px 14px", fontSize: "0.88rem", fontFamily: FONT,
                      color: "#fff", caretColor: "#fff",
                    }}
                  />
                  {customTopic && (
                    <button
                      onClick={() => setCustomTopic("")}
                      style={{ padding: "0 14px", background: "none", border: "none", cursor: "pointer", color: "rgba(255,255,255,.4)", fontSize: "1rem", flexShrink: 0 }}
                    >✕</button>
                  )}
                </div>
                {/* placeholder note */}
                {!customTopic && !topic && (
                  <p style={{ fontSize: "0.72rem", color: "rgba(255,255,255,.28)", marginTop: 6, paddingLeft: 2, fontFamily: FONT }}>
                    Hoặc chọn từ danh sách có sẵn bên dưới
                  </p>
                )}
              </div>

              {/* Preset topic grid */}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(118px,1fr))", gap: 8, marginBottom: 22 }}>
                {TOPICS.map(t => (
                  <div key={t.id} onClick={() => selectPreset(t.id)}
                    style={{ ...glass({ padding: "12px 8px", background: topic===t.id?"rgba(255,255,255,.12)":"rgba(255,255,255,.04)", borderColor: topic===t.id?"rgba(255,255,255,.42)":"rgba(255,255,255,.08)" }), cursor: "pointer", textAlign: "center", transition: "all .18s", fontSize: "0.78rem", fontWeight: topic===t.id?600:400, color: topic===t.id?"#fff":"rgba(255,255,255,.55)", fontFamily: FONT, opacity: customTopic.trim() ? 0.45 : 1 }}>
                    <span style={{ fontSize: 18, display: "block", marginBottom: 5 }}>{t.icon}</span>{t.name}
                  </div>
                ))}
              </div>

              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                {/* Selected summary */}
                <span style={{ fontSize: "0.78rem", color: "rgba(255,255,255,.4)", fontFamily: FONT }}>
                  {canStart ? `Chủ đề: "${resolvedName}"` : "Chưa chọn chủ đề"}
                </span>
                <InnerBtn label="Bắt đầu luyện tập →" onClick={startTopic} variant="primary" disabled={!canStart} />
              </div>
            </>}

            {mode === "exam" && <>
              <div style={{ display: "flex", gap: 16, marginBottom: 22 }}>
                <span style={{ fontSize: 24, flexShrink: 0 }}>📋</span>
                <div>
                  <p style={{ fontWeight: 600, marginBottom: 10, fontFamily: FONT }}>Quy trình thi thử OPIc</p>
                  <ol style={{ paddingLeft: 18, color: "rgba(255,255,255,.5)", fontSize: "0.875rem", lineHeight: 2.2, fontFamily: FONT }}>
                    <li><strong style={{ color: "rgba(255,255,255,.82)" }}>Khảo sát nền</strong> — 7 câu giống Background Survey thật</li>
                    <li><strong style={{ color: "rgba(255,255,255,.82)" }}>Chọn cấp độ</strong> — IM1 / IM2 / IM3 / IH / AL</li>
                    <li><strong style={{ color: "rgba(255,255,255,.82)" }}>15 câu cá nhân hoá</strong> + bài mẫu, flashcard, thu âm, chấm điểm</li>
                  </ol>
                </div>
              </div>
              <div style={{ display: "flex", justifyContent: "flex-end" }}>
                <InnerBtn label="Bắt đầu khảo sát →" onClick={startExam} variant="primary" />
              </div>
            </>}
          </div>
        </div>
      )}
    </div>
  );
}
