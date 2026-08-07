# Vishwavrinda Ayurveda — Backend + Dashboard Implementation Plan

## Role

You are working as a senior full-stack engineer on an existing TypeScript project.

Your task is to inspect the existing repository, understand the current architecture, preserve all working functionality, and implement the appointment-management backend and a production-quality admin dashboard.

Do not blindly rewrite existing code.

Before implementing anything:

1. Inspect the complete repository.
2. Read `package.json`.
3. Read the existing Fastify server setup.
4. Read all existing types, routes, parsers, services, config, and environment-variable usage.
5. Understand the current WhatsApp webhook pipeline.
6. Preserve existing working functionality.
7. Reuse existing patterns and naming conventions where sensible.
8. Fix small structural inconsistencies if necessary, but do not perform unrelated refactors.

Work autonomously through the phases below.

After each phase:

- run TypeScript checks
- run linting if configured
- run build/tests if configured
- fix errors before continuing
- summarize what was completed

Do not stop after merely creating skeleton files.

---

# PROJECT CONTEXT

This project is for an Ayurvedic clinic called:

Vishwavrinda Ayurveda

The application currently has a Fastify + TypeScript backend.

Existing backend functionality includes:

- Meta WhatsApp webhook verification
- WhatsApp webhook POST receiver
- WhatsApp webhook parser
- strongly typed Meta webhook payloads
- strongly typed internal WhatsApp message model
- clinic knowledge loading from a Markdown file
- OpenAI service
- WhatsApp sending service
- conversation service

Current architecture:

WhatsApp
→ Meta Cloud API
→ POST /webhook
→ WhatsApp Parser
→ Conversation Service
→ Clinic Knowledge
→ OpenAI
→ WhatsApp Sending Service

The existing working code must remain functional.

The project currently uses environment variables similar to:

PORT
OPENAI_API_KEY
WHATSAPP_TOKEN
PHONE_NUMBER_ID
WHATSAPP_BUSINESS_ACCOUNT_ID
VERIFY_TOKEN

Never expose secrets.

Never commit `.env`.

---

# PRODUCT SCOPE

This is NOT:

- a WhatsApp clone
- a full CRM
- a hospital management system
- a complex scheduling platform

Keep the product focused and simple.

The system has two major features:

1. AI WhatsApp clinic assistant
2. Appointment request management dashboard

The appointment system is NOT a real-time calendar scheduling engine.

It simply collects appointment requests from WhatsApp and allows clinic staff to manage them from a dashboard.

---

# CORE PRODUCT FLOW

Normal conversation:

Patient
→ WhatsApp
→ AI assistant
→ Clinic knowledge
→ AI response
→ WhatsApp

Appointment flow:

Patient expresses appointment intent
→ Appointment state machine begins
→ Collect required information
→ Save appointment request
→ Show appointment in dashboard
→ Clinic staff contacts patient
→ Clinic staff marks appointment completed

---

# IMPORTANT ARCHITECTURAL DECISION

OpenAI must NOT control appointment state.

OpenAI may:

- answer clinic questions
- detect appointment intent if necessary

The backend must control:

- appointment flow
- conversation state
- required fields
- validation
- appointment creation
- appointment completion

Use a deterministic backend state machine.

---

# APPOINTMENT FLOW

Example:

Patient:

"I want to book an appointment"

System:

"Sure. What is your name?"

Patient:

"Aswin"

System:

"What date would you prefer?"

Patient:

"Tomorrow"

System:

"What time would you prefer?"

Patient:

"Around 5 PM"

System:

"How would you prefer the clinic to contact you?"

Options:

Call
WhatsApp

Patient:

"Call"

System:

"Please briefly mention the reason for your appointment."

Patient:

"Hair fall consultation"

System:

"Your appointment request has been submitted. The clinic will contact you shortly."

Then save the appointment.

---

# APPOINTMENT DATA MODEL

Use a MongoDB model appropriate for the existing backend architecture.

Conceptual schema:

```ts
interface Appointment {
  patientName: string;

  phoneNumber: string;

  preferredDate?: string;

  preferredTime?: string;

  reason?: string;

  preferredContactMethod: "call" | "whatsapp";

  source: "whatsapp";

  isCompleted: boolean;

  createdAt: Date;

  updatedAt: Date;

  completedAt?: Date;
}





code