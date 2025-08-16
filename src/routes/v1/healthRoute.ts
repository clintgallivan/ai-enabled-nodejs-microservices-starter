import { Router } from "express";
import { getHealth } from "controllers/healthController";
import { tokenAuthHandler } from "middleware/tokenAuthHandler";
import { publicRateLimit } from "config/rateLimits";

const router = Router();

router.get("/", publicRateLimit, tokenAuthHandler, getHealth);

export default router;
