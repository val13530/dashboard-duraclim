import Papa from 'papaparse';

const URL_2025 = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vTT-K7k7m9AB_A9vrJ0xP0_FZoGJAosB_Caezb7Q2fl034YZPyX1f7Mtf8Tbwws7Na-csYlryXL6i3L/pub?gid=1023258397&single=true&output=csv';

function isCasa(type) {
  const t = (type || '').toLowerCase();
  return t.includes('casa') || t.includes('residential');
}

function normalize(s) {
  return s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9 ]/g,' ').replace(/\s+/g,' ').trim();
}

function scoreService(raw, type) {
  const n = normalize(raw);
  const casa = isCasa(type);
  let pts = 0;

  if ((n.includes('conduit') && n.includes('ventilation')) || n.includes('ducts cleaning') || n.includes('unite centrale') || n.includes('central unit') || n.includes('unite central')) {
    if (n.includes('echangeur') || n.includes('air exchanger')) return { pts: casa ? 16 : 10, label: 'Conduit+Echangeur' };
    return { pts: casa ? 14 : 10, label: 'Conduit ventilation' };
  }
  if ((n.includes('echangeur') || n.includes('air exchanger')) && !n.includes('murale') && !n.includes('wall') && !n.includes('unite') && !n.includes('conduit')) {
    return { pts: casa ? 10 : 8, label: 'Echangeur' };
  }
  if ((n.includes('murale') || n.includes('wall unit') || n.includes('ac wall') || n.includes('thermopompe')) && (n.includes('echangeur') || n.includes('air exchanger'))) {
    pts = casa ? 12 : 10;
    if (n.includes('secheuse') || n.includes('dryer')) pts += 1;
    return { pts, label: 'Murale+Echangeur' };
  }
  if (n.includes('murale') || n.includes('wall unit') || n.includes('ac wall') || n.includes('thermopompe')) {
    pts = 4;
    if (n.includes('multizone') || n.includes('2 tetes') || n.includes('2 tete')) pts = 8;
    if (n.includes('3') && n.includes('tete')) pts = 12;
    if (n.includes('4') && n.includes('tete')) pts = 16;
    if (n.includes('secheuse') || n.includes('dryer')) { pts += 1; return { pts, label: 'Murale+Secheuse' }; }
    return { pts, label: 'Murale' };
  }
  if (n.includes('forfait') && n.includes('condominium')) return { pts: 10, label: 'Forfait Condo' };
  if (n.includes('ptac')) return { pts: 4, label: 'PTAC' };
  if (n.includes('secheuse') || n.includes('dryer') || n.includes('evacuat')) return { pts: 1, label: 'Secheuse' };
  if (n.includes('fan') || n.includes('ventilateur') || n.includes('bathroom fan')) return { pts: 1, label: 'Fan SDB' };
  if (n.includes('hotte') || n.includes('kitchen fan') || n.includes('degraissage')) return { pts: 1, label: 'Hotte' };
  if (n.includes('benefect') || n.includes('desinfection') || n.includes('antibacterien')) return { pts: 0, label: 'Benefect' };
  if (n.includes('inspection')) return { pts: 0, label: 'Inspection' };
  return { pts: 0, label: 'Autre' };
}

function parseJobServices(raw, type) {
  if (!raw || raw === 'None') return { total: 0, details: [] };
  const parts = raw.split(' - ').map(p => p.replace(/^\d+\.?\d* x (Ajout: )?/i,'').trim()).filter(Boolean);
  let total = 0;
  const details = [];
  parts.forEach(p => {
    const { pts, label } = scoreService(p, type);
    if (pts > 0) { total += pts; details.push({ service: label, pts }); }
  });
  if (isCasa(type) && total > 0) { total += 1; details.push({ service: 'Deplacement', pts: 1 }); }
  return { total, details };
}

export function extractTechName(raw) {
  if (!raw) return null;
  const parts = raw.trim().split(' - ');
  return parts[parts.length - 1].trim();
}

export function getWeekKey(d) {
  const jan1 = new Date(d.getFullYear(), 0, 1);
  const week = Math.ceil(((d - jan1) / 86400000 + jan1.getDay() + 1) / 7);
  return d.getFullYear() + '-W' + String(week).padStart(2,'0');
}

export function getMonthKey(d) {
  return d.getFullYear() + '-' + String(d.getMonth()+1).padStart(2,'0');
}

export async function fetchTechData() {
  return new Promise((resolve, reject) => {
    Papa.parse(URL_2025, {
      download: true, header: true, skipEmptyLines: true,
      complete: ({ data }) => {
        const jobs = data.map(row => {
          const date = new Date(row['Job Date'] || '');
          if (isNaN(date)) return null;
          if (date < new Date("2025-10-01")) return null;
          const techName = extractTechName(row['Technicien'] || '');
          if (!techName || techName === 'None') return null;
          const type = row['Type'] || '';
          const { total: pts, details } = parseJobServices(row['Service(s)'] || '', type);
          return { jobNo: row['Job N°'] || '', date, dateStr: date.toISOString().split('T')[0], weekKey: getWeekKey(date), monthKey: getMonthKey(date), tech: techName, techRaw: row['Technicien'] || '', type, services: row['Service(s)'] || '', pts, details };
        }).filter(Boolean);
        resolve(jobs);
      },
      error: reject,
    });
  });
}

export function computeTechStats(jobs, techName) {
  const myJobs = jobs.filter(j => j.tech === techName);
  const now = new Date();
  const curWeek = getWeekKey(now);
  const curMonth = getMonthKey(now);
  const ptsWeek = myJobs.filter(j => j.weekKey === curWeek).reduce((s,j)=>s+j.pts,0);
  const ptsMois = myJobs.filter(j => j.monthKey === curMonth).reduce((s,j)=>s+j.pts,0);
  const totalPts = myJobs.reduce((s,j)=>s+j.pts,0);
  const totalH = totalPts / 4;
  const indicePtsH = totalH > 0 ? (totalPts / totalH) : 0;
  let serie = 0;
  const sorted = [...myJobs].sort((a,b)=>b.date-a.date);
  for (const j of sorted) { if (j.pts > 0) serie++; else break; }
  const byTech = {};
  jobs.filter(j=>j.monthKey===curMonth).forEach(j=>{ if(!byTech[j.tech]) byTech[j.tech]=0; byTech[j.tech]+=j.pts; });
  const ranking = Object.entries(byTech).sort((a,b)=>b[1]-a[1]);
  const rang = ranking.findIndex(([t])=>t===techName)+1;
  return { ptsWeek, ptsMois, totalPts, indicePtsH, serie, rang, totalTechs: ranking.length, myJobs };
}

export function getAllTechRanking(jobs) {
  const curMonth = getMonthKey(new Date());
  const byTech = {};
  jobs.filter(j=>j.monthKey===curMonth).forEach(j=>{ if(!byTech[j.tech]) byTech[j.tech]={pts:0,jobs:0}; byTech[j.tech].pts+=j.pts; byTech[j.tech].jobs++; });
  return Object.entries(byTech).map(([tech,v])=>({tech,...v})).sort((a,b)=>b.pts-a.pts);
}
