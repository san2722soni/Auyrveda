import OpenAI from "openai";
import { config } from "../config";

let openai: OpenAI | null = null;

function getOpenAIClient(): OpenAI {
  if (!config.openaiApiKey) {
    throw new Error("OPENAI_API_KEY is missing");
  }

  if (!openai) {
    openai = new OpenAI({
      apiKey: config.openaiApiKey,
    });
  }

  return openai;
}

export async function generateReply(
  message: string,
  knowledge: string
): Promise<string> {
  const response = await getOpenAIClient().responses.create({
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
