import Papa from 'papaparse';
import { scoreService } from './serviceMapping';

const URL_JOBBER = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vTT-K7k7m9AB_A9vrJ0xP0_FZoGJAosB_Caezb7Q2fl034YZPyX1f7Mtf8Tbwws7Na-csYlryXL6i3L/pub?gid=1023258397&single=true&output=csv';

function parseDate(str) {
  if (!str) return null;
  const d = new Date(str);
  return isNaN(d) ? null : d;
}

function toDs(d) {
  if (!d) return '';
  return d.getFullYear() + '-' + String(d.getMonth()+1).padStart(2,'0') + '-' + String(d.getDate()).padStart(2,'0');
}

function cleanMoney(v) {
  if (!v) return 0;
  const n = parseFloat(String(v).replace(/[$,\s]/g,''));
  return isNaN(n) ? 0 : n;
}

function isCondo(type) {
  return (type || '').toLowerCase().includes('condo');
}

export async function fetchJobberCondoData() {
  return new Promise((resolve, reject) => {
    Papa.parse(URL_JOBBER, {
      download: true, header: true, skipEmptyLines: true,
      complete: ({ data }) => {
        const rows = data.map(row => {
          if (!isCondo(row['Type'])) return null;
          const date = parseDate(row['Job Date']);
          if (!date) return null;
          const vendeur = (row['Vendeur'] || '').trim();
          if (!vendeur) return null;
          const services = row['Service(s)'] || '';
          const nbUnits = parseInt(row['N\u00b0 of Units'] || '1') || 1;
          if (cleanMoney(row["Prix (H.T)"]) === 0) return null;
          const revenu = cleanMoney(row['Prix (H.T)']);
          const isSmallJob = revenu < 600;
          const isAddon = svc => /^(fan de salle|hotte de cuisine|5 1\/2|5½|5 et demi|2 étages|2 etages|penthouse|supplement|supplément)/i.test(svc.trim()) || /benefect|desinfection|désinfection|antibacterien|antibactérien/i.test(svc);
          const pts = (() => {
            if (!services || services === 'None') return 0;
            if (/^aires? communes?$/i.test(services.trim())) return nbUnits * 4;
            const hasMultiplier = /\d+ x /i.test(services);
            const parts = hasMultiplier ? services.split(' - ') : [services];
            if (isSmallJob) {
              let baseTotal = 0;
              let addonTotal = 0;
              parts.forEach(part => {
                const match = part.match(/^(\d+(?:\.\d+)?) x (Ajout: )?(.+)$/i);
                const svc = match ? match[3].trim() : part.trim();
                const qty = match ? parseFloat(match[1]) || 1 : 1;
                if (/^aires? communes?$/i.test(svc)) { baseTotal += qty * 4; }
                else if (isAddon(svc)) { addonTotal += qty * 0.25; }
                else { baseTotal += scoreService(svc); }
              });
              return Math.round((baseTotal + Math.min(addonTotal, 0.50)) * 100) / 100;
            } else {
              let total = 0;
              parts.forEach(part => {
                const match = part.match(/^(\d+(?:\.\d+)?) x (Ajout: )?(.+)$/i);
                const svc = match ? match[3].trim() : part.trim();
                const qty = match ? parseFloat(match[1]) || 1 : 1;
                if (/^aires? communes?$/i.test(svc)) { total += qty * 4; }
                else { total += qty * scoreService(svc); }
              });
              return Math.round(total * 100) / 100;
            }
          })()
          return {
            dateStr: toDs(date),
            date,
            gestionnaire: vendeur,
            services,
            pts: Math.round(pts * 100) / 100,
            revenu: cleanMoney(row['Prix (H.T)']),
            jobNo: row['Job N\u00b0'] || '',
            type: row['Type'] || '',
            nbUnits,
          };
        }).filter(Boolean);
        resolve(rows);
      },
      error: reject,
    });
  });
}

export function filterJobberCondo(rows, { dateFrom, dateTo, gestionnaire }) {
  return rows.filter(r => {
    if (dateFrom && r.dateStr < dateFrom) return false;
    if (dateTo   && r.dateStr > dateTo)   return false;
    if (gestionnaire && gestionnaire !== 'Tous' && r.gestionnaire !== gestionnaire) return false;
    return true;
  });
}

export function computeJobberCondoKpis(rows, hoursMap, gestionnaire) {
  const totalRevenu = rows.reduce((s,r) => s + r.revenu, 0);
  const totalPts    = rows.reduce((s,r) => s + r.pts, 0);
  const totalRDV    = rows.length;

  // Grouper par jour
  const byDay = {};
  rows.forEach(r => {
    if (!byDay[r.dateStr]) byDay[r.dateStr] = { pts: 0, revenu: 0, rdv: 0 };
    byDay[r.dateStr].pts    += r.pts;
    byDay[r.dateStr].revenu += r.revenu;
    byDay[r.dateStr].rdv    += 1;
  });
  const nbJours = Object.keys(byDay).length;
  const byDayGest = {};
  rows.forEach(r => {
    const key = r.dateStr + '_' + r.gestionnaire;
    if (!byDayGest[key]) byDayGest[key] = 0;
    byDayGest[key] += r.pts;
  });
  const ptsParGestJour = Object.values(byDayGest);
  const avgPtsDay = ptsParGestJour.length > 0 ? ptsParGestJour.reduce((s,v)=>s+v,0) / ptsParGestJour.length : 0;
  const pctAbove8 = ptsParGestJour.length > 0 ? ptsParGestJour.filter(v => v >= 8).length / ptsParGestJour.length * 100 : 0;

  // Heures depuis hoursMap
  let totalHeures = 0;
  if (gestionnaire && gestionnaire !== 'Tous') {
    Object.keys(byDay).forEach(dk => {
      const h = hoursMap[dk + '_' + gestionnaire];
      totalHeures += h != null ? h : 0;
    });
  } else {
    // Tous les gestionnaires — sommer toutes les heures disponibles
    const gests = [...new Set(rows.map(r => r.gestionnaire).filter(Boolean))];
    const seenKeys = new Set();
    rows.forEach(r => {
      const key = r.dateStr + '_' + r.gestionnaire;
      if (seenKeys.has(key)) return;
      seenKeys.add(key);
      const h = hoursMap[key];
      if (h != null) totalHeures += h;
    });
  }
  const dph = totalHeures > 0 ? totalRevenu / totalHeures : null;

  return { totalRevenu, totalPts, totalRDV, nbJours, avgPtsDay, pctAbove8, dph, totalHeures };
}
