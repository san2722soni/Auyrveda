# Vishwavrinda Ayurveda

This workspace is split into two applications:

```text
backend/    Fastify, TypeScript, MongoDB, WhatsApp, OpenAI, API documentation
frontend/   Next.js admin dashboard
```

## Run Backend

Copy `backend/.env.example` to `backend/.env` and set the required secrets.

```powershell
cd backend
npm.cmd run start
```

Backend default URL: `http://localhost:3000`

## Run Frontend

```powershell
cd frontend
npm.cmd run dev
```

Frontend URL: `http://localhost:3001`

## Login

Set `ADMIN_USERNAME`, `ADMIN_PASSWORD`, `JWT_SECRET`, and `VERIFY_TOKEN` in
`backend/.env`. See `backend/.env.example`.

## Documentation

API and system documentation lives in:

```text
backend/docs/API_SYSTEM_DOCUMENTATION.md
backend/docs/API_SYSTEM_DOCUMENTATION.pdf
```
