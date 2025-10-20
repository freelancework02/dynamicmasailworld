const db = require("../config/db");

// Get all writers (excluding the photo blob)
exports.getAllWriters = async (req, res) => {
  try {
    const sql = `
      SELECT WriterID, WriterName, Position, WriterBio, CreatedByID, CreatedByUsername
      FROM Writers
    `;
    const [rows] = await db.query(sql);
    res.json({ success: true, data: rows });
  } catch (error) {
    console.error("❌ getAllWriters error:", error);
    res.status(500).json({ success: false, error: "Failed to fetch writers" });
  }
};

// Get single writer by ID (excluding photo)
exports.getWriterById = async (req, res) => {
  try {
    const { id } = req.params;
    const sql = `
      SELECT WriterID, WriterName, Position, WriterBio
      FROM Writers
      WHERE WriterID = ?
    `;
    const [rows] = await db.query(sql, [id]);

    if (rows.length === 0) {
      return res.status(404).json({ success: false, error: "Writer not found" });
    }

    res.json({ success: true, data: rows[0] });
  } catch (error) {
    console.error("❌ getWriterById error:", error);
    res.status(500).json({ success: false, error: "Failed to fetch writer" });
  }
};

// Get writer photo (image blob) by ID
exports.getWriterImage = async (req, res) => {
  try {
    const { id } = req.params;
    const sql = `SELECT Photo FROM Writers WHERE WriterID = ?`;
    const [rows] = await db.query(sql, [id]);

    if (rows.length === 0 || !rows[0].Photo) {
      return res.status(404).json({ success: false, error: "Image not found" });
    }

    res.set("Content-Type", "image/jpeg"); // Adjust if photos are PNG
    res.send(rows[0].Photo);
  } catch (error) {
    console.error("❌ getWriterImage error:", error);
    res.status(500).json({ success: false, error: "Failed to fetch image" });
  }
};

// Create new writer with optional photo
exports.createWriter = async (req, res) => {
  try {
    const { WriterName, Position, WriterBio, CreatedByID, CreatedByUsername } = req.body;
    const Photo = req.file ? req.file.buffer : null;

    if (!CreatedByID || !CreatedByUsername) {
      return res.status(400).json({ success: false, error: "CreatedByID and CreatedByUsername are required." });
    }

    const sql = `
      INSERT INTO Writers (WriterName, Position, WriterBio, Photo, CreatedByID, CreatedByUsername)
      VALUES (?, ?, ?, ?, ?, ?)
    `;
    const [result] = await db.query(sql, [WriterName, Position, WriterBio, Photo, CreatedByID, CreatedByUsername]);

    res.status(201).json({ success: true, id: result.insertId, message: "Writer created successfully" });
  } catch (error) {
    console.error("❌ createWriter error:", error);
    res.status(500).json({ success: false, error: "Failed to create writer" });
  }
};

// Update writer (partial update, photo optional)
exports.updateWriter = async (req, res) => {
  try {
    const { id } = req.params;
    const { WriterName, Position, WriterBio, UpdatedByID, UpdatedByUsername } = req.body;

    const fields = [];
    const values = [];

    if (WriterName !== undefined) { fields.push("WriterName = ?"); values.push(WriterName); }
    if (Position !== undefined) { fields.push("Position = ?"); values.push(Position); }
    if (WriterBio !== undefined) { fields.push("WriterBio = ?"); values.push(WriterBio); }
    if (UpdatedByID !== undefined) { fields.push("UpdatedByID = ?"); values.push(UpdatedByID); }
    if (UpdatedByUsername !== undefined) { fields.push("UpdatedByUsername = ?"); values.push(UpdatedByUsername); }
    if (req.file) { fields.push("Photo = ?"); values.push(req.file.buffer); }

    if (fields.length === 0) {
      return res.status(400).json({ success: false, error: "No valid fields provided for update." });
    }

    // Add updated timestamp
    fields.push("UpdatedAt = NOW()");

    values.push(id);
    const sql = `UPDATE Writers SET ${fields.join(", ")} WHERE WriterID = ?`;
    const [result] = await db.query(sql, values);

    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, error: "Writer not found." });
    }

    res.json({ success: true, message: "Writer updated successfully" });
  } catch (error) {
    console.error("❌ updateWriter error:", error);
    res.status(500).json({ success: false, error: "Failed to update writer" });
  }
};

// Delete a writer record
exports.deleteWriter = async (req, res) => {
  try {
    const { id } = req.params;
    const sql = "DELETE FROM Writers WHERE WriterID = ?";
    const [result] = await db.query(sql, [id]);

    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, error: "Writer not found" });
    }

    res.json({ success: true, message: "Writer deleted successfully" });
  } catch (error) {
    console.error("❌ deleteWriter error:", error);
    res.status(500).json({ success: false, error: "Failed to delete writer" });
  }
};
