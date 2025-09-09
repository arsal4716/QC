const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const morgan = require("morgan");
const connectDB = require("./config/db.js");
const path = require("path");
const compression = require("compression");

dotenv.config();
connectDB();

const app = express();

// Compression middleware for better performance
app.use(compression());

app.use(cors({
  origin: "*",
  credentials: true,
}));
app.use(express.json({ limit: "10mb" }));
app.use(morgan("dev"));

// API routes
app.use("/webhook", require("./routes/callRoutes.js"));
app.use("/api/stats", require("./routes/stats"));
app.use("/api", require("./routes/records"));
app.use("/api", require("./routes/export"));
app.use("/api/auth", require("./routes/authRoutes.js"));
app.use("/api/", require("./routes/userRoute.js"));
app.use("/api", require("./routes/filters.js"));

// Serve static files
app.use(express.static(path.join(__dirname, "frontend/build"), {
  setHeaders: (res, filePath) => {
    res.setHeader("Accept-Ranges", "none"); // prevent 206

    if (filePath.match(/\.(js|css|png|jpg|jpeg|webp|svg)$/)) {
      res.setHeader("Cache-Control", "public, max-age=31536000, immutable");
    }
  }
}));

// Ignore .map requests in production (optional)
app.get("*.map", (req, res) => {
  res.status(204).send();
});

app.get(/^\/(?!api)(?!.*\.\w+$).*$/, (req, res) => {
  res.sendFile(path.join(__dirname, "frontend/build", "index.html"));
});

app.use((req, res) =>
  res.status(404).json({
    success: false,
    error: { code: "NOT_FOUND", message: "Route not found" },
  })
);

app.use((err, _req, res, _next) => {
  console.error("UNHANDLED:", err);
  res.status(500).json({
    success: false,
    error: { code: "SERVER_ERROR", message: "Unhandled server error" },
  });
});

const PORT = process.env.PORT || 5007;
app.listen(PORT, () => console.log(`QC server listening on :${PORT}`));
