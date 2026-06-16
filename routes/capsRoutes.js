const express = require("express");
const router = express.Router();
const { protect } = require("../middleware/authMiddleware");
const {
  getCaps,
  updateTarget,
  processPixelFire,
  exportCaps
} = require("../controllers/capsController");

// Pixel fire is an external (unauthenticated) tracking callback.
router.get("/pixel", processPixelFire);

// Dashboard data requires a valid session.
router.get("/", protect, getCaps);
router.patch("/target/:id", protect, updateTarget);
router.get("/export", protect, exportCaps);

module.exports = router;
