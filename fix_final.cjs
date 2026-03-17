const fs = require('fs');
let c = fs.readFileSync('src/App.jsx', 'utf8');
const i = c.indexOf('dateFrom && r.date');
console.log('Filter:', JSON.stringify(c.slice(i, i+200)));
