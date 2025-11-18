const express = require('express');
const router = express.Router();
const { 
  getCaps, 
  fetchAndSaveCaps, 
  updateTarget, 
  processPixelFire 
} = require('../controllers/capsController');

router.get('/', getCaps);
router.post('/fetch', fetchAndSaveCaps);
router.patch('/target/:id', updateTarget);
router.get('/pixel', processPixelFire); 

module.exports = router;