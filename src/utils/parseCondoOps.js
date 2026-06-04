const URL_CONDO_OPS = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vQS1zkSYJ3E9477mX_4u9Qyxax5mDhnAaXGmIlMTUMmJgvTPL23C8j3vG4I4sUBMowU4gnddiypKk91/pub?gid=0&single=true&output=csv';

function cleanMoney(v) {
  if (!v) return 0;
  const n = parseFloat(String(v).replace(/[$,\s]/g, ''));
  return isNaN(n) ? 0 : n;
}

function parseDate(str) {
  if (!str) return null;
  const parts = str.trim().split('/');
  if (parts.length === 3) {
    const [d, m, y] = parts;
    const dt = new Date(parseInt(y), parseInt(m) - 1, parseInt(d));
    return isNaN(dt.getTime()) ? null : dt;
  }
  return null;
}

function toDs(d) {
  if (!d) return '';
  return d.getFullYear() + '-' + String(d.getMonth()+1).padStart(2,'0') + '-' + String(d.getDate()).padStart(2,'0');
}

export async function fetchCondoOpsData() {
  const Papa = (await import('papaparse')).default;
  return new Promise((resolve, reject) => {
    Papa.parse(URL_CONDO_OPS, {
      download: true,
      header: true,
      skipEmptyLines: true,
      complete: ({ data }) => {
        const rows = data.map(row => {
          const date = parseDate(row['Date']);
          if (!date) return null;
          const revenuReel  = cleanMoney(row['Revenu Reel']);
          const revenuPrevu = cleanMoney(row['Revenu prévu']);
          if (revenuReel === 0 && revenuPrevu === 0) return null;
          const gestionnaire = (row['Nom de gestionnaire'] || '').trim();
          const tech1 = (row['Technicien 1'] || '').trim();
          const tech2 = (row['Technicien 2 '] || row['Technicien 2'] || '').trim();
          const nbHTech = parseFloat(String(row['Nb H Réel'] || '0').replace(/[$,\s]/g, '')) || 0;
          return { dateStr: toDs(date), date, gestionnaire, tech1, tech2, revenuReel, revenuPrevu, nbHTech };
        }).filter(Boolean);
        resolve(rows);
      },
      error: reject,
    });
  });
}

export function computeCondoOpsKpis(rows, hoursMap, dateFrom, dateTo) {
  const filtered = rows.filter(r => {
    if (dateFrom && r.dateStr < dateFrom) return false;
    if (dateTo   && r.dateStr > dateTo)   return false;
    return true;
  });

  const totalRevenuReel  = filtered.reduce((s, r) => s + r.revenuReel, 0);
  const totalRevenuPrevu = filtered.reduce((s, r) => s + r.revenuPrevu, 0);

  const seenKeys = new Set();
  let totalHeuresDept = 0;
  filtered.forEach(r => {
    const key = r.dateStr + '_' + r.gestionnaire;
    if (!seenKeys.has(key)) {
      seenKeys.add(key);
      const h = hoursMap[key];
      if (h != null) totalHeuresDept += h;
    }
  });
  const dphDept = totalHeuresDept > 0 ? totalRevenuReel / totalHeuresDept : null;

  const techMap = {};
  filtered.forEach(r => {
    const techs = [r.tech1, r.tech2].filter(Boolean);
    techs.forEach(tech => {
      if (!techMap[tech]) techMap[tech] = { revenu: 0, heures: 0 };
      techMap[tech].revenu += r.revenuReel / techs.length;
      techMap[tech].heures += r.nbHTech;
    });
  });
  const byTech = Object.entries(techMap)
    .map(([nom, v]) => ({ nom, revenu: v.revenu, heures: v.heures, dph: v.heures > 0 ? v.revenu / v.heures : null }))
    .sort((a, b) => (b.dph || 0) - (a.dph || 0));

  return { totalRevenuReel, totalRevenuPrevu, dphDept, totalHeuresDept, byTech };
}