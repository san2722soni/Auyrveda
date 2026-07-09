Yep. Give Codex this as `CODEX_BACKEND_PLAN.md`. I’ve made it strict so it **implements our architecture instead of inventing its own shit again**.

````md
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
````

Rules:

* phoneNumber uniquely identifies a WhatsApp user.
* A user is created when their first WhatsApp message arrives.
* Existing users must not be duplicated.
* lastActiveAt must update whenever the user sends a message.
* totalMessages counts only incoming user messages.
* Bot/assistant messages must NOT increment totalMessages.

---

# 5. User Service

Create:

src/services/users.ts

Implement these responsibilities:

## upsertUser

Function:

```ts
upsertUser(phoneNumber: string): Promise<void>
```

Behavior:

For a new phone number:

* create the user
* firstSeenAt = current time
* lastActiveAt = current time
* totalMessages = 1
* createdAt = current time
* updatedAt = current time

For an existing phone number:

* update lastActiveAt
* update updatedAt
* increment totalMessages by 1

Use an atomic MongoDB upsert operation where practical.

Do not first query and then insert unless technically necessary.

Avoid race conditions that could create duplicate users.

Create a unique index on phoneNumber during application/database initialization.

---

## getUsers

Implement a service function for paginated user retrieval.

Support:

* page
* limit
* search

Search should match phoneNumber.

Return:

```ts
{
  data: User[],
  pagination: {
    page: number,
    limit: number,
    total: number,
    totalPages: number
  }
}
```

Sort newest/most recently active users first using:

```ts
lastActiveAt: -1
```

Enforce a sensible maximum limit such as 100.

---

# 6. Message Type

Create:

src/types/message.ts

Use:

```ts
export type MessageRole = "user" | "assistant";

export interface Message {
  phoneNumber: string;
  role: MessageRole;
  content: string;
  createdAt: Date;
}
```

Do not store the complete Meta webhook payload.

Do not store OpenAI request payloads.

Do not store OpenAI response payloads.

Only store the final useful conversation messages.

---

# 7. Message Service

Create:

src/services/messages.ts

Implement:

## createMessage

```ts
createMessage(data: {
  phoneNumber: string;
  role: "user" | "assistant";
  content: string;
}): Promise<void>
```

Behavior:

Insert one message into the messages collection.

---

## getMessagesByPhoneNumber

Implement paginated conversation history retrieval.

Support:

* phoneNumber
* page
* limit

Return:

```ts
{
  data: Message[],
  pagination: {
    page: number,
    limit: number,
    total: number,
    totalPages: number
  }
}
```

The API should allow the frontend to display messages in normal chronological conversation order.

Use a sensible pagination strategy.

Create an appropriate MongoDB index for efficient lookup by:

* phoneNumber
* createdAt

---

# 8. Outgoing WhatsApp Message Persistence

The application currently has:

src/services/whatsapp.ts

with:

```ts
sendMessages(phoneNumber, message)
```

Do NOT make the low-level sendMessages function responsible for MongoDB persistence.

Create a new higher-level function or service responsible for:

1. Sending the WhatsApp message.
2. Storing the assistant message after successful sending.

Suggested name:

```ts
sendAndStoreMessage(
  phoneNumber: string,
  message: string
): Promise<void>
```

Suggested file:

src/services/messaging.ts

Behavior:

```text
sendMessages()
↓
If successful
↓
createMessage({
  phoneNumber,
  role: "assistant",
  content: message
})
```

IMPORTANT:

Store the outgoing assistant message only after WhatsApp sending succeeds.

If WhatsApp sending fails, do not store the message as successfully sent.

Do not duplicate this send + store logic throughout conversation.ts.

---

# 9. Conversation Integration

Modify:

src/services/conversation.ts

Current conceptual flow:

```text
Incoming WhatsApp Message
↓
Load knowledge
↓
Generate AIResult
↓
Send message OR create appointment
```

Change it to:

```text
Incoming WhatsApp Message
↓
upsertUser(phoneNumber)
↓
store incoming user message
↓
load knowledge.md
↓
generate AIResult
↓
if normal message
    sendAndStoreMessage()
↓
if appointment
    createAppointment()
    sendAndStoreMessage(server confirmation)
```

Exact requirements:

When handleConversation() receives an incoming message:

1. Call upsertUser(incoming.from).

2. Store the incoming message:

```ts
{
  phoneNumber: incoming.from,
  role: "user",
  content: incoming.text
}
```

3. Load knowledge.

4. Call OpenAI.

5. Handle AIResult.

For:

```ts
type === "message"
```

Use:

```ts
sendAndStoreMessage()
```

For:

```ts
type === "appointment"
```

Call existing:

```ts
createAppointment()
```

Pass:

```ts
{
  ...result.appointment,
  phoneNumber: incoming.from
}
```

After successful appointment creation, send a fixed server-generated confirmation message through:

```ts
sendAndStoreMessage()
```

Suggested confirmation:

"Your appointment request has been submitted successfully. The clinic team will contact you soon."

Do not let OpenAI generate the final successful appointment confirmation.

The confirmation should only be sent after MongoDB successfully creates the appointment.

---

# 10. Appointment Service Extension

Modify:

src/services/appointments.ts

Keep the existing:

```ts
createAppointment()
```

Add:

## getAppointments

Support:

* page
* limit
* status
* search

status values:

* pending
* done
* all

Mapping:

```text
pending → isCompleted: false
done → isCompleted: true
all → no completion filter
```

Search should support useful appointment fields such as:

* patientName
* phoneNumber

Return:

```ts
{
  data: Appointment[],
  pagination: {
    page: number,
    limit: number,
    total: number,
    totalPages: number
  }
}
```

Sort newest appointments first:

```ts
createdAt: -1
```

Enforce a sensible maximum limit such as 100.

---

## updateAppointmentStatus

Implement:

```ts
updateAppointmentStatus(
  id: string,
  isCompleted: boolean
)
```

Behavior:

If changing to:

```ts
isCompleted: true
```

Set:

```ts
isCompleted: true
completedAt: new Date()
updatedAt: new Date()
```

If changing back to:

```ts
isCompleted: false
```

Set:

```ts
isCompleted: false
updatedAt: new Date()
```

and remove/unset:

```ts
completedAt
```

Validate MongoDB ObjectId.

Return a clear not-found result if the appointment does not exist.

Do not allow modification of appointment details.

Only completion status may be changed.

---

# 11. Appointment Routes

Create:

src/routes/appointments.ts

Implement:

## GET /api/appointments

Query parameters:

```text
page
limit
status
search
```

Example:

```text
GET /api/appointments?page=1&limit=20&status=pending
```

Call the appointment service.

Return paginated results.

Validate query parameters.

---

## PATCH /api/appointments/:id

Expected body:

```json
{
  "isCompleted": true
}
```

Only allow isCompleted.

Do not allow arbitrary appointment fields.

Return 404 if appointment does not exist.

Return 400 for invalid ObjectId or invalid request body.

---

# 12. User Routes

Create:

src/routes/users.ts

Implement:

## GET /api/users

Query parameters:

```text
page
limit
search
```

Example:

```text
GET /api/users?page=1&limit=20&search=9162
```

Return paginated users.

---

## GET /api/users/:phoneNumber/messages

Query parameters:

```text
page
limit
```

Example:

```text
GET /api/users/916200855270/messages?page=1&limit=50
```

Return paginated conversation messages.

Validate pagination parameters.

---

# 13. Dashboard Statistics

Create:

src/services/dashboard.ts

Implement a service to calculate dashboard statistics directly from existing collections.

Do not create an analytics collection.

Required statistics:

```ts
{
  totalUsers: number;
  newUsersThisWeek: number;
  newUsersThisMonth: number;

  totalMessages: number;

  totalAppointments: number;
  pendingAppointments: number;
  completedAppointments: number;

  appointmentsThisWeek: number;
  appointmentsThisMonth: number;
}
```

Definitions:

totalUsers:

* total documents in users collection

newUsersThisWeek:

* users whose firstSeenAt is within the current/last 7-day period

newUsersThisMonth:

* users whose firstSeenAt is within the current calendar month or clearly document the chosen interpretation

totalMessages:

* total documents in messages collection, including user and assistant messages

totalAppointments:

* total appointment documents

pendingAppointments:

* isCompleted false

completedAppointments:

* isCompleted true

appointmentsThisWeek:

* appointments created during the current/last 7-day period

appointmentsThisMonth:

* appointments created during the current calendar month or clearly document the chosen interpretation

Use efficient MongoDB count queries.

---

# 14. Dashboard Routes

Create:

src/routes/dashboard.ts

Implement:

## GET /api/dashboard/stats

Return:

```json
{
  "totalUsers": 0,
  "newUsersThisWeek": 0,
  "newUsersThisMonth": 0,
  "totalMessages": 0,
  "totalAppointments": 0,
  "pendingAppointments": 0,
  "completedAppointments": 0,
  "appointmentsThisWeek": 0,
  "appointmentsThisMonth": 0
}
```

---

# 15. Knowledge Management

Existing:

knowledge.md

Existing service:

src/services/knowledge.ts

Review the existing implementation before modifying it.

Add support for:

* reading knowledge
* updating knowledge

Do not move knowledge into MongoDB.

Do not create knowledge versioning.

Do not create a CMS.

---

# 16. Knowledge Routes

Create:

src/routes/knowledge.ts

Implement:

## GET /api/knowledge

Return:

```json
{
  "content": "..."
}
```

The content should be the current knowledge.md content.

---

## PUT /api/knowledge

Expected body:

```json
{
  "content": "updated markdown..."
}
```

Requirements:

* content must be a string
* reject empty content
* apply a sensible maximum content size
* safely write to knowledge.md
* return success response

Use the existing knowledge service where possible.

Prefer an atomic file replacement strategy where practical:

```text
write temporary file
↓
rename/replace knowledge.md
```

This reduces the risk of leaving a partially written knowledge file.

---

# 17. Fastify Route Registration

Modify:

src/index.ts

Register:

```ts
app.register(webhookRoutes);
app.register(appointmentRoutes);
app.register(userRoutes);
app.register(dashboardRoutes);
app.register(knowledgeRoutes);
```

Use the existing Fastify architecture and style.

Do not introduce another web framework.

---

# 18. MongoDB Indexes

Add database initialization logic.

Create indexes for:

users:

```text
phoneNumber UNIQUE
lastActiveAt
firstSeenAt
```

messages:

```text
phoneNumber + createdAt
```

appointments:

```text
createdAt
isCompleted + createdAt
phoneNumber
```

Do not over-index.

Indexes should be created during application startup after MongoDB connects and before the server begins accepting requests.

Keep the initialization logic clean and centralized.

---

# 19. Error Handling

Use Fastify's existing error handling patterns.

Requirements:

* Invalid pagination → 400
* Invalid appointment ID → 400
* Appointment not found → 404
* Invalid appointment PATCH body → 400
* Invalid knowledge content → 400
* Unexpected database/filesystem errors → 500

Do not expose internal stack traces or sensitive environment information in API responses.

Log unexpected errors through Fastify.

---

# 20. Pagination Rules

Use consistent pagination across all APIs.

Defaults:

```text
page = 1
limit = 20
```

Maximum:

```text
limit = 100
```

Response format:

```ts
{
  data: [],
  pagination: {
    page: number,
    limit: number,
    total: number,
    totalPages: number
  }
}
```

Avoid returning entire collections.

---

# 21. Security / Privacy Constraints

Do NOT:

* log OpenAI API keys
* log WhatsApp access tokens
* expose environment variables
* expose full MongoDB connection strings
* store full Meta webhook payloads
* store OpenAI request/response payloads
* create public file-system access
* add authentication in this task

The dashboard APIs are intentionally unauthenticated for V1.

Do not add auth.

---

# 22. Files Expected To Be Created

Expected new files:

```text
src/types/user.ts
src/types/message.ts

src/services/users.ts
src/services/messages.ts
src/services/messaging.ts
src/services/dashboard.ts

src/routes/appointments.ts
src/routes/users.ts
src/routes/dashboard.ts
src/routes/knowledge.ts
```

---

# 23. Files Expected To Be Modified

Likely modifications:

```text
src/index.ts
src/services/conversation.ts
src/services/appointments.ts
src/services/knowledge.ts
src/services/database.ts
```

Modify other files only if technically necessary.

Do not rewrite unrelated files.

---

# 24. Explicitly Forbidden Features

Do NOT implement:

* frontend
* Next.js
* React
* Tailwind
* shadcn
* authentication
* login pages
* Redis
* WebSockets
* Socket.IO
* appointment deletion
* appointment editing
* appointment rescheduling
* appointment conversation state
* partial appointment storage
* analytics collection
* conversations collection
* knowledge MongoDB collection
* AI model changes
* prompt redesign
* deployment configuration
* Docker configuration

---

# 25. Verification

After implementation:

1. Run TypeScript type checking.

2. Run the existing build command if available.

3. Start the backend if the environment allows it.

4. Verify existing webhook behavior was not broken.

5. Verify MongoDB indexes initialize.

6. Verify:

```text
GET /api/dashboard/stats
GET /api/appointments
PATCH /api/appointments/:id
GET /api/users
GET /api/users/:phoneNumber/messages
GET /api/knowledge
PUT /api/knowledge
```

7. Verify pagination.

8. Verify appointment Pending → Done.

9. Verify appointment Done → Pending.

10. Verify new incoming WhatsApp users are stored.

11. Verify incoming messages are stored.

12. Verify outgoing successfully sent messages are stored.

13. Verify failed outgoing messages are NOT stored as successfully sent.

14. Verify normal AI message flow still works.

15. Verify completed appointment flow still works.

Do not claim tests passed unless they were actually executed.

---

# 26. Final Report

After implementation, provide a concise report containing:

* files created
* files modified
* APIs added
* MongoDB collections used
* indexes created
* tests/checks actually executed
* any failures or unverified behavior
* any environment configuration still required

Do not start frontend work.

Do not commit or push changes.

Stop after backend implementation and verification.

````

Then give Codex this prompt:

```text
Read the entire repository first, then read CODEX_BACKEND_PLAN.md completely.

Implement the plan exactly as specified.

Do not redesign the architecture.
Do not add frontend code.
Do not add features outside the plan.
Do not commit or push changes.

Before editing, inspect all existing files referenced by the plan so you preserve the current working WhatsApp, OpenAI, MongoDB, and appointment architecture.

Implement the work in logical phases. After each phase, run relevant type checks or build checks where possible.

At the end, review your own diff against every requirement in CODEX_BACKEND_PLAN.md, fix omissions, run final verification, and provide the requested concise implementation report.
