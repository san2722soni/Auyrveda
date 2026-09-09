import OpenAI from "openai";
import { config } from "../config";
import { AIResult } from "../types/ai";
import { parseClinicDate, toDateKey } from "../lib/clinic-date";
type ConversationInput = string | Array<{ role: "user" | "assistant"; content: string }>;

if (!config.openaiApiKey) {
  throw new Error("OPENAI_API_KEY is missing");
}

const openai = new OpenAI({
  apiKey: config.openaiApiKey,
  timeout: 60_000,
  maxRetries: 1,
});

export function parseResult(text: string): AIResult {
  const result = JSON.parse(text) as AIResult;
  if (result.type === "message" && typeof result.reply === "string" && result.reply.trim()) return result;
  if (result.type === "appointment" && result.appointment) {
    const data = result.appointment;
    if ([data.patientName, data.preferredTime, data.reason].every(value => typeof value === "string" && value.trim()) &&
      typeof data.preferredDate === "string" && parseClinicDate(data.preferredDate) &&
      data.preferredDate >= toDateKey(new Date()) && ["call", "whatsapp"].includes(data.preferredContactMethod)) return result;
    return { type: "message", appointment: null, reply: "Please confirm your name, a valid preferred date (today or later), time, reason, and whether you prefer a call or WhatsApp." };
  }
  throw new Error("AI returned an incomplete response");
}

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
  message: ConversationInput,
  knowledge: string
): Promise<AIResult> {
  const response = await openai.responses.create({
    model: "gpt-5.4-nano",

    instructions: `
You are the AI assistant for Vishwavrinda Ayurveda.
Today's clinic date is ${toDateKey(new Date())} (Asia/Kolkata). Resolve relative dates from this date.

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
- Use conversation history to collect details across messages; ask only for missing details.
- Return type "appointment" ONLY when all required details have been supplied by the patient in this conversation and they intend to book.
- Never reuse a previously submitted appointment or create a booking for a cancellation or rescheduling question.
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

  return parseResult(response.output_text);
}

export async function generateAppointmentReply(
  message: ConversationInput,
  knowledge: string
): Promise<AIResult> {
  const response = await openai.responses.create({
    model: "gpt-5.4-nano",

    instructions: `
You are only helping Vishwavrinda Ayurveda staff collect appointment details.
Today's clinic date is ${toDateKey(new Date())} (Asia/Kolkata). Resolve relative dates from this date.

The clinic information provided below is your only source of truth.

Rules:
- Do not answer general clinic questions in this mode.
- Do not diagnose medical conditions.
- Do not prescribe medicines.
- Collect only the required appointment details.
- Required details: full name, preferred date, preferred time, reason/problem, preferred contact method.
- Use conversation history to collect details across messages. Ask only for missing details.
- Return type "appointment" ONLY when all required details have been supplied by the patient for this booking.
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

  return parseResult(response.output_text);
}
