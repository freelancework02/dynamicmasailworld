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
    'https://masailworld.com',
    'https://dynamicmasailworld.onrender.com/'
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



// ------------------- Helpers -------------------
// ------------------- Helpers -------------------
function stripHtml(html = '') {
  try { return String(html).replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim(); }
  catch { return ''; }
}
function truncate(t, n = 220) {
  if (!t) return '';
  return t.length > n ? t.slice(0, n) + '…' : t;
}
function toIso(dt) {
  try {
    const d = new Date(dt);
    return isNaN(d.getTime()) ? undefined : d.toISOString();
  } catch { return undefined; }
}
function formatUrDate(dt) {
  try {
    const d = new Date(dt);
    return isNaN(d.getTime()) ? 'نامعلوم' :
      d.toLocaleDateString('ur-PK',{year:'numeric',month:'long',day:'numeric'});
  } catch { return 'نامعلوم'; }
}
function safeId(obj){
  return obj?.id ?? obj?.ID ?? obj?.Id ?? obj?.articleId ?? obj?.ArticleID ?? null;
}

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
  res.render('Pages/fatawa');
});



app.get('/Categoryfatawa', async (req, res) => {
  res.render('Pages/Categoryfatawa');
});




app.get('/articles', async (req, res) => {
  res.render('Pages/articles');
});


app.get('/about', async (req, res) => {
  res.render('Pages/About');
});

app.get('/question', async (req, res) => {
  res.render('Pages/Question');
});

app.get('/book', async (req, res) => {
  res.render('Pages/book');
});



app.get('/article/:id/image', async (req, res) => {
  try {
    const upstreamBase = process.env.API_BASE || 'https://masailworld.onrender.com/api/article';
    const url = `${upstreamBase}/${encodeURIComponent(req.params.id)}/image`;

    const upstream = await axios.get(url, {
      responseType: 'stream',
      // withCredentials generally not needed for images, but harmless:
      withCredentials: true,
      // pass-through UA can help some CDNs:
      headers: { 'User-Agent': req.headers['user-agent'] || 'MW-Server' }
    });

    // Content-Type & length from upstream if provided
    if (upstream.headers['content-type']) {
      res.setHeader('Content-Type', upstream.headers['content-type']);
    }
    if (upstream.headers['content-length']) {
      res.setHeader('Content-Length', upstream.headers['content-length']);
    }

    // Cache 1 day at edge/browsers; tweak as you wish
    res.setHeader('Cache-Control', 'public, max-age=86400, s-maxage=86400');

    upstream.data.pipe(res);
  } catch (e) {
    // On any failure, return a tiny placeholder SVG (never a JSON error to <img>)
    const svg = `
      <svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630">
        <rect width="100%" height="100%" fill="#eff6e0"/>
        <text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle"
              font-family="Arial" font-size="36" fill="#598392">No Image</text>
      </svg>`;
    res.setHeader('Content-Type', 'image/svg+xml; charset=utf-8');
    res.setHeader('Cache-Control', 'no-cache');
    return res.status(200).send(svg);
  }
});

/**
 * Article detail with SSR meta. Uses proxied image URL for OG/Twitter/WhatsApp.
 */
app.get('/article/:id', async (req, res) => {
  try {
    const { id } = req.params;
    if (!id || id === 'undefined' || id === 'null') {
      return res.status(400).render('Pages/404', { message: 'مضمون نہیں ملا (غلط شناخت).' });
    }

    const API_BASE = process.env.API_BASE || 'https://masailworld.onrender.com/api/article';
    const requestUrl = `${req.protocol}://${req.get('host')}${req.originalUrl}`;

    const { data } = await axios.get(`${API_BASE}/${encodeURIComponent(id)}`, { withCredentials: true });
    const article = (data && (data.data || data)) || {};

    let related = [];
    try {
      const rel = await axios.get(`${API_BASE}?limit=3&excludeId=${encodeURIComponent(id)}`, { withCredentials: true });
      related = (rel.data && (rel.data.data || rel.data)) || [];
      if (!Array.isArray(related)) related = [];
    } catch {}

    const rawTitle = article.Title || 'مسائل ورلڈ — مضمون';
    const rawText  = article.ArticleText || article.seo || '';
    const description = truncate(stripHtml(rawText), 220) || 'مضمون کا خلاصہ دستیاب نہیں۔';
    const author = article.writer || 'ادارہ مسائل ورلڈ';

    // Use same-origin image proxy so scrapers never choke
    const proxiedImage = `${req.protocol}://${req.get('host')}/article/${encodeURIComponent(id)}/image`;

    const publishedTime = toIso(article.createdAt || article.CreatedAt || article.created_at);
    const modifiedTime  = toIso(article.updatedAt || article.UpdatedAt || article.updated_at);

    const meta = {
      title: `${rawTitle} | مسائل ورلڈ`,
      description,
      author,
      url: requestUrl,
      image: proxiedImage, // <— IMPORTANT: use proxy here
      publishedTime,
      modifiedTime,
      publishedDateLabel: formatUrDate(article.createdAt || article.CreatedAt || article.created_at)
    };

    // NOTE: keep view path case as your folder: "Pages/articleDetail"
    res.render('Pages/articleDetail', {
      article,
      related,
      API_BASE,     // still useful for data calls
      meta
    });
  } catch (err) {
    console.error('Error fetching article:', err?.message || err);
    res.status(404).render('Pages/404', { message: 'مضمون نہیں ملا۔' });
  }
});
 
/* ------------------- NEW: Fatwa detail route ------------------- */
/* Renders the EJS page; the page itself fetches details from API_BASE on the client. */
app.get('/fatwa/:id', (req, res) => {
  const { id } = req.params;
  const API_BASE =
    process.env.FATWA_API_BASE ||
    (process.env.API_BASE /* your original */) ||
    'https://masailworld.onrender.com/api/fatwa';

  res.render('Pages/fatwa-detail', {
    pageTitle: 'مسائل ورلڈ - دار الافتاء اہل سنت',
    fatwaId: id,
    API_BASE,
    requestUrl: `${req.protocol}://${req.get('host')}${req.originalUrl}`
  });
});

/* Optional: legacy redirect from old static HTML link to new pretty route
   e.g., /Pages/fatwa-detail.html?id=2808  ->  /fatwa/2808
*/
app.get(['/Pages/fatwa-detail.html', '/fatwa-detail.html'], (req, res) => {
  const id = req.query.id;
  if (id) return res.redirect(301, `/fatwa/${encodeURIComponent(id)}`);
  return res.redirect(301, '/fatwa');
});


// Book Section here

app.get('/book/:id/cover', async (req, res) => {
  try {
    const BOOK_API_BASE = process.env.BOOK_API_BASE || 'https://api.masailworld.com/api/book';
    // Expected upstream pattern: /api/book/:id/cover
    const url = `${BOOK_API_BASE}/${encodeURIComponent(req.params.id)}/cover`;

    const upstream = await axios.get(url, {
      responseType: 'stream',
      withCredentials: true,
      headers: { 'User-Agent': req.headers['user-agent'] || 'MW-Server' }
    });

    if (upstream.headers['content-type']) {
      res.setHeader('Content-Type', upstream.headers['content-type']);
    }
    if (upstream.headers['content-length']) {
      res.setHeader('Content-Length', upstream.headers['content-length']);
    }
    res.setHeader('Cache-Control', 'public, max-age=86400, s-maxage=86400');
    upstream.data.pipe(res);
  } catch (e) {
    const svg = `
      <svg xmlns="http://www.w3.org/2000/svg" width="800" height="1200">
        <rect width="100%" height="100%" fill="#eff6e0"/>
        <text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle"
              font-family="Arial" font-size="36" fill="#598392">No Cover</text>
      </svg>`;
    res.setHeader('Content-Type', 'image/svg+xml; charset=utf-8');
    res.setHeader('Cache-Control', 'no-cache');
    return res.status(200).send(svg);
  }
});

/** SSR: Book detail page with full meta */
app.get('/book/:id', async (req, res) => {
  try {
    const { id } = req.params;
    if (!id || id === 'undefined' || id === 'null') {
      return res.status(400).render('Pages/404', { message: 'کتاب نہیں ملی (غلط شناخت).' });
    }

    const BOOK_API_BASE = process.env.BOOK_API_BASE || 'https://api.masailworld.com/api/book';
    const requestUrl = `${req.protocol}://${req.get('host')}${req.originalUrl}`;

    // Fetch the book
    const { data } = await axios.get(`${BOOK_API_BASE}/${encodeURIComponent(id)}`, { withCredentials: true });
    const book = (data && (data.data || data)) || {};

    // Defensive fields
    const title  = book.Title || book.title || 'نامعلوم کتاب';
    const author = book.Author || book.author || 'ادارہ مسائل ورلڈ';
    const about  = book.Description || book.description || book.seo || book.Summary || '';
    const tags   = book.tags || book.Tags || '';
    const createdAt  = book.createdAt || book.CreatedAt || book.created_at;
    const updatedAt  = book.updatedAt || book.UpdatedAt || book.updated_at;

    // Same-origin image proxy for scrapers (WhatsApp/Twitter/FB)
    const coverImage = `${req.protocol}://${req.get('host')}/book/${encodeURIComponent(id)}/cover`;

    const meta = {
      title: `${title} | اسلامی کتب — مسائل ورلڈ`,
      description: truncate(stripHtml(about), 220) || 'کتاب کی تفصیل دستیاب نہیں۔',
      author,
      url: requestUrl,
      image: coverImage,
      publishedTime: toIso(createdAt),
      modifiedTime: toIso(updatedAt),
      publishedDateLabel: formatUrDate(createdAt),
      tags
    };

    // Render page
    res.render('Pages/Book-detail', { book, meta, BOOK_API_BASE });
  } catch (err) {
    console.error('Error fetching book:', err?.message || err);
    res.status(404).render('Pages/404', { message: 'کتاب نہیں ملی۔' });
  }
});

// ------------------- Server -------------------
app.listen(port, () => {
  console.log(`✅ Server is running on http://localhost:${port}`);
});
