import express, { Express } from "express";
import { json, urlencoded } from "body-parser";
import routes from "./routes";
import { errorHandler } from "./middleware/errorHandler";
import cors from "cors";
import helmet from "helmet";
import { config } from "config";
import { generalRateLimit } from "config/rateLimits";

const app: Express = express();

// Trust Railway's proxy (1 hop)
app.set("trust proxy", 1);

// 1. Security & CORS (first)
app.use(
  cors({
    origin: config.allowedOrigins,
    credentials: true,
  })
);
app.use(helmet());

// 2. Global rate limiting
app.use(generalRateLimit);

// 3. Body parsing
app.use(json());
app.use(urlencoded({ extended: true }));

// 4. Routes
app.use("/", routes);

// 5. Error handling (last)
app.use(errorHandler);

app.disable("x-powered-by");

export default app;
