const express = require('express');
const router = express.Router();
const { getCaps, fetchAndSaveCaps, updateTarget } = require('../controllers/capsController');

router.get('/', getCaps);
router.post('/fetch', fetchAndSaveCaps);
router.patch('/target/:id', updateTarget); 

module.exports = router;
