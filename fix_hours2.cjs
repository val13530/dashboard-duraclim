const fs = require('fs');
let c = fs.readFileSync('src/utils/parseHours.js', 'utf8');
c = c.replace(
  `function isValidGestionnaire(raw) {
  if (!raw || String(raw).trim() === '') return false;
  const sl = String(raw).trim().toLowerCase();
  // Ignore notes like 'chagmt tech', 'chgt', etc.
  if (sl.length < 3) return false;
  if (/chag|chgt|change|note|tech$/.test(sl)) return false;
  return true;
}`,
  `function isValidGestionnaire(raw) {
  if (!raw || String(raw).trim() === '') return false;
  const sl = String(raw).trim().toLowerCase();
  if (sl.length < 2) return false;
  if (/chag|chgt/.test(sl)) return false;
  return true;
}`
);
fs.writeFileSync('src/utils/parseHours.js', c, 'utf8');
console.log('done');
