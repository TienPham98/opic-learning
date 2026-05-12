"use client";
import { useState, useCallback, useRef, useEffect } from "react";
import { transcribeAudio, scoreVoice } from "@/lib/api";
import type { VoiceScore, CriterionScore } from "@/lib/types";
import { CRITERIA_LABELS } from "@/lib/data";
import { FONT, glass, InnerBtn } from "./ui";

/* ── helpers ─────────────────────────────────────────── */
function fmtTime(s: number) {
  return `${Math.floor(s / 60).toString().padStart(2, "0")}:${(s % 60).toString().padStart(2, "0")}`;
}

/** Best MIME type supported by this browser */
function pickMime(): string {
  if (typeof MediaRecorder === "undefined") return "";
  const candidates = [
    "audio/webm;codecs=opus",
    "audio/webm",
    "audio/ogg;codecs=opus",
    "audio/ogg",
    "audio/mp4",
    "",
  ];
  return candidates.find(t => !t || MediaRecorder.isTypeSupported(t)) ?? "";
}

/** Check current mic permission state (Chrome / Firefox) */
async function queryPermission(): Promise<PermissionState | "unknown"> {
  try {
    if (!navigator.permissions) return "unknown";
    const status = await navigator.permissions.query({ name: "microphone" as PermissionName });
    return status.state;
  } catch {
    return "unknown";
  }
}

/** Request mic with progressive constraint fallback */
async function requestMic(): Promise<MediaStream> {
  const sets: MediaStreamConstraints[] = [
    { audio: { echoCancellation: true, noiseSuppression: true, sampleRate: 16000 } },
    { audio: { echoCancellation: true, noiseSuppression: true } },
    { audio: { echoCancellation: true } },
    { audio: true },
  ];
  let lastErr: unknown;
  for (const c of sets) {
    try { return await navigator.mediaDevices.getUserMedia(c); }
    catch (e) { lastErr = e; }
  }
  throw lastErr;
}

/** Human-readable error from DOMException */
function friendlyErr(e: unknown): { title: string; detail: string; tip: string } {
  const name = (e as { name?: string })?.name ?? "";
  const msg  = (e as { message?: string })?.message ?? "";

  if (name === "NotAllowedError" || name === "PermissionDeniedError") return {
    title:  "Quyền truy cập bị từ chối",
    detail: "Trình duyệt không được phép dùng microphone.",
    tip:    "Nhấn vào icon 🔒 hoặc 🎤 trên thanh địa chỉ → chọn 'Cho phép' → tải lại trang.",
  };
  if (name === "NotFoundError" || name === "DevicesNotFoundError") return {
    title:  "Không tìm thấy microphone",
    detail: "Trình duyệt không phát hiện thiết bị thu âm nào.",
    tip:    "Kiểm tra lại tai nghe/micro đã cắm chưa, hoặc thử với Chrome/Edge.",
  };
  if (name === "NotReadableError" || name === "TrackStartError") return {
    title:  "Microphone đang bận",
    detail: "Thiết bị đang được ứng dụng khác sử dụng.",
    tip:    "Đóng các tab/ứng dụng khác đang dùng mic rồi thử lại.",
  };
  if (name === "OverconstrainedError") return {
    title:  "Cấu hình không tương thích",
    detail: "Microphone không hỗ trợ yêu cầu kỹ thuật.",
    tip:    "Thử dùng mic khác hoặc nâng cấp trình duyệt.",
  };
  if (name === "SecurityError" || msg.includes("secure")) return {
    title:  "Yêu cầu kết nối HTTPS",
    detail: "Thu âm chỉ hoạt động trên HTTPS hoặc localhost.",
    tip:    "Truy cập qua https:// hoặc chạy trên localhost.",
  };
  if (typeof navigator !== "undefined" && !navigator.mediaDevices) return {
    title:  "Trình duyệt không hỗ trợ",
    detail: "API thu âm không khả dụng.",
    tip:    "Dùng Chrome, Edge hoặc Safari phiên bản mới.",
  };
  return {
    title:  "Lỗi microphone",
    detail: msg || "Không thể khởi động thu âm.",
    tip:    "Thử tải lại trang hoặc dùng trình duyệt khác.",
  };
}

/* ── VoiceScoreDisplay ────────────────────────────────── */
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

function VoiceScoreDisplay({ r }: { r: VoiceScore }) {
  const [expanded, setExpanded] = useState(true);
  const sc = r.overallScore;
  const alpha = sc >= 8 ? 0.92 : sc >= 6 ? 0.75 : sc >= 4 ? 0.52 : 0.36;
  const entries = Object.entries(r.criteria ?? {}) as [keyof VoiceScore["criteria"], CriterionScore][];
  return (
    <div style={{ ...glass({ padding: 20, marginTop: 14, background: "rgba(255,255,255,.05)" }), animation: "fadeUp .35s ease" }}>
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
        <button onClick={() => setExpanded(e => !e)} style={{ background: "rgba(255,255,255,.07)", border: "1px solid rgba(255,255,255,.12)", borderRadius: 7, padding: "5px 11px", color: "rgba(255,255,255,.6)", fontSize: "0.75rem", cursor: "pointer", fontFamily: FONT, fontWeight: 500 }}>
          {expanded ? "Thu gọn" : "Chi tiết"}
        </button>
      </div>
      <p style={{ fontSize: "0.875rem", color: "rgba(255,255,255,.72)", lineHeight: 1.75, marginBottom: expanded ? 16 : 0, padding: "12px 14px", background: "rgba(255,255,255,.04)", borderRadius: 10, borderLeft: "2px solid rgba(255,255,255,.18)" }}>{r.overall}</p>
      {expanded && (
        <>
          <div style={{ marginTop: 16, padding: 16, background: "rgba(255,255,255,.03)", borderRadius: 12, border: "1px solid rgba(255,255,255,.07)", marginBottom: 14 }}>
            <div style={{ fontSize: "0.7rem", fontWeight: 700, color: "rgba(255,255,255,.35)", textTransform: "uppercase", letterSpacing: "0.8px", marginBottom: 14 }}>5 Tiêu chí OPIc</div>
            {entries.map(([key, val]) => <CriteriaBar key={key} score={val.score} label={CRITERIA_LABELS[key] ?? key} feedback={val.feedback} />)}
          </div>
          {r.pronunciationNote && (
            <div style={{ padding: "12px 14px", background: "rgba(255,255,255,.04)", borderRadius: 10, border: "1px solid rgba(255,255,255,.08)", marginBottom: 12 }}>
              <div style={{ fontSize: "0.68rem", fontWeight: 700, color: "rgba(255,255,255,.35)", textTransform: "uppercase", letterSpacing: "0.6px", marginBottom: 6 }}>🎤 Lưu loát & Phát âm</div>
              <p style={{ fontSize: "0.84rem", color: "rgba(255,255,255,.62)", lineHeight: 1.65 }}>{r.pronunciationNote}</p>
            </div>
          )}
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
type RecState =
  | "idle"
  | "requesting"   // đang xin quyền
  | "denied"       // bị từ chối
  | "recording"
  | "recorded"
  | "transcribing"
  | "scoring"
  | "done"
  | "error";

export default function VoiceRecorder({ question, level }: { question: string; level: string }) {
  const [state,      setState]      = useState<RecState>("idle");
  const [duration,   setDuration]   = useState(0);
  const [transcript, setTranscript] = useState("");
  const [score,      setScore]      = useState<VoiceScore | null>(null);
  const [errInfo,    setErrInfo]    = useState<{ title: string; detail: string; tip: string } | null>(null);
  const [audioUrl,   setAudioUrl]   = useState<string | null>(null);
  const [permState,  setPermState]  = useState<PermissionState | "unknown">("unknown");

  const mediaRef  = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef  = useRef<ReturnType<typeof setInterval> | null>(null);
  const blobRef   = useRef<Blob | null>(null);
  const mimeRef   = useRef<string>("");

  /* Check permission on mount */
  useEffect(() => {
    queryPermission().then(setPermState);
  }, []);

  /* Cleanup */
  useEffect(() => () => {
    if (timerRef.current) clearInterval(timerRef.current);
    if (audioUrl) URL.revokeObjectURL(audioUrl);
  }, [audioUrl]);

  const stopTimer = () => {
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
  };

  /* ── Start recording ── */
  const startRec = useCallback(async () => {
    setErrInfo(null); setTranscript(""); setScore(null); setAudioUrl(null);

    // Basic API check
    if (typeof window === "undefined" || !navigator?.mediaDevices?.getUserMedia) {
      setErrInfo({ title: "Trình duyệt không hỗ trợ", detail: "API thu âm không khả dụng.", tip: "Dùng Chrome, Edge hoặc Safari mới nhất." });
      setState("error");
      return;
    }

    // Check HTTPS (required except localhost)
    const isSecure = location.protocol === "https:" || location.hostname === "localhost" || location.hostname === "127.0.0.1";
    if (!isSecure) {
      setErrInfo({ title: "Yêu cầu HTTPS", detail: "Thu âm chỉ hoạt động trên kết nối bảo mật.", tip: "Truy cập qua https:// để sử dụng tính năng này." });
      setState("error");
      return;
    }

    // Show requesting UI
    setState("requesting");

    let stream: MediaStream;
    try {
      stream = await requestMic();
    } catch (e) {
      const info = friendlyErr(e);
      setErrInfo(info);
      // Update perm state
      const p = await queryPermission();
      setPermState(p);
      setState(p === "denied" ? "denied" : "error");
      return;
    }

    // Permission granted — update state
    setPermState("granted");

    const mime = pickMime();
    mimeRef.current = mime;
    const mr = new MediaRecorder(stream, mime ? { mimeType: mime } : {});
    chunksRef.current = [];

    mr.ondataavailable = e => { if (e.data.size > 0) chunksRef.current.push(e.data); };
    mr.onstop = () => {
      stream.getTracks().forEach(t => t.stop());
      const blob = new Blob(chunksRef.current, { type: mime || "audio/webm" });
      blobRef.current = blob;
      setAudioUrl(URL.createObjectURL(blob));
      setState("recorded");
    };

    mr.start(250);
    mediaRef.current = mr;
    setDuration(0);
    setState("recording");
    timerRef.current = setInterval(() => setDuration(d => d + 1), 1000);
  }, []);

  const stopRec = useCallback(() => {
    stopTimer();
    mediaRef.current?.stop();
  }, []);

  const analyze = useCallback(async () => {
    if (!blobRef.current) return;
    setState("transcribing");
    try {
      const text = await transcribeAudio(blobRef.current);
      if (!text.trim()) throw new Error("Không nhận được nội dung. Hãy nói rõ hơn và thử lại.");
      setTranscript(text);
      setState("scoring");
      const result = await scoreVoice(question, text, level);
      setScore(result);
      setState("done");
    } catch (e) {
      setErrInfo(friendlyErr(e));
      setState("error");
    }
  }, [question, level]);

  const reset = useCallback(() => {
    stopTimer();
    setState("idle"); setDuration(0); setTranscript("");
    setScore(null); setErrInfo(null); blobRef.current = null;
    if (audioUrl) { URL.revokeObjectURL(audioUrl); setAudioUrl(null); }
    queryPermission().then(setPermState);
  }, [audioUrl]);

  const isRecording  = state === "recording";
  const isRecorded   = state === "recorded";
  const isProcessing = state === "transcribing" || state === "scoring";

  return (
    <div style={{ marginTop: 14, ...glass({ padding: 20 }) }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
        <div style={{ width: 8, height: 8, borderRadius: "50%", flexShrink: 0, background: isRecording ? "#ef4444" : "rgba(255,255,255,.3)", boxShadow: isRecording ? "0 0 8px #ef4444" : "none", animation: isRecording ? "pulse 1s infinite" : "none" }} />
        <span style={{ fontSize: "0.72rem", fontWeight: 700, color: "rgba(255,255,255,.4)", textTransform: "uppercase", letterSpacing: "0.8px" }}>
          🎤 Thu âm & Chấm điểm OPIc
        </span>
        {/* Permission badge */}
        {permState === "granted" && (
          <span style={{ marginLeft: "auto", fontSize: "0.66rem", padding: "2px 8px", borderRadius: 20, background: "rgba(255,255,255,.07)", color: "rgba(255,255,255,.4)", fontFamily: FONT }}>
            ✓ Đã cấp quyền mic
          </span>
        )}
      </div>

      {/* ── IDLE: permission prompt or ready ── */}
      {state === "idle" && (
        <div style={{ marginBottom: 14 }}>
          {permState === "denied" ? (
            <PermDeniedGuide />
          ) : (
            <>
              <p style={{ fontSize: "0.82rem", color: "rgba(255,255,255,.45)", lineHeight: 1.65, marginBottom: 12, fontFamily: FONT }}>
                Thu âm câu trả lời của bạn. AI sẽ chuyển giọng nói → văn bản rồi chấm theo 5 tiêu chí OPIc.
              </p>
              {permState === "prompt" && (
                <div style={{ display: "flex", alignItems: "flex-start", gap: 10, padding: "10px 14px", background: "rgba(255,255,255,.04)", border: "1px solid rgba(255,255,255,.1)", borderRadius: 10, marginBottom: 12 }}>
                  <span style={{ fontSize: "1.1rem", flexShrink: 0 }}>🔔</span>
                  <p style={{ fontSize: "0.8rem", color: "rgba(255,255,255,.55)", lineHeight: 1.6, fontFamily: FONT }}>
                    Nhấn <strong style={{ color: "#fff" }}>Bắt đầu thu âm</strong>, trình duyệt sẽ hỏi quyền microphone — chọn <strong style={{ color: "#fff" }}>"Cho phép"</strong>.
                  </p>
                </div>
              )}
              <CriteriaList />
            </>
          )}
        </div>
      )}

      {/* ── REQUESTING ── */}
      {state === "requesting" && (
        <div style={{ display: "flex", alignItems: "center", gap: 12, padding: 14, background: "rgba(255,255,255,.04)", borderRadius: 12, marginBottom: 14 }}>
          <div style={{ width: 20, height: 20, border: "2px solid rgba(255,255,255,.1)", borderTopColor: "rgba(255,255,255,.7)", borderRadius: "50%", animation: "spin .7s linear infinite", flexShrink: 0 }} />
          <div>
            <p style={{ fontSize: "0.85rem", fontWeight: 600, color: "rgba(255,255,255,.8)", fontFamily: FONT, marginBottom: 2 }}>Đang xin quyền microphone...</p>
            <p style={{ fontSize: "0.77rem", color: "rgba(255,255,255,.4)", fontFamily: FONT }}>Vui lòng nhấn "Cho phép" khi trình duyệt hỏi.</p>
          </div>
        </div>
      )}

      {/* ── DENIED ── */}
      {state === "denied" && <PermDeniedGuide onRetry={reset} />}

      {/* ── ERROR ── */}
      {state === "error" && errInfo && (
        <div style={{ padding: "14px 16px", background: "rgba(239,68,68,.08)", border: "1px solid rgba(239,68,68,.2)", borderRadius: 12, marginBottom: 14 }}>
          <p style={{ fontWeight: 700, fontSize: "0.88rem", color: "#fca5a5", marginBottom: 4, fontFamily: FONT }}>⚠️ {errInfo.title}</p>
          <p style={{ fontSize: "0.82rem", color: "rgba(255,150,150,.8)", marginBottom: 8, lineHeight: 1.55, fontFamily: FONT }}>{errInfo.detail}</p>
          <div style={{ display: "flex", alignItems: "flex-start", gap: 6, padding: "8px 12px", background: "rgba(255,255,255,.05)", borderRadius: 8 }}>
            <span style={{ fontSize: "0.9rem", flexShrink: 0 }}>💡</span>
            <p style={{ fontSize: "0.78rem", color: "rgba(255,255,255,.55)", lineHeight: 1.6, fontFamily: FONT }}>{errInfo.tip}</p>
          </div>
        </div>
      )}

      {/* ── RECORDING: waveform ── */}
      {isRecording && (
        <div style={{ display: "flex", alignItems: "center", gap: 12, padding: 14, background: "rgba(239,68,68,.06)", borderRadius: 12, border: "1px solid rgba(239,68,68,.15)", marginBottom: 14 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 3 }}>
            {[14, 22, 18, 26, 16, 24, 20, 12, 22, 18].map((h, i) => (
              <span key={i} style={{ display: "inline-block", width: 3, height: h, borderRadius: 2, background: "#ef4444", opacity: 0.8, animation: `wave ${0.5 + (i % 4) * 0.12}s ease ${(i * 0.08) % 0.4}s infinite` }} />
            ))}
          </div>
          <div>
            <p style={{ fontSize: "0.85rem", fontWeight: 600, color: "rgba(255,100,100,.9)", marginBottom: 2, fontFamily: FONT }}>Đang thu âm...</p>
            <p style={{ fontSize: "0.78rem", color: "rgba(255,255,255,.38)", fontVariantNumeric: "tabular-nums", fontFamily: FONT }}>{fmtTime(duration)}</p>
          </div>
        </div>
      )}

      {/* ── Audio playback ── */}
      {(isRecorded || state === "done") && audioUrl && (
        <div style={{ marginBottom: 14 }}>
          <p style={{ fontSize: "0.68rem", fontWeight: 600, color: "rgba(255,255,255,.35)", textTransform: "uppercase", letterSpacing: "0.6px", marginBottom: 8, fontFamily: FONT }}>
            Bài thu âm ({fmtTime(duration)})
          </p>
          <audio controls src={audioUrl} style={{ width: "100%", height: 36, filter: "invert(1) brightness(.7)" }} />
        </div>
      )}

      {/* ── Transcript ── */}
      {transcript && (
        <div style={{ ...glass({ padding: "12px 14px", background: "rgba(255,255,255,.04)", marginBottom: 14 }) }}>
          <p style={{ fontSize: "0.68rem", fontWeight: 700, color: "rgba(255,255,255,.35)", textTransform: "uppercase", letterSpacing: "0.6px", marginBottom: 6, fontFamily: FONT }}>Văn bản chuyển đổi (STT)</p>
          <p style={{ fontSize: "0.875rem", color: "rgba(255,255,255,.72)", lineHeight: 1.75, fontStyle: "italic", fontFamily: FONT }}>"{transcript}"</p>
        </div>
      )}

      {/* ── Processing ── */}
      {isProcessing && (
        <div style={{ display: "flex", alignItems: "center", gap: 12, padding: 14, background: "rgba(255,255,255,.04)", borderRadius: 12, marginBottom: 14 }}>
          <div style={{ width: 20, height: 20, border: "2px solid rgba(255,255,255,.1)", borderTopColor: "rgba(255,255,255,.7)", borderRadius: "50%", animation: "spin .7s linear infinite", flexShrink: 0 }} />
          <p style={{ fontSize: "0.85rem", color: "rgba(255,255,255,.6)", fontFamily: FONT }}>
            {state === "transcribing" ? "Đang chuyển giọng nói thành văn bản..." : "AI đang chấm điểm theo 5 tiêu chí OPIc..."}
          </p>
        </div>
      )}

      {/* ── Score result ── */}
      {state === "done" && score && <VoiceScoreDisplay r={score} />}

      {/* ── Action buttons ── */}
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 14 }}>
        {state === "idle" && permState !== "denied" && (
          <button onClick={startRec} style={{ display: "inline-flex", alignItems: "center", gap: 7, padding: "10px 20px", borderRadius: 9999, background: "#ef4444", color: "#fff", border: "none", cursor: "pointer", fontFamily: FONT, fontWeight: 600, fontSize: "0.875rem", boxShadow: "0 4px 16px rgba(239,68,68,.3)" }}>
            <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#fff", display: "inline-block" }} />
            Bắt đầu thu âm
          </button>
        )}
        {isRecording && (
          <button onClick={stopRec} style={{ display: "inline-flex", alignItems: "center", gap: 7, padding: "10px 20px", borderRadius: 9999, background: "rgba(255,255,255,.1)", color: "#fff", border: "1px solid rgba(255,255,255,.2)", cursor: "pointer", fontFamily: FONT, fontWeight: 600, fontSize: "0.875rem" }}>
            <span style={{ width: 10, height: 10, borderRadius: 2, background: "#fff", display: "inline-block" }} />
            Dừng thu âm
          </button>
        )}
        {isRecorded && (
          <>
            <button onClick={analyze} style={{ display: "inline-flex", alignItems: "center", gap: 7, padding: "10px 22px", borderRadius: 9999, background: "#fff", color: "#000", border: "none", cursor: "pointer", fontFamily: FONT, fontWeight: 700, fontSize: "0.875rem" }}>
              ✦ Phân tích & Chấm điểm
            </button>
            <InnerBtn label="Thu âm lại" onClick={reset} variant="ghost" />
          </>
        )}
        {(state === "done" || state === "error") && (
          <InnerBtn label="🔄 Thu âm lại" onClick={reset} variant="ghost" />
        )}
      </div>
    </div>
  );
}

/* ── Criteria legend ─────────────────────────────────── */
function CriteriaList() {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 5 }}>
      {Object.values(CRITERIA_LABELS).map(label => (
        <div key={label} style={{ display: "flex", alignItems: "center", gap: 5 }}>
          <span style={{ width: 4, height: 4, borderRadius: "50%", background: "rgba(255,255,255,.25)", display: "inline-block", flexShrink: 0 }} />
          <span style={{ fontSize: "0.73rem", color: "rgba(255,255,255,.38)", lineHeight: 1.4, fontFamily: FONT }}>{label}</span>
        </div>
      ))}
    </div>
  );
}

/* ── Permission denied guide ─────────────────────────── */
function PermDeniedGuide({ onRetry }: { onRetry?: () => void }) {
  const isIOS    = typeof navigator !== "undefined" && /iP(hone|ad|od)/.test(navigator.userAgent);
  const isAndroid= typeof navigator !== "undefined" && /Android/.test(navigator.userAgent);

  return (
    <div style={{ padding: "16px", background: "rgba(245,158,11,.07)", border: "1px solid rgba(245,158,11,.2)", borderRadius: 12, marginBottom: 14 }}>
      <p style={{ fontWeight: 700, fontSize: "0.88rem", color: "#fcd34d", marginBottom: 10, fontFamily: FONT }}>🔒 Quyền microphone bị từ chối</p>
      <p style={{ fontSize: "0.82rem", color: "rgba(255,255,255,.6)", marginBottom: 12, lineHeight: 1.65, fontFamily: FONT }}>
        Trình duyệt đã chặn quyền truy cập micro. Làm theo hướng dẫn bên dưới để mở lại:
      </p>

      <div style={{ display: "grid", gap: 8 }}>
        {/* Chrome PC */}
        {!isIOS && !isAndroid && (
          <Step n={1} text='Nhấn vào icon 🔒 hoặc 🎤 bên trái thanh địa chỉ → chọn "Quyền trang web"' />
        )}
        {/* Chrome Android */}
        {isAndroid && (
          <Step n={1} text='Nhấn icon 🔒 trên thanh địa chỉ → "Quyền" → bật Microphone' />
        )}
        {/* iOS Safari */}
        {isIOS && (
          <Step n={1} text='Vào Cài đặt iOS → Safari → Microphone → chọn "Cho phép"' />
        )}
        <Step n={2} text='Đặt Microphone thành "Cho phép"' />
        <Step n={3} text='Tải lại trang rồi thử lại' />
      </div>

      {onRetry && (
        <button onClick={onRetry} style={{ marginTop: 14, display: "inline-flex", alignItems: "center", gap: 6, padding: "8px 16px", borderRadius: 9999, background: "rgba(255,255,255,.1)", color: "#fff", border: "1px solid rgba(255,255,255,.15)", cursor: "pointer", fontFamily: FONT, fontWeight: 500, fontSize: "0.82rem" }}>
          🔄 Thử lại sau khi cấp quyền
        </button>
      )}
    </div>
  );
}

function Step({ n, text }: { n: number; text: string }) {
  return (
    <div style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
      <span style={{ width: 20, height: 20, borderRadius: "50%", background: "rgba(245,158,11,.25)", border: "1px solid rgba(245,158,11,.4)", color: "#fcd34d", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "0.68rem", fontWeight: 700, flexShrink: 0 }}>{n}</span>
      <p style={{ fontSize: "0.8rem", color: "rgba(255,255,255,.6)", lineHeight: 1.6, fontFamily: FONT }}>{text}</p>
    </div>
  );
}
