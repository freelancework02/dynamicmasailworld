// controllers/articleController.js
const db = require('../db'); // your mysql2 / db wrapper
const crypto = require('crypto');

/**
 * Helper: normalize db.query results into rows array.
 * Supports:
 *  - mysql2: [rows, fields]
 *  - wrapper that returns rows array directly
 *  - pg-style: { rows: [...] }
 */
function rowsFromDbResult(result) {
  if (!result) return [];
  // mysql2: [rows, fields]
  if (Array.isArray(result) && Array.isArray(result[0])) return result[0];
  // wrapper that returns rows array
  if (Array.isArray(result)) {
    // Could be rows itself
    // If items look like objects, return as rows
    return result;
  }
  // object with .rows
  if (result && Array.isArray(result.rows)) return result.rows;
  // unknown shape — return empty
  return [];
}

/* ------------------------------
   anon cookie helper
   ------------------------------ */
/**
 * Returns existing anon id from cookie or sets a new one in response.
 * cookie name: anon_id
 */
function getOrSetAnonId(req, res) {
  try {
    const cookieName = 'anon_id';
    let anon = req.cookies && req.cookies[cookieName];
    if (anon && typeof anon === 'string' && anon.length >= 16) return anon;

    // create random token (hex 64)
    anon = crypto.randomBytes(32).toString('hex');
    const isProd = process.env.NODE_ENV === 'production';
    res.cookie(cookieName, anon, {
      httpOnly: true,
      sameSite: isProd ? 'none' : 'lax',
      secure: isProd,
      maxAge: 1000 * 60 * 60 * 24 * 365,
      path: '/',
    });
    return anon;
  } catch (err) {
    // fallback: create non-persistent id
    return crypto.createHash('sha256').update(String(Math.random()) + Date.now()).digest('hex');
  }
}

/* ------------------------------
   Denormalized counters helper
   Recomputes likes/views from join tables and writes back to Article
   ------------------------------ */
async function recomputeDenormCounts(articleId) {
  // likes
  const likeRes = await db.query(
    'SELECT COUNT(*) AS c FROM article_likes WHERE article_id = ?',
    [articleId]
  );
  const likeRows = rowsFromDbResult(likeRes);
  const likeCount = (likeRows[0] && likeRows[0].c) ? Number(likeRows[0].c) : 0;

  // views
  const viewRes = await db.query(
    'SELECT COUNT(*) AS c FROM article_views WHERE article_id = ?',
    [articleId]
  );
  const viewRows = rowsFromDbResult(viewRes);
  const viewCount = (viewRows[0] && viewRows[0].c) ? Number(viewRows[0].c) : 0;

  // update Article table (Likes and Views are varchar in your schema; store as string)
  await db.query(
    'UPDATE `Article` SET Likes = ?, Views = ? WHERE id = ? AND isActive = 1',
    [String(likeCount), String(viewCount), articleId]
  );

  return { likeCount, viewCount };
}

/* ------------------------------
   CRUD: create / read / update / delete
   (kept as in your original code, but defensive with rowsFromDbResult)
   ------------------------------ */

// Create a new article with optional cover image
exports.createArticle = async (req, res) => {
  try {
    const { Title, slug, tags, seo, writer, ArticleText } = req.body;
    const coverImage = req.file ? req.file.buffer : null;

    const sql = `
      INSERT INTO \`Article\` (Title, slug, tags, seo, writer, ArticleText, coverImage, isActive)
      VALUES (?, ?, ?, ?, ?, ?, ?, 1)
    `;

    const result = await db.query(sql, [
      Title,
      slug,
      tags || null,
      seo || null,
      writer || null,
      ArticleText || null,
      coverImage,
    ]);

    // result may be [okPacket] or okPacket
    const rows = rowsFromDbResult(result);
    const insertId = (result && result.insertId) ? result.insertId : (rows && rows.insertId) ? rows.insertId : (result && result[0] && result[0].insertId) ? result[0].insertId : undefined;

    res.status(201).json({ success: true, message: "Article created successfully", id: insertId });
  } catch (error) {
    console.error('❌ createArticle error:', error);
    res.status(500).json({ success: false, error: "Failed to create article" });
  }
};

// Get all articles (without cover image) with pagination
exports.getAllArticles = async (req, res) => {
  try {
    const limit = parseInt(req.query.limit, 10) || 10;
    const offset = parseInt(req.query.offset, 10) || 0;

    const sql = `
      SELECT id, Title, slug, tags, seo, writer, ArticleText, isActive, Likes, Views
      FROM \`Article\`
      WHERE isActive = 1
      ORDER BY id DESC
      LIMIT ? OFFSET ?
    `;

    const qres = await db.query(sql, [limit, offset]);
    const rows = rowsFromDbResult(qres);
    res.json({ success: true, data: rows });
  } catch (error) {
    console.error('❌ getAllArticles error:', error);
    res.status(500).json({ success: false, error: "Failed to fetch articles" });
  }
};

// Get single article by ID (without image)
exports.getArticleById = async (req, res) => {
  try {
    const { id } = req.params;

    const sql = `
      SELECT id, Title, slug, tags, seo, writer, ArticleText, isActive, Likes, Views
      FROM \`Article\`
      WHERE id = ? AND isActive = 1
    `;

    const qres = await db.query(sql, [id]);
    const rows = rowsFromDbResult(qres);

    if (!rows || rows.length === 0) {
      return res.status(404).json({ success: false, error: "Article not found" });
    }

    // return plain object in data
    res.json({ success: true, data: rows[0] });
  } catch (error) {
    console.error('❌ getArticleById error:', error);
    res.status(500).json({ success: false, error: "Failed to fetch article" });
  }
};

// Get article cover image by ID
exports.getArticleImage = async (req, res) => {
  try {
    const { id } = req.params;

    const qres = await db.query('SELECT coverImage FROM `Article` WHERE id = ? AND isActive = 1', [id]);
    const rows = rowsFromDbResult(qres);

    if (!rows || rows.length === 0 || !rows[0].coverImage) {
      return res.status(404).json({ success: false, error: "Image not found" });
    }

    // If you know image mime type, set it; otherwise use jpeg
    res.setHeader("Content-Type", "image/jpeg");
    res.send(rows[0].coverImage);
  } catch (error) {
    console.error('❌ getArticleImage error:', error);
    res.status(500).json({ success: false, error: "Failed to fetch image" });
  }
};

// Update article (partial update, optional cover image)
exports.updateArticle = async (req, res) => {
  try {
    const { id } = req.params;
    const { Title, tags, seo, writer, ArticleText } = req.body;
    const coverImage = req.file ? req.file.buffer : null;

    const fields = [];
    const values = [];

    if (Title !== undefined) { fields.push('Title = ?'); values.push(Title); }
    if (tags !== undefined) { fields.push('tags = ?'); values.push(tags); }
    if (seo !== undefined) { fields.push('seo = ?'); values.push(seo); }
    if (writer !== undefined) { fields.push('writer = ?'); values.push(writer); }
    if (ArticleText !== undefined) { fields.push('ArticleText = ?'); values.push(ArticleText); }
    if (coverImage) { fields.push('coverImage = ?'); values.push(coverImage); }

    if (fields.length === 0) {
      return res.status(400).json({ success: false, error: "No fields provided to update" });
    }

    values.push(id);

    const sql = `UPDATE \`Article\` SET ${fields.join(', ')} WHERE id = ? AND isActive = 1`;
    const result = await db.query(sql, values);
    // handle shape
    const rows = rowsFromDbResult(result);
    const affected = (result && result.affectedRows) ? result.affectedRows : ((rows && rows.affectedRows) ? rows.affectedRows : (result && result[0] && result[0].affectedRows) ? result[0].affectedRows : undefined);

    if (typeof affected === 'number' && affected === 0) {
      return res.status(404).json({ success: false, error: "Article not found or inactive" });
    }

    res.json({ success: true, message: "Article updated successfully" });
  } catch (error) {
    console.error('❌ updateArticle error:', error);
    res.status(500).json({ success: false, error: "Failed to update article" });
  }
};

// Soft delete article
exports.deleteArticle = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await db.query('UPDATE `Article` SET isActive = 0 WHERE id = ?', [id]);

    // check affectedRows robustly
    const rows = rowsFromDbResult(result);
    const affected = (result && result.affectedRows) ? result.affectedRows : ((rows && rows.affectedRows) ? rows.affectedRows : (result && result[0] && result[0].affectedRows) ? result[0].affectedRows : undefined);

    if (typeof affected === 'number' && affected === 0) {
      return res.status(404).json({ success: false, error: "Article not found or already deleted" });
    }

    res.json({ success: true, message: "Article soft deleted successfully" });
  } catch (error) {
    console.error('❌ deleteArticle error:', error);
    res.status(500).json({ success: false, error: "Failed to delete article" });
  }
};

/* ------------------------------
   NEW: views / likes endpoints
   - addView: unique per anon per day
   - likeArticle / unlikeArticle: idempotent
   - myLikeStatus: whether current anon has liked
   Note: these rely on tables article_views(article_id, anon_id, view_date)
         and article_likes(article_id, anon_id). See earlier SQL example.
   ------------------------------ */

// Unique view per anon per day
exports.addView = async (req, res) => {
  try {
    const articleId = parseInt(req.params.id, 10);
    if (!articleId || Number.isNaN(articleId)) {
      return res.status(400).json({ success: false, error: 'Invalid id' });
    }

    const anon = getOrSetAnonId(req, res);

    // Using view_date for per-day uniqueness (YYYY-MM-DD)
    const today = new Date();
    const yyyy = today.getUTCFullYear();
    const mm = String(today.getUTCMonth() + 1).padStart(2, '0');
    const dd = String(today.getUTCDate()).padStart(2, '0');
    const viewDate = `${yyyy}-${mm}-${dd}`;

    // INSERT IGNORE will only insert if unique constraint exists on (article_id, anon_id, view_date).
    // If you don't have that unique index, consider adding one for the semantics you want.
    const insRes = await db.query(
      'INSERT IGNORE INTO article_views (article_id, anon_id, view_date, created_at) VALUES (?, ?, ?, CURRENT_TIMESTAMP)',
      [articleId, anon, viewDate]
    );

    // inspect affectedRows safely
    let affected = 0;
    if (insRes && typeof insRes.affectedRows === 'number') {
      affected = insRes.affectedRows;
    } else if (Array.isArray(insRes) && insRes[0] && typeof insRes[0].affectedRows === 'number') {
      affected = insRes[0].affectedRows;
    }

    let counted = false;
    if (affected === 1) {
      counted = true;
      // recompute denorm counts and write back
      await recomputeDenormCounts(articleId);
    }

    return res.json({ success: true, counted });
  } catch (error) {
    console.error('❌ addView error:', error);
    return res.status(500).json({ success: false, error: 'Failed to add view' });
  }
};

// Like (idempotent)
exports.likeArticle = async (req, res) => {
  try {
    const articleId = parseInt(req.params.id, 10);
    if (!articleId || Number.isNaN(articleId)) {
      return res.status(400).json({ success: false, error: 'Invalid id' });
    }

    const anon = getOrSetAnonId(req, res);

    // Insert ignore if already exists (requires PK or unique on article_id+anon_id)
    await db.query('INSERT IGNORE INTO article_likes (article_id, anon_id, created_at) VALUES (?, ?, CURRENT_TIMESTAMP)', [articleId, anon]);

    const counts = await recomputeDenormCounts(articleId);
    return res.json({ success: true, liked: true, likes: counts.likeCount });
  } catch (error) {
    console.error('❌ likeArticle error:', error);
    return res.status(500).json({ success: false, error: 'Failed to like article' });
  }
};

// Unlike (idempotent)
exports.unlikeArticle = async (req, res) => {
  try {
    const articleId = parseInt(req.params.id, 10);
    if (!articleId || Number.isNaN(articleId)) {
      return res.status(400).json({ success: false, error: 'Invalid id' });
    }

    const anon = getOrSetAnonId(req, res);

    const delRes = await db.query('DELETE FROM article_likes WHERE article_id = ? AND anon_id = ?', [articleId, anon]);

    // compute counts and update Article
    const counts = await recomputeDenormCounts(articleId);
    return res.json({ success: true, liked: false, likes: counts.likeCount });
  } catch (error) {
    console.error('❌ unlikeArticle error:', error);
    return res.status(500).json({ success: false, error: 'Failed to unlike article' });
  }
};

// Current user's like status
exports.myLikeStatus = async (req, res) => {
  try {
    const articleId = parseInt(req.params.id, 10);
    if (!articleId || Number.isNaN(articleId)) {
      return res.status(400).json({ success: false, error: 'Invalid id' });
    }

    const anon = getOrSetAnonId(req, res);

    const qres = await db.query('SELECT 1 FROM article_likes WHERE article_id = ? AND anon_id = ? LIMIT 1', [articleId, anon]);
    const rows = rowsFromDbResult(qres);
    const liked = rows.length > 0;

    return res.json({ success: true, liked });
  } catch (error) {
    console.error('❌ myLikeStatus error:', error);
    return res.status(500).json({ success: false, error: 'Failed to check like status' });
  }
};



// views
function first(x) {
  // Normalize whatever db.query returns into the "first" piece (rows/result)
  if (Array.isArray(x)) return x[0];   // mysql2: [rows, fields]
  return x;                             // custom wrapper: rows/result directly
}

const TABLE = 'Article'; // ← change to your exact table name if different (Article/Articles)

/**
 * PUT /api/article/:id/view
 * Bumps Views by +1 (Views is varchar in your schema, so we CAST safely).
 */
exports.incrementArticleView = async (req, res) => {
  try {
    const { id } = req.params;
    if (!id) return res.status(400).json({ success: false, error: 'Article ID required' });

    // 1) Increment
    const updateRes = first(await db.query(
      `
      UPDATE ${TABLE}
      SET Views = COALESCE(CAST(Views AS UNSIGNED), 0) + 1
      WHERE id = ?
      `,
      [id]
    ));

    const affected =
      updateRes?.affectedRows ??
      updateRes?.rowCount ?? // some drivers use rowCount
      0;

    if (!affected) {
      return res.status(404).json({ success: false, error: 'Article not found' });
    }

    // 2) Read back new count
    const rows = first(await db.query(
      `SELECT id, Views FROM ${TABLE} WHERE id = ?`,
      [id]
    ));

    // rows might be an array of rows or a single row
    const row = Array.isArray(rows) ? rows[0] : rows;

    return res.json({
      success: true,
      message: 'View count incremented',
      data: row
    });
  } catch (err) {
    console.error('Error incrementing article view:', err);
    return res.status(500).json({ success: false, error: 'Server error' });
  }
};