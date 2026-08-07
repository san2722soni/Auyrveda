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

export async function upsertUser(phoneNumber: string): Promise<void> {
  const now = new Date();
  const collection = getUsersCollection();

  await collection.updateOne(
    { phoneNumber },
    {
      $setOnInsert: {
        phoneNumber,
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
    { upsert: true }
  );
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
