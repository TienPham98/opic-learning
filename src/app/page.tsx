"use client";
import { useState, useCallback, useEffect } from "react";

/* ═══════════════════════════════════ DATA ═══════════════════════════════════ */
const TOPICS = [
  { id: "movies",      icon: "🎬", name: "Xem phim" },
  { id: "music",       icon: "🎵", name: "Âm nhạc" },
  { id: "sports",      icon: "⚽", name: "Thể thao" },
  { id: "travel",      icon: "✈️", name: "Du lịch" },
  { id: "cooking",     icon: "🍳", name: "Nấu ăn" },
  { id: "reading",     icon: "📚", name: "Đọc sách" },
  { id: "technology",  icon: "💻", name: "Công nghệ" },
  { id: "environment", icon: "🌿", name: "Môi trường" },
  { id: "health",      icon: "🏃", name: "Sức khỏe" },
  { id: "shopping",    icon: "🛍️", name: "Mua sắm" },
  { id: "family",      icon: "👨‍👩‍👧", name: "Gia đình" },
  { id: "work",        icon: "💼", name: "Công việc" },
];

const SURVEY_QS = [
  { id: "job", q: "Nghề nghiệp của bạn là gì?", multi: false,
    opts: ["Nhân viên văn phòng / Công ty","Nội trợ","Giáo viên","Học sinh / Sinh viên","Chưa có việc làm"] },
  { id: "study", q: "Nếu là sinh viên, mục đích học tập của bạn?", multi: false,
    opts: ["Lấy bằng cấp","Học nâng cao","Học ngôn ngữ","Không áp dụng"] },
  { id: "dwelling", q: "Bạn đang sống ở đâu?", multi: false,
    opts: ["Nhà/căn hộ (một mình)","Nhà/căn hộ (với bạn bè)","Nhà/căn hộ (với gia đình)","Ký túc xá","Nhà tập thể"] },
  { id: "freetime", q: "Bạn làm gì trong thời gian rảnh?", multi: true,
    opts: ["Xem phim (rạp chiếu)","Đi xem hòa nhạc","Đi công viên","Cắm trại","Đi biển","Xem thể thao","Chơi game","Giúp việc nhà"] },
  { id: "hobbies", q: "Sở thích của bạn là gì?", multi: true,
    opts: ["Nghe nhạc","Chơi nhạc cụ","Hát","Nhảy múa","Viết lách","Vẽ tranh","Nấu ăn","Làm vườn","Nuôi thú cưng"] },
  { id: "sports_q", q: "Bạn chơi thể thao hoặc tập thể dục gì?", multi: true,
    opts: ["Bóng đá","Bơi lội","Đi xe đạp","Chạy bộ","Đi bộ","Yoga","Cầu lông","Bóng bàn","Tập gym","Không tập"] },
  { id: "travel_q", q: "Bạn đã từng đi du lịch loại nào?", multi: true,
    opts: ["Công tác trong nước","Công tác nước ngoài","Nghỉ tại nhà","Du lịch trong nước","Du lịch nước ngoài"] },
];

const LEVELS = [
  { id: "IM1", label: "IM1", sub: "Inter. Mid 1" },
  { id: "IM2", label: "IM2", sub: "Inter. Mid 2" },
  { id: "IM3", label: "IM3", sub: "Inter. Mid 3" },
  { id: "IH",  label: "IH",  sub: "Inter. High" },
  { id: "AL",  label: "AL",  sub: "Adv. Low" },
];

const TYPE_GROUPS = [
  { range: [0, 2],   tag: "Q1–3",   label: "Describe",        vi: "Mô tả" },
  { range: [3, 5],   tag: "Q4–6",   label: "Compare",         vi: "So sánh" },
  { range: [6, 8],   tag: "Q7–9",   label: "Past Experience",  vi: "Kinh nghiệm" },
  { range: [9, 11],  tag: "Q10–12", label: "Role-play",        vi: "Tình huống" },
  { range: [12, 14], tag: "Q13–15", label: "Mixed",            vi: "Hỗn hợp" },
];

const TYPE_META: Record<string, { label: string; color: string; bg: string }> = {
  describe: { label: "Describe",   color: "#185FA5", bg: "#E6F1FB" },
  compare:  { label: "Compare",    color: "#534AB7", bg: "#EEEDFE" },
  past:     { label: "Past exp.",  color: "#0F6E56", bg: "#E1F5EE" },
  roleplay: { label: "Role-play",  color: "#854F0B", bg: "#FAEEDA" },
  mixed:    { label: "Mixed",      color: "#993C1D", bg: "#FAECE7" },
};

/* ═══════════════════════════════════ TYPES ══════════════════════════════════ */
interface Question { type: string; question: string; tip: string; sample: string; }
type Page = "home" | "topic" | "survey" | "level" | "exam" | "done" | "guide";

/* ═══════════════════════════════════ API ════════════════════════════════════ */
async function callAI(prompt: string, maxTokens = 2000): Promise<any> {
  const res = await fetch("/api/generate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ prompt, maxTokens }),
  });
  if (!res.ok) throw new Error("API error");
  return res.json();
}

/* ═══════════════════════════════════ TTS ════════════════════════════════════ */
function useTTS() {
  const [idx, setIdx] = useState<number | null>(null);
  const stop = useCallback(() => {
    if (typeof window !== "undefined") window.speechSynthesis?.cancel();
    setIdx(null);
  }, []);
  const toggle = useCallback((i: number, text: string) => {
    if (idx === i) { stop(); return; }
    stop();
    if (!window.speechSynthesis) return;
    setIdx(i);
    const u = new SpeechSynthesisUtterance(text);
    u.lang = "en-US"; u.rate = 0.9; u.pitch = 1;
    u.onend = () => setIdx(null);
    u.onerror = () => setIdx(null);
    window.speechSynthesis.speak(u);
  }, [idx, stop]);
  return { speakIdx: idx, toggle, stop };
}

/* ═══════════════════════════════════ STYLES (inline) ════════════════════════ */
const S = {
  // Layout
  wrap: { minHeight: "100vh", display: "flex", flexDirection: "column" as const },
  // Header
  header: {
    background: "#fff", borderBottom: "1px solid #E2E8F0",
    padding: "0 24px", display: "flex", alignItems: "center",
    justifyContent: "space-between", height: 60,
    position: "sticky" as const, top: 0, zIndex: 50,
  },
  logo: { display: "flex", alignItems: "center", gap: 10, cursor: "pointer" as const },
  logoMark: {
    width: 36, height: 36, background: "#E6F1FB", borderRadius: 10,
    display: "flex", alignItems: "center", justifyContent: "center",
    fontFamily: "'Sora', sans-serif", fontWeight: 800, fontSize: 13, color: "#185FA5",
  },
  logoText: { fontFamily: "'Sora', sans-serif", fontWeight: 800, fontSize: "1.15rem", color: "#185FA5" },
  navRow: { display: "flex", gap: 4, background: "#F1F5F9", borderRadius: 8, padding: 3 },
  navBtn: (active?: boolean): React.CSSProperties => ({
    padding: "5px 16px", borderRadius: 6, border: "none", cursor: "pointer",
    fontSize: "0.82rem", fontWeight: 500, fontFamily: "'DM Sans', sans-serif",
    background: active ? "#fff" : "transparent", color: active ? "#0F172A" : "#64748B",
    boxShadow: active ? "0 1px 3px rgba(0,0,0,0.08)" : "none", transition: "all .18s",
  }),
  main: { maxWidth: 860, margin: "0 auto", padding: "32px 20px", width: "100%", flex: 1 },
  // Titles
  h1: { fontFamily: "'Sora', sans-serif", fontWeight: 700, fontSize: "1.5rem", color: "#0F172A", marginBottom: 6 },
  sub: { fontSize: "0.9rem", color: "#64748B", marginBottom: 28 },
  secLabel: { fontFamily: "'Sora', sans-serif", fontWeight: 600, fontSize: "0.9rem", marginBottom: 14, color: "#0F172A" },
  // Cards
  card: {
    background: "#fff", border: "1px solid #E2E8F0", borderRadius: 16,
    padding: 24, marginBottom: 16,
  },
  // Mode grid
  modeGrid: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 28 },
  modeCard: (sel: boolean): React.CSSProperties => ({
    background: sel ? "#E6F1FB" : "#fff",
    border: sel ? "2px solid #378ADD" : "1px solid #E2E8F0",
    borderRadius: 20, padding: "24px 22px", cursor: "pointer",
    transition: "all .2s", position: "relative", overflow: "hidden",
  }),
  modeIcon: (bg: string): React.CSSProperties => ({
    width: 48, height: 48, borderRadius: 12, background: bg,
    display: "flex", alignItems: "center", justifyContent: "center",
    fontSize: 22, marginBottom: 14,
  }),
  modeName: { fontFamily: "'Sora', sans-serif", fontWeight: 700, fontSize: "1rem", marginBottom: 6 },
  modeDesc: { fontSize: "0.83rem", color: "#64748B", lineHeight: 1.55 },
  newTag: {
    position: "absolute" as const, top: 14, right: 14,
    background: "#FAEEDA", color: "#854F0B", fontSize: "0.68rem",
    fontWeight: 700, padding: "2px 9px", borderRadius: 20,
    letterSpacing: "0.4px", textTransform: "uppercase" as const,
  },
  // Topic grid
  topicGrid: { display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(128px, 1fr))", gap: 10, marginBottom: 24 },
  topicChip: (sel: boolean): React.CSSProperties => ({
    background: sel ? "#E6F1FB" : "#fff",
    border: sel ? "2px solid #378ADD" : "1px solid #E2E8F0",
    borderRadius: 12, padding: "14px 10px",
    cursor: "pointer", textAlign: "center", transition: "all .18s",
    fontSize: "0.83rem", fontWeight: sel ? 600 : 500, color: sel ? "#185FA5" : "#64748B",
  }),
  chipIcon: { fontSize: 22, display: "block", marginBottom: 6 },
  // Survey
  stepRow: { display: "flex", alignItems: "center", gap: 0, marginBottom: 24, flexWrap: "wrap" as const },
  stepDot: (state: "done" | "cur" | "todo"): React.CSSProperties => ({
    width: 26, height: 26, borderRadius: "50%", display: "flex", alignItems: "center",
    justifyContent: "center", fontSize: "0.72rem", fontWeight: 700, flexShrink: 0,
    background: state === "done" ? "#E1F5EE" : state === "cur" ? "#185FA5" : "#F1F5F9",
    color: state === "done" ? "#0F6E56" : state === "cur" ? "#fff" : "#94A3B8",
  }),
  stepLine: { flex: 1, height: 1, background: "#E2E8F0", minWidth: 8, display: "inline-block" },
  progress: { height: 5, background: "#E2E8F0", borderRadius: 3, marginBottom: 22, overflow: "hidden" },
  progressFill: (pct: number): React.CSSProperties => ({
    height: "100%", width: `${pct}%`,
    background: "linear-gradient(90deg, #378ADD, #1D9E75)",
    borderRadius: 3, transition: "width .4s ease",
  }),
  qLabel: { fontSize: "0.72rem", fontWeight: 700, color: "#94A3B8", textTransform: "uppercase" as const, letterSpacing: "0.6px", marginBottom: 6 },
  qText: { fontFamily: "'Sora', sans-serif", fontWeight: 600, fontSize: "1.05rem", lineHeight: 1.55, marginBottom: 18 },
  optRow: { display: "grid", gap: 8 },
  opt: (sel: boolean): React.CSSProperties => ({
    padding: "11px 15px", border: sel ? "2px solid #378ADD" : "1px solid #E2E8F0",
    borderRadius: 10, cursor: "pointer", display: "flex", alignItems: "center",
    gap: 10, fontSize: "0.88rem", fontWeight: sel ? 500 : 400,
    background: sel ? "#E6F1FB" : "#fff", transition: "all .18s",
  }),
  optCircle: (sel: boolean): React.CSSProperties => ({
    width: 18, height: 18, borderRadius: "50%", flexShrink: 0,
    border: sel ? "none" : "1.5px solid #CBD5E1",
    background: sel ? "#185FA5" : "transparent",
    display: "flex", alignItems: "center", justifyContent: "center",
  }),
  optSquare: (sel: boolean): React.CSSProperties => ({
    width: 18, height: 18, borderRadius: 4, flexShrink: 0,
    border: sel ? "none" : "1.5px solid #CBD5E1",
    background: sel ? "#185FA5" : "transparent",
    display: "flex", alignItems: "center", justifyContent: "center",
  }),
  // Levels
  levelGrid: { display: "grid", gridTemplateColumns: "repeat(5,1fr)", gap: 8, marginBottom: 14 },
  lvBtn: (sel: boolean): React.CSSProperties => ({
    border: sel ? "2px solid #378ADD" : "1px solid #E2E8F0",
    borderRadius: 12, padding: "13px 8px", cursor: "pointer",
    textAlign: "center", transition: "all .18s",
    background: sel ? "#E6F1FB" : "#fff",
  }),
  lvName: (sel: boolean): React.CSSProperties => ({
    fontFamily: "'Sora', sans-serif", fontWeight: 700, fontSize: "1.1rem",
    color: sel ? "#185FA5" : "#0F172A", marginBottom: 3,
  }),
  lvSub: { fontSize: "0.7rem", color: "#94A3B8" },
  // Exam / Questions
  groupBanner: {
    background: "#F8FAFC", borderRadius: 10, padding: "10px 14px",
    marginBottom: 16, display: "flex", alignItems: "center", gap: 12,
    border: "1px solid #E2E8F0",
  },
  groupTag: {
    fontFamily: "'Sora', sans-serif", fontWeight: 700, fontSize: "0.75rem", color: "#94A3B8",
    textTransform: "uppercase" as const, letterSpacing: "0.7px",
  },
  groupTitle: { fontFamily: "'Sora', sans-serif", fontWeight: 700, fontSize: "0.9rem", color: "#0F172A" },
  qNumBadge: {
    width: 38, height: 38, borderRadius: "50%", background: "#E6F1FB",
    display: "flex", alignItems: "center", justifyContent: "center",
    fontFamily: "'Sora', sans-serif", fontWeight: 700, fontSize: "0.9rem", color: "#185FA5",
    flexShrink: 0,
  },
  typeBadge: (type: string): React.CSSProperties => ({
    display: "inline-block", padding: "3px 11px", borderRadius: 20,
    fontSize: "0.72rem", fontWeight: 700, textTransform: "uppercase" as const,
    letterSpacing: "0.4px", marginBottom: 10,
    background: TYPE_META[type]?.bg || "#F1F5F9",
    color: TYPE_META[type]?.color || "#64748B",
  }),
  qBox: {
    background: "#F8FAFC", borderRadius: 12, padding: "18px 20px",
    borderLeft: "4px solid #378ADD", fontFamily: "'Sora', sans-serif",
    fontWeight: 600, fontSize: "1rem", lineHeight: 1.65, marginBottom: 16,
  },
  tipBox: {
    background: "#FAEEDA", borderRadius: 10, padding: "13px 16px",
    borderLeft: "4px solid #EF9F27", marginBottom: 14,
  },
  tipLabel: { fontSize: "0.72rem", fontWeight: 700, color: "#854F0B", textTransform: "uppercase" as const, letterSpacing: "0.4px", marginBottom: 5 },
  tipText: { fontSize: "0.87rem", color: "#78350F", lineHeight: 1.65 },
  sampleBox: {
    background: "#E1F5EE", borderRadius: 12, padding: "18px 20px",
    borderLeft: "4px solid #1D9E75", marginTop: 14,
    animation: "fadeUp .3s ease",
  },
  sampleLabel: { fontSize: "0.72rem", fontWeight: 700, color: "#0F6E56", textTransform: "uppercase" as const, letterSpacing: "0.4px", marginBottom: 8 },
  sampleText: { fontSize: "0.9rem", color: "#065f46", lineHeight: 1.8 },
  // Buttons
  btnRow: { display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 20, alignItems: "center" },
  btnRowCenter: { display: "flex", gap: 10, justifyContent: "center", marginTop: 20, alignItems: "center" },
  btnPrimary: {
    padding: "10px 22px", background: "#185FA5", color: "#fff", border: "none",
    borderRadius: 9, fontSize: "0.88rem", fontWeight: 600, cursor: "pointer",
    fontFamily: "'DM Sans', sans-serif", transition: "all .18s",
  },
  btnSecondary: {
    padding: "10px 22px", background: "#fff", color: "#0F172A",
    border: "1px solid #CBD5E1", borderRadius: 9, fontSize: "0.88rem",
    fontWeight: 600, cursor: "pointer", fontFamily: "'DM Sans', sans-serif", transition: "all .18s",
  },
  btnSm: {
    padding: "6px 14px", background: "#fff", color: "#0F172A",
    border: "1px solid #CBD5E1", borderRadius: 7, fontSize: "0.8rem",
    fontWeight: 600, cursor: "pointer", fontFamily: "'DM Sans', sans-serif",
  },
  btnTTS: (active: boolean): React.CSSProperties => ({
    display: "inline-flex", alignItems: "center", gap: 5,
    padding: "6px 13px", background: active ? "#E1F5EE" : "#fff",
    color: active ? "#0F6E56" : "#0F6E56",
    border: active ? "1.5px solid #1D9E75" : "1px solid #CBD5E1",
    borderRadius: 20, cursor: "pointer", fontSize: "0.78rem", fontWeight: 600,
    fontFamily: "'DM Sans', sans-serif", transition: "all .18s",
  }),
  btnSample: {
    display: "inline-flex", alignItems: "center", gap: 5,
    padding: "6px 13px", background: "#fff", color: "#0F172A",
    border: "1px solid #CBD5E1", borderRadius: 7, cursor: "pointer",
    fontSize: "0.8rem", fontWeight: 600, fontFamily: "'DM Sans', sans-serif",
  },
  // Loading
  loadWrap: { textAlign: "center" as const, padding: "72px 20px" },
  spinner: {
    width: 44, height: 44, border: "3px solid #E2E8F0",
    borderTopColor: "#378ADD", borderRadius: "50%",
    animation: "spin .7s linear infinite", margin: "0 auto 16px",
  },
  // Success
  successWrap: { textAlign: "center" as const, padding: "60px 24px" },
  successTitle: { fontFamily: "'Sora', sans-serif", fontWeight: 700, fontSize: "1.5rem", marginBottom: 8 },
  // Top bar
  topBar: { display: "flex", alignItems: "center", gap: 12, marginBottom: 24 },
  topBarTitle: { fontFamily: "'Sora', sans-serif", fontWeight: 700, fontSize: "1rem" },
  examTopBar: {
    display: "flex", alignItems: "center", justifyContent: "space-between",
    marginBottom: 16, gap: 12,
  },
};

/* ═══════════════════════════════════ ICONS ══════════════════════════════════ */
function IconSpeaker() {
  return <svg width="14" height="14" viewBox="0 0 14 14" fill="none" style={{ flexShrink: 0 }}>
    <path d="M2 4.5v5l4-2.5-4-2.5z" fill="currentColor"/>
    <path d="M8 3.5c1.4.9 2.5 2 2.5 3.5S9.4 10.1 8 11" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
    <path d="M9.5 1.5c2.5 1.5 3.5 3 3.5 5.5s-1 4-3.5 5.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
  </svg>;
}
function IconPause() {
  return <svg width="14" height="14" viewBox="0 0 14 14" fill="none" style={{ flexShrink: 0 }}>
    <rect x="2" y="2" width="4" height="10" rx="1" fill="currentColor"/>
    <rect x="8" y="2" width="4" height="10" rx="1" fill="currentColor"/>
  </svg>;
}
function IconCheck() {
  return <svg width="10" height="10" viewBox="0 0 10 10">
    <polyline points="1,5 4,8 9,2" stroke="white" strokeWidth="2" fill="none"/>
  </svg>;
}
function WaveDots() {
  return <span style={{ display: "inline-flex", alignItems: "center", gap: 2, marginLeft: 3 }}>
    {[0, 0.12, 0.24, 0.06].map((d, i) => (
      <span key={i} style={{
        display: "inline-block", width: 3, borderRadius: 2,
        background: "#1D9E75", height: i === 1 ? 13 : i === 0 ? 8 : i === 2 ? 6 : 10,
        animation: `wave .7s ease ${d}s infinite`,
      }}/>
    ))}
  </span>;
}

/* ═══════════════════════════════════ SAMPLE BLOCK ═══════════════════════════ */
function SampleBlock({ q, qi, level, speakIdx, toggleTTS, shown, onToggle }: {
  q: Question; qi: number; level: string;
  speakIdx: number|null; toggleTTS: (i:number,t:string)=>void;
  shown: boolean; onToggle: ()=>void;
}) {
  const speaking = speakIdx === qi;
  return (
    <>
      <div style={{ display: "flex", gap: 8, alignItems: "center", marginTop: 6, flexWrap: "wrap" }}>
        <button style={S.btnSample} onClick={onToggle}>
          {shown ? "▲ Ẩn bài mẫu" : "▼ Xem bài mẫu"}
        </button>
        {shown && (
          <button style={S.btnTTS(speaking)} onClick={() => toggleTTS(qi, q.sample)}>
            {speaking ? <IconPause/> : <IconSpeaker/>}
            {speaking ? <><span>Đang đọc</span><WaveDots/></> : "Đọc to"}
          </button>
        )}
      </div>
      {shown && (
        <div style={S.sampleBox}>
          <div style={S.sampleLabel}>Bài mẫu — Cấp {level}</div>
          <div style={S.sampleText}>{q.sample}</div>
        </div>
      )}
    </>
  );
}

/* ═══════════════════════════════════ QUESTION CARD ══════════════════════════ */
function QuestionCard({ q, qi, level, speakIdx, toggleTTS, shown, onToggle }: {
  q: Question; qi: number; level: string;
  speakIdx: number|null; toggleTTS: (i:number,t:string)=>void;
  shown: boolean; onToggle: ()=>void;
}) {
  const grp = TYPE_GROUPS.find(g => qi >= g.range[0] && qi <= g.range[1]);
  return (
    <div style={{ ...S.card, marginBottom: 16, animation: "fadeUp .3s ease" }}>
      {grp && (
        <div style={S.groupBanner}>
          <div>
            <div style={S.groupTag}>{grp.tag}</div>
            <div style={S.groupTitle}>{grp.label} <span style={{ color: "#94A3B8", fontWeight: 400 }}>— {grp.vi}</span></div>
          </div>
        </div>
      )}
      <div style={{ display: "flex", alignItems: "flex-start", gap: 14, marginBottom: 14 }}>
        <div style={S.qNumBadge}>{qi + 1}</div>
        <div style={{ flex: 1 }}>
          <span style={S.typeBadge(q.type)}>{TYPE_META[q.type]?.label || q.type}</span>
          <div style={S.qBox}>{q.question}</div>
        </div>
      </div>
      <div style={S.tipBox}>
        <div style={S.tipLabel}>Gợi ý trả lời</div>
        <div style={S.tipText}>{q.tip}</div>
      </div>
      <SampleBlock q={q} qi={qi} level={level} speakIdx={speakIdx} toggleTTS={toggleTTS} shown={shown} onToggle={onToggle}/>
    </div>
  );
}

/* ═══════════════════════════════════ HEADER ════════════════════════════════ */
function Header({ tab, onHome, onGuide }: { tab: Page; onHome:()=>void; onGuide:()=>void }) {
  return (
    <header style={S.header}>
      <div style={S.logo} onClick={onHome}>
        <div style={S.logoMark}>Op</div>
        <span style={S.logoText}>OPIc Learn</span>
      </div>
      <div style={S.navRow}>
        <button style={S.navBtn(tab !== "guide")} onClick={onHome}>Trang chủ</button>
        <button style={S.navBtn(tab === "guide")} onClick={onGuide}>Hướng dẫn</button>
      </div>
    </header>
  );
}

/* ═══════════════════════════════════ MAIN APP ═══════════════════════════════ */
export default function App() {
  const [page, setPage]       = useState<Page>("home");
  const [mode, setMode]       = useState<"topic"|"exam"|null>(null);
  const [topic, setTopic]     = useState<string|null>(null);
  const [sqIdx, setSqIdx]     = useState(0);
  const [sqAns, setSqAns]     = useState<Record<string, number|number[]>>({});
  const [level, setLevel]     = useState("IM2");
  const [examQs, setExamQs]   = useState<Question[]>([]);
  const [examIdx, setExamIdx] = useState(0);
  const [topicQs, setTopicQs] = useState<Question[]>([]);
  const [shown, setShown]     = useState<Record<number, boolean>>({});
  const [loading, setLoading] = useState(false);
  const { speakIdx, toggle: toggleTTS, stop: stopSpeech } = useTTS();

  const goHome = useCallback(() => {
    stopSpeech();
    setPage("home"); setMode(null); setTopic(null);
    setTopicQs([]); setExamQs([]); setExamIdx(0);
    setShown({}); setLoading(false); setSqIdx(0); setSqAns({});
  }, [stopSpeech]);

  const toggleShown = (i: number) => setShown(p => ({ ...p, [i]: !p[i] }));

  /* Survey helpers */
  const curSQ = SURVEY_QS[sqIdx];
  const canNext = (() => {
    const a = sqAns[curSQ?.id];
    if (curSQ?.multi) return Array.isArray(a) && a.length > 0;
    return a !== undefined && a !== null;
  })();
  const selOpt = (i: number) => {
    const q = SURVEY_QS[sqIdx];
    if (q.multi) {
      const cur = (sqAns[q.id] as number[]|undefined) || [];
      setSqAns(p => ({ ...p, [q.id]: cur.includes(i) ? cur.filter(x=>x!==i) : [...cur,i] }));
    } else {
      setSqAns(p => ({ ...p, [q.id]: i }));
    }
  };

  /* AI calls */
  async function startTopicPractice() {
    if (!topic) return;
    const tp = TOPICS.find(t => t.id === topic)!;
    setPage("topic"); setLoading(true); setTopicQs([]); setShown({});
    try {
      const data = await callAI(
        `You are an OPIc English speaking exam expert. Generate 5 practice questions for the topic "${tp.name}".
Return ONLY valid JSON (no markdown, no explanation):
{"questions":[
  {"type":"describe","question":"Describe your favorite ${tp.name} experience in detail.","tip":"Mô tả chi tiết: khi nào, ở đâu, với ai, cảm giác thế nào.","sample":"I really enjoy ${tp.name}. I usually..."},
  {"type":"compare","question":"...","tip":"...","sample":"..."},
  {"type":"past","question":"...","tip":"...","sample":"..."},
  {"type":"roleplay","question":"...","tip":"...","sample":"..."},
  {"type":"describe","question":"...","tip":"...","sample":"..."}
]}
Rules: 5 questions; types: describe/compare/past/roleplay; questions in English; tip in Vietnamese (concise, practical); sample = fluent natural English 4-6 sentences at IM2-IH level, first person, conversational.`, 1800);
      setTopicQs(data.questions || []);
    } catch { alert("Lỗi tải câu hỏi. Thử lại!"); goHome(); }
    finally { setLoading(false); }
  }

  async function generateExam() {
    setPage("exam"); setLoading(true); setExamQs([]); setExamIdx(0); setShown({});
    const profile = SURVEY_QS.map(q => {
      const a = sqAns[q.id];
      if (q.multi) return `${q.q}: ${((a as number[])||[]).map(i=>q.opts[i]).join(", ")||"N/A"}`;
      return `${q.q}: ${a!==undefined ? q.opts[a as number] : "N/A"}`;
    }).join("\n");

    try {
      const data = await callAI(
        `You are an OPIc exam generator. Create a personalised 15-question OPIc exam.

Test taker background survey:
${profile}

Target level: ${level}

Generate EXACTLY 15 questions in this order:
Q1-3: type "describe" — ask about present habits/routines/places from their profile  
Q4-6: type "compare" — compare two things, past vs now, related to their interests  
Q7-9: type "past" — ask about a specific memorable past event or experience  
Q10-12: type "roleplay" — give a situation to act out related to their daily life  
Q13-15: type "mixed" — unexpected situation, opinion question, or elaborate on previous topic  

Return ONLY valid JSON:
{"questions":[
  {"type":"describe","question":"English question here","tip":"Gợi ý tiếng Việt ngắn gọn","sample":"Natural English answer at ${level} level, 4-7 sentences, conversational and specific."},
  ... (15 total)
]}

CRITICAL: Personalise every question based on the test taker's hobbies, job, sports, travel. Tips must be in Vietnamese. Samples must feel natural and match ${level} proficiency. Do not include markdown or extra text.`, 4000);
      setExamQs(data.questions || []);
    } catch { alert("Lỗi tạo đề thi. Thử lại!"); goHome(); }
    finally { setLoading(false); }
  }

  /* ── LOADING SCREEN ── */
  const LoadScreen = ({ text, sub }: { text: string; sub?: string }) => (
    <div style={S.loadWrap}>
      <div style={S.spinner}/>
      <p style={{ fontSize: "0.95rem", color: "#64748B", marginBottom: 4 }}>{text}</p>
      {sub && <p style={{ fontSize: "0.82rem", color: "#94A3B8" }}>{sub}</p>}
    </div>
  );

  /* ── HOME ── */
  if (page === "home") return (
    <div style={S.wrap}>
      <Header tab="home" onHome={goHome} onGuide={() => setPage("guide")}/>
      <main style={S.main}>
        <h1 style={S.h1}>Luyện thi OPIc thông minh</h1>
        <p style={S.sub}>Chọn chế độ luyện tập phù hợp với bạn</p>

        <div style={S.modeGrid}>
          {/* Topic card */}
          <div style={S.modeCard(mode==="topic")} onClick={() => { setMode("topic"); setTopic(null); }}>
            <div style={S.modeIcon("#E6F1FB")}>📝</div>
            <div style={S.modeName}>Luyện theo chủ đề</div>
            <div style={S.modeDesc}>Chọn 1 trong 12 chủ đề, AI tạo 5 câu hỏi đa dạng kèm gợi ý tiếng Việt và bài mẫu có thể đọc to.</div>
          </div>
          {/* Exam card */}
          <div style={S.modeCard(mode==="exam")} onClick={() => setMode("exam")}>
            <span style={S.newTag}>Mới</span>
            <div style={S.modeIcon("#E1F5EE")}>🎯</div>
            <div style={S.modeName}>Thi thử OPIc thật</div>
            <div style={S.modeDesc}>Khảo sát nền 7 câu → chọn cấp độ → AI tạo 15 câu cá nhân hoá theo đúng cấu trúc OPIc.</div>
          </div>
        </div>

        {/* Topic select */}
        {mode === "topic" && (
          <div style={{ animation: "fadeUp .3s ease" }}>
            <div style={S.secLabel}>Chọn chủ đề luyện tập</div>
            <div style={S.topicGrid}>
              {TOPICS.map(t => (
                <div key={t.id} style={S.topicChip(topic===t.id)} onClick={() => setTopic(t.id)}>
                  <span style={S.chipIcon}>{t.icon}</span>{t.name}
                </div>
              ))}
            </div>
            <div style={S.btnRow}>
              <button
                style={{ ...S.btnPrimary, opacity: topic ? 1 : 0.45, cursor: topic ? "pointer" : "not-allowed" }}
                onClick={() => topic && startTopicPractice()}
              >Bắt đầu luyện tập →</button>
            </div>
          </div>
        )}

        {/* Exam intro */}
        {mode === "exam" && (
          <div style={{ ...S.card, animation: "fadeUp .3s ease" }}>
            <div style={{ display: "flex", gap: 16 }}>
              <span style={{ fontSize: 30, flexShrink: 0 }}>📋</span>
              <div>
                <div style={{ ...S.topBarTitle, marginBottom: 10 }}>Quy trình thi thử OPIc</div>
                <ol style={{ paddingLeft: 18, color: "#64748B", fontSize: "0.88rem", lineHeight: 2.2 }}>
                  <li><strong>Khảo sát nền</strong> (Background Survey) — 7 câu giống đề thật</li>
                  <li><strong>Chọn cấp độ</strong> mục tiêu: IM1 / IM2 / IM3 / IH / AL</li>
                  <li><strong>15 câu hỏi</strong> cá nhân hoá theo hồ sơ của bạn</li>
                  <li>Xem <strong>bài mẫu</strong> & nghe <strong>đọc to</strong> từng câu</li>
                </ol>
              </div>
            </div>
            <div style={{ ...S.btnRow, marginTop: 16 }}>
              <button style={S.btnPrimary} onClick={() => { setSqIdx(0); setSqAns({}); setPage("survey"); }}>
                Bắt đầu →
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  );

  /* ── TOPIC QUESTIONS ── */
  if (page === "topic") {
    const tp = TOPICS.find(t => t.id === topic)!;
    return (
      <div style={S.wrap}>
        <Header tab="home" onHome={goHome} onGuide={() => setPage("guide")}/>
        <main style={S.main}>
          {loading ? <LoadScreen text={`AI đang tạo câu hỏi cho chủ đề "${tp?.name}"...`}/> : (
            <>
              <div style={S.topBar}>
                <button style={S.btnSm} onClick={() => { stopSpeech(); goHome(); }}>← Quay lại</button>
                <div>
                  <div style={S.topBarTitle}>{tp?.icon} {tp?.name}</div>
                  <div style={{ fontSize: "0.75rem", color: "#94A3B8" }}>{topicQs.length} câu hỏi luyện tập</div>
                </div>
                <button style={{ ...S.btnSm, marginLeft: "auto" }}
                  onClick={() => { stopSpeech(); setShown({}); setTopicQs([]); startTopicPractice(); }}>
                  🔄 Tạo lại
                </button>
              </div>
              {topicQs.map((q, i) => (
                <QuestionCard key={i} q={q} qi={i} level="IM2"
                  speakIdx={speakIdx} toggleTTS={toggleTTS}
                  shown={!!shown[i]} onToggle={() => toggleShown(i)}/>
              ))}
            </>
          )}
        </main>
      </div>
    );
  }

  /* ── SURVEY ── */
  if (page === "survey") {
    const q = SURVEY_QS[sqIdx];
    const ans = sqAns[q.id];
    const isMul = q.multi;
    const selArr = isMul ? ((ans as number[])||[]) : [];
    const selSingle = isMul ? -1 : (ans as number ?? -1);
    const pct = (sqIdx / SURVEY_QS.length) * 100;
    return (
      <div style={S.wrap}>
        <Header tab="home" onHome={goHome} onGuide={() => setPage("guide")}/>
        <main style={S.main}>
          <div style={S.topBar}>
            <button style={S.btnSm} onClick={goHome}>← Quay lại</button>
            <span style={S.topBarTitle}>Khảo sát nền OPIc</span>
          </div>

          {/* Stepper */}
          <div style={S.stepRow}>
            {SURVEY_QS.map((_, i) => (
              <span key={i} style={{ display:"flex", alignItems:"center", flex: i < SURVEY_QS.length-1 ? 1 : "none" }}>
                <span style={S.stepDot(i < sqIdx ? "done" : i === sqIdx ? "cur" : "todo")}>
                  {i < sqIdx ? "✓" : i+1}
                </span>
                {i < SURVEY_QS.length-1 && <span style={S.stepLine}/>}
              </span>
            ))}
          </div>

          <div style={S.card}>
            <div style={S.progress}><div style={S.progressFill(pct)}/></div>
            <div style={S.qLabel}>Câu hỏi {sqIdx+1} / {SURVEY_QS.length}</div>
            <div style={S.qText}>{q.q}</div>
            {isMul && <p style={{ fontSize: "0.78rem", color: "#94A3B8", marginBottom: 10 }}>Có thể chọn nhiều đáp án</p>}
            <div style={S.optRow}>
              {q.opts.map((opt, i) => {
                const sel = isMul ? selArr.includes(i) : selSingle === i;
                return (
                  <div key={i} style={S.opt(sel)} onClick={() => selOpt(i)}>
                    {isMul
                      ? <span style={S.optSquare(sel)}>{sel && <IconCheck/>}</span>
                      : <span style={S.optCircle(sel)}>{sel && <span style={{ width:8,height:8,borderRadius:"50%",background:"#fff",display:"block" }}/>}</span>
                    }
                    {opt}
                  </div>
                );
              })}
            </div>
            <div style={S.btnRow}>
              {sqIdx > 0 && <button style={S.btnSecondary} onClick={() => setSqIdx(sqIdx-1)}>← Trước</button>}
              <button
                style={{ ...S.btnPrimary, opacity: canNext ? 1 : 0.45, cursor: canNext ? "pointer" : "not-allowed" }}
                onClick={() => canNext && (sqIdx < SURVEY_QS.length-1 ? setSqIdx(sqIdx+1) : setPage("level"))}
              >{sqIdx < SURVEY_QS.length-1 ? "Tiếp theo →" : "Hoàn thành →"}</button>
            </div>
          </div>
        </main>
      </div>
    );
  }

  /* ── LEVEL ── */
  if (page === "level") return (
    <div style={S.wrap}>
      <Header tab="home" onHome={goHome} onGuide={() => setPage("guide")}/>
      <main style={S.main}>
        <div style={S.topBar}>
          <button style={S.btnSm} onClick={() => { setSqIdx(SURVEY_QS.length-1); setPage("survey"); }}>← Quay lại</button>
          <span style={S.topBarTitle}>Chọn cấp độ mục tiêu</span>
        </div>
        <div style={S.card}>
          <p style={{ color: "#64748B", fontSize: "0.88rem", marginBottom: 18 }}>AI sẽ tạo 15 câu hỏi phù hợp với cấp độ bạn chọn.</p>
          <div style={S.levelGrid}>
            {LEVELS.map(lv => (
              <div key={lv.id} style={S.lvBtn(level===lv.id)} onClick={() => setLevel(lv.id)}>
                <div style={S.lvName(level===lv.id)}>{lv.label}</div>
                <div style={S.lvSub}>{lv.sub}</div>
              </div>
            ))}
          </div>
          <div style={{ background:"#F8FAFC",borderRadius:10,padding:"13px 16px",fontSize:"0.82rem",color:"#64748B",lineHeight:1.9,marginBottom:18 }}>
            <strong>Thang điểm:</strong> Novice Low → NM → NH → <strong>IM1 → IM2 → IM3</strong> → Intermediate High (IH) → Advanced Low (AL)
          </div>
          <div style={S.btnRow}>
            <button style={S.btnPrimary} onClick={generateExam}>🎯 Tạo đề thi (15 câu) →</button>
          </div>
        </div>
      </main>
    </div>
  );

  /* ── EXAM ── */
  if (page === "exam") {
    if (loading) return (
      <div style={S.wrap}>
        <Header tab="home" onHome={goHome} onGuide={() => setPage("guide")}/>
        <main style={S.main}>
          <LoadScreen text="AI đang tạo đề thi cá nhân hoá..." sub={`Cấp độ ${level} · 15 câu · vui lòng chờ (~30 giây)`}/>
        </main>
      </div>
    );
    const q = examQs[examIdx];
    const pct = ((examIdx+1)/examQs.length)*100;
    if (!q) return null;
    return (
      <div style={S.wrap}>
        <Header tab="home" onHome={goHome} onGuide={() => setPage("guide")}/>
        <main style={S.main}>
          <div style={S.examTopBar}>
            <button style={S.btnSm} onClick={() => { stopSpeech(); goHome(); }}>✕ Thoát</button>
            <div style={{ textAlign: "center" }}>
              <div style={{ fontFamily:"'Sora',sans-serif", fontWeight:700, fontSize:"0.88rem" }}>
                Đề thi thử OPIc · Cấp {level}
              </div>
              <div style={{ fontSize:"0.78rem", color:"#94A3B8" }}>Câu {examIdx+1} / {examQs.length}</div>
            </div>
            <div style={{ fontSize:"0.8rem", fontWeight:600, color:"#185FA5" }}>{Math.round(pct)}%</div>
          </div>
          <div style={S.progress}><div style={S.progressFill(pct)}/></div>

          <QuestionCard q={q} qi={examIdx} level={level}
            speakIdx={speakIdx} toggleTTS={toggleTTS}
            shown={!!shown[examIdx]} onToggle={() => toggleShown(examIdx)}/>

          <div style={S.btnRow}>
            {examIdx > 0 && (
              <button style={S.btnSecondary} onClick={() => { stopSpeech(); setExamIdx(examIdx-1); setShown({}); }}>
                ← Câu trước
              </button>
            )}
            {examIdx < examQs.length-1
              ? <button style={S.btnPrimary} onClick={() => { stopSpeech(); setExamIdx(examIdx+1); setShown({}); }}>
                  Câu tiếp →
                </button>
              : <button style={S.btnPrimary} onClick={() => { stopSpeech(); setPage("done"); }}>
                  🏁 Hoàn thành bài thi
                </button>
            }
          </div>
        </main>
      </div>
    );
  }

  /* ── DONE ── */
  if (page === "done") return (
    <div style={S.wrap}>
      <Header tab="home" onHome={goHome} onGuide={() => setPage("guide")}/>
      <main style={S.main}>
        <div style={S.successWrap}>
          <div style={{ fontSize: 52, marginBottom: 16 }}>🏁</div>
          <div style={S.successTitle}>Hoàn thành bài thi thử!</div>
          <p style={{ color:"#64748B", marginBottom:6 }}>Cấp độ: <strong>{level}</strong> · {examQs.length} câu</p>
          <p style={{ color:"#64748B", marginBottom:28 }}>Xem lại bài mẫu từng câu để nâng cao kỹ năng nói.</p>
          <div style={S.btnRowCenter}>
            <button style={S.btnSecondary} onClick={() => { setPage("exam"); setExamIdx(0); setShown({}); }}>Xem lại bài thi</button>
            <button style={S.btnPrimary} onClick={goHome}>Thi thử lại</button>
          </div>
        </div>
      </main>
    </div>
  );

  /* ── GUIDE ── */
  if (page === "guide") return (
    <div style={S.wrap}>
      <Header tab="guide" onHome={goHome} onGuide={() => setPage("guide")}/>
      <main style={S.main}>
        <div style={S.topBar}>
          <button style={S.btnSm} onClick={goHome}>← Quay lại</button>
          <span style={S.topBarTitle}>Cấp độ & Hướng dẫn OPIc</span>
        </div>

        <div style={{ ...S.card, marginBottom: 16 }}>
          <div style={{ ...S.secLabel, marginBottom: 16 }}>Thang cấp độ OPIc</div>
          {[
            { lv:"Novice Low / Mid / High", type:"describe", desc:"Trả lời bằng từ đơn, cụm từ ngắn. Rất hạn chế về từ vựng và ngữ pháp." },
            { lv:"IM1 / IM2 / IM3",          type:"past",     desc:"Câu đơn giản, mô tả được chủ đề quen thuộc. Cấp độ phổ biến nhất cho người đi làm." },
            { lv:"Intermediate High (IH)",   type:"compare",  desc:"Câu ghép, mô tả và so sánh tốt. Xử lý được tình huống bất ngờ." },
            { lv:"Advanced Low (AL)",         type:"roleplay", desc:"Đoạn văn dài, lập luận logic, thuyết phục. Gần như lưu loát." },
          ].map(x => (
            <div key={x.lv} style={{ display:"flex", alignItems:"flex-start", gap:14, padding:"12px 0", borderBottom:"1px solid #F1F5F9" }}>
              <span style={{ ...S.typeBadge(x.type), flexShrink:0, whiteSpace:"nowrap" as const }}>{x.lv}</span>
              <span style={{ fontSize:"0.86rem", color:"#64748B", paddingTop:4 }}>{x.desc}</span>
            </div>
          ))}
        </div>

        <div style={S.card}>
          <div style={{ ...S.secLabel, marginBottom: 14 }}>Cấu trúc 15 câu OPIc</div>
          {TYPE_GROUPS.map(g => (
            <div key={g.tag} style={{ display:"flex", gap:14, padding:"11px 0", borderBottom:"1px solid #F8FAFC", alignItems:"center" }}>
              <span style={{ fontFamily:"'Sora',sans-serif", fontWeight:700, fontSize:"0.78rem", color:"#185FA5", minWidth:52 }}>{g.tag}</span>
              <span style={{ fontWeight:600, fontSize:"0.88rem" }}>{g.label}</span>
              <span style={{ color:"#94A3B8", fontSize:"0.83rem" }}>— {g.vi}</span>
            </div>
          ))}
          <p style={{ fontSize:"0.8rem", color:"#94A3B8", marginTop:14 }}>
            Câu hỏi được AI tạo dựa trên hồ sơ cá nhân từ Background Survey của bạn.
          </p>
        </div>

        <div style={{ ...S.btnRowCenter, marginTop: 20 }}>
          <button style={S.btnPrimary} onClick={() => { setMode("exam"); setPage("home"); }}>Bắt đầu thi thử →</button>
        </div>
      </main>
    </div>
  );

  return null;
}
