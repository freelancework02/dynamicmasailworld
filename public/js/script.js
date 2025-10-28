





// Other Latest
document.addEventListener("DOMContentLoaded", async () => {
  const LIST_ID = "latest-fatawa-list";
  const API = "https://masailworld.com/api/fatwa/latest";

  // ---- helpers ----
  const byId = (id) => document.getElementById(id);
  const toArray = (x) => (Array.isArray(x) ? x : (x ? [x] : []));
  const plainText = (s) => String(s || "").replace(/<[^>]*>/g, "").replace(/\s+/g, " ").trim();
  const clip = (s, n = 180) => (s.length > n ? s.slice(0, n - 1) + "…" : s);

  try {
    const list = byId(LIST_ID);
    if (!list) return;

    list.innerHTML = ""; // clear placeholder

    const res = await fetch(API, { credentials: "include" });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();

    // handle common shapes: {data:[...]}, [...], {..single..}
    const rows = Array.isArray(data?.data) ? data.data : toArray(data);

    if (!rows.length) {
      list.innerHTML = `<div class="text-center text-gray-500 py-6">فی الحال کوئی تازہ فتاویٰ موجود نہیں۔</div>`;
      return;
    }

    rows.forEach((fatwa, index) => {
      const id = fatwa.id ?? fatwa.ID ?? fatwa.Id;
      const title = plainText(fatwa.Title || fatwa.title || "بلا عنوان");
      const details = clip(plainText(fatwa.detailquestion || fatwa.tafseel || fatwa.Answer || ""));
      const views = Number(fatwa.Views || fatwa.views || 0);
      const link = `/fatwa/${encodeURIComponent(id)}`;

      // Outer clickable wrapper (entire card redirects)
      const outer = document.createElement("a");
      outer.href = link;
      outer.className = [
        "block w-full h-full",                // fills the grid cell
        "focus:outline-none focus-visible:ring-2 focus-visible:ring-midnight_green/60",
        "group"
      ].join(" ");

      // Card (fixed min height for visual consistency)
      const card = document.createElement("div");
      card.className = [
        "bg-white p-5 md:p-6 rounded-xl shadow-lg border border-ash_gray/50",
        "hover:shadow-xl transition-shadow",
        "h-full min-h-[132px]"                // adjust height
      ].join(" ");

      // Layout: force left column for badge using CSS grid (stable in RTL pages)
      card.innerHTML = `
        <div class="grid grid-cols-[3.5rem_1fr] md:grid-cols-[3.75rem_1fr] gap-4 items-start text-right">
          <!-- index badge (left column) -->
          <div class="w-14 h-14 md:w-15 md:h-15 rounded-xl bg-midnight_green text-white 
                      font-bold text-2xl md:text-3xl grid place-items-center shadow-md select-none">
            ${index + 1}
          </div>

          <!-- content (right column) -->
          <div class="min-w-0">
            <h3 class="text-xl md:text-2xl font-semibold text-rich_black leading-normal">
              <span class="align-baseline inline group-hover:underline">${title}</span>
            </h3>

            <p class="text-base md:text-lg mt-2 mb-4 leading-relaxed break-words">
              ${details}
            </p>

            <div class="flex items-center justify-between">
              <span class="font-bold text-md md:text-lg text-midnight_green group-hover:underline">
                مکمل جواب پڑھیں &larr;
              </span>

              <div class="flex items-center gap-3 text-air_force_blue">
                <span class="flex items-center gap-1">
                  <i class="bi bi-eye-fill"></i>
                  <span class="font-sans">${views}</span>
                </span>
              </div>
            </div>
          </div>
        </div>
      `;

      outer.appendChild(card);
      list.appendChild(outer);
    });
  } catch (err) {
    console.error("❌ Error loading latest fatawa:", err);
    const list = document.getElementById("latest-fatawa-list");
    if (list) {
      list.innerHTML = `<div class="text-center text-red-600 py-6">تازہ فتاویٰ لوڈ نہیں ہو سکے۔ بعد میں کوشش کریں۔</div>`;
    }
  }
});








// Article 






//  Search functionality 

/* ========= Home Search Dropdown for Fatawa ========= */

/** ---------- Small helpers (plain text only) ---------- */
const urLocale = Intl.NumberFormat('ur-PK');

function htmlToPlainText(input = '') {
  // Remove any HTML and decode entities by leveraging the browser parser
  const tpl = document.createElement('template');
  tpl.innerHTML = String(input);
  const text = (tpl.content.textContent || '').replace(/\s+/g, ' ').trim();
  return text;
}

const escapeText = (s='') => String(s)
  .replaceAll('&','&amp;').replaceAll('<','&lt;')
  .replaceAll('>','&gt;').replaceAll('"','&quot;')
  .replaceAll("'","&#039;");

const truncate = (s = '', n = 140) => (s.length > n ? s.slice(0, n - 1) + '…' : s);

const debounce = (fn, ms=250) => {
  let t; return (...args) => { clearTimeout(t); t = setTimeout(() => fn(...args), ms); };
};

/**
 * ---------- Server-side search (fallback to local) ----------
 * Adjust endpoints/params if your backend differs.
 */
async function searchFatawaServer(query, limit = 10) {
  const base = 'https://masailworld.com/api/fatwa';
  const urls = [
    `${base}?search=${encodeURIComponent(query)}&limit=${limit}&offset=0`,
    `${base}/search?query=${encodeURIComponent(query)}&limit=${limit}&offset=0`,
  ];
  for (const url of urls) {
    try {
      const res = await fetch(url, { cache: 'no-store' });
      if (!res.ok) continue;
      const data = await res.json();
      if (Array.isArray(data) && data.length) {
        // Normalize shape
        return data.map(row => ({
          id: row.id ?? row._id ?? row.slug ?? '',
          title: row.Title ?? row.title ?? row.question ?? '',
          snippet: row.detailquestion ?? row.details ?? '',
          views: Number(row.Views ?? row.views ?? 0)
        })).filter(x => x.id && x.title);
      }
    } catch (_) { /* try next */ }
  }
  return [];
}

/** ---------- Local search fallback (uses FATAWA_DATA) ---------- */
function searchFatawaLocal(query, limit = 10) {
  const q = query.trim();
  if (!q) return [];
  const hits = (Array.isArray(FATAWA_DATA) ? FATAWA_DATA : [])
    .filter(f =>
      String(f.question || '').includes(q) ||
      String(f.details || '').includes(q)
    )
    .slice(0, limit)
    .map(f => ({
      id: f.id,
      title: f.question || '',
      snippet: f.details || '',
      views: f.views || ''
    }));
  return hits;
}

/** ---------- Home search dropdown init ---------- */
function initHomeFatawaSearchDropdown({
  inputEl = document.getElementById('searchInput'),
  dropdownEl = document.getElementById('searchDropdown'),
  minChars = 2,
  limit = 10
} = {}) {
  if (!inputEl || !dropdownEl) return;

  let items = [];
  let activeIndex = -1;

  const closeDropdown = () => {
    dropdownEl.classList.add('hidden');
    dropdownEl.innerHTML = '';
    activeIndex = -1;
  };

  const openDetail = (id) => {
    if (!id) return;
    window.location.href = `/fatwa/${encodeURIComponent(id)}`;
  };

  const renderDropdown = (results) => {
    items = results;
    activeIndex = -1;

    if (!items.length) {
      dropdownEl.innerHTML = `
        <div class="py-3 px-4 text-air_force_blue">کوئی نتیجہ نہیں ملا</div>
      `;
      dropdownEl.classList.remove('hidden');
      return;
    }

    dropdownEl.innerHTML = items.map((item, i) => {
      // Force plain text (strip tags), then escape and truncate for safety
      const titlePlain   = htmlToPlainText(item.title || 'بلا عنوان');
      const snippetPlain = htmlToPlainText(item.snippet || '');
      const title   = escapeText(titlePlain);
      const snippet = escapeText(truncate(snippetPlain, 140));
      const views = (typeof item.views === 'number')
        ? urLocale.format(item.views)
        : escapeText(String(item.views || ''));

      return `
        <button type="button"
          data-index="${i}"
          class="w-full text-right block py-3 px-4 hover:bg-ash_gray focus:bg-ash_gray transition outline-none">
          <div class="font-semibold text-rich_black">${title}</div>
          ${snippet ? `<div class="text-sm text-air_force_blue mt-1">${snippet}</div>` : ''}
          <div class="text-xs text-air_force_blue mt-1 flex items-center justify-end">
            <i class="bi bi-eye-fill ml-1"></i><span class="font-sans">${views}</span>
          </div>
        </button>
      `;
    }).join('');

    dropdownEl.classList.remove('hidden');

    dropdownEl.querySelectorAll('button[data-index]').forEach(btn => {
      btn.addEventListener('click', () => {
        const idx = Number(btn.getAttribute('data-index'));
        const chosen = items[idx];
        if (chosen) openDetail(chosen.id);
      });
    });
  };

  const doSearch = debounce(async (value) => {
    const q = value.trim();
    if (q.length <= minChars) {
      closeDropdown();
      return;
    }
    let results = await searchFatawaServer(q, limit);
    if (!results.length) {
      results = searchFatawaLocal(q, limit);
    }
    renderDropdown(results);
  }, 250);

  // Input handlers
  inputEl.addEventListener('input', (e) => {
    doSearch(e.target.value);
  });

  inputEl.addEventListener('keydown', (e) => {
    if (dropdownEl.classList.contains('hidden')) return;

    const max = items.length - 1;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      activeIndex = Math.min(max, activeIndex + 1);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      activeIndex = Math.max(0, activeIndex - 1);
    } else if (e.key === 'Enter') {
      if (activeIndex >= 0 && items[activeIndex]) {
        e.preventDefault();
        openDetail(items[activeIndex].id);
      }
    } else if (e.key === 'Escape') {
      closeDropdown();
      return;
    } else {
      return;
    }

    dropdownEl.querySelectorAll('button[data-index]').forEach((btn, i) => {
      if (i === activeIndex) {
        btn.classList.add('bg-ash_gray');
        btn.scrollIntoView({ block: 'nearest' });
      } else {
        btn.classList.remove('bg-ash_gray');
      }
    });
  });

  // Close on outside click
  document.addEventListener('click', (e) => {
    if (e.target === inputEl || dropdownEl.contains(e.target)) return;
    closeDropdown();
  });

  // Close on blur if focus moves away
  inputEl.addEventListener('blur', () => {
    setTimeout(() => {
      if (!dropdownEl.contains(document.activeElement)) closeDropdown();
    }, 150);
  });
}

/* ---------- Initialize for the Home search bar ---------- */
document.addEventListener('DOMContentLoaded', () => {
  const inputEl = document.getElementById('searchInput');       // already in your markup
  const dropdownEl = document.getElementById('searchDropdown'); // already in your markup
  initHomeFatawaSearchDropdown({ inputEl, dropdownEl });
});





// Homepage book section

const BOOKS_API = (window.__MW__ && window.__MW__.BOOKS_API) || 'https://masailworld.com/api/book';
const BOOK_COVER_URL = (id) => `https://masailworld.com/api/book/${encodeURIComponent(id)}/cover`; // per your pattern

/* --- NEW: views endpoint base --- */
const VIEW_API = (window.__MW__ && window.__MW__.VIEW_API) || 'https://masailworld.com/api/book';

/* --- helpers --- */

/* simple HTML escaper (used by render) */


/* keep only plain text for the one-liner */
function plainOneLine(s, max = 110) {
  if (!s) return '';
  const text = String(s).replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();
  return text.length > max ? text.slice(0, max - 1) + '…' : text;
}

/* --- NEW: increment views without blocking navigation --- */
function incrementBookView(id) {
  if (!id) return;
  const url = `${VIEW_API.replace(/\/$/, '')}/${encodeURIComponent(id)}/view`;

  // Try GET with keepalive, no-cors (works if you exposed GET route)
  try {
    fetch(url, { method: 'post', credentials: 'include', keepalive: true, mode: 'no-cors'})
      .catch(() => {
        // Fallback to POST (works if you only exposed POST)
        if (navigator.sendBeacon) {
          const blob = new Blob([], { type: 'text/plain' });
          navigator.sendBeacon(url, blob);
        } else {
          fetch(url, { method: 'POST', keepalive: true, mode: 'no-cors', credentials: 'include', body: '' })
            .catch(() => {/* ignore */});
        }
      });
  } catch (_) {
    // Final fallback
    if (navigator.sendBeacon) {
      const blob = new Blob([], { type: 'text/plain' });
      navigator.sendBeacon(url, blob);
    }
  }
}

/* -------- Card renderer -------- */
function renderBookCard(b) {
  const id =
    b.id ?? b.ID ?? b.Id ?? b.bookId ?? b.BookID ?? b.BookId ?? b.BookID;

  // If no id, skip rendering a clickable card
  if (!id) {
    return '';
  }

  const title = escapeText(b.BookName || b.title || b.Name || b.name || 'بلا عنوان');
  const about = plainOneLine(b.BookDescription || b.about || b.details || b.Summary || b.summary || '');

  const imgSrc = BOOK_COVER_URL(id);
  const fallback =
    "this.onerror=null;this.src='https://dummyimage.com/640x900/eef2f7/8892a6.jpg&text=%DA%A9%D8%AA%D8%A7%D8%A8'";

  // IMPORTANT: build the real detail link
  const detailHref = `/book/${encodeURIComponent(id)}`;

  return `
    <a href="${detailHref}" class="block group js-book-card" data-book-id="${encodeURIComponent(id)}">
      <div class="bg-white rounded-2xl shadow-lg border overflow-hidden h-full flex flex-col">
        <div class="relative aspect-[3/4] overflow-hidden bg-[#f6f7fb]">
          <img src="${imgSrc}" alt="${title}"
               class="w-full h-full object-cover group-hover:scale-[1.03] transition"
               loading="lazy" onerror="${fallback}">
        </div>
        <div class="p-4 flex flex-col gap-1">
          <h3 class="text-rich_black text-lg font-bold line-clamp-2">${title}</h3>
          <p class="text-gray-600 text-sm line-clamp-2">${escapeText(about)}</p>
        </div>
      </div>
    </a>
  `;
}

/* -------- Main loader -------- */
async function loadKitabe(limit = 4) {
  const grid = document.getElementById('kitabe-grid');
  const loader = document.getElementById('kitabe-loader');
  if (!grid) return;

  try {
    loader && loader.classList.remove('hidden');

    const res = await fetch(BOOKS_API, { credentials: 'include' });
    const payload = await res.json();

    // accept either raw array or {data:[...]}
    const books = Array.isArray(payload) ? payload
                 : (Array.isArray(payload?.data) ? payload.data : []);

    const items = books.slice(0, limit);
    if (!items.length) {
      grid.innerHTML = `<div class="col-span-full text-center text-gray-600">کوئی کتاب دستیاب نہیں۔</div>`;
      return;
    }

    const html = items.map(renderBookCard).filter(Boolean).join('');
    grid.innerHTML = html || `<div class="col-span-full text-center text-gray-600">کوئی کتاب دستیاب نہیں۔</div>`;

    /* --- NEW: wire clicks to increment views (event delegation) --- */
    grid.addEventListener('click', function (e) {
      const a = e.target.closest('.js-book-card');
      if (!a || !grid.contains(a)) return;
      const id = a.getAttribute('data-book-id');
      if (!id) return;
      // fire-and-forget
      incrementBookView(id);
      // allow navigation to proceed naturally
    }, { passive: true });

  } catch (err) {
    console.error('loadKitabe error:', err);
    if (grid) grid.innerHTML = `<div class="col-span-full text-center text-red-600">کتابیں لوڈ کرنے میں مسئلہ ہوا۔</div>`;
  } finally {
    loader && loader.classList.add('hidden');
  }
}

/* Tailwind line-clamp fallback (in case plugin isn't active) */
(function ensureClamp() {
  if (!document.getElementById('ms-lineclamp')) {
    const style = document.createElement('style');
    style.id = 'ms-lineclamp';
    style.textContent = `
      .line-clamp-2 {
        display: -webkit-box;
        -webkit-line-clamp: 2;
        -webkit-box-orient: vertical;
        overflow: hidden;
      }`;
    document.head.appendChild(style);
  }
})();

/* Auto-init on ready (safe repeat) */
document.addEventListener('DOMContentLoaded', () => {
  loadKitabe(4);
});








// fatawa section

  (function () {
    const FATAWA_API_BASE =
      (window.__MW__ && window.__MW__.FATAWA_API) ||
      "https://masailworld.com/api/fatwa"; // dev fallback

    // Use your controller's latest endpoint
    const ENDPOINT = `${FATAWA_API_BASE}/latest`;

    // Build your detail page URL (you’re using /fatwa/:id)
    const fatwaDetailUrl = (id /*, slug */) =>
      `/fatwa/${encodeURIComponent(id)}`;

    // ---------- Utils ----------
    function escapeText(s) {
      return String(s ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;")
        .replace(/'/g, "nbsp&;");
    }

    function stripHtmlToOneLine(html, max = 120) {
      const text = String(html ?? "")
        .replace(/<[^>]+>/g, "")
        .replace(/\s+/g, " ")
        .trim();
      return text.length > max ? text.slice(0, max - 1) + "…" : text;
    }

    function timeAgo(dateStr) {
      try {
        const d = new Date(dateStr);
        const diffSec = Math.floor((Date.now() - d.getTime()) / 1000);

        const rtf = new Intl.RelativeTimeFormat("ur", { numeric: "auto" });
        const units = [
          ["year", 31536000],
          ["month", 2592000],
          ["week", 604800],
          ["day", 86400],
          ["hour", 3600],
          ["minute", 60],
          ["second", 1],
        ];
        for (const [unit, sec] of units) {
          const val = Math.floor(diffSec / sec);
          if (val >= 1) return rtf.format(-val, unit);
        }
        return rtf.format(0, "second");
      } catch {
        return "";
      }
    }

    function numLabel(n) {
      return Number(n || 0).toLocaleString("ur-IN");
    }

    // ---------- Rendering ----------
    // /latest returns array: [{ id, Title, slug, detailquestion, created_at, Likes, Views }, ...]
    function renderCard(row) {
      const id = row.id;
      const title = escapeText(row.Title || "بلا عنوان");
      const desc = escapeText(stripHtmlToOneLine(row.detailquestion || ""));
      const views = `${numLabel(row.Views)} مشاہدات`;
      // const likes = `${numLabel(row.Likes)} پسند`;
      const when = timeAgo(row.created_at);

      return `
        <article
          class="group bg-white rounded-2xl border border-ash_gray/40 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 p-5"
          role="button"
          tabindex="0"
          onclick="location.href='${fatwaDetailUrl(id)}'"
          onkeydown="if(event.key==='Enter'){ location.href='${fatwaDetailUrl(id)}'}"
          aria-label="${title}"
        >
          <h3 class="text-xl font-bold text-rich_black mb-2 leading-snug group-hover:text-midnight_green">
            ${title}
          </h3>
          <p class="text-air_force_blue/90 mb-5">${desc}</p>
          <div class="flex items-center justify-between text-sm text-air_force_blue">
            <span class="inline-flex items-center gap-2">
              <i class="bi bi-eye"></i>${views}
            </span>
           
          </div>
          <div class="mt-3 text-xs text-air_force_blue/80 flex items-center gap-2">
            <i class="bi bi-clock-history"></i>${escapeText(when)}
          </div>
        </article>
      `;
    }

    function show(el) { el.classList.remove("hidden"); }
    function hide(el) { el.classList.add("hidden"); }

    // ---------- Fetch + Init ----------
    async function loadLatestFatwa() {
      const list = document.getElementById("latest-list");
      const skeleton = document.getElementById("latest-skeleton");
      const emptyMsg = document.getElementById("latest-empty");

      show(skeleton); hide(list); hide(emptyMsg);

      try {
        const res = await fetch(ENDPOINT, { credentials: "include" });
        if (!res.ok) throw new Error("HTTP " + res.status);
        const rows = await res.json(); // controller sends array

        if (!Array.isArray(rows) || rows.length === 0) {
          hide(skeleton); show(emptyMsg); return;
        }

        list.innerHTML = rows.map(renderCard).join("");
        hide(skeleton); show(list);
      } catch (err) {
        console.error("latest-fatawa fetch error:", err);
        hide(skeleton);
        emptyMsg.textContent = "کچھ مسئلہ ہوا۔ براہِ کرم بعد میں دوبارہ کوشش کریں۔";
        show(emptyMsg);
      }
    }

    document.addEventListener("DOMContentLoaded", loadLatestFatwa);
  })();