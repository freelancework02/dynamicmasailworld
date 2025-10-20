"use strict";

/* ----------------------------
   SMOOTH SCROLL (optional)
-----------------------------*/

// ✅ Smooth scroll for same-page anchors (optional)
document.querySelectorAll('a[href^="#"]').forEach(a => {
  a.addEventListener('click', function () {
    // optional smooth behaviour (commented out)
  });
});

/* ----------------------------
   URL / DOM HOOKS
-----------------------------*/

function getQueryParam(param) {
  const urlParams = new URLSearchParams(window.location.search);
  return urlParams.get(param);
}

const articleId = getQueryParam("id"); // ?id=123
const articleContainer = document.querySelector("article#article-root");
const relatedContainer = document.getElementById("related-grid");

/* ----------------------------
   LOADER HELPERS
-----------------------------*/

function showLoader() {
  const loader = document.getElementById("loader");
  if (loader) loader.style.display = "flex";
}
function hideLoader() {
  const loader = document.getElementById("loader");
  if (loader) loader.style.display = "none";
}

/* ----------------------------
   TOAST
-----------------------------*/
function showToast(message) {
  const t = document.createElement('div');
  t.className = 'mw-toast';
  t.dir = 'rtl';
  t.textContent = message;
  document.body.appendChild(t);
  // fade in
  requestAnimationFrame(() => t.style.opacity = '1');
  setTimeout(() => {
    t.style.opacity = '0';
    setTimeout(() => t.remove(), 250);
  }, 1400);
}

/* ----------------------------
   TEXT / CONTENT HELPERS
-----------------------------*/

// ✅ Helper: check if ArticleText is empty
function sanitizeArticleText(text) {
  if (!text) return `<p class="text-gray-500 italic">مضمون کا متن دستیاب نہیں ہے۔</p>`;
  const t = String(text).trim();
  if (t === "" || t === "<p><br></p>") {
    return `<p class="text-gray-500 italic">مضمون کا متن دستیاب نہیں ہے۔</p>`;
  }
  return t;
}

// ✅ Normalize API responses that wrap data
function unwrap(json) {
  if (json && typeof json === "object") {
    if ("data" in json) return json.data;
    if ("result" in json) return json.result;
  }
  return json;
}

/* ----------------------------
   SHARE HELPERS
-----------------------------*/

// Centered popup
function popupCenter(url, title) {
  const w = 640, h = 560;
  const dualScreenLeft = window.screenLeft !== undefined ? window.screenLeft : screen.left;
  const dualScreenTop = window.screenTop !== undefined ? window.screenTop : screen.top;
  const width = window.innerWidth || document.documentElement.clientWidth || screen.width;
  const height = window.innerHeight || document.documentElement.clientHeight || screen.height;
  const left = ((width / 2) - (w / 2)) + dualScreenLeft;
  const top = ((height / 2) - (h / 2)) + dualScreenTop;
  const features = `scrollbars=yes,width=${w},height=${h},top=${top},left=${left}`;
  window.open(url, title, features);
}

// Build share URLs for current URL/title
function buildShareLinks(url, text) {
  const u = encodeURIComponent(url);
  const t = encodeURIComponent(text || document.title || "مسائل ورلڈ");
  return {
    facebook: `https://www.facebook.com/sharer/sharer.php?u=${u}`,
    x: `https://twitter.com/intent/tweet?url=${u}&text=${t}`,
    whatsapp: `https://wa.me/?text=${t}%20${u}`,
    telegram: `https://t.me/share/url?url=${u}&text=${t}`,
    linkedin: `https://www.linkedin.com/sharing/share-offsite/?url=${u}`
  };
}

// Copy current URL to clipboard (used in chooser)
async function copyCurrentUrl() {
  const currentUrl = window.location.href;
  try {
    await navigator.clipboard.writeText(currentUrl);
    alert("🔗 لنک کاپی ہوگیا ہے!");
  } catch (err) {
    console.error("Clipboard copy failed:", err);
    alert("⚠️ لنک کاپی کرنے میں مسئلہ آیا۔");
  }
}

// This is called by the share icon in the article header
async function openShare() {
  const url = window.location.href;
  const title = document.title || "مسائل ورلڈ";
  const text = "اس صفحہ کا لنک ملاحظہ کریں:";

  if (navigator.share) {
    try {
      await navigator.share({ title, text, url });
      return;
    } catch (e) {
      if (e && e.name === "AbortError") return; // user canceled
      // else fall through to fallback
    }
  }

  const links = buildShareLinks(url, title);
  const choice = prompt("شیئر کریں: facebook, x, whatsapp, telegram, linkedin, copy", "facebook");
  if (!choice) return;

  const key = choice.toLowerCase().trim();
  if (key === "copy") return copyCurrentUrl();

  if (links[key]) {
    popupCenter(links[key], "Share");
  } else {
    alert("ناموزوں انتخاب۔ درج ذیل میں سے ایک لکھیں: facebook, x, whatsapp, telegram, linkedin, copy");
  }
}

// Wire header/footer social icons to share the current URL in popups
function wireSocialShareAnchors() {
  const url = window.location.href;
  const links = buildShareLinks(url, document.title);

  const map = {
    "sm-fb-mobile": links.facebook,
    "sm-x-mobile": links.x,
    "sm-fb-desktop": links.facebook,
    "sm-x-desktop": links.x,
    "sm-fb-footer": links.facebook,
    "sm-x-footer": links.x
  };

  Object.keys(map).forEach(id => {
    const a = document.getElementById(id);
    if (!a) return;
    a.setAttribute("href", map[id]);
    a.addEventListener("click", function (e) {
      e.preventDefault();
      popupCenter(map[id], "Share");
    });
  });
}

/* ----------------------------
   API base (auto-select local vs prod)
-----------------------------*/
const API_BASE = (location.hostname === 'localhost' || location.hostname === '127.0.0.1')
  ? 'http://localhost:5000/api/article'
  : 'https://api.masailworld.com/api/article';

/* ----------------------------
   Likes / Views logic
-----------------------------*/

// Set like button UI (red heart when liked)
function setLikeButtonUI(btn, liked) {
  if (!btn) return;
  btn.dataset.liked = liked ? '1' : '0';

  btn.innerHTML = liked
    ? `<i class="bi bi-heart-fill ml-2 text-red-600"></i> پسند ختم کریں`
    : `<i class="bi bi-heart ml-2"></i> پسند کریں`;

  btn.classList.toggle('bg-midnight_green', liked);
  btn.classList.toggle('text-white', liked);
  btn.classList.toggle('bg-air_force_blue-700', !liked);
  btn.classList.toggle('text-rich_black', !liked);
}

// Refresh server state: whether current anon liked this article
// NOTE: use the known id (from URL) — guard against undefined id.
async function refreshMyLikeState(id, btn) {
  if (!id || !btn) return;
  try {
    const res = await fetch(`https://masailworld.onrender.com/api/article/${encodeURIComponent(id)}/like/me`, {
      credentials: 'include'
    });
    if (!res.ok) return;
    const data = await res.json();
    const liked = !!(data && (data.liked || data.liked === true));
    setLikeButtonUI(btn, liked);
  } catch (e) {
    // ignore
  }
}

// toggle like (optimistic)
// NOTE: use the known id (from URL) — guard against undefined id.
async function toggleLike(id, btn, likeCountEl) {
  if (!id || !btn || !likeCountEl) return;
  const currentlyLiked = btn.dataset.liked === '1';
  const method = currentlyLiked ? 'DELETE' : 'POST';

  // optimistic UI
  const nowLiked = method === 'POST';
  // update UI immediately
  setLikeButtonUI(btn, nowLiked);
  const current = parseInt(likeCountEl.textContent || '0', 10) || 0;
  likeCountEl.textContent = nowLiked ? String(current + 1) : String(Math.max(0, current - 1));
  // toast
  showToast(nowLiked ? 'مضمون پسند کیا گیا' : 'پسند ختم کی گئی');

  try {
    const res = await fetch(`https://masailworld.onrender.com/api/article/${encodeURIComponent(id)}/like`, {
      method,
      credentials: 'include'
    });
    // if server returns non-ok, revert
    if (!res.ok) {
      setLikeButtonUI(btn, !nowLiked);
      likeCountEl.textContent = String(nowLiked ? Math.max(0, current) : current);
    }
  } catch (e) {
    // revert on error
    setLikeButtonUI(btn, !nowLiked);
    likeCountEl.textContent = String(nowLiked ? Math.max(0, current) : current);
  }
}

// send view when article visible for ~3s
// NOTE: use the known id (from URL) — guard against undefined id.
function sendViewOnceVisible(id, viewCountEl) {
  if (!id) return;
  const target = document.getElementById('article-root');
  if (!target) return;

  let counted = false, timer = null;

  const fire = async () => {
    if (counted) return;
    counted = true;
    try {
      const res = await fetch(`https://masailworld.onrender.com/api/article/${encodeURIComponent(id)}/view`, {
        method: 'POST',
        credentials: 'include'
      });
      if (res.ok) {
        const data = await res.json().catch(() => ({}));
        if (data && data.counted) {
          // bump display
          if (viewCountEl) {
            const cur = parseInt(viewCountEl.textContent || '0', 10) || 0;
            viewCountEl.textContent = String(cur + 1);
          }
        }
      }
    } catch (e) {
      // ignore
    }
  };

  if (!('IntersectionObserver' in window)) {
    setTimeout(fire, 3000);
    return;
  }

  const io = new IntersectionObserver(entries => {
    entries.forEach(e => {
      if (e.isIntersecting) {
        timer = setTimeout(fire, 3000); // visible for 3s
      } else if (timer) {
        clearTimeout(timer);
      }
    });
  }, { threshold: 0.5 });

  io.observe(target);
}

/* ----------------------------
   DATA FETCH
-----------------------------*/

// ✅ Fetch single article detail
async function fetchArticleDetail(id) {
  if (!articleContainer) return;
  if (!id) {
    articleContainer.innerHTML = `<p class="text-red-600 text-center">مضمون کی شناخت فراہم نہیں کی گئی۔</p>`;
    return;
  }

  showLoader();
  try {
    const res = await fetch(`${API_BASE}/${encodeURIComponent(id)}`, {
      credentials: 'include'
    });
    if (!res.ok) throw new Error("Failed to fetch article");
    const payload = await res.json();
    const article = unwrap(payload);

    if (!article || typeof article !== "object") {
      throw new Error("Bad article payload");
    }

    // Prefer ArticleText for the main content (NOT seo)
    const safeText = sanitizeArticleText(article.ArticleText || article.seo);

    // Optional: update document title
    if (article.Title) {
      document.title = `${article.Title} | مسائل ورلڈ`;
    }

    const createdAtStr = article.createdAt
      ? new Date(article.createdAt).toLocaleDateString("ur-PK", {
          year: "numeric",
          month: "long",
          day: "numeric",
        })
      : "نامعلوم";

    // render header with counts and like button
    // Use the known `id` (from URL) for endpoints (image, like, view)
    articleContainer.innerHTML = `
      <h1 class="text-3xl md:text-5xl font-bold mb-4 text-rich-black leading-tight">${article.Title || "بدون عنوان"}</h1>

      <div class="flex flex-wrap justify-between items-center border-b border-[rgba(174,195,176,0.35)] pb-4 mb-8">
        <div class="flex items-center text-air_force_blue mb-4 md:mb-0">
          <span class="ml-2">تحریر: ${article.writer || "نامعلوم"}</span>
          <span class="mx-2">|</span>
          <span>تاریخ اشاعت: ${createdAtStr}</span>
        </div>

        <div class="flex items-center space-x-4 space-x-reverse text-air_force_blue text-lg">
          <div class="flex items-center">
            <i class="bi bi-eye-fill ml-2"></i>
            <span id="viewCount" class="font-sans">${article.Views ?? 0}</span>
          </div>

          <div class="flex items-center">
            <span id="likeCount" class="font-sans mr-2">${article.Likes ?? 0}</span>
            <button id="likeBtn"
              class="px-3 py-1.5 rounded-full bg-air_force_blue-700 hover:opacity-90 transition flex items-center text-rich_black"
              type="button" aria-pressed="false">
              <i class="bi bi-heart ml-2"></i> پسند کریں
            </button>
          </div>

          <button type="button" onclick="openShare()" class="flex items-center hover:text-midnight_green transition-colors" aria-label="اس صفحہ کو شیئر کریں">
            <i class="bi bi-share-fill"></i>
          </button>
        </div>
      </div>

      <img src="${API_BASE}/${encodeURIComponent(id)}/image"
           alt="${article.Title || "تصویر"}"
           class="w-full h-auto object-cover rounded-xl shadow-md mb-8"
           onerror="this.style.display='none'">

      <div class="text-rich_black-600 text-base md:text-xl space-y-6 leading-relaxed">
        ${safeText}
      </div>
    `;

    // Hook like/view interactions
    const likeBtn = document.getElementById('likeBtn');
    const likeCountEl = document.getElementById('likeCount');
    const viewCountEl = document.getElementById('viewCount');

    if (likeBtn) {
      // initial state from server — pass known id (from URL)
      refreshMyLikeState(id, likeBtn);

      likeBtn.addEventListener('click', () => {
        toggleLike(id, likeBtn, likeCountEl);
      });
    }

    // Count view after being visible for ~3s — pass known id (from URL)
    sendViewOnceVisible(id, viewCountEl);

  } catch (err) {
    console.error(err);
    articleContainer.innerHTML = `<p class="text-red-600 text-center">مضمون لوڈ کرنے میں مسئلہ پیش آیا۔</p>`;
  } finally {
    hideLoader();
  }
}

// ✅ Fetch related articles (robust against wrapped/non-array payloads)
async function fetchRelatedArticles(currentId) {
  if (!relatedContainer) return;
  if (!currentId) return;

  showLoader();
  try {
    const res = await fetch(`${API_BASE}?limit=3&excludeId=${encodeURIComponent(currentId)}`, {
      credentials: 'include'
    });
    if (!res.ok) throw new Error("Failed to fetch related articles");
    const payload = await res.json();
    const unwrapped = unwrap(payload);

    // Support several shapes: array, {rows: []}, single object -> []
    const list = Array.isArray(unwrapped)
      ? unwrapped
      : Array.isArray(unwrapped?.rows)
        ? unwrapped.rows
        : Array.isArray(unwrapped?.data)
          ? unwrapped.data
          : [];

    if (!Array.isArray(list) || list.length === 0) {
      relatedContainer.innerHTML = `<p class="text-gray-600 text-center">مزید مضامین دستیاب نہیں۔</p>`;
      return;
    }

    relatedContainer.innerHTML = list
      .map((a) => {
        const id = a.id ?? a.ID ?? a.articleId;
        const title = a.Title || a.title || "بدون عنوان";
        return `
          <div onclick="window.location.href='article-detail.html?id=${id}'" 
               class="cursor-pointer bg-white rounded-2xl shadow-lg overflow-hidden transform hover:-translate-y-2 transition-transform duration-300 border border-[rgba(174,195,176,0.35)]">
            <img src="${API_BASE}/${encodeURIComponent(id)}/image" alt="${title}" class="w-full h-56 object-cover" onerror="this.style.display='none'">
            <div class="p-6">
              <h3 class="text-xl md:text-2xl font-bold mb-3 text-rich_black">${title}</h3>
              <p class="text-midnight_green-600 font-bold text-lg">مکمل مضمون پڑھیں &larr;</p>
            </div>
          </div>
        `;
      })
      .join("");
  } catch (err) {
    console.error(err);
    relatedContainer.innerHTML = `<p class="text-red-600 text-center">متعلقہ مضامین لوڈ کرنے میں مسئلہ پیش آیا۔</p>`;
  } finally {
    hideLoader();
  }
}

/* ----------------------------
   INIT
-----------------------------*/
document.addEventListener("DOMContentLoaded", () => {
  wireSocialShareAnchors(); // ensure top/footer icons share current URL in popup

  if (!articleContainer) {
    console.warn("No <article#article-root> container found in DOM.");
  }
  if (!relatedContainer) {
    console.warn("No #related-grid container found in DOM for related articles.");
  }

  if (articleId) {
    fetchArticleDetail(articleId);
    fetchRelatedArticles(articleId);
  } else if (articleContainer) {
    articleContainer.innerHTML = `<p class="text-red-600 text-center">مضمون نہیں ملا۔</p>`;
  }
});
