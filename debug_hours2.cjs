const fs = require('fs');
let c = fs.readFileSync('src/utils/parseHours.js', 'utf8');
c = c.replace(
  'data.forEach(row => {',
  `console.log('First row keys:', Object.keys(data[0] || {}));
        console.log('First row values:', Object.values(data[0] || {}));
        console.log('Total rows:', data.length);
        data.forEach(row => {`
);
fs.writeFileSync('src/utils/parseHours.js', c, 'utf8');
console.log('done');
