// routes/activityRoutes.js
const express = require("express");
const router = express.Router();
const activityController = require("../controllers/activityController");

/**
 * GET /api/activity/recent?limit=6
 * Latest items from each table (by id DESC).
 */
router.get("/recent", activityController.getRecentActivity);

module.exports = router;
