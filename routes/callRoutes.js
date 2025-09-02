const express = require("express");
const router = express.Router();
const webhookController = require("../controllers/webhookController");
router.post("/ringba", webhookController.receiveWebhook);

module.exports = router;