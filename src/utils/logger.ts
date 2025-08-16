import winston from "winston";
import { config } from "../config";

export const LOGS_FILE_PATH = "logs/server.log";

const { combine, timestamp, printf, json } = winston.format;

// Define the log format for development and production
const logFormat = printf(({ level, message, timestamp, metadata }) => {
  const metaString = metadata && Object.keys(metadata).length ? ` ${JSON.stringify(metadata)}` : "";
  return `[${timestamp}] ${level.toUpperCase()}: ${message}${metaString}`;
});

// Configure the logger
const logger = winston.createLogger({
  level: config.nodeEnv === "production" ? "info" : "debug", // No debug logs shown in production
  format: combine(
    timestamp(),
    winston.format.metadata({ fillExcept: ["message", "level", "timestamp"] }),
    logFormat
  ),
  defaultMeta: {
    version: process.env.npm_package_version || "1.0.0",
    environment: config.nodeEnv,
    service: "nodejs-microservices-starter",
  },
  transports: [
    // Console output
    new winston.transports.Console({
      format: combine(
        timestamp(),
        winston.format.metadata({ fillExcept: ["message", "level", "timestamp"] }),
        config.nodeEnv === "production" ? json() : logFormat
      ),
    }),

    // Optionally, you can log to a file for persistent storage
    new winston.transports.File({
      filename: LOGS_FILE_PATH,
      format: combine(
        timestamp(),
        winston.format.metadata({ fillExcept: ["message", "level", "timestamp"] }),
        json()
      ),
    }),
  ],
});

export default logger;
