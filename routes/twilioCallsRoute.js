const express = require('express');
const router = express.Router();
const controller = require('../controllers/twilioCallsController');

// Twilio Webhooks
router.post('/inbound', controller.inboundCall);
router.post('/recording', controller.recordingCallback);

// CRM API
router.get('/', controller.getCalls);

module.exports = router;
