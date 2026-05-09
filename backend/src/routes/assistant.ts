import { Router } from "express";

const router = Router();

router.get("/", (_req, res) => {
  res.json({
    ok: true,
    service: "foodtrace-gh-assistant",
    message: "Assistant route is mounted. Configure an AI provider to enable guided support.",
  });
});

export default router;
