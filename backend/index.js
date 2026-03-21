const express = require("express");
const cors = require("cors");
const session = require("express-session");
const cookieParser = require("cookie-parser");
require("dotenv").config();

const passport = require("./config/passport");
const authRoutes = require("./routes/authRoutes");
const scheduleRoutes = require("./routes/scheduleRoutes");
const githubRoutes = require("./routes/githubRoutes");
const workflowRoutes = require("./routes/workflowRoutes");
const debugRoutes = require("./routes/debugRoutes");
const { loadSchedules, scheduleJob } = require("./services/schedulerService");

const app = express();

const DEFAULT_FRONTEND_URL = "https://autogreener.onrender.com";
const rawFrontendUrl = process.env.FRONTEND_URL || DEFAULT_FRONTEND_URL;
let frontendOrigin = DEFAULT_FRONTEND_URL;

try {
  frontendOrigin = new URL(rawFrontendUrl).origin;
} catch (error) {
  console.warn(
    `Invalid FRONTEND_URL provided (${rawFrontendUrl}). Falling back to ${DEFAULT_FRONTEND_URL}`,
  );
}

// Required on Render so secure cookies can be set behind reverse proxy.
app.set("trust proxy", 1);

// Middleware
app.use(
  cors({
    origin: frontendOrigin,
    credentials: true, // Allow cookies to be sent
  }),
);
app.use(express.json());
app.use(cookieParser());

// Session configuration
app.use(
  session({
    secret:
      process.env.SESSION_SECRET || "pushpilot-secret-key-change-in-production",
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: process.env.NODE_ENV === "production", // HTTPS only in production
      httpOnly: true,
      sameSite: "none", // Allow cross-origin cookies for frontend/backend on different domains
      maxAge: 24 * 60 * 60 * 1000, // 24 hours
    },
  }),
);

// Initialize Passport
app.use(passport.initialize());
app.use(passport.session());

// Routes
app.get("/", (req, res) => {
  res.json({
    message: "PushPilot Backend API",
    version: "2.0.0",
    status: "running",
    authenticated: req.isAuthenticated(),
  });
});

// Auth Routes
app.use("/auth", authRoutes);

// API Routes
app.use("/api/schedule", scheduleRoutes);
app.use("/api/github", githubRoutes);
app.use("/api/workflow", workflowRoutes);
app.use("/api/debug", debugRoutes);

// Health check endpoint
app.get("/api/health", (req, res) => {
  res.json({
    status: "healthy",
    timestamp: new Date().toISOString(),
  });
});

const PORT = process.env.PORT || 5000;

// Start server and load schedules
app.listen(PORT, async () => {
  console.log(`🚀 Server is running on port ${PORT}`);
  console.log(`📍 API endpoint: http://localhost:${PORT}/api/schedule`);

  // Load and schedule all pending jobs from database
  try {
    await loadSchedules();
    console.log("✅ Schedules loaded successfully\n");
  } catch (error) {
    console.error("❌ Error loading schedules:", error);
  }
});
