import dotenv from "dotenv";

dotenv.config();

export const config = {
  port: Number(process.env.PORT ?? 3000),
  openaiApiKey: process.env.OPENAI_API_KEY,
  whatsappToken: process.env.WHATSAPP_TOKEN,
  phoneNumberId: process.env.PHONE_NUMBER_ID,
  whatsappBusinessAccountId: process.env.WHATSAPP_BUSINESS_ACCOUNT_ID,
  verifyToken: process.env.VERIFY_TOKEN ?? "verify-token",
  mongoUri: process.env.MONGO_URI,
  mongoDatabaseName: process.env.MONGO_DATABASE_NAME ?? "vishwavrinda_ayurveda",
};
