const fs = require('fs');
let c = fs.readFileSync('src/App.jsx', 'utf8');
c = c.replace(
  'function getHeuresFromMap(gestionnaire, dateKey) {\n    const key = dateKey + \'_\' + gestionnaire;\n    return hoursMap[key] ?? null;\n  }',
  'function getHeuresFromMap(gestionnaire, dateKey) {\n    const key = dateKey + \'_\' + gestionnaire;\n    return hoursMap[key] ?? null;\n  }'
);
fs.writeFileSync('src/App.jsx', c, 'utf8');
console.log('done');
