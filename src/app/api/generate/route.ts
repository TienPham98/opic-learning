import { NextRequest, NextResponse } from "next/server";

const GROQ_URL = "https://api.groq.com/openai/v1/chat/completions";

async function groqFetch(apiKey: string, messages: object[], maxTokens: number) {
  const res = await fetch(GROQ_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: "llama-3.3-70b-versatile",
      max_tokens: maxTokens,
      temperature: 0.6,
      response_format: { type: "json_object" },
      messages,
    }),
  });
  return res;
}

function extractJSON(text: string): unknown {
  const cleaned = text.replace(/```json|```/g, "").trim();
  // Try direct parse first
  try { return JSON.parse(cleaned); } catch {}
  // Extract largest {...} block
  const match = cleaned.match(/\{[\s\S]*\}/);
  if (match) return JSON.parse(match[0]);
  throw new Error("No valid JSON found");
}

export async function POST(req: NextRequest) {
  const { prompt, maxTokens = 2000 } = await req.json();
  const apiKey = process.env.GROQ_API_KEY;

  if (!apiKey) {
    return NextResponse.json({ error: "Thiếu GROQ_API_KEY trong .env.local" }, { status: 500 });
  }

  const messages = [
    {
      role: "system",
      content:
        "You are an OPIc English speaking exam expert. " +
        "IMPORTANT: Respond with a single valid JSON object only. " +
        "No markdown, no code fences, no explanation before or after the JSON. " +
        "The entire response must be parseable by JSON.parse().",
    },
    { role: "user", content: prompt },
  ];

  // Try up to 2 times
  for (let attempt = 1; attempt <= 2; attempt++) {
    let res: Response;
    try {
      res = await groqFetch(apiKey, messages, maxTokens);
    } catch (netErr: unknown) {
      const msg = netErr instanceof Error ? netErr.message : String(netErr);
      if (attempt === 2) return NextResponse.json({ error: "Lỗi kết nối: " + msg }, { status: 502 });
      continue;
    }

    if (!res.ok) {
      const body = await res.text();
      console.error("[generate] Groq error", res.status, body);
      if (attempt === 2) return NextResponse.json({ error: `Groq ${res.status}: ${body}` }, { status: res.status });
      continue;
    }

    const data = await res.json();
    const raw: string = data.choices?.[0]?.message?.content ?? "";

    if (!raw) {
      if (attempt === 2) return NextResponse.json({ error: "AI không trả về nội dung" }, { status: 500 });
      continue;
    }

    try {
      const parsed = extractJSON(raw);
      return NextResponse.json(parsed);
    } catch (parseErr) {
      console.error("[generate] Parse error attempt", attempt, raw.slice(0, 400));
      if (attempt === 2) {
        return NextResponse.json({ error: "AI trả về JSON không hợp lệ. Thử lại!", raw: raw.slice(0, 300) }, { status: 500 });
      }
    }
  }

  return NextResponse.json({ error: "Lỗi không xác định" }, { status: 500 });
}
