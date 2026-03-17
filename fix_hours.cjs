const fs = require('fs');
let c = fs.readFileSync('src/utils/parseHours.js', 'utf8');
c = c.replace(
  "const gestRaw = String(row['Gestionnaire assigné'] || row['Gestionnaire assigne'] || '').trim();",
  "const keys = Object.keys(row); const gestKey = keys.find(k => k.includes('Gestionnaire')); const gestRaw = String(gestKey ? row[gestKey] : '').trim();"
);
fs.writeFileSync('src/utils/parseHours.js', c, 'utf8');
console.log('done');
