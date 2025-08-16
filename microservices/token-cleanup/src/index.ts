import dotenv from "dotenv";
import * as cron from "node-cron";
import { logger } from "./utils/logger";
import { authTokenService } from "./services/authTokenService";
import { gracefulShutdown } from "./utils/gracefulShutdown";

// Load environment variables
dotenv.config();

/**
 * Token Cleanup Microservice
 *
 * This service runs independently to clean up expired auth tokens.
 * It runs on a scheduled basis and can handle graceful shutdowns.
 */
class TokenCleanupService {
  private cronJob: cron.ScheduledTask | null = null;
  private isShuttingDown = false;

  async start(): Promise<void> {
    try {
      logger.info("Starting Token Cleanup Microservice", {
        version: process.env.npm_package_version || "1.0.0",
        nodeEnv: process.env.NODE_ENV || "development",
        schedule: process.env.CLEANUP_SCHEDULE || "0 */6 * * *", // Every 6 hours
      });

      // Validate database connection
      await this.validateDatabaseConnection();

      // Run initial cleanup
      await this.runCleanup();

      // Schedule recurring cleanup
      this.scheduleCleanup();

      // Setup graceful shutdown
      this.setupGracefulShutdown();

      logger.info("Token Cleanup Microservice started successfully");
    } catch (error) {
      logger.error("Failed to start Token Cleanup Microservice", {
        error: error instanceof Error ? error.message : "Unknown error",
      });
      process.exit(1);
    }
  }

  private async validateDatabaseConnection(): Promise<void> {
    try {
      await authTokenService.getTokenStats();
      logger.info("Database connection validated");
    } catch (error) {
      logger.error("Database connection failed", {
        error: error instanceof Error ? error.message : "Unknown error",
      });
      throw error;
    }
  }

  private async runCleanup(): Promise<void> {
    if (this.isShuttingDown) {
      logger.warn("Skipping cleanup - service is shutting down");
      return;
    }

    try {
      logger.info("Starting token cleanup");

      // Get stats before cleanup
      const statsBefore = await authTokenService.getTokenStats();

      // Clean up expired tokens
      const cleanedCount = await authTokenService.cleanupExpiredTokens();

      // Get stats after cleanup
      const statsAfter = await authTokenService.getTokenStats();

      logger.info("Token cleanup completed", {
        cleanedCount,
        before: statsBefore,
        after: statsAfter,
        duration: "completed",
      });
    } catch (error) {
      logger.error("Token cleanup failed", {
        error: error instanceof Error ? error.message : "Unknown error",
      });
      // Don't throw - let the service continue and try again on next schedule
    }
  }

  private scheduleCleanup(): void {
    const schedule = process.env.CLEANUP_SCHEDULE || "0 */6 * * *"; // Every 6 hours by default

    logger.info("Scheduling cleanup job", { schedule });

    this.cronJob = cron.schedule(
      schedule,
      async () => {
        await this.runCleanup();
      },
      {
        scheduled: true,
        timezone: process.env.TIMEZONE || "UTC",
      }
    );
  }

  private setupGracefulShutdown(): void {
    gracefulShutdown(async () => {
      this.isShuttingDown = true;

      logger.info("Shutting down Token Cleanup Microservice");

      if (this.cronJob) {
        this.cronJob.stop();
        this.cronJob = null;
        logger.info("Cleanup cron job stopped");
      }

      logger.info("Token Cleanup Microservice shutdown complete");
    });
  }
}

// Start the service
const service = new TokenCleanupService();
service.start().catch(error => {
  logger.error("Service startup failed", { error });
  process.exit(1);
});
