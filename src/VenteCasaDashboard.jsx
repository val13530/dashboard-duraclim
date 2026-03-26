import { useState, useEffect, useMemo } from 'react';
import Papa from 'papaparse';

const URL_PIPEDRIVE = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vQCs72VvdpQ8Qzc27lO0N77pWK5wgMuccF18dqHv1ObWBAG-5VaEeSl2g8nqQEIO9oH7c7U8_VZgaHA/pub?gid=618432091&single=true&output=csv';

const PIPELINES_CASA = ['Leads Cleaning 🐒', 'Cleaning 🧼', 'Customer Success ♻️', 'Casa Partnerships Cleaning 🧽', 'Commercial', 'DuraClim Ontario'];

function parseTimestamp(str) {
  if (!str) return null;
  const [datePart, timePart] = str.trim().split(' ');
  if (!datePart) return null;
  const parts = datePart.split('/');
  if (parts.length !== 3) return null;
  const [d, m, y] = parts;
  return new Date(`${y}-${m.padStart(2,'0')}-${d.padStart(2,'0')}T${timePart || '00:00:00'}`);
}

function toDateStr(d) {
  if (!d) return '';
  return d.getFullYear() + '-' + String(d.getMonth()+1).padStart(2,'0') + '-' + String(d.getDate()).padStart(2,'0');
}

function getWeekRange(d) {
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  const mon = new Date(d); mon.setDate(diff); mon.setHours(0,0,0,0);
  const sun = new Date(mon); sun.setDate(mon.getDate() + 6); sun.setHours(23,59,59,999);
  return [mon, sun];
}

function KpiCard({ label, value, sub, status }) {
  const colors = { green: '#16a34a', red: '#dc2626', neutral: '#1A2B4A', orange: '#ea580c', blue: '#2563EB' };
  const bgs = { green: '#dcfce7', red: '#fee2e2', neutral: '#D6E4F0', orange: '#ffedd5', blue: '#dbeafe' };
  const col = colors[status] || colors.neutral;
  const bg = bgs[status] || bgs.neutral;
  return (
    <div style={{ background: bg, borderRadius: 10, padding: '16px 20px', borderLeft: '4px solid ' + col, minWidth: 150, flex: 1 }}>
      <div style={{ fontSize: 11, color: '#555', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5 }}>{label}</div>
      <div style={{ fontSize: 28, fontWeight: 800, color: col, marginTop: 4 }}>{value}</div>
      {sub && <div style={{ fontSize: 11, color: '#777', marginTop: 2 }}>{sub}</div>}
    </div>
  );
}

function ConvBar({ won, lost }) {
  const total = won + lost;
  if (total === 0) return <span style={{ fontSize: 12, color: '#aaa' }}>—</span>;
  const pct = Math.round(won / total * 100);
  const col = pct >= 50 ? '#16a34a' : pct >= 30 ? '#ea580c' : '#dc2626';
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <div style={{ flex: 1, background: '#e5e7eb', borderRadius: 4, height: 8 }}>
        <div style={{ width: pct + '%', background: col, borderRadius: 4, height: 8, transition: 'width 0.3s' }} />
      </div>
      <span style={{ fontSize: 12, fontWeight: 700, color: col, minWidth: 36 }}>{pct}%</span>
    </div>
  );
}

export default function VenteCasaDashboard() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [periode, setPeriode] = useState('today');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [filterOwner, setFilterOwner] = useState('Tous');
  const [filterPipeline, setFilterPipeline] = useState('Tous');
  const [activeTab, setActiveTab] = useState('kpis');
  const [filterLogType, setFilterLogType] = useState('Tous');
  const [logSort, setLogSort] = useState('_date');
  const [logDir, setLogDir] = useState('desc');

  useEffect(() => {
    Papa.parse(URL_PIPEDRIVE, {
      download: true, header: true, skipEmptyLines: true,
      complete: ({ data }) => {
        const parsed = data.map(r => ({
          ...r,
          _date: parseTimestamp(r['Timestamp']),
          _dateStr: toDateStr(parseTimestamp(r['Timestamp'])),
          _pipeline: (r['Pipeline'] || '').trim(),
          _etape: (r['Étape'] || '').trim(),
          _champ: (r['Champ Modifié'] || '').trim(),
          _nouvelleValeur: (r['Nouvelle Valeur'] || '').trim(),
          _owner: (r['Propriétaire'] || r['Assigné À'] || '').trim(),
        })).filter(r => r._date && !isNaN(r._date));
        console.log("Pipedrive rows:", parsed.length, "sample:", parsed[0]); setRows(parsed);
        setLoading(false);
      },
      error: (err) => { console.error("Pipedrive fetch error:", err); setLoading(false); },
    });
  }, []);

  const owners = useMemo(() => ['Tous', ...new Set(rows.map(r => r._owner).filter(Boolean).sort())], [rows]);

  const filtered = useMemo(() => {
    const now = new Date();
    const todayStr = toDateStr(now);
    const [wMon, wSun] = getWeekRange(now);
    const monthStr = now.getFullYear() + '-' + String(now.getMonth()+1).padStart(2,'0');
    return rows.filter(r => {
      if (!r._date) return false;
      if (periode === 'today' && r._dateStr !== todayStr) return false;
      if (periode === 'week' && (r._date < wMon || r._date > wSun)) return false;
      if (periode === 'month' && !r._dateStr.startsWith(monthStr)) return false;
      if (periode === 'custom') {
        if (dateFrom && r._dateStr < dateFrom) return false;
        if (dateTo && r._dateStr > dateTo) return false;
      }
      if (filterOwner !== 'Tous' && r._owner !== filterOwner) return false;
      const PIPELINES_ACTIFS = ['Leads Cleaning 🐒', 'Cleaning 🧼 ', 'Cleaning 🧼', 'Customer Success ♻️', 'Casa Partnerships Cleaning 🧽', 'Commercial', 'DuraClim Ontario'];
      if (!PIPELINES_ACTIFS.some(p => r._pipeline.includes(p.replace(/\s+$/,'')) || p.includes(r._pipeline.replace(/\s+$/,'')))) return false;
      if (filterPipeline !== 'Tous' && !r._pipeline.includes(filterPipeline.replace(/\s+$/,'')) && !filterPipeline.includes(r._pipeline.replace(/\s+$/,''))) return false;
      return true;
    });
  }, [rows, periode, dateFrom, dateTo, filterOwner, filterPipeline]);

  // KPIs
  const leadsTraites = useMemo(() => filtered.filter(r =>
    r['Type'] === 'Deal' && r._etape === 'Answered -> Qualified Lead'
  ).length, [filtered]);

  const dealsWon = useMemo(() => filtered.filter(r =>
    r['Type'] === 'Deal' && (r['Action'] === 'Won' || (r._champ === 'status' && r._nouvelleValeur === 'Won'))
  ).length, [filtered]);

  const dealsLost = useMemo(() => filtered.filter(r =>
    r['Type'] === 'Deal' && (r['Action'] === 'Lost' || (r._champ === 'status' && r._nouvelleValeur.startsWith('Lost')))
  ).length, [filtered]);

  const activites = useMemo(() => filtered.filter(r =>
    r['Type'] === 'Activity' ||
    (r['Type'] === 'Deal' && r['Action'] === 'Change' && r._etape && r._etape !== '') ||
    (r['Type'] === 'Deal' && (r['Action'] === 'Won' || r['Action'] === 'Lost' || r._champ === 'status'))
  ).length, [filtered]);

  const tauxGlobal = (dealsWon + dealsLost) > 0 ? Math.round(dealsWon / (dealsWon + dealsLost) * 100) : null;

  // Par pipeline
  const byPipeline = useMemo(() => {
    const map = {};
    filtered.forEach(r => {
      const p = r._pipeline || 'Inconnu';
      if (!map[p]) map[p] = { pipeline: p, won: 0, lost: 0, leads: 0, activites: 0 };
      if (r['Type'] === 'Deal' && (r['Action'] === 'Won' || (r._champ === 'status' && r._nouvelleValeur === 'Won'))) map[p].won++;
      if (r['Type'] === 'Deal' && (r['Action'] === 'Lost' || (r._champ === 'status' && r._nouvelleValeur.startsWith('Lost')))) map[p].lost++;
      if (r['Type'] === 'Deal' && r._etape === 'Answered -> Qualified Lead') map[p].leads++;
      if (r['Type'] === 'Activity' || (r['Type'] === 'Deal' && r['Action'] === 'Change' && r._etape && r._etape !== '')) map[p].activites++;
    });
    return Object.values(map).sort((a,b) => (b.won+b.lost) - (a.won+a.lost));
  }, [filtered]);

  // Par vendeur
  const byOwner = useMemo(() => {
    const map = {};
    filtered.forEach(r => {
      const o = r._owner || 'Inconnu';
      if (!map[o]) map[o] = { owner: o, won: 0, lost: 0, leads: 0, activites: 0 };
      if (r['Type'] === 'Deal' && (r['Action'] === 'Won' || (r._champ === 'status' && r._nouvelleValeur === 'Won'))) map[o].won++;
      if (r['Type'] === 'Deal' && (r['Action'] === 'Lost' || (r._champ === 'status' && r._nouvelleValeur.startsWith('Lost')))) map[o].lost++;
      if (r['Type'] === 'Deal' && r._etape === 'Answered -> Qualified Lead') map[o].leads++;
      if (r['Type'] === 'Activity' || (r['Type'] === 'Deal' && r['Action'] === 'Change' && r._etape && r._etape !== '')) map[o].activites++;
    });
    return Object.values(map).sort((a,b) => b.won - a.won);
  }, [filtered]);

  const inp = { padding: '6px 10px', border: '1px solid #ddd', borderRadius: 6, fontSize: 13 };
  const th = (right=false) => ({ background: '#1A2B4A', color: '#fff', padding: '10px 12px', fontWeight: 600, fontSize: 12, textAlign: right?'right':'left', whiteSpace: 'nowrap' });
  const td = (right=false) => ({ padding: '9px 12px', fontSize: 13, borderBottom: '1px solid #f0f0f0', color: '#222', textAlign: right?'right':'left' });
  const tabStyle = active => ({ padding: '8px 18px', borderRadius: 6, fontWeight: 600, fontSize: 13, cursor: 'pointer', border: 'none', background: active ? '#1A2B4A' : '#E5E7EB', color: active ? '#fff' : '#374151' });

  if (loading) return <div style={{ padding: 40, textAlign: 'center', color: '#888' }}>Chargement des données Pipedrive...</div>;

  return (
    <div style={{ padding: '0 24px 40px', maxWidth: 1400, margin: '0 auto' }}>
      <div style={{ marginBottom: 20 }}>
        <div style={{ fontSize: 22, fontWeight: 700, color: '#1A2B4A' }}>Dashboard Vente — CASA</div>
        <div style={{ fontSize: 13, color: '#888', marginTop: 2 }}>{filtered.length} événements · {rows.length} total dans le log</div>
      </div>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, marginBottom: 24, background: '#f8fafc', borderRadius: 10, padding: '16px 20px', border: '1px solid #e5e7eb', alignItems: 'flex-end' }}>
        <div>
          <div style={{ fontSize: 11, color: '#666', marginBottom: 4 }}>Période</div>
          <select value={periode} onChange={e => setPeriode(e.target.value)} style={inp}>
            <option value="today">Aujourd'hui</option>
            <option value="week">Cette semaine</option>
            <option value="month">Ce mois</option>
            <option value="custom">Personnalisée</option>
          </select>
        </div>
        {periode === 'custom' && <>
          <div>
            <div style={{ fontSize: 11, color: '#666', marginBottom: 4 }}>Du</div>
            <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} style={inp} />
          </div>
          <div>
            <div style={{ fontSize: 11, color: '#666', marginBottom: 4 }}>Au</div>
            <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} style={inp} />
          </div>
        </>}
        <div>
          <div style={{ fontSize: 11, color: '#666', marginBottom: 4 }}>Vendeur</div>
          <select value={filterOwner} onChange={e => setFilterOwner(e.target.value)} style={inp}>
            {owners.map(o => <option key={o}>{o}</option>)}
          </select>
        </div>
        <div>
          <div style={{ fontSize: 11, color: '#666', marginBottom: 4 }}>Pipeline</div>
          <select value={filterPipeline} onChange={e => setFilterPipeline(e.target.value)} style={inp}>
            <option>Tous</option>
            {PIPELINES_CASA.map(p => <option key={p}>{p}</option>)}
          </select>
        </div>
        <button onClick={() => { setPeriode('today'); setFilterOwner('Tous'); setFilterPipeline('Tous'); setDateFrom(''); setDateTo(''); }} style={{ ...inp, background: '#fff', cursor: 'pointer' }}>Réinitialiser</button>
      </div>

      <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', marginBottom: 28 }}>
        <KpiCard label="Taux de conversion" value={tauxGlobal !== null ? tauxGlobal + '%' : '—'} sub={dealsWon + ' Won · ' + dealsLost + ' Lost · Open exclus'} status={tauxGlobal === null ? 'neutral' : tauxGlobal >= 50 ? 'green' : tauxGlobal >= 30 ? 'orange' : 'red'} />
        <KpiCard label="Leads traités" value={leadsTraites} sub="Answered → Qualified Lead" status="neutral" />
        <KpiCard label="Won" value={dealsWon} sub="Deals closés" status={dealsWon > 0 ? 'green' : 'neutral'} />
        <KpiCard label="Lost" value={dealsLost} sub="Deals perdus" status={dealsLost > 0 ? 'red' : 'neutral'} />
        <KpiCard label="Activités" value={activites} sub="Changements d'étape" status={activites > 0 ? 'blue' : 'neutral'} />
      </div>

      <div style={{ display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap' }}>
        {[['kpis','Par pipeline'],['vendeurs','Par vendeur'],['log','Log événements'],['regles','Règles métier']].map(([id,label]) => (
          <button key={id} style={tabStyle(activeTab===id)} onClick={() => setActiveTab(id)}>{label}</button>
        ))}
      </div>

      {activeTab === 'kpis' && (
        <div style={{ borderRadius: 10, border: '1px solid #e5e7eb', overflow: 'hidden' }}>
          <div style={{ background: '#1A2B4A', color: '#fff', padding: '12px 16px', fontWeight: 700, fontSize: 14 }}>Taux de conversion par pipeline — Won / (Won + Lost)</div>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead><tr>
              <th style={th()}>Pipeline</th>
              <th style={th(true)}>Won</th>
              <th style={th(true)}>Lost</th>
              <th style={th(true)}>Total fermés</th>
              <th style={{ ...th(), minWidth: 160 }}>Taux</th>
            </tr></thead>
            <tbody>
              {byPipeline.map((p, i) => (
                <tr key={p.pipeline} style={{ background: i%2===0?'#fff':'#f9fafb' }}>
                  <td style={{ ...td(), fontWeight: 600, color: '#1A2B4A' }}>{p.pipeline}</td>
                  <td style={{ ...td(true), color: '#16a34a', fontWeight: 700 }}>{p.won}</td>
                  <td style={{ ...td(true), color: '#dc2626', fontWeight: 700 }}>{p.lost}</td>
                  <td style={td(true)}>{p.won + p.lost}</td>
                  <td style={td()}><ConvBar won={p.won} lost={p.lost} /></td>
                </tr>
              ))}
              {byPipeline.length === 0 && <tr><td colSpan={5} style={{ ...td(), textAlign: 'center', color: '#aaa' }}>Aucune donnée sur cette période</td></tr>}
            </tbody>
          </table>
        </div>
      )}

      {activeTab === 'vendeurs' && (
        <div style={{ borderRadius: 10, border: '1px solid #e5e7eb', overflow: 'hidden' }}>
          <div style={{ background: '#1A2B4A', color: '#fff', padding: '12px 16px', fontWeight: 700, fontSize: 14 }}>Performance par vendeur</div>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead><tr>
              <th style={th()}>Vendeur</th>
              <th style={th(true)}>Leads traités</th>
              <th style={th(true)}>Won</th>
              <th style={th(true)}>Lost</th>
              <th style={th(true)}>Activités</th>
              <th style={{ ...th(), minWidth: 160 }}>Taux Won/(W+L)</th>
            </tr></thead>
            <tbody>
              {byOwner.map((o, i) => (
                <tr key={o.owner} style={{ background: i%2===0?'#fff':'#f9fafb' }}>
                  <td style={{ ...td(), fontWeight: 600, color: '#1A2B4A' }}>{o.owner}</td>
                  <td style={td(true)}>{o.leads}</td>
                  <td style={{ ...td(true), color: '#16a34a', fontWeight: 700 }}>{o.won}</td>
                  <td style={{ ...td(true), color: '#dc2626', fontWeight: 700 }}>{o.lost}</td>
                  <td style={td(true)}>{o.activites}</td>
                  <td style={td()}><ConvBar won={o.won} lost={o.lost} /></td>
                </tr>
              ))}
              {byOwner.length === 0 && <tr><td colSpan={6} style={{ ...td(), textAlign: 'center', color: '#aaa' }}>Aucune donnée</td></tr>}
            </tbody>
          </table>
        </div>
      )}

      {activeTab === 'log' && (
        <div style={{ overflowX: 'auto', borderRadius: 10, border: '1px solid #e5e7eb' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead><tr>
              {[['_date','Timestamp'],['Type','Type'],['Deal Title','Deal'],['_pipeline','Pipeline'],['_etape','Étape'],['_owner','Propriétaire'],['_champ','Champ modifié'],['_nouvelleValeur','Nouvelle valeur']].map(([col,label]) => (
                <th key={col} onClick={() => { if(logSort===col) setLogDir(d=>d==='desc'?'asc':'desc'); else {setLogSort(col); setLogDir('desc');} }}
                  style={{ ...th(), cursor: 'pointer', userSelect: 'none' }}>
                  {label}{logSort===col?(logDir==='desc'?' v':' ^'):' -'}
                </th>
              ))}
            </tr></thead>
            <tbody>
              {[...filtered].sort((a,b) => {
                const av = logSort === '_date' ? a._date : (a[logSort] || '');
                const bv = logSort === '_date' ? b._date : (b[logSort] || '');
                if (logSort === '_date') return logDir === 'desc' ? bv - av : av - bv;
                return logDir === 'desc' ? String(bv).localeCompare(String(av)) : String(av).localeCompare(String(bv));
              }).slice(0,300).map((r,i) => {
                const isWon = r._champ === 'Statut' && r._nouvelleValeur === 'Won';
                const isLost = r._champ === 'Statut' && r._nouvelleValeur === 'Lost';
                const isLead = r._etape === 'Answered -> Qualified Lead';
                return (
                  <tr key={i} style={{ background: isWon ? '#dcfce7' : isLost ? '#fee2e2' : i%2===0?'#fff':'#f9fafb' }}>
                    <td style={{ ...td(), fontSize: 11, color: '#555', whiteSpace: 'nowrap' }}>{r['Timestamp']}</td>
                    <td style={td()}><span style={{ background: r['Type']==='Activity'?'#dbeafe':'#e0f2fe', color: r['Type']==='Activity'?'#1d4ed8':'#0369a1', borderRadius: 4, padding: '2px 6px', fontSize: 11 }}>{r['Type']}</span></td>
                    <td style={{ ...td(), maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontWeight: 500 }}>{r['Deal Title']}</td>
                    <td style={{ ...td(), fontSize: 11 }}>{r._pipeline}</td>
                    <td style={{ ...td(), fontSize: 11, color: isLead ? '#2563EB' : '#555', fontWeight: isLead ? 700 : 400 }}>{r._etape}</td>
                    <td style={td()}>{r._owner}</td>
                    <td style={{ ...td(), fontSize: 11 }}>{r._champ}</td>
                    <td style={{ ...td(), fontSize: 11, fontWeight: (isWon||isLost) ? 700 : 400, color: isWon ? '#16a34a' : isLost ? '#dc2626' : '#222' }}>{r._nouvelleValeur}</td>
                  </tr>
                );
              })}
              {filtered.length === 0 && <tr><td colSpan={8} style={{ ...td(), textAlign: 'center', color: '#aaa' }}>Aucun événement</td></tr>}
            </tbody>
          </table>
        </div>
      )}

      {activeTab === 'regles' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          {[
            { pipeline: 'Leads Cleaning 🐒', couleur: '#ea580c', regles: ['7j inactivité en Last Chance Promo → Lost', 'Réponse à n\'importe quelle étape → Answered → Qualified Lead → bascule dans Cleaning'] },
            { pipeline: 'Cleaning 🧼', couleur: '#2563EB', regles: ['21j inactivité en Last Chance Promo → Lost', 'Booked Client = Won automatique', 'Lost on First Contact = Lost direct', 'Open = deal encore actif (exclu du taux de conversion)'] },
            { pipeline: 'Customer Success ♻️', couleur: '#16a34a', regles: ['7j inactivité Last Chance Promo → Lost', 'Never Call Again → Lost sans Retry', 'Next Year → Lost + nouveau deal dans 1 an', 'Answered → Follow Up dans Cleaning'] },
            { pipeline: 'Casa Yearly Repeat', couleur: '#7c3aed', regles: ['Try 1→4 : relances annuelles clients nettoyés', 'Next Year → Lost + recréation deal', 'Never Call Again → stop total', 'Booked Client = Won'] },
            { pipeline: 'Casa Partnerships Cleaning 🧽', couleur: '#0891b2', regles: ['Prospect → Try 1,2,3 si pas de réponse', '21j en Last Chance → Lost', 'Not Interested → Lost + Retry dans Customer Success', 'Next Year → Lost + Future Prospects', 'Booked = Won'] },
          ].map(({ pipeline, couleur, regles }) => (
            <div key={pipeline} style={{ borderRadius: 10, border: '1px solid #e5e7eb', overflow: 'hidden' }}>
              <div style={{ background: couleur, color: '#fff', padding: '10px 16px', fontWeight: 700, fontSize: 13 }}>{pipeline}</div>
              <div style={{ padding: '12px 16px' }}>
                {regles.map((r, i) => (
                  <div key={i} style={{ fontSize: 13, color: '#333', marginBottom: 6, paddingLeft: 12, borderLeft: '3px solid ' + couleur }}>{r}</div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
