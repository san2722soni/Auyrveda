import dotenv from "dotenv";

dotenv.config();

export const config = {
  port: Number(process.env.PORT ?? 3000),
  openaiApiKey: process.env.OPENAI_API_KEY,
  whatsappToken: process.env.WHATSAPP_TOKEN,
  phoneNumberId: process.env.PHONE_NUMBER_ID,
  whatsappBusinessAccountId: process.env.WHATSAPP_BUSINESS_ACCOUNT_ID,
  verifyToken: process.env.VERIFY_TOKEN ?? "aswin123",
  mongoUri: process.env.MONGODB_URI ?? "mongodb://127.0.0.1:27017",
  mongoDatabase: process.env.MONGODB_DATABASE ?? "ayurveda",
  frontendOrigin: process.env.FRONTEND_ORIGIN ?? "http://localhost:3001",
};
