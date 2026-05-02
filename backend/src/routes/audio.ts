import { Router } from "express";
import { TextToSpeechClient } from "@google-cloud/text-to-speech";
import type { SpeechLanguage, SpeechSummaryRequest, SpeechSummaryResponse } from "@foodtrace/shared";

const router = Router();
const ttsClient = new TextToSpeechClient();

function normalizeLanguage(language: unknown): SpeechLanguage {
  return language === "tw" ? "tw" : "en";
}

router.post("/speech", async (req, res) => {
  const body = (req.body ?? {}) as Partial<SpeechSummaryRequest>;
  const text = typeof body.text === "string" ? body.text.trim() : "";
  if (!text) {
    return res.status(400).json({ error: "text is required" });
  }

  const language = normalizeLanguage(body.language);
  const languageCode = language === "tw" ? "tw-GH" : "en-US";

  try {
    const [response] = await ttsClient.synthesizeSpeech({
      input: { text },
      voice: {
        languageCode,
        ssmlGender: "NEUTRAL",
      },
      audioConfig: {
        audioEncoding: "MP3",
      },
    });

    const audioContent = response.audioContent;
    const buffer =
      typeof audioContent === "string"
        ? Buffer.from(audioContent, "base64")
        : Buffer.isBuffer(audioContent)
          ? audioContent
          : Buffer.from(audioContent ?? []);

    const payload: SpeechSummaryResponse = {
      provider: "google",
      language,
      text,
      audioBase64: buffer.toString("base64"),
      mimeType: "audio/mpeg",
    };

    return res.json(payload);
  } catch (error) {
    return res.status(503).json({
      error: error instanceof Error ? error.message : "Google Text-to-Speech is unavailable",
      fallback: true,
      language,
    });
  }
});

export default router;
