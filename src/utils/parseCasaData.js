import Papa from 'papaparse';

const CASA_CSV_URL =
  'https://docs.google.com/spreadsheets/d/e/2PACX-1vR4SbKL6EQEmRghLqqaddDo5W3IpKlxLaun3m4r8xBVaLyR0bFydVhR4utpiYcvaNZV4UUETGIpLc01/pub?gid=0&single=true&output=csv';

function parseNum(val) {
  if (val === null || val === undefined || val === '') return null;
  const n = parseFloat(String(val).replace(/[$,\s]/g, '').replace(',', '.'));
  return isNaN(n) ? null : n;
}

function parseDate(val) {
  if (!val) return null;
  const parts = String(val).trim().split(/[\/\-]/);
  if (parts.length !== 3) return null;
  let d, m, y;
  if (parts[0].length === 4) {
    [y, m, d] = parts;
  } else {
    [d, m, y] = parts;
  }
  const date = new Date(`${y}-${String(m).padStart(2,'0')}-${String(d).padStart(2,'0')}T12:00:00`);
  return isNaN(date.getTime()) ? null : date;
}

function dateStr(date) {
  if (!date) return '';
  return `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`;
}

export async function fetchCasaData() {
  return new Promise((resolve, reject) => {
    Papa.parse(CASA_CSV_URL, {
      download: true,
      header: true,
      skipEmptyLines: true,
      complete: ({ data }) => {
        const rows = data
          .map(row => {
            const date = parseDate(row['Date']);
            if (!date) return null;

            const technicien = (row['Technicien 1'] || '').trim();
            if (!technicien) return null;

            const estRevenue   = parseNum(row['Estimated Revenue']);
            const estKm        = parseNum(row['Estimated KM']);
            const estKpi       = parseNum(row['Estimated KPI']);
            const realRevenue  = parseNum(row['Real Revenue']);
            const realKm       = parseNum(row['Real KM']);
            const realKpi      = parseNum(row['Real KPI']);
            const revDiff      = parseNum(row['Rev Diff']);
            const kmDiff       = parseNum(row['KM Diff']);
            const pctDiff      = parseNum(row['% DIff']);
            const heures       = parseNum(row['Nombre d\'heures travaillées']);
            const kpiDollarH   = parseNum(row['KPI $/h']);
            const note         = (row['Note'] || '').trim();

            // km=1 = déplacement seul, exclure du $/km
            const dollarKm = (realRevenue !== null && realKm !== null && realKm > 1)
              ? realRevenue / realKm : null;

            // Journée mixte ou ticket = exclure de $/h et rev/jour
            const noteLC = note.toLowerCase();
            const isMixte = noteLC.includes('mixte') || noteLC.includes('ticket');

            return {
              date,
              dateStr: dateStr(date),
              technicien,
              estRevenue,
              estKm,
              estKpi,
              realRevenue,
              realKm,
              realKpi,
              revDiff,
              kmDiff,
              pctDiff,
              heures,
              kpiDollarH,
              dollarKm,
              note,
              isMixte,
            };
          })
          .filter(Boolean);

        resolve(rows);
      },
      error: reject,
    });
  });
}

export function filterCasaRows(rows, { dateFrom, dateTo, techniciens }) {
  return rows.filter(r => {
    if (dateFrom && r.dateStr < dateFrom) return false;
    if (dateTo   && r.dateStr > dateTo)   return false;
    if (techniciens && techniciens.length > 0 && techniciens.indexOf(r.technicien) === -1) return false;
    return true;
  });
}

function avg(arr) {
  const valid = arr.filter(v => v !== null);
  if (!valid.length) return null;
  return valid.reduce((a, b) => a + b, 0) / valid.length;
}

function sum(arr) {
  return arr.filter(v => v !== null).reduce((a, b) => a + b, 0);
}

export function computeCasaKpis(rows) {
  const pureRows = rows.filter(r => !r.isMixte);
  return {
    totalJours:         pureRows.length,
    totalRevenuReel:    sum(rows.map(r => r.realRevenue)),
    totalRevenuPrevu:   sum(rows.map(r => r.estRevenue)),
    avgDollarH:         avg(pureRows.map(r => r.kpiDollarH)),
    avgDollarKm:        avg(rows.filter(r => r.dollarKm !== null).map(r => r.dollarKm)),
    avgRevDiff:         avg(rows.map(r => r.pctDiff)),
    avgKm:              avg(rows.map(r => r.realKm)),
  };
}

export function groupByTechnicien(rows) {
  const map = {};
  for (const r of rows) {
    if (!map[r.technicien]) map[r.technicien] = [];
    map[r.technicien].push(r);
  }
  return Object.entries(map).map(([technicien, items]) => {
    const pureItems = items.filter(r => !r.isMixte);
    return {
      technicien,
      jours:          items.length,
      revenuReel:     sum(items.map(r => r.realRevenue)),
      revenuPrevu:    sum(items.map(r => r.estRevenue)),
      avgDollarH:     avg(pureItems.map(r => r.kpiDollarH)),
      avgDollarKm:    avg(items.filter(r => r.dollarKm !== null).map(r => r.dollarKm)),
      avgRevDiff:     avg(items.map(r => r.pctDiff)),
      revParJour:     pureItems.length > 0 ? sum(pureItems.map(r => r.realRevenue)) / pureItems.length : null,
      totalHeures:    sum(items.map(r => r.heures)),
      avgHeures:      avg(items.map(r => r.heures)),
    };
  });
}
