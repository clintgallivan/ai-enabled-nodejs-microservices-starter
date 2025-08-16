import nodemailer from "nodemailer";
import { EmailOptions, EmailConfig } from "../types/email";
import logger from "../utils/logger";

export class EmailProvider {
  private transporter: nodemailer.Transporter | null = null;

  constructor(private config: EmailConfig) {
    this.initialize();
  }

  private async initialize(): Promise<void> {
    try {
      switch (this.config.provider) {
        case "nodemailer":
          this.transporter = nodemailer.createTransport({
            host: this.config.smtp!.host,
            port: this.config.smtp!.port,
            secure: this.config.smtp!.secure,
            auth: {
              user: this.config.smtp!.auth.user,
              pass: this.config.smtp!.auth.pass,
            },
          });
          break;

        case "sendgrid":
          // Incase we decide to use SendGrid
          throw new Error("SendGrid provider not implemented yet");

        case "ses":
          // Incase we decide to use ses
          throw new Error("AWS SES provider not implemented yet");

        default:
          throw new Error(`Unsupported email provider: ${this.config.provider}`);
      }

      // Verify connection
      if (this.transporter) {
        await this.transporter.verify();
        logger.info(`Email provider initialized: ${this.config.provider}`);
      }
    } catch (error) {
      logger.error("Failed to initialize email provider:", error);
      throw error;
    }
  }

  async sendEmail(options: EmailOptions): Promise<void> {
    if (!this.transporter) {
      throw new Error("Email provider not initialized");
    }

    try {
      const result = await this.transporter.sendMail({
        from: `"${this.config.from.name}" <${this.config.from.email}>`,
        to: options.to,
        subject: options.subject,
        html: options.html,
        text: options.text,
      });

      logger.info("Email sent successfully", {
        messageId: result.messageId,
        to: options.to,
        subject: options.subject,
      });
    } catch (error) {
      logger.error("Failed to send email", {
        error: error instanceof Error ? error.message : "Unknown error",
        to: options.to,
        subject: options.subject,
      });
      throw error;
    }
  }

  async verifyConnection(): Promise<boolean> {
    try {
      if (!this.transporter) {
        return false;
      }
      await this.transporter.verify();
      return true;
    } catch (error) {
      logger.error("Email provider verification failed:", error);
      return false;
    }
  }
}
