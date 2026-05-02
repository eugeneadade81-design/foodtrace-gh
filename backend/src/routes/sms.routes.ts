import { Router } from "express";
import type { SmsRequest } from "@foodtrace/shared";
import { handleSmsCallback } from "../services/sms.service";

const router = Router();

router.post("/callback", async (req, res) => {
  const payload = req.body as Partial<SmsRequest>;
  const result = await handleSmsCallback({
    from: String(payload.from ?? ""),
    text: String(payload.text ?? ""),
  });
  res.type("text/plain").send(result.response);
});

export default router;

