const express = require('express');
const { getImage } = require('../controllers/imageController');
const { requireAuth, requireRole } = require('../middleware/auth');

const router = express.Router();

router.get('/:keyword', requireAuth, requireRole('child'), getImage);

module.exports = router;