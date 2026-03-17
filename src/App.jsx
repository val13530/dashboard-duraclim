import { useState, useEffect, useMemo } from 'react';
import { fetchData } from './utils/parseData';
import CasaDashboard from './CasaDashboard';
import TechniciensDashboard from './TechniciensDashboard';
import { fetchHoursMap } from './utils/parseHours';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import Login from './Login';
import HelpPanel from './HelpPanel';


function dateStr(d) {
  if (!d) return '';
  return d.getFullYear() + '-' +
    String(d.getMonth() + 1).padStart(2, '0') + '-' +
    String(d.getDate()).padStart(2, '0');
}

function fmtMoney(v) { return '$' + v.toLocaleString('fr-CA', { maximumFractionDigits: 0 }); }

function KPICard({ label, value, sub, color = '#1A2B4A', bg = '#D6E4F0', warn }) {
  return (
    <div style={{ background: bg, borderRadius: 10, padding: '16px 20px', borderLeft: `4px solid ${color}`, minWidth: 150, flex: 1 }}>
      <div style={{ fontSize: 11, color: '#555', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5 }}>{label}</div>
      <div style={{ fontSize: 26, fontWeight: 800, color: warn ? '#C0392B' : color, marginTop: 4 }}>{value}</div>
      {sub && <div style={{ fontSize: 11, color: '#777', marginTop: 2 }}>{sub}</div>}
    </div>
  );
}

function Badge({ val, target = 8 }) {
  const pct = target > 0 ? val / target : 0;
  const bg = pct >= 1 ? '#D6F0E0' : pct >= 0.7 ? '#FFF9C4' : '#FDECEA';
  const color = pct >= 1 ? '#1E7D46' : pct >= 0.7 ? '#7B6000' : '#C0392B';
  return <span style={{ background: bg, color, borderRadius: 6, padding: '2px 8px', fontWeight: 700, fontSize: 13 }}>{val.toFixed(2)}</span>;
}

function ProgressBar({ val, max, color }) {
  const pct = max > 0 ? Math.min(val / max, 1) * 100 : 0;
  return (
    <div style={{ background: '#e5e7eb', borderRadius: 4, height: 8, width: '100%' }}>
      <div style={{ width: `${pct}%`, background: color, height: '100%', borderRadius: 4, transition: 'width 0.4s' }} />
    </div>
  );
}

function Table({ headers, rows, keyField }) {
  const [sortKey, setSortKey] = useState(null);
  const [sortDir, setSortDir] = useState('desc');

  const handleSort = (key) => {
    if (sortKey === key) { setSortDir(d => d === 'asc' ? 'desc' : 'asc'); }
    else { setSortKey(key); setSortDir('desc'); }
  };

  const sorted = useMemo(() => {
    if (!sortKey) return rows;
    return [...rows].sort((a, b) => {
      const av = a[sortKey]; const bv = b[sortKey];
      const an = typeof av === 'string' ? parseFloat(av.replace(/[$,\s]/g,'')) : av;
      const bn = typeof bv === 'string' ? parseFloat(bv.replace(/[$,\s]/g,'')) : bv;
      const ai = isNaN(an) ? av : an;
      const bi = isNaN(bn) ? bv : bn;
      if (ai < bi) return sortDir === 'asc' ? -1 : 1;
      if (ai > bi) return sortDir === 'asc' ? 1 : -1;
      return 0;
    });
  }, [rows, sortKey, sortDir]);

  return (
    <div style={{ overflowX: 'auto' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
        <thead>
          <tr>{headers.map(h => (
            <th key={h.key} onClick={() => handleSort(h.key)} style={{ background: '#1A2B4A', color: '#fff', padding: '10px 12px', textAlign: h.right ? 'right' : 'left', fontWeight: 600, fontSize: 12, whiteSpace: 'nowrap', cursor: 'pointer', userSelect: 'none' }}>
              {h.label} {sortKey === h.key ? (sortDir === 'asc' ? ' ▲' : ' ▼') : ' ↕'}
            </th>
          ))}</tr>
        </thead>
        <tbody>
          {sorted.map((row, i) => (
            <tr key={row[keyField] ?? i} style={{ background: i % 2 === 0 ? '#F5F7FA' : '#fff' }}>
              {headers.map(h => <td key={h.key} style={{ padding: '9px 12px', textAlign: h.right ? 'right' : 'left', borderBottom: '1px solid #e5e7eb', color: '#1A2B4A' }}>{row[h.key]}</td>)}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Section({ title, children }) {
  return (
    <div style={{ background: '#fff', borderRadius: 12, padding: 24, boxShadow: '0 1px 6px rgba(0,0,0,0.08)', marginBottom: 20 }}>
      <div style={{ fontSize: 13, fontWeight: 700, color: '#1A2B4A', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 16, borderBottom: '2px solid #E8A020', paddingBottom: 8 }}>{title}</div>
      {children}
    </div>
  );
}

export default function App() {
  const [user, setUser] = useState(() => {
    try { return JSON.parse(sessionStorage.getItem('duraclim_user')) || null; } catch { return null; }
  });

  const [allData, setAllData] = useState([]);
  const [casaAllRows, setCasaAllRows] = useState([]);
  const [hoursMap, setHoursMap] = useState({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [lastRefresh, setLastRefresh] = useState(null);
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [filterGest, setFilterGest] = useState('Tous');
  const [filterTech, setFilterTech] = useState('Tous');
  const [activeDept, setActiveDept] = useState(() => {
    const r = user?.role || '';
    if (['dispatch_casa'].includes(r)) return 'casa';
    if (['manager_tech'].includes(r)) return 'tech';
    return 'condo';
  });
  const [filterCondo, setFilterCondo] = useState('Tous');
  const [activeTab, setActiveTab] = useState('overview');

  const handleLogin = (u) => { sessionStorage.setItem('duraclim_user', JSON.stringify(u)); setUser(u); };
  const handleLogout = () => { sessionStorage.removeItem('duraclim_user'); setUser(null); setAllData([]); setHoursMap({}); };

  const isGestionnaire = user?.role === 'gestionnaire';
  const role = user?.role || '';
  const canSeeCondo = ['manager_condo', 'admin', 'gestionnaire', 'dispatch_condo'].includes(role);
  const canSeeTech  = ['admin', 'manager_condo', 'manager_tech'].includes(role);
  const canSeeCasa  = ['admin', 'dispatch_casa'].includes(role);
  const isManagerCondo = role === 'manager_condo';
  const isAdmin = user?.role === 'admin';

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const [data, hMap] = await Promise.all([fetchData(), fetchHoursMap()]);
      setAllData(data);
      setHoursMap(hMap);
      setLastRefresh(new Date());
      if (isGestionnaire && user.gestionnaireName) setFilterGest(user.gestionnaireName);
    } catch (e) {
      setError('Impossible de charger les donnees.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { if (user) load(); }, [user]);

  const gestionnaires = useMemo(() => {
    if (isGestionnaire) return [user.gestionnaireName];
    return ['Tous', ...new Set(allData.map(r => r.gestionnaire).filter(Boolean).sort())];
  }, [allData, user]);

  const techs = useMemo(() => ['Tous', ...new Set(allData.map(r => r.tech1).filter(Boolean).sort())], [allData]);
  const condos = useMemo(() => ['Tous', ...new Set(allData.map(r => r.condo).filter(Boolean).sort())], [allData]);

  const filtered = useMemo(() => {
    return allData.filter(r => {
      if (isGestionnaire && r.gestionnaire !== user.gestionnaireName) return false;
      if (!isGestionnaire && filterGest !== 'Tous' && r.gestionnaire !== filterGest) return false;
      if (filterTech !== 'Tous' && r.tech1 !== filterTech) return false;
      if (filterCondo !== 'Tous' && r.condo !== filterCondo) return false;
      if (dateFrom && dateStr(r.date) < dateFrom) return false;
      if (dateTo && dateStr(r.date) > dateTo) return false;
      return true;
    });
  }, [allData, filterGest, filterTech, filterCondo, dateFrom, dateTo, user]);

  // Get real hours for a gestionnaire from hoursMap
  // Returns null if no data available (pre-oct 2025)
  function getHeuresFromMap(gestionnaire, dateKey) {
    const key = dateKey + '_' + gestionnaire;
    return hoursMap[key] ?? null;
  }

  const kpis = useMemo(() => {
    if (!filtered.length) return null;
    const totalRevenu = filtered.reduce((s, r) => s + r.revenuReel, 0);
    const totalRDV = filtered.reduce((s, r) => s + r.rdvReel, 0);
    const totalRevenuPrevu = filtered.reduce((s, r) => s + r.revenuPrevu, 0);

    // Sum hours from hoursMap by unique date+gestionnaire combos
    const byDayGest = {};
    filtered.forEach(r => {
      if (!r.date) return;
      const dk = dateStr(r.date);
      const key = dk + '_' + r.gestionnaire;
      if (!byDayGest[key]) byDayGest[key] = { pts: 0, revenu: 0, gest: r.gestionnaire, dk };
      byDayGest[key].pts += r.pts;
      byDayGest[key].revenu += r.revenuReel;
    });

    // Build heures per day+gest: hoursMap first, fallback to heuresReel from filtered rows
    const heuresPerDayGest = {};
    filtered.forEach(r => {
      if (!r.date) return;
      const dk = dateStr(r.date);
      const key = dk + '_' + r.gestionnaire;
      if (!heuresPerDayGest[key]) heuresPerDayGest[key] = { hMap: null, hReel: 0, gest: r.gestionnaire, dk };
      heuresPerDayGest[key].hReel += r.heuresReel;
    });
    Object.keys(heuresPerDayGest).forEach(key => {
      const { gest, dk } = heuresPerDayGest[key];
      const h = hoursMap[dk + '_' + gest];
      if (h !== undefined) heuresPerDayGest[key].hMap = h;
    });
    let totalHeures = 0;
    Object.values(heuresPerDayGest).forEach(({ hMap, hReel }) => {
      totalHeures += hMap !== null ? hMap : hReel;
    });
    const dph = totalHeures > 0 ? totalRevenu / totalHeures : null;
    const ptsDayVals = Object.values(byDayGest).map(v => v.pts);
    const avgPtsDay = ptsDayVals.length > 0 ? ptsDayVals.reduce((a, b) => a + b, 0) / ptsDayVals.length : 0;
    const pctAbove8 = ptsDayVals.length > 0 ? (ptsDayVals.filter(v => v >= 8).length / ptsDayVals.length) * 100 : 0;
    // Rev moyen par technicien par jour
    const byDayTech = {};
    filtered.forEach(r => {
      if (!r.date || !r.tech1) return;
      const key = dateStr(r.date) + '_' + r.tech1;
      if (!byDayTech[key]) byDayTech[key] = 0;
      byDayTech[key] += r.revenuReel;
    });
    const techDayVals = Object.values(byDayTech);
    const avgRevTechJour = techDayVals.length > 0 ? techDayVals.reduce((a,b) => a+b, 0) / techDayVals.length : 0;
    return { totalRevenu, totalRDV, dph, totalRevenuPrevu, ecart: totalRevenu - totalRevenuPrevu, avgPtsDay, pctAbove8, nbJours: ptsDayVals.length, avgRevTechJour };
  }, [filtered, hoursMap]);

  const byGestionnaire = useMemo(() => {
    const map = {};
    filtered.forEach(r => {
      if (!r.gestionnaire) return;
      if (!map[r.gestionnaire]) map[r.gestionnaire] = { gestionnaire: r.gestionnaire, pts: 0, revenu: 0, rdv: 0, jours: new Set() };
      const g = map[r.gestionnaire];
      g.pts += r.pts; g.revenu += r.revenuReel; g.rdv += r.rdvReel;
      if (r.date) g.jours.add(dateStr(r.date));
    });
    return Object.values(map).map(g => {
      let totalH = 0;
      g.jours.forEach(dk => {
        const hMap = hoursMap[dk + '_' + g.gestionnaire];
        if (hMap !== undefined) {
          totalH += hMap;
        } else {
          // fallback: sum heuresReel for this gest+day from filtered
          filtered.filter(r => r.gestionnaire === g.gestionnaire && r.date && dateStr(r.date) === dk)
            .forEach(r => { totalH += r.heuresReel; });
        }
      });
      return {
        ...g,
        nbJours: g.jours.size,
        avgPtsJour: g.jours.size > 0 ? g.pts / g.jours.size : 0,
        dph: totalH > 0 ? g.revenu / totalH : null,
      };
    }).sort((a, b) => b.avgPtsJour - a.avgPtsJour);
  }, [filtered, hoursMap]);

  const byCondo = useMemo(() => {
    const map = {};
    filtered.forEach(r => {
      if (!r.condo) return;
      if (!map[r.condo]) map[r.condo] = { condo: r.condo, pts: 0, revenu: 0, rdv: 0, jours: new Set() };
      const c = map[r.condo];
      c.pts += r.pts; c.revenu += r.revenuReel; c.rdv += r.rdvReel;
      if (r.date) c.jours.add(dateStr(r.date));
    });
    return Object.values(map).map(c => ({
      ...c, nbJours: c.jours.size,
      revParRDV: c.rdv > 0 ? c.revenu / c.rdv : 0
    })).sort((a, b) => b.revenu - a.revenu);
  }, [filtered]);

  const byTechnicien = useMemo(() => {
    const map = {};
    filtered.forEach(r => {
      if (!r.tech1) return;
      if (!map[r.tech1]) map[r.tech1] = { tech: r.tech1, revenu: 0, heures: 0, rdv: 0, jours: new Set() };
      const t = map[r.tech1];
      t.revenu += r.revenuReel;
      t.heures += r.heuresReel;
      t.rdv += r.rdvReel;
      if (r.date) t.jours.add(dateStr(r.date));
    });
    return Object.values(map).map(t => ({
      ...t,
      nbJours: t.jours.size,
      dph: t.heures > 0 ? t.revenu / t.heures : null,
    })).sort((a, b) => b.revenu - a.revenu);
  }, [filtered]);

  const byCategorie = useMemo(() => {
    const map = {};
    filtered.forEach(r => {
      const cat = r.categorie;
      if (!map[cat]) map[cat] = { categorie: cat, pts: 0, revenu: 0, rdv: 0 };
      map[cat].pts += r.pts; map[cat].revenu += r.revenuReel; map[cat].rdv += r.rdvReel;
    });
    const total = filtered.reduce((s, r) => s + r.rdvReel, 0);
    return Object.values(map).map(c => ({
      ...c, pctRDV: total > 0 ? (c.rdv / total) * 100 : 0,
    })).sort((a, b) => b.rdv - a.rdv);
  }, [filtered]);

  if (!user) return <Login onLogin={setUser} />;

  const inputStyle = { border: '1px solid #D1D5DB', borderRadius: 6, padding: '6px 10px', fontSize: 13, color: '#1A2B4A', background: '#fff', outline: 'none', colorScheme: 'light' };
  const tabStyle = (active) => ({ padding: '8px 18px', borderRadius: 6, fontWeight: 600, fontSize: 13, cursor: 'pointer', border: 'none', transition: 'all 0.2s', background: active ? '#1A2B4A' : '#E5E7EB', color: active ? '#fff' : '#374151' });
  const roleLabel = isGestionnaire ? `Gestionnaire — ${user.gestionnaireName}` : isManagerCondo ? 'Manager Condo' : 'Admin';

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', background: '#F0F4F8' }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: 32, marginBottom: 12 }}>⏳</div>
        <div style={{ color: '#1A2B4A', fontWeight: 700, fontSize: 16 }}>Chargement...</div>
      </div>
    </div>
  );

  if (error) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', background: '#F0F4F8' }}>
      <div style={{ background: '#FDECEA', border: '1px solid #C0392B', borderRadius: 10, padding: 32, maxWidth: 400, textAlign: 'center' }}>
        <div style={{ fontSize: 32, marginBottom: 12 }}>⚠️</div>
        <div style={{ color: '#C0392B', fontWeight: 700 }}>{error}</div>
        <button onClick={load} style={{ marginTop: 16, background: '#1A2B4A', color: '#fff', border: 'none', borderRadius: 6, padding: '8px 20px', cursor: 'pointer', fontWeight: 600 }}>Reessayer</button>
      </div>
    </div>
  );

  return (
    <div style={{ fontFamily: 'Arial, sans-serif', background: '#F0F4F8', minHeight: '100vh', width: '100%' }}>
      <div style={{ background: '#1A2B4A', color: '#fff', padding: '16px 32px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <div style={{ fontSize: 18, fontWeight: 800, letterSpacing: 0.5 }}>DURACLIM — DASHBOARD {activeDept === 'casa' ? 'CASA' : 'CONDO'}</div>
          <div style={{ fontSize: 11, color: '#93C5FD', marginTop: 2 }}>{filtered.length} entrees · {lastRefresh ? `Mis a jour ${format(lastRefresh, 'HH:mm', { locale: fr })}` : ''} · <span style={{ background: '#2E4D7B', borderRadius: 4, padding: '1px 8px' }}>{roleLabel}</span></div>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginRight: 16 }}>
          {canSeeCondo && <button onClick={() => setActiveDept('condo')} style={{ background: activeDept === 'condo' ? '#E8A020' : 'transparent', color: '#fff', border: '1px solid #E8A020', borderRadius: 6, padding: '6px 16px', cursor: 'pointer', fontWeight: 700, fontSize: 13 }}>Condo</button>}
          {canSeeCasa  && <button onClick={() => setActiveDept('casa')}  style={{ background: activeDept === 'casa'  ? '#E8A020' : 'transparent', color: '#fff', border: '1px solid #E8A020', borderRadius: 6, padding: '6px 16px', cursor: 'pointer', fontWeight: 700, fontSize: 13 }}>Casa</button>}
          {canSeeTech  && <button onClick={() => setActiveDept('tech')}  style={{ background: activeDept === 'tech'  ? '#E8A020' : 'transparent', color: '#fff', border: '1px solid #E8A020', borderRadius: 6, padding: '6px 16px', cursor: 'pointer', fontWeight: 700, fontSize: 13 }}>Techniciens</button>}
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button onClick={load} style={{ background: '#E8A020', color: '#fff', border: 'none', borderRadius: 6, padding: '8px 16px', cursor: 'pointer', fontWeight: 700, fontSize: 13 }}>Actualiser</button>
          <button onClick={handleLogout} style={{ background: 'transparent', color: '#93C5FD', border: '1px solid #93C5FD', borderRadius: 6, padding: '8px 16px', cursor: 'pointer', fontWeight: 600, fontSize: 13 }}>Deconnexion</button>
        </div>
      </div>

      <div style={{ padding: '20px 24px' }}>
        {activeDept === 'tech' && canSeeTech ? <TechniciensDashboard role={role} condoRows={allData} dateFrom={dateFrom} dateTo={dateTo} setDateFrom={setDateFrom} setDateTo={setDateTo} /> : activeDept === 'casa' && canSeeCasa ? <CasaDashboard user={user} onCasaRowsLoaded={setCasaAllRows} /> : activeDept === 'condo' && canSeeCondo ? <>
        <Section title="Filtres">
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'flex-end' }}>
            <div><div style={{ fontSize: 11, fontWeight: 600, color: '#555', marginBottom: 4 }}>DATE DEBUT</div><input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} style={inputStyle} /></div>
            <div><div style={{ fontSize: 11, fontWeight: 600, color: '#555', marginBottom: 4 }}>DATE FIN</div><input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} style={inputStyle} /></div>
            {!isGestionnaire && <div><div style={{ fontSize: 11, fontWeight: 600, color: '#555', marginBottom: 4 }}>GESTIONNAIRE</div><select value={filterGest} onChange={e => setFilterGest(e.target.value)} style={inputStyle}>{gestionnaires.map(g => <option key={g}>{g}</option>)}</select></div>}
            <div><div style={{ fontSize: 11, fontWeight: 600, color: '#555', marginBottom: 4 }}>TECHNICIEN</div><select value={filterTech} onChange={e => setFilterTech(e.target.value)} style={inputStyle}>{techs.map(t => <option key={t}>{t}</option>)}</select></div>
            <div><div style={{ fontSize: 11, fontWeight: 600, color: '#555', marginBottom: 4 }}>CONDO</div><select value={filterCondo} onChange={e => setFilterCondo(e.target.value)} style={inputStyle}>{condos.map(c => <option key={c}>{c}</option>)}</select></div>
            <HelpPanel dept="condo" role={role} />
            <button onClick={() => { setDateFrom(''); setDateTo(''); if (!isGestionnaire) setFilterGest('Tous'); setFilterTech('Tous'); setFilterCondo('Tous'); }} style={{ ...inputStyle, background: '#E5E7EB', cursor: 'pointer', fontWeight: 600 }}>Reinitialiser</button>
          </div>
        </Section>

        {kpis && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, marginBottom: 20 }}>
            <KPICard label="Revenu Total" value={fmtMoney(kpis.totalRevenu)} sub={`Prevu: ${fmtMoney(kpis.totalRevenuPrevu)}`} color="#1E7D46" bg="#D6F0E0" />
            <KPICard label="Ecart Revenu" value={`${kpis.ecart >= 0 ? '+' : ''}${fmtMoney(kpis.ecart)}`} color={kpis.ecart >= 0 ? '#1E7D46' : '#C0392B'} bg={kpis.ecart >= 0 ? '#D6F0E0' : '#FDECEA'} warn={kpis.ecart < 0} />
            <KPICard label="$/h Moyen" value={kpis.dph !== null ? `$${kpis.dph.toFixed(0)}` : 'N/A'} sub={kpis.dph !== null ? 'Cible: $120/h' : 'Heures non disponibles'} color={kpis.dph === null ? '#6B7280' : kpis.dph >= 120 ? '#1E7D46' : '#E8A020'} bg={kpis.dph === null ? '#F3F4F6' : kpis.dph >= 120 ? '#D6F0E0' : '#FFF9C4'} />
            <KPICard label="Pts/Jour Moyen" value={kpis.avgPtsDay.toFixed(1)} sub={`Cible: 8 pts/j - ${kpis.pctAbove8.toFixed(0)}% des jours >=8`} color={kpis.avgPtsDay >= 8 ? '#1E7D46' : kpis.avgPtsDay >= 5 ? '#E8A020' : '#C0392B'} bg={kpis.avgPtsDay >= 8 ? '#D6F0E0' : kpis.avgPtsDay >= 5 ? '#FFF9C4' : '#FDECEA'} />
            <KPICard label="Total RDV" value={kpis.totalRDV.toFixed(0)} sub="RDV completes" />
            <KPICard label="Jours Analyses" value={kpis.nbJours} sub="Journees gestionnaire" />
            <KPICard label="Rev/Tech/Jour" value={fmtMoney(kpis.avgRevTechJour)} sub="Cible: $1 200/tech/jour" color={kpis.avgRevTechJour >= 1200 ? '#1E7D46' : kpis.avgRevTechJour >= 900 ? '#E8A020' : '#C0392B'} bg={kpis.avgRevTechJour >= 1200 ? '#D6F0E0' : kpis.avgRevTechJour >= 900 ? '#FFF9C4' : '#FDECEA'} />
          </div>
        )}

        <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
          {[['overview', 'Gestionnaires'], ['condos', 'Condos'], ['services', 'Mix Services'], ['techniciens', 'Techniciens']].map(([id, label]) => (
            <button key={id} style={tabStyle(activeTab === id)} onClick={() => setActiveTab(id)}>{label}</button>
          ))}
        </div>

        {activeTab === 'overview' && (
          <Section title="Performance par Gestionnaire">
            <Table keyField="gestionnaire" headers={[
              { key: 'gestionnaire', label: 'Gestionnaire' },
              { key: 'nbJours', label: 'Jours', right: true },
              { key: 'avgPtsJourBadge', label: 'Pts/Jour Moy.', right: true },
              { key: 'ptsTotal', label: 'Pts Total', right: true },
              { key: 'rdv', label: 'RDV Reels', right: true },
              { key: 'revenuFormatted', label: 'Revenu Reel', right: true },
              { key: 'dphFormatted', label: '$/h', right: true },
              { key: 'bar', label: 'Progression vs 8 pts' },
            ]} rows={byGestionnaire.map(g => ({
              gestionnaire: g.gestionnaire,
              nbJours: g.nbJours,
              avgPtsJourBadge: <Badge val={g.avgPtsJour} target={8} />,
              ptsTotal: g.pts.toFixed(1),
              rdv: g.rdv.toFixed(0),
              revenuFormatted: fmtMoney(g.revenu),
              dphFormatted: g.dph !== null ? `$${g.dph.toFixed(0)}/h` : 'N/A',
              bar: <div style={{ minWidth: 120 }}><ProgressBar val={g.avgPtsJour} max={8} color={g.avgPtsJour >= 8 ? '#1E7D46' : g.avgPtsJour >= 5 ? '#E8A020' : '#C0392B'} /></div>,
            }))} />
          </Section>
        )}

        {activeTab === 'condos' && (
          <Section title="Performance par Condo">
            <Table keyField="condo" headers={[
              { key: 'condo', label: 'Condo' },
              { key: 'nbJours', label: 'Jours', right: true },
              { key: 'rdv', label: 'RDV', right: true },
              { key: 'revenuFormatted', label: 'Revenu', right: true },
              { key: 'revParRDVFormatted', label: 'Rev/RDV', right: true },
              { key: 'ptsTotal', label: 'Pts Total', right: true },
            ]} rows={byCondo.map(c => ({
              condo: c.condo,
              nbJours: c.nbJours,
              rdv: c.rdv.toFixed(0),
              revenuFormatted: fmtMoney(c.revenu),
              revParRDVFormatted: `$${c.revParRDV.toFixed(0)}`,
              ptsTotal: c.pts.toFixed(1),
            }))} />
          </Section>
        )}

        {activeTab === 'techniciens' && (
          <Section title="Performance par Technicien">
            <Table keyField="tech" headers={[
              { key: 'tech', label: 'Technicien' },
              { key: 'nbJours', label: 'Jours', right: true },
              { key: 'rdv', label: 'RDV', right: true },
              { key: 'revenuFormatted', label: 'Revenu', right: true },
              { key: 'dphFormatted', label: '$/h', right: true },
              { key: 'bar', label: 'Rev/Jour' },
            ]} rows={byTechnicien.map(t => ({
              tech: t.tech,
              nbJours: t.nbJours,
              rdv: t.rdv.toFixed(0),
              revenuFormatted: fmtMoney(t.revenu),
              dphFormatted: t.dph !== null ? `${t.dph.toFixed(0)}/h` : 'N/A',
              bar: <div style={{ minWidth: 120 }}><ProgressBar val={t.nbJours > 0 ? t.revenu / t.nbJours : 0} max={1200} color={(t.nbJours > 0 ? t.revenu / t.nbJours : 0) >= 1200 ? '#1E7D46' : '#E8A020'} /></div>,
            }))} />
          </Section>
        )}

        {activeTab === 'services' && (
          <Section title="Mix de Services">
            <Table keyField="categorie" headers={[
              { key: 'categorie', label: 'Categorie' },
              { key: 'rdv', label: 'RDV', right: true },
              { key: 'pctRDVFormatted', label: '% RDV', right: true },
              { key: 'revenuFormatted', label: 'Revenu', right: true },
              { key: 'ptsTotal', label: 'Pts', right: true },
              { key: 'bar', label: 'Part des RDV' },
            ]} rows={byCategorie.map(c => ({
              categorie: c.categorie,
              rdv: c.rdv.toFixed(0),
              pctRDVFormatted: `${c.pctRDV.toFixed(1)}%`,
              revenuFormatted: fmtMoney(c.revenu),
              ptsTotal: c.pts.toFixed(1),
              bar: <div style={{ minWidth: 120 }}><ProgressBar val={c.pctRDV} max={100} color="#2E4D7B" /></div>,
            }))} />
          </Section>
        )}
          </> : null}
    </div>
    </div>
  );
}