# Vishwavrinda Ayurveda Backend

Fastify backend for WhatsApp AI conversations, appointments, users, knowledge, dashboard stats, and admin JWT auth.

## Run

Copy `.env.example` to `.env` and set the required secrets first.

```powershell
npm.cmd run start
```

## Development

```powershell
npm.cmd run dev
```

## Generate API PDF

```powershell
node scripts\generate-api-doc-pdf.cjs
```

## Seed Demo Data

```powershell
node scripts\seed-demo-data.cjs
```

The backend reads `.env` from this `backend/` folder.
