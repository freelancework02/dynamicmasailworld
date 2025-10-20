// routes/statsRoutes.js
const express = require('express');
const router = express.Router();
const { getTotals } = require('../controllers/StatusController');

// GET /api/stats/totals
router.get('/totals', getTotals);

module.exports = router;
