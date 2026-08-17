# Vishwavrinda Ayurveda API And System Documentation

This document describes the backend software, API contract, authentication, data flow, and important file locations for the Vishwavrinda Ayurveda WhatsApp AI admin system.

## Application Layout

```text
auryvedic/
  backend/
    src/
      constants/   API paths, auth constants, pagination, database names, indexes
      lib/         shared helpers for pagination, ObjectId, regex, body validation
      parsers/     WhatsApp webhook payload parsing
      plugins/     Fastify plugins such as JWT authentication
      routes/      HTTP route handlers
      services/    MongoDB, OpenAI, WhatsApp, appointment, dashboard, knowledge logic
      types/       TypeScript models and Fastify/JWT augmentation
    docs/          API and system documentation
    scripts/       demo seed and PDF generation scripts
    knowledge.md   file-based clinic knowledge used by the AI
  frontend/
    app/           Next.js dashboard pages
    components/    shadcn-style UI components
    lib/           API client, auth helpers, formatting
    proxy.ts       frontend route protection
```

## Authentication

Admin dashboard APIs are protected with JWT.

Public backend routes:

- `GET /`
- `GET /webhook`
- `POST /webhook`
- `POST /api/auth/login`
- `OPTIONS *`

Dev-only protected backend routes, registered only when `ENABLE_TEST_ENDPOINTS=true`:

- `GET /test-whatsapp`
- `GET /test-ai`

Protected backend routes:
- `POST /api/ai/test`
- `GET /api/dashboard/stats`
- `GET /api/appointments`
- `PATCH /api/appointments/:id`
- `GET /api/users`
- `GET /api/users/:phoneNumber/messages`
- `GET /api/knowledge`
- `PUT /api/knowledge`

Admin credentials are read from environment variables:

```text
ADMIN_USERNAME
ADMIN_PASSWORD
role: admin
```

Required backend environment variables:

```text
VERIFY_TOKEN
JWT_SECRET
ADMIN_USERNAME
ADMIN_PASSWORD
OPENAI_API_KEY
WHATSAPP_TOKEN
PHONE_NUMBER_ID
```

Authenticated requests must include:

```http
Authorization: Bearer <jwt>
```

Relevant files:

- `backend/src/plugins/auth.ts`
- `backend/src/routes/auth.ts`
- `backend/src/constants/auth.ts`
- `backend/src/types/auth.ts`
- `frontend/app/login/page.tsx`
- `frontend/proxy.ts`
- `frontend/lib/api-client.ts`

## System Flow

```text
Patient on WhatsApp
  |
  v
Meta WhatsApp Cloud API
  |
  v
POST /webhook
  |
  v
backend/src/parsers/whatsapp.ts
  |
  v
backend/src/services/conversation.ts
  |
  +--> upsertUser(phoneNumber)
  |       |
  |       v
  |     MongoDB users
  |
  +--> createMessage(role=user)
  |       |
  |       v
  |     MongoDB messages
  |
  +--> getKnowledge()
  |       |
  |       v
  |     backend/knowledge.md
  |
  +--> generateReply()
  |       |
  |       v
  |     OpenAI
  |
  +--> AIResult type=message
  |       |
  |       v
  |     sendAndStoreMessage()
  |       |
  |       +--> sendMessages() to WhatsApp
  |       |
  |       +--> createMessage(role=assistant) only after successful send
  |
  +--> AIResult type=appointment
          |
          v
        createAppointment()
          |
          v
        MongoDB appointments
```

## Admin Dashboard Flow

```text
Admin Browser
  |
  v
frontend/proxy.ts checks JWT cookie
  |
  +--> no valid token -> /login
  |
  +--> valid admin token -> dashboard page
          |
          v
        frontend/lib/api-client.ts adds Authorization header
          |
          v
        Fastify preHandler verifies JWT and role=admin
          |
          v
        backend route handler
```

## Data Stores

MongoDB collections:

- `users`
- `messages`
- `appointments`

File storage:

- `backend/knowledge.md`

Indexes created on startup:

- `users.phoneNumber` unique
- `users.lastActiveAt`
- `users.firstSeenAt`
- `messages.phoneNumber + createdAt`
- `appointments.createdAt`
- `appointments.isCompleted + createdAt`
- `appointments.phoneNumber`

## Common Pagination

Query parameters:

- `page`: positive integer, default `1`
- `limit`: positive integer, default `20`, maximum `100`

Response shape:

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

## API Reference

### GET /

File:

- `backend/src/index.ts`

Auth:

- Public

Purpose:

- Health check endpoint.

Parameters:

- None

Returns:

```json
{
  "status": "ok",
  "service": "WhatsApp AI Bot"
}
```

### POST /api/auth/login

Files:

- `backend/src/routes/auth.ts`
- `backend/src/plugins/auth.ts`

Auth:

- Public

Purpose:

- Login for the single hardcoded admin user.

Body:

```json
{
  "username": "admin",
  "password": "<admin password>"
}
```

Returns:

```json
{
  "token": "jwt-token",
  "user": {
    "username": "admin",
    "role": "admin"
  }
}
```

Errors:

- `401` when username or password is incorrect.

### GET /webhook

Files:

- `backend/src/routes/webhook.ts`
- `backend/src/config.ts`

Auth:

- Public

Purpose:

- Meta WhatsApp webhook verification.

Query parameters:

- `hub.mode`: expected `subscribe`
- `hub.verify_token`: must match `VERIFY_TOKEN`
- `hub.challenge`: challenge string returned to Meta

Returns:

- `200` with challenge string when valid.
- `403` with `Verification failed` when invalid.

### POST /webhook

Files:

- `backend/src/routes/webhook.ts`
- `backend/src/parsers/whatsapp.ts`
- `backend/src/services/conversation.ts`

Auth:

- Public

Purpose:

- Receives WhatsApp events, stores messages, calls the AI, sends replies, and creates appointments when the AI returns complete appointment data.

Body:

- Meta WhatsApp webhook payload.

Returns:

```json
{
  "success": true
}
```

Side effects:

- Upserts user in `users`.
- Stores incoming user message in `messages`.
- Reads `backend/knowledge.md`.
- Calls OpenAI.
- Sends WhatsApp message.
- Stores assistant reply only after WhatsApp send succeeds.
- Creates appointment in `appointments` when needed.

### GET /test-whatsapp

File:

- `backend/src/routes/webhook.ts`

Auth:

- Admin JWT required

Purpose:

- Sends a fixed WhatsApp test message.

Parameters:

- None

Returns:

```json
{
  "success": true
}
```

### GET /test-ai

Files:

- `backend/src/routes/webhook.ts`
- `backend/src/services/knowledge.ts`
- `backend/src/services/openai.ts`

Auth:

- Admin JWT required

Purpose:

- Loads knowledge and sends a fixed test question to OpenAI.

Parameters:

- None

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

### POST /api/ai/test

Files:

- `backend/src/routes/ai.ts`
- `backend/src/services/knowledge.ts`
- `backend/src/services/openai.ts`

Auth:

- Admin JWT required

Purpose:

- Tests the AI response flow from an admin/API client without sending a WhatsApp message.
- Loads `backend/knowledge.md`, calls OpenAI, and returns the structured AI result.
- Does not create users, messages, or appointments in MongoDB.

Body:

```json
{
  "message": "What is the consultation fee?"
}
```

Returns:

```json
{
  "success": true,
  "result": {
    "type": "message",
    "reply": "The consultation fee is Rs. 350...",
    "appointment": null
  }
}
```

Appointment result shape:

```json
{
  "success": true,
  "result": {
    "type": "appointment",
    "reply": "Thanks. The clinic team will contact you soon.",
    "appointment": {
      "patientName": "Raj Sharma",
      "preferredDate": "2026-08-15",
      "preferredTime": "5 PM",
      "preferredContactMethod": "whatsapp",
      "reason": "Acidity"
    }
  }
}
```

Errors:

- `400` when message is missing or empty.
- `401` when JWT is missing or invalid.
- `502` when the AI request fails.

### GET /api/dashboard/stats

Files:

- `backend/src/routes/dashboard.ts`
- `backend/src/services/dashboard.ts`

Auth:

- Admin JWT required

Purpose:

- Returns counters and chart trend data for the dashboard.

Query parameters:

- `period`: optional `week` or `month`, default `week`
- `anchorDate`: optional date in `YYYY-MM-DD`; when omitted, today is used

Returns:

```json
{
  "totalUsers": 10,
  "newUsersThisWeek": 4,
  "newUsersThisMonth": 8,
  "totalMessages": 40,
  "totalAppointments": 10,
  "pendingAppointments": 6,
  "completedAppointments": 4,
  "appointmentsThisWeek": 3,
  "appointmentsThisMonth": 9,
  "trend": {
    "period": "week",
    "anchorDate": "2026-07-09",
    "startDate": "2026-07-03",
    "endDate": "2026-07-09",
    "points": [
      {
        "date": "2026-07-03",
        "label": "3 Jul",
        "users": 5,
        "appointments": 2
      }
    ]
  }
}
```

Errors:

- `400` for invalid period.
- `400` for invalid anchor date.
- `401` when JWT is missing or invalid.
- `500` for unexpected database errors.

### GET /api/appointments

Files:

- `backend/src/routes/appointments.ts`
- `backend/src/services/appointments.ts`

Auth:

- Admin JWT required

Purpose:

- Returns paginated appointment requests.

Query parameters:

- `page`: optional positive integer
- `limit`: optional positive integer, max `100`
- `status`: optional `pending`, `done`, or `all`, default `all`
- `dateCategory`: optional `today`, `upcoming`, `past`, or `all`, default `all`
- `search`: optional search across `patientName` and `phoneNumber`

Returns:

```json
{
  "data": [
    {
      "_id": "64f000000000000000000001",
      "patientName": "Aarav Sharma",
      "phoneNumber": "+919880000001",
      "preferredDate": "2026-07-10",
      "preferredTime": "10:30 AM",
      "reason": "Digestive discomfort",
      "preferredContactMethod": "whatsapp",
      "source": "whatsapp",
      "isCompleted": false,
      "createdAt": "2026-07-09T10:00:00.000Z",
      "updatedAt": "2026-07-09T10:00:00.000Z"
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
- `400` for invalid status.
- `400` for invalid date filter.
- `401` when JWT is missing or invalid.
- `500` for unexpected database errors.

### PATCH /api/appointments/:id

Files:

- `backend/src/routes/appointments.ts`
- `backend/src/services/appointments.ts`

Auth:

- Admin JWT required

Purpose:

- Updates only appointment completion status.

Path parameters:

- `id`: MongoDB ObjectId string

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
    "_id": "64f000000000000000000001",
    "patientName": "Aarav Sharma",
    "phoneNumber": "+919880000001",
    "preferredDate": "2026-07-10",
    "preferredTime": "10:30 AM",
    "reason": "Digestive discomfort",
    "preferredContactMethod": "whatsapp",
    "source": "whatsapp",
    "isCompleted": true,
    "createdAt": "2026-07-09T10:00:00.000Z",
    "updatedAt": "2026-07-09T10:15:00.000Z",
    "completedAt": "2026-07-09T10:15:00.000Z"
  }
}
```

Rules:

- Only `isCompleted` can be changed.
- Extra body fields are rejected.
- Setting `isCompleted=true` adds `completedAt`.
- Setting `isCompleted=false` removes `completedAt`.

Errors:

- `400` for invalid ObjectId.
- `400` for invalid body.
- `401` when JWT is missing or invalid.
- `404` when appointment is not found.
- `500` for unexpected database errors.

### GET /api/users

Files:

- `backend/src/routes/users.ts`
- `backend/src/services/users.ts`

Auth:

- Admin JWT required

Purpose:

- Returns paginated WhatsApp users.

Query parameters:

- `page`: optional positive integer
- `limit`: optional positive integer, max `100`
- `search`: optional phone number search

Returns:

```json
{
  "data": [
    {
      "phoneNumber": "+919880000001",
      "firstSeenAt": "2026-07-01T10:00:00.000Z",
      "lastActiveAt": "2026-07-09T10:00:00.000Z",
      "totalMessages": 4,
      "createdAt": "2026-07-01T10:00:00.000Z",
      "updatedAt": "2026-07-09T10:00:00.000Z"
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
- `401` when JWT is missing or invalid.
- `500` for unexpected database errors.

### GET /api/users/:phoneNumber/messages

Files:

- `backend/src/routes/users.ts`
- `backend/src/services/messages.ts`

Auth:

- Admin JWT required

Purpose:

- Returns paginated conversation history for one WhatsApp phone number.

Path parameters:

- `phoneNumber`: WhatsApp phone number

Query parameters:

- `page`: optional positive integer
- `limit`: optional positive integer, max `100`

Returns:

```json
{
  "data": [
    {
      "phoneNumber": "+919880000001",
      "role": "user",
      "content": "Namaste, I need an appointment.",
      "createdAt": "2026-07-09T10:00:00.000Z"
    },
    {
      "phoneNumber": "+919880000001",
      "role": "assistant",
      "content": "Please share your preferred date and time.",
      "createdAt": "2026-07-09T10:01:00.000Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 2,
    "totalPages": 1
  }
}
```

Errors:

- `400` for invalid pagination.
- `400` for invalid phone number.
- `401` when JWT is missing or invalid.
- `500` for unexpected database errors.

### GET /api/knowledge

Files:

- `backend/src/routes/knowledge.ts`
- `backend/src/services/knowledge.ts`

Auth:

- Admin JWT required

Purpose:

- Reads file-based clinic knowledge.

Parameters:

- None

Returns:

```json
{
  "content": "markdown content"
}
```

Errors:

- `401` when JWT is missing or invalid.
- `500` for filesystem errors.

### PUT /api/knowledge

Files:

- `backend/src/routes/knowledge.ts`
- `backend/src/services/knowledge.ts`

Auth:

- Admin JWT required

Purpose:

- Replaces `backend/knowledge.md`.

Body:

```json
{
  "content": "updated markdown content"
}
```

Validation:

- `content` must be a string.
- `content` must not be empty after trimming.
- `content` maximum length is `100000` characters.

Returns:

```json
{
  "success": true
}
```

Errors:

- `400` for invalid content.
- `401` when JWT is missing or invalid.
- `500` for filesystem errors.

## Important Files By Responsibility

- Backend entrypoint: `backend/src/index.ts`
- Route registration: `backend/src/routes/index.ts`
- Auth plugin: `backend/src/plugins/auth.ts`
- API path constants: `backend/src/constants/api.ts`
- Database constants: `backend/src/constants/database.ts`
- Pagination helper: `backend/src/lib/pagination.ts`
- Request body validators: `backend/src/lib/request-body.ts`
- WhatsApp parser: `backend/src/parsers/whatsapp.ts`
- WhatsApp sender: `backend/src/services/whatsapp.ts`
- OpenAI service: `backend/src/services/openai.ts`
- Conversation orchestrator: `backend/src/services/conversation.ts`
- Appointment service: `backend/src/services/appointments.ts`
- User service: `backend/src/services/users.ts`
- Message service: `backend/src/services/messages.ts`
- Dashboard service: `backend/src/services/dashboard.ts`
- Knowledge service: `backend/src/services/knowledge.ts`
- Frontend API client: `frontend/lib/api-client.ts`
- Frontend login page: `frontend/app/login/page.tsx`
- Frontend protected route proxy: `frontend/proxy.ts`

## Final Local Test Report

Date:

- 2026-08-11

Result:

- Backend route/security sweep: `26/26` passed.
- Backend typecheck: passed.
- Frontend typecheck: passed with `--incremental false`.
- Frontend lint: passed.
- Backend npm audit: `0 vulnerabilities`.
- Frontend npm audit: `0 vulnerabilities`.
- WhatsApp E2E simulation: passed.

Verified route behavior:

- Public health endpoint returns `200`.
- Webhook verification accepts the correct `VERIFY_TOKEN` and rejects invalid tokens.
- Login returns a JWT for valid admin credentials and rejects invalid credentials.
- Protected `/api/*` routes reject missing JWT with `401`.
- Validation errors return `400` for bad AI body, bad pagination, bad dashboard filters, bad appointment status/date filter, bad appointment update body, invalid appointment id, and invalid knowledge content.
- AI test answers clinic fee questions from `knowledge.md`.
- WhatsApp E2E simulation saved the user, stored user and assistant messages, sent WhatsApp replies, created an appointment, and updated dashboard counts.
