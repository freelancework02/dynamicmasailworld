const pool = require('../db'); // assuming db.js exports promisified pool

// Create a new question
exports.createQuestion = async (req, res) => {
  const { Name, Email, Subject, QuestionText } = req.body;

  if (!Email || !Subject || !QuestionText) {
    return res.status(400).json({ error: 'Email, Subject, and Question are required.' });
  }

  try {
    const [result] = await pool.query(
      `INSERT INTO Questions (Name, Email, Subject, QuestionText) VALUES (?, ?, ?, ?)`,
      [Name || null, Email, Subject, QuestionText]
    );

    res.status(201).json({ success: true, questionId: result.insertId });
  } catch (error) {
    console.error('Error creating question:', error);
    res.status(500).json({ error: 'Failed to create question.' });
  }
};

// Get question by ID
exports.getQuestionById = async (req, res) => {
  const { id } = req.params;

  try {
    const [rows] = await pool.query(`SELECT * FROM Questions WHERE QuestionID = ?`, [id]);

    if (rows.length === 0) {
      return res.status(404).json({ error: 'Question not found.' });
    }

    res.json({ success: true, question: rows[0] });
  } catch (error) {
    console.error('Error fetching question:', error);
    res.status(500).json({ error: 'Failed to fetch question.' });
  }
};

// Update question or answer by ID

exports.updateQuestion = async (req, res) => {
  const { id } = req.params;
  const {
    Name, Email, Subject, QuestionText,
    Answer, AnsweredByID, AnsweredByUsername,
    ModifiedByID, ModifiedByUsername
  } = req.body;

  try {
    const [existing] = await pool.query(`SELECT * FROM Questions WHERE QuestionID = ?`, [id]);
    if (existing.length === 0) {
      return res.status(404).json({ error: 'Question not found.' });
    }

    const fields = [];
    const values = [];

    const addField = (field, value) => {
      if (value !== undefined) {
        fields.push(`${field} = ?`);
        values.push(value);
      }
    };

    addField('Name', Name);
    addField('Email', Email);
    addField('Subject', Subject);
    addField('QuestionText', QuestionText);

    if (Answer !== undefined) {
      addField('Answer', Answer);
      fields.push('AnsweredAt = NOW()');
      addField('AnsweredByID', AnsweredByID);
      addField('AnsweredByUsername', AnsweredByUsername);
    }

    fields.push('ModifiedAt = NOW()');
    addField('ModifiedByID', ModifiedByID);
    addField('ModifiedByUsername', ModifiedByUsername);

    if (fields.length === 0) {
      return res.status(400).json({ error: 'No fields provided to update.' });
    }

    values.push(id);
    const sql = `UPDATE Questions SET ${fields.join(', ')} WHERE QuestionID = ?`;
    await pool.query(sql, values);

    res.json({ success: true, message: 'Question updated successfully.' });
  } catch (error) {
    console.error('Error updating question:', error);
    res.status(500).json({ error: 'Failed to update question.' });
  }
};



// Delete question by ID
exports.deleteQuestion = async (req, res) => {
  const { id } = req.params;

  try {
    const [result] = await pool.query(`DELETE FROM Questions WHERE QuestionID = ?`, [id]);

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Question not found or already deleted.' });
    }

    res.json({ success: true, message: 'Question deleted successfully.' });
  } catch (error) {
    console.error('Error deleting question:', error);
    res.status(500).json({ error: 'Failed to delete question.' });
  }
};

// Optional: Get all questions (for management UI)
exports.getAllQuestions = async (req, res) => {
  try {
    const [rows] = await pool.query(`SELECT * FROM Questions ORDER BY CreatedAt DESC`);
    res.json({ success: true, questions: rows });
  } catch (error) {
    console.error('Error fetching questions:', error);
    res.status(500).json({ error: 'Failed to fetch questions.' });
  }
};
