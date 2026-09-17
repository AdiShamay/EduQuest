const express = require('express');
const { createChild, listChildren, login, register } = require('../controllers/authController');
const { requireAuth, requireRole } = require('../middleware/auth');

const router = express.Router();

router.post('/register', register);
router.post('/login', login);
router.get('/children', requireAuth, requireRole('parent'), listChildren);
router.post('/create-child', requireAuth, requireRole('parent'), createChild);

module.exports = router;
