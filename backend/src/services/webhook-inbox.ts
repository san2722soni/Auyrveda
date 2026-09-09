import { FastifyInstance } from "fastify";
import { ObjectId } from "mongodb";
import { getDatabase } from "./database";
import { WhatsAppMessage } from "../types/whatsapp";
import { handleConversation } from "./conversation";

interface InboxJob {
  _id: string;
  incoming: WhatsAppMessage;
  state: "pending" | "processing" | "done" | "failed" | "uncertain";
  attempts: number;
  createdAt: Date;
  sequence: ObjectId;
  nextAttemptAt: Date;
  deliveryStarted?: boolean;
}
export const inbox = () => getDatabase().collection<InboxJob>("webhook_inbox");

export async function enqueueMessages(messages: WhatsAppMessage[]): Promise<void> {
  for (const incoming of messages) {
    await inbox().updateOne({ _id: incoming.id }, { $setOnInsert: {
      incoming, state: "pending", attempts: 0, createdAt: new Date(), sequence: new ObjectId(), nextAttemptAt: new Date(),
    } }, { upsert: true });
  }
}

export async function startInboxWorker(app: FastifyInstance): Promise<() => Promise<void>> {
  await inbox().createIndex({ state: 1, createdAt: 1 });
  // A process restart must not blindly repeat a request that may have reached Meta.
  await inbox().updateMany({ state: "processing", deliveryStarted: true }, { $set: { state: "uncertain" } });
  await inbox().updateMany({ state: "processing" }, { $set: { state: "pending" } });
  let stopped = false;
  let timer: ReturnType<typeof setTimeout>;
  let active: Promise<void> = Promise.resolve();
  let recover = false;
  async function tick() {
    try {
      if (recover) {
        await inbox().updateMany({ state: "processing", deliveryStarted: true }, { $set: { state: "uncertain" } });
        await inbox().updateMany({ state: "processing" }, { $set: { state: "pending" } });
        recover = false;
      }
      // Only each patient's oldest unfinished job is eligible, including delayed retries.
      const candidates = await inbox().aggregate<InboxJob>([
        { $match: { state: { $in: ["pending", "processing", "failed", "uncertain"] } } },
        { $sort: { createdAt: 1, sequence: 1 } },
        { $group: { _id: "$incoming.from", job: { $first: "$$ROOT" } } },
        { $replaceRoot: { newRoot: "$job" } },
        { $match: { state: "pending", nextAttemptAt: { $lte: new Date() } } },
        { $sort: { createdAt: 1, sequence: 1 } }, { $limit: 1 },
      ]).toArray();
      for (const candidate of candidates) {
        const job = await inbox().findOneAndUpdate({ _id: candidate._id, state: "pending" },
          { $set: { state: "processing" }, $inc: { attempts: 1 } }, { returnDocument: "after" });
        if (!job) continue;
        try {
          await handleConversation(job.incoming, async () => {
            await inbox().updateOne({ _id: job._id }, { $set: { deliveryStarted: true } });
          });
          await inbox().updateOne({ _id: job._id }, { $set: { state: "done" } });
        } catch (error) {
          const latest = await inbox().findOne({ _id: job._id });
          await inbox().updateOne({ _id: job._id }, { $set: {
            state: latest?.deliveryStarted ? "uncertain" : job.attempts >= 5 ? "failed" : "pending",
            nextAttemptAt: new Date(Date.now() + Math.min(60_000, 1000 * 2 ** job.attempts)),
          } });
          app.log.error({ err: error, messageId: job._id }, "Webhook job needs retry or operator attention");
        }
        break;
      }
    } catch (error) {
      recover = true;
      app.log.error({ err: error }, "Webhook inbox worker failed");
    }
    if (!stopped) timer = setTimeout(() => { active = tick(); }, 500);
  }
  active = tick();
  return async () => { stopped = true; clearTimeout(timer); await active; };
}
