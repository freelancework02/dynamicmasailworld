// controllers/fatwaController.js
const db = require("../config/db"); // MySQL2 promise pool

const isLikelyBot = (req) => {
  const ua = (req.get('user-agent') || '').toLowerCase();
  return !ua || /bot|spider|crawl|preview|facebookexternalhit|whatsapp|slurp|bing|vkshare|telegrambot/.test(ua);
};

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




// Likes and View Section start from here 

// ✅ Unique view (once per anon per day)
exports.addView = async (req, res) => {
  try {
    const fatwaId = parseInt(req.params.id, 10);
    if (!fatwaId) return res.status(400).json({ error: "Invalid id" });
    if (isLikelyBot(req)) return res.status(204).end(); // ignore bots silently

    const anon = req.anonHash; // from middleware
    const [rows] = await db.query(
      `INSERT IGNORE INTO fatwa_views_daily (fatwa_id, anon_id, view_date)
       VALUES (?, ?, CURRENT_DATE())`,
      [fatwaId, anon]
    );

    // If a row was inserted, increment aggregate
    if (rows.affectedRows === 1) {
      await db.query(
        `UPDATE fatawa SET Views = Views + 1 WHERE id = ? AND isActive = 1`,
        [fatwaId]
      );
      return res.json({ counted: true });
    } else {
      return res.json({ counted: false }); // already counted today
    }
  } catch (err) {
    console.error("❌ addView error:", err);
    res.status(500).json({ error: "Failed to record view" });
  }
};

// ✅ Like (idempotent)
exports.likeFatwa = async (req, res) => {
  try {
    const fatwaId = parseInt(req.params.id, 10);
    if (!fatwaId) return res.status(400).json({ error: "Invalid id" });
    if (isLikelyBot(req)) return res.status(204).end();

    const anon = req.anonHash;

    const [rows] = await db.query(
      `INSERT IGNORE INTO fatwa_likes (fatwa_id, anon_id) VALUES (?, ?)`,
      [fatwaId, anon]
    );

    if (rows.affectedRows === 1) {
      await db.query(
        `UPDATE fatawa SET Likes = Likes + 1 WHERE id = ? AND isActive = 1`,
        [fatwaId]
      );
      return res.json({ liked: true });
    } else {
      return res.json({ liked: true }); // already liked, still true
    }
  } catch (err) {
    console.error("❌ likeFatwa error:", err);
    res.status(500).json({ error: "Failed to like fatwa" });
  }
};

// ✅ Unlike (idempotent)
exports.unlikeFatwa = async (req, res) => {
  try {
    const fatwaId = parseInt(req.params.id, 10);
    if (!fatwaId) return res.status(400).json({ error: "Invalid id" });

    const anon = req.anonHash;

    const [rows] = await db.query(
      `DELETE FROM fatwa_likes WHERE fatwa_id = ? AND anon_id = ?`,
      [fatwaId, anon]
    );

    if (rows.affectedRows === 1) {
      await db.query(
        `UPDATE fatawa SET Likes = GREATEST(Likes - 1, 0) WHERE id = ? AND isActive = 1`,
        [fatwaId]
      );
      return res.json({ liked: false });
    } else {
      return res.json({ liked: false }); // wasn’t liked anyway
    }
  } catch (err) {
    console.error("❌ unlikeFatwa error:", err);
    res.status(500).json({ error: "Failed to unlike fatwa" });
  }
};

// ✅ For UI: has this anon liked it?
exports.myLikeStatus = async (req, res) => {
  try {
    const fatwaId = parseInt(req.params.id, 10);
    if (!fatwaId) return res.status(400).json({ error: "Invalid id" });

    const anon = req.anonHash;

    const [rows] = await db.query(
      `SELECT 1 FROM fatwa_likes WHERE fatwa_id = ? AND anon_id = ? LIMIT 1`,
      [fatwaId, anon]
    );

    res.json({ liked: rows.length > 0 });
  } catch (err) {
    console.error("❌ myLikeStatus error:", err);
    res.status(500).json({ error: "Failed to fetch like status" });
  }
};
