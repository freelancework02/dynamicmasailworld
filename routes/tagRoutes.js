const express = require("express");
const router = express.Router();
const multer = require("multer");
const tagController = require("../controllers/tagController");

// Multer setup (store image in memory as buffer for BLOB)
const storage = multer.memoryStorage();
const upload = multer({ storage });

// Create
router.post("/", upload.single("tagsCover"), tagController.createTag);

// Read
router.get("/", tagController.getAllTags); // ?limit=10&offset=0
router.get("/:id", tagController.getTagById);
router.get("/:id/cover", tagController.getTagCoverById);

// Update
router.put("/:id", upload.single("tagsCover"), tagController.updateTag);

// Soft delete
router.delete("/:id", tagController.deleteTag);

module.exports = router;
