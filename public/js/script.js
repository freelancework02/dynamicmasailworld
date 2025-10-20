



// document.addEventListener("DOMContentLoaded", async () => {
//   try {
//     const res = await fetch("http://localhost:5000/api/fatwa/latest");
//     const fatawa = await res.json();
//     console.log("The Api Response is ", fatawa);

//     const ticker = document.getElementById("latest-fatawa-ticker");
//     ticker.innerHTML = ""; // clear placeholder

//     // Ensure fatawa is always an array
//     const fatawaList = Array.isArray(fatawa) ? fatawa : [fatawa];

//     fatawaList.forEach(fatwa => {
//       const item = document.createElement("div");
//       item.classList.add(
//         "ticker-item",
//         "px-4",
//         "py-2",
//         "text-midnight_green",
//         "font-medium"
//       );

//       // Use slug if available, otherwise fallback to ID
//       const link = fatwa.slug ? `/fatwa/${fatwa.slug}` : `/fatwa/${fatwa.id}`;

//       item.innerHTML = `
//         <a href="${link}" class="hover:underline">
//           ${fatwa.Title}
//         </a>
//       `;

//       ticker.appendChild(item);
//     });
//   } catch (err) {
//     console.error("❌ Error loading latest fatawa:", err);
//   }
// });

//Latest fatawa

async function loadLatestFatawa() {
    try {
        const response = await fetch("https://api.masailworld.com/api/fatwa/latest");
        const fatawa = await response.json();

        // صرف 3 فتاویٰ لیں
        const latestFatawa = fatawa.slice(0, 3);

        const fatawaList = document.getElementById("latest-fatawa-list");
        fatawaList.innerHTML = "";

        latestFatawa.forEach(fatwa => {
            const fatwaItem = document.createElement("div");
            fatwaItem.className = "bg-white p-6 rounded-2xl shadow-lg border border-ash_gray hover:shadow-xl transition transform hover:-translate-y-1";
            fatwaItem.innerHTML = `
                <h3 class="text-xl md:text-2xl font-bold text-midnight_green mb-3">${fatwa.title}</h3>
                <p class="text-rich_black-600 text-base md:text-lg mb-4 leading-relaxed line-clamp-3">${fatwa.summary || ""}</p>
                <a href="#fatwa-detail" class="nav-link text-midnight_green-600 hover:text-midnight_green font-bold text-lg hover:underline transition">مکمل جواب پڑھیں &larr;</a>
            `;
            fatawaList.appendChild(fatwaItem);
        });
    } catch (error) {
        console.error("Error fetching latest fatawa:", error);
        document.getElementById("latest-fatawa-list").innerHTML =
            `<p class="text-center text-air_force_blue">فی الحال کوئی فتاویٰ دستیاب نہیں ہیں۔</p>`;
    }
}

// صفحہ لوڈ ہوتے ہی چلائیں
document.addEventListener("DOMContentLoaded", loadLatestFatawa);





//category fatawa

async function loadFatawa() {
    try {
        const response = await fetch("https://api.masailworld.com/api/fatwa/latest");
        const fatawa = await response.json();
        console.log("the loadfatawa", fatawa);

        // ✅ تازہ ترین فتاویٰ (Home Page)
        const latestFatawaList = document.getElementById("latest-fatawa-list");
        if (latestFatawaList) {
            latestFatawaList.innerHTML = "";
            fatawa.slice(0, 3).forEach(fatwa => {
                const item = document.createElement("div");
                item.className =
                    "bg-white p-6 rounded-2xl shadow-lg border border-ash_gray hover:shadow-xl transition transform hover:-translate-y-1";
                item.innerHTML = `
                    <h3 class="text-xl md:text-2xl font-bold text-midnight_green mb-3">${fatwa.Title}</h3>
                    <p class="text-rich_black-600 text-base md:text-lg mb-4 leading-relaxed line-clamp-3">
                        ${fatwa.detailquestion ? fatwa.detailquestion.substring(0, 150) + "..." : ""}
                    </p>
                    <a href="#fatwa-detail" 
                       class="nav-link text-midnight_green-600 hover:text-midnight_green font-bold text-lg hover:underline transition">
                        مکمل جواب پڑھیں &larr;
                    </a>
                `;
                latestFatawaList.appendChild(item);
            });
        }

        // ✅ موضوعات کے فتاویٰ (Categories Page)
        const categoryFatawaList = document.getElementById("category-fatawa-list");
        if (categoryFatawaList) {
            categoryFatawaList.innerHTML = "";
            fatawa.forEach((fatwa, index) => {
                const item = document.createElement("a");
                item.href = "#fatwa-detail";
                item.className =
                    "nav-link block bg-white p-6 md:p-8 rounded-2xl shadow-lg border border-ash_gray hover:shadow-2xl hover:border-midnight_green-200 transition-all duration-300 transform hover:-translate-y-1";
                item.innerHTML = `
                    <div class="flex items-start">
                        <div class="flex-shrink-0 flex items-center justify-center w-14 h-14 bg-midnight_green text-white font-bold text-3xl rounded-xl ml-4 shadow-md">${index + 1}</div>
                        <div class="flex-grow">
                            <h3 class="text-xl sm:text-2xl font-semibold text-rich_black leading-normal">${fatwa.Title}</h3>
                            <p class="text-rich_black-600 text-base md:text-lg mt-2 mb-3 leading-relaxed line-clamp-3">
                                ${fatwa.detailquestion ? fatwa.detailquestion.substring(0, 200) + "..." : ""}
                            </p>
                            <div class="flex justify-between items-center mt-4">
                                <span class="text-midnight_green-600 font-bold text-md md:text-lg hover:underline transition">
                                    مکمل جواب پڑھیں &larr;
                                </span>
                                <div class="flex items-center space-x-4 space-x-reverse text-air_force_blue">
                                    <div class="flex items-center">
                                        <i class="bi bi-eye-fill ml-1"></i>
                                        <span class="font-sans">${fatwa.Views || 0}</span>
                                    </div>
                                    <span class="hover:text-midnight_green transition-colors"><i class="bi bi-share-fill"></i></span>
                                </div>
                            </div>
                        </div>
                    </div>
                `;
                categoryFatawaList.appendChild(item);
            });
        }
    } catch (error) {
        console.error("Error fetching fatawa:", error);
        if (document.getElementById("latest-fatawa-list")) {
            document.getElementById("latest-fatawa-list").innerHTML =
                `<p class="text-center text-air_force_blue">فی الحال کوئی فتاویٰ دستیاب نہیں ہیں۔</p>`;
        }
        if (document.getElementById("category-fatawa-list")) {
            document.getElementById("category-fatawa-list").innerHTML =
                `<p class="text-center text-air_force_blue">فی الحال کوئی فتاویٰ دستیاب نہیں ہیں۔</p>`;
        }
    }
}

// صفحہ لوڈ ہوتے ہی چلائیں
document.addEventListener("DOMContentLoaded", loadFatawa);





//Other Latest
// document.addEventListener("DOMContentLoaded", async () => {
//   try {
//     const res = await fetch("https://masailworld.onrender.com/api/fatwa/latest");
//     const fatawa = await res.json();
//     console.log("Latest fatawa response:", fatawa);

//     const list = document.getElementById("latest-fatawa-list");
//     list.innerHTML = ""; // clear placeholder

//     // Always make fatawa an array
//     const fatawaList = Array.isArray(fatawa) ? fatawa : [fatawa];

//     fatawaList.forEach((fatwa, index) => {
//       const fatwaCard = document.createElement("div");
//       fatwaCard.classList.add(
//         "bg-white",
//         "p-6",
//         "rounded-xl",
//         "shadow-lg",
//         "border",
//         "border-ash_gray/50",
//         "hover:shadow-xl",
//         "transition"
//       );

//       // Use slug if available, else ID
//  const link = fatwa.id ? `./Pages/fatwa-detail.html/${fatwa.id}` : `./Pages/fatwa-detail.html/${fatwa.id}`;

//       // Fallbacks if views or details not in DB yet
//       const views = fatwa.Views || 0;
//       const details = fatwa.detailquestion
//         ? fatwa.detailquestion.slice(0, 180) + "..."
//         : "";

//       fatwaCard.innerHTML = `
//         <div class="flex items-start">
//           <div class="flex-shrink-0 flex items-center justify-center w-14 h-14 bg-midnight_green text-white font-bold text-3xl rounded-xl ml-4 shadow-md">
//             ${index + 1}
//           </div>
//           <div class="flex-grow">
//             <h3 class="text-xl sm:text-2xl font-semibold text-rich_black leading-normal">
//               <a href="./Pages/fatwa-detail.html?id=${fatwa.id}" class="hover:underline">${fatwa.Title}</a>
//             </h3>
//             <p class="text-rich_black-600 text-base md:text-lg mt-2 mb-3 leading-relaxed line-clamp-3">
//               ${details}
//             </p>
//             <div class="flex justify-between items-center mt-4">
//               <a href="./Pages/fatwa-detail.html?id=${fatwa.id}" class="text-midnight_green-600 font-bold text-md md:text-lg hover:underline transition">
//                 مکمل جواب پڑھیں &larr;
//               </a>
//               <div class="flex items-center space-x-4 space-x-reverse text-air_force_blue">
//                 <div class="flex items-center">
//                   <i class="bi bi-eye-fill ml-1"></i>
//                   <span class="font-sans">${views}</span>
//                 </div>
//                 <span class="hover:text-midnight_green transition-colors cursor-pointer">
//                   <i class="bi bi-share-fill"></i>
//                 </span>
//               </div>
//             </div>
//           </div>
//         </div>
//       `;

//       list.appendChild(fatwaCard);
//     });
//   } catch (err) {
//     console.error("❌ Error loading latest fatawa:", err);
//   }
// });


document.addEventListener("DOMContentLoaded", async () => {
  try {
    const res = await fetch("https://api.masailworld.com/api/fatwa/latest");
    const fatawa = await res.json();
    console.log("Latest fatawa response:", fatawa);

    const list = document.getElementById("latest-fatawa-list");
    list.innerHTML = ""; // clear placeholder

    // Always make fatawa an array
    const fatawaList = Array.isArray(fatawa) ? fatawa : [fatawa];

    fatawaList.forEach((fatwa, index) => {
      const fatwaCard = document.createElement("div");
      fatwaCard.classList.add(
        "bg-white",
        "p-6",
        "rounded-xl",
        "shadow-lg",
        "border",
        "border-ash_gray/50",
        "hover:shadow-xl",
        "transition"
      );

      // Fallbacks if views or details not in DB yet
      const views = fatwa.Views || 0;
      const details = fatwa.detailquestion
        ? fatwa.detailquestion.slice(0, 180) + "..."
        : "";

      fatwaCard.innerHTML = `
        <div class="flex items-start">
          <div class="flex-shrink-0 flex items-center justify-center w-14 h-14 bg-midnight_green text-white font-bold text-3xl rounded-xl ml-4 shadow-md">
            ${index + 1}
          </div>
          <div class="flex-grow">
            <h3 class="text-xl sm:text-2xl font-semibold text-rich_black leading-normal">
              <a href="./Pages/fatwa-detail.html?id=${fatwa.id}" class="hover:underline">${fatwa.Title}</a>
            </h3>
            <p class="text-rich_black-600 text-base md:text-lg mt-2 mb-3 leading-relaxed line-clamp-3">
              ${details}
            </p>
            <div class="flex justify-between items-center mt-4">
              <a href="./Pages/fatwa-detail.html?id=${fatwa.id}" class="text-midnight_green-600 font-bold text-md md:text-lg hover:underline transition">
                مکمل جواب پڑھیں &larr;
              </a>
              <div class="flex items-center space-x-4 space-x-reverse text-air_force_blue">
                <div class="flex items-center">
                  <i class="bi bi-eye-fill ml-1"></i>
                  <span class="font-sans">${views}</span>
                </div>
                <span class="hover:text-midnight_green transition-colors cursor-pointer">
                  <i class="bi bi-share-fill"></i>
                </span>
              </div>
            </div>
          </div>
        </div>
      `;

      list.appendChild(fatwaCard);
    });

    // 🚫 Stop editing in all Quill editors
    document.querySelectorAll(".ql-editor").forEach(el => {
      el.setAttribute("contenteditable", "false");
    });

  } catch (err) {
    console.error("❌ Error loading latest fatawa:", err);
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
  const base = 'https://api.masailworld.com/api/fatwa';
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
    window.location.href = `./Pages/fatwa-detail.html?id=${encodeURIComponent(id)}`;
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


