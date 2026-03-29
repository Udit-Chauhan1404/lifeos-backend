require("dotenv").config();
const express       = require("express");
const helmet        = require("helmet");
const compression   = require("compression");
const morgan        = require("morgan");
const mongoSanitize = require("express-mongo-sanitize");
const xssClean      = require("xss-clean");
const rateLimit     = require("express-rate-limit");
const errorHandler  = require("./middleware/errorHandler");
const logger        = require("./utils/logger");

const app = express();
app.set("trust proxy", 1);

// ── CORS — manual headers (works with all origins) ──────────────────
app.use((req, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", req.headers.origin || "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,PUT,PATCH,DELETE,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type,Authorization,Accept");
  res.setHeader("Access-Control-Allow-Credentials", "true");
  res.setHeader("Access-Control-Max-Age", "86400");
  if (req.method === "OPTIONS") return res.sendStatus(204);
  next();
});

app.use(helmet({ crossOriginResourcePolicy: false }));

// Stripe webhook needs raw body BEFORE json parser
app.use("/api/stripe/webhook", express.raw({ type: "application/json" }));
app.use(express.json({ limit: "10kb" }));
app.use(express.urlencoded({ extended: true, limit: "10kb" }));
app.use(compression());
app.use(mongoSanitize());
app.use(xssClean());

if (process.env.NODE_ENV === "development") {
  app.use(morgan("dev"));
} else {
  app.use(morgan("combined", { stream: { write: (m) => logger.http(m.trim()) } }));
}

app.use("/api", rateLimit({
  windowMs: 15 * 60 * 1000, max: 500,
  message: { success: false, message: "Too many requests. Try again later." },
}));

app.get("/health", (_req, res) => res.json({ status: "ok", timestamp: new Date().toISOString() }));

app.use("/api/auth",          require("./routes/authRoutes"));
app.use("/api/tasks",         require("./routes/taskRoutes"));
app.use("/api/habits",        require("./routes/habitRoutes"));
app.use("/api/goals",         require("./routes/goalRoutes"));
app.use("/api/notes",         require("./routes/noteRoutes"));
app.use("/api/events",        require("./routes/eventRoutes"));
app.use("/api/workspaces",    require("./routes/workspaceRoutes"));
app.use("/api/ai",            require("./routes/aiRoutes"));
app.use("/api/analytics",     require("./routes/analyticsRoutes"));
app.use("/api/stripe",        require("./routes/stripeRoutes"));
app.use("/api/notifications", require("./routes/notificationRoutes"));
app.use("/api/activity",      require("./routes/activityRoutes"));

app.all("*", (req, res) => res.status(404).json({ success: false, message: `Route ${req.originalUrl} not found` }));
app.use(errorHandler);

module.exports = app;
