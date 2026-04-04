import { z } from "zod";

const ConfigSchema = z.object({
  ANTHROPIC_API_KEY: z.string().min(1),
  SNAPSHOT_GRAPHQL_URL: z.string().url().default("https://hub.snapshot.org/graphql"),
  REALMS_API_URL: z.string().url().default("https://api.realms.today/api"),
  POLL_INTERVAL_MS: z.coerce.number().default(300_000),
  MIN_IMPORTANCE_SCORE: z.coerce.number().min(0).max(10).default(5),
  LOG_LEVEL: z.enum(["debug", "info", "warn", "error"]).default("info"),
});

export type Config = z.infer<typeof ConfigSchema>;

export function loadConfig(): Config {
  const result = ConfigSchema.safeParse(process.env);
  if (!result.success) {
    console.error("Invalid configuration:", result.error.flatten().fieldErrors);
    process.exit(1);
  }
  return result.data;
}
