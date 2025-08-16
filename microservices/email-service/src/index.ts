import express from "express";
import { EmailService } from "./services/emailService";
import { EmailJob } from "./types/email";
import { setupGracefulShutdown } from "./utils/gracefulShutdown";
import logger from "./utils/logger";
import Joi from "joi";

const app = express();
const port = process.env.PORT || 3001;

app.use(express.json());

// Health check endpoint
app.get("/health", async (req, res) => {
  try {
    const healthy = await emailService.isHealthy();
    const stats = await emailService.getQueueStats();

    res.json({
      status: healthy ? "healthy" : "unhealthy",
      service: "email-service",
      version: "1.0.0",
      timestamp: new Date().toISOString(),
      queue: stats,
    });
  } catch (error) {
    res.status(500).json({
      status: "error",
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

// Queue stats endpoint
app.get("/stats", async (req, res) => {
  try {
    const stats = await emailService.getQueueStats();
    res.json(stats);
  } catch (error) {
    res.status(500).json({
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

// Validation schema for email jobs
const emailJobSchema = Joi.object({
  type: Joi.string()
    .valid("password-reset", "email-verification", "welcome", "notification")
    .required(),
  to: Joi.string().email().required(),
  data: Joi.object().required(),
  priority: Joi.number().integer().min(0).max(100).optional(),
  delay: Joi.number().integer().min(0).optional(),
  attempts: Joi.number().integer().min(1).max(10).optional(),
});

// Send email endpoint
app.post("/send", async (req, res) => {
  try {
    const { error, value } = emailJobSchema.validate(req.body);

    if (error) {
      return res.status(400).json({
        error: "Validation error",
        details: error.details.map(d => d.message),
      });
    }

    const emailJob: EmailJob = value;
    const job = await emailService.addEmailJob(emailJob);

    res.json({
      success: true,
      jobId: job.id,
      message: "Email job queued successfully",
    });
  } catch (error) {
    logger.error("Failed to queue email job:", error);
    res.status(500).json({
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

// Initialize email service
const emailService = new EmailService();

// Start server
const server = app.listen(port, () => {
  logger.info(`Email service listening on port ${port}`);
});

// Setup graceful shutdown
setupGracefulShutdown(async () => {
  logger.info("Shutting down HTTP server...");
  server.close();

  logger.info("Cleaning up email service...");
  await emailService.cleanup();
});

export default app;
