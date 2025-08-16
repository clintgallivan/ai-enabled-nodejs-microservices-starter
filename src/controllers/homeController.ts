import { Request, Response } from "express";
import { config } from "../config";

export const getHome = (_req: Request, res: Response) => {
  res.json({
    success: true,
    message: "Welcome to Node.js Microservices Starter API",
    data: {
      service: "nodejs-microservices-starter",
      version: process.env.npm_package_version || "1.0.0",
      environment: config.nodeEnv,
      status: "operational",
      timestamp: new Date().toISOString(),
      endpoints: {
        health: "/v1/health",
        auth: {
          register: "/v1/auth/register",
          login: "/v1/auth/login",
          logout: "/v1/auth/logout",
          refresh: "/v1/auth/refresh-token",
        },
        docs: "Coming soon...",
      },
    },
  });
};
