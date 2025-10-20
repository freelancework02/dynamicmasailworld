// // controllers/activityController.js
// const db = require("../config/db");

// /**
//  * Select latest rows from a table returning an array of
//  * { id, title } objects using the provided title column.
//  *
//  * We only pull the columns we need (id + title), aliasing
//  * the title column as "title" for a consistent response.
//  */
// async function selectLatestTitle(table, titleCol, limit) {
//   const sql = `SELECT id, \`${titleCol}\` AS title FROM \`${table}\` ORDER BY id DESC LIMIT ?`;
//   try {
//     const rows = await db.query(sql, [limit]);
//     // Filter out null/undefined titles to avoid empty strings in UI
//     return (rows || []).map(r => ({
//       id: r.id ?? null,
//       title: r.title ?? null,
//     }));
//   } catch (err) {
//     console.error(`selectLatestTitle error for ${table}.${titleCol}:`, err.message);
//     return [];
//   }
// }

// /**
//  * GET /api/activity/recent?limit=6
//  * Latest entries from:
//  *  - artile (id, Title)
//  *  - fatawa (id, Title)
//  *  - NewAleemKiEntry (id, Name)
//  *  - Tags (id, Name)
//  *  - Users (id, Name)
//  *  - Books (id, BookName)
//  *
//  * Returns:
//  * {
//  *   now, limit,
//  *   articles: [{id,title}], fatawa: [{id,title}],
//  *   ulema: [{id,title}], tags: [{id,title}],
//  *   users: [{id,title}], books: [{id,title}]
//  * }
//  */
// exports.getRecentActivity = async (req, res) => {
//   try {
//     const limit = Math.max(1, Math.min(parseInt(req.query.limit) || 6, 50));

//     // Query each table with the correct title column
//     const [
//       articleRows,
//       fatawaRows,
//       ulemaRows,
//       tagRows,
//       userRows,
//       bookRows,
//     ] = await Promise.all([
//       selectLatestTitle("artile",           "Title",    limit),   // (your table name/field)
//       selectLatestTitle("fatawa",           "Title",    limit),   // (you stated fatawa has Title)
//       selectLatestTitle("NewAleemKiEntry",  "Name",     limit),
//       selectLatestTitle("Tags",             "Name",     limit),
//       selectLatestTitle("Users",            "Name",     limit),
//       selectLatestTitle("Books",            "BookName", limit),
//     ]);

//     res.json({
//       now: new Date().toISOString(),
//       limit,
//       articles: articleRows,
//       fatawa:   fatawaRows,
//       ulema:    ulemaRows,
//       tags:     tagRows,
//       users:    userRows,
//       books:    bookRows,
//     });
//   } catch (error) {
//     console.error("❌ recent activity error:", error);
//     res.status(500).json({ error: "Failed to load recent activity" });
//   }
// };





const db = require("../config/db");

/**
 * Select latest rows from a table returning an array of
 * { id, title } objects using the provided title column.
 *
 * Only pull the columns needed (id + title), aliasing
 * the title column as "title" for consistency.
 */
async function selectLatestTitle(table, titleCol, limit) {
  const sql = `SELECT id, \`${titleCol}\` AS title FROM \`${table}\` ORDER BY id DESC LIMIT ?`;
  try {
    const [rows] = await db.query(sql, [limit]);
    // Filter out null/undefined titles to avoid empty strings in UI
    return (rows || []).map(r => ({
      id: r.id ?? null,
      title: r.title ?? null,
    }));
  } catch (err) {
    console.error(`selectLatestTitle error for ${table}.${titleCol}:`, err.message);
    return [];
  }
}

/**
 * GET /api/activity/recent?limit=6
 * Latest entries from:
 *  - Article (id, Title)
 *  - Fatawa (id, Title)
 *  - NewAleemKiEntry (id, Name)
 *  - Tags (id, Name)
 *  - User (id, Name)
 *  - Books (id, BookName)
 *
 * Returns:
 * {
 *   now, limit,
 *   articles: [{id,title}], fatawa: [{id,title}],
 *   ulema: [{id,title}], tags: [{id,title}],
 *   users: [{id,title}], books: [{id,title}]
 * }
 */
exports.getRecentActivity = async (req, res) => {
  try {
    const limit = Math.max(1, Math.min(parseInt(req.query.limit, 10) || 6, 50));

    // Query each table with the correct title column
    const [
      articleRows,
      fatawaRows,
      ulemaRows,
      tagRows,
      userRows,
      bookRows,
    ] = await Promise.all([
      selectLatestTitle("Article",           "Title",    limit),
      selectLatestTitle("fatawa",           "Title",    limit),
      selectLatestTitle("NewAleemKiEntry",  "Name",     limit),
      selectLatestTitle("Tags",             "Name",     limit),
      selectLatestTitle("User",             "Name",     limit),
      selectLatestTitle("Books",            "BookName", limit),
    ]);

    res.json({
      success: true,
      now: new Date().toISOString(),
      limit,
      articles: articleRows,
      fatawa:   fatawaRows,
      ulema:    ulemaRows,
      tags:     tagRows,
      users:    userRows,
      books:    bookRows,
    });
  } catch (error) {
    console.error("❌ getRecentActivity error:", error);
    res.status(500).json({ success: false, error: "Failed to load recent activity" });
  }
};
