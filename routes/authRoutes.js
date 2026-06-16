const express = require("express");
const authController = require("../controllers/authController");
const { register, login } = require("../controllers/authController");
const { protect } = require("../middleware/authMiddleware");
const router = express.Router();

// Public auth endpoints
router.post("/register", register);
router.post("/login", authController.rateLimiter, login);
router.get("/verify", authController.verifyToken);
router.post("/refresh", authController.refreshToken);

// Authenticated endpoints
router.get("/profile", protect, authController.getProfile);
router.post("/logout", protect, authController.logout);

module.exports = router;
