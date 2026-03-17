import { useState, useEffect, useMemo } from 'react';
import { fetchCasaData, filterCasaRows, computeCasaKpis, groupByTechnicien } from './utils/parseCasaData';
import HelpPanel from './HelpPanel';

// ─── Thresholds ────────────────────────────────────────────────────────────────
const SEUIL_DOLLAR_H    = 120;   // $/h cible
const SEUIL_REV_JOUR    = 1200;  // $ revenu/jour cible
const SEUIL_DOLLAR_KM   = 3.5;   // $/km cible (à ajuster selon données réelles)

// ─── Helpers ────────────────────────────────────────────────────────────────
const fmt$   = v => v === null || v === undefined ? '—' : `$${Number(v).toLocaleString('fr-CA', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
const fmtDec = (v, d = 2) => v === null || v === undefined ? '—' : Number(v).toFixed(d);
const fmtPct = v => v === null || v === undefined ? '—' : `${Number(v).toFixed(1)}%`;

function KpiCard({ label, value, sub, status }) {
  const colors = { green: '#16a34a', red: '#dc2626', neutral: '#1A2B4A' };
  const bg     = { green: '#f0fdf4', red: '#fef2f2', neutral: '#f0f4ff' };
  const c = status || 'neutral';
  return (
    <div style={{
      background: bg[c], border: `1.5px solid ${colors[c]}22`,
      borderRadius: 10, padding: '16px 20px', minWidth: 160, flex: '1 1 160px',
    }}>
      <div style={{ fontSize: 11, color: '#666', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 4 }}>{label}</div>
      <div style={{ fontSize: 26, fontWeight: 700, color: colors[c] }}>{value}</div>
      {sub && <div style={{ fontSize: 11, color: '#888', marginTop: 4 }}>{sub}</div>}
    </div>
  );
}

function SortableHeader({ label, col, sortCol, sortDir, onSort }) {
  const active = sortCol === col;
  return (
    <th onClick={() => onSort(col)} style={{ cursor: 'pointer', userSelect: 'none',
      padding: '10px 12px', background: '#1A2B4A', color: '#fff', fontWeight: 600,
      fontSize: 12, textAlign: 'left', whiteSpace: 'nowrap' }}>
      {label} {active ? (sortDir === 'desc' ? ' ▼' : ' ▲') : ' ↕'}
    </th>
  );
}

function StatusDot({ value, seuil, inverse = false }) {
  if (value === null || value === undefined) return <span style={{ color: '#aaa' }}>—</span>;
  const ok = inverse ? value <= seuil : value >= seuil;
  return <span style={{ color: ok ? '#16a34a' : '#dc2626', fontWeight: 600 }}>{fmtDec(value, 1)}</span>;
}

export default function CasaDashboard({ onCasaRowsLoaded, user }) {
  const [allRows,    setAllRows]    = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [error,      setError]      = useState(null);

  // Filtres
  const [dateFrom,   setDateFrom]   = useState('');
  const [dateTo,     setDateTo]      = useState('');
  const [techFilter, setTechFilter] = useState([]);
  const [searchTech, setSearchTech] = useState('');
  const toggleTech = (t) => setTechFilter(prev => prev.includes(t) ? prev.filter(x => x !== t) : [...prev, t]);
  const [excludedTechs, setExcludedTechs] = useState([]);
  const toggleExclude = (t) => setExcludedTechs(prev => prev.includes(t) ? prev.filter(x => x !== t) : [...prev, t]);
  const [searchExclude, setSearchExclude] = useState('');
  const [excludeMixte, setExcludeMixte] = useState(false);

  // Tri tableau techniciens
  const [sortCol,    setSortCol]    = useState('revenuReel');
  const [sortDir,    setSortDir]    = useState('desc');

  // Tri tableau détail
  const [detailSort,    setDetailSort]    = useState('dateStr');
  const [detailSortDir, setDetailSortDir] = useState('desc');

  const [activeTab, setActiveTab] = useState('summary');

  useEffect(() => {
    fetchCasaData()
      .then(rows => { setAllRows(rows); setLoading(false); })
      .catch(e   => { setError(String(e)); setLoading(false); });
  }, []);

  const techniciens = useMemo(() =>
    [...new Set(allRows.map(r => r.technicien))].sort(), [allRows]);

  const filtered = useMemo(() =>
    filterCasaRows(allRows, { dateFrom, dateTo, techniciens: techFilter }),
    [allRows, dateFrom, dateTo, techFilter]);

  const filteredForKpis = useMemo(() => filtered.filter(r => excludedTechs.indexOf(r.technicien) === -1 && (excludeMixte ? !r.isMixte : true)), [filtered, excludedTechs, excludeMixte]);
  const kpis = useMemo(() => computeCasaKpis(filteredForKpis), [filteredForKpis]);

  const byTech = useMemo(() => {
    const data = groupByTechnicien(filteredForKpis);
    return [...data].sort((a, b) => {
      const av = a[sortCol] ?? -Infinity;
      const bv = b[sortCol] ?? -Infinity;
      return sortDir === 'desc' ? bv - av : av - bv;
    });
  }, [filtered, sortCol, sortDir]);

  const detailRows = useMemo(() => {
    return [...filtered].sort((a, b) => {
      const av = a[detailSort] ?? '';
      const bv = b[detailSort] ?? '';
      if (typeof av === 'string') return detailSortDir === 'desc' ? bv.localeCompare(av) : av.localeCompare(bv);
      return detailSortDir === 'desc' ? (bv - av) : (av - bv);
    });
  }, [filtered, detailSort, detailSortDir]);

  function handleSort(col) {
    if (sortCol === col) setSortDir(d => d === 'desc' ? 'asc' : 'desc');
    else { setSortCol(col); setSortDir('desc'); }
  }

  function handleDetailSort(col) {
    if (detailSort === col) setDetailSortDir(d => d === 'desc' ? 'asc' : 'desc');
    else { setDetailSort(col); setDetailSortDir('desc'); }
  }

  const ecartRev   = kpis.totalRevenuReel - kpis.totalRevenuPrevu;
  const statusH    = kpis.avgDollarH   !== null ? (kpis.avgDollarH   >= SEUIL_DOLLAR_H  ? 'green' : 'red') : 'neutral';
  const statusKm   = kpis.avgDollarKm  !== null ? (kpis.avgDollarKm  >= SEUIL_DOLLAR_KM ? 'green' : 'red') : 'neutral';
  const statusEcart= ecartRev >= 0 ? 'green' : 'red';

  if (loading) return <div style={{ padding: 40, color: '#555' }}>Chargement des données Casa…</div>;
  if (error)   return <div style={{ padding: 40, color: '#dc2626' }}>Erreur : {error}</div>;

  const cellStyle = { padding: '9px 12px', fontSize: 13, borderBottom: '1px solid #f0f0f0', color: '#222' };
  const tabStyle  = (active) => ({
    padding: '8px 20px', border: 'none', borderRadius: 6, cursor: 'pointer', fontWeight: 600,
    fontSize: 13, background: active ? '#1A2B4A' : '#e5e9f0', color: active ? '#fff' : '#333',
  });

  return (
    <div style={{ fontFamily: 'Inter, Arial, sans-serif', padding: '24px', maxWidth: 1300, margin: '0 auto' }}>

      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <div style={{ fontSize: 22, fontWeight: 700, color: '#1A2B4A' }}>Dashboard Casa</div>
        <div style={{ fontSize: 13, color: '#888', marginTop: 2 }}>Performance techniciens &amp; qualité dispatch</div>
      </div>

      {/* Filtres */}
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 24, alignItems: 'flex-end' }}>
        <div>
          <div style={{ fontSize: 11, color: '#666', marginBottom: 4 }}>Du</div>
          <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)}
            style={{ padding: '6px 10px', border: '1px solid #ddd', borderRadius: 6, fontSize: 13 }} />
        </div>
        <div>
          <div style={{ fontSize: 11, color: '#666', marginBottom: 4 }}>Au</div>
          <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)}
            style={{ padding: '6px 10px', border: '1px solid #ddd', borderRadius: 6, fontSize: 13 }} />
        </div>
        <div style={{ position: 'relative' }}>
          <div style={{ fontSize: 11, color: '#666', marginBottom: 4 }}>Technicien</div>
          <details style={{ position: 'relative' }}>
            <summary style={{ padding: '6px 10px', border: '1px solid #ddd', borderRadius: 6, fontSize: 13, cursor: 'pointer', listStyle: 'none', background: '#fff', minWidth: 180, userSelect: 'none' }}>
              {techFilter.length === 0 ? 'Tous les techniciens' : techFilter.length === 1 ? techFilter[0] : techFilter.length + ' sélectionnés'}
            </summary>
            <div style={{ position: 'absolute', zIndex: 100, top: '100%', left: 0, background: '#fff', border: '1px solid #ddd', borderRadius: 6, boxShadow: '0 4px 12px rgba(0,0,0,0.12)', minWidth: 220, marginTop: 2 }}>
              <div style={{ padding: '8px 10px', borderBottom: '1px solid #f0f0f0' }}>
                <input
                  type='text'
                  placeholder='Rechercher...'
                  value={searchTech}
                  onChange={e => setSearchTech(e.target.value)}
                  onClick={e => e.stopPropagation()}
                  style={{ width: '100%', padding: '5px 8px', border: '1px solid #ddd', borderRadius: 4, fontSize: 13, boxSizing: 'border-box' }}
                />
              </div>
              <div style={{ maxHeight: 200, overflowY: 'auto', padding: '4px 0' }}>
                {techniciens.filter(t => t.toLowerCase().startsWith(searchTech.toLowerCase())).map(t => (
                  <label key={t} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '5px 12px', cursor: 'pointer', background: techFilter.indexOf(t) !== -1 ? '#eff6ff' : 'transparent' }}>
                    <input type='checkbox' checked={techFilter.indexOf(t) !== -1} onChange={() => toggleTech(t)} />
                    <span style={{ fontSize: 13, color: techFilter.indexOf(t) !== -1 ? '#1d4ed8' : '#333' }}>{t}</span>
                  </label>
                ))}
              </div>
            </div>
          </details>
        </div>
        <div style={{ position: 'relative' }}>
          <div style={{ fontSize: 11, color: '#666', marginBottom: 4 }}>Exclure des KPIs</div>
          <details style={{ position: 'relative' }}>
            <summary style={{ padding: '6px 10px', border: '1px solid #ddd', borderRadius: 6, fontSize: 13, cursor: 'pointer', listStyle: 'none', background: '#fff', minWidth: 180, userSelect: 'none' }}>
              {excludedTechs.length === 0 ? 'Aucune exclusion' : `${excludedTechs.length} exclu${excludedTechs.length > 1 ? 's' : ''}`}
            </summary>
            <div style={{ position: 'absolute', zIndex: 100, top: '100%', left: 0, background: '#fff', border: '1px solid #ddd', borderRadius: 6, boxShadow: '0 4px 12px rgba(0,0,0,0.12)', minWidth: 220, marginTop: 2 }}>
              <div style={{ padding: '8px 10px', borderBottom: '1px solid #f0f0f0' }}>
                <input
                  type='text'
                  placeholder='Rechercher...'
                  value={searchExclude}
                  onChange={e => setSearchExclude(e.target.value)}
                  onClick={e => e.stopPropagation()}
                  style={{ width: '100%', padding: '5px 8px', border: '1px solid #ddd', borderRadius: 4, fontSize: 13, boxSizing: 'border-box' }}
                />
              </div>
              <div style={{ maxHeight: 200, overflowY: 'auto', padding: '4px 0' }}>
                {techniciens.filter(t => t.toLowerCase().startsWith(searchExclude.toLowerCase())).map(t => (
                  <label key={t} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '5px 12px', cursor: 'pointer', background: excludedTechs.indexOf(t) !== -1 ? '#fef2f2' : 'transparent' }}>
                    <input type='checkbox' checked={excludedTechs.indexOf(t) !== -1} onChange={() => toggleExclude(t)} />
                    <span style={{ fontSize: 13, color: excludedTechs.indexOf(t) !== -1 ? '#dc2626' : '#333' }}>{t}</span>
                  </label>
                ))}
              </div>
            </div>
          </details>
        </div>
        <div>
          <div style={{ fontSize: 11, color: '#666', marginBottom: 4 }}>Mixte / Ticket</div>
          <button
            onClick={() => setExcludeMixte(prev => !prev)}
            style={{ padding: '6px 14px', borderRadius: 6, border: '1px solid #ddd', fontSize: 13, cursor: 'pointer', background: excludeMixte ? '#1A2B4A' : '#fff', color: excludeMixte ? '#fff' : '#333', fontWeight: excludeMixte ? 600 : 400, transition: 'all 0.15s' }}
          >
            {excludeMixte ? 'Exclus ✓' : 'Inclus'}
          </button>
        </div>
        <HelpPanel dept="casa" role={user?.role || 'admin'} />
        <button onClick={() => { setDateFrom(''); setDateTo(''); setTechFilter([]); setExcludedTechs([]); setExcludeMixte(false); }}
          style={{ padding: '6px 14px', border: '1px solid #ddd', borderRadius: 6, fontSize: 13,
            background: '#fff', cursor: 'pointer', color: '#555', alignSelf: 'flex-end' }}>
          Réinitialiser
        </button>
        <div style={{ marginLeft: 'auto', fontSize: 12, color: '#888', alignSelf: 'flex-end' }}>
          {filtered.length} journée{filtered.length > 1 ? 's' : ''} affichée{filtered.length > 1 ? 's' : ''}
        </div>
      </div>

      {/* KPI Cards */}
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 28 }}>
        <KpiCard
          label="Revenu réel total"
          value={fmt$(kpis.totalRevenuReel)}
          sub={`Prévu : ${fmt$(kpis.totalRevenuPrevu)}`}
          status="neutral"
        />
        <KpiCard
          label="Écart revenu"
          value={`${ecartRev >= 0 ? '+' : ''}${fmt$(ecartRev)}`}
          sub="Råel vs prévu"
          status={statusEcart}
        />
        <KpiCard
          label="$/h moyen"
          value={kpis.avgDollarH !== null ? `$${fmtDec(kpis.avgDollarH, 0)}/h` : '—'}
          sub={`Cible : $${SEUIL_DOLLAR_H}/h`}
          status={statusH}
        />
        <KpiCard
          label="$/km moyen"
          value={kpis.avgDollarKm !== null ? `$${fmtDec(kpis.avgDollarKm, 2)}/km` : '—'}
          sub={`Cible : $${SEUIL_DOLLAR_KM}/km`}
          status={statusKm}
        />
        <KpiCard
          label="Rev. / tech / jour"
          value={kpis.totalJours > 0 ? fmt$(kpis.totalRevenuReel / kpis.totalJours) : '—'}
          sub={`Cible : ${fmt$(SEUIL_REV_JOUR)}/jour`}
          status={kpis.totalJours > 0 && (kpis.totalRevenuReel / kpis.totalJours) >= SEUIL_REV_JOUR ? 'green' : 'red'}
        />
        <KpiCard
          label="Journées analysées"
          value={kpis.totalJours}
          status="neutral"
        />
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        <button style={tabStyle(activeTab === 'summary')} onClick={() => setActiveTab('summary')}>Par technicien</button>
        <button style={tabStyle(activeTab === 'detail')}  onClick={() => setActiveTab('detail')}>Détail journées</button>
      </div>

      {/* Tab : Par techincien */}
      {activeTab === 'summary' && (
        <div style={{ overflowX: 'auto', borderRadius: 10, border: '1px solid #e5e7eb' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr>
                {[
                  { label: 'Technicien',       col: 'technicien'  },
                  { label: 'Jours',            col: 'jours'       },
                  { label: 'Rev. réel',        col: 'revenuReel'  },
                  { label: 'Rev. prévu',       col: 'revenuPrevu' },
                  { label: 'Écart %',          col: 'avgRevDiff'  },
                  { label: 'Rev./jour',        col: 'revParJour'  },
                  { label: '$/h moyen',        col: 'avgDollarH'  },
                  { label: '$/km moyen',       col: 'avgDollarKm' },
                                  { label: 'Heures',            col: 'totalHeures' },
                ].map(h => (
                  <SortableHeader key={h.col} {...h} sortCol={sortCol} sortDir={sortDir} onSort={handleSort} />
                ))}
              </tr>
            </thead>
            <tbody>
              {byTech.map((t, i) => (
                <tr key={t.technicien} style={{ background: i % 2 === 0 ? '#fff' : '#f9fafb' }}>
                  <td style={{ ...cellStyle, fontWeight: 600, color: '#1A2B4A' }}>{t.technicien}</td>
                  <td style={cellStyle}>{t.jours}</td>
                  <td style={cellStyle}>{fmt$(t.revenuReel)}</td>
                  <td style={cellStyle}>{fmt$(t.revenuPrevu)}</td>
                  <td style={cellStyle}>
                    <span style={{ color: (t.avgRevDiff ?? 0) >= 0 ? '#16a34a' : '#dc2626', fontWeight: 600 }}>
                      {t.avgRevDiff !== null ? `${t.avgRevDiff >= 0 ? '+' : ''}${fmtDec(t.avgRevDiff, 1)}%` : '—'}
                    </span>
                  </td>
                  <td style={cellStyle}>
                    <span style={{ color: t.revParJour >= SEUIL_REV_JOUR ? '#16a34a' : '#dc2626', fontWeight: 600 }}>
                     {fmt$(t.revParJour)}
                    </span>
                  </td>
                  <td style={cellStyle}>
                    <span style={{ color: (t.avgDollarH ?? 0) >= SEUIL_DOLLAR_H ? '#16a34a' : '#dc2626', fontWeight: 600 }}>
                      {t.avgDollarH !== null ? `$${fmtDec(t.avgDollarH, 0)}/h` : '—'}
                    </span>
                  </td>
                  <td style={cellStyle}>
                    <span style={{ color: (t.avgDollarKm ?? 0) >= SEUIL_DOLLAR_KM ? '#16a34a' : '#dc2626', fontWeight: 600 }}>
                      {t.avgDollarKm !== null ? `$${fmtDec(t.avgDollarKm, 2)}/km` : '—'}
                    </span>
                  </td>
                  <td style={cellStyle}>{t.totalHeures !== null && t.totalHeures !== undefined ? fmtDec(t.totalHeures, 1) : '—'}</td>
                </tr>
              ))}
              {byTech.length === 0 && (
                <tr><td colSpan={8} style={{ ...cellStyle, textAlign: 'center', color: '#aaa' }}>Aucune donnée</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Tab : Détail journées */}
      {activeTab === 'detail' && (
        <div style={{ overflowX: 'auto', borderRadius: 10, border: '1px solid #e5e7eb' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr>
                {[
                  { label: 'Date',          col: 'dateStr'     },
                  { label: 'Techincien',    col: 'technicien'  },
                  { label: 'Rev. prévu',    col: 'estRevenue'  },
                  { label: 'Rev. réel',     col: 'realRevenue' },
                  { label: 'Écart %',       col: 'pctDiff'     },
                  { label: 'KM prévus',     col: 'estKm'       },
                  { label: 'KM réels',      col: 'realKm'      },
                  { label: '$/h',           col: 'kpiDollarH'  },
                  { label: '$/km',          col: 'dollarKm'    },
                  { label: 'Heures',        col: 'heures'      },
                  { label: 'Note',          col: 'note'        },
                ].map(h => (
                  <SortableHeader key={h.col} {...h} sortCol={detailSort} sortDir={detailSortDir} onSort={handleDetailSort} />
                ))}
              </tr>
            </thead>
            <tbody>
              {detailRows.map((r, i) => (
                <tr key={`${r.dateStr}-${r.technicien}-${i}`} style={{ background: i % 2 === 0 ? '#fff' : '#f9fafb' }}>
                  <td style={{ ...cellStyle, color: '#111' }}>{r.dateStr}</td>
                  <td style={{ ...cellStyle, fontWeight: 600, color: '#1A2B4A' }}>{r.technicien}</td>
                  <td style={cellStyle}>{fmt$(r.estRevenue)}</td>
                  <td style={cellStyle}>{fmt$(r.realRevenue)}</td>
                  <td style={cellStyle}>
                    <span style={{ color: (r.pctDiff ?? 0) >= 0 ? '#16a34a' : '#dc2626', fontWeight: 600 }}>
                      {r.pctDiff !== null ? `${r.pctDiff >= 0 ? '+' : ''}${fmtDec(r.pctDiff, 1)}%` : '—'}
                    </span>
                  </td>
                  <td style={cellStyle}>{r.estKm !== null ? fmtDec(r.estKm, 0) : '—'}</td>
                  <td style={cellStyle}>{r.realKm !== null ? fmtDec(r.realKm, 0) : '—'}</td>
                  <td style={cellStyle}>
                    <span style={{ color: (r.kpiDollarH ?? 0) >= SEUIL_DOLLAR_H ? '#16a34a' : '#dc2626', fontWeight: 600 }}>
                      {r.kpiDollarH !== null ? `$${fmtDec(r.kpiDollarH, 0)}/h` : '—'}
                    </span>
                  </td>
                  <td style={cellStyle}>
                    <span style={{ color: (r.dollarKm ?? 0) >= SEUIL_DOLLAR_KM ? '#16a34a' : '#dc2626', fontWeight: 600 }}>
                      {r.dollarKm !== null ? `$${fmtDec(r.dollarKm, 2)}/km` : '—'}
                    </span>
                  </td>
                  <td style={cellStyle}>{r.heures !== null ? fmtDec(r.heures, 1) : '—'}</td>
                  <td style={{ ...cellStyle, color: '#555', maxWidth: 200, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{r.note || '—'}</td>
                </tr>
              ))}
              {detailRows.length === 0 && (
                <tr><td colSpan={11} style={{ ...cellStyle, textAlign: 'center', color: '#aaa' }}>Aucune donnée</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
