"use client";
import { useRouter } from "next/navigation";
import { InnerHeader } from "@/app/_components/Header";
import { InnerBtn, FONT } from "@/app/_components/ui";
import { store, KEYS } from "@/lib/store";

export default function DonePage() {
  const router = useRouter();
  const level = store.get<string>(KEYS.examLevel, "IM2");
  const total = store.get<unknown[]>(KEYS.examQuestions, []).length;

  return (
    <div style={{ minHeight: "100vh", background: "#000" }}>
      <InnerHeader />
      <div style={{ maxWidth: 780, margin: "0 auto", padding: "94px 20px 56px", textAlign: "center" }}>
        <div style={{ fontSize: 56, marginBottom: 20 }}>🏁</div>
        <h2 style={{ fontWeight: 700, fontSize: "1.55rem", marginBottom: 8, letterSpacing: "-0.2px", fontFamily: FONT }}>
          Hoàn thành bài thi thử!
        </h2>
        <p style={{ color: "rgba(255,255,255,.5)", marginBottom: 6, lineHeight: 1.65, fontFamily: FONT }}>
          Cấp độ: <strong style={{ color: "rgba(255,255,255,.85)" }}>{level}</strong> · {total} câu
        </p>
        <p style={{ color: "rgba(255,255,255,.38)", marginBottom: 36, lineHeight: 1.65, fontFamily: FONT }}>
          Xem lại bài mẫu, thu âm và tự chấm điểm từng câu.
        </p>
        <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
          <InnerBtn label="Xem lại bài thi" onClick={() => { store.set(KEYS.examIndex, 0); router.push("/exam"); }} variant="ghost" />
          <InnerBtn label="Xem bài đã lưu" onClick={() => router.push("/favs")} variant="ghost" />
          <InnerBtn label="Thi thử lại" onClick={() => router.push("/")} variant="primary" />
        </div>
      </div>
    </div>
  );
}
