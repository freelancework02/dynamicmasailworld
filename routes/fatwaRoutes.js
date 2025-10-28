const express = require("express");
const router = express.Router();
const fatwaController = require("../controllers/fatwaController");

// Insert
router.post("/website", fatwaController.addQuestionFromWebsite); // user submits question
router.post("/dashboard", fatwaController.addFatwaFromDashboard); // admin creates directly

router.get("/pending", fatwaController.getPendingFatwas);

 
// Search
router.get("/search", fatwaController.searchFatawa);  // Search Fatawa by Title, slug, or detailquestion

// Read
router.get("/", fatwaController.getAllFatwas); // with ?limit=10&offset=0
router.get("/latest", fatwaController.getLatestFatwas); // latest 3 fatawa

// Recently viewed
router.get('/recently-viewed', fatwaController.getRecentlyViewedFatwa);

// ✅ NEW: Tag-wise API — place BEFORE "/:id"
router.get("/by-tag", fatwaController.getByTag);

// Add both methods so sendBeacon(POST) and curl(PUT) work
router.post('/:id/view', fatwaController.incrementFatwaView);
router.put('/:id/view',  fatwaController.incrementFatwaView);

//Website question answer
router.put("/:id/answer", fatwaController.answerFatwa);

// routes/fatwa.routes.js
router.get("/by-tag", fatwaController.getByTag); // <-- before "/:id"

router.get("/:id", fatwaController.getFatwaById);


// New tag-wise endpoint
router.get('/api/fatawa/by-tag', fatwaController.getByTag);

// Update
router.put("/:id", fatwaController.updateFatwa);

// Delete (soft delete)
router.delete("/:id", fatwaController.deleteFatwa);

module.exports = router;




