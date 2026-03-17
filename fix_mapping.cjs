const fs = require('fs');
let c = fs.readFileSync('src/utils/serviceMapping.js', 'utf8');
c = c.replace(
  "else if ((hasMural || hasCentrale) && hasSech) { base = 1.00; }\n  else if (hasMural && hasCentrale) { base = 1.00; }",
  "else if ((hasMural || hasCentrale) && hasSech) { base = 1.00; }\n  else if (hasEch && hasSech) { base = 1.00; }\n  else if (hasMural && hasCentrale) { base = 1.00; }"
);
fs.writeFileSync('src/utils/serviceMapping.js', c, 'utf8');
console.log('done');
console.log('Has Ech+Sech:', c.includes('hasEch && hasSech'));
