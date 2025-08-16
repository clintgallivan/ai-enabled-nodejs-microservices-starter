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

export interface EmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

export interface EmailTemplate {
  subject: string;
  htmlTemplate: string;
  textTemplate?: string;
}

export interface EmailConfig {
  provider: "nodemailer" | "sendgrid" | "ses";
  smtp?: {
    host: string;
    port: number;
    secure: boolean;
    auth: {
      user: string;
      pass: string;
    };
  };
  sendgrid?: {
    apiKey: string;
  };
  ses?: {
    region: string;
    accessKeyId: string;
    secretAccessKey: string;
  };
  from: {
    name: string;
    email: string;
  };
}
