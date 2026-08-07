import { resolve } from "node:path";
import dotenv from "dotenv";

dotenv.config({ path: resolve(__dirname, "..", ".env") });

function requiredEnv(name: string): string {
  const value = process.env[name]?.trim();

  if (!value) {
    throw new Error(`${name} is required`);
  }

  return value;
}

export const config = {
  port: Number(process.env.PORT ?? 3000),
  openaiApiKey: process.env.OPENAI_API_KEY,
  whatsappToken: process.env.WHATSAPP_TOKEN,
  phoneNumberId: process.env.PHONE_NUMBER_ID,
  whatsappBusinessAccountId: process.env.WHATSAPP_BUSINESS_ACCOUNT_ID,
  verifyToken: requiredEnv("VERIFY_TOKEN"),
  mongoUri: process.env.MONGODB_URI ?? "mongodb://127.0.0.1:27017",
  mongoDatabase: process.env.MONGODB_DATABASE ?? "ayurveda",
  frontendOrigin: process.env.FRONTEND_ORIGIN ?? "http://localhost:3001",
  jwtSecret: requiredEnv("JWT_SECRET"),
  adminUsername: requiredEnv("ADMIN_USERNAME"),
  adminPassword: requiredEnv("ADMIN_PASSWORD"),
  enableTestEndpoints: process.env.ENABLE_TEST_ENDPOINTS === "true",
};
