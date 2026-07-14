const express = require('express');
const { requireAuth } = require('../middleware/auth');
const { me } = require('../controllers/authController');

const router = express.Router();

router.get('/profile', requireAuth, me);

module.exports = router;
