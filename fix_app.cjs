const fs = require('fs');
const path = require('path');

const appPath = path.join(__dirname, 'src', 'App.jsx');
let c = fs.readFileSync(appPath, 'utf8');

// Check if already broken (no 'Nom' found means corruption)
if (!c.includes('Nom de gestionnaire') && !c.includes('gestionnaires = useMemo')) {
  console.log('File seems corrupted - checking parseData instead');
}

// Add dateStr function if not present
if (!c.includes('function dateStr')) {
  c = c.replace(
    "import { useState, useEffect, useMemo } from 'react';",
    "import { useState, useEffect, useMemo } from 'react';\n\nfunction dateStr(d) {\n  if (!d) return '';\n  return d.getFullYear() + '-' +\n    String(d.getMonth() + 1).padStart(2, '0') + '-' +\n    String(d.getDate()).padStart(2, '0');\n}"
  );
}

// Fix date comparisons
c = c.replace(
  /if \(dateFrom && r\.date < new Date\(dateFrom\)\) return false;\s*if \(dateTo && r\.date > new Date\(dateTo \+ 'T23:59:59'\)\) return false;/,
  "if (dateFrom && dateStr(r.date) < dateFrom) return false;\n      if (dateTo && dateStr(r.date) > dateTo) return false;"
);

// Fix date grouping key  
c = c.replace(
  /const key = `\$\{format\(r\.date, 'yyyy-MM-dd'\)\}_\$\{r\.gestionnaire\}`;/,
  "const key = `${dateStr(r.date)}_${r.gestionnaire}`;"
);

fs.writeFileSync(appPath, c, 'utf8');
console.log('Done. Lines:', c.split('\n').length);
console.log('Has dateStr:', c.includes('function dateStr'));
