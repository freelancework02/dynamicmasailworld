// const express = require("express");
// const router = express.Router();
// const multer = require("multer");
// const articleController = require("../controllers/articleController");

// // Multer setup: store file in memory (buffer)
// const storage = multer.memoryStorage();
// const upload = multer({ storage });

// // Create article with image
// router.post("/", upload.single("coverImage"), articleController.createArticle);

// // Read
// router.get("/", articleController.getAllArticles); // ?limit=10&offset=0
// router.get("/:id", articleController.getArticleById);
// router.get("/:id/image", articleController.getArticleImage); // get only cover image

// // Update (with optional image)
// router.put("/:id", upload.single("coverImage"), articleController.updateArticle);

// // Delete (soft delete)
// router.delete("/:id", articleController.deleteArticle);

// module.exports = router;





// routes/articleRoutes.js
const express = require("express");
const router = express.Router();
const multer = require("multer");
const rateLimit = require("express-rate-limit");
const articleController = require("../controllers/articleController");

// Multer setup: store file in memory (buffer)
const storage = multer.memoryStorage();
const upload = multer({ storage });

// Write limiter (views/likes)
const writeLimiter = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 minutes
  max: 60,                 // 60 writes per IP per window
  standardHeaders: true,
  legacyHeaders: false,
});

// Create article with image
router.post("/", upload.single("coverImage"), articleController.createArticle);

// Read
router.get("/", articleController.getAllArticles); // ?limit=10&offset=0
router.get("/:id/image", articleController.getArticleImage); // get only cover image

// Views & Likes (put these **before** generic :id)
router.post("/:id/view", writeLimiter, articleController.addView);
router.post("/:id/like", writeLimiter, articleController.likeArticle);
router.delete("/:id/like", writeLimiter, articleController.unlikeArticle);
router.get("/:id/like/me", articleController.myLikeStatus);

// Single article (after views/likes)
router.get("/:id", articleController.getArticleById);

// Update (with optional image)
router.put("/:id", upload.single("coverImage"), articleController.updateArticle);

// Delete (soft delete)
router.delete("/:id", articleController.deleteArticle);

module.exports = router;
