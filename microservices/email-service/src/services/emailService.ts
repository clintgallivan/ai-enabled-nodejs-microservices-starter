import Bull, { Queue, Job } from "bull";
import Redis from "ioredis";
import { EmailJob } from "../types/email";
import { EmailProvider } from "./emailProvider";
import { TemplateService } from "./templateService";
import { config } from "../utils/config";
import logger from "../utils/logger";

export class EmailService {
  private queue: Queue;
  private redis: Redis;
  private emailProvider: EmailProvider;
  private templateService: TemplateService;

  constructor() {
    this.redis = new Redis(config.redis.url, {
      family: 0, // Enable IPv6 support for Railway private networking
      maxRetriesPerRequest: 3,
    });

    this.queue = new Bull("email queue", {
      redis: {
        // Parse the URL manually to avoid string conversion issues
        ...(() => {
          const url = new URL(config.redis.url);
          return {
            host: url.hostname,
            port: parseInt(url.port),
            password: url.password,
            username: url.username || "default",
            family: 0, // Numeric value, not string
          };
        })(),
      },
      defaultJobOptions: {
        attempts: 3,
        backoff: {
          type: "exponential",
          delay: 2000,
        },
        removeOnComplete: 100,
        removeOnFail: 50,
      },
    });

    this.emailProvider = new EmailProvider(config);
    this.templateService = new TemplateService();

    this.setupQueueProcessors();
    this.setupQueueEvents();
  }

  private setupQueueProcessors(): void {
    this.queue.process("send-email", 10, async (job: Job<EmailJob>) => {
      const { type, to, data } = job.data;

      logger.info(`Processing email job: ${type} to ${to}`, { jobId: job.id });

      try {
        // Render the email template
        const templateData = {
          ...data,
          appName: "YourApp",
          baseUrl: config.baseUrl,
        };

        const rendered = this.templateService.renderTemplate(type, templateData);

        // Send the email
        await this.emailProvider.sendEmail({
          to,
          subject: rendered.subject,
          html: rendered.html,
          text: rendered.text,
        });

        logger.info(`Email sent successfully: ${type} to ${to}`, { jobId: job.id });
      } catch (error) {
        logger.error(`Failed to send email: ${type} to ${to}`, {
          jobId: job.id,
          error: error instanceof Error ? error.message : "Unknown error",
        });
        throw error;
      }
    });
  }

  private setupQueueEvents(): void {
    this.queue.on("completed", (job: Job) => {
      logger.info(`Email job completed`, { jobId: job.id });
    });

    this.queue.on("failed", (job: Job, err: Error) => {
      logger.error(`Email job failed`, {
        jobId: job.id,
        error: err.message,
        attempts: job.attemptsMade,
      });
    });

    this.queue.on("stalled", (job: Job) => {
      logger.warn(`Email job stalled`, { jobId: job.id });
    });

    this.queue.on("error", (error: Error) => {
      logger.error("Queue error:", error);
    });
  }

  async addEmailJob(emailJob: EmailJob): Promise<Job<EmailJob>> {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const jobOptions: any = {
      priority: emailJob.priority || 0,
    };

    if (emailJob.delay) {
      jobOptions.delay = emailJob.delay;
    }

    if (emailJob.attempts) {
      jobOptions.attempts = emailJob.attempts;
    }

    const job = await this.queue.add("send-email", emailJob, jobOptions);

    logger.info(`Email job added to queue`, {
      jobId: job.id,
      type: emailJob.type,
      to: emailJob.to,
    });

    return job;
  }

  async getQueueStats(): Promise<{
    waiting: number;
    active: number;
    completed: number;
    failed: number;
    delayed: number;
  }> {
    const [waiting, active, completed, failed, delayed] = await Promise.all([
      this.queue.getWaiting().then(jobs => jobs.length),
      this.queue.getActive().then(jobs => jobs.length),
      this.queue.getCompleted().then(jobs => jobs.length),
      this.queue.getFailed().then(jobs => jobs.length),
      this.queue.getDelayed().then(jobs => jobs.length),
    ]);

    return { waiting, active, completed, failed, delayed };
  }

  async cleanup(): Promise<void> {
    logger.info("Cleaning up email service...");

    await this.queue.close();
    this.redis.disconnect();

    logger.info("Email service cleanup completed");
  }

  // Health check method
  async isHealthy(): Promise<boolean> {
    try {
      // Check Redis connection
      await this.redis.ping();

      // Check email provider connection
      const providerHealthy = await this.emailProvider.verifyConnection();

      return providerHealthy;
    } catch (error) {
      logger.error("Health check failed:", error);
      return false;
    }
  }
}
