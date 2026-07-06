import { WhatsAppMessage } from "../types/whatsapp";
import { PreferredContactMethod } from "../types/appointment";
import { createAppointment } from "./appointments";

type AppointmentStep =
  | "patientName"
  | "preferredDate"
  | "preferredTime"
  | "preferredContactMethod"
  | "reason";

interface AppointmentDraft {
  patientName?: string;
  preferredDate?: string;
  preferredTime?: string;
  preferredContactMethod?: PreferredContactMethod;
  reason?: string;
}

interface AppointmentSession {
  step: AppointmentStep;
  draft: AppointmentDraft;
  updatedAt: number;
}

interface AppointmentConversationResult {
  handled: boolean;
  reply?: string;
}

const sessions = new Map<string, AppointmentSession>();
const SESSION_TTL_MS = 30 * 60 * 1000;

const APPOINTMENT_INTENT_PATTERNS = [
  /\bbook(?:ing)?\b.*\b(appointment|consultation|slot|visit)\b/i,
  /\b(appointment|consultation|slot|visit)\b.*\bbook(?:ing)?\b/i,
  /\b(schedule|fix|reserve)\b.*\b(appointment|consultation|slot|visit)\b/i,
  /\b(i want|i need|i would like|can i|please)\b.*\b(appointment|consult|visit|meet|see the doctor)\b/i,
];

function cleanText(text: string): string {
  return text.replace(/\s+/g, " ").trim();
}

function hasAppointmentIntent(text: string): boolean {
  return APPOINTMENT_INTENT_PATTERNS.some((pattern) => pattern.test(text));
}

function normalizeContactMethod(text: string): PreferredContactMethod | null {
  const normalized = cleanText(text).toLowerCase();

  if (["call", "phone", "mobile", "telephone"].includes(normalized)) {
    return "call";
  }

  if (["whatsapp", "whats app", "message", "chat"].includes(normalized)) {
    return "whatsapp";
  }

  return null;
}

function getSession(phoneNumber: string): AppointmentSession | null {
  const session = sessions.get(phoneNumber);

  if (!session) {
    return null;
  }

  if (Date.now() - session.updatedAt > SESSION_TTL_MS) {
    sessions.delete(phoneNumber);
    return null;
  }

  return session;
}

function touchSession(phoneNumber: string, session: AppointmentSession): void {
  sessions.set(phoneNumber, {
    ...session,
    updatedAt: Date.now(),
  });
}

export async function handleAppointmentConversation(
  incoming: WhatsAppMessage
): Promise<AppointmentConversationResult> {
  const text = cleanText(incoming.text);

  if (!text) {
    return { handled: false };
  }

  let session = getSession(incoming.from);

  if (!session && hasAppointmentIntent(text)) {
    session = {
      step: "patientName",
      draft: {},
      updatedAt: Date.now(),
    };
    touchSession(incoming.from, session);

    return {
      handled: true,
      reply: "Sure. What is your name?",
    };
  }

  if (!session) {
    return { handled: false };
  }

  if (["cancel", "stop", "exit"].includes(text.toLowerCase())) {
    sessions.delete(incoming.from);
    return {
      handled: true,
      reply: "No problem. Your appointment request was cancelled.",
    };
  }

  switch (session.step) {
    case "patientName": {
      session.draft.patientName = text;
      session.step = "preferredDate";
      touchSession(incoming.from, session);
      return {
        handled: true,
        reply: "What date would you prefer?",
      };
    }

    case "preferredDate": {
      session.draft.preferredDate = text;
      session.step = "preferredTime";
      touchSession(incoming.from, session);
      return {
        handled: true,
        reply: "What time would you prefer?",
      };
    }

    case "preferredTime": {
      session.draft.preferredTime = text;
      session.step = "preferredContactMethod";
      touchSession(incoming.from, session);
      return {
        handled: true,
        reply: "How would you prefer the clinic to contact you? Reply with Call or WhatsApp.",
      };
    }

    case "preferredContactMethod": {
      const preferredContactMethod = normalizeContactMethod(text);

      if (!preferredContactMethod) {
        return {
          handled: true,
          reply: "Please reply with either Call or WhatsApp.",
        };
      }

      session.draft.preferredContactMethod = preferredContactMethod;
      session.step = "reason";
      touchSession(incoming.from, session);
      return {
        handled: true,
        reply: "Please briefly mention the reason for your appointment.",
      };
    }

    case "reason": {
      session.draft.reason = text;

      if (!session.draft.patientName || !session.draft.preferredContactMethod) {
        sessions.delete(incoming.from);
        return {
          handled: true,
          reply: "Sorry, something went wrong while collecting your appointment details. Please try booking again.",
        };
      }

      await createAppointment({
        patientName: session.draft.patientName,
        phoneNumber: incoming.from,
        preferredDate: session.draft.preferredDate,
        preferredTime: session.draft.preferredTime,
        preferredContactMethod: session.draft.preferredContactMethod,
        reason: session.draft.reason,
      });

      sessions.delete(incoming.from);

      return {
        handled: true,
        reply: "Your appointment request has been submitted. The clinic will contact you shortly.",
      };
    }
  }
}
