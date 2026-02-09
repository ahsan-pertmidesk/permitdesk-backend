import OpenAI from "openai";

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export async function generateReply(userText: string): Promise<string> {
  const resp = await client.chat.completions.create({
    model: "gpt-5.2-2025-12-11",
    messages: [
      { role: "system", content: "You reply briefly and helpfully for WhatsApp." },
      { role: "user", content: userText }
    ],
    temperature: 0.6,
  });

  // content is already a string | null
  const msg = resp.choices[0]?.message?.content;
  return msg || "Thanks! 👍";
}

