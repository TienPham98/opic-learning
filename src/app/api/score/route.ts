import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const { question, answer, level } = await req.json();
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) return NextResponse.json({ error: "No key" }, { status: 500 });

  const prompt = `You are an OPIc examiner. Score this student's English answer.

Question: ${question}
Student answer: ${answer}
Target level: ${level}

Score 1-10 based on OPIc criteria for ${level}: Task completion, Fluency, Vocabulary, Grammar.

Return ONLY valid JSON (no markdown):
{
  "score": 7.5,
  "estimatedLevel": "IM2",
  "strengths": ["Trả lời đúng câu hỏi và có chi tiết", "Dùng từ vựng phù hợp"],
  "improvements": ["Cần thêm ví dụ cụ thể", "Chú ý thì quá khứ"],
  "overall": "Bài làm khá tốt, đạt mức IM2. Cần phát triển ý nhiều hơn để đạt IH."
}`;

  const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: { "Content-Type": "application/json", "Authorization": `Bearer ${apiKey}` },
    body: JSON.stringify({
      model: "llama-3.3-70b-versatile",
      max_tokens: 600,
      temperature: 0.3,
      messages: [
        { role: "system", content: "You are an OPIc examiner. Respond with valid JSON only." },
        { role: "user", content: prompt }
      ]
    })
  });

  if (!res.ok) {
    const err = await res.text();
    return NextResponse.json({ error: err }, { status: res.status });
  }
  const data = await res.json();
  const raw = (data.choices?.[0]?.message?.content || "").replace(/```json|```/g, "").trim();
  const match = raw.match(/\{[\s\S]*\}/);
  if (!match) return NextResponse.json({ error: "No JSON" }, { status: 500 });
  try {
    return NextResponse.json(JSON.parse(match[0]));
  } catch {
    return NextResponse.json({ error: "Parse failed" }, { status: 500 });
  }
}
