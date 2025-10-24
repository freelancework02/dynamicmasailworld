const express = require("express");
const router = express.Router();
const multer = require("multer");
const bookController = require("../controllers/bookController");

// ✅ Multer setup (memory storage for BLOBs)
const storage = multer.memoryStorage();
const upload = multer({ storage });

// ✅ Create book (with cover + pdf)
router.post(
  "/",
  upload.fields([
    { name: "BookCoverImg", maxCount: 1 },
    { name: "BookPDF", maxCount: 1 },
  ]),
  bookController.createBook
);

// ✅ Read routes
router.get("/", bookController.getAllBooks); // ?limit=10&offset=0
router.get("/:id", bookController.getBookById);
router.get("/:id/cover", bookController.getBookCoverById);
router.get("/:id/pdf", bookController.getBookPdfById);

// ✅ Update (with optional files)
router.put(
  "/:id",
  upload.fields([
    { name: "BookCoverImg", maxCount: 1 },
    { name: "BookPDF", maxCount: 1 },
  ]),
  bookController.updateBook
);



// Route to increase view count
router.post('/:id/view', bookController.incrementBookView);

// ✅ Soft delete
router.delete("/:id", bookController.deleteBook);

module.exports = router;
