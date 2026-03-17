const fs = require('fs');
let c = fs.readFileSync('src/Login.jsx', 'utf8');
c = c.replaceAll(
  "border: '1.5px solid #D1D5DB', borderRadius: 7, padding: '10px 12px', fontSize: 14, outline: 'none', boxSizing: 'border-box', color: '#1A2B4A' }}",
  "border: '1.5px solid #D1D5DB', borderRadius: 7, padding: '10px 12px', fontSize: 14, outline: 'none', boxSizing: 'border-box', color: '#1A2B4A', background: '#F9FAFB' }}"
);
fs.writeFileSync('src/Login.jsx', c, 'utf8');
console.log('done');
