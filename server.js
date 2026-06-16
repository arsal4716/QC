const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const compression = require("compression");
// const helmet = require("helmet");
const morgan = require("morgan");
const connectDB = require("./config/db.js")
const redis = require("./config/redis");
const path = require('path');
const capsRoutes = require('./routes/capsRoutes');
const { protect } = require('./middleware/authMiddleware');
dotenv.config();
connectDB();

// Best-effort cache connection. Enables short-TTL caching of records/stats/
// filter values, which makes repeated filter changes & pagination much faster.
// Failure is non-fatal — the app degrades gracefully to direct queries.
redis.connect().catch((err) =>
  console.warn("Redis cache unavailable:", err.message)
);

const app = express();
// gzip responses (notably CSV exports & JSON list payloads) for faster downloads
app.use(compression());
app.use(cors({
  origin: "*",
  credentials: true,
}));
app.use(express.urlencoded({ extended: true }))
app.use(express.json({ limit: "10mb" }));
// app.use(helmet());
app.use(morgan("dev"));
// Public: inbound call webhooks (Ringba / CallGrid) and auth endpoints
app.use('/webhook', require('./routes/callRoutes.js'));
app.use('/api/auth', require('./routes/authRoutes.js'));

// Recording proxy: authenticates via header OR ?token= so <audio> can play it
app.use('/api', require('./routes/recordings.js'));

// Caps mounts its own per-route auth (pixel fire stays public). Mounted before
// the prefix-level `protect` below so those public routes are reachable.
app.use('/api/caps', capsRoutes);

// Everything under /api below this line requires a valid JWT. Public routes
// (auth, recordings, caps pixel) are mounted above and respond before reaching
// this guard, so they remain accessible.
app.use('/api', protect);
app.use('/api', require('./routes/stats'));
app.use('/api', require('./routes/records'));
app.use('/api', require('./routes/export'));
app.use('/api/', require('./routes/userRoute.js'));
app.use('/api', require('./routes/filters.js'));

app.use(express.static(path.join(__dirname, 'frontend/build')));
app.get(/^\/(?!api).*$/, (req, res) => {
  res.sendFile(path.join(__dirname, 'frontend/build', 'index.html'));
});

// if (process.env.NODE_ENV === "production") {
//   const path = require("path");
//   app.use(express.static(path.join(__dirname, "frontend/build")));

//   app.get(/^\/(?!api).*/, (req, res) => {
//     res.sendFile(path.join(__dirname, "frontend/build", "index.html"));
//   });
// }

app.use((req, res) => res.status(404).json({ success: false, error: { code: "NOT_FOUND", message: "Route not found" } }));

app.use((err, _req, res, _next) => {
  console.error("UNHANDLED:", err);
  res.status(500).json({ success: false, error: { code: "SERVER_ERROR", message: "Unhandled server error" } });
});

const PORT = process.env.PORT || 5007;
app.listen(PORT, () => console.log(`QC server listening on :${PORT}`));
