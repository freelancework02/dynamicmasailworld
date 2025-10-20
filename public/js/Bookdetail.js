// ✅ Loader utilities
function showLoader() {
  const loader = document.getElementById("loader");
  if (loader) loader.style.display = "flex";
}
function hideLoader() {
  const loader = document.getElementById("loader");
  if (loader) loader.style.display = "none";
} 
 
 
 async function loadBookDetail() {
      const params = new URLSearchParams(window.location.search);
      const id = params.get("id");
      if (!id) {
        document.getElementById("book-detail").innerHTML = "<p class='text-red-600'>کتاب کا ID فراہم نہیں کیا گیا۔</p>";
        return;
      }

      showLoader();

      try {
        // Fetch book details
        const res = await fetch(`https://api.masailworld.com/api/book/${id}`);
        if (!res.ok) throw new Error("Book not found");
        const book = await res.json();

        const coverUrl = `https://api.masailworld.com/api/book/${id}/cover`;
        const pdfUrl = `https://api.masailworld.com/api/book/${id}/pdf`;

        document.getElementById("book-detail").innerHTML = `
          <div class="flex flex-col md:flex-row items-center md:items-start gap-8 mb-8">
              <img src="${coverUrl}" alt="${book.BookName}" class="w-full md:w-1/3 object-cover rounded-xl shadow-md">
              <div class="md:w-2/3 text-center md:text-right">
                  <h1 class="text-4xl md:text-5xl font-bold text-rich_black mb-2">${book.BookName}</h1>
                  <p class="text-air_force_blue font-semibold text-xl mb-4">از: ${book.BookWriter || "نامعلوم"}</p>
                  <div class="flex flex-wrap justify-center md:justify-end gap-4">
                      <a href="${pdfUrl}" target="_blank" class="bg-midnight_green text-white py-3 px-8 rounded-full hover:bg-midnight_green-400 transition font-semibold text-xl shadow-md">آن لائن پڑھیں</a>
                      <a href="${pdfUrl}" download class="bg-air_force_blue text-white py-3 px-8 rounded-full hover:bg-air_force_blue-400 transition font-semibold text-xl shadow-md"><i class="bi bi-download ml-2"></i> ڈاؤن لوڈ</a>
                  </div>
              </div>
          </div>
          <hr class="my-8 border-t-2 border-ash_gray/50">
          <div>
              <h2 class="text-3xl font-bold text-midnight_green mb-4">کتاب کا تعارف</h2>
              <p class="text-rich_black-600 text-lg md:text-xl leading-relaxed">${book.BookDescription || "تفصیل موجود نہیں۔"}</p>
          </div>
        `;
      } catch (err) {
        console.error(err);
        document.getElementById("book-detail").innerHTML = "<p class='text-red-600'>کتاب کی تفصیل حاصل نہیں ہو سکی۔</p>";
      }
      finally{
        hideLoader();
      }
   }

   loadBookDetail();