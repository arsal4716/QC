const jwt = require("jsonwebtoken");
require('dotenv').config();
exports.protect = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ message: "Not authorized" });
  }

  try {
    const token = authHeader.split(" ")[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    const expired = err && err.name === "TokenExpiredError";
    return res.status(401).json({
      success: false,
      message: expired ? "Token expired" : "Invalid token",
      code: expired ? "TOKEN_EXPIRED" : "INVALID_TOKEN",
    });
  }
};

exports.adminOnly = (req, res, next) => {
  if (req.user.role !== "admin") {
    return res.status(403).json({ message: "Access denied" });
  }
  next();
};
