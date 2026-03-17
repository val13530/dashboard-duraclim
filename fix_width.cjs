const fs = require('fs');
let c = fs.readFileSync('src/App.jsx', 'utf8');
c = c.replace('maxWidth: 1400, margin: \'0 auto\'', 'maxWidth: \'100%\'');
fs.writeFileSync('src/App.jsx', c, 'utf8');
console.log('done:', c.includes("maxWidth: '100%'"));
