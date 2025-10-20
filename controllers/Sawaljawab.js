const db = require('../db');

// Get all active Questions & Answers
exports.getQuestionsAnswers = async (req, res) => {
  try {
    const sql = `SELECT * FROM QuestionsAnswers WHERE IsDelete = 0 ORDER BY ID DESC`;
    const [rows] = await db.query(sql);
    res.json({ success: true, data: rows });
  } catch (error) {
    console.error('❌ getQuestionsAnswers error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch questions and answers' });
  }
};

// Get single Question & Answer by ID
exports.getQuestionAnswerById = async (req, res) => {
  try {
    const { id } = req.params;
    const sql = `SELECT * FROM QuestionsAnswers WHERE ID = ? AND IsDelete = 0 LIMIT 1`;
    const [rows] = await db.query(sql, [id]);

    if (rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Question/Answer not found' });
    }

    res.json({ success: true, data: rows[0] });
  } catch (error) {
    console.error('❌ getQuestionAnswerById error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch question/answer' });
  }
};

// Add new Question & Answer
exports.addQuestionAnswer = async (req, res) => {
  try {
    const data = req.body;
    const sql = `
      INSERT INTO QuestionsAnswers
      (FullName, Email, WhatsAppNumber, CountryCity, Question, Answer,
       ReferenceAndDate, CorrectedReference, DarulIftaName, AnswerDate,
       Rating, Category, Topic, IsDelete, Approved)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, 0)
    `;

    const [result] = await db.query(sql, [
      data.FullName, data.Email, data.WhatsAppNumber, data.CountryCity,
      data.Question, data.Answer, data.ReferenceAndDate, data.CorrectedReference,
      data.DarulIftaName, data.AnswerDate, data.Rating, data.Category, data.Topic
    ]);

    res.status(201).json({ success: true, id: result.insertId, message: 'Added successfully' });
  } catch (error) {
    console.error('❌ addQuestionAnswer error:', error);
    res.status(500).json({ success: false, error: 'Failed to add question/answer' });
  }
};

// Update Question & Answer
exports.updateQuestionAnswer = async (req, res) => {
  try {
    const { id } = req.params;
    const data = req.body;

    const sql = `
      UPDATE QuestionsAnswers SET
      FullName=?, Email=?, WhatsAppNumber=?, CountryCity=?, Question=?, Answer=?,
      ReferenceAndDate=?, CorrectedReference=?, DarulIftaName=?, AnswerDate=?,
      Rating=?, Category=?, Topic=?, Approved=?
      WHERE ID=? AND IsDelete=0
    `;

    const [result] = await db.query(sql, [
      data.FullName, data.Email, data.WhatsAppNumber, data.CountryCity,
      data.Question, data.Answer, data.ReferenceAndDate, data.CorrectedReference,
      data.DarulIftaName, data.AnswerDate, data.Rating, data.Category, data.Topic,
      data.Approved || 0, id
    ]);

    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, error: 'Question/Answer not found or deleted' });
    }

    res.json({ success: true, message: 'Updated successfully' });
  } catch (error) {
    console.error('❌ updateQuestionAnswer error:', error);
    res.status(500).json({ success: false, error: 'Failed to update question/answer' });
  }
};

// Approve Question & Answer
exports.approveQuestionAnswer = async (req, res) => {
  try {
    const { id } = req.params;
    const sql = `UPDATE QuestionsAnswers SET Approved = 1 WHERE ID = ?`;
    const [result] = await db.query(sql, [id]);

    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, error: 'Question/Answer not found' });
    }

    res.json({ success: true, message: 'Approved successfully' });
  } catch (error) {
    console.error('❌ approveQuestionAnswer error:', error);
    res.status(500).json({ success: false, error: 'Failed to approve question/answer' });
  }
};

// Soft delete Question & Answer
exports.deleteQuestionAnswer = async (req, res) => {
  try {
    const { id } = req.params;
    const sql = `UPDATE QuestionsAnswers SET IsDelete = 1 WHERE ID = ?`;
    const [result] = await db.query(sql, [id]);

    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, error: 'Question/Answer not found' });
    }

    res.json({ success: true, message: 'Deleted successfully' });
  } catch (error) {
    console.error('❌ deleteQuestionAnswer error:', error);
    res.status(500).json({ success: false, error: 'Failed to delete question/answer' });
  }
};
