const express = require("express");
const router = express.Router();
const FiltersController = require("../controllers/filters");
router.get("/api/filters/campaigns", FiltersController.listCampaigns);
router.get("/api/filters/publishers", FiltersController.listPublishers);
router.get("/api/filters/all", FiltersController.listAll);

module.exports = router;
