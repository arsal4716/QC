const express = require('express');
const router = express.Router();
const callsController = require('../controllers/callController');
router.get('/calls/records', callsController.getRecords);
router.get('/calls/records/:id', callsController.getRecordDetail);

module.exports = router;