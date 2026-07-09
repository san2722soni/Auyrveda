# Vishwavrinda Ayurveda Backend API And System Design

Generated for the Fastify + TypeScript WhatsApp AI backend.

## Project Structure

```text
src/
  constants/   Shared API paths, pagination limits, collection names, indexes, and messages
  lib/         Shared helpers for pagination, ObjectId validation, regex escaping, and request body checks
  parsers/     Meta WhatsApp webhook payload parsing
  routes/      Fastify route registration and endpoint handlers
  services/    Business logic, MongoDB access, OpenAI, WhatsApp, and knowledge file operations
  types/       Shared TypeScript data models
```

## System Design

```text
Incoming WhatsApp Message
  |
  v
POST /webhook
  |
  v
src/parsers/whatsapp.ts
  |
  v
src/services/conversation.ts
  |
  +--> upsertUser() ---------------------> MongoDB users
  |
  +--> createMessage(role=user) ----------> MongoDB messages
  |
  +--> getKnowledge() --------------------> knowledge.md
  |
  +--> generateReply() -------------------> OpenAI Responses API
  |
  +--> AIResult type=message
  |       |
  |       v
  |     sendAndStoreMessage()
  |       |
  |       +--> sendMessages() ------------> WhatsApp Cloud API
  |       |
  |       +--> createMessage(role=assistant) after successful send
  |
  +--> AIResult type=appointment
          |
          v
        createAppointment() --------------> MongoDB appointments
          |
          v
        sendAndStoreMessage(server confirmation)
```

## Data Storage

MongoDB collections:

- `users`
- `messages`
- `appointments`

File storage:

- `knowledge.md` remains file-based and is not stored in MongoDB.

Indexes created during database initialization:

- `users`: `phoneNumber` unique, `lastActiveAt`, `firstSeenAt`
- `messages`: `phoneNumber + createdAt`
- `appointments`: `createdAt`, `isCompleted + createdAt`, `phoneNumber`

## Shared Rules

Pagination defaults:

- `page = 1`
- `limit = 20`
- maximum `limit = 100`

Paginated response format:

```json
{
  "data": [],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 0,
    "totalPages": 0
  }
}
```

## API Documentation

### GET /

File:

- `src/index.ts`

Purpose:

- Health check endpoint.

Parameters:

- None.

Returns:

```json
{
  "status": "ok",
  "service": "WhatsApp AI Bot"
}
```

### GET /webhook

Files:

- `src/routes/webhook.ts`
- `src/config.ts`

Purpose:

- Meta WhatsApp webhook verification.

Query parameters:

- `hub.mode`: expected `subscribe`
- `hub.verify_token`: must match `VERIFY_TOKEN`
- `hub.challenge`: returned to Meta when verification succeeds

Returns:

- `200` with the challenge string when valid.
- `403` with `Verification failed` when invalid.

### POST /webhook

Files:

- `src/routes/webhook.ts`
- `src/parsers/whatsapp.ts`
- `src/services/conversation.ts`

Purpose:

- Receives incoming WhatsApp webhook events, parses the incoming message, and starts the AI conversation flow.

Body:

- Meta WhatsApp webhook payload.

Returns:

```json
{
  "success": true
}
```

Side effects:

- Creates or updates a user in `users`.
- Stores incoming user message in `messages`.
- Calls OpenAI.
- Sends WhatsApp reply.
- Stores assistant reply only after WhatsApp send succeeds.
- Creates appointment when AIResult returns a complete appointment.

### GET /test-whatsapp

File:

- `src/routes/webhook.ts`

Purpose:

- Sends a fixed WhatsApp test message using the configured WhatsApp sender.

Parameters:

- None.

Returns:

```json
{
  "success": true
}
```

### GET /test-ai

Files:

- `src/routes/webhook.ts`
- `src/services/knowledge.ts`
- `src/services/openai.ts`

Purpose:

- Loads `knowledge.md` and asks the AI a fixed test question.

Parameters:

- None.

Returns:

```json
{
  "success": true,
  "reply": {
    "type": "message",
    "reply": "string",
    "appointment": null
  }
}
```

### GET /api/dashboard/stats

Files:

- `src/routes/dashboard.ts`
- `src/services/dashboard.ts`

Purpose:

- Returns dashboard counters calculated from existing MongoDB collections.

Parameters:

- None.

Returns:

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

### GET /api/appointments

Files:

- `src/routes/appointments.ts`
- `src/services/appointments.ts`

Purpose:

- Returns paginated appointment requests for dashboard management.

Query parameters:

- `page`: optional positive integer, default `1`
- `limit`: optional positive integer, default `20`, max `100`
- `status`: optional `pending`, `done`, or `all`, default `all`
- `search`: optional text search across `patientName` and `phoneNumber`

Returns:

```json
{
  "data": [
    {
      "_id": "string",
      "patientName": "string",
      "phoneNumber": "string",
      "preferredDate": "string",
      "preferredTime": "string",
      "reason": "string",
      "preferredContactMethod": "call",
      "source": "whatsapp",
      "isCompleted": false,
      "createdAt": "date",
      "updatedAt": "date",
      "completedAt": "date"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 1,
    "totalPages": 1
  }
}
```

Errors:

- `400` for invalid pagination.
- `400` for invalid appointment status.
- `500` for unexpected database errors.

### PATCH /api/appointments/:id

Files:

- `src/routes/appointments.ts`
- `src/services/appointments.ts`

Purpose:

- Updates only the appointment completion status.

Path parameters:

- `id`: MongoDB ObjectId string.

Body:

```json
{
  "isCompleted": true
}
```

Returns:

```json
{
  "success": true,
  "data": {
    "_id": "string",
    "patientName": "string",
    "phoneNumber": "string",
    "preferredDate": "string",
    "preferredTime": "string",
    "reason": "string",
    "preferredContactMethod": "call",
    "source": "whatsapp",
    "isCompleted": true,
    "createdAt": "date",
    "updatedAt": "date",
    "completedAt": "date"
  }
}
```

Rules:

- When `isCompleted` is `true`, `completedAt` is set.
- When `isCompleted` is `false`, `completedAt` is removed.
- No appointment details can be edited by this endpoint.

Errors:

- `400` for invalid ObjectId.
- `400` for invalid body or extra fields.
- `404` when appointment is not found.
- `500` for unexpected database errors.

### GET /api/users

Files:

- `src/routes/users.ts`
- `src/services/users.ts`

Purpose:

- Returns paginated WhatsApp users.

Query parameters:

- `page`: optional positive integer, default `1`
- `limit`: optional positive integer, default `20`, max `100`
- `search`: optional phone number search

Returns:

```json
{
  "data": [
    {
      "phoneNumber": "string",
      "firstSeenAt": "date",
      "lastActiveAt": "date",
      "totalMessages": 1,
      "createdAt": "date",
      "updatedAt": "date"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 1,
    "totalPages": 1
  }
}
```

Errors:

- `400` for invalid pagination.
- `500` for unexpected database errors.

### GET /api/users/:phoneNumber/messages

Files:

- `src/routes/users.ts`
- `src/services/messages.ts`

Purpose:

- Returns paginated conversation history for one WhatsApp phone number.

Path parameters:

- `phoneNumber`: WhatsApp phone number.

Query parameters:

- `page`: optional positive integer, default `1`
- `limit`: optional positive integer, default `20`, max `100`

Returns:

```json
{
  "data": [
    {
      "phoneNumber": "string",
      "role": "user",
      "content": "string",
      "createdAt": "date"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 1,
    "totalPages": 1
  }
}
```

Errors:

- `400` for invalid pagination.
- `400` for invalid phone number.
- `500` for unexpected database errors.

### GET /api/knowledge

Files:

- `src/routes/knowledge.ts`
- `src/services/knowledge.ts`

Purpose:

- Reads the current file-based clinic knowledge.

Parameters:

- None.

Returns:

```json
{
  "content": "markdown content"
}
```

Errors:

- `500` for unexpected filesystem errors.

### PUT /api/knowledge

Files:

- `src/routes/knowledge.ts`
- `src/services/knowledge.ts`

Purpose:

- Replaces `knowledge.md` using a temporary file followed by rename.

Body:

```json
{
  "content": "updated markdown content"
}
```

Validation:

- `content` must be a string.
- `content` must not be empty after trimming.
- `content` must be at most `100000` characters.

Returns:

```json
{
  "success": true
}
```

Errors:

- `400` for invalid knowledge content.
- `500` for unexpected filesystem errors.

## Important Files By Responsibility

- Route registration: `src/routes/index.ts`
- API path constants: `src/constants/api.ts`
- Database collection and index constants: `src/constants/database.ts`
- Pagination constants: `src/constants/pagination.ts`
- Appointment constants: `src/constants/appointments.ts`
- Knowledge constants: `src/constants/knowledge.ts`
- Pagination helper: `src/lib/pagination.ts`
- ObjectId helper: `src/lib/object-id.ts`
- Request body validators: `src/lib/request-body.ts`
- Regex escaping helper: `src/lib/regex.ts`
- WhatsApp parser: `src/parsers/whatsapp.ts`
- WhatsApp sender: `src/services/whatsapp.ts`
- OpenAI service: `src/services/openai.ts`
- Conversation orchestrator: `src/services/conversation.ts`
- Appointment persistence and dashboard operations: `src/services/appointments.ts`
- User persistence and listing: `src/services/users.ts`
- Message persistence and history: `src/services/messages.ts`
- Dashboard stats: `src/services/dashboard.ts`
- Knowledge file service: `src/services/knowledge.ts`
