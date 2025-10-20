// const express = require('express');
// const app = express();
// const dotenv = require('dotenv');
// const cors = require('cors');
// const cookieParser = require('cookie-parser');
// const anonId = require('./middleware/anonId');

// dotenv.config();
// const port = process.env.PORT || 5000;

// app.use(express.json());
// app.use(cors());

// app.use(cookieParser());
// app.use(anonId);

// app.use(cors({
//   origin: ['http://localhost:5501','http://127.0.0.1:5501','https://masailworld.com'],
//   credentials: true
// }));
// // ------------------- Routes -------------------
// app.use('/api/fatwa', require('./routes/fatwaRoutes'));
// app.use('/api/article', require('./routes/articleRoutes'));
// app.use('/api/book', require('./routes/bookRoutes'));
// // app.use('/api/writer', require('./routes/writerRoutes'));
// // app.use('/api/topic', require('./routes/topicRoutes'));
// app.use('/api/users', require('./routes/userRoutes'));
// app.use('/api/auth', require('./routes/authRoutes'));
// app.use('/api/stats', require('./routes/statusRoutes'));
// app.use('/api/questions', require('./routes/questionsRoutes'));
// app.use('/questions', require('./routes/SawaljawabRoutes'));
// app.use('/api/activity', require("./routes/activityRoutes.js"));

// // Newly added routes
// app.use('/api/aleem', require('./routes/aleemRoutes.js'));   // 👳 UlmaeKaram entries
// app.use('/api/tags', require('./routes/tagRoutes'));       // 🏷️ Tags
// // app.use('/api/user', require('./routes/userRoutes'));       // 👤 User (insert, get all names, get by id)

// // ------------------- Server -------------------
// app.listen(port, () => {
//   console.log(`✅ Server is running on port ${port}`);
// });







// ------------------- Imports -------------------
const express = require('express');
const path = require('path');
const dotenv = require('dotenv');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const anonId = require('./middleware/anonId');
const axios = require('axios');

// ------------------- Config -------------------
dotenv.config();
const app = express();
const port = process.env.PORT || 5000;

// ------------------- Middleware -------------------
app.use(express.json());
app.use(cookieParser());
app.use(anonId);

// Allow cross-origin requests (for your frontend + production domain)
app.use(cors({
  origin: [
    'http://localhost:5501',
    'http://127.0.0.1:5501',
    'http://localhost:3000',
    'https://masailworld.com'
  ],
  credentials: true
}));

// ------------------- EJS Setup -------------------
// Set "views" directory for EJS templates
app.set('views', path.join(__dirname, 'views'));

// Set EJS as the templating engine
app.set('view engine', 'ejs');

// Serve static assets (CSS, JS, Images, etc.) from /public folder
app.use(express.static(path.join(__dirname, 'public')));

// ------------------- API Routes -------------------
app.use('/api/fatwa', require('./routes/fatwaRoutes'));
app.use('/api/article', require('./routes/articleRoutes'));
app.use('/api/book', require('./routes/bookRoutes'));
app.use('/api/users', require('./routes/userRoutes'));
app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/stats', require('./routes/statusRoutes'));
app.use('/api/questions', require('./routes/questionsRoutes'));
app.use('/questions', require('./routes/SawaljawabRoutes'));
app.use('/api/activity', require("./routes/activityRoutes.js"));
app.use('/api/aleem', require('./routes/aleemRoutes.js'));
app.use('/api/tags', require('./routes/tagRoutes'));

// ------------------- EJS Web Routes -------------------
// Example: Home route (you can edit later to render your own page)
app.get('/', (req, res) => {
  // You can pass dynamic data to your EJS template
  res.render('index', {
    title: 'MasailWorld',
    message: 'Welcome to MasailWorld – Powered by EJS!',
  });
});

// Example: Dynamic route rendering (optional)
app.get('/fatwa', async (req, res) => {
  res.render('pages/fatawa');
});



app.get('/Categoryfatawa', async (req, res) => {
  res.render('pages/Categoryfatawa');
});


app.get('/articles', async (req, res) => {
  res.render('pages/articles');
});


app.get('/about', async (req, res) => {
  res.render('pages/About');
});

app.get('/question', async (req, res) => {
  res.render('pages/Question');
});

app.get('/book', async (req, res) => {
  res.render('pages/book');
});



app.get('/article/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const API_BASE = process.env.API_BASE || 'https://masailworld.onrender.com/api/article';

    // Fetch article detail from API
    const { data } = await axios.get(`${API_BASE}/${id}`);
    const article = data.data || data; // unwrap if needed

    // Fetch related articles (limit to 3)
    let related = [];
    try {
      const rel = await axios.get(`${API_BASE}?limit=3&excludeId=${id}`);
      related = rel.data.data || rel.data || [];
    } catch (_) {}

    res.render('pages/articleDetail', {
      article,
      related,
      requestUrl: `${req.protocol}://${req.get('host')}${req.originalUrl}`,
      API_BASE,
    });
  } catch (err) {
    console.error('Error fetching article:', err.message);
    res.status(404).render('pages/404', { message: 'مضمون نہیں ملا۔' });
  }
});




// ------------------- Server -------------------
app.listen(port, () => {
  console.log(`✅ Server is running on http://localhost:${port}`);
});
