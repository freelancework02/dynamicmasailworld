const express = require('express');
const router = express.Router();
const writerController = require('../controllers/writerController');
const multer = require('multer');

// Multer memory storage to keep files in buffer (no saving to disk)
const storage = multer.memoryStorage();
const upload = multer({ storage });

// GET all writers (no photo data)
router.get('/', writerController.getAllWriters);

// GET single writer by ID (no photo data)
router.get('/:id', writerController.getWriterById);

// GET writer image by ID (returns photo binary)
router.get('/image/:id', writerController.getWriterImage);

// POST new writer with optional photo upload
router.post('/', upload.single('Photo'), writerController.createWriter);

// PATCH update writer, including optional photo
router.patch('/:id', upload.single('Photo'), writerController.updateWriter);

// DELETE writer by ID
router.delete('/:id', writerController.deleteWriter);

module.exports = router;
