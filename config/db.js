// const mysql = require('mysql');
// const dotenv = require('dotenv');
// const util = require('util');
// dotenv.config();

// const pool = mysql.createPool({
//   connectionLimit: 10, 
//   host: process.env.DB_HOST,
//   user: process.env.DB_USER,
//   password: process.env.DB_PASSWORD,
//   database: process.env.DB_NAME,
//   port: 3306,
// });

// pool.getConnection((err, connection) => {
//   if (err) {
//     console.error('❌ Error connecting to MySQL pool:', err.message);
//     process.exit(1);
//   } else {
//     console.log('✅ MySQL pool connected successfully!');
//     connection.release();
//   }
// });

// // Promisify pool.query to use async/await
// pool.query = util.promisify(pool.query);

// module.exports = pool;






const mysql = require('mysql2/promise');
const dotenv = require('dotenv');
dotenv.config();

const pool = mysql.createPool({
  connectionLimit: 10,
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  port: 3306,
});

(async () => {
  try {
    const connection = await pool.getConnection();
    console.log('✅ MySQL pool connected successfully!');
    connection.release();
  } catch (err) {
    console.error('❌ Error connecting to MySQL pool:', err.message);
    process.exit(1);
  }
})();

module.exports = pool;
