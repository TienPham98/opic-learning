import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const { question, answer, level } = await req.json();
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) return NextResponse.json({ error: "No key" }, { status: 500 });

  const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({
      model: "llama-3.3-70b-versatile",
      max_tokens: 700,
      temperature: 0.3,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content: "You are an OPIc examiner. Respond with valid JSON only.",
        },
        {
          role: "user",
          content: `Score this OPIc answer.
Question: ${question}
Answer: ${answer}
Target level: ${level}

Return JSON with exactly these fields:
{
  "score": <number 1-10, one decimal>,
  "estimatedLevel": "<IM1|IM2|IM3|IH|AL>",
  "strengths": ["<Vietnamese strength 1>", "<Vietnamese strength 2>"],
  "improvements": ["<Vietnamese tip 1>", "<Vietnamese tip 2>"],
  "overall": "<2-3 sentence Vietnamese summary>"
}`,
        },
      ],
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    return NextResponse.json({ error: err }, { status: res.status });
  }

  const data = await res.json();
  const raw = (data.choices?.[0]?.message?.content ?? "").replace(/```json|```/g, "").trim();
  try {
    const match = raw.match(/\{[\s\S]*\}/);
    return NextResponse.json(JSON.parse(match ? match[0] : raw));
  } catch {
    return NextResponse.json({ error: "Parse failed", raw }, { status: 500 });
  }
}
