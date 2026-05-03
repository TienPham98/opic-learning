"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { InnerHeader } from "@/app/_components/Header";
import { InnerBtn, glass, FONT } from "@/app/_components/ui";
import { loadFavs, saveFavs } from "@/lib/favs";
import type { Fav } from "@/lib/types";

export default function FavsPage() {
  const router = useRouter();
  const [favs, setFavs] = useState<Fav[]>([]);

  useEffect(() => { setFavs(loadFavs()); }, []);

  function remove(id: string) {
    const next = favs.filter(f => f.id !== id);
    setFavs(next);
    saveFavs(next);
  }

  return (
    <div style={{ minHeight: "100vh", background: "#000" }}>
      <InnerHeader />
      <div style={{ maxWidth: 780, margin: "0 auto", padding: "94px 20px 56px" }}>
        {/* Top bar */}
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 24 }}>
          <InnerBtn label="← Quay lại" onClick={() => router.back()} variant="sm" />
          <span style={{ fontWeight: 700, fontSize: "0.95rem", fontFamily: FONT }}>
            Bài đã lưu ({favs.length})
          </span>
        </div>

        {favs.length === 0 ? (
          <div style={{ ...glass({ padding: "48px 24px" }), textAlign: "center" }}>
            <div style={{ fontSize: 38, marginBottom: 14 }}>💔</div>
            <p style={{ fontWeight: 600, marginBottom: 8, fontFamily: FONT }}>Chưa có bài nào được lưu</p>
            <p style={{ color: "rgba(255,255,255,.4)", fontSize: "0.875rem", marginBottom: 22, lineHeight: 1.65, fontFamily: FONT }}>
              Mở bài mẫu trong câu hỏi và nhấn "Lưu" để thêm vào đây.
            </p>
            <InnerBtn label="Bắt đầu luyện tập" onClick={() => router.push("/")} variant="primary" />
          </div>
        ) : (
          favs.map(f => (
            <div key={f.id} style={{ ...glass({ padding: 22, marginBottom: 12 }) }}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 12, marginBottom: 10 }}>
                <div style={{ flex: 1 }}>
                  <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 8, flexWrap: "wrap" }}>
                    <span style={{ display: "inline-block", padding: "2px 9px", borderRadius: 20, fontSize: "0.68rem", fontWeight: 600, textTransform: "uppercase", color: "rgba(255,255,255,.82)", background: "rgba(255,255,255,.09)", border: "1px solid rgba(255,255,255,.12)" }}>
                      {f.type.charAt(0).toUpperCase() + f.type.slice(1)}
                    </span>
                    <span style={{ fontSize: "0.72rem", color: "rgba(255,255,255,.3)", fontFamily: FONT }}>
                      {f.topicName} · Cấp {f.level} · {f.savedAt}
                    </span>
                  </div>
                  <p style={{ fontWeight: 600, fontSize: "0.95rem", lineHeight: 1.6, marginBottom: 12, fontFamily: FONT }}>
                    {f.questionText}
                  </p>
                </div>
                <InnerBtn label="✕" onClick={() => remove(f.id)} variant="sm" />
              </div>

              <div style={{ ...glass({ padding: 16, borderLeft: "2px solid rgba(255,255,255,.2)", background: "rgba(255,255,255,.04)" }) }}>
                <div style={{ fontSize: "0.68rem", fontWeight: 700, color: "rgba(255,255,255,.38)", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 8 }}>
                  Bài mẫu
                </div>
                <p style={{ fontSize: "0.875rem", color: "rgba(255,255,255,.72)", lineHeight: 1.8, fontFamily: FONT }}>{f.sample}</p>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
