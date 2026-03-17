import Papa from 'papaparse';
import { scoreService, serviceCategory } from './serviceMapping';

const SHEET_CSV_URL =
  'https://docs.google.com/spreadsheets/d/e/2PACX-1vQS1zkSYJ3E9477mX_4u9Qyxax5mDhnAaXGmIlMTUMmJgvTPL23C8j3vG4I4sUBMowU4gnddiypKk91/pub?gid=0&single=true&output=csv';

function cleanMoney(val) {
  if (!val) return 0;
  const cleaned = String(val).replace(/[$,\s]/g, '').trim();
  if (!cleaned || cleaned === '-') return 0;
  return parseFloat(cleaned) || 0;
}

function cleanNum(val) {
  if (!val) return 0;
  const cleaned = String(val).replace(/,/g, '.').trim();
  if (!cleaned || cleaned === '-') return 0;
  return parseFloat(cleaned) || 0;
}

function parseDate(raw) {
  if (!raw) return null;
  const str = String(raw).trim();
  const parts = str.split('/');
  if (parts.length === 3) {
    const [d, m, y] = parts;
    return new Date(`${y}-${m.padStart(2,'0')}-${d.padStart(2,'0')}T12:00:00`);
  }
  const d = new Date(str);
  return isNaN(d) ? null : d;
}

export async function fetchData() {
  return new Promise((resolve, reject) => {
    Papa.parse(SHEET_CSV_URL, {
      download: true,
      header: true,
      skipEmptyLines: true,
      complete: ({ data }) => {
        const rows = data.map((row) => {
          const date = parseDate(row['Date']);
          const serviceReel = String(row['Service reel'] || '').trim();
          const revenuReel = cleanMoney(row['Revenu Reel']);
          const heuresReel = cleanNum(row['Nb H Réel']);
          const rdvReel = cleanNum(row['Nb RDV Réel']);
          const revenuPrevu = cleanMoney(row['Revenu prévu']);
          const heuresPrevu = cleanNum(row['Nb H Prév']);
          const rdvPrevu = cleanNum(row['Nb RDV Prév']);
          const nbTech = cleanNum(row['Nb Tech']) || 1;
          const gestionnaire = String(row['Nom de gestionnaire'] || '').trim();
          const tech1 = String(row['Technicien 1'] || '').trim();
          const condo = String(row['Nom du condo'] || '').trim();
          const semaine = cleanNum(row['S']);
          const mois = cleanNum(row['Mois']);
          const annee = cleanNum(row['Year']);
          const pts = scoreService(serviceReel) * rdvReel;
          const dphReel = heuresReel > 0 ? revenuReel / heuresReel : 0;
          const ecartRevenu = revenuReel - revenuPrevu;
          const categorie = serviceCategory(serviceReel);

          return {
            date, annee, mois, semaine, condo, gestionnaire, tech1, nbTech,
            serviceReel, categorie, rdvReel, rdvPrevu, revenuReel, revenuPrevu,
            heuresReel, heuresPrevu, pts, dphReel, ecartRevenu,
          };
        }).filter((r) => r.date && !isNaN(r.date) && r.gestionnaire);

        resolve(rows);
      },
      error: reject,
    });
  });
}
