import { z } from "zod";

const envSchema = z.object({
  DATABASE_URL: z.string().min(1),
  NEXT_PUBLIC_APP_NAME: z.string().min(1),
  AUTH_SECRET: z.string().min(32),
});

export function parseEnv(input: Record<string, string | undefined>) {
  return envSchema.parse(input);
}
