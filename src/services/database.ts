import { Db, MongoClient } from "mongodb";
import { config } from "../config";

let client: MongoClient | null = null;
let database: Db | null = null;

export async function getDatabase(): Promise<Db> {
  if (database) {
    return database;
  }

  if (!config.mongoUri) {
    throw new Error("MONGO_URI is missing");
  }

  client = new MongoClient(config.mongoUri);
  await client.connect();

  database = client.db(config.mongoDatabaseName);
  return database;
}

export async function closeDatabase(): Promise<void> {
  if (!client) {
    return;
  }

  await client.close();
  client = null;
  database = null;
}
