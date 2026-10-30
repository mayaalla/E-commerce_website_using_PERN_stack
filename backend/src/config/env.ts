import "dotenv/config";
import { z } from "zod";

const envSchema = z.object({
    PORT: z.coerce.number().default(5000),
    NODE_ENV: z.enum(["development", "production"]).default("development"),
    CLIENT_ORIGIN: z.string().url(),
    // FRONTEND_URL: z.string().url(),
    DATABASE_URL: z.string().url(),
    // REDIS_URL: z.string().url(), // replaced by Upstash below
    JWT_ACCESS_SECRET: z.string().min(32),
    JWT_REFRESH_SECRET: z.string().min(32),
    JWT_ACCESS_EXPIRES_IN: z.string().regex(/^[1-9]\d*[smhd]$/).default("15m"),
    JWT_REFRESH_EXPIRES_IN: z.string().regex(/^[1-9]\d*[smhd]$/).default("7d"),
    UPSTASH_REDIS_REST_URL: z.string().url(),
    UPSTASH_REDIS_REST_TOKEN: z.string().min(1),
    // SMTP_HOST: z.string().min(1).optional(),
    // RESEND_API_KEY: z.string().min(1).optional(),
    // EMAIL_FROM: z.string().min(1).optional(),
    // CLOUDINARY_CLOUD_NAME: z.string().min(1),
    // CLOUDINARY_API_KEY: z.string().min(1),
    // CLOUDINARY_API_SECRET: z.string().min(1),
});

const env = envSchema.safeParse(process.env);
if (!env.success) {
    console.error("Bad environment settings:");
    for (const issue of env.error.issues) {
      console.error(`  - ${issue.path.join(".")}: ${issue.message}`);
    }
    process.exit(1);
  }
  
export default env.data;