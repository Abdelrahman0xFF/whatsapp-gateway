import dotenv from "dotenv";
import path from "node:path";

dotenv.config();
try {
  process.loadEnvFile();
} catch {}

export const ENV = {
  PORT: parseInt(process.env.PORT || "7860", 10),
  HOST: process.env.HOST || "0.0.0.0",
  NODE_ENV: process.env.NODE_ENV || "development",
  WHATSAPP_ENGINE: process.env.WHATSAPP_ENGINE || "baileys",
  SESSION_DATA_PATH:
    process.env.SESSION_DATA_PATH || path.resolve("./data/auth_info"),
  EVOLUTION_API_URL: (
    process.env.EVOLUTION_API_URL || "http://localhost:8080"
  ).replace(/\/+$/, ""),
  EVOLUTION_API_KEY:
    process.env.EVOLUTION_API_KEY || "my-super-secret-key-123456",
  INSTANCE_NAME: process.env.INSTANCE_NAME || "test-bot",
  GATEWAY_API_KEY: process.env.GATEWAY_API_KEY || process.env.API_KEY || "",
  RATE_LIMIT_MAX: parseInt(process.env.RATE_LIMIT_MAX || "60", 10),
  RATE_LIMIT_WINDOW_MS: parseInt(
    process.env.RATE_LIMIT_WINDOW_MS || "60000",
    10,
  ),
  DEFAULT_RECIPIENT: process.env.RECIPIENT_NUMBER || "",
  WEBHOOK_URL: process.env.WEBHOOK_URL || "",
  WEBHOOK_SECRET: process.env.WEBHOOK_SECRET || "",
};
