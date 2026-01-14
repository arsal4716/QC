const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
// const helmet = require("helmet");
const morgan = require("morgan");
const connectDB = require("./config/db.js")
const path = require('path');
const capsRoutes = require('./routes/capsRoutes');
dotenv.config();
connectDB();

const app = express();
app.use(cors({
  origin: "*",  
  credentials: true,                 
}));
app.use(express.urlencoded({ extended: true }))
app.use(express.json({ limit: "10mb" }));
// app.use(helmet());
app.use(morgan("dev"));
app.use('/webhook', require('./routes/callRoutes.js'));
app.use('/api', require('./routes/stats'));        
app.use('/api', require('./routes/records'));   
app.use('/api', require('./routes/export'));
app.use('/api/auth', require('./routes/authRoutes.js'));
app.use('/api/', require('./routes/userRoute.js'));
app.use('/api', require('./routes/filters.js'));
app.use('/api/caps', capsRoutes);
app.use('/api/twilioCalls', require('./routes/twilioCallsRoute.js'));

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
