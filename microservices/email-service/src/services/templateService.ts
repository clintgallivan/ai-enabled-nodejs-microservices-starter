import Handlebars from "handlebars";
import { EmailTemplate } from "../types/email";
import logger from "../utils/logger";

export class TemplateService {
  private templates: Map<string, EmailTemplate> = new Map();

  constructor() {
    this.loadTemplates();
    this.registerHelpers();
  }

  private registerHelpers(): void {
    Handlebars.registerHelper("formatDate", function (date: Date) {
      return new Date(date).toLocaleDateString();
    });

    Handlebars.registerHelper("currentYear", function () {
      return new Date().getFullYear();
    });
  }

  private loadTemplates(): void {
    // Password Reset Template
    this.templates.set("password-reset", {
      subject: "Reset Your Password - {{appName}}",
      htmlTemplate: `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <title>Reset Your Password</title>
            <style>
              body { font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; }
              .header { text-align: center; border-bottom: 1px solid #eee; padding-bottom: 20px; margin-bottom: 20px; }
              .button { background-color: #007bff; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; display: inline-block; }
              .footer { color: #666; font-size: 14px; margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee; }
            </style>
          </head>
          <body>
            <div class="header">
              <h1>{{appName}}</h1>
            </div>
            <h2>Reset Your Password</h2>
            <p>Hi there,</p>
            <p>You requested a password reset for your account.</p>
            <p>Click the button below to reset your password:</p>
            <div style="text-align: center; margin: 30px 0;">
              <a href="{{resetUrl}}" class="button">Reset Password</a>
            </div>
            <p>This link will expire in 1 hour for security reasons.</p>
            <div class="footer">
              <p>If you didn't request this password reset, you can safely ignore this email.</p>
              <p>&copy; {{currentYear}} {{appName}}. All rights reserved.</p>
            </div>
          </body>
        </html>
      `,
      textTemplate: `
        Reset Your Password - {{appName}}

        Hi there,

        You requested a password reset for your account.

        Reset your password by visiting this link:
        {{resetUrl}}

        This link will expire in 1 hour for security reasons.

        If you didn't request this password reset, you can safely ignore this email.

        © {{currentYear}} {{appName}}. All rights reserved.
      `,
    });

    // Email Verification Template
    this.templates.set("email-verification", {
      subject: "Verify Your Email Address - {{appName}}",
      htmlTemplate: `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <title>Verify Your Email</title>
            <style>
              body { font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; }
              .header { text-align: center; border-bottom: 1px solid #eee; padding-bottom: 20px; margin-bottom: 20px; }
              .button { background-color: #28a745; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; display: inline-block; }
              .footer { color: #666; font-size: 14px; margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee; }
            </style>
          </head>
          <body>
            <div class="header">
              <h1>{{appName}}</h1>
            </div>
            <h2>Verify Your Email Address</h2>
            <p>Hi {{name}},</p>
            <p>Thank you for signing up! Please verify your email address to complete your registration.</p>
            <div style="text-align: center; margin: 30px 0;">
              <a href="{{verifyUrl}}" class="button">Verify Email</a>
            </div>
            <p>This link will expire in 24 hours for security reasons.</p>
            <div class="footer">
              <p>If you didn't create an account, you can safely ignore this email.</p>
              <p>&copy; {{currentYear}} {{appName}}. All rights reserved.</p>
            </div>
          </body>
        </html>
      `,
      textTemplate: `
        Verify Your Email Address - {{appName}}

        Hi {{name}},

        Thank you for signing up! Please verify your email address to complete your registration.

        Verify your email by visiting this link:
        {{verifyUrl}}

        This link will expire in 24 hours for security reasons.

        If you didn't create an account, you can safely ignore this email.

        © {{currentYear}} {{appName}}. All rights reserved.
      `,
    });

    // Welcome Template
    this.templates.set("welcome", {
      subject: "Welcome to {{appName}}!",
      htmlTemplate: `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <title>Welcome to {{appName}}</title>
            <style>
              body { font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; }
              .header { text-align: center; border-bottom: 1px solid #eee; padding-bottom: 20px; margin-bottom: 20px; }
              .button { background-color: #17a2b8; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; display: inline-block; }
              .footer { color: #666; font-size: 14px; margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee; }
            </style>
          </head>
          <body>
            <div class="header">
              <h1>{{appName}}</h1>
            </div>
            <h2>Welcome to {{appName}}!</h2>
            <p>Hi {{name}},</p>
            <p>Welcome to {{appName}}! We're excited to have you on board.</p>
            <p>Your account is now active and ready to use.</p>
            <div style="text-align: center; margin: 30px 0;">
              <a href="{{dashboardUrl}}" class="button">Get Started</a>
            </div>
            <div class="footer">
              <p>If you have any questions, don't hesitate to reach out to our support team.</p>
              <p>&copy; {{currentYear}} {{appName}}. All rights reserved.</p>
            </div>
          </body>
        </html>
      `,
      textTemplate: `
        Welcome to {{appName}}!

        Hi {{name}},

        Welcome to {{appName}}! We're excited to have you on board.

        Your account is now active and ready to use.

        Get started by visiting: {{dashboardUrl}}

        If you have any questions, don't hesitate to reach out to our support team.

        © {{currentYear}} {{appName}}. All rights reserved.
      `,
    });

    logger.info("Email templates loaded successfully");
  }

  renderTemplate(
    templateName: string,
    data: any // eslint-disable-line @typescript-eslint/no-explicit-any -- Template data can be any type
  ): { subject: string; html: string; text?: string } {
    const template = this.templates.get(templateName);
    if (!template) {
      throw new Error(`Template not found: ${templateName}`);
    }

    try {
      const subjectTemplate = Handlebars.compile(template.subject);
      const htmlTemplate = Handlebars.compile(template.htmlTemplate);
      const textTemplate = template.textTemplate ? Handlebars.compile(template.textTemplate) : null;

      return {
        subject: subjectTemplate(data),
        html: htmlTemplate(data),
        text: textTemplate ? textTemplate(data) : undefined,
      };
    } catch (error) {
      logger.error(`Failed to render template ${templateName}:`, error);
      throw new Error(`Failed to render template: ${templateName}`);
    }
  }

  getAvailableTemplates(): string[] {
    return Array.from(this.templates.keys());
  }
}
