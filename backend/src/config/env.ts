import dotenv from 'dotenv';
import { z } from 'zod';

dotenv.config();

const envSchema = z.object({
  PORT: z.string().default('4000').transform((val) => parseInt(val, 10)),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  JWT_SECRET: z.string().default('ridego_jwt_dev_secret_key_change_in_production_98765'),
  DATABASE_URL: z.string().default('postgres://postgres:postgres@localhost:5432/ridego_db'),
  ALLOW_IN_MEMORY_FALLBACK: z.string().default('true').transform((val) => val === 'true'),
  MAP_PROVIDER: z.enum(['google', 'mock']).default('mock'),
  GOOGLE_MAPS_API_KEY: z.string().optional().default(''),
  GEMINI_API_KEY: z.string().optional().default(''),
  TEST_OTP: z.string().default('123456'),
});

export const env = envSchema.parse(process.env);
