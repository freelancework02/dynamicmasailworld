const db = require("../config/db");

// Get all topics
exports.getAllTopics = async (req, res) => {
  try {
    const [rows] = await db.promise().query("SELECT * FROM Topic");
    res.json({ success: true, data: rows });
  } catch (error) {
    console.error("❌ getAllTopics error:", error);
    res.status(500).json({ error: "Failed to fetch topics" });
  }
};

// Get topic by ID
exports.getTopicById = async (req, res) => {
  try {
    const { id } = req.params;
    const [rows] = await db.promise().query("SELECT * FROM Topic WHERE TopicID = ?", [id]);

    if (rows.length === 0) {
      return res.status(404).json({ error: "Topic not found" });
    }

    res.json({ success: true, data: rows[0] });
  } catch (error) {
    console.error("❌ getTopicById error:", error);
    res.status(500).json({ error: "Failed to fetch topic" });
  }
};

// Create new topic
exports.createTopic = async (req, res) => {
  try {
    const { TopicName, IconClass } = req.body;

    if (!TopicName) {
      return res.status(400).json({ error: "TopicName is required" });
    }

    const [result] = await db.promise().query(
      "INSERT INTO Topic (TopicName, IconClass) VALUES (?, ?)",
      [TopicName, IconClass || null]
    );

    res.status(201).json({ success: true, message: "Topic created", id: result.insertId });
  } catch (error) {
    console.error("❌ createTopic error:", error);
    res.status(500).json({ error: "Failed to create topic" });
  }
};

// Update topic by ID (partial update)
exports.updateTopic = async (req, res) => {
  try {
    const { id } = req.params;
    const { TopicName, IconClass } = req.body;

    const fields = [];
    const values = [];

    if (TopicName !== undefined) {
      fields.push("TopicName = ?");
      values.push(TopicName);
    }
    if (IconClass !== undefined) {
      fields.push("IconClass = ?");
      values.push(IconClass);
    }

    if (!fields.length) {
      return res.status(400).json({ error: "No fields to update" });
    }

    values.push(id);

    const [result] = await db.promise().query(
      `UPDATE Topic SET ${fields.join(", ")} WHERE TopicID = ?`,
      values
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: "Topic not found" });
    }

    res.json({ success: true, message: "Topic updated successfully" });
  } catch (error) {
    console.error("❌ updateTopic error:", error);
    res.status(500).json({ error: "Failed to update topic" });
  }
};

// Get topics with pagination (limit & offset)
exports.getTopicsPaged = async (req, res) => {
  try {
    let limit = parseInt(req.query.limit, 10);
    let offset = parseInt(req.query.offset, 10);

    if (isNaN(limit) || limit <= 0) limit = 10; // default limit
    if (isNaN(offset) || offset < 0) offset = 0; // default offset

    const [rows] = await db.promise().query(
      "SELECT * FROM Topic ORDER BY TopicID ASC LIMIT ? OFFSET ?",
      [limit, offset]
    );

    res.json({ success: true, data: rows });
  } catch (error) {
    console.error("❌ getTopicsPaged error:", error);
    res.status(500).json({ error: "Failed to fetch topics" });
  }
};
