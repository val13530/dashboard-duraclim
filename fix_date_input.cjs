const fs = require('fs');
let c = fs.readFileSync('src/App.jsx', 'utf8');
c = c.replace(
  "border: '1px solid #D1D5DB', borderRadius: 6, padding: '6px 10px', fontSize: 13, color: '#1A2B4A', background: '#fff', outline: 'none'",
  "border: '1px solid #D1D5DB', borderRadius: 6, padding: '6px 10px', fontSize: 13, color: '#1A2B4A', background: '#fff', outline: 'none', colorScheme: 'light'"
);
fs.writeFileSync('src/App.jsx', c, 'utf8');
console.log('done');
