const db = require("../config/db");
const bcrypt = require("bcrypt"); // Optional: enable for password hashing

// ========================
// Create New User
// ========================
exports.createUser = async (req, res) => {
  try {
    const { Name, Email, Password, ConfirmPassword } = req.body;

    if (!Name || !Email || !Password || !ConfirmPassword) {
      return res
        .status(400)
        .json({ success: false, error: "All fields are required." });
    }

    if (Password !== ConfirmPassword) {
      return res
        .status(400)
        .json({ success: false, error: "Passwords do not match." });
    }

    // Hash password (optional — uncomment to use bcrypt)
    // const hashedPassword = await bcrypt.hash(Password, 10);

    const sql = `
      INSERT INTO User (Name, Email, Password, ConfirmPassword, isActive)
      VALUES (?, ?, ?, ?, 1)
    `;

    const [result] = await db.query(sql, [
      Name,
      Email,
      Password, // use hashedPassword instead if hashing
      ConfirmPassword,
    ]);

    res.status(201).json({
      success: true,
      message: "User created successfully.",
      userId: result.insertId,
    });
  } catch (error) {
    console.error("❌ createUser error:", error);

    if (error.code === "ER_DUP_ENTRY") {
      return res
        .status(400)
        .json({ success: false, error: "Email already exists." });
    }

    res
      .status(500)
      .json({ success: false, error: "Server error while creating user." });
  }
};

// ========================
// Get All Active Users
// ========================
exports.getAllUsers = async (req, res) => {
  try {
    const sql = "SELECT id, Name, Email, isActive FROM User WHERE isActive = 1";
    const [rows] = await db.query(sql);

    res.json({ success: true, data: rows });
  } catch (error) {
    console.error("❌ getAllUsers error:", error);
    res
      .status(500)
      .json({ success: false, error: "Failed to fetch users from database." });
  }
};

// ========================
// Get User by ID
// ========================
exports.getUserById = async (req, res) => {
  try {
    const { id } = req.params;

    const sql =
      "SELECT id, Name, Email, isActive FROM User WHERE id = ? AND isActive = 1";
    const [rows] = await db.query(sql, [id]);

    if (rows.length === 0) {
      return res
        .status(404)
        .json({ success: false, error: "User not found or inactive." });
    }

    res.json({ success: true, data: rows[0] });
  } catch (error) {
    console.error("❌ getUserById error:", error);
    res.status(500).json({ success: false, error: "Failed to fetch user." });
  }
};

// ========================
// Update User by ID
// ========================
exports.updateUser = async (req, res) => {
  try {
    const { id } = req.params;
    const { Name, Email, Password, ConfirmPassword } = req.body;

    if (!Name || !Email) {
      return res
        .status(400)
        .json({ success: false, error: "Name and Email are required." });
    }

    if ((Password || ConfirmPassword) && Password !== ConfirmPassword) {
      return res
        .status(400)
        .json({ success: false, error: "Passwords do not match." });
    }

    let sql, params;

    if (Password && ConfirmPassword) {
      // const hashedPassword = await bcrypt.hash(Password, 10); // optional
      sql = `
        UPDATE User
        SET Name = ?, Email = ?, Password = ?, ConfirmPassword = ?
        WHERE id = ? AND isActive = 1
      `;
      params = [Name, Email, Password, ConfirmPassword, id];
    } else {
      sql = `
        UPDATE User
        SET Name = ?, Email = ?
        WHERE id = ? AND isActive = 1
      `;
      params = [Name, Email, id];
    }

    const [result] = await db.query(sql, params);

    if (result.affectedRows === 0) {
      return res
        .status(404)
        .json({ success: false, error: "User not found or inactive." });
    }

    res.json({ success: true, message: "User updated successfully." });
  } catch (error) {
    console.error("❌ updateUser error:", error);
    res.status(500).json({ success: false, error: "Failed to update user." });
  }
};

// ========================
// Soft Delete User (Deactivate)
// ========================
exports.deleteUser = async (req, res) => {
  try {
    const { id } = req.params;

    const sql = "UPDATE User SET isActive = 0 WHERE id = ?";
    const [result] = await db.query(sql, [id]);

    if (result.affectedRows === 0) {
      return res
        .status(404)
        .json({ success: false, error: "User not found or already inactive." });
    }

    res.json({ success: true, message: "User deleted successfully." });
  } catch (error) {
    console.error("❌ deleteUser error:", error);
    res.status(500).json({ success: false, error: "Failed to delete user." });
  }
};

// ========================
// Login User (by Email or Name)
// ========================
exports.loginUser = async (req, res) => {
  try {
    const { identifier, Password } = req.body; // identifier = Email or Name

    if (!identifier || !Password) {
      return res
        .status(400)
        .json({ success: false, error: "Email/Name and Password are required." });
    }

    const sql = `
      SELECT id, Name, Email, Password, isActive
      FROM User
      WHERE (Email = ? OR Name = ?)
      LIMIT 1
    `;
    const [rows] = await db.query(sql, [identifier, identifier]);

    if (rows.length === 0) {
      return res
        .status(404)
        .json({ success: false, error: "User not found." });
    }

    const user = rows[0];

    if (user.isActive === 0) {
      return res
        .status(403)
        .json({ success: false, error: "Account is inactive. Contact admin." });
    }

    // Compare passwords
    // const isMatch = await bcrypt.compare(Password, user.Password); // if hashed
    const isMatch = Password === user.Password; // plain text fallback

    if (!isMatch) {
      return res
        .status(401)
        .json({ success: false, error: "Invalid password." });
    }

    res.json({
      success: true,
      message: "Login successful.",
      user: {
        id: user.id,
        Name: user.Name,
        Email: user.Email,
      },
    });
  } catch (error) {
    console.error("❌ loginUser error:", error);
    res.status(500).json({ success: false, error: "Login failed." });
  }
};
