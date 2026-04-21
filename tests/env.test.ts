import { describe, expect, it } from "vitest";

import { parseEnv } from "@/lib/env";

describe("parseEnv", () => {
  it("accepts required environment variables", () => {
    const env = parseEnv({
      DATABASE_URL: "postgresql://localhost:5432/app",
      NEXT_PUBLIC_APP_NAME: "Competition Platform",
      AUTH_SECRET: "12345678901234567890123456789012",
    });

    expect(env.NEXT_PUBLIC_APP_NAME).toBe("Competition Platform");
  });
});
