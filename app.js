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
    'https://dynamicmasailworld.onrender.com',
    'http://localhost:5000',
    'http://127.0.0.1:5500'
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
  if (!dt) return "نامعلوم";
  const d = new Date(dt);
  if (isNaN(d.getTime())) return "نامعلوم";
  // 17 ستمبر 2025 — simple Urdu-ish month names
  const months = ["جنوری","فروری","مارچ","اپریل","مئی","جون","جولائی","اگست","ستمبر","اکتوبر","نومبر","دسمبر"];
  const day = d.getDate();
  const month = months[d.getMonth()];
  const year = d.getFullYear();
  return `${day} ${month} ${year}`;
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


app.get('/categories', async (req, res) => {
  res.render('Pages/categories');
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
    const upstreamBase = process.env.API_BASE || 'https://dynamicmasailworld.onrender.com/api/article';
    const url = `${upstreamBase}/${encodeURIComponent(req.params.id)}/image`;

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
 * Article detail with full SSR meta (WhatsApp/FB/Twitter/Google friendly).
 * Uses the same-origin image proxy above for og:image/twitter:image.
 */
app.get('/article/:id', async (req, res) => {
  try {
    const { id } = req.params;
    if (!id || id === 'undefined' || id === 'null') {
      return res.status(400).render('Pages/404', { message: 'مضمون نہیں ملا (غلط شناخت).' });
    }

    const API_BASE = process.env.API_BASE || 'https://dynamicmasailworld.onrender.com/api/article';

    // Use SITE_ORIGIN on prod to avoid localhost canonicals in previews
    const siteOrigin = process.env.SITE_ORIGIN || `${req.protocol}://${req.get('host')}`;
    const requestUrl = `${siteOrigin}${req.originalUrl}`;

    // Fetch the article
    const { data } = await axios.get(`${API_BASE}/${encodeURIComponent(id)}`, { withCredentials: true, timeout: 10000 });
    const article = (data && (data.data || data)) || {};

    // Related (optional, ignore errors)
    let related = [];
    try {
      const rel = await axios.get(`${API_BASE}?limit=3&excludeId=${encodeURIComponent(id)}`, { withCredentials: true, timeout: 8000 });
      related = (rel.data && (rel.data.data || rel.data)) || [];
      if (!Array.isArray(related)) related = [];
    } catch {}

    // Build meta
    const rawTitle = (article.Title || article.title || 'مسائل ورلڈ — مضمون').trim();
    const rawText  = article.ArticleText || article.seo || '';
    const description = truncate(stripHtml(rawText) || 'مضمون کا خلاصہ دستیاب نہیں۔', 220);
    const author = article.writer || 'ادارہ مسائل ورلڈ';

    const proxiedImage = `${siteOrigin}/article/${encodeURIComponent(id)}/image`;

    const publishedTime = toIso(article.createdAt || article.CreatedAt || article.created_at);
    const modifiedTime  = toIso(article.updatedAt || article.UpdatedAt || article.updated_at);

    const meta = {
      title: `${rawTitle} | مسائل ورلڈ`,
      description,
      author,
      url: requestUrl,
      image: proxiedImage,
      publishedTime,
      modifiedTime,
      publishedDateLabel: formatUrDate(article.createdAt || article.CreatedAt || article.created_at),

      // extras used for JSON-LD
      keywords: article.tags || article.Tags || undefined,
      siteName: "مسائل ورلڈ",
      locale: "ur_PK"
    };

    res.render('Pages/articleDetail', {
      article,
      related,
      API_BASE, // if client still fetches anything, keep it available
      meta
    });
  } catch (err) {
    console.error('Error fetching article:', err?.message || err);
    res.status(404).render('Pages/404', { message: 'مضمون نہیں ملا۔' });
  }
});
 


/* ------------------- NEW: Fatwa detail route ------------------- */
/* Renders the EJS page; the page itself fetches details from API_BASE on the client. */
app.get("/fatwa/:id", async (req, res) => {
  const { id } = req.params;

  // Your API base (same as before, but we’ll use it to fetch the fatwa)
  const API_BASE =
    process.env.FATWA_API_BASE ||
    process.env.API_BASE ||
    "https://dynamicmasailworld.onrender.com/api/fatwa";

  // Figure out absolute URLs for canonical/OG
  // In production set SITE_ORIGIN=https://masailworld.com to avoid localhost canonicals
  const siteOrigin =
    process.env.SITE_ORIGIN ||
    `${req.protocol}://${req.get("host")}`;
  const requestUrl = `${siteOrigin}${req.originalUrl}`;

  let fatwa = null;
  try {
    const resp = await axios.get(`${API_BASE}/${encodeURIComponent(id)}`, {
      // cookies usually don't matter for public GETs, but keeping parity:
      withCredentials: true,
      timeout: 10000,
    });
    fatwa = resp?.data || null;
  } catch (err) {
    console.error("❌ Failed to fetch fatwa for SSR:", err?.message);
  }

  // Title to show in browser tab
  const pageTitle = fatwa?.Title
    ? `${fatwa.Title} — مسائل ورلڈ`
    : "مسائل ورلڈ - دار الافتاء اہل سنت";

  // Render page with fatwa data (or null on error; EJS is defensive)
  res.render("Pages/fatwa-detail", {
    pageTitle,
    fatwa,                    // <-- important
    fatwaId: id,
    API_BASE,
    requestUrl,
    baseUrl: siteOrigin,      // used by EJS for canonical fallback
  });
});

// Legacy redirect stays as-is
app.get(["/Pages/fatwa-detail.html", "/fatwa-detail.html"], (req, res) => {
  const id = req.query.id;
  if (id) return res.redirect(301, `/fatwa/${encodeURIComponent(id)}`);
  return res.redirect(301, "/fatwa");
});


// Book Section here

app.get('/book/:id/cover', async (req, res) => {
  try {
    const upstreamBase =
      process.env.BOOK_API_BASE ||
      process.env.API_BASE ||
      'https://dynamicmasailworld.onrender.com/api/book';
    const url = `${upstreamBase}/${encodeURIComponent(req.params.id)}/cover`;

    const upstream = await axios.get(url, {
      responseType: 'stream',
      withCredentials: true,
      headers: { 'User-Agent': req.headers['user-agent'] || 'MW-Server' },
      timeout: 10000
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
      <svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630">
        <rect width="100%" height="100%" fill="#eff6e0"/>
        <text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle"
              font-family="Arial" font-size="36" fill="#598392">No Cover</text>
      </svg>`;
    res.setHeader('Content-Type', 'image/svg+xml; charset=utf-8');
    res.setHeader('Cache-Control', 'no-cache');
    return res.status(200).send(svg);
  }
});

/**
 * Book detail page with full SSR SEO.
 */
app.get('/book/:id', async (req, res) => {
  try {
    const { id } = req.params;
    if (!id || id === 'undefined' || id === 'null') {
      return res.status(400).render('Pages/404', { message: 'کتاب نہیں ملی (غلط شناخت).' });
    }

    const BOOK_API_BASE =
      process.env.BOOK_API_BASE ||
      process.env.API_BASE ||
      'https://dynamicmasailworld.onrender.com/api/book';

    const siteOrigin = process.env.SITE_ORIGIN || `${req.protocol}://${req.get('host')}`;
    const requestUrl = `${siteOrigin}${req.originalUrl}`;

    // Fetch book
    const { data } = await axios.get(`${BOOK_API_BASE}/${encodeURIComponent(id)}`, {
      withCredentials: true,
      timeout: 10000
    });
    const book = (data && (data.data || data)) || {};

    // Build meta
    const bookName  = (book.BookName || book.title || book.Title || 'کتاب').trim();
    const writer    = book.BookWriter || book.author || book.Author || 'نامعلوم مصنف';
    const rawDesc   = book.BookDescription || book.Description || book.Summary || '';
    const desc      = truncate(stripHtml(rawDesc) || 'کتاب کا خلاصہ دستیاب نہیں۔', 220);

    const coverUrl  = `${siteOrigin}/book/${encodeURIComponent(id)}/cover`;

    const publishedTime = toIso(book.createdAt || book.CreatedAt || book.created_at || book.PublicationDate);
    const modifiedTime  = toIso(book.updatedAt || book.UpdatedAt || book.updated_at);

    const tagsRaw = book.tags || book.Tags || '';
    const tags = Array.isArray(tagsRaw)
      ? tagsRaw
      : String(tagsRaw || '').split(',').map(t => t.trim()).filter(Boolean);

    const meta = {
      // page basics
      title: `${bookName} — کتاب | مسائل ورلڈ`,
      description: desc,
      author: writer,
      url: requestUrl,
      image: coverUrl,
      publishedTime,
      modifiedTime,
      publishedDateLabel: formatUrDate(book.createdAt || book.CreatedAt || book.created_at || book.PublicationDate),
      // OG Book extras
      bookName,
      bookAuthor: writer,
      isbn: book.ISBN || book.isbn || undefined,
      tags,
      locale: 'ur',
      siteName: 'مسائل ورلڈ'
    };

    res.render('Pages/Book-detail', {
      book,
      meta
    });
  } catch (err) {
    console.error('Error fetching book:', err?.message || err);
    res.status(404).render('Pages/404', { message: 'کتاب نہیں ملی۔' });
  }
});

// ------------------- Server -------------------
app.listen(port, () => {
  console.log(`✅ Server is running on http://localhost:${port}`);
});
