const fs = require('fs');
let c = fs.readFileSync('src/utils/parseData.js', 'utf8');
console.log('Avant:', c.match(/return new Date.*/g));
c = c.replace(/return new Date\(`\$\{parts\[2\]\}-\$\{parts\[1\]\.padStart\(2,'0'\)\}-\$\{parts\[0\]\.padStart\(2,'0'\)\}`\)/, 
  "return new Date(`${parts[2]}-${parts[1].padStart(2,'0')}-${parts[0].padStart(2,'0')}T12:00:00`)");
console.log('Apres:', c.match(/return new Date.*/g));
fs.writeFileSync('src/utils/parseData.js', c, 'utf8');
