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




// 
// Normalize Urdu/Arabic punctuation & whitespace for reliable matching
function normalizeUrdu(input = '') {
  let s = String(input);
  try { s = s.normalize('NFC'); } catch (_) {}
  // remove zero-width & bidi controls + tatweel
  s = s.replace(/[\u200C\u200D\u200E\u200F\u202A-\u202E\u061C\u0640]/g, '');
  // convert Arabic comma to ASCII comma and collapse spaces
  s = s.replace(/،/g, ',').replace(/\s*,\s*/g, ',').trim();
  return s;
}

// Inline SQL expression to normalize the tags field for token matching
const SQL_TAG_FIELD = "CONCAT(',', REPLACE(REPLACE(IFNULL(tags,''),'،',','), ' ', ''), ',')";

exports.getByTag = async (req, res) => {
  try {
    const rawTag   = req.query.tag || '';
    const limit    = Math.max(1, Math.min(parseInt(req.query.limit || '50', 10), 800));
    const offset   = Math.max(0, parseInt(req.query.offset || '0', 10));
    const orderBy  = (req.query.orderBy || 'views').toLowerCase(); // 'views' | 'recent'
    const statusQ  = (req.query.status || 'answered').toLowerCase(); // 'answered' | 'pending' | 'any'
    const activeQ  = (req.query.isActive || '1').toLowerCase();      // '1' | '0' | 'any'
    const looseQ   = req.query.loose === '1' || req.query.loose === 'true'; // force loose match

    if (!rawTag.trim()) {
      return res.status(400).json({ success: false, error: 'Missing required query param: tag' });
    }

    // Support CSV of tags: tag=فقه,متفرقات
    const normalized = normalizeUrdu(rawTag);
    const tokens = normalized.split(',').map(t => t.trim()).filter(Boolean);
    if (tokens.length === 0) {
      return res.status(400).json({ success: false, error: 'Tag is empty after normalization' });
    }

    // -------- Build WHERE (status / active) ----------
    const whereParts = [];
    const paramsBase = [];

    // status
    if (statusQ === 'any') {
      // no status filter
    } else if (statusQ === 'pending') {
      whereParts.push("status = 'pending'");
    } else {
      // default: answered; also allow NULL to be permissive like your SQL tests
      whereParts.push("(status = 'answered' OR status IS NULL)");
    }

    // isActive
    if (activeQ === 'any') {
      // no filter
    } else if (activeQ === '0' || activeQ === 'false') {
      whereParts.push("isActive = 0");
    } else {
      // default 1
      whereParts.push("isActive = 1");
    }

    // -------- ORDER BY ----------
    let orderSql = 'ORDER BY Views DESC';
    if (orderBy === 'recent') orderSql = 'ORDER BY created_at DESC';

    // -------- Exact token SQL (preferred) ----------
    const tokenWheres = tokens.map(() => `${SQL_TAG_FIELD} LIKE ?`).join(' OR ');
    const tokenParams = tokens.map(t => `%,${t},%`);
    const whereExact  = whereParts.concat([`(${tokenWheres})`]).join(' AND ');
    const sqlExact = `
      SELECT
        id, Title, slug, tags, tafseel, detailquestion, Answer, muftisahab,
        questionername, questionaremail, status, isActive, created_at, updated_at, Likes, Views, Mozuwat
      FROM fatawa
      WHERE ${whereExact}
      ${orderSql}
      LIMIT ? OFFSET ?;
    `;
    const paramsExact = [...tokenParams, limit, offset];

    // -------- Loose SQL fallback (LIKE %tag%) ----------
    // This is what your manual SQL did and found rows.
    const likeWheres = tokens.map(() => "tags LIKE ?").join(' OR ');
    const likeParams = tokens.map(t => `%${t}%`);
    const whereLoose = whereParts.concat([`(${likeWheres})`]).join(' AND ');
    const sqlLoose = `
      SELECT
        id, Title, slug, tags, tafseel, detailquestion, Answer, muftisahab,
        questionername, questionaremail, status, isActive, created_at, updated_at, Likes, Views, Mozuwat
      FROM fatawa
      WHERE ${whereLoose}
      ${orderSql}
      LIMIT ? OFFSET ?;
    `;
    const paramsLoose = [...likeParams, limit, offset];

    // -------- Execute (exact first, then fallback) ----------
    let rows = [];
    if (!looseQ) {
      const [r] = await db.query(sqlExact, paramsExact);
      rows = r;
      if (!rows || rows.length === 0) {
        const [r2] = await db.query(sqlLoose, paramsLoose);
        rows = r2;
      }
    } else {
      const [r2] = await db.query(sqlLoose, paramsLoose);
      rows = r2;
    }

    // -------- Count (for pagination UI) ----------
    // Do count against whichever query actually produced results.
    let count = 0;
    if (rows && rows.length) {
      const countSql = `
        SELECT COUNT(*) AS total
        FROM fatawa
        WHERE ${rows === undefined || rows === null || rows.length === 0 ? whereLoose : (looseQ ? whereLoose : whereExact)};
      `;
      const countParams = rows === undefined || rows === null || rows.length === 0
        ? likeParams
        : (looseQ ? likeParams : tokenParams);
      const [c] = await db.query(countSql, countParams);
      count = c?.[0]?.total || 0;
    } else {
      // no results at all, count with loose to be safe
      const countSql = `SELECT COUNT(*) AS total FROM fatawa WHERE ${whereLoose};`;
      const [c] = await db.query(countSql, likeParams);
      count = c?.[0]?.total || 0;
    }

    return res.json({
      success: true,
      tag: rawTag,
      normalizedTag: normalized,
      count: rows.length,
      total: count,
      limit,
      offset,
      orderBy,
      filters: { status: statusQ, isActive: activeQ, mode: looseQ ? 'loose' : 'exact→fallback' },
      data: rows
    });
  } catch (err) {
    console.error('❌ getByTag error:', err);
    return res.status(500).json({ success: false, error: 'Internal Server Error' });
  }
};




// Helper to normalize mysql2/db wrappers
function first(x) {
  if (Array.isArray(x)) return x[0]; // mysql2: [rows, fields]
  return x;                           // custom wrapper: rows directly
}

const FATAWA_TABLE = 'fatawa'; // ← change if your exact table name differs

/**
 * POST /api/fatwa/:id/view
 * PUT  /api/fatwa/:id/view
 * Increments Views by +1 and returns { id, Views }.
 */
exports.incrementFatwaView = async (req, res) => {
  try {
    const { id } = req.params;
    if (!id) {
      return res.status(400).json({ success: false, error: 'Fatwa ID required' });
    }

    // 1) Increment (Views is INT; COALESCE for safety)
    const updateRes = first(await db.query(
      `
      UPDATE ${FATAWA_TABLE}
      SET Views = COALESCE(Views, 0) + 1
      WHERE id = ?
      `,
      [id]
    ));

    const affected =
      updateRes?.affectedRows ??
      updateRes?.rowCount ??
      0;

    if (!affected) {
      return res.status(404).json({ success: false, error: 'Fatwa not found' });
    }

    // 2) Read back current count
    const rows = first(await db.query(
      `SELECT id, Views FROM ${FATAWA_TABLE} WHERE id = ?`,
      [id]
    ));
    const row = Array.isArray(rows) ? rows[0] : rows;

    return res.json({
      success: true,
      message: 'Fatwa view count incremented',
      data: row
    });
  } catch (err) {
    console.error('Error incrementing fatwa view:', err);
    return res.status(500).json({ success: false, error: 'Server error' });
  }
};
