import dotenv from "dotenv";
import { EmailConfig } from "../types/email";

dotenv.config();

export const config: EmailConfig & {
  redis: {
    url: string;
  };
  baseUrl: string;
} = {
  provider: (process.env.EMAIL_PROVIDER as "nodemailer" | "sendgrid" | "ses") || "nodemailer",

  smtp: {
    host: process.env.SMTP_HOST || "localhost",
    port: parseInt(process.env.SMTP_PORT || "587"),
    secure: process.env.SMTP_SECURE === "true",
    auth: {
      user: process.env.SMTP_USER || "",
      pass: process.env.SMTP_PASS || "",
    },
  },

  sendgrid: {
    apiKey: process.env.SENDGRID_API_KEY || "",
  },

  ses: {
    region: process.env.AWS_REGION || "us-east-1",
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || "",
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || "",
  },

  from: {
    name: process.env.FROM_NAME || "YourApp",
    email: process.env.FROM_EMAIL || "noreply@yourapp.com",
  },

  redis: {
    url: process.env.REDIS_URL || "redis://localhost:6379",
  },

  baseUrl: process.env.BASE_URL || "http://localhost:3000",
};
