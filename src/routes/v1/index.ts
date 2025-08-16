import { Router } from "express";
import homeRoute from "./homeRoute";
import healthRoute from "./healthRoute";
import logsRoute from "./logsRoute";
import authRoute from "./authRoute";

const router = Router();

router.use("/", homeRoute);
router.use("/health", healthRoute);
router.use("/logs", logsRoute);
router.use("/auth", authRoute);

export default router;
