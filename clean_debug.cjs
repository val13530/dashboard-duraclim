const fs = require('fs');
let c = fs.readFileSync('src/utils/parseData.js', 'utf8');
c = c.replace(/\s*\/\/ DEBUG HAJAR[\s\S]*?hajarRows\.forEach[\s\S]*?\}\);\n/, '\n');
fs.writeFileSync('src/utils/parseData.js', c, 'utf8');
console.log('done');
