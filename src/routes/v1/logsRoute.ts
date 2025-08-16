import { Router } from "express";
import { getLogs } from "controllers/logsController";
import { tokenAuthHandler } from "middleware/tokenAuthHandler";
import { adminRateLimit } from "config/rateLimits";

const router = Router();

router.get("/download", adminRateLimit, tokenAuthHandler, getLogs);

export default router;
