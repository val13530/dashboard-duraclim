const fs = require('fs');
let c = fs.readFileSync('src/utils/parseData.js', 'utf8');
const inject = `
        // DEBUG HAJAR
        const hajarRows = rows.filter(r => r.gestionnaire === 'Hajar' && r.date && r.date.toISOString().includes('2026-03-09'));
        console.log('Hajar 09/03 rows:', hajarRows.length);
        hajarRows.forEach(r => console.log('  rdv:', r.rdvReel, 'pts:', r.pts, 'service:', r.serviceReel.substring(0,40)));
`;
c = c.replace('resolve(rows);', inject + 'resolve(rows);');
fs.writeFileSync('src/utils/parseData.js', c, 'utf8');
console.log('done');
