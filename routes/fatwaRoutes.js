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

//Website question answer
router.put("/:id/answer", fatwaController.answerFatwa);

router.get("/:id", fatwaController.getFatwaById);

// Update
router.put("/:id", fatwaController.updateFatwa);

// Delete (soft delete)
router.delete("/:id", fatwaController.deleteFatwa);

module.exports = router;




