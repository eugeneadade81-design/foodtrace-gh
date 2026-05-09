import "./loadEnv";
import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import path from "path";
import authRouter from "./routes/auth";
import foodRouter from "./routes/food";
import manufacturerRouter from "./routes/manufacturer";
import drugRouter from "./routes/drug";
import regulatorRouter from "./routes/regulator";
import audioRouter from "./routes/audio";
import scanRouter from "./routes/scan";
import ussdRouter from "./routes/ussd.routes";
import smsRouter from "./routes/sms.routes";
import assistantRouter from "./routes/assistant";
import { checkDatabaseConnection } from "./config/db";
import { checkRedisConnection } from "./lib/scanCache";
import { createRateLimit } from "./middleware/rateLimit";
import { errorHandler } from "./middleware/error";

const app = express();
const frontendOrigins = process.env.FRONTEND_URL?.split(",").map((item) => item.trim()).filter(Boolean) ?? [];
const mobileOrigins = process.env.MOBILE_ORIGINS?.split(",").map((item) => item.trim()).filter(Boolean) ?? [];
const localOrigins = ["http://localhost:5173", "http://127.0.0.1:5173"];
const allowedOrigins = Array.from(new Set([...frontendOrigins, ...mobileOrigins, ...localOrigins]));
const apiRateLimit = createRateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 100,
  message: "Too many requests. Please try again later.",
});

app.use(helmet());
app.use(
  cors({
    origin: allowedOrigins.length ? allowedOrigins : true,
  })
);
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(morgan("dev"));
app.use("/uploads", express.static(path.join(process.cwd(), "uploads")));
app.use("/api", apiRateLimit);

app.get("/health", async (_req, res) => {
  const [database, redis] = await Promise.all([checkDatabaseConnection(), checkRedisConnection()]);
  const healthy = database === "connected" && (redis === "connected" || redis === "memory_fallback");

  res.status(healthy ? 200 : 503).json({
    status: healthy ? "ok" : "degraded",
    timestamp: new Date().toISOString(),
    database,
    redis,
  });
});

app.get("/api", (_req, res) => {
  res.json({ ok: true, service: "foodtrace-gh-api", version: "v1" });
});

app.use("/api/auth", authRouter);
app.use("/api/audio", audioRouter);
app.use("/api/scan", scanRouter);
app.use("/api/food", foodRouter);
app.use("/api/farmer", foodRouter);
app.use("/api/manufacturer", manufacturerRouter);
app.use("/api/drug", drugRouter);
app.use("/api/drugs", drugRouter);
app.use("/api/pharmacy", drugRouter);
app.use("/api/regulator", regulatorRouter);
app.use("/api/assistant", assistantRouter);
app.use("/api/ussd", ussdRouter);
app.use("/api/sms", smsRouter);

app.use(errorHandler);

const port = Number(process.env.PORT || 3000);

app.listen(port, () => {
  console.log(`FoodTrace GH backend scaffold ready on port ${port}`);
});
