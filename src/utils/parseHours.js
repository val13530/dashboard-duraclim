import Papa from 'papaparse';

const HOURS_SHEET_URL =
  'https://docs.google.com/spreadsheets/d/e/2PACX-1vQS1zkSYJ3E9477mX_4u9Qyxax5mDhnAaXGmIlMTUMmJgvTPL23C8j3vG4I4sUBMowU4gnddiypKk91/pub?gid=411069068&single=true&output=csv';

function parseDate(raw) {
  if (!raw) return null;
  const str = String(raw).trim();
  const parts = str.split('/');
  if (parts.length === 3) {
    const [d, m, y] = parts;
    return new Date(`${y}-${m.padStart(2,'0')}-${d.padStart(2,'0')}T12:00:00`);
  }
  return null;
}

function dateStr(d) {
  if (!d) return '';
  return d.getFullYear() + '-' +
    String(d.getMonth() + 1).padStart(2, '0') + '-' +
    String(d.getDate()).padStart(2, '0');
}

function cleanNum(val) {
  if (!val) return 0;
  return parseFloat(String(val).replace(/,/g, '.').trim()) || 0;
}

export async function fetchHoursMap() {
  return new Promise((resolve, reject) => {
    Papa.parse(HOURS_SHEET_URL, {
      download: true,
      header: true,
      skipEmptyLines: true,
      complete: ({ data }) => {
        const map = {};
        let counted = 0;

        data.forEach(row => {
          // Find date
          const date = parseDate(row['Date']);
          if (!date) return;

          // Find gestionnaire - search all keys containing 'Gestionnaire'
          const gestKey = Object.keys(row).find(k => k.includes('Gestionnaire'));
          const gestRaw = gestKey ? String(row[gestKey]).trim() : '';

          // Skip empty or invalid
          if (!gestRaw || gestRaw.length < 2) return;
          if (/chag|chgt/i.test(gestRaw)) return;

          // Find heures - search all keys containing 'heure'
          const heuresKey = Object.keys(row).find(k => k.toLowerCase().includes("nombre") && k.toLowerCase().includes("heure"));
          const heures = heuresKey ? cleanNum(row[heuresKey]) : 0;
          if (heures <= 0) return;

          const key = dateStr(date) + '_' + gestRaw;
          if (!map[key]) map[key] = 0;
          map[key] += heures;
          counted++;
        });

        console.log('HoursMap: counted entries =', counted, '| unique keys =', Object.keys(map).length);
        console.log('Sample keys:', Object.keys(map).slice(0, 5));
        resolve(map);
      },
      error: reject,
    });
  });
}

export async function fetchHoursByTech() {
  return new Promise((resolve, reject) => {
    const url = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vQS1zkSYJ3E9477mX_4u9Qyxax5mDhnAaXGmIlMTUMmJgvTPL23C8j3vG4I4sUBMowU4gnddiypKk91/pub?gid=411069068&single=true&output=csv';
    Papa.parse(url, {
      download: true, header: true, skipEmptyLines: true,
      complete: ({ data }) => {
        const map = {};
        data.forEach(row => {
          const date = parseDate(Object.keys(row).find(k => k.toLowerCase().includes('date')) ? row[Object.keys(row).find(k => k.toLowerCase().includes('date'))] : '');
          if (!date) return;
          const techKey = Object.keys(row).find(k => k.toLowerCase().includes('technicien') || k.toLowerCase().includes('nom du tech'));
          const tech = techKey ? String(row[techKey] || '').trim() : '';
          if (!tech || tech.length < 2) return;
          const heuresKey = Object.keys(row).find(k => k.toLowerCase().includes('nombre') && k.toLowerCase().includes('heure'));
          const heures = heuresKey ? cleanNum(row[heuresKey]) : 0;
          if (heures <= 0) return;
          const key = dateStr(date) + '_' + tech;
          if (!map[key]) map[key] = 0;
          map[key] = Math.max(map[key], heures);
        });
        resolve(map);
      },
      error: reject,
    });
  });
}
