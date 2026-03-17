import { useState, useMemo, useEffect } from 'react';
import { fetchCasaData } from './utils/parseCasaData';
import { fetchHoursByTech } from './utils/parseHours';
import HelpPanel from './HelpPanel';

const SEUIL_DPH = 120;

function fmtMoney(v) { return v == null ? '-' : '$' + Math.round(v).toLocaleString('fr-CA'); }
function fmtDec(v, d) { return v == null ? '-' : Number(v).toFixed(d == null ? 0 : d); }

function cibleCondoMois(m) { return [12,1,2,3].includes(m) ? 100 : 120; }
function cibleCasaMois(m) {
  if ([12,1,2,3].includes(m)) return 90;
  if ([4,10,11].includes(m)) return 100;
  return 120;
}

function toDs(d) {
  if (!d) return '';
  return d.getFullYear() + '-' + String(d.getMonth()+1).padStart(2,'0') + '-' + String(d.getDate()).padStart(2,'0');
}

function KpiCard({ label, value, sub, status }) {
  const colors = { green: '#16a34a', red: '#dc2626', neutral: '#1A2B4A' };
  const bgs    = { green: '#dcfce7', red: '#fee2e2', neutral: '#D6E4F0' };
  const col = colors[status] || colors.neutral;
  const bg  = bgs[status]   || bgs.neutral;
  return (
    <div style={{ background: bg, borderRadius: 10, padding: '16px 20px', borderLeft: '4px solid ' + col, minWidth: 150, flex: 1 }}>
      <div style={{ fontSize: 11, color: '#555', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5 }}>{label}</div>
      <div style={{ fontSize: 26, fontWeight: 800, color: col, marginTop: 4 }}>{value}</div>
      {sub && <div style={{ fontSize: 11, color: '#777', marginTop: 2 }}>{sub}</div>}
    </div>
  );
}

export default function TechniciensDashboard({ condoRows, dateFrom, dateTo, setDateFrom, setDateTo, role }) {
  const safeCondoRows = condoRows || [];
  const [casaRows, setCasaRows] = useState([]);
  const [hoursMap, setHoursMap] = useState({});
  const [excluded, setExcluded] = useState([]);
  const [selected, setSelected] = useState([]);
  const [srchExcl, setSrchExcl] = useState('');
  const [srchSel,  setSrchSel]  = useState('');
  const [sortCol,  setSortCol]  = useState('revenuTotal');
  const [sortDir,  setSortDir]  = useState('desc');

  useEffect(() => {
    fetchCasaData().then(r => setCasaRows(r)).catch(() => {});
    fetchHoursByTech().then(m => setHoursMap(m)).catch(() => {});
  }, []);

  const togExcl = t => setExcluded(p => p.includes(t) ? p.filter(x => x !== t) : [...p, t]);
  const togSel  = t => setSelected(p => p.includes(t) ? p.filter(x => x !== t) : [...p, t]);

  const fCondo = useMemo(() => safeCondoRows.filter(r => {
    const ds = toDs(r.date);
    if (dateFrom && ds < dateFrom) return false;
    if (dateTo   && ds > dateTo)   return false;
    return true;
  }), [safeCondoRows, dateFrom, dateTo]);

  const fCasa = useMemo(() => casaRows.filter(r => {
    if (dateFrom && r.dateStr < dateFrom) return false;
    if (dateTo   && r.dateStr > dateTo)   return false;
    return !r.isMixte;
  }), [casaRows, dateFrom, dateTo]);

  const allTechs = useMemo(() => {
    const s = new Set();
    fCondo.forEach(r => r.tech1 && s.add(r.tech1));
    fCasa.forEach(r  => r.technicien && s.add(r.technicien));
    return [...s].sort();
  }, [fCondo, fCasa, hoursMap]);

  const byTech = useMemo(() => {
    const map = {};
    const init = n => {
      if (!map[n]) map[n] = { n, rC: 0, hCJ: {}, jC: new Set(), rK: 0, hKJ: {}, jK: new Set(), dphSum: 0, dphCnt: 0 };
    };

    fCondo.forEach(r => {
      if (!r.tech1) return;
      init(r.tech1);
      const m = map[r.tech1];
      m.rC += r.revenuReel || 0;
      const ds = toDs(r.date);
      const hFromMap = hoursMap[ds + '_' + r.tech1] || 0;
      const hToUse = hFromMap > 0 ? hFromMap : (r.heuresReel > 0 ? r.heuresReel : 0);
      if (hToUse > 0 && ds) m.hCJ[ds] = Math.max(m.hCJ[ds] || 0, hToUse);
      m.jC.add(ds);
    });

    fCasa.forEach(r => {
      if (!r.technicien) return;
      init(r.technicien);
      const m = map[r.technicien];
      m.rK += r.realRevenue || 0;
      if (r.heures > 0 && r.dateStr) m.hKJ[r.dateStr] = Math.max(m.hKJ[r.dateStr] || 0, r.heures);
      if (r.kpiDollarH > 0) { m.dphSum += r.kpiDollarH; m.dphCnt++; }
      m.jK.add(r.dateStr);
    });

    return Object.values(map).map(t => {
      const hC = Object.values(t.hCJ).reduce((s,v) => s+v, 0);
      const hK = Object.values(t.hKJ).reduce((s,v) => s+v, 0);
      const hT = hC + hK;
      const rT = t.rC + t.rK;
      const jT = new Set([...t.jC, ...t.jK]).size;

      const hCbyM = {};
      Object.entries(t.hCJ).forEach(([ds, h]) => { const mo = parseInt(ds.slice(5,7)); hCbyM[mo] = (hCbyM[mo]||0) + h; });
      const cibleC = Object.entries(hCbyM).reduce((s,[mo,h]) => s + h * cibleCondoMois(parseInt(mo)), 0);

      const hKbyM = {};
      Object.entries(t.hKJ).forEach(([ds, h]) => { const mo = parseInt(ds.slice(5,7)); hKbyM[mo] = (hKbyM[mo]||0) + h; });
      const cibleK = Object.entries(hKbyM).reduce((s,[mo,h]) => s + h * cibleCasaMois(parseInt(mo)), 0);

      const cibleT = cibleC + cibleK;
      const dphC   = hC > 0 ? t.rC / hC : null;
      const dphK   = t.dphCnt > 0 ? t.dphSum / t.dphCnt : null;
      let dphT = null;
      if (dphC !== null && dphK !== null) { const hKi = dphK > 0 ? t.rK / dphK : 0; dphT = rT / (hC + hKi); }
      else if (dphC !== null) dphT = dphC;
      else if (dphK !== null) dphT = dphK;

      const cibleDph = hT > 0 ? cibleT / hT : null;
      const ecartDph = dphT !== null && cibleDph !== null ? dphT - cibleDph : null;

      return {
        name: t.n, revenuTotal: rT, revenuCondo: t.rC, revenuCasa: t.rK,
        heuresTotal: hT, heuresCondo: hC, heuresCasa: hK,
        joursTotal: jT, joursCondo: t.jC.size, joursCasa: t.jK.size,
        dphTotal: dphT, dphCondo: dphC, dphCasa: dphK,
        cibleTotal: cibleT, ecartCible: rT - cibleT, cibleDph, ecartDph,
      };
    });
  }, [fCondo, fCasa]);

  const visible = useMemo(() =>
    selected.length > 0 ? byTech.filter(t => selected.includes(t.name)) : byTech,
    [byTech, selected]);

  const kpiRows = useMemo(() =>
    visible.filter(t => !excluded.includes(t.name)),
    [visible, excluded]);

  const totRev = kpiRows.reduce((s,t) => s + t.revenuTotal, 0);
  const totH   = kpiRows.reduce((s,t) => s + t.heuresTotal, 0);
  const avgDph = totH > 0 ? totRev / totH : null;
  const totJ   = kpiRows.reduce((s,t) => s + t.joursTotal, 0);

  const sorted = useMemo(() => [...visible].sort((a,b) => {
    const av = a[sortCol] != null ? a[sortCol] : -Infinity;
    const bv = b[sortCol] != null ? b[sortCol] : -Infinity;
    return sortDir === 'desc' ? bv - av : av - bv;
  }), [visible, sortCol, sortDir]);

  const hs  = col => () => { if (sortCol===col) setSortDir(d => d==='desc'?'asc':'desc'); else { setSortCol(col); setSortDir('desc'); } };
  const arr = col => sortCol===col ? (sortDir==='desc' ? ' v' : ' ^') : ' -';
  const inp = { padding: '6px 10px', border: '1px solid #ddd', borderRadius: 6, fontSize: 13 };
  const th  = r => ({ background: '#1A2B4A', color: '#fff', padding: '10px 12px', textAlign: r?'right':'left', fontWeight: 600, fontSize: 12, whiteSpace: 'nowrap', cursor: 'pointer', userSelect: 'none' });
  const td  = r => ({ padding: '9px 12px', fontSize: 13, borderBottom: '1px solid #f0f0f0', textAlign: r?'right':'left', color: '#222' });
  const dc  = v => v !== null ? (v >= SEUIL_DPH ? '#16a34a' : '#dc2626') : '#aaa';

  function DD({ title, ph, srch, setSrch, sel, tog, blue }) {
    return (
      <div style={{ position: 'relative' }}>
        <div style={{ fontSize: 11, color: '#666', marginBottom: 4 }}>{title}</div>
        <details>
          <summary style={{ padding: '6px 10px', border: '1px solid #ddd', borderRadius: 6, fontSize: 13, cursor: 'pointer', listStyle: 'none', background: '#fff', minWidth: 180, userSelect: 'none' }}>
            {sel.length === 0 ? ph : sel.length === 1 ? sel[0] : sel.length + ' sel.'}
          </summary>
          <div style={{ position: 'absolute', zIndex: 100, top: '100%', left: 0, background: '#fff', border: '1px solid #ddd', borderRadius: 6, boxShadow: '0 4px 12px rgba(0,0,0,0.12)', minWidth: 220, marginTop: 2 }}>
            <div style={{ padding: '8px 10px', borderBottom: '1px solid #f0f0f0' }}>
              <input type="text" placeholder="Rechercher..." value={srch} onChange={e => setSrch(e.target.value)} onClick={e => e.stopPropagation()}
                style={{ width: '100%', padding: '5px 8px', border: '1px solid #ddd', borderRadius: 4, fontSize: 13, boxSizing: 'border-box' }} />
            </div>
            <div style={{ maxHeight: 200, overflowY: 'auto', padding: '4px 0' }}>
              {allTechs.filter(t => t.toLowerCase().startsWith(srch.toLowerCase())).map(t => (
                <label key={t} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '5px 12px', cursor: 'pointer', background: sel.includes(t) ? (blue ? '#eff6ff' : '#fef2f2') : 'transparent' }}>
                  <input type="checkbox" checked={sel.includes(t)} onChange={() => tog(t)} />
                  <span style={{ fontSize: 13, color: sel.includes(t) ? (blue ? '#1d4ed8' : '#dc2626') : '#333' }}>{t}</span>
                </label>
              ))}
            </div>
          </div>
        </details>
      </div>
    );
  }

  return (
    <div style={{ padding: '0 24px 40px', maxWidth: 1600, margin: '0 auto' }}>
      <div style={{ marginBottom: 20 }}>
        <div style={{ fontSize: 22, fontWeight: 700, color: '#1A2B4A' }}>Dashboard Techniciens</div>
        <div style={{ fontSize: 13, color: '#888', marginTop: 2 }}>Performance consolidee Condo + Casa</div>
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16, marginBottom: 24, background: '#f8fafc', borderRadius: 10, padding: '16px 20px', border: '1px solid #e5e7eb' }}>
        <div>
          <div style={{ fontSize: 11, color: '#666', marginBottom: 4 }}>Date debut</div>
          <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} style={inp} />
        </div>
        <div>
          <div style={{ fontSize: 11, color: '#666', marginBottom: 4 }}>Date fin</div>
          <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} style={inp} />
        </div>
        <DD title="Filtrer techniciens" ph="Tous" srch={srchSel} setSrch={setSrchSel} sel={selected} tog={togSel} blue={true} />
        <DD title="Exclure des KPIs"   ph="Aucune exclusion" srch={srchExcl} setSrch={setSrchExcl} sel={excluded} tog={togExcl} blue={false} />
        <div style={{ display: 'flex', alignItems: 'flex-end' }}>
          <HelpPanel dept="tech" role={role || 'admin'} />
        <button onClick={() => { setDateFrom(''); setDateTo(''); setSelected([]); setExcluded([]); }}
            style={{ padding: '6px 14px', borderRadius: 6, border: '1px solid #ddd', fontSize: 13, cursor: 'pointer', background: '#fff', color: '#555' }}>
            Reinitialiser
          </button>
        </div>
      </div>
      <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', marginBottom: 28 }}>
        <KpiCard label="Revenu Total"    value={fmtMoney(totRev)} sub={kpiRows.length + ' tech.'} status="neutral" />
        <KpiCard label="Dollar/h Moyen"  value={avgDph !== null ? '$' + fmtDec(avgDph) + '/h' : '-'} sub="Condo + Casa" status={avgDph !== null ? (avgDph >= SEUIL_DPH ? 'green' : 'red') : 'neutral'} />
        <KpiCard label="Heures Totales"  value={fmtDec(totH, 1) + ' h'} status="neutral" />
        <KpiCard label="Jours"           value={totJ} status="neutral" />
      </div>
      <div style={{ overflowX: 'auto', borderRadius: 10, border: '1px solid #e5e7eb' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead>
            <tr>
              <th onClick={hs('name')}        style={th(false)}>Technicien{arr('name')}</th>
              <th onClick={hs('joursTotal')}  style={th(true)}>Jours{arr('joursTotal')}</th>
              <th onClick={hs('revenuTotal')} style={th(true)}>Rev Total{arr('revenuTotal')}</th>
              <th onClick={hs('revenuCondo')} style={th(true)}>Rev Condo{arr('revenuCondo')}</th>
              <th onClick={hs('revenuCasa')}  style={th(true)}>Rev Casa{arr('revenuCasa')}</th>
              <th onClick={hs('dphTotal')}    style={th(true)}>$/h Total{arr('dphTotal')}</th>
              <th onClick={hs('dphCondo')}    style={th(true)}>$/h Condo{arr('dphCondo')}</th>
              <th onClick={hs('dphCasa')}     style={th(true)}>$/h Casa{arr('dphCasa')}</th>
              <th onClick={hs('heuresTotal')} style={th(true)}>Heures{arr('heuresTotal')}</th>
              <th onClick={hs('cibleTotal')}  style={th(true)}>Cible ${arr('cibleTotal')}</th>
              <th onClick={hs('ecartCible')}  style={th(true)}>Ecart ${arr('ecartCible')}</th>
              <th onClick={hs('cibleDph')}    style={th(true)}>Cible $/h{arr('cibleDph')}</th>
              <th onClick={hs('ecartDph')}    style={th(true)}>Ecart $/h{arr('ecartDph')}</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((t, i) => {
              const excl = excluded.includes(t.name);
              return (
                <tr key={t.name} style={{ background: excl ? '#fff7f7' : i % 2 === 0 ? '#fff' : '#f9fafb' }}>
                  <td style={{ ...td(false), fontWeight: 600, color: excl ? '#dc2626' : '#1A2B4A' }}>{t.name}{excl ? ' (exclu)' : ''}</td>
                  <td style={td(true)}>{t.joursTotal}</td>
                  <td style={td(true)}>{fmtMoney(t.revenuTotal)}</td>
                  <td style={td(true)}>{t.revenuCondo > 0 ? fmtMoney(t.revenuCondo) : '-'}</td>
                  <td style={td(true)}>{t.revenuCasa  > 0 ? fmtMoney(t.revenuCasa)  : '-'}</td>
                  <td style={{ ...td(true), color: dc(t.dphTotal), fontWeight: 700 }}>{t.dphTotal !== null ? '$' + fmtDec(t.dphTotal) + '/h' : '-'}</td>
                  <td style={{ ...td(true), color: dc(t.dphCondo) }}>{t.dphCondo !== null ? '$' + fmtDec(t.dphCondo) + '/h' : '-'}</td>
                  <td style={{ ...td(true), color: dc(t.dphCasa)  }}>{t.dphCasa  !== null ? '$' + fmtDec(t.dphCasa)  + '/h' : '-'}</td>
                  <td style={td(true)}>{fmtDec(t.heuresTotal, 1)} h</td>
                  <td style={td(true)}>{fmtMoney(t.cibleTotal)}</td>
                  <td style={{ ...td(true), fontWeight: 700, color: t.ecartCible >= 0 ? '#16a34a' : '#dc2626' }}>{(t.ecartCible >= 0 ? '+' : '') + fmtMoney(t.ecartCible)}</td>
                  <td style={td(true)}>{t.cibleDph !== null ? '$' + fmtDec(t.cibleDph) + '/h' : '-'}</td>
                  <td style={{ ...td(true), fontWeight: 700, color: t.ecartDph !== null ? (t.ecartDph >= 0 ? '#16a34a' : '#dc2626') : '#aaa' }}>{t.ecartDph !== null ? (t.ecartDph >= 0 ? '+' : '') + '$' + fmtDec(t.ecartDph) + '/h' : '-'}</td>
                </tr>
              );
            })}
            {sorted.length === 0 && <tr><td colSpan={13} style={{ ...td(true), textAlign: 'center', color: '#aaa' }}>Aucune donnee</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
