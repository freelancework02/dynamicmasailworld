// middleware/anonId.js
const crypto = require('crypto');
const { v4: uuidv4 } = require('uuid');

module.exports = function anonId(req, res, next) {
  const COOKIE_NAME = 'anon_id';
  let anon = req.cookies?.[COOKIE_NAME];
  if (!anon) {
    anon = uuidv4(); // e.g., "b6a8e0f8-..."
    // httpOnly=false so frontend can read the liked state if needed; SameSite=Lax, Secure in prod
    res.cookie(COOKIE_NAME, anon, {
      httpOnly: true,
      sameSite: 'Lax',
      secure: true,           // set true in HTTPS
      maxAge: 1000 * 60 * 60 * 24 * 365 * 5 // 5 years
    });
  }
  // Hash before using in DB
  req.anonHash = crypto.createHash('sha256').update(anon).digest('hex'); // 64-char hex
  next();
};
