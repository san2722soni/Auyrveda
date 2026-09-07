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

export type ReplyMode = "ai" | "manual";

const MANUAL_MODE_MINUTES = 30;

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

function getManualUntil(): Date {
  return new Date(Date.now() + MANUAL_MODE_MINUTES * 60 * 1000);
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
      $inc: {
        totalMessages: 1,
      },
    },
    { upsert: true, returnDocument: "after" }
  );

  if (!user) {
    throw new Error("Failed to upsert user");
  }

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
  const collection = getUsersCollection();
  const now = new Date();
  const update =
    replyMode === "manual"
      ? {
          $set: {
            replyMode,
            manualUntil: getManualUntil(),
            updatedAt: now,
          },
        }
      : {
          $set: {
            replyMode,
            appointmentAssistantActive: false,
            updatedAt: now,
          },
          $unset: {
            manualUntil: "" as const,
          },
        };

  return await collection.findOneAndUpdate(
    { phoneNumber },
    update,
    { returnDocument: "after" }
  );
}

export async function sendStaffMessage(
  phoneNumber: string,
  message: string
): Promise<User | null> {
  await sendAndStoreMessage(phoneNumber, message, "staff");

  return await setUserReplyMode(phoneNumber, "manual");
}

export async function startAppointmentAssistant(
  phoneNumber: string,
  message: string
): Promise<User | null> {
  const now = new Date();
  const collection = getUsersCollection();

  await sendAndStoreMessage(phoneNumber, message, "staff");

  return await collection.findOneAndUpdate(
    { phoneNumber },
    {
      $set: {
        replyMode: "manual",
        manualUntil: getManualUntil(),
        appointmentAssistantActive: true,
        updatedAt: now,
      },
    },
    { returnDocument: "after" }
  );
}

export async function stopAppointmentAssistant(phoneNumber: string): Promise<void> {
  await getUsersCollection().updateOne(
    { phoneNumber },
    {
      $set: {
        appointmentAssistantActive: false,
        updatedAt: new Date(),
      },
    }
  );
}

export async function getEffectiveReplyMode(user: User): Promise<ReplyMode> {
  if (
    user.replyMode === "manual" &&
    user.manualUntil &&
    user.manualUntil.getTime() <= Date.now()
  ) {
    await setUserReplyMode(user.phoneNumber, "ai");
    return "ai";
  }

  return user.replyMode ?? "ai";
}
