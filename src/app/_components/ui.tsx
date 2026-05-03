"use client";
import { memo } from "react";

export const FONT = "'Be Vietnam Pro', system-ui, sans-serif";

// Glass card helper
export function glass(extra?: React.CSSProperties): React.CSSProperties {
  return {
    background: "rgba(255,255,255,0.055)",
    backdropFilter: "blur(20px)",
    WebkitBackdropFilter: "blur(20px)",
    border: "1px solid rgba(255,255,255,0.11)",
    borderRadius: 16,
    ...extra,
  };
}

/* ── Pill button (hero CTA, navbar) ────────────────────── */
export function PillBtn({
  label,
  onClick,
  white = false,
  style: ext,
}: {
  label: string;
  onClick: () => void;
  white?: boolean;
  style?: React.CSSProperties;
}) {
  return (
    <button
      onClick={onClick}
      style={{
        position: "relative", display: "inline-flex", alignItems: "center",
        justifyContent: "center", border: "0.6px solid rgba(255,255,255,0.85)",
        borderRadius: 9999, background: "transparent", padding: 2,
        cursor: "pointer", transition: "opacity .18s", fontFamily: FONT, ...ext,
      }}
    >
      {/* Top glow streak */}
      <span style={{
        position: "absolute", top: -1, left: "50%", transform: "translateX(-50%)",
        width: "60%", height: 8,
        background: "radial-gradient(ellipse at 50% 0%,rgba(255,255,255,.5) 0%,transparent 80%)",
        borderRadius: "50%", filter: "blur(3px)", pointerEvents: "none",
      }} />
      <span style={{
        display: "inline-flex", alignItems: "center", justifyContent: "center",
        borderRadius: 9999, padding: "11px 29px",
        background: white ? "#fff" : "#000",
        color: white ? "#000" : "#fff",
        fontSize: 14, fontWeight: 500, fontFamily: FONT,
        letterSpacing: "0.01em", whiteSpace: "nowrap", position: "relative", zIndex: 1,
      }}>{label}</span>
    </button>
  );
}

/* ── Inner button (inner pages) ─────────────────────────── */
export const InnerBtn = memo(function InnerBtn({
  label,
  onClick,
  variant = "ghost",
  disabled = false,
}: {
  label: string;
  onClick: () => void;
  variant?: "primary" | "ghost" | "sm";
  disabled?: boolean;
}) {
  const map: Record<string, React.CSSProperties> = {
    primary: { padding: "10px 22px", borderRadius: 9999, background: "#fff", color: "#000", fontSize: "0.875rem", fontWeight: 600 },
    ghost:   { padding: "9px 18px",  borderRadius: 10, background: "rgba(255,255,255,0.08)", color: "#fff", border: "1px solid rgba(255,255,255,0.14)", fontSize: "0.875rem", fontWeight: 500 },
    sm:      { padding: "6px 14px",  borderRadius: 8,  background: "rgba(255,255,255,0.07)", color: "rgba(255,255,255,0.72)", border: "1px solid rgba(255,255,255,0.11)", fontSize: "0.78rem", fontWeight: 500 },
  };
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        display: "inline-flex", alignItems: "center", gap: 6,
        cursor: disabled ? "not-allowed" : "pointer",
        fontFamily: FONT, border: "none", transition: "all .18s",
        opacity: disabled ? 0.42 : 1, ...map[variant],
      }}
    >{label}</button>
  );
});

/* ── SmallBtn (inside question cards) ───────────────────── */
export const SmallBtn = memo(function SmallBtn({
  onClick,
  active = false,
  children,
}: {
  onClick: () => void;
  active?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      style={{
        display: "inline-flex", alignItems: "center", gap: 5,
        padding: "5px 13px", borderRadius: 8,
        background: active ? "rgba(255,255,255,0.12)" : "rgba(255,255,255,0.06)",
        color: active ? "#fff" : "rgba(255,255,255,0.65)",
        border: `1px solid ${active ? "rgba(255,255,255,0.24)" : "rgba(255,255,255,0.1)"}`,
        cursor: "pointer", fontSize: "0.78rem", fontWeight: 500, fontFamily: FONT,
        transition: "all .15s",
      }}
    >{children}</button>
  );
});

/* ── Progress bar ───────────────────────────────────────── */
export const ProgBar = memo(function ProgBar({ pct }: { pct: number }) {
  return (
    <div style={{ height: 2, background: "rgba(255,255,255,0.08)", borderRadius: 2, overflow: "hidden", marginBottom: 22 }}>
      <div style={{ height: "100%", width: `${pct}%`, background: "#fff", borderRadius: 2, transition: "width .45s ease" }} />
    </div>
  );
});

/* ── Spinner ─────────────────────────────────────────────── */
export function Spinner() {
  return (
    <div style={{
      width: 44, height: 44,
      border: "2px solid rgba(255,255,255,0.08)", borderTopColor: "rgba(255,255,255,0.75)",
      borderRadius: "50%", animation: "spin .75s linear infinite",
      margin: "0 auto 18px",
    }} />
  );
}

/* ── Level grid ─────────────────────────────────────────── */
import { LEVELS } from "@/lib/data";

export function LvGrid({ level, setLevel }: { level: string; setLevel: (v: string) => void }) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(5,1fr)", gap: 8, marginBottom: 16 }}>
      {LEVELS.map(lv => (
        <div
          key={lv.id}
          onClick={() => setLevel(lv.id)}
          style={{
            ...glass({
              padding: "12px 8px",
              background: level === lv.id ? "rgba(255,255,255,0.13)" : "rgba(255,255,255,0.04)",
              borderColor: level === lv.id ? "rgba(255,255,255,0.45)" : "rgba(255,255,255,0.09)",
            }),
            cursor: "pointer", textAlign: "center", transition: "all .18s",
          }}
        >
          <div style={{ fontWeight: 700, fontSize: "0.95rem", color: level === lv.id ? "#fff" : "rgba(255,255,255,0.7)", marginBottom: 2 }}>{lv.label}</div>
          <div style={{ fontSize: "0.64rem", color: "rgba(255,255,255,0.35)", lineHeight: 1.4 }}>{lv.sub}</div>
        </div>
      ))}
    </div>
  );
}

/* ── Icons ───────────────────────────────────────────────── */
export const IcoSpeaker = memo(function IcoSpeaker() {
  return (
    <svg width="13" height="13" viewBox="0 0 14 14" fill="none">
      <path d="M2 4.5v5l4-2.5-4-2.5z" fill="currentColor" />
      <path d="M8 3.5c1.4.9 2.5 2 2.5 3.5S9.4 10.1 8 11" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
      <path d="M9.5 1.5c2.5 1.5 3.5 3 3.5 5.5s-1 4-3.5 5.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
    </svg>
  );
});

export const IcoPause = memo(function IcoPause() {
  return (
    <svg width="13" height="13" viewBox="0 0 14 14" fill="none">
      <rect x="2" y="2" width="4" height="10" rx="1" fill="currentColor" />
      <rect x="8" y="2" width="4" height="10" rx="1" fill="currentColor" />
    </svg>
  );
});

export const IcoCheck = memo(function IcoCheck() {
  return (
    <svg width="9" height="9" viewBox="0 0 10 10">
      <polyline points="1,5 4,8 9,2" stroke="white" strokeWidth="2.2" fill="none" />
    </svg>
  );
});

export function IcoHeart({ filled }: { filled: boolean }) {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14"
      fill={filled ? "#fff" : "none"}
      stroke={filled ? "#fff" : "rgba(255,255,255,0.45)"}
      strokeWidth="1.5">
      <path d="M7 12S1 8.5 1 4.5A3 3 0 0 1 7 3.2 3 3 0 0 1 13 4.5C13 8.5 7 12 7 12z" />
    </svg>
  );
}

export const ChevronDown = memo(function ChevronDown() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" style={{ flexShrink: 0 }}>
      <path d="M3 5l4 4 4-4" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
});

export function Wave() {
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 2, marginLeft: 3 }}>
      {[8, 13, 6, 10].map((h, i) => (
        <span key={i} style={{
          display: "inline-block", width: 3, height: h, borderRadius: 2,
          background: "rgba(255,255,255,0.7)",
          animation: `wave .7s ease ${[0, 0.12, 0.24, 0.06][i]}s infinite`,
        }} />
      ))}
    </span>
  );
}
