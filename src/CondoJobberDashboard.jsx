import { useState, useMemo } from 'react';
import { filterJobberCondo, computeJobberCondoKpis } from './utils/parseJobberCondo';
import HelpPanel from './HelpPanel';

function fmt$(n) { return n == null ? 'N/A' : '$' + Math.round(n).toLocaleString('fr-CA'); }
function fmtDec(n, d=1) { return n == null ? 'N/A' : n.toFixed(d); }

function KPICard({ label, value, sub, color='#1A2B4A', bg='#D6E4F0', warn }) {
  return (
    <div style={{ background: bg, borderRadius: 10, padding: '16px 20px', borderLeft: '4px solid ' + color, minWidth: 140, flex: 1, opacity: warn ? 0.85 : 1 }}>
      <div style={{ fontSize: 11, color: '#555', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5 }}>{label}</div>
      <div style={{ fontSize: 26, fontWeight: 800, color, marginTop: 4 }}>{value}</div>
      {sub && <div style={{ fontSize: 11, color: '#777', marginTop: 2 }}>{sub}</div>}
    </div>
  );
}

function ProgressBar({ val, max, color }) {
  const pct = Math.min(100, max > 0 ? val / max * 100 : 0);
  return (
    <div style={{ background: '#e5e7eb', borderRadius: 4, height: 8, width: '100%' }}>
      <div style={{ background: color, borderRadius: 4, height: 8, width: pct + '%', transition: 'width 0.3s' }} />
    </div>
  );
}

const GESTIONNAIRES_VALIDES = ['Hajar', 'Zak', 'Wissal D.', 'Wissal', 'Nada', 'Wafa'];

export default function CondoJobberDashboard({ rows, hoursMap, user }) {
  const role = user?.role || '';
  const isGestionnaire = role === 'gestionnaire';
  const username = user?.gestionnaireName || user?.username || '';

  const [dateFrom, setDateFrom] = useState('');
  const [dateTo,   setDateTo]   = useState('');
  const [filterGest, setFilterGest] = useState(isGestionnaire ? username : 'Tous');
  const [activeTab, setActiveTab] = useState('overview');
  const [sortCol, setSortCol] = useState('dateStr');
  const [sortDir, setSortDir] = useState('desc');

  const gestionnaires = useMemo(() => {
    const all = [...new Set(rows.map(r => r.gestionnaire).filter(g => g && g !== 'N/A' && g !== 'None'))].sort();
    return ['Tous', ...all];
  }, [rows]);

  const filtered = useMemo(() => filterJobberCondo(rows, {
    dateFrom, dateTo,
    gestionnaire: isGestionnaire ? username : filterGest,
  }).filter(r => r.gestionnaire && r.gestionnaire !== 'N/A' && r.gestionnaire !== 'None'), [rows, dateFrom, dateTo, filterGest, isGestionnaire, username]);

  const kpis = useMemo(() => computeJobberCondoKpis(filtered, hoursMap, isGestionnaire ? username : filterGest), [filtered, hoursMap, filterGest, isGestionnaire, username]);

  // Par gestionnaire pour vue globale
  const byGest = useMemo(() => {
    const map = {};
    filtered.forEach(r => {
      const g = r.gestionnaire;
      if (!g || g === 'N/A') return;
      if (!map[g]) map[g] = { gestionnaire: g, pts: 0, revenu: 0, rdv: 0, jours: new Set() };
      map[g].pts    += r.pts;
      map[g].revenu += r.revenu;
      map[g].rdv    += 1;
      map[g].jours.add(r.dateStr);
    });
    return Object.values(map).map(g => ({
      ...g,
      nbJours: g.jours.size,
      avgPtsJour: g.jours.size > 0 ? g.pts / g.jours.size : 0,
      totalHeures: (() => {
        let h = 0;
        [...g.jours].forEach(dk => { const v = hoursMap[dk + '_' + g.gestionnaire]; if (v != null) h += v; });
        return h;
      })(),
      dph: (() => {
        let h = 0;
        [...g.jours].forEach(dk => { const v = hoursMap[dk + '_' + g.gestionnaire]; if (v != null) h += v; });
        return h > 0 ? g.revenu / h : null;
      })(),
    })).sort((a,b) => b.avgPtsJour - a.avgPtsJour);
  }, [filtered, hoursMap]);

  // Par jour pour le gestionnaire sélectionné
  const byDay = useMemo(() => {
    const map = {};
    filtered.forEach(r => {
      if (!map[r.dateStr]) map[r.dateStr] = { dateStr: r.dateStr, pts: 0, revenu: 0, rdv: 0, services: [] };
      map[r.dateStr].pts    += r.pts;
      map[r.dateStr].revenu += r.revenu;
      map[r.dateStr].rdv    += 1;
      map[r.dateStr].services.push(r.services);
    });
    return Object.values(map).sort((a,b) => b.dateStr.localeCompare(a.dateStr));
  }, [filtered]);

  const sorted = useMemo(() => [...filtered].sort((a,b) => {
    const av = a[sortCol] || ''; const bv = b[sortCol] || '';
    if (av < bv) return sortDir === 'asc' ? -1 : 1;
    if (av > bv) return sortDir === 'asc' ? 1 : -1;
    return 0;
  }), [filtered, sortCol, sortDir]);

  const hs = col => () => { if (sortCol===col) setSortDir(d=>d==='desc'?'asc':'desc'); else { setSortCol(col); setSortDir('desc'); } };
  const arr = col => sortCol===col ? (sortDir==='desc'?' v':' ^'):' -';

  const inp = { padding: '6px 10px', border: '1px solid #ddd', borderRadius: 6, fontSize: 13 };
  const th  = (right=false) => ({ background: '#1A2B4A', color: '#fff', padding: '10px 12px', fontWeight: 600, fontSize: 12, whiteSpace: 'nowrap', cursor: 'pointer', userSelect: 'none', textAlign: right?'right':'left' });
  const td  = (right=false) => ({ padding: '9px 12px', fontSize: 13, borderBottom: '1px solid #f0f0f0', color: '#222', textAlign: right?'right':'left' });
  const tabStyle = active => ({ padding: '8px 18px', borderRadius: 6, fontWeight: 600, fontSize: 13, cursor: 'pointer', border: 'none', background: active ? '#1A2B4A' : '#E5E7EB', color: active ? '#fff' : '#374151' });

  return (
    <div style={{ padding: '0 24px 40px', maxWidth: 1400, margin: '0 auto' }}>
      <div style={{ marginBottom: 20, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
        <div>
          <div style={{ fontSize: 22, fontWeight: 700, color: '#1A2B4A' }}>Dashboard Condo</div>
          <div style={{ fontSize: 13, color: '#888', marginTop: 2 }}>{filtered.length} jobs · source Jobber</div>
        </div>
        <HelpPanel dept="condo" role={role} />
      </div>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, marginBottom: 24, background: '#f8fafc', borderRadius: 10, padding: '16px 20px', border: '1px solid #e5e7eb' }}>
        {!isGestionnaire && (
          <div>
            <div style={{ fontSize: 11, color: '#666', marginBottom: 4 }}>Gestionnaire</div>
            <select value={filterGest} onChange={e => setFilterGest(e.target.value)} style={inp}>
              {gestionnaires.map(g => <option key={g}>{g}</option>)}
            </select>
          </div>
        )}
        <div>
          <div style={{ fontSize: 11, color: '#666', marginBottom: 4 }}>Date début</div>
          <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} style={inp} />
        </div>
        <div>
          <div style={{ fontSize: 11, color: '#666', marginBottom: 4 }}>Date fin</div>
          <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} style={inp} />
        </div>
        <div style={{ display: 'flex', alignItems: 'flex-end' }}>
          <button onClick={() => { setDateFrom(''); setDateTo(''); setFilterGest('Tous'); }}
            style={{ ...inp, background: '#fff', cursor: 'pointer' }}>Réinitialiser</button>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', marginBottom: 28 }}>
        <KPICard label="Revenu Total" value={fmt$(kpis.totalRevenu)} sub={'Cible: non definie'} color="#1E7D46" bg="#D6F0E0" />
        <KPICard label="$/h Moyen" value={kpis.dph != null ? '$' + fmtDec(kpis.dph, 0) : 'N/A'} sub={kpis.dph != null ? 'Cible: $120/h' : 'Heures non disponibles'} color={kpis.dph == null ? '#6B7280' : kpis.dph >= 120 ? '#1E7D46' : '#E8A020'} bg={kpis.dph == null ? '#F3F4F6' : kpis.dph >= 120 ? '#D6F0E0' : '#FFF9C4'} />
        <KPICard label="Pts/Jour Moyen" value={fmtDec(kpis.avgPtsDay)} sub={'Cible: 8 pts/j — ' + fmtDec(kpis.pctAbove8, 0) + '% des jours >=8'} color={kpis.avgPtsDay >= 8 ? '#1E7D46' : kpis.avgPtsDay >= 5 ? '#2563EB' : '#C0392B'} bg={kpis.avgPtsDay >= 8 ? '#D6F0E0' : kpis.avgPtsDay >= 5 ? '#FFF9C4' : '#FDECEA'} />
        <KPICard label="Total RDV" value={kpis.totalRDV} sub={kpis.nbJours + ' jours analyses'} />
        <KPICard label="Pts Total" value={fmtDec(kpis.totalPts)} sub="Points cumules" />
      </div>

      <div style={{ display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap' }}>
        {[['overview','Gestionnaires'],['jours','Par jour'],['detail','Detail jobs']].map(([id,label]) => (
          <button key={id} style={tabStyle(activeTab===id)} onClick={() => setActiveTab(id)}>{label}</button>
        ))}
      </div>

      {activeTab === 'overview' && (
        <div style={{ borderRadius: 10, border: '1px solid #e5e7eb', overflow: 'hidden' }}>
          <div style={{ background: '#1A2B4A', color: '#fff', padding: '12px 16px', fontWeight: 700, fontSize: 14 }}>
            Performance par gestionnaire
          </div>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead><tr>
              <th style={th()}>Gestionnaire</th>
              <th style={th(true)}>Revenu</th>
              <th style={th(true)}>$/h</th>
              <th style={th(true)}>Pts/Jour</th>
              <th style={th(true)}>Pts Total</th>
              <th style={th(true)}>RDV</th>
              <th style={th(true)}>Heures</th>
              <th style={th(true)}>Jours</th>
              <th style={{ ...th(), minWidth: 120 }}>Performance</th>
            </tr></thead>
            <tbody>
              {byGest.map((g, i) => (
                <tr key={g.gestionnaire} style={{ background: i%2===0?'#fff':'#f9fafb' }}>
                  <td style={{ ...td(), fontWeight: 600, color: '#1A2B4A' }}>{g.gestionnaire}</td>
                  <td style={td(true)}>{fmt$(g.revenu)}</td>
                  <td style={{ ...td(true), color: g.dph == null ? '#888' : g.dph >= 120 ? '#16a34a' : '#ea580c', fontWeight: 600 }}>{g.dph != null ? '$'+fmtDec(g.dph,0) : '—'}</td>
                  <td style={{ ...td(true), fontWeight: 700, color: g.avgPtsJour >= 8 ? '#16a34a' : g.avgPtsJour >= 5 ? '#2563EB' : '#C0392B' }}>{fmtDec(g.avgPtsJour)}</td>
                  <td style={td(true)}>{fmtDec(g.pts, 1)}</td>
                  <td style={td(true)}>{g.rdv}</td>
                  <td style={{ ...td(true), color: '#555' }}>{g.totalHeures > 0 ? g.totalHeures.toFixed(1) + 'h' : '—'}</td>
                  <td style={td(true)}>{g.nbJours}</td>
                  <td style={td()}>
                    <ProgressBar val={g.avgPtsJour} max={8} color={g.avgPtsJour >= 8 ? '#16a34a' : g.avgPtsJour >= 5 ? '#2563EB' : '#C0392B'} />
                  </td>
                </tr>
              ))}
              {byGest.length === 0 && <tr><td colSpan={8} style={{ ...td(), textAlign: 'center', color: '#aaa' }}>Aucune donnee</td></tr>}
            </tbody>
          </table>
        </div>
      )}

      {activeTab === 'jours' && (
        <div style={{ borderRadius: 10, border: '1px solid #e5e7eb', overflow: 'hidden' }}>
          <div style={{ background: '#1A2B4A', color: '#fff', padding: '12px 16px', fontWeight: 700, fontSize: 14 }}>
            Performance par jour — {byDay.length} jours
          </div>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead><tr>
              <th style={th()}>Date</th>
              <th style={th(true)}>Pts/Jour</th>
              <th style={th(true)}>Revenu</th>
              <th style={th(true)}>RDV</th>
              <th style={{ ...th(), minWidth: 120 }}>Performance</th>
            </tr></thead>
            <tbody>
              {byDay.map((d, i) => (
                <tr key={d.dateStr} style={{ background: i%2===0?'#fff':'#f9fafb' }}>
                  <td style={td()}>{d.dateStr}</td>
                  <td style={{ ...td(true), fontWeight: 700, color: d.pts >= 8 ? '#16a34a' : d.pts >= 5 ? '#2563EB' : '#C0392B' }}>{fmtDec(d.pts)}</td>
                  <td style={td(true)}>{fmt$(d.revenu)}</td>
                  <td style={td(true)}>{d.rdv}</td>
                  <td style={td()}>
                    <ProgressBar val={d.pts} max={8} color={d.pts >= 8 ? '#16a34a' : d.pts >= 5 ? '#2563EB' : '#C0392B'} />
                  </td>
                </tr>
              ))}
              {byDay.length === 0 && <tr><td colSpan={5} style={{ ...td(), textAlign: 'center', color: '#aaa' }}>Aucune donnee</td></tr>}
            </tbody>
          </table>
        </div>
      )}

      {activeTab === 'detail' && (
        <div style={{ overflowX: 'auto', borderRadius: 10, border: '1px solid #e5e7eb' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead><tr>
              <th onClick={hs('dateStr')}    style={th()}>Date{arr('dateStr')}</th>
              <th onClick={hs('gestionnaire')} style={th()}>Gestionnaire{arr('gestionnaire')}</th>
              <th onClick={hs('jobNo')}      style={th()}>Job #{arr('jobNo')}</th>
              <th style={th()}>Services</th>
              <th onClick={hs('pts')}        style={th(true)}>Points{arr('pts')}</th>
              <th onClick={hs('revenu')}     style={th(true)}>Revenu{arr('revenu')}</th>
            </tr></thead>
            <tbody>
              {sorted.map((r, i) => (
                <tr key={i} style={{ background: i%2===0?'#fff':'#f9fafb' }}>
                  <td style={td()}>{r.dateStr}</td>
                  <td style={{ ...td(), fontWeight: 600, color: '#1A2B4A' }}>{r.gestionnaire}</td>
                  <td style={td()}>{r.jobNo}</td>
                  <td style={{ ...td(), fontSize: 12, color: '#555', maxWidth: 300, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.services}</td>
                  <td style={{ ...td(true), fontWeight: 700, color: r.pts >= 1 ? '#1E7D46' : '#888' }}>{r.pts}</td>
                  <td style={td(true)}>{fmt$(r.revenu)}</td>
                </tr>
              ))}
              {sorted.length === 0 && <tr><td colSpan={6} style={{ ...td(), textAlign: 'center', color: '#aaa' }}>Aucune donnee</td></tr>}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
