import { useState, useEffect, useMemo } from 'react';
import Papa from 'papaparse';

const SAV_CSV_URL = import.meta.env.DEV ? 'https://docs.google.com/spreadsheets/d/e/2PACX-1vR-hdhLC9YjtK7JHYVZcCxNie1VboZ98qq6WU4wk8rq1jZFmI9oiQxVXped7szu9h11EmdQvO0gn0ov/pub?gid=1127543800&single=true&output=csv' : '/api/sheets?url=' + encodeURIComponent('https://docs.google.com/spreadsheets/d/e/2PACX-1vR-hdhLC9YjtK7JHYVZcCxNie1VboZ98qq6WU4wk8rq1jZFmI9oiQxVXped7szu9h11EmdQvO0gn0ov/pub?gid=1127543800&single=true&output=csv');

const TAUX_HORAIRE = 22;
const COUT_DEPLACEMENT = 171;

function parseSavRow(r) {
  const typeProbleme = r['Type de problème'] || '';
  const deplacement = r['Déplacement technicien requis ?'] || '';
  const compensation = r['Compensation accordée au client ?'] || '';
  const duree = parseFloat(r['Durée estimée de l\'intervention (heures)'] || 0) || 0;
  const coutPiece = parseFloat(r['Coût de la pièce ($)'] || 0) || 0;
  const coutST = parseFloat(r['Montant de la facture externe ($)'] || 0) || 0;
  const montantComp = parseFloat(r['Montant de la compensation ($)'] || 0) || 0;
  const resolutionDistance = r['Résolution à distance possible ?'] || '';

  // Cause probable consolidée — première colonne cause non vide
  const causeKeys = [
    'Cause probable — Murale qui coule [visible si problème 01]',
    'Cause probable — Nettoyage incomplet [visible si problème 02]',
    'Cause probable — Équipement endommagé [visible si problème 03]',
    'Cause probable — Sécheuse bloquée [visible si problème 04]',
    'Cause probable — Murale inaccessible [visible si problème 05]',
    'Cause probable — Hotte [visible si problème 06]',
    'Cause probable — Facturation [visible si problème 07]',
    'Cause probable — Comportement technicien [visible si problème 08]',
    'Cause probable — Service non effectué [visible si problème 09]',
    'Cause probable — Autre [visible si problème 10]',
  ];
  const causeProbable = causeKeys.map(k => r[k] || '').find(v => v !== '') || '';

  const estDeplacement = deplacement.startsWith('Oui');
  const estCompensation = compensation.startsWith('Oui');
  const estResolutionDistance = resolutionDistance.startsWith('Oui') || resolutionDistance.startsWith('Partielle');

  const coutMO = duree * TAUX_HORAIRE;
  const coutDeplacement = estDeplacement ? COUT_DEPLACEMENT : 0;
  const coutTotal = coutMO + coutPiece + coutST + coutDeplacement;

  return {
    prenom: r['Nom du client - First Name'] || '',
    nom: r['Nom du client - Last Name'] || '',
    technicien: r['Technicien en cause'] || '',
    typeProbleme,
    typeProblemeCode: typeProbleme.slice(0, 2),
    causeProbable,
    scoreConfiance: r['Score de confiance du diagnostic'] || '',
    resolutionDistance,
    estResolutionDistance,
    estDeplacement,
    techRetour: r['Technicien assigné pour le retour terrain'] || '',
    dateRetour: r['Date prévue du retour terrain'] || '',
    duree,
    estCompensation,
    typeCompensation: r['Type de compensation'] || '',
    montantComp,
    approbateur: r['Approbateur de la compensation'] || '',
    motifComp: r['Motif de la compensation'] || '',
    coutMO,
    coutPiece,
    coutST,
    coutDeplacement,
    coutTotal,
    submissionId: r['Submission ID'] || '',
    pipedrive: r['Confirmation documentation Pipedrive'] || '',
  };
}

function KPICard({ label, value, sub, color = '#1A2B4A', bg = '#D6E4F0', warn }) {
  return (
    <div style={{ background: bg, borderRadius: 10, padding: '16px 20px', borderLeft: `4px solid ${color}`, minWidth: 150, flex: 1 }}>
      <div style={{ fontSize: 11, color: '#555', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5 }}>{label}</div>
      <div style={{ fontSize: 26, fontWeight: 800, color: warn ? '#C0392B' : color, marginTop: 4 }}>{value}</div>
      {sub && <div style={{ fontSize: 11, color: '#777', marginTop: 2 }}>{sub}</div>}
    </div>
  );
}

function Section({ title, children }) {
  return (
    <div style={{ background: '#fff', borderRadius: 12, padding: 24, boxShadow: '0 1px 6px rgba(0,0,0,0.08)', marginBottom: 20 }}>
      <div style={{ fontSize: 13, fontWeight: 700, color: '#1A2B4A', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 16, borderBottom: '2px solid #C0392B', paddingBottom: 8 }}>{title}</div>
      {children}
    </div>
  );
}

function SortableTable({ headers, rows }) {
  const [sortKey, setSortKey] = useState(null);
  const [sortDir, setSortDir] = useState('desc');
  const handleSort = k => { if (sortKey === k) setSortDir(d => d === 'asc' ? 'desc' : 'asc'); else { setSortKey(k); setSortDir('desc'); } };
  const sorted = useMemo(() => {
    if (!sortKey) return rows;
    return [...rows].sort((a, b) => {
      const av = a[sortKey]; const bv = b[sortKey];
      const an = typeof av === 'number' ? av : parseFloat(String(av).replace(/[$,%\s]/g, ''));
      const bn = typeof bv === 'number' ? bv : parseFloat(String(bv).replace(/[$,%\s]/g, ''));
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
            <th key={h.key} onClick={() => handleSort(h.key)} style={{ background: '#1A2B4A', color: '#fff', padding: '10px 12px', textAlign: h.right ? 'right' : 'left', fontWeight: 600, fontSize: 12, whiteSpace: 'nowrap', cursor: 'pointer' }}>
              {h.label} {sortKey === h.key ? (sortDir === 'asc' ? '▲' : '▼') : '↕'}
            </th>
          ))}</tr>
        </thead>
        <tbody>
          {sorted.map((row, i) => (
            <tr key={i} style={{ background: i % 2 === 0 ? '#F5F7FA' : '#fff' }}>
              {headers.map(h => <td key={h.key} style={{ padding: '9px 12px', textAlign: h.right ? 'right' : 'left', borderBottom: '1px solid #e5e7eb', color: '#1A2B4A' }}>{row[h.key]}</td>)}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

const fmt$ = v => '$' + (v || 0).toLocaleString('fr-CA', { maximumFractionDigits: 0 });
const pct = (n, d) => d > 0 ? ((n / d) * 100).toFixed(0) + '%' : '0%';

const TYPE_LABELS = {
  '01': 'Murale qui coule', '02': 'Nettoyage incomplet', '03': 'Équipement endommagé',
  '04': 'Sécheuse bloquée', '05': 'Murale inaccessible', '06': 'Hotte',
  '07': 'Facturation', '08': 'Comportement tech', '09': 'Service non effectué', '10': 'Autre',
};

export default function SavDashboard() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('kpis');
  const [filterTech, setFilterTech] = useState('Tous');
  const [filterType, setFilterType] = useState('Tous');

  useEffect(() => {
    setLoading(true);
    fetch(SAV_CSV_URL)
      .then(r => r.text())
      .then(text => {
        const result = Papa.parse(text, { header: true, skipEmptyLines: "greedy" });
        console.log("SAV raw rows:", result.data.length);
setRows(result.data.filter(r => r["Submission ID"] && String(r["Submission ID"]).trim() !== "").map(parseSavRow));
        setLoading(false);
      })
      .catch(() => { setError('Impossible de charger les données SAV.'); setLoading(false); });
  }, []);

  const techs = useMemo(() => ['Tous', ...new Set(rows.map(r => r.technicien).filter(Boolean).sort())], [rows]);
  const types = useMemo(() => ['Tous', ...Object.entries(TYPE_LABELS).map(([k, v]) => `${k} — ${v}`)], []);

  const filtered = useMemo(() => rows.filter(r => {
    if (filterTech !== 'Tous' && r.technicien !== filterTech) return false;
    if (filterType !== 'Tous' && !r.typeProbleme.startsWith(filterType.slice(0, 2))) return false;
    return true;
  }), [rows, filterTech, filterType]);

  // KPIs globaux
  const kpis = useMemo(() => {
    const total = filtered.length;
    const deplacement = filtered.filter(r => r.estDeplacement).length;
    const distanceOk = filtered.filter(r => r.estResolutionDistance).length;
    const avecComp = filtered.filter(r => r.estCompensation).length;
    const totalComp = filtered.reduce((s, r) => s + r.montantComp, 0);
    const totalCout = filtered.reduce((s, r) => s + r.coutTotal, 0);
    const coutMoy = total > 0 ? totalCout / total : 0;
    return { total, deplacement, distanceOk, avecComp, totalComp, totalCout, coutMoy, tauxDeplacement: pct(deplacement, total), tauxDistance: pct(distanceOk, total) };
  }, [filtered]);

  // Par technicien
  const byTech = useMemo(() => {
    const map = {};
    filtered.forEach(r => {
      if (!r.technicien) return;
      if (!map[r.technicien]) map[r.technicien] = { tech: r.technicien, tickets: 0, deplacements: 0, compensations: 0, montantComp: 0, coutTotal: 0 };
      const t = map[r.technicien];
      t.tickets++;
      if (r.estDeplacement) t.deplacements++;
      if (r.estCompensation) { t.compensations++; t.montantComp += r.montantComp; }
      t.coutTotal += r.coutTotal;
    });
    return Object.values(map).sort((a, b) => b.tickets - a.tickets);
  }, [filtered]);

  // Par type de problème
  const byType = useMemo(() => {
    const map = {};
    filtered.forEach(r => {
      const code = r.typeProblemeCode;
      const label = TYPE_LABELS[code] || 'Autre';
      if (!map[code]) map[code] = { code, label, tickets: 0, deplacements: 0, compensations: 0, montantComp: 0, coutTotal: 0 };
      const t = map[code];
      t.tickets++;
      if (r.estDeplacement) t.deplacements++;
      if (r.estCompensation) { t.compensations++; t.montantComp += r.montantComp; }
      t.coutTotal += r.coutTotal;
    });
    return Object.values(map).sort((a, b) => b.tickets - a.tickets);
  }, [filtered]);

  const inputStyle = { border: '1px solid #D1D5DB', borderRadius: 6, padding: '6px 10px', fontSize: 13, color: '#1A2B4A', background: '#fff', outline: 'none' };
  const tabStyle = active => ({ padding: '8px 18px', borderRadius: 6, fontWeight: 600, fontSize: 13, cursor: 'pointer', border: 'none', transition: 'all 0.2s', background: active ? '#C0392B' : '#E5E7EB', color: active ? '#fff' : '#374151' });

  if (loading) return <div style={{ textAlign: 'center', padding: 60, color: '#1A2B4A', fontWeight: 700 }}>⏳ Chargement SAV...</div>;
  if (error) return <div style={{ background: '#FDECEA', border: '1px solid #C0392B', borderRadius: 10, padding: 32, textAlign: 'center', color: '#C0392B', fontWeight: 700 }}>{error}</div>;

  return (
    <div>
      {/* FILTRES */}
      <Section title="Filtres">
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'flex-end' }}>
          <div>
            <div style={{ fontSize: 11, fontWeight: 600, color: '#555', marginBottom: 4 }}>TECHNICIEN EN CAUSE</div>
            <select value={filterTech} onChange={e => setFilterTech(e.target.value)} style={inputStyle}>
              {techs.map(t => <option key={t}>{t}</option>)}
            </select>
          </div>
          <div>
            <div style={{ fontSize: 11, fontWeight: 600, color: '#555', marginBottom: 4 }}>TYPE DE PROBLÈME</div>
            <select value={filterType} onChange={e => setFilterType(e.target.value)} style={inputStyle}>
              {types.map(t => <option key={t}>{t}</option>)}
            </select>
          </div>
          <button onClick={() => { setFilterTech('Tous'); setFilterType('Tous'); }} style={{ ...inputStyle, background: '#E5E7EB', cursor: 'pointer', fontWeight: 600 }}>Réinitialiser</button>
          <div style={{ marginLeft: 'auto', fontSize: 12, color: '#777' }}>{filtered.length} ticket{filtered.length > 1 ? 's' : ''}</div>
        </div>
      </Section>

      {/* KPI CARDS */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, marginBottom: 20 }}>
        <KPICard label="Total tickets" value={kpis.total} color="#C0392B" bg="#FDECEA" />
        <KPICard label="Taux déplacement" value={kpis.tauxDeplacement} sub={`${kpis.deplacement} déplacements`} color={kpis.deplacement / Math.max(kpis.total,1) > 0.4 ? '#C0392B' : '#1E7D46'} bg={kpis.deplacement / Math.max(kpis.total,1) > 0.4 ? '#FDECEA' : '#D6F0E0'} />
        <KPICard label="Résolution à distance" value={kpis.tauxDistance} sub={`${kpis.distanceOk} tickets`} color="#1E7D46" bg="#D6F0E0" />
        <KPICard label="Avec compensation" value={kpis.avecComp} sub={pct(kpis.avecComp, kpis.total) + ' des tickets'} color="#E8A020" bg="#FFF9C4" />
        <KPICard label="Total compensations" value={fmt$(kpis.totalComp)} color="#E8A020" bg="#FFF9C4" />
        <KPICard label="Coût SAV total" value={fmt$(kpis.totalCout)} sub={`Moy. ${fmt$(kpis.coutMoy)}/ticket`} color="#1A2B4A" bg="#D6E4F0" />
      </div>

      {/* TABS */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        {[['kpis', 'Vue globale'], ['tech', 'Par technicien'], ['type', 'Par type de problème'], ['tickets', 'Tous les tickets']].map(([id, label]) => (
          <button key={id} style={tabStyle(activeTab === id)} onClick={() => setActiveTab(id)}>{label}</button>
        ))}
      </div>

      {/* TAB : VUE GLOBALE */}
      {activeTab === 'kpis' && (
        <>
          <Section title="Répartition par type de problème">
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {byType.map(t => (
                <div key={t.code} style={{ background: '#F5F7FA', borderRadius: 8, padding: '12px 16px', minWidth: 160, borderLeft: `4px solid #C0392B` }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: '#C0392B', marginBottom: 4 }}>{t.code}</div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: '#1A2B4A', marginBottom: 6 }}>{t.label}</div>
                  <div style={{ fontSize: 20, fontWeight: 800, color: '#1A2B4A' }}>{t.tickets}</div>
                  <div style={{ fontSize: 11, color: '#777' }}>{pct(t.tickets, kpis.total)} des tickets</div>
                  {t.deplacements > 0 && <div style={{ fontSize: 11, color: '#C0392B', marginTop: 4 }}>⚡ {t.deplacements} déplacement{t.deplacements > 1 ? 's' : ''}</div>}
                </div>
              ))}
            </div>
          </Section>
          <Section title="Coûts SAV par catégorie">
            <SortableTable
              headers={[
                { key: 'label', label: 'Type de problème' },
                { key: 'tickets', label: 'Tickets', right: true },
                { key: 'deplacements', label: 'Déplacements', right: true },
                { key: 'compensationsStr', label: 'Compensations', right: true },
                { key: 'montantCompStr', label: 'Montant comp.', right: true },
                { key: 'coutTotalStr', label: 'Coût total', right: true },
                { key: 'coutMoyStr', label: 'Coût moyen', right: true },
              ]}
              rows={byType.map(t => ({
                ...t,
                compensationsStr: t.compensations,
                montantCompStr: fmt$(t.montantComp),
                coutTotalStr: fmt$(t.coutTotal),
                coutMoyStr: fmt$(t.tickets > 0 ? t.coutTotal / t.tickets : 0),
              }))}
            />
          </Section>
        </>
      )}

      {/* TAB : PAR TECHNICIEN */}
      {activeTab === 'tech' && (
        <Section title="Performance SAV par technicien en cause">
          <SortableTable
            headers={[
              { key: 'tech', label: 'Technicien' },
              { key: 'tickets', label: 'Tickets', right: true },
              { key: 'tauxDeplacement', label: 'Taux déplacement', right: true },
              { key: 'deplacements', label: 'Déplacements', right: true },
              { key: 'compensations', label: 'Compensations', right: true },
              { key: 'montantCompStr', label: 'Montant comp.', right: true },
              { key: 'coutTotalStr', label: 'Coût SAV total', right: true },
              { key: 'coutMoyStr', label: 'Coût moyen/ticket', right: true },
            ]}
            rows={byTech.map(t => ({
              ...t,
              tauxDeplacement: pct(t.deplacements, t.tickets),
              montantCompStr: fmt$(t.montantComp),
              coutTotalStr: fmt$(t.coutTotal),
              coutMoyStr: fmt$(t.tickets > 0 ? t.coutTotal / t.tickets : 0),
            }))}
          />
        </Section>
      )}

      {/* TAB : PAR TYPE */}
      {activeTab === 'type' && (
        <Section title="Détail par type de problème">
          <SortableTable
            headers={[
              { key: 'code', label: 'Code' },
              { key: 'label', label: 'Type de problème' },
              { key: 'tickets', label: 'Tickets', right: true },
              { key: 'tauxDeplacement', label: 'Taux déplacement', right: true },
              { key: 'tauxComp', label: 'Taux compensation', right: true },
              { key: 'montantCompStr', label: 'Total comp.', right: true },
              { key: 'coutTotalStr', label: 'Coût SAV total', right: true },
            ]}
            rows={byType.map(t => ({
              ...t,
              tauxDeplacement: pct(t.deplacements, t.tickets),
              tauxComp: pct(t.compensations, t.tickets),
              montantCompStr: fmt$(t.montantComp),
              coutTotalStr: fmt$(t.coutTotal),
            }))}
          />
        </Section>
      )}

      {/* TAB : TOUS LES TICKETS */}
      {activeTab === 'tickets' && (
        <Section title={`Tous les tickets (${filtered.length})`}>
          <SortableTable
            headers={[
              { key: 'client', label: 'Client' },
              { key: 'technicien', label: 'Technicien' },
              { key: 'typeProbleme', label: 'Problème' },
              { key: 'causeProbable', label: 'Cause probable' },
              { key: 'scoreConfiance', label: 'Score' },
              { key: 'deplacement', label: 'Déplacement' },
              { key: 'compensation', label: 'Compensation' },
              { key: 'montantCompStr', label: 'Montant comp.', right: true },
              { key: 'coutTotalStr', label: 'Coût ticket', right: true },
            ]}
            rows={filtered.map(r => ({
              client: `${r.prenom} ${r.nom}`.trim(),
              technicien: r.technicien,
              typeProbleme: r.typeProbleme.slice(0, 30),
              causeProbable: r.causeProbable.slice(0, 40),
              scoreConfiance: r.scoreConfiance.slice(0, 1),
              deplacement: r.estDeplacement ? '⚡ Oui' : '✅ Non',
              compensation: r.estCompensation ? '💰 Oui' : '—',
              montantCompStr: r.estCompensation ? fmt$(r.montantComp) : '—',
              coutTotalStr: fmt$(r.coutTotal),
            }))}
          />
        </Section>
      )}
    </div>
  );
}
