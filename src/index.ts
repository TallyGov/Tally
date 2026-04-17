import { loadConfig } from "./lib/config.js";
import { setLogLevel } from "./lib/logger.js";
import { runAgentLoop } from "./agent/loop.js";
import { logger } from "./lib/logger.js";

async function main(): Promise<void> {
  const config = loadConfig();
  setLogLevel(config.LOG_LEVEL);

  logger.info("Tally Governance Monitor starting...");
  logger.info(`Poll interval: ${config.POLL_INTERVAL_MS}ms | Min importance: ${config.MIN_IMPORTANCE_SCORE}/10`);

  async function poll(): Promise<void> {
    const startedAt = Date.now();

    try {
      await runAgentLoop(config);
    } catch (err) {
      logger.error("Poll error:", err);
    } finally {
      const durationMs = Date.now() - startedAt;
      logger.info("Governance poll complete", { durationMs });

      if (durationMs > config.POLL_INTERVAL_MS) {
        logger.warn("Governance poll exceeded configured interval", {
          durationMs,
          intervalMs: config.POLL_INTERVAL_MS,
        });
      }
    }
  }

  const runLoop = async (): Promise<void> => {
    await poll();
    setTimeout(() => {
      void runLoop();
    }, config.POLL_INTERVAL_MS);
  };

  await runLoop();
  logger.info(`Polling every ${config.POLL_INTERVAL_MS / 60_000}min...`);
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
