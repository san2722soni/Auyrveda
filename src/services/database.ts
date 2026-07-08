import { Db, MongoClient } from "mongodb";
import { config } from "../config";

const client = new MongoClient(config.mongoUri);

let database: Db | null = null;

export async function connectDatabase(): Promise<Db> {
  if (database) {
    return database;
  }

  await client.connect();

  database = client.db(config.mongoDatabase);

  console.log(`MongoDB connected: ${config.mongoDatabase}`);

  return database;
}

export function getDatabase(): Db {
  if (!database) {
    throw new Error("MongoDB is not connected");
  }

  return database;
}