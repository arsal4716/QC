const express = require("express");
const router = express.Router();
const {
  getCaps,
  updateTarget,
  processPixelFire,
  exportCaps
} = require("../controllers/capsController");

router.get("/", getCaps);
router.patch("/target/:id", updateTarget);
router.get("/export",exportCaps);
router.get("/pixel", processPixelFire);

module.exports = router;
