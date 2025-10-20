const db = require("../config/db"); // this is the mysql2/promise pool
// const path = require("path"); // not used; remove if unnecessary

// ✅ Create new tag
exports.createTag = async (req, res) => {
  try {
    const { Name, slug, iconClass, AboutTags } = req.body;
    const coverFile = req.file ? req.file.buffer : null;

    if (!Name || !slug) {
      return res.status(400).json({ error: "Name and slug are required" });
    }

    const sql = `
      INSERT INTO Tags (Name, slug, iconClass, tagsCover, AboutTags, isActive)
      VALUES (?, ?, ?, ?, ?, 1)
    `;

    const [result] = await db.query(sql, [
      Name,
      slug,
      iconClass || null,
      coverFile,
      AboutTags || null,
    ]);

    res.status(201).json({
      success: true,
      message: "Tag created successfully",
      id: result.insertId,
    });
  } catch (error) {
    console.error("❌ Error creating tag:", error);
    res.status(500).json({ error: "Failed to create tag" });
  }
};

// ✅ Get all active tags (without blob, with pagination)
exports.getAllTags = async (req, res) => {
  try {
    const limit = Number.parseInt(req.query.limit, 10) || 10;
    const offset = Number.parseInt(req.query.offset, 10) || 0;

    const sql = `
      SELECT id, Name, slug, iconClass, AboutTags, isActive
      FROM Tags
      WHERE isActive = 1
      ORDER BY id DESC
      LIMIT ? OFFSET ?
    `;

    const [rows] = await db.query(sql, [limit, offset]);
    res.json({ success: true, data: rows });
  } catch (error) {
    console.error("❌ Error fetching tags:", error);
    res.status(500).json({ error: "Failed to fetch tags" });
  }
};

// ✅ Get tag by ID (without blob)
exports.getTagById = async (req, res) => {
  try {
    const { id } = req.params;

    const sql = `
      SELECT id, Name, slug, iconClass, AboutTags, isActive
      FROM Tags
      WHERE id = ? AND isActive = 1
    `;

    const [rows] = await db.query(sql, [id]);

    if (rows.length === 0) {
      return res.status(404).json({ error: "Tag not found" });
    }

    res.json({ success: true, data: rows[0] });
  } catch (error) {
    console.error("❌ Error fetching tag by ID:", error);
    res.status(500).json({ error: "Failed to fetch tag" });
  }
};

// ✅ Get tag cover image (BLOB to image)
exports.getTagCoverById = async (req, res) => {
  try {
    const { id } = req.params;

    const sql = "SELECT tagsCover FROM Tags WHERE id = ? AND isActive = 1";
    const [rows] = await db.query(sql, [id]);

    if (rows.length === 0 || !rows[0].tagsCover) {
      return res.status(404).json({ error: "Cover image not found" });
    }

    const imgBuffer = rows[0].tagsCover;

    // crude magic-number sniff: 0x89 0x50 0x4E = PNG, else assume JPEG
    const isPng = imgBuffer[0] === 0x89 && imgBuffer[1] === 0x50 && imgBuffer[2] === 0x4e;
    const contentType = isPng ? "image/png" : "image/jpeg";

    res.set("Content-Type", contentType);
    res.send(imgBuffer);
  } catch (error) {
    console.error("❌ Error fetching cover image:", error);
    res.status(500).json({ error: "Failed to fetch cover image" });
  }
};

// ✅ Update tag (with or without cover image)
exports.updateTag = async (req, res) => {
  try {
    const { id } = req.params;
    const { Name, slug, iconClass, AboutTags } = req.body;
    const coverFile = req.file ? req.file.buffer : null;

    // Check if tag exists
    const [check] = await db.query(
      "SELECT id FROM Tags WHERE id = ? AND isActive = 1",
      [id]
    );

    if (check.length === 0) {
      return res.status(404).json({ error: "Tag not found" });
    }

    let sql, params;

    if (coverFile) {
      sql = `
        UPDATE Tags
        SET Name = ?, slug = ?, iconClass = ?, AboutTags = ?, tagsCover = ?
        WHERE id = ? AND isActive = 1
      `;
      params = [Name, slug, iconClass || null, AboutTags || null, coverFile, id];
    } else {
      sql = `
        UPDATE Tags
        SET Name = ?, slug = ?, iconClass = ?, AboutTags = ?
        WHERE id = ? AND isActive = 1
      `;
      params = [Name, slug, iconClass || null, AboutTags || null, id];
    }

    await db.query(sql, params);

    res.json({ success: true, message: "Tag updated successfully" });
  } catch (error) {
    console.error("❌ Error updating tag:", error);
    res.status(500).json({ error: "Failed to update tag" });
  }
};

// ✅ Soft delete tag (set isActive = 0)
exports.deleteTag = async (req, res) => {
  try {
    const { id } = req.params;

    const [check] = await db.query(
      "SELECT id FROM Tags WHERE id = ? AND isActive = 1",
      [id]
    );

    if (check.length === 0) {
      return res.status(404).json({ error: "Tag not found" });
    }

    await db.query("UPDATE Tags SET isActive = 0 WHERE id = ?", [id]);

    res.json({ success: true, message: "Tag soft deleted successfully" });
  } catch (error) {
    console.error("❌ Error deleting tag:", error);
    res.status(500).json({ error: "Failed to delete tag" });
  }
};
