const fs = require('fs');
let c = fs.readFileSync('index.html', 'utf8');
c = c.replace(
  'body { font-family: Arial, sans-serif; }',
  'body { font-family: Arial, sans-serif; width: 100%; overflow-x: hidden; } #root { width: 100%; }'
);
fs.writeFileSync('index.html', c, 'utf8');
console.log('done');
