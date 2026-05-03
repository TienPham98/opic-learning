import { NextRequest, NextResponse } from "next/server";

export const maxDuration = 30;

export async function POST(req: NextRequest) {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) return NextResponse.json({ error: "No API key" }, { status: 500 });

  let formData: FormData;
  try { formData = await req.formData(); }
  catch { return NextResponse.json({ error: "Invalid form data" }, { status: 400 }); }

  const audioFile = formData.get("audio") as File | null;
  if (!audioFile) return NextResponse.json({ error: "No audio file" }, { status: 400 });

  const groqForm = new FormData();
  groqForm.append("file", audioFile, "recording.webm");
  groqForm.append("model", "whisper-large-v3");
  groqForm.append("language", "en");
  groqForm.append("response_format", "json");

  let res: Response;
  try {
    res = await fetch("https://api.groq.com/openai/v1/audio/transcriptions", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}` },
      body: groqForm,
    });
  } catch (e: unknown) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Network error" }, { status: 502 });
  }

  if (!res.ok) {
    const body = await res.text();
    return NextResponse.json({ error: `Groq ${res.status}: ${body}` }, { status: res.status });
  }

  const data = await res.json();
  return NextResponse.json({ transcript: (data as { text?: string }).text ?? "" });
}
