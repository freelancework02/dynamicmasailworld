// const express = require("express");
// const router = express.Router();
// const fatwaController = require("../controllers/fatwaController");

// // Insert
// router.post("/website", fatwaController.addQuestionFromWebsite); // user submits question
// router.post("/dashboard", fatwaController.addFatwaFromDashboard); // admin creates directly

// router.get("/pending", fatwaController.getPendingFatwas);

 
// // Search
// router.get("/search", fatwaController.searchFatawa);  // Search Fatawa by Title, slug, or detailquestion

// // Read
// router.get("/", fatwaController.getAllFatwas); // with ?limit=10&offset=0
// router.get("/latest", fatwaController.getLatestFatwas); // latest 3 fatawa

// //Website question answer
// router.put("/:id/answer", fatwaController.answerFatwa);

// router.get("/:id", fatwaController.getFatwaById);

// // Update
// router.put("/:id", fatwaController.updateFatwa);

// // Delete (soft delete)
// router.delete("/:id", fatwaController.deleteFatwa);

// module.exports = router;





const express = require("express");
const router = express.Router();
const fatwaController = require("../controllers/fatwaController");
const rateLimit = require("express-rate-limit");

// ───────────────────────────────────────────────────────────
// Rate limit: apply only to write endpoints (views/likes)
// ───────────────────────────────────────────────────────────
const writeLimiter = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 minutes
  max: 60,                  // 60 writes per window per IP
  standardHeaders: true,
  legacyHeaders: false,
});

// ───────────────────────────────────────────────────────────
// Insert
// ───────────────────────────────────────────────────────────
router.post("/website", fatwaController.addQuestionFromWebsite);  // user submits question
router.post("/dashboard", fatwaController.addFatwaFromDashboard); // admin creates directly

// ───────────────────────────────────────────────────────────
// Admin: pending
// ───────────────────────────────────────────────────────────
router.get("/pending", fatwaController.getPendingFatwas);

// ───────────────────────────────────────────────────────────
// Search
// ───────────────────────────────────────────────────────────
router.get("/search", fatwaController.searchFatawa); // by Title, slug, or detailquestion

// ───────────────────────────────────────────────────────────
// Read
// ───────────────────────────────────────────────────────────
router.get("/", fatwaController.getAllFatwas);          // with ?limit=10&offset=0
router.get("/latest", fatwaController.getLatestFatwas); // latest 3 fatawa

// ───────────────────────────────────────────────────────────
// Views & Likes
// ───────────────────────────────────────────────────────────
router.post("/:id/view", writeLimiter, fatwaController.addView);       // count unique view (per day per anon)
router.post("/:id/like", writeLimiter, fatwaController.likeFatwa);     // like (idempotent)
router.delete("/:id/like", writeLimiter, fatwaController.unlikeFatwa); // unlike (idempotent)
router.get("/:id/like/me", fatwaController.myLikeStatus);              // has this anon liked?

// ───────────────────────────────────────────────────────────
// Website question answer
// ───────────────────────────────────────────────────────────
router.put("/:id/answer", fatwaController.answerFatwa);

// ───────────────────────────────────────────────────────────
// Get single, Update, Delete (keep AFTER specific routes above)
// ───────────────────────────────────────────────────────────
router.get("/:id", fatwaController.getFatwaById);

// Update
router.put("/:id", fatwaController.updateFatwa);

// Delete (soft delete)
router.delete("/:id", fatwaController.deleteFatwa);

module.exports = router;
