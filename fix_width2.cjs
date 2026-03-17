const fs = require('fs');
let c = fs.readFileSync('src/App.jsx', 'utf8');
c = c.replace("padding: '20px 24px', maxWidth: '100%'", "padding: '20px 24px'");
fs.writeFileSync('src/App.jsx', c, 'utf8');

// Fix index.html or index.css - check if there's a max-width somewhere
const idx = fs.readFileSync('index.html', 'utf8');
console.log('index.html:', idx.substring(0, 300));
