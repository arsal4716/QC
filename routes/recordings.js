const express = require("express");
const jwt = require("jsonwebtoken");
const router = express.Router();
const callsController = require("../controllers/callController");

// The <audio> element cannot send an Authorization header, so this route
// also accepts the JWT via a `token` query param. It is still authenticated.
const authRecording = (req, res, next) => {
  const headerToken = req.headers.authorization?.replace("Bearer ", "");
  const token = headerToken || req.query.token;

  if (!token) {
    return res.status(401).json({ success: false, message: "Not authorized" });
  }

  try {
    req.user = jwt.verify(token, process.env.JWT_SECRET);
    next();
  } catch (err) {
    return res.status(401).json({ success: false, message: "Invalid token" });
  }
};

router.get("/calls/recording/:id", authRecording, callsController.streamRecording);

module.exports = router;
