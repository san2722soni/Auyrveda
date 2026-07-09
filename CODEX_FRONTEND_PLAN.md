Yep. Give Codex this as a new file named **`CODEX_FRONTEND_PLAN.md`** at the repo root. This is based on everything we discussed: actual clinic dashboard purpose, existing backend APIs, pagination, no unnecessary Zustand, shadcn, responsive UI, dark/light theme, users, conversations, appointments, knowledge editor, and overview.

````md
# CODEX FRONTEND IMPLEMENTATION PLAN

## 1. Objective

Build a complete, production-quality administrative dashboard frontend for the existing Vishwavrinda Ayurveda WhatsApp AI backend.

The backend already exists and is working.

The frontend must consume the existing backend APIs exactly as implemented.

This task is FRONTEND ONLY.

Before writing any code:

1. Read the entire existing repository.
2. Inspect all backend routes.
3. Inspect all backend services.
4. Inspect the exact API response shapes.
5. Inspect pagination response formats.
6. Inspect query parameter validation.
7. Inspect appointment status update behavior.
8. Inspect knowledge GET/PUT behavior.
9. Do not assume API contracts when the actual backend implementation can be inspected.
10. Preserve all existing backend functionality.

Do not redesign the backend.

Do not modify the WhatsApp architecture.

Do not modify the OpenAI architecture.

Do not modify MongoDB schemas.

Do not modify knowledge.md directly as part of frontend implementation.

Do not add authentication.

Do not add Redis.

Do not add WebSockets.

Do not add Socket.IO.

Do not add unnecessary global state management.

Do not commit or push changes.

---

# 2. Product Context

This application is an administrative dashboard for Vishwavrinda Ayurveda.

The clinic has a WhatsApp AI assistant.

Users communicate with the AI assistant through WhatsApp.

The backend stores:

- WhatsApp users
- incoming user messages
- outgoing assistant messages
- completed appointment requests

The AI uses knowledge.md as the clinic's source of truth.

The dashboard allows clinic staff to:

- view important statistics
- view appointment requests
- mark appointments Pending or Done
- view WhatsApp users
- search users
- inspect conversation histories
- edit clinic knowledge
- save updated knowledge

The dashboard should feel like a real, polished clinic management application.

It should NOT feel like:

- a developer admin panel
- a database browser
- a generated template
- an analytics-heavy enterprise application
- an unnecessarily complicated CRM

The product should be simple, clean, calm, modern, responsive, and easy for non-technical clinic staff to use.

---

# 3. Existing Backend Architecture

The existing backend is built with:

- Node.js
- TypeScript
- Fastify
- MongoDB
- OpenAI
- WhatsApp Cloud API

MongoDB collections:

- users
- messages
- appointments

Clinic knowledge remains file-based:

- knowledge.md

The frontend must use the existing backend APIs.

---

# 4. Existing APIs

Inspect the actual implementation before consuming these APIs.

The expected APIs are:

## Dashboard

GET /api/dashboard/stats

Expected conceptual response:

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
````

Use the actual backend response shape if it differs.

---

## Appointments

GET /api/appointments

Supported conceptual query parameters:

* page
* limit
* status
* search

status:

* pending
* done
* all

Example:

GET /api/appointments?page=1&limit=20&status=pending&search=aswin

Expected conceptual response:

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

Inspect actual backend implementation.

---

## Appointment Status

PATCH /api/appointments/:id

Expected body:

```json
{
  "isCompleted": true
}
```

or:

```json
{
  "isCompleted": false
}
```

This API only changes appointment completion status.

The frontend must not provide appointment editing.

The frontend must not provide appointment deletion.

---

## Users

GET /api/users

Supported conceptual query parameters:

* page
* limit
* search

Example:

GET /api/users?page=1&limit=20&search=9162

Expected conceptual response:

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

Inspect actual backend implementation.

---

## User Conversation History

GET /api/users/:phoneNumber/messages

Supported conceptual query parameters:

* page
* limit

Example:

GET /api/users/916200855270/messages?page=1&limit=50

Expected conceptual response:

```json
{
  "data": [],
  "pagination": {
    "page": 1,
    "limit": 50,
    "total": 0,
    "totalPages": 0
  }
}
```

Messages conceptually contain:

```ts
{
  phoneNumber: string;
  role: "user" | "assistant";
  content: string;
  createdAt: Date;
}
```

Inspect actual backend implementation.

---

## Knowledge

GET /api/knowledge

Expected conceptual response:

```json
{
  "content": "..."
}
```

---

PUT /api/knowledge

Expected conceptual body:

```json
{
  "content": "updated markdown..."
}
```

Inspect actual backend implementation and error responses.

---

# 5. Frontend Technology Stack

Use:

* Next.js
* App Router
* TypeScript
* Tailwind CSS
* shadcn/ui
* TanStack Query
* next-themes
* Lucide React
* Sonner for toast notifications

Do not use:

* Redux
* Zustand
* MobX
* Context for server state
* Axios unless already strongly justified
* Material UI
* Chakra UI
* Ant Design
* Bootstrap
* custom UI libraries

Use native fetch with TanStack Query.

TanStack Query should manage:

* API requests
* loading state
* error state
* caching
* mutations
* query invalidation
* refetching

Do not duplicate server data into global client state.

---

# 6. Frontend Location

Inspect the existing repository structure.

Create the frontend in a clean separate directory such as:

frontend/

unless an appropriate frontend directory already exists.

Expected conceptual structure:

```text
frontend/
├── app/
├── components/
├── hooks/
├── lib/
├── providers/
├── types/
└── public/
```

Do not mix Next.js frontend source files into the existing Fastify backend src directory.

Do not modify backend structure unnecessarily.

---

# 7. Routing Structure

Create these routes:

```text
/
→ redirect to /dashboard

/dashboard
→ Overview

/appointments
→ Appointment management

/users
→ WhatsApp users

/conversations
→ Conversation browser

/knowledge
→ Knowledge editor
```

Do not create:

* login
* signup
* settings
* billing
* profile
* notifications page
* fake reports page
* fake calendar
* fake CRM features

Only build pages backed by real functionality.

---

# 8. Overall Application Layout

Build a responsive dashboard shell.

Desktop:

```text
┌─────────────────────────────────────────────┐
│ Sidebar │ Main Content                      │
│         │                                   │
│ Logo    │ Page Header                       │
│         │                                   │
│ Overview│ Page Content                      │
│ Appoint.│                                   │
│ Users   │                                   │
│ Convers.│                                   │
│ Knowledge                                   │
│         │                                   │
│ Theme   │                                   │
└─────────────────────────────────────────────┘
```

Use a clean shadcn Sidebar implementation if appropriate.

Desktop sidebar should support collapsing if this can be implemented cleanly.

Mobile:

* sidebar becomes a Sheet/drawer
* top header contains mobile navigation trigger
* all pages remain usable
* tables must not overflow unusably

Sidebar navigation:

* Overview
* Appointments
* Users
* Conversations
* Knowledge

Use appropriate Lucide icons.

Suggested icons:

* LayoutDashboard
* CalendarDays
* Users
* MessagesSquare
* BookOpen or FileText

At the bottom:

* Light/Dark theme toggle

Do not add fake user profile data.

Do not add fake clinic subscription information.

---

# 9. Visual Direction

The UI should be:

* modern
* clean
* professional
* calm
* healthcare appropriate
* spacious
* readable
* subtle
* minimal

Avoid:

* excessive gradients
* giant text
* excessive shadows
* excessive rounded cards
* excessive animations
* neon colors
* glassmorphism
* unnecessary decorative graphics
* cluttered dashboards

Use shadcn design conventions.

Use consistent:

* spacing
* typography
* border radius
* card styling
* muted text
* table styling
* empty states
* skeleton states

The dashboard should look excellent in both light and dark themes.

Do not hardcode colors that break dark mode.

Use semantic Tailwind/shadcn variables.

---

# 10. Theme Support

Implement:

* light theme
* dark theme
* system theme support

Use:

* next-themes

Add a polished theme toggle.

Avoid hydration mismatch issues.

All components must be verified visually/conceptually for both themes.

---

# 11. Shared API Layer

Create a clean frontend API layer.

Suggested structure:

```text
lib/
├── api-client.ts
└── api/
    ├── dashboard.ts
    ├── appointments.ts
    ├── users.ts
    └── knowledge.ts
```

Use an environment variable for backend URL.

Example:

```text
NEXT_PUBLIC_API_BASE_URL=http://localhost:3000
```

Do not scatter API URLs throughout components.

Create a reusable fetch wrapper.

Requirements:

* support GET
* support PATCH
* support PUT
* parse JSON
* detect non-successful HTTP status
* throw useful frontend errors
* avoid exposing sensitive information

---

# 12. TanStack Query Setup

Create a QueryClient provider.

Use consistent query keys.

Conceptual keys:

```ts
["dashboard", "stats"]

["appointments", {
  page,
  limit,
  status,
  search
}]

["users", {
  page,
  limit,
  search
}]

["messages", phoneNumber, {
  page,
  limit
}]

["knowledge"]
```

Use mutations for:

* appointment status changes
* knowledge updates

After appointment status mutation:

* invalidate/refetch appointments
* invalidate/refetch dashboard stats

After knowledge update:

* invalidate/refetch knowledge

Use Sonner toast notifications for mutation success/failure.

---

# 13. Shared Pagination Component

Create a reusable pagination component.

It should support:

* current page
* total pages
* previous
* next
* appropriate page information

Example:

```text
Showing page 2 of 8

[Previous] [1] [2] [3] ... [8] [Next]
```

Do not render hundreds of page buttons.

Handle:

* first page
* last page
* zero results
* one page

Pagination must be driven by backend pagination.

Do not fetch entire collections and paginate client-side.

---

# 14. Search Behavior

Appointments and Users pages require search.

Use a search input.

Do not send an API request on every keystroke.

Implement one of:

* approximately 300–500 ms debounce

or

* explicit search submission

Prefer debounced search if implemented cleanly.

When search changes:

* reset page to 1

Search state may remain local to the page.

Do not add Zustand.

---

# 15. Overview Dashboard Page

Route:

/dashboard

Purpose:

Give clinic staff an immediate summary of activity.

Page header:

```text
Overview
A quick look at your clinic's WhatsApp activity.
```

Fetch:

GET /api/dashboard/stats

---

## Primary Statistics Cards

Display useful cards for:

### Total Users

Show:

* totalUsers
* newUsersThisMonth as supporting information

Example:

```text
Total Users

1,284

+84 this month
```

---

### Total Messages

Show:

* totalMessages

Example:

```text
Total Messages

8,432

WhatsApp conversations
```

---

### Pending Appointments

Show:

* pendingAppointments

This should visually communicate that action is required.

Do not use alarming destructive styling unnecessarily.

---

### Completed Appointments

Show:

* completedAppointments

---

## Secondary Activity Section

Display additional information cleanly:

* newUsersThisWeek
* appointmentsThisWeek
* appointmentsThisMonth
* totalAppointments

This can use smaller cards or a compact activity section.

Do not create charts from fake or insufficient historical data.

The backend currently provides aggregate statistics, not time-series analytics.

Therefore:

DO NOT invent line charts.

DO NOT invent bar chart data.

DO NOT fabricate trends.

Use real available statistics only.

---

## Quick Actions

Optionally provide small navigation actions:

* View Pending Appointments
* View Users
* Edit Knowledge

These should navigate to real pages.

Do not overbuild this section.

---

# 16. Dashboard Loading State

While dashboard stats load:

Use Skeleton components matching the final card layouts.

Do not show only a centered spinner.

---

# 17. Dashboard Error State

If dashboard stats fail:

Show a useful error state with:

* concise explanation
* Retry button

Do not expose raw backend stack traces.

---

# 18. Appointments Page

Route:

/appointments

Purpose:

Allow clinic staff to manage appointment requests.

Page header:

```text
Appointments
Review and manage patient appointment requests.
```

Fetch:

GET /api/appointments

---

# 19. Appointment Summary Controls

At the top:

* Search input
* Status filter

Status filter options:

* All
* Pending
* Done

Use shadcn Select or Tabs depending on which produces cleaner UX.

Changing filter:

* reset page to 1
* refetch server data

---

# 20. Appointments Table

Use shadcn Table.

Columns:

* Patient
* Phone Number
* Preferred Date
* Preferred Time
* Contact Method
* Reason
* Status
* Requested At
* Action

Patient:

* show patient name prominently

Phone:

* show WhatsApp phone number

Contact Method:

Use a Badge:

* Call
* WhatsApp

Status:

Use Badge:

* Pending
* Done

Reason:

* prevent extremely long text from destroying table layout
* use truncation where appropriate
* provide full content through Tooltip, Sheet, Dialog, or accessible expansion if needed

Requested At:

* format createdAt clearly

Action:

Pending appointment:

```text
Mark Done
```

Done appointment:

```text
Mark Pending
```

Use the existing PATCH API.

---

# 21. Appointment Status Mutation UX

When user clicks Mark Done or Mark Pending:

* disable the action while mutation is pending
* show loading feedback
* prevent accidental repeated requests
* call PATCH API
* update/refetch appointments
* update/refetch dashboard stats
* show Sonner success toast

Example:

```text
Appointment marked as done.
```

On failure:

```text
Could not update appointment. Please try again.
```

Do not use optimistic updates unless implemented safely and cleanly.

Normal mutation + invalidation is sufficient.

---

# 22. Appointment Mobile UX

A wide table may not work well on mobile.

Implement responsive behavior.

Possible acceptable solutions:

* horizontal scroll with carefully selected minimum widths
* responsive appointment cards on mobile

Prefer the solution that maintains good usability without unnecessary complexity.

Do not hide critical information permanently.

---

# 23. Appointment Empty States

No appointments:

```text
No appointments yet

Appointment requests from WhatsApp will appear here.
```

No search/filter results:

```text
No matching appointments

Try changing your search or status filter.
```

Use appropriate Lucide icon if helpful.

---

# 24. Users Page

Route:

/users

Purpose:

Display all unique WhatsApp users who have interacted with the bot.

Page header:

```text
Users
View people who have interacted with the WhatsApp assistant.
```

Fetch:

GET /api/users

---

# 25. Users Controls

Provide:

* Search by phone number
* Pagination

Search must use backend search.

Reset page to 1 when search changes.

---

# 26. Users Table

Columns:

* Phone Number
* Total Messages
* First Seen
* Last Active
* Action

Phone Number:

Show clearly.

Total Messages:

Remember backend counts incoming user messages only.

First Seen:

Format firstSeenAt.

Last Active:

Format lastActiveAt.

Action:

```text
View Conversation
```

Clicking should navigate to or open the relevant conversation.

Prefer navigating to:

```text
/conversations?phoneNumber=...
```

or an equivalent clean route design.

Do not duplicate conversation UI implementation.

---

# 27. Users Empty States

No users:

```text
No users yet

People who message the WhatsApp assistant will appear here.
```

No search result:

```text
No matching users

Try searching for a different phone number.
```

---

# 28. Conversations Page

Route:

/conversations

Purpose:

Allow clinic staff to inspect stored WhatsApp conversation history.

This is for:

* understanding patient interactions
* reviewing AI replies
* debugging incorrect answers
* seeing commonly asked questions

It is NOT a live chat system.

Do not add:

* reply box
* message sending
* WebSockets
* live typing indicator
* online status
* unread message system

---

# 29. Conversations Layout

Desktop layout:

```text
┌───────────────────────────────────────────────┐
│ Conversations                                 │
├────────────────┬──────────────────────────────┤
│ User List      │ Conversation                 │
│                │                              │
│ Search         │ Phone Number                 │
│                │                              │
│ User 1         │ User Message                 │
│ User 2         │           Assistant Message  │
│ User 3         │ User Message                 │
│                │                              │
└────────────────┴──────────────────────────────┘
```

Use:

* left-side user list
* right-side conversation panel

On mobile:

* show user list first
* selecting a user opens conversation view
* provide clear Back navigation

Do not force desktop split layout onto small screens.

---

# 30. Conversation User List

Reuse GET /api/users.

Support:

* pagination
* search

Display:

* phone number
* last active time
* total messages

Selected user should have clear visual state.

If the page receives a phoneNumber query parameter from Users page:

* select that user
* load their conversation

---

# 31. Conversation Messages

Fetch:

GET /api/users/:phoneNumber/messages

Display:

User messages:

* left aligned

Assistant messages:

* right aligned

Clearly distinguish roles.

Use subtle message bubbles.

Do not imitate WhatsApp branding exactly.

Do not use unsupported WhatsApp logos/assets unnecessarily.

Each message should show:

* content
* formatted timestamp

Handle:

* long text
* multiline messages
* URLs as text safely
* empty conversation
* loading state
* API failure

---

# 32. Conversation Pagination

The backend provides paginated message history.

Implement proper pagination.

Consider conversation UX carefully.

If the backend returns chronological pages, follow the actual backend contract.

Do not assume pagination direction.

Inspect the backend implementation.

The simplest acceptable V1 approach is:

* paginated message history
* Previous / Next controls

If implementing "Load older messages":

* ensure it correctly matches backend pagination order
* do not duplicate messages
* do not reorder incorrectly

Correctness is more important than fancy infinite scrolling.

---

# 33. Knowledge Page

Route:

/knowledge

Purpose:

Allow clinic staff to manage the information used by the WhatsApp AI assistant.

Page header:

```text
Knowledge
Manage the clinic information used by the AI assistant.
```

Fetch:

GET /api/knowledge

Save:

PUT /api/knowledge

---

# 34. Knowledge Editor UX

The doctor/staff should not need to understand the backend.

However, the current source of truth is Markdown.

Build a clean Markdown editing experience.

The simplest recommended V1:

* large editor
* preview mode
* Edit / Preview tabs
* Save button
* unsaved changes awareness

Use shadcn components.

Possible layout:

```text
Knowledge

Keep the information used by your WhatsApp AI assistant up to date.

[Edit] [Preview]

┌──────────────────────────────────────────────┐
│ Markdown editor / Preview                    │
│                                              │
│                                              │
└──────────────────────────────────────────────┘

                              [Save Changes]
```

---

# 35. Markdown Preview

Use a lightweight safe Markdown renderer if necessary.

If adding a dependency, use a well-maintained minimal package.

Do not implement a custom Markdown parser.

Do not allow unsafe raw HTML execution.

The preview should correctly show:

* headings
* paragraphs
* bullet lists
* numbered lists
* emphasis

Keep preview styling readable in light and dark themes.

---

# 36. Knowledge Save Behavior

Save button:

* disabled when no changes exist
* disabled during save
* shows loading state

On successful save:

* update query cache/refetch
* reset dirty state
* show toast

Example:

```text
Knowledge updated successfully.
```

On failure:

```text
Could not update knowledge. Your changes were not saved.
```

Do not silently lose editor content on API failure.

---

# 37. Unsaved Knowledge Changes

If the user modifies knowledge and navigates within the page or reloads:

Implement a reasonable unsaved-changes warning if it can be done cleanly.

At minimum:

* visually indicate unsaved changes
* do not overwrite local editor content because of automatic background refetches

Correct data safety is more important than excessive complexity.

---

# 38. Shared Components

Create reusable components where appropriate.

Possible components:

```text
components/
├── app-sidebar.tsx
├── mobile-nav.tsx
├── page-header.tsx
├── stat-card.tsx
├── data-pagination.tsx
├── empty-state.tsx
├── error-state.tsx
├── theme-toggle.tsx
└── loading-state components
```

Do not over-abstract tiny one-use components.

Prefer readable code.

---

# 39. Frontend Types

Create frontend types based on actual API contracts.

Suggested conceptual files:

```text
types/
├── dashboard.ts
├── appointment.ts
├── user.ts
├── message.ts
├── knowledge.ts
└── api.ts
```

Do not import backend TypeScript source files directly into the Next.js frontend unless the repository already has a properly configured shared package.

Keep frontend/backend boundaries clean.

---

# 40. Date Formatting

Create reusable date formatting helpers.

Use native Intl.DateTimeFormat where practical.

Display dates in a human-readable format.

Examples:

```text
7 Jul 2026
7 Jul 2026, 5:30 PM
2 hours ago
```

Use relative dates only where they improve UX.

Do not add a heavy date library unless necessary.

---

# 41. Number Formatting

Use Intl.NumberFormat for dashboard numbers where appropriate.

Example:

```text
8432 → 8,432
```

---

# 42. Loading States

Every data-driven page must have a deliberate loading state.

Use shadcn Skeleton.

Required:

* Dashboard cards skeleton
* Appointments table skeleton
* Users table skeleton
* Conversations user list skeleton
* Conversation messages skeleton
* Knowledge editor skeleton

Avoid full-page spinners.

---

# 43. Error States

Every API-driven page must handle errors.

Provide:

* clear human-readable message
* Retry action where useful

Do not expose:

* stack traces
* raw HTML errors
* sensitive server details

---

# 44. Empty States

Create polished empty states for:

* no appointments
* no appointment search results
* no users
* no user search results
* no selected conversation
* no messages
* empty knowledge content if backend permits it

Use concise helpful copy.

---

# 45. Toast Notifications

Use Sonner.

Use toasts for:

* appointment marked Done
* appointment marked Pending
* knowledge saved
* mutation failures

Do not show toast notifications for every GET request.

Do not spam notifications.

---

# 46. Accessibility

Use accessible shadcn primitives.

Requirements:

* buttons have accessible labels
* icon-only buttons have aria-label
* inputs have labels or accessible names
* keyboard navigation works
* focus states remain visible
* dialogs/sheets follow accessibility conventions
* sufficient text contrast
* do not rely only on color for status meaning

---

# 47. Responsive Design

Verify all pages conceptually at:

* mobile
* tablet
* laptop
* desktop

Important areas:

* sidebar
* tables
* conversation layout
* knowledge editor
* dashboard cards

Use responsive grids.

Example dashboard card behavior:

```text
Mobile: 1 column
Tablet: 2 columns
Desktop: 4 columns
```

Do not create excessive empty space on large displays.

Use a sensible max content width where appropriate.

---

# 48. Performance

Requirements:

* server-side pagination through backend APIs
* no loading full database collections
* debounced search
* TanStack Query caching
* no unnecessary global state
* no unnecessary re-renders
* no giant frontend dependency additions
* no unnecessary image assets

Use Next.js appropriately.

Do not over-optimize prematurely.

---

# 49. CORS / Backend Connectivity

The frontend and backend may run on separate local ports and later separate deployment origins.

Inspect existing Fastify CORS configuration.

If frontend connectivity requires CORS backend changes:

* make only the minimum required backend change
* use @fastify/cors if appropriate
* configure allowed origin through environment configuration
* do not broadly redesign backend security

Document any backend change clearly.

Do not modify unrelated backend behavior.

---

# 50. Environment Configuration

Frontend should use:

```text
NEXT_PUBLIC_API_BASE_URL=
```

Create:

```text
.env.example
```

Do not commit real secrets.

The frontend must contain no:

* OpenAI key
* WhatsApp token
* MongoDB URI
* Meta secrets

Only public backend base URL belongs in frontend environment configuration.

---

# 51. README

Add/update frontend documentation.

Include:

* installation
* development command
* environment setup
* backend dependency
* build command

Do not rewrite unrelated backend documentation unnecessarily.

---

# 52. Expected Frontend Structure

Use this as guidance, not as a requirement to create meaningless files.

```text
frontend/
├── app/
│   ├── dashboard/
│   │   └── page.tsx
│   │
│   ├── appointments/
│   │   └── page.tsx
│   │
│   ├── users/
│   │   └── page.tsx
│   │
│   ├── conversations/
│   │   └── page.tsx
│   │
│   ├── knowledge/
│   │   └── page.tsx
│   │
│   ├── layout.tsx
│   ├── page.tsx
│   └── globals.css
│
├── components/
│   ├── ui/
│   ├── app-sidebar.tsx
│   ├── page-header.tsx
│   ├── stat-card.tsx
│   ├── data-pagination.tsx
│   ├── empty-state.tsx
│   ├── error-state.tsx
│   └── theme-toggle.tsx
│
├── lib/
│   ├── api-client.ts
│   ├── utils.ts
│   │
│   └── api/
│       ├── dashboard.ts
│       ├── appointments.ts
│       ├── users.ts
│       └── knowledge.ts
│
├── providers/
│   ├── query-provider.tsx
│   └── theme-provider.tsx
│
├── types/
│   ├── dashboard.ts
│   ├── appointment.ts
│   ├── user.ts
│   ├── message.ts
│   ├── knowledge.ts
│   └── api.ts
│
├── public/
├── .env.example
└── README.md
```

---

# 53. Forbidden Features

Do NOT add:

* authentication
* login
* signup
* user roles
* permissions
* Redux
* Zustand
* MobX
* Redis
* WebSockets
* Socket.IO
* live chat
* message sending from dashboard
* appointment deletion
* appointment detail editing
* appointment rescheduling
* patient editing
* knowledge history
* knowledge versioning
* fake charts
* fake analytics
* fake data
* mock API responses in production implementation
* billing pages
* settings pages
* profile pages
* notifications system
* calendar
* CRM pipeline
* appointment creation from dashboard
* AI prompt editor
* OpenAI configuration UI

Build only real features backed by existing APIs.

---

# 54. Implementation Phases

Implement in phases.

## Phase 1: Repository Inspection

* Read entire backend repository.
* Inspect actual APIs.
* Document actual response shapes internally.
* Identify CORS requirements.
* Do not edit yet.

## Phase 2: Next.js Foundation

* Create frontend.
* Configure TypeScript.
* Configure Tailwind.
* Configure shadcn.
* Configure providers.
* Configure theme.
* Configure API base URL.

Run type checking/build.

## Phase 3: Application Shell

* Sidebar.
* Mobile navigation.
* Header.
* Theme toggle.
* Routing.

Run type checking/build.

## Phase 4: API Layer

* API client.
* Types.
* TanStack Query hooks/query functions.
* Error handling.

Run type checking/build.

## Phase 5: Overview

* Stats.
* Loading states.
* Error states.
* Responsive layout.

Run type checking/build.

## Phase 6: Appointments

* Search.
* Filters.
* Server pagination.
* Table.
* Responsive UX.
* Pending/Done mutation.
* Toasts.
* Query invalidation.

Run type checking/build.

## Phase 7: Users

* Search.
* Pagination.
* Table.
* Conversation navigation.

Run type checking/build.

## Phase 8: Conversations

* User browser.
* Search.
* User pagination.
* Message history.
* Message pagination.
* Responsive mobile UX.
* Loading/error/empty states.

Run type checking/build.

## Phase 9: Knowledge

* Load content.
* Editor.
* Preview.
* Save.
* Dirty state.
* Mutation.
* Toasts.
* Data safety.

Run type checking/build.

## Phase 10: Final UX Review

Review:

* light theme
* dark theme
* mobile
* tablet
* desktop
* loading states
* empty states
* errors
* pagination
* search
* mutations
* navigation
* accessibility

Fix issues.

## Phase 11: Final Verification

Run:

* TypeScript checks
* lint
* production build

If backend can run:

* verify API connectivity
* verify dashboard stats
* verify appointments
* verify status changes
* verify users
* verify conversations
* verify knowledge GET
* verify knowledge PUT

Do not claim live verification unless actually performed.

---

# 55. Final Self-Review

Before finishing, inspect the entire diff.

Verify:

* no unnecessary backend changes
* no forbidden features
* no fake data
* no hardcoded API URL
* no secrets
* no Zustand
* no Redux
* pagination is server-driven
* search is server-driven
* appointment mutation invalidates relevant queries
* knowledge mutation is safe
* loading states exist
* errors exist
* empty states exist
* mobile UX works
* dark mode works
* build passes

Fix all discovered issues.

---

# 56. Final Report

After implementation, provide a concise report containing:

* frontend files/directories created
* dependencies added
* pages implemented
* APIs integrated
* reusable components created
* backend modifications, if any
* CORS changes, if any
* environment variables required
* type checks executed
* lint checks executed
* production build result
* live API tests actually executed
* anything that remains unverified

Do not commit.

Do not push.

Stop after frontend implementation and verification.

````

Then send Codex this:

```text
Read the entire repository first, including every existing backend route, service, type, and the actual API response contracts.

Then read CODEX_FRONTEND_PLAN.md completely.

Implement the frontend plan exactly as specified.

Important requirements:

- This is primarily a frontend-only task.
- Preserve the existing working backend architecture.
- Inspect actual API implementations before creating frontend types or API calls.
- Do not invent API contracts.
- Do not add features outside the plan.
- Do not add authentication.
- Do not add Redux or Zustand.
- Use Next.js App Router, TypeScript, Tailwind CSS, shadcn/ui, TanStack Query, next-themes, Lucide React, and Sonner.
- Use real backend APIs only.
- Use server-side pagination through existing backend APIs.
- Build excellent responsive light/dark UI and UX.
- Implement every required loading, error, and empty state.
- Do not create fake charts or fake analytics.
- Do not modify unrelated backend files.
- Do not commit or push.

Work phase by phase.

Run type checking/build checks after each major phase where practical.

After implementation, inspect your entire diff against every section of CODEX_FRONTEND_PLAN.md. Fix omissions and inconsistencies.

Then run final type checking, linting, and production build.

P