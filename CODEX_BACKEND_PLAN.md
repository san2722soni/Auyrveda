# CODEX BACKEND IMPLEMENTATION PLAN

## 1. Objective

Extend the existing Vishwavrinda Ayurveda WhatsApp AI backend with:

- WhatsApp user persistence
- Incoming and outgoing message persistence
- Appointment dashboard APIs
- User APIs
- Conversation history APIs
- Dashboard statistics API
- Knowledge management APIs

The existing architecture has already been designed.

Do NOT redesign the application.

Do NOT create frontend code.

Do NOT add authentication.

Do NOT add Redis.

Do NOT add WebSockets.

Do NOT add Zustand.

Do NOT add a new database architecture.

Do NOT add appointment conversation state.

Do NOT store partial appointments.

Do NOT add appointment deletion.

Do NOT add patient-side appointment editing.

Do NOT modify the core AI architecture unless required for integration with the persistence services described below.

Read the entire existing repository before making changes.

---

# 2. Existing Architecture

The project is a Fastify + TypeScript backend.

Existing important files:

src/
├── config.ts
├── index.ts
│
├── parsers/
│   └── whatsapp.ts
│
├── routes/
│   └── webhook.ts
│
├── services/
│   ├── appointments.ts
│   ├── conversation.ts
│   ├── database.ts
│   ├── knowledge.ts
│   ├── openai.ts
│   └── whatsapp.ts
│
└── types/
    ├── ai.ts
    ├── appointment.ts
    ├── meta.ts
    └── whatsapp.ts

Existing MongoDB connection:

src/services/database.ts

Existing final appointment persistence:

src/services/appointments.ts

Existing AI flow:

WhatsApp
→ webhook
→ conversation.ts
→ knowledge.md
→ OpenAI
→ AIResult

AIResult can return:

- message
- appointment

Normal message:

AIResult
→ WhatsApp reply

Appointment:

AIResult
→ createAppointment()
→ MongoDB
→ server-generated confirmation message

Do not redesign this flow.

---

# 3. Final MongoDB Collections

The application should use exactly these collections:

- users
- messages
- appointments

knowledge.md remains file-based.

Do not create an appointment_states collection.

Do not create an analytics collection.

Do not create a conversations collection.

---

# 4. User Type

Create:

src/types/user.ts

Use this structure:

```ts
export interface User {
  phoneNumber: string;

  firstSeenAt: Date;
  lastActiveAt: Date;

  totalMessages: number;

  createdAt: Date;
  updatedAt: Date;
}