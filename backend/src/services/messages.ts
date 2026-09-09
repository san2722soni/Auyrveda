import { Collection } from "mongodb";
import { COLLECTIONS } from "../constants/database";
import {
  createPaginationMeta,
  normalizePagination,
  PaginationInput,
  PaginationMeta,
} from "../lib/pagination";
import { getDatabase } from "./database";
import { Message, MessageRole, MessageSender } from "../types/message";

interface CreateMessageInput {
  externalId?: string;
  phoneNumber: string;
  role: MessageRole;
  sentBy?: MessageSender;
  content: string;
}

interface GetMessagesInput extends PaginationInput {
  phoneNumber: string;
}

export interface PaginatedMessages {
  data: Message[];
  pagination: PaginationMeta;
}

function getMessagesCollection(): Collection<Message> {
  return getDatabase().collection<Message>(COLLECTIONS.messages);
}

export async function createMessage(data: CreateMessageInput): Promise<void> {
  const collection = getMessagesCollection();

  if (data.externalId) {
    await collection.updateOne({ externalId: data.externalId },
      { $setOnInsert: { ...data, createdAt: new Date() } }, { upsert: true });
  } else {
    await collection.insertOne({ ...data, createdAt: new Date() });
  }
}

export async function getConversationHistory(phoneNumber: string, since?: Date) {
  return getMessagesCollection().find({ phoneNumber,
    ...(since ? { createdAt: { $gte: since } } : {}) })
    .sort({ createdAt: 1, _id: 1 }).toArray();
}

export async function getMessagesByPhoneNumber(
  input: GetMessagesInput
): Promise<PaginatedMessages> {
  const { page, limit } = normalizePagination(input);
  const skip = (page - 1) * limit;
  const query = { phoneNumber: input.phoneNumber };
  const collection = getMessagesCollection();

  const [messages, total] = await Promise.all([
    collection.find(query).sort({ createdAt: -1, _id: -1 }).skip(skip).limit(limit).toArray(),
    collection.countDocuments(query),
  ]);

  return {
    data: messages.reverse(),
    pagination: createPaginationMeta(page, limit, total),
  };
}
