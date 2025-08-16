import { Router } from "express";
import { getHome } from "controllers/homeController";
import { publicRateLimit } from "config/rateLimits";

const router = Router();

router.get("/", publicRateLimit, getHome);

export default router;
