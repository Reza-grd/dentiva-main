// Dijalankan sebelum React agar tidak ada kedipan tema (dipisah dari index.html
// supaya CSP cukup script-src 'self' tanpa 'unsafe-inline').
(function () {
  try {
    var t = localStorage.getItem("dentiva-console-theme");
    if (t === "dark" || (!t && window.matchMedia("(prefers-color-scheme: dark)").matches)) {
      document.documentElement.classList.add("dark");
    }
  } catch (e) {
    /* abaikan */
  }
})();
