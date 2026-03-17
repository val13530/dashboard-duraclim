const fs = require('fs');
let c = fs.readFileSync('src/utils/parseHours.js', 'utf8');
c = c.replace(
  'resolve(map);',
  `console.log('HoursMap sample:', Object.entries(map).slice(0,5));
        console.log('Total keys:', Object.keys(map).length);
        resolve(map);`
);
fs.writeFileSync('src/utils/parseHours.js', c, 'utf8');
console.log('done');
