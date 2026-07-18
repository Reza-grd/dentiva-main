const fs = require('fs');
const img = fs.readFileSync('public/dentiva-logo.png');
const base64 = img.toString('base64');
const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
  <defs>
    <clipPath id="circleClip">
      <circle cx="50" cy="50" r="50" />
    </clipPath>
  </defs>
  <circle cx="50" cy="50" r="50" fill="#ffffff" />
  <image href="data:image/png;base64,${base64}" x="0" y="0" width="100" height="100" clip-path="url(#circleClip)" preserveAspectRatio="xMidYMid slice" />
</svg>`;
fs.writeFileSync('public/favicon.svg', svg);
