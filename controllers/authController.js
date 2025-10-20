const pool = require('../config/db'); // DB connection
const bcrypt = require('bcrypt'); // Optional — use if passwords are hashed

exports.loginUser = async (req, res) => {
  const { usernameOrEmail, password } = req.body;

  // Validate input
  if (!usernameOrEmail || !password) {
    return res.status(400).json({ error: 'Email/Name and password are required.' });
  }

  try {
    // Search by either Name or Email
    const [rows] = await pool.query(
      'SELECT * FROM User WHERE Name = ? OR Email = ?',
      [usernameOrEmail, usernameOrEmail]
    );

    if (!rows || rows.length === 0) {
      return res.status(401).json({ error: 'Invalid username/email or password.' });
    }

    const user = rows[0];

    // 🔐 If passwords are hashed in DB (recommended):
    // const isMatch = await bcrypt.compare(password, user.Password);
    // if (!isMatch) {
    //   return res.status(401).json({ error: 'Invalid username/email or password.' });
    // }

    // ⚠️ If passwords are plain text (not secure):
    if (password !== user.Password) {
      return res.status(401).json({ error: 'Invalid username/email or password.' });
    }

    // Check if user is active (optional)
    if (user.isActive === 0) {
      return res.status(403).json({ error: 'Your account is inactive. Please contact admin.' });
    }

    // ✅ Successful login
    res.json({
      success: true,
      message: 'Login successful',
      userId: user.id,
      name: user.Name,
      email: user.Email,
    });

  } catch (error) {
    console.error('❌ Login error:', error);
    res.status(500).json({ error: 'Server error during login.' });
  }
};
