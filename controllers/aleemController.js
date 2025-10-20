const db = require('../config/db');

// Create a new Aleem entry with optional profile image
exports.createAleem = async (req, res) => {
  try {
    const { Ulmaekaram, Name, Position, About } = req.body;
    const profileFile = req.file ? req.file.buffer : null;

    if (!Name) {
      return res.status(400).json({ success: false, error: "Name is required" });
    }

    const sql = `
      INSERT INTO NewAleemKiEntry (Ulmaekaram, Name, ProfileImg, Position, About, isActive)
      VALUES (?, ?, ?, ?, ?, 1)
    `;

    const [result] = await db.query(sql, [
      Ulmaekaram || null,
      Name,
      profileFile,
      Position || null,
      About || null,
    ]);

    res.status(201).json({ success: true, message: "Entry created successfully", id: result.insertId });
  } catch (error) {
    console.error("❌ createAleem error:", error);
    res.status(500).json({ success: false, error: "Failed to create entry" });
  }
};

// Get all Aleem entries (without profile image) with pagination
exports.getAllAleem = async (req, res) => {
  try {
    const limit = parseInt(req.query.limit, 10) || 10;
    const offset = parseInt(req.query.offset, 10) || 0;

    const sql = `
      SELECT id, Ulmaekaram, Name, Position, About, isActive
      FROM NewAleemKiEntry
      WHERE isActive = 1
      ORDER BY id DESC
      LIMIT ? OFFSET ?
    `;

    const [rows] = await db.query(sql, [limit, offset]);
    res.json({ success: true, data: rows });
  } catch (error) {
    console.error("❌ getAllAleem error:", error);
    res.status(500).json({ success: false, error: "Failed to fetch entries" });
  }
};

// Get Aleem entry by ID (without profile image)
exports.getAleemById = async (req, res) => {
  try {
    const { id } = req.params;

    const sql = `
      SELECT id, Ulmaekaram, Name, Position, About, isActive
      FROM NewAleemKiEntry
      WHERE id = ? AND isActive = 1
    `;

    const [rows] = await db.query(sql, [id]);

    if (!rows.length) {
      return res.status(404).json({ success: false, error: "Entry not found" });
    }

    res.json({ success: true, data: rows[0] });
  } catch (error) {
    console.error("❌ getAleemById error:", error);
    res.status(500).json({ success: false, error: "Failed to fetch entry" });
  }
};

// Get profile image by Aleem ID
exports.getProfileById = async (req, res) => {
  try {
    const { id } = req.params;

    const sql = `
      SELECT ProfileImg
      FROM NewAleemKiEntry
      WHERE id = ? AND isActive = 1
    `;
    const [rows] = await db.query(sql, [id]);

    if (!rows.length || !rows[0].ProfileImg) {
      return res.status(404).json({ success: false, error: "Profile image not found" });
    }

    res.set("Content-Type", "image/jpeg"); // adjust if storing PNG or other format
    res.send(rows[0].ProfileImg);
  } catch (error) {
    console.error("❌ getProfileById error:", error);
    res.status(500).json({ success: false, error: "Failed to fetch profile image" });
  }
};

// Update Aleem entry (partial update, optional profile image)
exports.updateAleem = async (req, res) => {
  try {
    const { id } = req.params;
    const { Ulmaekaram, Name, Position, About } = req.body;
    const profileFile = req.file ? req.file.buffer : null;

    const fields = [];
    const values = [];

    if (Ulmaekaram !== undefined) { fields.push("Ulmaekaram = ?"); values.push(Ulmaekaram); }
    if (Name !== undefined) { fields.push("Name = ?"); values.push(Name); }
    if (Position !== undefined) { fields.push("Position = ?"); values.push(Position); }
    if (About !== undefined) { fields.push("About = ?"); values.push(About); }
    if (profileFile) { fields.push("ProfileImg = ?"); values.push(profileFile); }

    if (fields.length === 0) {
      return res.status(400).json({ success: false, error: "No fields provided to update" });
    }

    values.push(id);

    const sql = `UPDATE NewAleemKiEntry SET ${fields.join(", ")} WHERE id = ? AND isActive = 1`;
    const [result] = await db.query(sql, values);

    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, error: "Entry not found or inactive" });
    }

    res.json({ success: true, message: "Entry updated successfully" });
  } catch (error) {
    console.error("❌ updateAleem error:", error);
    res.status(500).json({ success: false, error: "Failed to update entry" });
  }
};

// Soft delete Aleem entry
exports.deleteAleem = async (req, res) => {
  try {
    const { id } = req.params;

    const sql = "UPDATE NewAleemKiEntry SET isActive = 0 WHERE id = ?";
    const [result] = await db.query(sql, [id]);

    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, error: "Entry not found or already deleted" });
    }

    res.json({ success: true, message: "Entry soft deleted successfully" });
  } catch (error) {
    console.error("❌ deleteAleem error:", error);
    res.status(500).json({ success: false, error: "Failed to delete entry" });
  }
};
