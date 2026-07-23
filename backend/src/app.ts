import cors from "cors";
import cookieParser from "cookie-parser";
import express from "express";
import helmet from "helmet";

import { ensureRuntimeReady } from "./bootstrap/runtime.js";
import { isDatabaseReady } from "./config/db.js";
import { env } from "./config/env.js";
import { generalApiRateLimiter } from "./middleware/rateLimit.js";
import { requestContextMiddleware } from "./middleware/requestContext.js";
import { errorHandler } from "./middleware/errorHandler.js";
import { notFoundHandler } from "./middleware/notFound.js";
import { apiRouter } from "./routes/index.js";
import { describeAiRuntime, hasAnyCloudAiConfigured } from "./services/ai/aiClient.js";

export const app = express();

app.disable("x-powered-by");
app.set("trust proxy", env.trustedProxy);
app.use(requestContextMiddleware);
// @ts-ignore - Vercel strict TS check doesn't see helmet's call signature
app.use(
  helmet({
    crossOriginResourcePolicy: false
  })
);
app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || env.clientOrigins.includes(origin)) {
        callback(null, true);
        return;
      }

      callback(new Error("Origin is not allowed by CORS."));
    },
    credentials: true
  })
);
app.use(cookieParser());
app.use(express.json({ limit: "5mb" }));
app.use(express.urlencoded({ extended: true }));
app.get("/health/live", (_req, res) => {
  res.json({
    success: true,
    message: "Adhyayan backend is live."
  });
});
app.use(async (req, _res, next) => {
  if (req.path === "/health/live") {
    next();
    return;
  }

  try {
    await ensureRuntimeReady();
    next();
  } catch (error) {
    next(error);
  }
});
app.get("/health/ready", (_req, res) => {
  const ready = isDatabaseReady();
  const payload = {
    success: ready,
    message: ready ? "Adhyayan backend is ready." : "Adhyayan backend is not ready.",
    checks: {
      database: ready ? "ready" : "not-ready",
      uploadStorageDriver: env.uploadStorageDriver,
      uploadFeatures: {
        imageDoubtsEnabled: env.enableAiImageDoubts,
        voiceDoubtsEnabled: env.enableAiVoiceDoubts,
        autoDisabledOnVercel: env.uploadFeaturesAutoDisabledOnVercel
      },
      aiProvider: hasAnyCloudAiConfigured() ? "configured" : "fallback",
      aiRuntime: describeAiRuntime()
    }
  };

  res.status(ready ? 200 : 503).json(payload);
});
app.get("/health", (_req, res) => {
  res.redirect(302, "/health/ready");
});
app.use("/api", generalApiRateLimiter, apiRouter);
app.use(notFoundHandler);
app.use(errorHandler);
