import { useState, useEffect, useMemo } from 'react';
import { fetchTechData, computeTechStats, getAllTechRanking, getMonthKey } from './utils/parseTechData';
import { fetchHoursByTech, fetchHoursCasa, fetchHoursCondoTech } from './utils/parseHours';

function fmt(n) { return Math.round(n).toLocaleString('fr-CA'); }

function KpiCard({ label, value, sub, status }) {
  const colors = { green: '#16a34a', red: '#dc2626', neutral: '#1A2B4A', orange: '#ea580c', blue: '#2563EB' };
  const bgs = { green: '#dcfce7', red: '#fee2e2', neutral: '#D6E4F0', orange: '#ffedd5', blue: '#dbeafe' };
  const col = colors[status] || colors.neutral;
  const bg = bgs[status] || bgs.neutral;
  return (
    <div style={{ background: bg, borderRadius: 10, padding: '16px 20px', borderLeft: '4px solid ' + col, minWidth: 140, flex: 1 }}>
      <div style={{ fontSize: 11, color: '#555', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5 }}>{label}</div>
      <div style={{ fontSize: 28, fontWeight: 800, color: col, marginTop: 4 }}>{value}</div>
      {sub && <div style={{ fontSize: 11, color: '#777', marginTop: 2 }}>{sub}</div>}
    </div>
  );
}

export default function TechScoreboard({ user }) {
  const [jobs, setJobs] = useState([]);
  const [hoursMap, setHoursMap] = useState({});
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('perso');
  const [selectedTech, setSelectedTech] = useState('');
  const [sortCol, setSortCol] = useState('date');
  const [sortDir, setSortDir] = useState('desc');
  const [overviewSort, setOverviewSort] = useState('indicePtsH');
  const [overviewDir, setOverviewDir] = useState('desc');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  const role = user?.role || '';
  const isAdmin = ['admin', 'manager_tech'].includes(role);
  const myName = user?.username ? user.username.split(' ').slice(-2).join(' ') : '';

  useEffect(() => {
    Promise.all([fetchTechData(), fetchHoursCondoTech(), fetchHoursCasa()])
      .then(([d, hmCondo, hmCasa]) => {
        // Merge les deux maps — max par cle
        const merged = { ...hmCondo };
        Object.entries(hmCasa).forEach(([k, v]) => {
          merged[k] = Math.max(merged[k] || 0, v);
        });
        setJobs(d);
        console.log("hoursMap merged keys:", Object.keys(merged).length, "sample:", Object.keys(merged).slice(0,3)); setHoursMap(merged);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const techList = useMemo(() => [...new Set(jobs.map(j => j.tech))].sort(), [jobs]);

  const viewTech = isAdmin ? (selectedTech || techList[0] || '') : myName;
  const curMonth = getMonthKey(new Date());
  const filteredJobs = useMemo(() => jobs.filter(j => {
    if (dateFrom || dateTo) {
      if (dateFrom && j.dateStr < dateFrom) return false;
      if (dateTo   && j.dateStr > dateTo)   return false;
    } else {
      if (j.monthKey !== curMonth) return false;
    }
    return true;
  }), [jobs, dateFrom, dateTo, curMonth]);

  const stats = useMemo(() => {
    if (!viewTech) return null;
    const s = computeTechStats(filteredJobs, viewTech);
    const seen = new Set();
    let totalHeures = 0;
    s.myJobs.forEach(j => {
      const key = j.dateStr + '_' + viewTech;
      if (!seen.has(key)) { seen.add(key); totalHeures += hoursMap[key] || 0; }
    });
    const indicePtsH = totalHeures > 0 ? s.totalPts / totalHeures : s.indicePtsH;
    return { ...s, indicePtsH, totalHeures };
  }, [filteredJobs, viewTech, hoursMap]);
  const ranking = useMemo(() => getAllTechRanking(filteredJobs), [filteredJobs]);

  const allTechStats = useMemo(() => {
    return techList.map(tech => {
      const myJobs = filteredJobs.filter(j => j.tech === tech);
      const totalPts = myJobs.reduce((s,j) => s + j.pts, 0);
      const seen = new Set();
      let totalHeures = 0;
      myJobs.forEach(j => {
        const key = j.dateStr + '_' + tech;
        if (!seen.has(key)) { seen.add(key); totalHeures += hoursMap[key] || 0; }
      });
      const indicePtsH = totalHeures > 0 ? totalPts / totalHeures : null;
      const ecart = totalPts - 704;
      return { tech, totalPts, indicePtsH, totalJobs: myJobs.length, totalHeures, ecart };
    }).sort((a,b) => {
      const av = a[overviewSort] ?? -Infinity;
      const bv = b[overviewSort] ?? -Infinity;
      return overviewDir === 'desc' ? bv - av : av - bv;
    });
  }, [filteredJobs, techList, hoursMap, overviewSort, overviewDir]);

  const th = () => ({ background: '#1A2B4A', color: '#fff', padding: '10px 12px', fontWeight: 600, fontSize: 12, whiteSpace: 'nowrap', cursor: 'pointer', userSelect: 'none', textAlign: 'left' });
  const td = () => ({ padding: '9px 12px', fontSize: 13, borderBottom: '1px solid #f0f0f0', color: '#222' });
  const tabStyle = active => ({ padding: '8px 18px', borderRadius: 6, fontWeight: 600, fontSize: 13, cursor: 'pointer', border: 'none', background: active ? '#1A2B4A' : '#E5E7EB', color: active ? '#fff' : '#374151' });

  const sortedJobs = useMemo(() => {
    if (!stats) return [];
    return [...stats.myJobs].sort((a,b) => {
      if (sortCol === 'date') return sortDir === 'desc' ? b.date - a.date : a.date - b.date;
      if (sortCol === 'pts') return sortDir === 'desc' ? b.pts - a.pts : a.pts - b.pts;
      return 0;
    });
  }, [stats, sortCol, sortDir]);

  const hs = col => () => { if (sortCol === col) setSortDir(d => d === 'desc' ? 'asc' : 'desc'); else { setSortCol(col); setSortDir('desc'); } };
  const hos = col => () => { if (overviewSort === col) setOverviewDir(d => d === 'desc' ? 'asc' : 'desc'); else { setOverviewSort(col); setOverviewDir('desc'); } };
  const oarr = col => overviewSort === col ? (overviewDir === 'desc' ? ' v' : ' ^') : ' -';
  const arr = col => sortCol === col ? (sortDir === 'desc' ? ' v' : ' ^') : ' -';

  const cibleMois = 704;

  if (loading) return <div style={{ padding: 40, textAlign: 'center', color: '#888' }}>Chargement des données techniciens...</div>;

  return (
    <div style={{ padding: '0 24px 40px', maxWidth: 1200, margin: '0 auto' }}>
      <div style={{ marginBottom: 24, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
        <div>
          <div style={{ fontSize: 22, fontWeight: 700, color: '#1A2B4A' }}>Scoreboard Techniciens</div>
          <div style={{ fontSize: 13, color: '#888', marginTop: 2 }}>Système de performance DuraClim 2026</div>
        </div>

      </div>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, marginBottom: 20, background: '#f8fafc', borderRadius: 10, padding: '14px 20px', border: '1px solid #e5e7eb', alignItems: 'flex-end' }}>
        <div>
          <div style={{ fontSize: 11, color: '#666', marginBottom: 4 }}>Date début</div>
          <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} style={{ padding: '6px 10px', border: '1px solid #ddd', borderRadius: 6, fontSize: 13 }} />
        </div>
        <div>
          <div style={{ fontSize: 11, color: '#666', marginBottom: 4 }}>Date fin</div>
          <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} style={{ padding: '6px 10px', border: '1px solid #ddd', borderRadius: 6, fontSize: 13 }} />
        </div>
        <button onClick={() => { setDateFrom(''); setDateTo(''); }} style={{ padding: '6px 14px', border: '1px solid #ddd', borderRadius: 6, fontSize: 13, background: '#fff', cursor: 'pointer' }}>Réinitialiser</button>
        {(dateFrom || dateTo) && <div style={{ fontSize: 12, color: '#2563EB', fontWeight: 600, alignSelf: 'center' }}>Filtre actif</div>}
      </div>

      <div style={{ display: 'flex', gap: 8, marginBottom: 24, flexWrap: 'wrap' }}>
        {(isAdmin ? [['overview', 'Vue ensemble'], ['classement', 'Classement'], ['jobs', 'Détail jobs']] : [['perso', 'Ma performance'], ['classement', 'Classement'], ['jobs', 'Détail jobs']]).map(([id, label]) => (
          <button key={id} style={tabStyle(activeTab === id)} onClick={() => setActiveTab(id)}>{label}</button>
        ))}
      </div>

      {activeTab === 'overview' && isAdmin && (
        <div style={{ borderRadius: 10, border: '1px solid #e5e7eb', overflow: 'hidden' }}>
          <div style={{ background: '#1A2B4A', color: '#fff', padding: '12px 16px', fontWeight: 700, fontSize: 14 }}>
            Vue ensemble — {allTechStats.length} techniciens actifs
          </div>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead><tr>
              {[['tech','Technicien',false],['totalPts','Points',true],['ecart','vs Cible (704)',true],['indicePtsH','Indice pts/h',true],['totalHeures','Heures',true],['totalJobs','Jobs',true]].map(([col,label,right]) => (
                <th key={col} onClick={hos(col)} style={{ background: '#1A2B4A', color: '#fff', padding: '10px 12px', fontWeight: 600, fontSize: 12, textAlign: right ? 'right' : 'left', cursor: 'pointer', userSelect: 'none', whiteSpace: 'nowrap' }}>{label}{oarr(col)}</th>
              ))}
            </tr></thead>
            <tbody>
              {allTechStats.map((t, i) => (
                <tr key={t.tech} style={{ background: i%2===0?'#fff':'#f9fafb', cursor: 'pointer', color: '#222' }}
                  onClick={() => { setSelectedTech(t.tech); setActiveTab('perso'); }}>
                  <td style={{ padding: '9px 12px', fontSize: 13, borderBottom: '1px solid #f0f0f0', fontWeight: 600, color: '#1A2B4A' }}>{t.tech}</td>
                  <td style={{ padding: '9px 12px', fontSize: 13, borderBottom: '1px solid #f0f0f0', textAlign: 'right', fontWeight: 700, color: '#1A2B4A' }}>{fmt(t.totalPts)}</td>
                  <td style={{ padding: '9px 12px', fontSize: 13, borderBottom: '1px solid #f0f0f0', textAlign: 'right', fontWeight: 600, color: t.ecart >= 0 ? '#16a34a' : '#dc2626' }}>{t.ecart >= 0 ? '+' : ''}{fmt(t.ecart)}</td>
                  <td style={{ padding: '9px 12px', fontSize: 13, borderBottom: '1px solid #f0f0f0', textAlign: 'right', fontWeight: 700, color: t.indicePtsH >= 4 ? '#16a34a' : t.indicePtsH >= 3.5 ? '#ea580c' : '#dc2626' }}>{t.indicePtsH != null ? t.indicePtsH.toFixed(1) : "-"}</td>
                  <td style={{ padding: '9px 12px', fontSize: 13, borderBottom: '1px solid #f0f0f0', textAlign: 'right' }}>{t.totalHeures > 0 ? t.totalHeures.toFixed(1) + 'h' : '-'}</td>
                  <td style={{ padding: '9px 12px', fontSize: 13, borderBottom: '1px solid #f0f0f0', textAlign: 'right' }}>{t.totalJobs}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {activeTab === 'perso' && stats && (
        <>
          <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', marginBottom: 28 }}>
            <KpiCard label="Points cette semaine" value={fmt(stats.ptsWeek)} sub="Semaine en cours" status={stats.ptsWeek >= 176 ? 'green' : 'neutral'} />
            <KpiCard label="Points ce mois" value={fmt(stats.ptsMois)} sub={'Cible: ' + fmt(cibleMois) + ' pts'} status={stats.ptsMois >= cibleMois ? 'green' : stats.ptsMois >= cibleMois * 0.8 ? 'orange' : 'neutral'} />
            <KpiCard label="Indice pts/h" value={stats.indicePtsH != null ? stats.indicePtsH.toFixed(1) : "-"} sub="Cible: 4.0+" status={stats.indicePtsH >= 4 ? 'green' : stats.indicePtsH >= 3.8 ? 'orange' : 'neutral'} />
            <KpiCard label="Série sans pénalité" value={stats.serie} sub="Jobs consécutifs" status={stats.serie >= 20 ? 'green' : stats.serie >= 10 ? 'blue' : 'neutral'} />
            <KpiCard label="Rang ce mois" value={stats.rang > 0 ? stats.rang + ' / ' + stats.totalTechs : '-'} sub="Parmi les techniciens" status={stats.rang === 1 ? 'green' : stats.rang <= 3 ? 'blue' : 'neutral'} />
          </div>

          <div style={{ background: '#f8fafc', borderRadius: 10, padding: '20px 24px', border: '1px solid #e5e7eb', marginBottom: 24 }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: '#1A2B4A', marginBottom: 16, paddingBottom: 8, borderBottom: '2px solid #2563EB' }}>Bonification annuelle projetée</div>
            {[
              { seuil: 4.0, bonus: '+2.0%', label: 'Excellence', color: '#16a34a', bg: '#dcfce7' },
              { seuil: 3.8, bonus: '+1.5%', label: 'Très bonne exécution', color: '#2563EB', bg: '#dbeafe' },
              { seuil: 3.5, bonus: '+1.0%', label: 'Bonne exécution', color: '#ea580c', bg: '#ffedd5' },
              { seuil: 3.2, bonus: '+0.5%', label: 'Quelques irrégularités', color: '#d97706', bg: '#fef3c7' },
              { seuil: 0,   bonus: '+0%',   label: 'Pénalités chroniques', color: '#dc2626', bg: '#fee2e2' },
            ].map((row, i) => {
              const active = stats.indicePtsH >= row.seuil && (i === 0 || stats.indicePtsH < [4.0,3.8,3.5,3.2,999][i-1] || i === 4);
              return (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '8px 12px', borderRadius: 8, marginBottom: 6, background: active ? row.bg : 'transparent', border: active ? '2px solid ' + row.color : '2px solid transparent' }}>
                  <span style={{ fontWeight: 800, fontSize: 16, color: row.color, minWidth: 60 }}>{row.bonus}</span>
                  <span style={{ fontSize: 13, color: '#333' }}>{row.label}</span>
                  <span style={{ fontSize: 11, color: '#888', marginLeft: 'auto' }}>Indice ≥ {row.seuil}</span>
                  {active && <span style={{ fontSize: 12, fontWeight: 700, color: row.color }}>← Tu es ici</span>}
                </div>
              );
            })}
          </div>
        </>
      )}

      {activeTab === 'classement' && (
        <div style={{ borderRadius: 10, border: '1px solid #e5e7eb', overflow: 'hidden' }}>
          <div style={{ background: '#1A2B4A', color: '#fff', padding: '12px 16px', fontWeight: 700, fontSize: 14 }}>
            Classement du mois — {ranking.length} techniciens
          </div>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead><tr>
              <th style={{ ...th(), textAlign: 'center', width: 48 }}>Rang</th>
              <th style={th()}>Technicien</th>
              <th style={{ ...th(), textAlign: 'right' }}>Points</th>
              <th style={{ ...th(), textAlign: 'right' }}>Jobs</th>
              <th style={{ ...th(), textAlign: 'right' }}>vs Cible</th>
            </tr></thead>
            <tbody>
              {ranking.map((r, i) => {
                const isMe = r.tech === viewTech;
                const medal = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : (i+1) + '.';
                return (
                  <tr key={r.tech} style={{ background: isMe ? '#dbeafe' : i%2===0?'#fff':'#f9fafb' }}>
                    <td style={{ ...td(), textAlign: 'center', fontWeight: 700, fontSize: 16 }}>{medal}</td>
                    <td style={{ ...td(), fontWeight: isMe ? 700 : 400, color: isMe ? '#2563EB' : '#1A2B4A' }}>{r.tech}{isMe ? ' ← toi' : ''}</td>
                    <td style={{ ...td(), textAlign: 'right', fontWeight: 700, color: r.pts >= cibleMois ? '#16a34a' : '#1A2B4A' }}>{fmt(r.pts)}</td>
                    <td style={{ ...td(), textAlign: 'right' }}>{r.jobs}</td>
                    <td style={{ ...td(), textAlign: 'right', color: r.pts >= cibleMois ? '#16a34a' : '#dc2626', fontWeight: 600 }}>{r.pts >= cibleMois ? '+' : ''}{fmt(r.pts - cibleMois)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {activeTab === 'jobs' && stats && (
        <div style={{ borderRadius: 10, border: '1px solid #e5e7eb', overflow: 'hidden' }}>
          <div style={{ background: '#1A2B4A', color: '#fff', padding: '12px 16px', fontWeight: 700, fontSize: 14 }}>
            Détail des jobs — {stats.myJobs.length} jobs — {fmt(stats.totalPts)} pts total
          </div>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead><tr>
              <th onClick={hs('date')} style={th()}>Date{arr('date')}</th>
              <th style={th()}>Job #</th>
              <th style={th()}>Type</th>
              <th style={th()}>Services</th>
              <th onClick={hs('pts')} style={{ ...th(), textAlign: 'right' }}>Points{arr('pts')}</th>
            </tr></thead>
            <tbody>
              {sortedJobs.map((j, i) => (
                <tr key={i} style={{ background: i%2===0?'#fff':'#f9fafb' }}>
                  <td style={td()}>{j.dateStr}</td>
                  <td style={td()}>{j.jobNo}</td>
                  <td style={td()}>{j.type}</td>
                  <td style={{ ...td(), fontSize: 12, color: '#555', maxWidth: 300, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{j.services}</td>
                  <td style={{ ...td(), textAlign: 'right', fontWeight: 700, color: j.pts > 0 ? '#16a34a' : '#dc2626' }}>{j.pts > 0 ? '+' : ''}{j.pts}</td>
                </tr>
              ))}
              {sortedJobs.length === 0 && <tr><td colSpan={5} style={{ ...td(), textAlign: 'center', color: '#aaa' }}>Aucun job trouvé</td></tr>}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
