const fs = require('fs');
let c = fs.readFileSync('src/App.jsx', 'utf8');
const i = c.indexOf('background: \'#1A2B4A\'');
console.log('Header style:', JSON.stringify(c.slice(i, i+150)));
