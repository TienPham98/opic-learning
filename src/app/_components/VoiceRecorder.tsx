"use client";
import { useState, useCallback, useRef, useEffect } from "react";
import { transcribeAudio, scoreVoice } from "@/lib/api";
import type { VoiceScore, CriterionScore } from "@/lib/types";
import { CRITERIA_LABELS } from "@/lib/data";
import { FONT, glass, InnerBtn } from "./ui";

/* ── CriteriaBar ──────────────────────────────────────── */
function CriteriaBar({ score, label, feedback }: { score: number; label: string; feedback: string }) {
  const pct = (score / 10) * 100;
  const col = score >= 8 ? "rgba(255,255,255,.9)" : score >= 6 ? "rgba(255,255,255,.75)" : score >= 4 ? "rgba(255,255,255,.55)" : "rgba(255,255,255,.38)";
  return (
    <div style={{ marginBottom: 12 }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 5 }}>
        <span style={{ fontSize: "0.8rem", fontWeight: 500, color: "rgba(255,255,255,.72)" }}>{label}</span>
        <span style={{ fontSize: "0.82rem", fontWeight: 700, color: col }}>{score}/10</span>
      </div>
      <div style={{ height: 5, background: "rgba(255,255,255,.08)", borderRadius: 3, overflow: "hidden", marginBottom: 5 }}>
        <div style={{ height: "100%", width: `${pct}%`, background: col, borderRadius: 3, transition: "width .6s ease" }} />
      </div>
      <p style={{ fontSize: "0.77rem", color: "rgba(255,255,255,.48)", lineHeight: 1.55 }}>{feedback}</p>
    </div>
  );
}

/* ── VoiceScoreDisplay ────────────────────────────────── */
function VoiceScoreDisplay({ r }: { r: VoiceScore }) {
  const [expanded, setExpanded] = useState(true);
  const sc = r.overallScore;
  const alpha = sc >= 8 ? 0.92 : sc >= 6 ? 0.75 : sc >= 4 ? 0.52 : 0.36;
  const entries = Object.entries(r.criteria ?? {}) as [keyof VoiceScore["criteria"], CriterionScore][];

  return (
    <div style={{ ...glass({ padding: 20, marginTop: 14, background: "rgba(255,255,255,.05)" }), animation: "fadeUp .35s ease" }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 16 }}>
        <div style={{ width: 64, height: 64, borderRadius: "50%", background: `rgba(255,255,255,${alpha})`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, border: "2px solid rgba(255,255,255,.25)" }}>
          <span style={{ fontWeight: 800, fontSize: "1.5rem", color: "#000" }}>{sc}</span>
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
            <span style={{ fontWeight: 700, fontSize: "0.95rem" }}>Điểm nói: {sc}/10</span>
            <span style={{ fontSize: "0.72rem", fontWeight: 600, padding: "2px 8px", borderRadius: 20, background: "rgba(255,255,255,.1)", color: "rgba(255,255,255,.7)" }}>Cấp {r.estimatedLevel}</span>
          </div>
          <p style={{ fontSize: "0.82rem", color: "rgba(255,255,255,.52)", lineHeight: 1.55 }}>Chấm điểm theo 5 tiêu chí OPIc chính thức</p>
        </div>
        <button
          onClick={() => setExpanded(e => !e)}
          style={{ background: "rgba(255,255,255,.07)", border: "1px solid rgba(255,255,255,.12)", borderRadius: 7, padding: "5px 11px", color: "rgba(255,255,255,.6)", fontSize: "0.75rem", cursor: "pointer", fontFamily: FONT, fontWeight: 500 }}
        >{expanded ? "Thu gọn" : "Xem chi tiết"}</button>
      </div>

      {/* Overall comment */}
      <p style={{ fontSize: "0.875rem", color: "rgba(255,255,255,.72)", lineHeight: 1.75, marginBottom: expanded ? 16 : 0, padding: "12px 14px", background: "rgba(255,255,255,.04)", borderRadius: 10, borderLeft: "2px solid rgba(255,255,255,.18)" }}>
        {r.overall}
      </p>

      {expanded && (
        <>
          {/* 5 criteria */}
          <div style={{ marginTop: 16, padding: 16, background: "rgba(255,255,255,.03)", borderRadius: 12, border: "1px solid rgba(255,255,255,.07)", marginBottom: 14 }}>
            <div style={{ fontSize: "0.7rem", fontWeight: 700, color: "rgba(255,255,255,.35)", textTransform: "uppercase", letterSpacing: "0.8px", marginBottom: 14 }}>5 Tiêu chí OPIc</div>
            {entries.map(([key, val]) => (
              <CriteriaBar key={key} score={val.score} label={CRITERIA_LABELS[key] ?? key} feedback={val.feedback} />
            ))}
          </div>

          {/* Pronunciation note */}
          {r.pronunciationNote && (
            <div style={{ padding: "12px 14px", background: "rgba(255,255,255,.04)", borderRadius: 10, border: "1px solid rgba(255,255,255,.08)", marginBottom: 12 }}>
              <div style={{ fontSize: "0.68rem", fontWeight: 700, color: "rgba(255,255,255,.35)", textTransform: "uppercase", letterSpacing: "0.6px", marginBottom: 6 }}>🎤 Lưu loát & Phát âm</div>
              <p style={{ fontSize: "0.84rem", color: "rgba(255,255,255,.62)", lineHeight: 1.65 }}>{r.pronunciationNote}</p>
            </div>
          )}

          {/* Strengths & Improvements */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            {r.strengths?.length > 0 && (
              <div style={{ padding: "12px 14px", background: "rgba(255,255,255,.04)", borderRadius: 10, border: "1px solid rgba(255,255,255,.07)" }}>
                <div style={{ fontSize: "0.68rem", fontWeight: 700, color: "rgba(255,255,255,.38)", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 8 }}>Điểm mạnh</div>
                {r.strengths.map((s, i) => <p key={i} style={{ fontSize: "0.82rem", color: "rgba(255,255,255,.65)", padding: "2px 0", lineHeight: 1.6 }}>✓ {s}</p>)}
              </div>
            )}
            {r.improvements?.length > 0 && (
              <div style={{ padding: "12px 14px", background: "rgba(255,255,255,.04)", borderRadius: 10, border: "1px solid rgba(255,255,255,.07)" }}>
                <div style={{ fontSize: "0.68rem", fontWeight: 700, color: "rgba(255,255,255,.35)", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 8 }}>Cần cải thiện</div>
                {r.improvements.map((s, i) => <p key={i} style={{ fontSize: "0.82rem", color: "rgba(255,255,255,.58)", padding: "2px 0", lineHeight: 1.6 }}>↑ {s}</p>)}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}

/* ── Recording state machine ─────────────────────────── */
type RecState = "idle" | "recording" | "recorded" | "transcribing" | "scoring" | "done" | "error";

function fmtTime(s: number) {
  return `${Math.floor(s / 60).toString().padStart(2, "0")}:${(s % 60).toString().padStart(2, "0")}`;
}

/** Pick the first supported MIME type */
function getSupportedMime(): string {
  const types = [
    "audio/webm;codecs=opus",
    "audio/webm",
    "audio/ogg;codecs=opus",
    "audio/mp4",
    "",
  ];
  if (typeof MediaRecorder === "undefined") return "";
  return types.find(t => !t || MediaRecorder.isTypeSupported(t)) ?? "";
}

/** Try multiple getUserMedia constraint sets for max device compatibility */
async function getAudioStream(): Promise<MediaStream> {
  const constraintSets: MediaStreamConstraints[] = [
    { audio: { echoCancellation: true, noiseSuppression: true, sampleRate: 16000 } },
    { audio: { echoCancellation: true, noiseSuppression: true } },
    { audio: true },
  ];
  let lastError: Error = new Error("Microphone not available");
  for (const constraints of constraintSets) {
    try {
      return await navigator.mediaDevices.getUserMedia(constraints);
    } catch (e) {
      lastError = e instanceof Error ? e : new Error(String(e));
    }
  }
  throw lastError;
}

/* ── VoiceRecorder component ─────────────────────────── */
export default function VoiceRecorder({ question, level }: { question: string; level: string }) {
  const [recState,   setRecState]   = useState<RecState>("idle");
  const [duration,   setDuration]   = useState(0);
  const [transcript, setTranscript] = useState("");
  const [voiceScore, setVoiceScore] = useState<VoiceScore | null>(null);
  const [errMsg,     setErrMsg]     = useState("");
  const [audioUrl,   setAudioUrl]   = useState<string | null>(null);

  const mediaRef  = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef  = useRef<ReturnType<typeof setInterval> | null>(null);
  const blobRef   = useRef<Blob | null>(null);

  useEffect(() => () => {
    if (timerRef.current) clearInterval(timerRef.current);
    if (audioUrl) URL.revokeObjectURL(audioUrl);
  }, [audioUrl]);

  const stopTimer = () => {
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
  };

  const startRec = useCallback(async () => {
    setErrMsg(""); setTranscript(""); setVoiceScore(null); setAudioUrl(null);

    // Check browser support first
    if (typeof window === "undefined" || !navigator.mediaDevices?.getUserMedia) {
      setErrMsg("Trình duyệt của bạn không hỗ trợ thu âm. Hãy thử Chrome hoặc Firefox.");
      setRecState("error");
      return;
    }

    let stream: MediaStream;
    try {
      stream = await getAudioStream();
    } catch (e: unknown) {
      const err = e instanceof Error ? e : new Error(String(e));
      const name = (e as { name?: string }).name ?? "";
      let msg = "Không thể truy cập microphone.";
      if (name === "NotFoundError" || name === "DevicesNotFoundError") {
        msg = "Không tìm thấy microphone. Hãy kết nối thiết bị thu âm và thử lại.";
      } else if (name === "NotAllowedError" || name === "PermissionDeniedError") {
        msg = "Bạn chưa cho phép truy cập microphone. Vào cài đặt trình duyệt để cấp quyền.";
      } else if (name === "NotReadableError" || name === "TrackStartError") {
        msg = "Microphone đang được ứng dụng khác sử dụng. Hãy đóng ứng dụng đó và thử lại.";
      } else if (name === "OverconstrainedError") {
        msg = "Microphone không hỗ trợ cấu hình yêu cầu. Thử lại với microphone khác.";
      } else {
        msg = `Lỗi microphone: ${err.message}`;
      }
      setErrMsg(msg);
      setRecState("error");
      return;
    }

    const mimeType = getSupportedMime();
    const mr = new MediaRecorder(stream, mimeType ? { mimeType } : {});
    chunksRef.current = [];

    mr.ondataavailable = e => { if (e.data.size > 0) chunksRef.current.push(e.data); };
    mr.onstop = () => {
      stream.getTracks().forEach(t => t.stop());
      const blob = new Blob(chunksRef.current, { type: mimeType || "audio/webm" });
      blobRef.current = blob;
      setAudioUrl(URL.createObjectURL(blob));
      setRecState("recorded");
    };

    mr.start(250);
    mediaRef.current = mr;
    setDuration(0);
    setRecState("recording");
    timerRef.current = setInterval(() => setDuration(d => d + 1), 1000);
  }, []);

  const stopRec = useCallback(() => {
    stopTimer();
    mediaRef.current?.stop();
  }, []);

  const analyzeVoice = useCallback(async () => {
    if (!blobRef.current) return;
    setRecState("transcribing");
    try {
      const text = await transcribeAudio(blobRef.current);
      if (!text.trim()) throw new Error("Không nhận được nội dung. Hãy thu âm rõ hơn và thử lại.");
      setTranscript(text);
      setRecState("scoring");
      const result = await scoreVoice(question, text, level);
      setVoiceScore(result);
      setRecState("done");
    } catch (e: unknown) {
      setErrMsg(e instanceof Error ? e.message : "Lỗi phân tích");
      setRecState("error");
    }
  }, [question, level]);

  const reset = useCallback(() => {
    stopTimer();
    setRecState("idle"); setDuration(0); setTranscript("");
    setVoiceScore(null); setErrMsg(""); blobRef.current = null;
    if (audioUrl) { URL.revokeObjectURL(audioUrl); setAudioUrl(null); }
  }, [audioUrl]);

  const isRecording   = recState === "recording";
  const isRecorded    = recState === "recorded";
  const isProcessing  = recState === "transcribing" || recState === "scoring";
  const isDone        = recState === "done";
  const isError       = recState === "error";

  return (
    <div style={{ marginTop: 14, ...glass({ padding: 20 }) }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
        <div style={{
          width: 8, height: 8, borderRadius: "50%", flexShrink: 0,
          background: isRecording ? "#ef4444" : "rgba(255,255,255,.3)",
          animation: isRecording ? "pulse 1s infinite" : "none",
          boxShadow: isRecording ? "0 0 8px #ef4444" : "none",
        }} />
        <span style={{ fontSize: "0.72rem", fontWeight: 700, color: "rgba(255,255,255,.4)", textTransform: "uppercase", letterSpacing: "0.8px" }}>
          🎤 Thu âm & Chấm điểm theo tiêu chuẩn OPIc
        </span>
      </div>

      {/* Idle: instructions + criteria list */}
      {recState === "idle" && (
        <>
          <p style={{ fontSize: "0.82rem", color: "rgba(255,255,255,.45)", lineHeight: 1.65, marginBottom: 14 }}>
            Thu âm câu trả lời của bạn. AI chuyển giọng nói thành văn bản rồi chấm điểm theo 5 tiêu chí OPIc chính thức.
          </p>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 5, marginBottom: 16 }}>
            {Object.values(CRITERIA_LABELS).map(label => (
              <div key={label} style={{ display: "flex", alignItems: "center", gap: 5 }}>
                <span style={{ width: 4, height: 4, borderRadius: "50%", background: "rgba(255,255,255,.25)", display: "inline-block", flexShrink: 0 }} />
                <span style={{ fontSize: "0.73rem", color: "rgba(255,255,255,.38)", lineHeight: 1.4 }}>{label}</span>
              </div>
            ))}
          </div>
        </>
      )}

      {/* Error */}
      {isError && (
        <div style={{ padding: "12px 14px", background: "rgba(239,68,68,.08)", border: "1px solid rgba(239,68,68,.2)", borderRadius: 10, marginBottom: 14 }}>
          <p style={{ fontSize: "0.84rem", color: "rgba(255,120,120,.9)", lineHeight: 1.65 }}>⚠️ {errMsg}</p>
        </div>
      )}

      {/* Recording: animated waveform */}
      {isRecording && (
        <div style={{ display: "flex", alignItems: "center", gap: 12, padding: 14, background: "rgba(239,68,68,.06)", borderRadius: 12, border: "1px solid rgba(239,68,68,.15)", marginBottom: 14 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 3 }}>
            {[14, 22, 18, 26, 16, 24, 20, 12, 22, 18].map((h, i) => (
              <span key={i} style={{ display: "inline-block", width: 3, height: h, borderRadius: 2, background: "#ef4444", opacity: 0.8, animation: `wave ${0.5 + (i % 4) * 0.12}s ease ${(i * 0.08) % 0.4}s infinite` }} />
            ))}
          </div>
          <div>
            <p style={{ fontSize: "0.85rem", fontWeight: 600, color: "rgba(255,100,100,.9)", marginBottom: 2 }}>Đang thu âm...</p>
            <p style={{ fontSize: "0.78rem", color: "rgba(255,255,255,.38)", fontVariantNumeric: "tabular-nums" }}>{fmtTime(duration)}</p>
          </div>
        </div>
      )}

      {/* Audio playback */}
      {(isRecorded || isDone) && audioUrl && (
        <div style={{ marginBottom: 14 }}>
          <div style={{ fontSize: "0.68rem", fontWeight: 600, color: "rgba(255,255,255,.35)", textTransform: "uppercase", letterSpacing: "0.6px", marginBottom: 8 }}>
            Bài thu âm ({fmtTime(duration)})
          </div>
          <audio controls src={audioUrl} style={{ width: "100%", height: 36, filter: "invert(1) brightness(.7)" }} />
        </div>
      )}

      {/* Transcript preview */}
      {transcript && (
        <div style={{ ...glass({ padding: "12px 14px", background: "rgba(255,255,255,.04)", marginBottom: 14 }) }}>
          <div style={{ fontSize: "0.68rem", fontWeight: 700, color: "rgba(255,255,255,.35)", textTransform: "uppercase", letterSpacing: "0.6px", marginBottom: 6 }}>Văn bản chuyển đổi (STT)</div>
          <p style={{ fontSize: "0.875rem", color: "rgba(255,255,255,.72)", lineHeight: 1.75, fontStyle: "italic" }}>"{transcript}"</p>
        </div>
      )}

      {/* Processing spinner */}
      {isProcessing && (
        <div style={{ display: "flex", alignItems: "center", gap: 12, padding: 14, background: "rgba(255,255,255,.04)", borderRadius: 12, marginBottom: 14 }}>
          <div style={{ width: 20, height: 20, border: "2px solid rgba(255,255,255,.1)", borderTopColor: "rgba(255,255,255,.7)", borderRadius: "50%", animation: "spin .7s linear infinite", flexShrink: 0 }} />
          <p style={{ fontSize: "0.85rem", color: "rgba(255,255,255,.6)" }}>
            {recState === "transcribing" ? "Đang chuyển giọng nói thành văn bản..." : "AI đang chấm điểm theo 5 tiêu chí OPIc..."}
          </p>
        </div>
      )}

      {/* Score result */}
      {isDone && voiceScore !== null && <VoiceScoreDisplay r={voiceScore} />}

      {/* Action buttons */}
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 14 }}>
        {recState === "idle" && (
          <button
            onClick={startRec}
            style={{ display: "inline-flex", alignItems: "center", gap: 7, padding: "10px 20px", borderRadius: 9999, background: "#ef4444", color: "#fff", border: "none", cursor: "pointer", fontFamily: FONT, fontWeight: 600, fontSize: "0.875rem", boxShadow: "0 4px 16px rgba(239,68,68,.3)" }}
          >
            <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#fff", display: "inline-block" }} />
            Bắt đầu thu âm
          </button>
        )}

        {isRecording && (
          <button
            onClick={stopRec}
            style={{ display: "inline-flex", alignItems: "center", gap: 7, padding: "10px 20px", borderRadius: 9999, background: "rgba(255,255,255,.1)", color: "#fff", border: "1px solid rgba(255,255,255,.2)", cursor: "pointer", fontFamily: FONT, fontWeight: 600, fontSize: "0.875rem" }}
          >
            <span style={{ width: 10, height: 10, borderRadius: 2, background: "#fff", display: "inline-block" }} />
            Dừng thu âm
          </button>
        )}

        {isRecorded && (
          <>
            <button
              onClick={analyzeVoice}
              style={{ display: "inline-flex", alignItems: "center", gap: 7, padding: "10px 22px", borderRadius: 9999, background: "#fff", color: "#000", border: "none", cursor: "pointer", fontFamily: FONT, fontWeight: 700, fontSize: "0.875rem" }}
            >
              ✦ Phân tích & Chấm điểm
            </button>
            <InnerBtn label="Thu âm lại" onClick={reset} variant="ghost" />
          </>
        )}

        {(isDone || isError) && (
          <InnerBtn label="🔄 Thu âm lại" onClick={reset} variant="ghost" />
        )}
      </div>
    </div>
  );
}
