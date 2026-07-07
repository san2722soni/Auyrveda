import OpenAI from "openai";
import { config } from "../config";

if (!config.openaiApiKey) {
  throw new Error("OPENAI_API_KEY is missing");
}

const openai = new OpenAI({
  apiKey: config.openaiApiKey,
});

export async function generateReply(
  message: string,
  knowledge: string
): Promise<string> {
  const response = await openai.responses.create({
    model: "gpt-5.4-nano",

    instructions: `
You are the AI assistant for Vishwavrinda Ayurveda.

Answer the user's question using only the clinic information provided below.

Rules:
- Do not diagnose medical conditions.
- Do not prescribe medicines.
- Do not invent clinic information.
- If information is unavailable, say so and suggest contacting the clinic.
- Keep responses clear, friendly, and concise.

CLINIC INFORMATION:

${knowledge}
`,

    input: message,
  });

  return response.output_text;
}