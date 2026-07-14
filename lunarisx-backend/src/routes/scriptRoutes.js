const express = require('express');
const { listUpdates } = require('../controllers/scriptController');

const router = express.Router();

router.get('/updates', listUpdates);

module.exports = router;
