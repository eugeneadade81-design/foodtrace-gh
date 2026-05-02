import { Router } from "express";
import type { UssdRequest } from "@foodtrace/shared";
import { handleUssdCallback } from "../services/ussd.service";

const router = Router();

router.post("/callback", async (req, res) => {
  const payload = req.body as Partial<UssdRequest>;
  const result = await handleUssdCallback({
    sessionId: String(payload.sessionId ?? ""),
    serviceCode: String(payload.serviceCode ?? ""),
    phoneNumber: String(payload.phoneNumber ?? ""),
    text: String(payload.text ?? ""),
  });
  res.type("text/plain").send(result.response);
});

export default router;

