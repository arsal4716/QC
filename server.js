const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const morgan = require("morgan");
const connectDB = require("./config/db.js")
const path = require('path');
const compression = require('compression'); // Add compression
dotenv.config();
connectDB();

const app = express();

// Add compression middleware
app.use(compression());

app.use(cors({
  origin: "*",  
  credentials: true,                 
}));
app.use(express.json({ limit: "10mb" }));
app.use(morgan("dev"));

// API routes
app.use('/webhook', require('./routes/callRoutes.js'));
app.use('/api/stats', require('./routes/stats'));        
app.use('/api', require('./routes/records'));   
app.use('/api', require('./routes/export'));
app.use('/api/auth', require('./routes/authRoutes.js'));
app.use('/api/', require('./routes/userRoute.js'));
app.use('/api', require('./routes/filters.js'));

// Serve static files with proper caching and without range requests
app.use(express.static(path.join(__dirname, 'frontend/build'), {
  etag: true,
  lastModified: true,
  setHeaders: (res, filePath) => {
    // Disable range requests to prevent 206 status
    res.setHeader('Accept-Ranges', 'none');
    
    // Set cache control for static assets
    if (filePath.includes('.js') || filePath.includes('.css') || filePath.includes('.png') || filePath.includes('.jpg') || filePath.includes('.webp')) {
      res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
    } else {
      res.setHeader('Cache-Control', 'public, max-age=0, must-revalidate');
    }
  }
}));

// Handle client-side routing
app.get('*', (req, res) => {
  res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
  res.sendFile(path.join(__dirname, 'frontend/build', 'index.html'));
});

app.use((req, res) => res.status(404).json({ success: false, error: { code: "NOT_FOUND", message: "Route not found" } }));

app.use((err, _req, res, _next) => {
  console.error("UNHANDLED:", err);
  res.status(500).json({ success: false, error: { code: "SERVER_ERROR", message: "Unhandled server error" } });
});

const PORT = process.env.PORT || 5007;
app.listen(PORT, () => console.log(`QC server listening on :${PORT}`));