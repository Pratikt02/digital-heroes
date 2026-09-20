const express = require("express");
const helmet = require("helmet");
const cors = require("cors");
const cookieParser = require("cookie-parser");
const env = require("./config/env");
const { connectDB } = require("./config/db");
const { notFound, errorHandler } = require("./middleware/errorHandler");

const app = express();

app.set("trust proxy", 1); // Vercel sits behind a proxy; needed for rate limiting and secure cookies
app.use(helmet());

// In production the client proxies /api (same-origin), so CORS only matters for local dev.
app.use(cors({ origin: env.CLIENT_URL, credentials: true }));

// PHASE 5: register the Stripe webhook HERE, before express.json():
//   app.post("/api/webhooks/stripe", express.raw({ type: "application/json" }), stripeWebhook);

app.use(express.json({ limit: "100kb" }));
app.use(cookieParser());

// Health check works even if the database is down.
app.get("/api/health", (req, res) => res.json({ ok: true, env: env.NODE_ENV, time: new Date().toISOString() }));

// Ensure the DB is connected before any other /api route runs (cached across invocations).
app.use("/api", async (req, res, next) => {
  try {
    await connectDB();
    next();
  } catch (err) {
    next(err);
  }
});

app.use("/api", require("./routes"));

app.use(notFound);
app.use(errorHandler);

module.exports = app;
