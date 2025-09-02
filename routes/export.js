const express = require('express');
const router = express.Router();
const callsController = require('../controllers/callController');
router.get('/calls/export', callsController.exportRecords);

module.exports = router;