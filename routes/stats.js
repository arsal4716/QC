const express = require('express');
const router = express.Router();
const callsController = require('../controllers/callController');
router.get('/', callsController.getStats);

module.exports = router;