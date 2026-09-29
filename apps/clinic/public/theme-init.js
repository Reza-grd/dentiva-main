// Anti-FOUC theme initializer — dijalankan sebelum React.
// Dipisah dari index.html agar CSP cukup script-src 'self' (tanpa 'unsafe-inline').
// KEEP IN SYNC WITH src/config/themePalettes.js
(function () {
  var PALETTES = {
    royalAurora:   { accent: '#E94560', accentSecondary: '#3E2F5B', darkBase: '#211433' },
    navyMirage:    { accent: '#3F5E96', accentSecondary: '#141E30', darkBase: '#0E1524' },
    obsidianPlum:  { accent: '#4E2A4F', accentSecondary: '#2D1E2F', darkBase: '#1C121D' },
    midnightGold:  { accent: '#B3945B', accentSecondary: '#1A1A1A', darkBase: '#141414' },
    emeraldChrome: { accent: '#004B8E', accentSecondary: '#010528', darkBase: '#01031C' },
  };
  var id = localStorage.getItem('colorTheme') || 'navyMirage';
  var p = PALETTES[id] || PALETTES.navyMirage;
  var root = document.documentElement;
  root.style.setProperty('--color-accent', p.accent);
  root.style.setProperty('--color-accent-secondary', p.accentSecondary);
  root.style.setProperty('--color-dark-base', p.darkBase);
  // Terang/gelap per akun (KEEP IN SYNC: src/contexts/ThemeContext.jsx).
  // Belum login / belum pernah memilih → terang.
  try {
    var uid = null;
    for (var i = 0; i < localStorage.length; i++) {
      var k = localStorage.key(i);
      if (k && k.indexOf('sb-') === 0 && k.slice(-11) === '-auth-token') {
        var s = JSON.parse(localStorage.getItem(k) || 'null');
        uid = s && s.user && s.user.id;
        break;
      }
    }
    if (uid && localStorage.getItem('theme:' + uid) === 'dark') {
      root.classList.add('dark');
    }
  } catch (e) {
    /* storage tidak tersedia → terang */
  }
})();
