import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const { question, transcript, level } = await req.json();
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) return NextResponse.json({ error: "No key" }, { status: 500 });

  const prompt = `You are an official OPIc (Oral Proficiency Interview - computer) examiner.

Score this spoken English response based on the 5 official OPIc evaluation criteria.

Question: ${question}
Target Level: ${level}
Spoken Response (transcribed): ${transcript}

Score each of the 5 OPIc criteria from 1–10:
1. Functions/Tasks — Did they answer the question appropriately and completely?
2. Text Type — Did they use varied sentence structures (not just short simple sentences)?
3. Content/Context — Did they stay on topic with relevant, specific content?
4. Comprehensibility — Was the response logically organized (intro, body, conclusion)?
5. Language Control — Grammar accuracy, vocabulary range, natural expression?

Return a JSON object with exactly these fields:
{
  "overallScore": <weighted average 1-10, one decimal>,
  "estimatedLevel": "<IM1|IM2|IM3|IH|AL>",
  "criteria": {
    "functions": { "score": <1-10>, "feedback": "<Vietnamese 1 sentence>" },
    "textType":  { "score": <1-10>, "feedback": "<Vietnamese 1 sentence>" },
    "content":   { "score": <1-10>, "feedback": "<Vietnamese 1 sentence>" },
    "comprehensibility": { "score": <1-10>, "feedback": "<Vietnamese 1 sentence>" },
    "languageControl":   { "score": <1-10>, "feedback": "<Vietnamese 1 sentence>" }
  },
  "strengths": ["<Vietnamese strength 1>", "<Vietnamese strength 2>"],
  "improvements": ["<Vietnamese improvement 1>", "<Vietnamese improvement 2>"],
  "pronunciationNote": "<Vietnamese note on fluency and expression>",
  "overall": "<2-3 sentence Vietnamese summary with encouragement>"
}`;

  const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({
      model: "llama-3.3-70b-versatile",
      max_tokens: 900,
      temperature: 0.3,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: "You are an OPIc examiner. Respond with valid JSON only." },
        { role: "user", content: prompt },
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
