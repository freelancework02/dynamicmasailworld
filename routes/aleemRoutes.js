const express = require("express");
const router = express.Router();
const multer = require("multer");
const aleemController = require("../controllers/aleemController");

// Multer setup (store image in memory as buffer for BLOB)
const storage = multer.memoryStorage();
const upload = multer({ storage });

// Create
router.post("/", upload.single("ProfileImg"), aleemController.createAleem);

// Read
router.get("/", aleemController.getAllAleem); // ?limit=10&offset=0
router.get("/:id", aleemController.getAleemById);
router.get("/:id/profile", aleemController.getProfileById);

// Update
router.put("/:id", upload.single("ProfileImg"), aleemController.updateAleem);

// Soft delete
router.delete("/:id", aleemController.deleteAleem);

module.exports = router;
