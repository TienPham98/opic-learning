"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { InnerHeader } from "@/app/_components/Header";
import { InnerBtn, ProgBar, IcoCheck, glass, FONT } from "@/app/_components/ui";
import { store, KEYS } from "@/lib/store";
import { SURVEY_QUESTIONS } from "@/lib/data";
import type { SurveyAnswers } from "@/lib/types";

export default function SurveyPage() {
  const router = useRouter();
  const [idx,     setIdx]     = useState(0);
  const [answers, setAnswers] = useState<SurveyAnswers>({});

  const q       = SURVEY_QUESTIONS[idx];
  const isMulti = q.multi;
  const ans     = answers[q.id];
  const selArr  = isMulti ? ((ans as number[]) ?? []) : [];
  const selSingle = isMulti ? -1 : (ans as number ?? -1);

  const canNext = isMulti
    ? Array.isArray(ans) && ans.length > 0
    : ans !== undefined && ans !== null;

  function selOpt(i: number) {
    setAnswers(prev => {
      if (isMulti) {
        const cur = (prev[q.id] as number[] | undefined) ?? [];
        return { ...prev, [q.id]: cur.includes(i) ? cur.filter(x => x !== i) : [...cur, i] };
      }
      return { ...prev, [q.id]: i };
    });
  }

  function next() {
    if (!canNext) return;
    if (idx < SURVEY_QUESTIONS.length - 1) { setIdx(i => i + 1); return; }
    // Done — save to session and go to level selection
    store.set(KEYS.surveyAnswers, answers);
    router.push("/level");
  }

  return (
    <div style={{ minHeight: "100vh", background: "#000" }}>
      <InnerHeader />
      <div style={{ maxWidth: 620, margin: "0 auto", padding: "94px 20px 56px" }}>
        {/* Top bar */}
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 24 }}>
          <InnerBtn label="← Quay lại" onClick={() => router.push("/")} variant="sm" />
          <span style={{ fontWeight: 700, fontSize: "0.95rem", fontFamily: FONT }}>Khảo sát nền OPIc</span>
        </div>

        {/* Step indicator */}
        <div style={{ display: "flex", alignItems: "center", marginBottom: 24 }}>
          {SURVEY_QUESTIONS.map((_, i) => (
            <span key={i} style={{ display: "flex", alignItems: "center", flex: i < SURVEY_QUESTIONS.length - 1 ? 1 : "none" }}>
              <span style={{
                width: 24, height: 24, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: "0.68rem", fontWeight: 700, flexShrink: 0,
                background: i < idx ? "rgba(255,255,255,.14)" : i === idx ? "#fff" : "rgba(255,255,255,.05)",
                color: i < idx ? "rgba(255,255,255,.65)" : i === idx ? "#000" : "rgba(255,255,255,.22)",
                border: `1px solid ${i === idx ? "rgba(255,255,255,.5)" : "rgba(255,255,255,.09)"}`,
              }}>{i < idx ? "✓" : i + 1}</span>
              {i < SURVEY_QUESTIONS.length - 1 && <span style={{ flex: 1, height: 1, background: "rgba(255,255,255,.07)", minWidth: 6 }} />}
            </span>
          ))}
        </div>

        {/* Card */}
        <div style={{ ...glass({ padding: 28 }) }}>
          <ProgBar pct={(idx / SURVEY_QUESTIONS.length) * 100} />
          <div style={{ fontSize: "0.68rem", fontWeight: 600, color: "rgba(255,255,255,.28)", textTransform: "uppercase", letterSpacing: "0.7px", marginBottom: 8, fontFamily: FONT }}>
            Câu {idx + 1} / {SURVEY_QUESTIONS.length}
          </div>
          <p style={{ fontWeight: 600, fontSize: "1.05rem", lineHeight: 1.62, marginBottom: 18, fontFamily: FONT }}>{q.q}</p>
          {isMulti && <p style={{ fontSize: "0.75rem", color: "rgba(255,255,255,.3)", marginBottom: 12, fontFamily: FONT }}>Có thể chọn nhiều đáp án</p>}

          <div style={{ display: "grid", gap: 8 }}>
            {q.opts.map((opt, i) => {
              const sel = isMulti ? selArr.includes(i) : selSingle === i;
              return (
                <div
                  key={i}
                  onClick={() => selOpt(i)}
                  style={{ ...glass({ padding: "11px 15px", background: sel?"rgba(255,255,255,.1)":"rgba(255,255,255,.04)", borderColor: sel?"rgba(255,255,255,.34)":"rgba(255,255,255,.08)" }), cursor: "pointer", display: "flex", alignItems: "center", gap: 10, fontSize: "0.875rem", fontWeight: sel?500:400, color: sel?"#fff":"rgba(255,255,255,.62)", transition: "all .18s", fontFamily: FONT }}
                >
                  {isMulti ? (
                    <span style={{ width: 17, height: 17, borderRadius: 4, border: `1.5px solid ${sel?"rgba(255,255,255,.7)":"rgba(255,255,255,.2)"}`, background: sel?"rgba(255,255,255,.88)":"transparent", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                      {sel && <IcoCheck />}
                    </span>
                  ) : (
                    <span style={{ width: 17, height: 17, borderRadius: "50%", border: `1.5px solid ${sel?"rgba(255,255,255,.7)":"rgba(255,255,255,.2)"}`, background: sel?"rgba(255,255,255,.88)":"transparent", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                      {sel && <span style={{ width: 7, height: 7, borderRadius: "50%", background: "#000", display: "block" }} />}
                    </span>
                  )}
                  {opt}
                </div>
              );
            })}
          </div>

          <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 22 }}>
            {idx > 0 && <InnerBtn label="← Trước" onClick={() => setIdx(i => i - 1)} variant="ghost" />}
            <InnerBtn
              label={idx < SURVEY_QUESTIONS.length - 1 ? "Tiếp theo →" : "Hoàn thành →"}
              onClick={next}
              variant="primary"
              disabled={!canNext}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
