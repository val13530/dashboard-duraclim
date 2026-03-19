import Papa from 'papaparse';

const URLS = {
  2025: 'https://docs.google.com/spreadsheets/d/e/2PACX-1vSbgHcPJ2uYOn2YYJ3qQ8nIhCc3yDd4n6CPrfoyv8bZvlbxWXAAgLw28nQvWsi3r-lr0aqjeENar6GL/pub?gid=1319458157&single=true&output=csv',
  2026: 'https://docs.google.com/spreadsheets/d/e/2PACX-1vSbgHcPJ2uYOn2YYJ3qQ8nIhCc3yDd4n6CPrfoyv8bZvlbxWXAAgLw28nQvWsi3r-lr0aqjeENar6GL/pub?gid=1964434816&single=true&output=csv',
};

function parseDate(str) {
  if (!str) return null;
  const parts = str.split('/');
  if (parts.length === 3) {
    const [m, d, y] = parts;
    return new Date(y + '-' + m.padStart(2,'0') + '-' + d.padStart(2,'0') + 'T12:00:00');
  }
  const d = new Date(str);
  return isNaN(d) ? null : d;
}

function toDs(d) {
  if (!d) return '';
  return d.getFullYear() + '-' + String(d.getMonth()+1).padStart(2,'0') + '-' + String(d.getDate()).padStart(2,'0');
}

function cleanMoney(v) {
  if (!v) return null;
  const n = parseFloat(String(v).replace(/[$,\s]/g,''));
  return isNaN(n) ? null : n;
}

function isCondoKpi(client) {
  return (client || '').trim().replace(/\s+/g, ' ').toUpperCase() === 'CONDO KPI';
}

export async function fetchBillingData(year) {
  return new Promise((resolve, reject) => {
    Papa.parse(URLS[year], {
      download: true, header: true, skipEmptyLines: true,
      complete: ({ data }) => {
        const rows = data.map(row => {
          const date = parseDate(row['Date']);
          return {
            dateStr:       toDs(date),
            date,
            client:        (row['Nom du Client'] || '').trim(),
            jobId:         (row['# Job'] || '').trim(),
            tech:          (() => {
            const raw = (row['Tech'] || '').trim();
            const name = raw.includes(' - ') ? raw.split(' - ').pop().trim() : raw;
            const mapping = {
              'Alexandre G': 'Alexandre Germain',
            };
            return mapping[name] || name;
          })(),
            typeOfJob:     (row['Type of job'] || '').trim(),
            jobStatus:     (row['Job Status'] || '').trim(),
            quote:         cleanMoney(row['Quote']),
            done:          cleanMoney(row['Done']),
            paymentType:   (row['Payment Type'] || '').trim(),
            paymentStatus: (row['Payment Status'] || '').trim(),
            squareReceipt: (row['Square Receipt'] || '').trim(),
            rapportFait:   (row['Rapport Fait'] || '').trim(),
            notes:         (row['Notes'] || '').trim(),
            visitId:       (row['Visit ID'] || '').trim(),
          };
        }).filter(r => r.date && !isNaN(r.date));
        resolve(rows);
      },
      error: reject,
    });
  });
}

export function filterBillingRows(rows, { dateFrom, dateTo, jobStatus, paymentStatus }) {
  return rows.filter(r => {
    if (dateFrom && r.dateStr < dateFrom) return false;
    if (dateTo   && r.dateStr > dateTo)   return false;
    if (jobStatus && jobStatus !== 'Tous' && r.jobStatus !== jobStatus) return false;
    if (paymentStatus && paymentStatus !== 'Tous' && r.paymentStatus !== paymentStatus) return false;
    return true;
  });
}

export function computeBillingKpis(rows) {
  const today = new Date();
  const activeRows = rows.filter(r => r.jobStatus === 'Done' && !isCondoKpi(r.client));
  const totalQuote  = activeRows.reduce((s,r) => s + (r.quote || 0), 0);
  const totalDone   = activeRows.filter(r => r.paymentStatus !== 'Unpaid').reduce((s,r) => s + (r.done || 0), 0);
  const totalAR     = activeRows.filter(r => r.paymentStatus === 'Unpaid').reduce((s,r) => s + (r.quote || 0), 0);
  const totalAR30j    = activeRows.filter(r => r.paymentStatus === 'Unpaid' && r.date && (today - r.date) / (1000*60*60*24) > 30).reduce((s,r) => s + (r.quote || 0), 0);
  const nbAR30j       = activeRows.filter(r => r.paymentStatus === 'Unpaid' && r.date && (today - r.date) / (1000*60*60*24) > 30).length;
  const totalAR0_30j  = activeRows.filter(r => r.paymentStatus === 'Unpaid' && r.date && (today - r.date) / (1000*60*60*24) <= 30).reduce((s,r) => s + (r.quote || 0), 0);
  const nbAR0_30j     = activeRows.filter(r => r.paymentStatus === 'Unpaid' && r.date && (today - r.date) / (1000*60*60*24) <= 30).length;
  const nbUnpaid    = activeRows.filter(r => r.paymentStatus === 'Unpaid').length;
  const totalFree   = activeRows.filter(r => r.paymentStatus === 'Free').length;
  const totalCancelled = rows.filter(r => r.jobStatus === 'Cancelled').length;
  const ecart = totalQuote - totalDone;

  const byPaymentType = {};
  activeRows.forEach(r => {
    const pt = r.paymentType || 'Non specifie';
    if (!byPaymentType[pt]) byPaymentType[pt] = { count: 0, amount: 0 };
    byPaymentType[pt].count++;
    byPaymentType[pt].amount += r.paymentStatus !== 'Unpaid' ? (r.done || 0) : 0;
  });

  const byPaymentStatus = {};
  activeRows.forEach(r => {
    const ps = r.paymentStatus || 'Non specifie';
    if (!byPaymentStatus[ps]) byPaymentStatus[ps] = { count: 0, amount: 0 };
    byPaymentStatus[ps].count++;
    byPaymentStatus[ps].amount += r.paymentStatus === 'Unpaid' ? (r.quote || 0) : (r.done || 0);
  });

  return { totalQuote, totalDone, totalAR, totalAR30j, nbAR30j, totalAR0_30j, nbAR0_30j, totalFree, totalCancelled, byPaymentType, byPaymentStatus, nbJobs: activeRows.length, ecart, nbUnpaid };
}
