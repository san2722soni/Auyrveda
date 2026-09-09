# Reliability update

## Deployment

- Add `META_APP_SECRET` to `backend/.env`. Use the App Secret for the Meta app receiving webhooks, not its WhatsApp access token or webhook verify token. The webhook fails closed with HTTP 503 if this is missing.
- Keep `PHONE_NUMBER_ID` set to the production sender ID. Webhook events for other phone IDs are ignored.
- Run exactly one backend instance in PM2 fork mode. The per-patient handoff lock and inbox recovery assume a single process. Do not use PM2 cluster mode, multiple replicas, or rolling reloads until distributed coordination is added.
- Deploy both backend and frontend. Start/restart with `pm2 restart ayurveda-backend --update-env` and `pm2 restart ayurveda-frontend --update-env` after building the frontend.
- Startup creates unique sparse indexes on message external IDs and appointment source-message IDs, plus the webhook inbox index. Existing records without these fields remain valid.

## Behavior

- Staff mode lasts until Return to AI. Existing manualUntil timestamps no longer reactivate AI.
- Taking over or sending a staff reply invalidates AI work still generating. A request already sent to Meta cannot be recalled; takeover waits for that final send to finish.
- Book Appointment starts a fresh appointment conversation. AI uses the patient's stored messages in that conversation to collect the five details across multiple replies. Successful booking clears that context and leaves staff mode enabled if staff initiated it.
- General AI replies also use stored conversation context. The project owner explicitly approved sending this history to OpenAI. Appointment dates are validated and relative dates are anchored to Asia/Kolkata.
- Message and selected-patient views poll every 3 seconds; lists and overview poll every 5 seconds while visible.
- All dashboard/date filters use Asia/Kolkata. Graph values are cumulative totals; the Y-axis grows above 10.

## Webhook delivery and recovery

- POST /webhook validates X-Hub-Signature-256 against the exact request bytes.
- All messages in each batch are persisted in `webhook_inbox` before HTTP 200. Database failure returns 503 so the sender can retry.
- Message IDs deduplicate inbound storage and source-message IDs deduplicate appointment creation. Pending work survives a restart.
- Failed processing before delivery is retried five times with backoff. A failed job holds later jobs for the same patient, without holding other patients.
- Once delivery begins, an interruption is marked `uncertain`; it is not blindly retried. Meta accepting a send and the database storing its result are separate operations, so exactly-once external delivery cannot be guaranteed.
- Overview shows delivery reviews with patient links. For a failed job use Retry. For an uncertain job, inspect/contact the patient as appropriate, handle any missing response through Staff Mode, then Mark reviewed to release later messages. Mark reviewed acknowledges the job without resending it.
- Accepted API sends are not delivery/read receipts. Recipient-side delivery still needs a real WhatsApp test.

## API additions (admin JWT required)

- GET /api/users/:phoneNumber: selected patient independent of list pagination.
- GET /api/message-failures: up to 100 failed/uncertain jobs, without message bodies.
- POST /api/message-failures/:id with `{ "action": "retry" }`: retry a failed pre-delivery job only.
- POST /api/message-failures/:id with `{ "action": "reviewed" }`: acknowledge failed/uncertain work after review.

## Verification

Run `npm test` and `npm run typecheck` in backend; run frontend lint, typecheck and build.
Tests stub database/Meta/OpenAI boundaries and never send patient messages.
After deployment, test a signed real inbound WhatsApp message, staff takeover during generation, details sent in separate messages, appointment completion, and dashboard refresh.
