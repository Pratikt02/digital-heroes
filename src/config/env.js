// Validates environment variables once at startup so misconfiguration fails loudly.
require("dotenv").config();
const { z } = require("zod");

const schema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().default(5000),
  MONGODB_URI: z.string().min(1, "MONGODB_URI is required"),
  JWT_SECRET: z.string().min(32, "JWT_SECRET must be at least 32 characters"),
  JWT_EXPIRES_DAYS: z.coerce.number().int().positive().default(7),
  CLIENT_URL: z.string().url().default("http://localhost:5173"),
});

const parsed = schema.safeParse(process.env);
if (!parsed.success) {
  console.error("Invalid environment variables:", parsed.error.flatten().fieldErrors);
  throw new Error("Invalid environment variables");
}

module.exports = parsed.data;
