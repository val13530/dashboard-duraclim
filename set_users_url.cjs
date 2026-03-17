const fs = require('fs');
let c = fs.readFileSync('src/App.jsx', 'utf8');
c = c.replace('__USERS_SHEET_URL__', 'https://docs.google.com/spreadsheets/d/e/2PACX-1vRvag9O6Q0d4HdsP4T8ahsusDSVdKNTo2U15BSr60n8N0PYkkZUDRVO_ZJQDEGUJocb972BU3ti5qQY/pub?gid=0&single=true&output=csv');
fs.writeFileSync('src/App.jsx', c, 'utf8');
console.log('done:', c.includes('PACX-1vRvag9'));
