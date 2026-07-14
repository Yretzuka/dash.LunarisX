const express = require('express');
const { body } = require('express-validator');
const { requireAuth } = require('../middleware/auth');
const validate = require('../middleware/validate');
const { generateKey, redeemKey, keyStatus } = require('../controllers/keyController');

const router = express.Router();

router.use(requireAuth);

router.get('/status', keyStatus);
router.post('/generate', generateKey);
router.post('/redeem', body('value').isString().trim().notEmpty(), validate, redeemKey);

module.exports = router;
