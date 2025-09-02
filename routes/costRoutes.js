const express = require('express');
const router = express.Router();
const costController = require('../controllers/costController');

router.get('/cost/stats', costController.getCostStats);
router.get('/cost/payments', costController.getPaymentHistory);

module.exports = router;