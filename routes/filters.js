const express = require("express");
const router = express.Router();
const FiltersController = require("../controllers/filters");
router.get("/filters/campaigns", FiltersController.listCampaigns);
router.get("/filters/publishers", FiltersController.listPublishers);
router.get("/filters/targets", FiltersController.listTargets);
router.get("/filters/buyers", FiltersController.listBuyers);
router.get("/filters/all", FiltersController.listAll);
module.exports = router;
