// controllers/fatwaController.js
const db = require("../config/db"); // MySQL2 promise pool



// ✅ Insert: from website (only question, pending)
exports.addQuestionFromWebsite = async (req, res) => {
  try {
    const { Title, slug, detailquestion, questionername, questionaremail, tags, tafseel } = req.body;

    const sql = `
      INSERT INTO fatawa (Title, slug, detailquestion, questionername, questionaremail, tags, tafseel, status, isActive)
      VALUES (?, ?, ?, ?, ?, ?, ?, 'pending', 1)
    `;

    const [result] = await db.query(sql, [
      Title,
      slug,
      detailquestion,
      questionername,
      questionaremail,
      tags || null,
      tafseel || null,
    ]);

    res.status(201).json({ message: "Question submitted successfully", id: result.insertId });
  } catch (error) {
    console.error("❌ addQuestionFromWebsite error:", error);
    res.status(500).json({ error: "Failed to submit question" });
  }
};

// ✅ Insert: from dashboard (with answer, directly published)
exports.addFatwaFromDashboard = async (req, res) => {
  try {
    const { Title, slug, detailquestion, tags, tafseel, Answer, muftisahab, mozuwat } = req.body;

    const sql = `
      INSERT INTO fatawa
        (Title, slug, detailquestion, tags, tafseel, Answer, muftisahab, mozuwat, status, isActive)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'answered', 1)
    `;

    const params = [
      Title,
      slug,
      detailquestion,
      tags || null,
      tafseel || null,
      Answer,
      muftisahab,
      mozuwat || null,
    ];

    const [result] = await db.query(sql, params);

    res.status(201).json({ message: "Fatwa created successfully", id: result.insertId });
  } catch (error) {
    console.error("❌ addFatwaFromDashboard error:", error);
    res.status(500).json({ error: "Failed to create fatwa" });
  }
};

// ✅ Get all (with limit/offset)
exports.getAllFatwas = async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 10;
    const offset = parseInt(req.query.offset) || 0;

    const sql = `
      SELECT * 
      FROM fatawa  
      WHERE isActive = 1 AND status = 'answered' 
      ORDER BY created_at DESC 
      LIMIT ? OFFSET ?
    `;
    const [rows] = await db.query(sql, [limit, offset]);

    res.json(rows);
  } catch (error) {
    console.error("❌ getAllFatwas error:", error);
    res.status(500).json({ error: "Failed to fetch fatwas" });
  }
};

// ✅ Get by ID
exports.getFatwaById = async (req, res) => {
  try {
    const { id } = req.params;
    const sql = "SELECT * FROM fatawa WHERE id = ? AND isActive = 1";
    const [rows] = await db.query(sql, [id]);

    if (!rows || rows.length === 0) {
      return res.status(404).json({ error: "Fatwa not found" });
    }

    res.json(rows[0]);
  } catch (error) {
    console.error("❌ getFatwaById error:", error);
    res.status(500).json({ error: "Failed to fetch fatwa" });
  }
};

// ✅ Update (answer + status update)
exports.updateFatwa = async (req, res) => {
  try {
    const { id } = req.params;
    const { Title, tags, tafseel, detailquestion, Answer, muftisahab, status, mozuwat } = req.body;

    const sql = `
      UPDATE fatawa 
      SET Title = ?, 
          tags = ?, 
          tafseel = ?, 
          detailquestion = ?, 
          Answer = ?, 
          muftisahab = ?, 
          status = ?, 
          mozuwat = ?, 
          updated_at = CURRENT_TIMESTAMP
      WHERE id = ? AND isActive = 1
    `;

    await db.query(sql, [
      Title || null,
      tags || null,
      tafseel || null,
      detailquestion || null,
      Answer || null,
      muftisahab || null,
      status || "answered",
      mozuwat || null,
      id,
    ]);

    res.json({ message: "Fatwa updated successfully" });
  } catch (error) {
    console.error("❌ updateFatwa error:", error);
    res.status(500).json({ error: "Failed to update fatwa" });
  }
};

// ✅ Soft delete
exports.deleteFatwa = async (req, res) => {
  try {
    const { id } = req.params;
    const sql = "UPDATE fatawa SET isActive = 0 WHERE id = ?";
    await db.query(sql, [id]);

    res.json({ message: "Fatwa soft deleted successfully" });
  } catch (error) {
    console.error("❌ deleteFatwa error:", error);
    res.status(500).json({ error: "Failed to delete fatwa" });
  }
};

// ✅ Get latest 3 fatawa
exports.getLatestFatwas = async (req, res) => {
  try {
    const sql = `
      SELECT id, Title, slug, detailquestion, status, created_at, Likes, Views
      FROM fatawa
      WHERE isActive = 1 AND status = 'answered'
      ORDER BY created_at DESC
      LIMIT 3
    `;
    const [rows] = await db.query(sql);

    res.json(rows);
  } catch (error) {
    console.error("❌ getLatestFatwas error:", error);
    res.status(500).json({ error: "Failed to fetch latest fatawa" });
  }
};

// ✅ Search Fatawa (by Title, slug, or detailquestion)
exports.searchFatawa = async (req, res) => {
  try {
    const qRaw = req.query.q || "";
    const q = String(qRaw).trim();
    let limit = parseInt(req.query.limit, 10) || 50;
    let offset = parseInt(req.query.offset, 10) || 0;

    if (limit <= 0) limit = 50;
    limit = Math.min(limit, 200);
    if (offset < 0) offset = 0;

    const status = req.query.status;
    const isActive = req.query.isActive;

    const whereClauses = [];
    const params = [];

    whereClauses.push("1=1");

    if (status) {
      whereClauses.push("status = ?");
      params.push(status);
    }
    if (typeof isActive !== "undefined") {
      const iv = isActive === "1" || isActive === "true" || isActive === true ? 1 : 0;
      whereClauses.push("isActive = ?");
      params.push(iv);
    } else {
      whereClauses.push("isActive = 1");
    }

    if (q) {
      const like = `%${q}%`;
      whereClauses.push(`(
        Title LIKE ? OR
        slug LIKE ? OR
        detailquestion LIKE ?
      )`);
      params.push(like, like, like);
    }

    const where = "WHERE " + whereClauses.join(" AND ");

    const selectSql = `
      SELECT id, Title, slug, tags, tafseel, detailquestion, Answer, muftisahab, questionername,
             status, isActive, created_at, updated_at, Likes, Views
      FROM fatawa
      ${where}
      ORDER BY created_at DESC
      LIMIT ? OFFSET ?
    `;

    const selectParams = [...params, limit, offset];
    const [rows] = await db.query(selectSql, selectParams);

    const countSql = `SELECT COUNT(*) as total FROM fatawa ${where}`;
    const [countRows] = await db.query(countSql, params);
    const total = countRows && countRows[0] ? countRows[0].total : 0;

    res.json({
      success: true,
      data: rows,
      meta: {
        total,
        limit,
        offset,
      },
    });
  } catch (err) {
    console.error("❌ searchFatawa error:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// ✅ Get all pending fatawa (for admin)
exports.getPendingFatwas = async (req, res) => {
  try {
    const sql = `
      SELECT id, Title, detailquestion, questionername, status, created_at
      FROM fatawa
      WHERE isActive = 1 AND status = 'pending'
      ORDER BY created_at DESC
    `;
    const [rows] = await db.query(sql);
    res.json(rows);
  } catch (error) {
    console.error("❌ getPendingFatwas error:", error);
    res.status(500).json({ error: "Failed to fetch pending fatawa" });
  }
};

// ✅ Answer a pending fatwa (from website question)
exports.answerFatwa = async (req, res) => {
  try {
    const { id } = req.params;
    const { Answer, muftisahab } = req.body;

    const sql = `
      UPDATE fatawa
      SET Answer = ?, muftisahab = ?, status = 'answered', updated_at = CURRENT_TIMESTAMP
      WHERE id = ? AND isActive = 1
    `;

    await db.query(sql, [Answer, muftisahab || null, id]);

    res.json({ success: true, message: "Fatwa answered successfully" });
  } catch (error) {
    console.error("❌ answerFatwa error:", error);
    res.status(500).json({ success: false, error: "Failed to answer fatwa" });
  }
};


/**
 * GET /api/fatwa/recently-viewed
 * Returns top 3 fatwa that were most recently viewed (updated_at DESC) and have Views > 0
 */
exports.getRecentlyViewedFatwa = async (req, res) => {
  try {
    const sql = `
      SELECT
        id,
        Title,
        slug,
        tafseel,
        detailquestion,
        Views,
        updated_at
      FROM fatawa
      WHERE
        isActive = 1
        AND Views > 0
        AND (status = 'answered' OR status IS NULL)
      ORDER BY updated_at DESC
      LIMIT 3
    `;

    const [rows] = await db.query(sql);

    const items = rows.map(r => ({
      id: r.id,
      title: r.Title,
      slug: r.slug,
      description: oneLine(r.tafseel || r.detailquestion || ''),
      views: r.Views,
      viewedAt: r.updated_at
    }));

    res.json({ success: true, count: items.length, items });
  } catch (err) {
    console.error('getRecentlyViewedFatwa error:', err);
    res.status(500).json({ success: false, error: 'Failed to load recently viewed fatwa' });
  }
};
