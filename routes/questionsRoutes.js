const express = require('express');
const router = express.Router();
const questionsController = require('../controllers/questionsController');

// Create new question
router.post('/', questionsController.createQuestion);

// Get all questions (optional)
router.get('/', questionsController.getAllQuestions);

// Get question by ID
router.get('/:id', questionsController.getQuestionById);

// Update question by ID
router.put('/:id', questionsController.updateQuestion);
// You might also allow PATCH if you want partial updates:
// router.patch('/:id', questionsController.updateQuestion);

// Delete question by ID
router.delete('/:id', questionsController.deleteQuestion);

module.exports = router;
