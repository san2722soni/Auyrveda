# Vishwavrinda Ayurveda Dashboard

Administrative dashboard for the existing Fastify WhatsApp AI backend.

## Setup

```bash
npm install
cp .env.example .env.local
```

Set:

```text
NEXT_PUBLIC_API_BASE_URL=http://localhost:3000
```

The backend defaults `FRONTEND_ORIGIN` to `http://localhost:3001`.
If you run the dashboard from another origin, set `FRONTEND_ORIGIN` in the backend environment.

## Development

Start the backend from the repo root, then run:

```bash
npm run dev
```

The dashboard runs on `http://localhost:3001`.

## Checks

```bash
npm run typecheck
npm run lint
npm run build
```
