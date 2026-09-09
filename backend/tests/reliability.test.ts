import { strict as assert } from "node:assert";
import { test } from "node:test";
import { createHmac } from "node:crypto";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { createRequire } from "node:module";
import ts from "typescript";
import Fastify from "fastify";
import { verifyWebhookSignature } from "../src/lib/webhook-signature";
import { parseWhatsAppWebhooks } from "../src/parsers/whatsapp";
import { withConversationLock } from "../src/lib/conversation-lock";
import { toDateKey, parseClinicDate, startOfDay, startOfMonth, addDays } from "../src/lib/clinic-date";

// Load real service code with fake external boundaries; tests never call Meta/OpenAI or a patient database.
function load(file: string, dependencies: Record<string, unknown>) {
  const path = resolve(__dirname, "../src", file);
  const code = ts.transpileModule(readFileSync(path, "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true },
  }).outputText;
  const module = { exports: {} as any };
  const require = createRequire(path);
  new Function("require", "module", "exports", code)(
    (name: string) => name in dependencies ? dependencies[name] : require(name), module, module.exports);
  return module.exports;
}
const incoming = { id: "wamid.test", from: "919999999999", name: "Test", text: "WhatsApp", type: "text", timestamp: "1" };
function payload() {
  return { entry: [{ changes: [{ value: { metadata: { phone_number_id: "123" },
    messages: [{ ...incoming, text: { body: "hello" } }, { ...incoming, id: "second", text: { body: "next" } }] } }] }] };
}
function deferred() {
  let resolve!: (value?: any) => void;
  const promise = new Promise<any>(r => { resolve = r; });
  return { promise, resolve };
}

test("signature verifies exact raw bytes, rejects missing, wrong and tampered signatures", () => {
  const raw = Buffer.from('{"hello": "world"}');
  const signature = `sha256=${createHmac("sha256", "secret").update(raw).digest("hex")}`;
  assert.equal(verifyWebhookSignature(raw, signature, "secret"), true);
  assert.equal(verifyWebhookSignature(Buffer.from('{}'), signature, "secret"), false);
  assert.equal(verifyWebhookSignature(raw, undefined, "secret"), false);
  assert.equal(verifyWebhookSignature(raw, "sha256=abc", "secret"), false);
  assert.equal(verifyWebhookSignature(raw, signature, ""), false);
});

test("parser handles batches without contacts and isolates the configured business number", () => {
  const batch = payload();
  batch.entry.push(batch.entry[0]);
  assert.equal(parseWhatsAppWebhooks(batch, "123").length, 4);
  assert.equal(parseWhatsAppWebhooks(batch, "456").length, 0);
  assert.deepEqual(parseWhatsAppWebhooks(null, "123"), []);
  assert.deepEqual(parseWhatsAppWebhooks({ entry: [null] }, "123"), []);
});

test("clinic dates use India midnight and reject impossible dates", () => {
  assert.equal(toDateKey(new Date("2026-09-09T18:30:00Z")), "2026-09-10");
  assert.equal(startOfDay(new Date("2026-09-09T19:00:00Z")).toISOString(), "2026-09-09T18:30:00.000Z");
  assert.equal(parseClinicDate("2026-02-30"), null);
  assert.equal(toDateKey(startOfMonth(addDays(parseClinicDate("2026-12-01")!, 32))), "2027-01-01");
});

test("lock serializes same-patient sends but does not block another patient", async () => {
  const gate = deferred(); const events: string[] = [];
  const first = withConversationLock("a", async () => { events.push("first"); await gate.promise; });
  const second = withConversationLock("a", async () => { events.push("second"); });
  await withConversationLock("b", async () => { events.push("other"); });
  assert.deepEqual(events, ["first", "other"]);
  gate.resolve(); await Promise.all([first, second]);
  assert.equal(events.at(-1), "second");
});

function conversationHarness() {
  const gate = deferred(); const started = deferred();
  let current = { phoneNumber: incoming.from, replyMode: "ai", modeVersion: 0, appointmentAssistantActive: false };
  const sends: string[] = []; const bookings: any[] = []; const inputs: any[] = [];
  const history = [{ role: "user", content: "Name: Test Patient" }, { role: "user", content: "Tomorrow at 11, back pain" }, { role: "user", content: "WhatsApp" }];
  const generate = async (input: unknown) => { inputs.push(input); started.resolve(); return gate.promise; };
  const api = load("services/conversation.ts", {
    "./users": { upsertUser: async () => ({ ...current }), getUser: async () => current,
      getEffectiveReplyMode: async (user: any) => user.replyMode,
      stopAppointmentAssistant: async () => { current.appointmentAssistantActive = false; } },
    "./messages": { createMessage: async () => {}, getConversationHistory: async () => history },
    "./knowledge": { getKnowledge: async () => "clinic" },
    "./openai": { generateReply: generate, generateAppointmentReply: generate },
    "./appointments": { createAppointment: async (data: any) => { bookings.push(data); } },
    "./messaging": { sendAndStoreMessage: async (_phone: string, message: string) => { sends.push(message); } },
  });
  return { api, gate, started, sends, bookings, inputs, set: (mode: string, booking = false) => {
    current = { ...current, replyMode: mode, appointmentAssistantActive: booking, modeVersion: current.modeVersion + 1 };
  } };
}

test("staff takeover while AI is generating suppresses the in-flight reply", async () => {
  const h = conversationHarness(); const work = h.api.handleConversation(incoming);
  await h.started.promise; h.set("manual"); h.gate.resolve({ type: "message", reply: "late AI" });
  await work; assert.equal(h.sends.length, 0);
});
test("manual mode does not call AI or send", async () => {
  const h = conversationHarness(); h.set("manual"); await h.api.handleConversation(incoming);
  assert.equal(h.inputs.length, 0); assert.equal(h.sends.length, 0);
});
test("staff appointment assistant receives multi-turn history and saves one request", async () => {
  const h = conversationHarness(); h.set("manual", true);
  const work = h.api.handleConversation(incoming); await h.started.promise;
  assert.equal(h.inputs[0].length, 3);
  h.gate.resolve({ type: "appointment", appointment: { patientName: "Test Patient", preferredDate: "2099-01-01", preferredTime: "11 AM", reason: "back pain", preferredContactMethod: "whatsapp" } });
  await work; assert.equal(h.bookings.length, 1); assert.equal(h.bookings[0].sourceMessageId, incoming.id); assert.equal(h.sends.length, 1);
});

test("webhook acknowledges persisted messages, rejects unsigned requests, returns 503 on persistence failure", async () => {
  let fail = false; const queued: any[] = [];
  const { webhookRoutes } = load("routes/webhook.ts", {
    "../config": { config: { metaAppSecret: "secret", phoneNumberId: "123", verifyToken: "verify", enableTestEndpoints: false } },
    "../services/webhook-inbox": { enqueueMessages: async (messages: any[]) => { if (fail) throw new Error("db unavailable"); queued.push(...messages); }, startInboxWorker: async () => async () => {} },
    "../services/openai": {}, "../services/knowledge": {}, "../services/whatsapp": {},
  });
  const app = Fastify(); await app.register(webhookRoutes);
  app.post("/echo", async request => request.body);
  try {
    assert.deepEqual((await app.inject({ method: "POST", url: "/echo", payload: { ordinary: true } })).json(), { ordinary: true });
    const body = JSON.stringify(payload());
    const headers = { "content-type": "application/json", "x-hub-signature-256": `sha256=${createHmac("sha256", "secret").update(body).digest("hex")}` };
    assert.equal((await app.inject({ method: "POST", url: "/webhook", payload: body, headers: { "content-type": "application/json" } })).statusCode, 401);
    assert.equal((await app.inject({ method: "POST", url: "/webhook", payload: body, headers })).statusCode, 200);
    assert.equal(queued.length, 2);
    fail = true;
    assert.equal((await app.inject({ method: "POST", url: "/webhook", payload: body, headers })).statusCode, 503);
  } finally { await app.close(); }
});

test("staff mode ignores old expiry and staff send changes mode before sending", async () => {
  let user: any = { phoneNumber: incoming.from, replyMode: "manual", manualUntil: new Date(0), modeVersion: 0 };
  const events: string[] = [];
  const api = load("services/users.ts", {
    "./database": { getDatabase: () => ({ collection: () => ({
      findOneAndUpdate: async (_query: unknown, update: any) => {
        events.push("mode"); user = { ...user, ...update.$set, modeVersion: user.modeVersion + 1 }; return user;
      },
    }) }) },
    "./messaging": { sendAndStoreMessage: async () => { events.push("send"); assert.equal(user.replyMode, "manual"); } },
  });
  assert.equal(await api.getEffectiveReplyMode(user), "manual");
  await api.sendStaffMessage(incoming.from, "Staff reply");
  assert.deepEqual(events, ["mode", "send"]);
});

test("AI boundary receives history and rejects invalid or past appointment dates", async () => {
  let request: any;
  const api = load("services/openai.ts", {
    "../config": { config: { openaiApiKey: "fake-for-tests" } },
    "openai": class { responses = { create: async (input: unknown) => {
      request = input; return { output_text: JSON.stringify({ type: "message", reply: "What time?", appointment: null }) };
    } }; },
  });
  const history = [{ role: "user", content: "Name Test" }, { role: "user", content: "Tomorrow" }];
  await api.generateAppointmentReply(history, "Clinic information");
  assert.deepEqual(request.input, history);
  assert.match(request.instructions, /Asia\/Kolkata/);
  const appointment = { patientName: "Test", preferredDate: "2026-02-30", preferredTime: "11 AM", reason: "Consultation", preferredContactMethod: "call" };
  assert.equal(api.parseResult(JSON.stringify({ type: "appointment", appointment })).type, "message");
  appointment.preferredDate = "2000-01-01";
  assert.equal(api.parseResult(JSON.stringify({ type: "appointment", appointment })).type, "message");
  appointment.preferredDate = "2099-01-01";
  assert.equal(api.parseResult(JSON.stringify({ type: "appointment", appointment })).type, "appointment");
});

test("durable inbox deduplicates and distinguishes retryable failure from uncertain delivery", async () => {
  const jobs = new Map<string, any>();
  const collection = {
    createIndex: async () => {},
    updateOne: async (query: any, update: any) => {
      if (!jobs.has(query._id) && update.$setOnInsert) jobs.set(query._id, { _id: query._id, ...update.$setOnInsert });
      if (update.$set) Object.assign(jobs.get(query._id), update.$set);
    },
    updateMany: async (query: any, update: any) => {
      for (const job of jobs.values()) if (job.state === query.state && (!query.deliveryStarted || job.deliveryStarted)) Object.assign(job, update.$set);
    },
    aggregate: () => ({ toArray: async () => [...jobs.values()].filter(job => job.state === "pending" && job.nextAttemptAt <= new Date()).slice(0, 1) }),
    findOne: async (query: any) => jobs.get(query._id),
    findOneAndUpdate: async (query: any, update: any) => {
      const job = jobs.get(query._id); if (!job || job.state !== query.state) return null;
      Object.assign(job, update.$set); job.attempts += update.$inc.attempts; return { ...job };
    },
  };
  let delivery = false;
  const processed = deferred();
  const api = load("services/webhook-inbox.ts", {
    "./database": { getDatabase: () => ({ collection: () => collection }) },
    "./conversation": { handleConversation: async (_incoming: unknown, before: () => Promise<void>) => {
      if (delivery) await before(); processed.resolve(); throw new Error("Simulated outage");
    } },
  });
  await api.enqueueMessages([incoming, incoming]); assert.equal(jobs.size, 1);
  const app = { log: { error: () => {} } };
  let stop = await api.startInboxWorker(app);
  await processed.promise; await stop();
  assert.equal(jobs.get(incoming.id).state, "pending");
  assert.equal(jobs.get(incoming.id).attempts, 1);
  delivery = true; jobs.get(incoming.id).nextAttemptAt = new Date(0);
  stop = await api.startInboxWorker(app); await stop();
  assert.equal(jobs.get(incoming.id).state, "uncertain");
  jobs.get(incoming.id).state = "processing";
  stop = await api.startInboxWorker(app); await stop();
  assert.equal(jobs.get(incoming.id).state, "uncertain");
});

test("dashboard totals and trend grouping use consistent clinic dates", async () => {
  const pipelines: any[] = [];
  const usersCounts = [12, 3, 3, 9];
  const appointmentCounts = [4, 3, 1, 1, 1, 3];
  const db = { collection: (name: string) => ({
    countDocuments: async () => name === "users" ? usersCounts.shift() : name === "appointments" ? appointmentCounts.shift() : name === "messages" ? 20 : 0,
    aggregate: (pipeline: unknown) => { pipelines.push(pipeline); return { toArray: async () => [{ _id: "2026-09-10", count: name === "users" ? 3 : 1 }] }; },
  }) };
  const api = load("services/dashboard.ts", { "./database": { getDatabase: () => db } });
  const stats = await api.getDashboardStats({ trendPeriod: "week", anchorDate: parseClinicDate("2026-09-10") });
  assert.equal(stats.totalUsers, 12); assert.equal(stats.pendingAppointments, 3);
  assert.equal(stats.completedAppointments, 1); assert.equal(stats.totalMessages, 20);
  assert.equal(stats.trend.points.at(-1).users, 12);
  assert.equal(stats.trend.points.at(-1).appointments, 4);
  assert.equal(stats.trend.points.length, 7);
  for (const pipeline of pipelines) assert.equal(pipeline[1].$group._id.$dateToString.timezone, "Asia/Kolkata");
});
