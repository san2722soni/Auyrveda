import OpenAI from "openai";
import { config } from "../config";
import { AIResult } from "../types/ai";

if (!config.openaiApiKey) {
  throw new Error("OPENAI_API_KEY is missing");
}

const openai = new OpenAI({
  apiKey: config.openaiApiKey,
});

const aiResultFormat = {
  type: "json_schema" as const,
  name: "ai_result",
  strict: true,
  schema: {
    type: "object",
    properties: {
      type: {
        type: "string",
        enum: ["message", "appointment"],
      },
      reply: {
        type: ["string", "null"],
      },
      appointment: {
        anyOf: [
          {
            type: "object",
            properties: {
              patientName: { type: "string" },
              preferredDate: { type: "string" },
              preferredTime: { type: "string" },
              preferredContactMethod: {
                type: "string",
                enum: ["call", "whatsapp"],
              },
              reason: { type: "string" },
            },
            required: [
              "patientName",
              "preferredDate",
              "preferredTime",
              "preferredContactMethod",
              "reason",
            ],
            additionalProperties: false,
          },
          {
            type: "null",
          },
        ],
      },
    },
    required: ["type", "reply", "appointment"],
    additionalProperties: false,
  },
};

export async function generateReply(
  message: string,
  knowledge: string
): Promise<AIResult> {
  const response = await openai.responses.create({
    model: "gpt-5.4-nano",

    instructions: `
You are the AI assistant for Vishwavrinda Ayurveda.

The clinic information provided below is your only source of truth.

Your job:
- Understand the user's message.
- Answer using only the clinic information.
- Follow all rules and workflows defined in the clinic information.

Rules:
- Do not diagnose medical conditions.
- Do not prescribe medicines.
- Do not invent clinic information.
- If information is unavailable, say so and suggest contacting the clinic.
- Keep responses clear, friendly, and concise.

Appointment rules:
- If the user only expresses interest in booking an appointment, ask for all required appointment details defined in the clinic information.
- Return type "appointment" ONLY when all required appointment details are present in the user's current message.
- Use YYYY-MM-DD for appointment preferredDate.
- Otherwise return type "message".

CLINIC INFORMATION:

${knowledge}
`,

    input: message,

    text: {
      format: aiResultFormat,
    },
  });

  return JSON.parse(response.output_text) as AIResult;
}

export async function generateAppointmentReply(
  message: string,
  knowledge: string
): Promise<AIResult> {
  const response = await openai.responses.create({
    model: "gpt-5.4-nano",

    instructions: `
You are only helping Vishwavrinda Ayurveda staff collect appointment details.

The clinic information provided below is your only source of truth.

Rules:
- Do not answer general clinic questions in this mode.
- Do not diagnose medical conditions.
- Do not prescribe medicines.
- Collect only the required appointment details.
- Required details: full name, preferred date, preferred time, reason/problem, preferred contact method.
- Return type "appointment" ONLY when all required details are present in the user's current message.
- Use YYYY-MM-DD for appointment preferredDate.
- Otherwise return type "message" and ask the patient to send the missing appointment details.

CLINIC INFORMATION:

${knowledge}
`,

    input: message,

    text: {
      format: aiResultFormat,
    },
  });

  return JSON.parse(response.output_text) as AIResult;
}
