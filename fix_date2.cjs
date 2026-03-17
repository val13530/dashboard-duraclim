const fs = require('fs');
let c = fs.readFileSync('src/utils/parseData.js', 'utf8');
c = c.replace(
  "return new Date(`${y}-${m.padStart(2,'0')}-${d.padStart(2,'0')}`);",
  "return new Date(`${y}-${m.padStart(2,'0')}-${d.padStart(2,'0')}T12:00:00`);"
);
fs.writeFileSync('src/utils/parseData.js', c, 'utf8');
console.log('done:', c.includes('T12:00:00'));
