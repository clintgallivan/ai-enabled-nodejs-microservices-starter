import { Router } from "express";
import v1Routes from "./v1";

const router = Router();

// Redirect root to /v1/ for better UX
router.get("/", (_req, res) => {
  res.redirect("/v1/");
});

router.use("/v1", v1Routes);

export default router;
