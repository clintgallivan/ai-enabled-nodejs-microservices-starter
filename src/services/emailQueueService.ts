import logger from "utils/logger";
import { config } from "../config";

export interface EmailJob {
  type: "password-reset" | "email-verification" | "welcome" | "notification";
  to: string;
  data: {
    [key: string]: any; // eslint-disable-line @typescript-eslint/no-explicit-any -- Email data can be any type
  };
  priority?: number;
  delay?: number;
  attempts?: number;
}

class EmailQueueService {
  private emailServiceUrl: string;

  constructor() {
    this.emailServiceUrl = process.env.EMAIL_SERVICE_URL || "http://localhost:3001";
  }

  async sendPasswordResetEmail(email: string, resetToken: string): Promise<void> {
    const emailJob: EmailJob = {
      type: "password-reset",
      to: email,
      data: {
        resetToken,
        resetUrl: `${config.allowedOrigins[0]}/reset-password?token=${resetToken}`,
      },
      priority: 10, // High priority for password resets
    };

    await this.queueEmail(emailJob);
  }

  async sendEmailVerification(
    email: string,
    verifyToken: string,
    name?: string,
    fireAndForget: boolean = false
  ): Promise<void> {
    const emailJob: EmailJob = {
      type: "email-verification",
      to: email,
      data: {
        verifyToken,
        verifyUrl: `${config.allowedOrigins[0]}/verify-email?token=${verifyToken}`,
        name: name || "there",
      },
      priority: 10, // High priority for verification
    };

    if (fireAndForget) {
      this.queueEmail(emailJob).catch(error => {
        logger.error("Background email sending failed", {
          error: error.message,
          type: emailJob.type,
          to: emailJob.to,
        });
      });
    } else {
      await this.queueEmail(emailJob);
    }
  }

  async sendWelcomeEmail(email: string, name: string): Promise<void> {
    const emailJob: EmailJob = {
      type: "welcome",
      to: email,
      data: {
        name,
        dashboardUrl: `${config.allowedOrigins[0]}/dashboard`,
      },
      priority: 5, // Medium priority
    };

    await this.queueEmail(emailJob);
  }

  async sendNotificationEmail(
    email: string,
    subject: string,
    message: string,
    data: any = {} // eslint-disable-line @typescript-eslint/no-explicit-any -- Notification data can be any type
  ): Promise<void> {
    const emailJob: EmailJob = {
      type: "notification",
      to: email,
      data: {
        subject,
        message,
        ...data,
      },
      priority: 1, // Low priority
    };

    await this.queueEmail(emailJob);
  }

  private async queueEmail(emailJob: EmailJob): Promise<void> {
    try {
      // In test environment, just log
      if (process.env.NODE_ENV === "test") {
        logger.info("Email would be queued (test mode)", {
          type: emailJob.type,
          to: emailJob.to,
        });
        return;
      }

      const response = await fetch(`${this.emailServiceUrl}/send`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(emailJob),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(`Email service error: ${error.error || response.statusText}`);
      }

      const result = await response.json();
      logger.info("Email queued successfully", {
        jobId: result.jobId,
        type: emailJob.type,
        to: emailJob.to,
      });
    } catch (error) {
      logger.error("Failed to queue email", {
        error: error instanceof Error ? error.message : "Unknown error",
        type: emailJob.type,
        to: emailJob.to,
      });

      // In development, we don't want to break the app if email service is down
      if (process.env.NODE_ENV === "development") {
        logger.warn("Email service unavailable in development - continuing without email");
        return;
      }

      throw new Error("Failed to send email");
    }
  }

  async getEmailServiceStatus(): Promise<{
    healthy: boolean;
    stats?: any; // eslint-disable-line @typescript-eslint/no-explicit-any -- External API response structure varies
  }> {
    try {
      const response = await fetch(`${this.emailServiceUrl}/health`);
      if (!response.ok) {
        return { healthy: false };
      }

      const data = await response.json();
      return {
        healthy: data.status === "healthy",
        stats: data.queue,
      };
    } catch (error) {
      logger.error("Failed to check email service status:", error);
      return { healthy: false };
    }
  }
}

export const emailQueueService = new EmailQueueService();
