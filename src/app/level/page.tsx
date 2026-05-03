"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { InnerHeader } from "@/app/_components/Header";
import { InnerBtn, LvGrid, glass, FONT } from "@/app/_components/ui";
import { store, KEYS } from "@/lib/store";

export default function LevelPage() {
  const router = useRouter();
  const [level, setLevel] = useState("IM2");

  function startExam() {
    store.set(KEYS.examLevel, level);
    store.remove(KEYS.examQuestions, KEYS.examIndex);
    router.push("/exam");
  }

  return (
    <div style={{ minHeight: "100vh", background: "#000" }}>
      <InnerHeader />
      <div style={{ maxWidth: 580, margin: "0 auto", padding: "94px 20px 56px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 24 }}>
          <InnerBtn label="← Quay lại" onClick={() => router.push("/survey")} variant="sm" />
          <span style={{ fontWeight: 700, fontSize: "0.95rem", fontFamily: FONT }}>Chọn cấp độ mục tiêu</span>
        </div>

        <div style={{ ...glass({ padding: 28 }) }}>
          <p style={{ color: "rgba(255,255,255,.52)", fontSize: "0.875rem", marginBottom: 18, lineHeight: 1.65, fontFamily: FONT }}>
            AI sẽ tạo 15 câu hỏi cá nhân hoá theo hồ sơ và cấp độ bạn chọn.
          </p>
          <LvGrid level={level} setLevel={setLevel} />
          <div style={{ ...glass({ padding: "13px 15px", background: "rgba(255,255,255,.03)" }), fontSize: "0.79rem", color: "rgba(255,255,255,.38)", lineHeight: 1.9, marginBottom: 18, fontFamily: FONT }}>
            NL → NM → NH → <strong style={{ color: "rgba(255,255,255,.72)" }}>IM1 → IM2 → IM3</strong> → IH → AL
          </div>
          <div style={{ display: "flex", justifyContent: "flex-end" }}>
            <InnerBtn label="🎯 Tạo đề thi (15 câu) →" onClick={startExam} variant="primary" />
          </div>
        </div>
      </div>
    </div>
  );
}
