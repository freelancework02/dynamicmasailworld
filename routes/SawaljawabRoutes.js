// routes/questionsRoutes.js
const express = require('express');
const router = express.Router();
const questionsController = require('../controllers/Sawaljawab'); // Your controller file

// ================= Routes for Questions & Answers ================= //

// GET - Fetch all non-deleted records
router.get('/all', questionsController.getQuestionsAnswers);

// GET - Fetch a single record by ID
router.get('/:id', questionsController.getQuestionAnswerById);

// POST - Add a new record
router.post('/add', questionsController.addQuestionAnswer);

// PUT - Update a record by ID
router.put('/:id', questionsController.updateQuestionAnswer);

// PATCH - Approve a record
router.patch('/approve/:id', questionsController.approveQuestionAnswer);

// DELETE - Soft delete a record
router.delete('/:id', questionsController.deleteQuestionAnswer);

module.exports = router;
