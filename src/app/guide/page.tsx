"use client";
import { useRouter } from "next/navigation";
import { InnerHeader } from "@/app/_components/Header";
import { InnerBtn, glass, FONT } from "@/app/_components/ui";
import { TYPE_GROUPS } from "@/lib/data";

const LEVEL_INFO = [
  { lv: "Novice Low / Mid / High", d: "Trả lời bằng từ đơn, cụm từ ngắn. Rất hạn chế về từ vựng và ngữ pháp." },
  { lv: "IM1 / IM2 / IM3",         d: "Câu đơn giản, mô tả được chủ đề quen thuộc. Phổ biến nhất cho người đi làm." },
  { lv: "Intermediate High (IH)",  d: "Câu ghép, mô tả và so sánh tốt. Xử lý được tình huống bất ngờ." },
  { lv: "Advanced Low (AL)",        d: "Đoạn văn dài, lập luận logic, thuyết phục. Gần như lưu loát." },
];

export default function GuidePage() {
  const router = useRouter();

  return (
    <div style={{ minHeight: "100vh", background: "#000" }}>
      <InnerHeader />
      <div style={{ maxWidth: 660, margin: "0 auto", padding: "94px 20px 56px" }}>
        {/* Top bar */}
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 24 }}>
          <InnerBtn label="← Quay lại" onClick={() => router.back()} variant="sm" />
          <span style={{ fontWeight: 700, fontSize: "0.95rem", fontFamily: FONT }}>Cấp độ & Hướng dẫn OPIc</span>
        </div>

        {/* Level guide */}
        <div style={{ ...glass({ padding: 24, marginBottom: 12 }) }}>
          <p style={{ fontWeight: 600, fontSize: "0.9rem", marginBottom: 16, color: "rgba(255,255,255,.78)", fontFamily: FONT }}>
            Thang cấp độ OPIc
          </p>
          {LEVEL_INFO.map(x => (
            <div key={x.lv} style={{ display: "flex", alignItems: "flex-start", gap: 12, padding: "12px 0", borderBottom: "1px solid rgba(255,255,255,.05)" }}>
              <span style={{ display: "inline-block", padding: "3px 10px", borderRadius: 20, fontSize: "0.68rem", fontWeight: 600, textTransform: "uppercase", color: "rgba(255,255,255,.82)", background: "rgba(255,255,255,.08)", border: "1px solid rgba(255,255,255,.12)", flexShrink: 0, whiteSpace: "nowrap" }}>
                {x.lv}
              </span>
              <p style={{ fontSize: "0.855rem", color: "rgba(255,255,255,.5)", paddingTop: 4, lineHeight: 1.65, fontFamily: FONT }}>{x.d}</p>
            </div>
          ))}
        </div>

        {/* Exam structure */}
        <div style={{ ...glass({ padding: 24, marginBottom: 24 }) }}>
          <p style={{ fontWeight: 600, fontSize: "0.9rem", marginBottom: 14, color: "rgba(255,255,255,.78)", fontFamily: FONT }}>
            Cấu trúc 15 câu OPIc
          </p>
          {TYPE_GROUPS.map(g => (
            <div key={g.tag} style={{ display: "flex", gap: 14, padding: "11px 0", borderBottom: "1px solid rgba(255,255,255,.05)", alignItems: "center" }}>
              <span style={{ fontWeight: 700, fontSize: "0.75rem", color: "rgba(255,255,255,.65)", minWidth: 52, fontFamily: FONT }}>{g.tag}</span>
              <span style={{ fontWeight: 600, fontSize: "0.85rem", fontFamily: FONT }}>{g.label}</span>
              <span style={{ color: "rgba(255,255,255,.3)", fontSize: "0.8rem", fontFamily: FONT }}>— {g.vi}</span>
            </div>
          ))}
        </div>

        {/* Scoring criteria */}
        <div style={{ ...glass({ padding: 24, marginBottom: 24 }) }}>
          <p style={{ fontWeight: 600, fontSize: "0.9rem", marginBottom: 14, color: "rgba(255,255,255,.78)", fontFamily: FONT }}>
            5 Tiêu chí chấm điểm OPIc
          </p>
          {[
            { n: "Hoàn thành nhiệm vụ",   d: "Trả lời đúng và đầy đủ yêu cầu của câu hỏi." },
            { n: "Cấu trúc câu",          d: "Sử dụng đa dạng cấu trúc câu, không chỉ câu ngắn đơn giản." },
            { n: "Nội dung & Chủ đề",     d: "Bám sát chủ đề với nội dung cụ thể, phù hợp." },
            { n: "Mạch lạc & Logic",       d: "Có mở bài, thân bài, kết luận rõ ràng, dễ hiểu." },
            { n: "Kiểm soát ngôn ngữ",    d: "Ngữ pháp chính xác, từ vựng phong phú, phát âm tự nhiên." },
          ].map((c, i) => (
            <div key={i} style={{ display: "flex", gap: 12, padding: "10px 0", borderBottom: "1px solid rgba(255,255,255,.05)", alignItems: "flex-start" }}>
              <span style={{ width: 22, height: 22, borderRadius: "50%", background: "rgba(255,255,255,.1)", border: "1px solid rgba(255,255,255,.15)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "0.68rem", fontWeight: 700, flexShrink: 0 }}>{i + 1}</span>
              <div>
                <p style={{ fontWeight: 600, fontSize: "0.85rem", marginBottom: 3, fontFamily: FONT }}>{c.n}</p>
                <p style={{ fontSize: "0.8rem", color: "rgba(255,255,255,.45)", lineHeight: 1.55, fontFamily: FONT }}>{c.d}</p>
              </div>
            </div>
          ))}
        </div>

        <div style={{ display: "flex", justifyContent: "center" }}>
          <InnerBtn label="Bắt đầu thi thử →" onClick={() => router.push("/")} variant="primary" />
        </div>
      </div>
    </div>
  );
}
