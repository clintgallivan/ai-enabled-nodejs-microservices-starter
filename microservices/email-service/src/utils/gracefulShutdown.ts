import logger from "./logger";

export function setupGracefulShutdown(cleanup: () => Promise<void>): void {
  const signals: NodeJS.Signals[] = ["SIGTERM", "SIGINT", "SIGUSR2"];

  signals.forEach(signal => {
    process.on(signal, async () => {
      logger.info(`Received ${signal}. Starting graceful shutdown...`);

      try {
        await cleanup();
        logger.info("Graceful shutdown completed.");
        process.exit(0);
      } catch (error) {
        logger.error("Error during graceful shutdown:", error);
        process.exit(1);
      }
    });
  });

  process.on("uncaughtException", error => {
    logger.error("Uncaught Exception:", error);
    process.exit(1);
  });

  process.on("unhandledRejection", (reason, promise) => {
    logger.error("Unhandled Rejection at:", promise, "reason:", reason);
    process.exit(1);
  });
}
