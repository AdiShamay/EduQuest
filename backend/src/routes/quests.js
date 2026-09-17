const express = require('express');
const { answerQuest, startQuest } = require('../controllers/questController');
const { requireAuth, requireRole } = require('../middleware/auth');

const router = express.Router();

router.use(requireAuth, requireRole('child'));
router.post('/start', startQuest);
router.post('/answer', answerQuest);

module.exports = router;
