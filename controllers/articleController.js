// controllers/articleController.js
const db = require('../db'); // your mysql / mysql2 wrapper
const crypto = require('crypto');

/* ------------------------------------
   Helpers: DB result normalization
------------------------------------ */
function rowsFromDbResult(result) {
  if (!result) return [];
  if (Array.isArray(result) && Array.isArray(result[0])) return result[0]; // mysql2 [rows, fields]
  if (Array.isArray(result)) return result;                                 // wrapper returns rows
  if (result && Array.isArray(result.rows)) return result.rows;             // pg-style
  return [];
}
function first(x) { return Array.isArray(x) ? x[0] : x; }

/* ------------------------------------
   Slug helpers
------------------------------------ */

/** Collapse whitespace to '-', collapse repeats, trim hyphens, cap 255. */
function normalizeSlug(input) {
  const s = String(input || '')
    .trim()
    .replace(/\s+/g, '-')     // spaces -> -
    .replace(/-+/g, '-')      // collapse ----
    .replace(/^[-]+|[-]+$/g, ''); // trim - at ends
  // MySQL varchar(255) cap
  return s.slice(0, 255);
}

/**
 * Get a unique slug. If base is free -> return base.
 * Otherwise return base-2, base-3, ... skipping current id if provided.
 */
async function nextUniqueSlug(baseSlug, ignoreId = null) {
  const base = normalizeSlug(baseSlug) || crypto.randomBytes(6).toString('hex');

  // Fetch all conflicting slugs once
  const params = ignoreId == null ? [base, base] : [base, base, ignoreId];
  const q = `
    SELECT slug
    FROM \`Article\`
    WHERE (slug = ? OR slug LIKE CONCAT(?, '-%'))
      ${ignoreId == null ? '' : 'AND id <> ?'}
  `;
  const res = await db.query(q, params);
  const rows = rowsFromDbResult(res);

  if (!rows.length) return base;

  const taken = new Set(rows.map(r => String(r.slug)));
  if (!taken.has(base)) return base;

  // Find max numeric suffix
  let max = 1;
  for (const val of taken) {
    const m = val.match(/-(\d+)$/);
    if (m) {
      const n = parseInt(m[1], 10);
      if (!Number.isNaN(n) && n > max) max = n;
    }
  }

  // Try next couple numbers
  for (let n = 2; n <= max + 2; n++) {
    const candidate = normalizeSlug(`${base}-${n}`);
    if (!taken.has(candidate)) return candidate;
  }

  // Fallback
  return normalizeSlug(`${base}-${Date.now()}`);
}

/* ------------------------------------
   anon cookie helper (unchanged)
------------------------------------ */
function getOrSetAnonId(req, res) {
  try {
    const cookieName = 'anon_id';
    let anon = req.cookies && req.cookies[cookieName];
    if (anon && typeof anon === 'string' && anon.length >= 16) return anon;

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
  } catch {
    return crypto.createHash('sha256')
      .update(String(Math.random()) + Date.now())
      .digest('hex');
  }
}

/* ------------------------------------
   Denormalized counters (unchanged)
------------------------------------ */
async function recomputeDenormCounts(articleId) {
  const likeRes = await db.query(
    'SELECT COUNT(*) AS c FROM article_likes WHERE article_id = ?',
    [articleId]
  );
  const likeRows = rowsFromDbResult(likeRes);
  const likeCount = (likeRows[0] && likeRows[0].c) ? Number(likeRows[0].c) : 0;

  const viewRes = await db.query(
    'SELECT COUNT(*) AS c FROM article_views WHERE article_id = ?',
    [articleId]
  );
  const viewRows = rowsFromDbResult(viewRes);
  const viewCount = (viewRows[0] && viewRows[0].c) ? Number(viewRows[0].c) : 0;

  await db.query(
    'UPDATE `Article` SET Likes = ?, Views = ? WHERE id = ? AND isActive = 1',
    [String(likeCount), String(viewCount), articleId]
  );

  return { likeCount, viewCount };
}

/* ------------------------------------
   CRUD
------------------------------------ */

// Create a new article with optional cover image
exports.createArticle = async (req, res) => {
  try {
    let { Title, slug, tags, seo, writer, ArticleText } = req.body;
    const coverImage = req.file ? req.file.buffer : null;

    // Always derive a safe base and make it unique
    const base = normalizeSlug(slug || Title);
    let uniqueSlug = await nextUniqueSlug(base);

    // Insert; if a race causes ER_DUP_ENTRY, retry with a new unique slug
    const sql = `
      INSERT INTO \`Article\` (Title, slug, tags, seo, writer, ArticleText, coverImage, isActive)
      VALUES (?, ?, ?, ?, ?, ?, ?, 1)
    `;

    let result;
    try {
      result = first(await db.query(sql, [
        Title,
        uniqueSlug,
        tags || null,
        seo || null,
        writer || null,
        ArticleText || null,
        coverImage,
      ]));
    } catch (e) {
      // Race: someone inserted same slug after our check
      if (e && (e.code === 'ER_DUP_ENTRY' || e.errno === 1062)) {
        uniqueSlug = await nextUniqueSlug(uniqueSlug);
        result = first(await db.query(sql, [
          Title,
          uniqueSlug,
          tags || null,
          seo || null,
          writer || null,
          ArticleText || null,
          coverImage,
        ]));
      } else {
        throw e;
      }
    }

    const insertId = result?.insertId;
    return res.status(201).json({
      success: true,
      message: 'Article created successfully',
      id: insertId,
      slug: uniqueSlug,
    });
  } catch (error) {
    console.error('❌ createArticle error:', error);
    return res.status(500).json({ success: false, error: 'Failed to create article' });
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
    return res.json({ success: true, data: rows });
  } catch (error) {
    console.error('❌ getAllArticles error:', error);
    return res.status(500).json({ success: false, error: 'Failed to fetch articles' });
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
      return res.status(404).json({ success: false, error: 'Article not found' });
    }
    return res.json({ success: true, data: rows[0] });
  } catch (error) {
    console.error('❌ getArticleById error:', error);
    return res.status(500).json({ success: false, error: 'Failed to fetch article' });
  }
};

// Get article cover image by ID
exports.getArticleImage = async (req, res) => {
  try {
    const { id } = req.params;
    const qres = await db.query(
      'SELECT coverImage FROM `Article` WHERE id = ? AND isActive = 1',
      [id]
    );
    const rows = rowsFromDbResult(qres);
    if (!rows || rows.length === 0 || !rows[0].coverImage) {
      return res.status(404).json({ success: false, error: 'Image not found' });
    }
    res.setHeader('Content-Type', 'image/jpeg'); // set real mime if stored
    return res.send(rows[0].coverImage);
  } catch (error) {
    console.error('❌ getArticleImage error:', error);
    return res.status(500).json({ success: false, error: 'Failed to fetch image' });
  }
};

// Update article (partial); if slug provided, ensure uniqueness (excluding this id)
exports.updateArticle = async (req, res) => {
  try {
    const { id } = req.params;
    let { Title, tags, seo, writer, ArticleText, slug } = req.body;
    const coverImage = req.file ? req.file.buffer : null;

    const fields = [];
    const values = [];

    if (Title !== undefined)       { fields.push('Title = ?');       values.push(Title); }
    if (tags !== undefined)        { fields.push('tags = ?');        values.push(tags); }
    if (seo !== undefined)         { fields.push('seo = ?');         values.push(seo); }
    if (writer !== undefined)      { fields.push('writer = ?');      values.push(writer); }
    if (ArticleText !== undefined) { fields.push('ArticleText = ?'); values.push(ArticleText); }
    if (coverImage)                { fields.push('coverImage = ?');  values.push(coverImage); }

    if (slug !== undefined) {
      const base = normalizeSlug(slug || Title);
      const unique = await nextUniqueSlug(base, id);
      fields.push('slug = ?');
      values.push(unique);
    }

    if (fields.length === 0) {
      return res.status(400).json({ success: false, error: 'No fields provided to update' });
    }

    values.push(id);

    const sql = `UPDATE \`Article\` SET ${fields.join(', ')} WHERE id = ? AND isActive = 1`;
    const result = first(await db.query(sql, values));
    const affected = result?.affectedRows ?? result?.rowCount ?? 0;

    if (!affected) {
      return res.status(404).json({ success: false, error: 'Article not found or inactive' });
    }
    return res.json({ success: true, message: 'Article updated successfully' });
  } catch (error) {
    // If a race still happens on update
    if (error && (error.code === 'ER_DUP_ENTRY' || error.errno === 1062)) {
      return res.status(409).json({
        success: false,
        error: 'Slug already exists; try again.'
      });
    }
    console.error('❌ updateArticle error:', error);
    return res.status(500).json({ success: false, error: 'Failed to update article' });
  }
};

// Soft delete article
exports.deleteArticle = async (req, res) => {
  try {
    const { id } = req.params;
    const result = first(await db.query(
      'UPDATE `Article` SET isActive = 0 WHERE id = ?',
      [id]
    ));
    const affected = result?.affectedRows ?? result?.rowCount ?? 0;

    if (!affected) {
      return res.status(404).json({ success: false, error: 'Article not found or already deleted' });
    }
    return res.json({ success: true, message: 'Article soft deleted successfully' });
  } catch (error) {
    console.error('❌ deleteArticle error:', error);
    return res.status(500).json({ success: false, error: 'Failed to delete article' });
  }
};

/* ------------------------------------
   Views / Likes (unchanged logic)
------------------------------------ */

const TABLE = 'Article';

// Unique view per anon per day
exports.addView = async (req, res) => {
  try {
    const articleId = parseInt(req.params.id, 10);
    if (!articleId || Number.isNaN(articleId)) {
      return res.status(400).json({ success: false, error: 'Invalid id' });
    }

    const anon = getOrSetAnonId(req, res);
    const today = new Date();
    const yyyy = today.getUTCFullYear();
    const mm = String(today.getUTCMonth() + 1).padStart(2, '0');
    const dd = String(today.getUTCDate()).padStart(2, '0');
    const viewDate = `${yyyy}-${mm}-${dd}`;

    const insRes = first(await db.query(
      'INSERT IGNORE INTO article_views (article_id, anon_id, view_date, created_at) VALUES (?, ?, ?, CURRENT_TIMESTAMP)',
      [articleId, anon, viewDate]
    ));
    const affected = insRes?.affectedRows ?? 0;

    let counted = false;
    if (affected === 1) {
      counted = true;
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
    await db.query(
      'INSERT IGNORE INTO article_likes (article_id, anon_id, created_at) VALUES (?, ?, CURRENT_TIMESTAMP)',
      [articleId, anon]
    );

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
    await db.query(
      'DELETE FROM article_likes WHERE article_id = ? AND anon_id = ?',
      [articleId, anon]
    );

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
    const qres = await db.query(
      'SELECT 1 FROM article_likes WHERE article_id = ? AND anon_id = ? LIMIT 1',
      [articleId, anon]
    );
    const rows = rowsFromDbResult(qres);
    const liked = rows.length > 0;

    return res.json({ success: true, liked });
  } catch (error) {
    console.error('❌ myLikeStatus error:', error);
    return res.status(500).json({ success: false, error: 'Failed to check like status' });
  }
};

/**
 * POST/PUT /api/article/:id/view – bump Views by +1
 * (Views column is varchar in your schema, so CAST safely).
 */
exports.incrementArticleView = async (req, res) => {
  try {
    const { id } = req.params;
    if (!id) return res.status(400).json({ success: false, error: 'Article ID required' });

    const updateRes = first(await db.query(
      `UPDATE ${TABLE}
       SET Views = COALESCE(CAST(Views AS UNSIGNED), 0) + 1
       WHERE id = ?`,
      [id]
    ));
    const affected = updateRes?.affectedRows ?? updateRes?.rowCount ?? 0;
    if (!affected) {
      return res.status(404).json({ success: false, error: 'Article not found' });
    }

    const rows = rowsFromDbResult(await db.query(
      `SELECT id, Views FROM ${TABLE} WHERE id = ?`,
      [id]
    ));
    const row = rows?.[0];

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
