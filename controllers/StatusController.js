// controllers/statsController.js
const db = require("../config/db"); // ← change this if your db.js lives elsewhere

/**
 * Safe list of tables we service and the key names the API returns,
 * with the exact label column to use for "latest".
 */
const TABLES = [
  { name: "Article",        key: "articles", labelCol: "Title"    },
  { name: "Books",          key: "books",    labelCol: "BookName" },
  { name: "fatawa",         key: "fatawa",   labelCol: "Title"    },
  { name: "NewAleemKiEntry",key: "ulema",    labelCol: "Name"     },
  { name: "Tags",           key: "tags",     labelCol: "Name"     },
  { name: "User",           key: "users",    labelCol: "Name"     },
];

/**
 * Helper to extract COUNT(*) reliably.
 */
function extractCount(rows) {
  // mysql2/promise returns rows like [{ count: 123 }]
  // COUNT(*) may arrive as a string; coerce safely to number.
  const val = rows?.[0]?.count ?? rows?.[0]?.COUNT ?? 0;
  const num = Number(val);
  return Number.isFinite(num) ? num : 0;
}

/**
 * Count rows for a table, preferring only active rows if the table has `isActive`.
 * If `isActive` doesn't exist, fall back to total rows.
 */
async function countForTable(tableName) {
  const table = `\`${tableName}\``;

  // Try active-only first
  try {
    const [rows] = await db.query(
      `SELECT COUNT(*) AS count FROM ${table} WHERE \`isActive\` = 1`
    );
    return extractCount(rows);
  } catch (err) {
    // If it's not a "bad column" issue, rethrow; otherwise fall back to total
    if (err?.code && err.code !== "ER_BAD_FIELD_ERROR") {
      throw err;
    }
  }

  // Fall back to total
  const [rows2] = await db.query(`SELECT COUNT(*) AS count FROM ${table}`);
  return extractCount(rows2);
}

/**
 * GET /api/stats/totals
 * Returns counts for all tables in TABLES[].
 * If a table has `isActive`, the count is of active rows; else, total rows.
 */
exports.getTotals = async (req, res) => {
  try {
    const pairs = await Promise.all(
      TABLES.map(async (t) => {
        const count = await countForTable(t.name);
        return [t.key, count];
      })
    );
    const counts = Object.fromEntries(pairs);
    res.json({ success: true, counts });
  } catch (error) {
    console.error("❌ Error in getTotals:", error);
    res
      .status(500)
      .json({ success: false, error: "Server error fetching totals" });
  }
};

/**
 * Try a query; if it fails with ER_BAD_FIELD_ERROR (missing column),
 * return null so caller can fall back to a simpler query.
 */
async function tryQuery(sql, params = []) {
  try {
    const [rows] = await db.query(sql, params);
    return rows;
  } catch (err) {
    if (err?.code === "ER_BAD_FIELD_ERROR") return null;
    throw err;
  }
}

/**
 * GET /api/stats/latest
 * For each table, get the most recent entry.
 * Prefers active rows (isActive = 1) and tries to include a created_at/date if present.
 */
exports.getLatest = async (req, res) => {
  try {
    const results = await Promise.all(
      TABLES.map(async (t) => {
        const labelCol = `\`${t.labelCol}\``;
        const tableName = `\`${t.name}\``;

        // 1) Try rich + active
        let rows =
          (await tryQuery(
            `
            SELECT id,
                   ${labelCol} AS label,
                   COALESCE(\`created_at\`, \`date\`, NULL) AS created_at
            FROM ${tableName}
            WHERE \`isActive\` = 1
            ORDER BY id DESC
            LIMIT 1
          `
          )) ||
          // 2) Try rich (no active filter)
          (await tryQuery(
            `
            SELECT id,
                   ${labelCol} AS label,
                   COALESCE(\`created_at\`, \`date\`, NULL) AS created_at
            FROM ${tableName}
            ORDER BY id DESC
            LIMIT 1
          `
          )) ||
          // 3) Try simple + active
          (await tryQuery(
            `
            SELECT id,
                   ${labelCol} AS label
            FROM ${tableName}
            WHERE \`isActive\` = 1
            ORDER BY id DESC
            LIMIT 1
          `
          )) ||
          // 4) Final fallback: simple (no active, no dates)
          (await tryQuery(
            `
            SELECT id,
                   ${labelCol} AS label
            FROM ${tableName}
            ORDER BY id DESC
            LIMIT 1
          `
          ));

        const row = rows && rows[0] ? rows[0] : null;

        return {
          table: t.name,
          key: t.key,
          item: row
            ? {
                id: row.id ?? null,
                label: row.label ?? null,
                created_at:
                  row.created_at !== undefined ? row.created_at : null,
              }
            : null,
        };
      })
    );

    res.json({ success: true, latest: results });
  } catch (error) {
    console.error("❌ Error in getLatest:", error);
    res
      .status(500)
      .json({ success: false, error: "Server error fetching latest items" });
  }
};
