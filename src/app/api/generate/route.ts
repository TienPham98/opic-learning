import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const { prompt, maxTokens = 2000 } = await req.json();
  const apiKey = process.env.GROQ_API_KEY;

  if (!apiKey) {
    return NextResponse.json(
      { error: "Thiếu GROQ_API_KEY trong file .env.local" },
      { status: 500 }
    );
  }

  let res: Response;
  try {
    res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "llama-3.3-70b-versatile",
        max_tokens: maxTokens,
        temperature: 0.7,
        messages: [
          {
            role: "system",
            content: "You are an OPIc English speaking exam expert. Always respond with valid JSON only — no markdown, no explanation, no extra text outside the JSON object.",
          },
          { role: "user", content: prompt },
        ],
      }),
    });
  } catch (networkErr: any) {
    console.error("[API] Network error:", networkErr);
    return NextResponse.json(
      { error: "Lỗi kết nối: " + networkErr.message },
      { status: 502 }
    );
  }

  if (!res.ok) {
    const errBody = await res.text();
    console.error("[API] Groq error", res.status, errBody);
    return NextResponse.json(
      { error: "Groq API lỗi " + res.status + ": " + errBody },
      { status: res.status }
    );
  }

  const data = await res.json();
  const raw = data.choices?.[0]?.message?.content || "";

  // Strip markdown fences if present
  const cleaned = raw.replace(/```json|```/g, "").trim();

  // Extract JSON object
  const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    console.error("[API] No JSON in response:", cleaned.slice(0, 300));
    return NextResponse.json({ error: "AI không trả về JSON hợp lệ", raw: cleaned }, { status: 500 });
  }

  try {
    const parsed = JSON.parse(jsonMatch[0]);
    return NextResponse.json(parsed);
  } catch {
    console.error("[API] JSON parse failed:", jsonMatch[0].slice(0, 300));
    return NextResponse.json({ error: "Không thể parse JSON", raw: jsonMatch[0] }, { status: 500 });
  }
}
