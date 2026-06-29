import Groq from 'groq-sdk';

export const groq = new Groq({ apiKey: process.env.GROQ_API_KEY ?? '' });
export const GROQ_MODEL = 'llama-3.3-70b-versatile';

export async function callGroq(system: string, user: string, temperature = 0.4): Promise<string> {
  const res = await groq.chat.completions.create({
    model: GROQ_MODEL,
    temperature,
    messages: [{ role: 'system', content: system }, { role: 'user', content: user }],
  });
  return res.choices[0]?.message?.content ?? '';
}

export async function callGroqJSON<T>(system: string, user: string, temperature = 0.3): Promise<T> {
  const raw = await callGroq(system, user, temperature);
  const clean = raw.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim();
  return JSON.parse(clean) as T;
}
