import { Db, MongoClient } from "mongodb";
import { config } from "../config";
import { COLLECTIONS, INDEXES } from "../constants/database";
import { Appointment } from "../types/appointment";
import { Message } from "../types/message";
import { User } from "../types/user";

const client = new MongoClient(config.mongoUri);

let database: Db | null = null;

async function initializeIndexes(db: Db): Promise<void> {
  await Promise.all([
    db.collection<User>(COLLECTIONS.users).createIndexes([
      { key: { phoneNumber: 1 }, unique: true, name: INDEXES.usersPhoneNumberUnique },
      { key: { lastActiveAt: -1 }, name: INDEXES.usersLastActiveAt },
      { key: { firstSeenAt: -1 }, name: INDEXES.usersFirstSeenAt },
    ]),
    db.collection<Message>(COLLECTIONS.messages).createIndexes([
      { key: { externalId: 1 }, unique: true, sparse: true },
      { key: { phoneNumber: 1, createdAt: -1 }, name: INDEXES.messagesPhoneNumberCreatedAt },
    ]),
    db.collection<Appointment>(COLLECTIONS.appointments).createIndexes([
      { key: { sourceMessageId: 1 }, unique: true, sparse: true },
      { key: { createdAt: -1 }, name: INDEXES.appointmentsCreatedAt },
      { key: { isCompleted: 1, createdAt: -1 }, name: INDEXES.appointmentsIsCompletedCreatedAt },
      { key: { phoneNumber: 1 }, name: INDEXES.appointmentsPhoneNumber },
    ]),
  ]);
}

export async function connectDatabase(): Promise<Db> {
  if (database) {
    return database;
  }

  await client.connect();

  database = client.db(config.mongoDatabase);
  await initializeIndexes(database);

  console.log(`MongoDB connected: ${config.mongoDatabase}`);

  return database;
}

export function getDatabase(): Db {
  if (!database) {
    throw new Error("MongoDB is not connected");
  }

  return database;
}
