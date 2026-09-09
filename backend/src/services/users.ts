import { Collection, Filter } from "mongodb";
import { COLLECTIONS } from "../constants/database";
import {
  createPaginationMeta,
  normalizePagination,
  PaginationInput,
  PaginationMeta,
} from "../lib/pagination";
import { escapeRegExp } from "../lib/regex";
import { getDatabase } from "./database";
import { User } from "../types/user";
import { sendAndStoreMessage } from "./messaging";
import { withConversationLock } from "../lib/conversation-lock";

export type ReplyMode = "ai" | "manual";

interface GetUsersInput extends PaginationInput {
  search?: string;
}

export interface PaginatedUsers {
  data: User[];
  pagination: PaginationMeta;
}

function getUsersCollection(): Collection<User> {
  return getDatabase().collection<User>(COLLECTIONS.users);
}

export async function getUser(phoneNumber: string): Promise<User | null> {
  return getUsersCollection().findOne({ phoneNumber });
}

export async function upsertUser(phoneNumber: string): Promise<User> {
  const now = new Date();
  const collection = getUsersCollection();

  const user = await collection.findOneAndUpdate(
    { phoneNumber },
    {
      $setOnInsert: {
        phoneNumber,
        replyMode: "ai",
        appointmentAssistantActive: false,
        firstSeenAt: now,
        createdAt: now,
      },
      $set: {
        lastActiveAt: now,
        updatedAt: now,
      },
    },
    { upsert: true, returnDocument: "after" }
  );

  if (!user) {
    throw new Error("Failed to upsert user");
  }

  const totalMessages = await getDatabase().collection(COLLECTIONS.messages).countDocuments({ phoneNumber, role: "user" });
  await collection.updateOne({ phoneNumber }, { $set: { totalMessages } });
  user.totalMessages = totalMessages;

  return user;
}

export async function getUsers(
  input: GetUsersInput = {}
): Promise<PaginatedUsers> {
  const { page, limit } = normalizePagination(input);
  const skip = (page - 1) * limit;
  const search = input.search?.trim();
  const query: Filter<User> = search
    ? { phoneNumber: { $regex: escapeRegExp(search), $options: "i" } }
    : {};

  const collection = getUsersCollection();
  const [data, total] = await Promise.all([
    collection.find(query).sort({ lastActiveAt: -1 }).skip(skip).limit(limit).toArray(),
    collection.countDocuments(query),
  ]);

  return {
    data,
    pagination: createPaginationMeta(page, limit, total),
  };
}

export async function setUserReplyMode(
  phoneNumber: string,
  replyMode: ReplyMode
): Promise<User | null> {
  return withConversationLock(phoneNumber, () => updateMode(phoneNumber, replyMode));
}

async function updateMode(phoneNumber: string, replyMode: ReplyMode, booking = false): Promise<User | null> {
  return getUsersCollection().findOneAndUpdate({ phoneNumber }, {
    $set: { replyMode, appointmentAssistantActive: booking, updatedAt: new Date(),
      ...(booking ? { contextStartedAt: new Date() } : {}) },
    $unset: { manualUntil: "" }, $inc: { modeVersion: 1 },
  }, { returnDocument: "after" });
}

export async function sendStaffMessage(
  phoneNumber: string,
  message: string
): Promise<User | null> {
  return withConversationLock(phoneNumber, async () => {
    const user = await updateMode(phoneNumber, "manual");
    if (user) await sendAndStoreMessage(phoneNumber, message, "staff");
    return user;
  });
}

export async function startAppointmentAssistant(
  phoneNumber: string,
  message: string
): Promise<User | null> {
  return withConversationLock(phoneNumber, async () => {
    const user = await updateMode(phoneNumber, "manual", true);
    if (user) await sendAndStoreMessage(phoneNumber, message, "staff");
    return user;
  });
}

export async function stopAppointmentAssistant(phoneNumber: string): Promise<void> {
  await getUsersCollection().updateOne(
    { phoneNumber },
    {
      $set: {
        appointmentAssistantActive: false,
        contextStartedAt: new Date(),
        updatedAt: new Date(),
      },
    }
  );
}

export async function getEffectiveReplyMode(user: User): Promise<ReplyMode> {
  return user.replyMode ?? "ai";
}
