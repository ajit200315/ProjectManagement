import path from "node:path";
import fs from "node:fs";
import { fileURLToPath } from "node:url";
import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import helmet from "helmet";
import compression from "compression";

import healthcheckRouter from "./routes/healthcheck.routes.js";
import authRouter from "./routes/auth.routes.js";
import projectRouter from "./routes/project.routes.js";
import { errorHandler, notFound } from "./middlewares/error.middleware.js";
import {
  apiLimiter,
  authLimiter,
} from "./middlewares/rate-limit.middleware.js";

const app = express();

// Behind a hosting proxy (Render, Railway, Fly, Heroku, nginx) this is what
// makes req.protocol and the client IP correct — the latter is what the rate
// limiter buckets on, so without it everyone shares one bucket.
app.set("trust proxy", 1);

app.use(helmet());
app.use(compression());
app.use(express.json({ limit: "16kb" }));
app.use(express.urlencoded({ extended: true, limit: "16kb" }));
app.use(cookieParser());

app.use(
  cors({
    origin: process.env.CORS_ORIGIN?.split(",") ?? "http://localhost:5173",
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  }),
);

app.use("/api", apiLimiter);

app.use("/api/v1/healthcheck", healthcheckRouter);
app.use("/api/v1/auth", authLimiter, authRouter);
app.use("/api/v1/projects", projectRouter);

// In production the built client is served from this same origin, which also
// means the browser makes no cross-origin request and the auth cookies are
// never third-party. Falls through quietly when the client has not been built.
const clientDist = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../client/dist",
);
const indexHtml = path.join(clientDist, "index.html");

if (fs.existsSync(indexHtml)) {
  app.use(express.static(clientDist, { index: false }));

  // Client-side routing: any non-API GET that got this far is a deep link
  // like /projects/abc, which the browser must receive index.html for.
  app.use((req, res, next) => {
    if (req.method !== "GET" || req.path.startsWith("/api/")) return next();
    res.sendFile(indexHtml);
  });
} else {
  app.get("/", (req, res) => {
    res.send("Project Management API. See /api/v1/healthcheck");
  });
}

// Must stay last: unmatched routes become a 404 ApiError, and everything
// thrown above is serialized here.
app.use(notFound);
app.use(errorHandler);

export default app;
