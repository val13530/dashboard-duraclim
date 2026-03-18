import { useState, useMemo, useEffect } from 'react';
import { fetchBillingData, filterBillingRows, computeBillingKpis } from './utils/parseBillingData';
import HelpPanel from './HelpPanel';

function fmt$(v) { return v == null ? '-' : '$' + Math.round(v).toLocaleString('fr-CA'); }

function KpiCard({ label, value, sub, status }) {
  const colors = { green: '#16a34a', red: '#dc2626', neutral: '#1A2B4A', orange: '#ea580c' };
  const bgs    = { green: '#dcfce7', red: '#fee2e2', neutral: '#D6E4F0', orange: '#ffedd5' };
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

export default function BillingDashboard({ role }) {
  const [rows2025, setRows2025] = useState([]);
  const [rows2026, setRows2026] = useState([]);
  const [loading, setLoading]   = useState(true);
  const [year, setYear]         = useState('2026');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo,   setDateTo]   = useState('');
  const [jobStatus,     setJobStatus]     = useState('Tous');
  const [paymentStatus, setPaymentStatus] = useState('Tous');
  const [activeTab, setActiveTab] = useState('overview');
  const [sortCol,  setSortCol]  = useState('dateStr');
  const [sortDir,  setSortDir]  = useState('desc');
  const [arSortCol, setArSortCol] = useState('daysOld');
  const [arSortDir, setArSortDir] = useState('desc');

  useEffect(() => {
    Promise.all([fetchBillingData(2025), fetchBillingData(2026)])
      .then(([r25, r26]) => { setRows2025(r25); setRows2026(r26); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  const allRows = useMemo(() => year === '2025' ? rows2025 : year === '2026' ? rows2026 : [...rows2025, ...rows2026], [year, rows2025, rows2026]);
  const filtered = useMemo(() => filterBillingRows(allRows, { dateFrom, dateTo, jobStatus, paymentStatus }), [allRows, dateFrom, dateTo, jobStatus, paymentStatus]);
  const kpis = useMemo(() => computeBillingKpis(filtered), [filtered]);

  const arRows = useMemo(() => {
    const today = new Date();
    return filtered.filter(r => r.jobStatus === 'Done' && r.paymentStatus === 'Unpaid' && (r.client || '').trim().replace(/\s+/g, ' ').toUpperCase() !== 'CONDO KPI' && (r.quote || 0) > 0)
      .map(r => ({ ...r, daysOld: r.date ? Math.floor((today - r.date) / (1000*60*60*24)) : null }))
      .sort((a,b) => {
        const av = a[arSortCol] != null ? a[arSortCol] : '';
        const bv = b[arSortCol] != null ? b[arSortCol] : '';
        if (typeof av === 'number' && typeof bv === 'number') return arSortDir === 'desc' ? bv - av : av - bv;
        if (av < bv) return arSortDir === 'desc' ? 1 : -1;
        if (av > bv) return arSortDir === 'desc' ? -1 : 1;
        return 0;
      });
  }, [filtered, arSortCol, arSortDir]);

  const sorted = useMemo(() => [...filtered].filter(r => (r.quote || 0) > 0 || (r.done || 0) > 0).sort((a,b) => {
    const av = a[sortCol] || ''; const bv = b[sortCol] || '';
    if (av < bv) return sortDir === 'asc' ? -1 : 1;
    if (av > bv) return sortDir === 'asc' ? 1 : -1;
    return 0;
  }), [filtered, sortCol, sortDir]);

  const hs = col => () => { if (sortCol===col) setSortDir(d=>d==='desc'?'asc':'desc'); else { setSortCol(col); setSortDir('desc'); } };
  const hsar = col => () => { if (arSortCol===col) setArSortDir(d=>d==='desc'?'asc':'desc'); else { setArSortCol(col); setArSortDir('desc'); } };
  const arArr = col => arSortCol===col ? (arSortDir==='desc'?' v':' ^'):' -';
  const arr = col => sortCol===col ? (sortDir==='desc'?' v':' ^'):' -';

  const inp = { padding: '6px 10px', border: '1px solid #ddd', borderRadius: 6, fontSize: 13 };
  const th  = () => ({ background: '#1A2B4A', color: '#fff', padding: '10px 12px', fontWeight: 600, fontSize: 12, whiteSpace: 'nowrap', cursor: 'pointer', userSelect: 'none', textAlign: 'left' });
  const td  = () => ({ padding: '9px 12px', fontSize: 13, borderBottom: '1px solid #f0f0f0', color: '#222' });
  const tabStyle = active => ({ padding: '8px 18px', borderRadius: 6, fontWeight: 600, fontSize: 13, cursor: 'pointer', border: 'none', background: active ? '#1A2B4A' : '#E5E7EB', color: active ? '#fff' : '#374151' });

  const statusColor = s => {
    if (s === 'Paid') return '#16a34a';
    if (s === 'Unpaid') return '#dc2626';
    if (s === 'Free') return '#6b7280';
    if (s === 'No Payment') return '#6b7280';
    return '#ea580c';
  };

  if (loading) return <div style={{ padding: 40, textAlign: 'center', color: '#888' }}>Chargement des donnees...</div>;

  return (
    <div style={{ padding: '0 24px 40px', maxWidth: 1400, margin: '0 auto' }}>
      <div style={{ marginBottom: 20, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
        <div>
          <div style={{ fontSize: 22, fontWeight: 700, color: '#1A2B4A' }}>Dashboard Facturation</div>
          <div style={{ fontSize: 13, color: '#888', marginTop: 2 }}>Reconciliation paiements et comptes a recevoir</div>
        </div>
        <HelpPanel dept="billing" role={role || 'admin'} />
      </div>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, marginBottom: 24, background: '#f8fafc', borderRadius: 10, padding: '16px 20px', border: '1px solid #e5e7eb' }}>
        <div>
          <div style={{ fontSize: 11, color: '#666', marginBottom: 4 }}>Annee</div>
          <select value={year} onChange={e => setYear(e.target.value)} style={inp}>
            <option value="2026">2026</option>
            <option value="2025">2025</option>
            <option value="all">2025 + 2026</option>
          </select>
        </div>
        <div>
          <div style={{ fontSize: 11, color: '#666', marginBottom: 4 }}>Date debut</div>
          <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} style={inp} />
        </div>
        <div>
          <div style={{ fontSize: 11, color: '#666', marginBottom: 4 }}>Date fin</div>
          <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} style={inp} />
        </div>
        <div>
          <div style={{ fontSize: 11, color: '#666', marginBottom: 4 }}>Job Status</div>
          <select value={jobStatus} onChange={e => setJobStatus(e.target.value)} style={inp}>
            {['Tous','Done','Cancelled','Replanned','Duplicate'].map(s => <option key={s}>{s}</option>)}
          </select>
        </div>
        <div>
          <div style={{ fontSize: 11, color: '#666', marginBottom: 4 }}>Payment Status</div>
          <select value={paymentStatus} onChange={e => setPaymentStatus(e.target.value)} style={inp}>
            {['Tous','Paid','Unpaid','Free','Ticket','On other invoice','No Payment'].map(s => <option key={s}>{s}</option>)}
          </select>
        </div>
        <div style={{ display: 'flex', alignItems: 'flex-end' }}>
          <button onClick={() => { setDateFrom(''); setDateTo(''); setJobStatus('Tous'); setPaymentStatus('Tous'); setYear('2026'); }}
            style={{ ...inp, background: '#fff', cursor: 'pointer' }}>Reinitialiser</button>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', marginBottom: 28 }}>
        <KpiCard label="Revenu Facture"     value={fmt$(kpis.totalQuote)} sub={kpis.nbJobs + ' jobs Done'} status="neutral" />
        <KpiCard label="Revenu Encaisse"    value={fmt$(kpis.totalDone)} sub="Montant recu" status="neutral" />
        <KpiCard label="Ecart"              value={fmt$(kpis.ecart)} sub="Facture - Encaisse" status={kpis.ecart <= 0 ? 'green' : 'orange'} />
        <KpiCard label="Comptes a Recevoir" value={fmt$(kpis.totalAR)} sub={'Unpaid: ' + (kpis.nbUnpaid || 0) + ' jobs'} status={kpis.totalAR > 0 ? 'red' : 'green'} />
        <KpiCard label="AR + 30 jours"      value={fmt$(kpis.totalAR30j)} sub={(kpis.nbAR30j || 0) + ' jobs en retard'} status={kpis.totalAR30j > 0 ? 'red' : 'green'} />
        <KpiCard label="AR 0-30 jours"       value={fmt$(kpis.totalAR0_30j)} sub={(kpis.nbAR0_30j || 0) + ' jobs recents'} status={kpis.totalAR0_30j > 0 ? 'orange' : 'green'} />
      </div>

      <div style={{ display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap' }}>
        {[['overview','Vue d ensemble'],['ar','Comptes a recevoir'],['payment','Par type paiement'],['detail','Detail complet']].map(([id,label]) => (
          <button key={id} style={tabStyle(activeTab===id)} onClick={() => setActiveTab(id)}>{label}</button>
        ))}
      </div>

      {activeTab === 'overview' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
          <div style={{ borderRadius: 10, border: '1px solid #e5e7eb', overflow: 'hidden' }}>
            <div style={{ background: '#1A2B4A', color: '#fff', padding: '12px 16px', fontWeight: 700, fontSize: 14 }}>Par statut de paiement</div>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead><tr>
                <th style={th()}>Statut</th>
                <th style={{ ...th(), textAlign: 'right' }}>Jobs</th>
                <th style={{ ...th(), textAlign: 'right' }}>Montant</th>
              </tr></thead>
              <tbody>
                {Object.entries(kpis.byPaymentStatus).sort((a,b) => b[1].amount - a[1].amount).map(([s,v],i) => (
                  <tr key={s} style={{ background: i%2===0?'#fff':'#f9fafb' }}>
                    <td style={td()}><span style={{ background: statusColor(s) + '22', color: statusColor(s), borderRadius: 4, padding: '2px 8px', fontSize: 12, fontWeight: 600 }}>{s}</span></td>
                    <td style={{ ...td(), textAlign: 'right' }}>{v.count}</td>
                    <td style={{ ...td(), textAlign: 'right', fontWeight: 600 }}>{fmt$(v.amount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div style={{ borderRadius: 10, border: '1px solid #e5e7eb', overflow: 'hidden' }}>
            <div style={{ background: '#1A2B4A', color: '#fff', padding: '12px 16px', fontWeight: 700, fontSize: 14 }}>Par type de paiement</div>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead><tr>
                <th style={th()}>Type</th>
                <th style={{ ...th(), textAlign: 'right' }}>Jo‌‌bs</th>
                <th style={{ ...th(), textAlign: 'right' }}>Montant</th>
              </tr></thead>
              <tbody>
                {Object.entries(kpis.byPaymentType).sort((a,b) => b[1].amount - a[1].amount).map(([s,v],i) => (
                  <tr key={s} style={{ background: i%2===0?'#fff':'#f9fafb' }}>
                    <td style={{ ...td(), fontWeight: 600, color: '#1A2B4A' }}>{s}</td>
                    <td style={{ ...td(), textAlign: 'right' }}>{v.count}</td>
                    <td style={{ ...td(), textAlign: 'right', fontWeight: 600 }}>{fmt$(v.amount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'ar' && (
        <div style={{ borderRadius: 10, border: '1px solid #e5e7eb', overflow: 'hidden' }}>
          <div style={{ background: '#dc2626', color: '#fff', padding: '12px 16px', fontWeight: 700, fontSize: 14 }}>
            Comptes a recevoir — {arRows.length} jobs — {fmt$(arRows.reduce((s,r) => s+(r.quote||0),0))}
          </div>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead><tr>
              <th onClick={hsar('dateStr')} style={th()}>Date{arArr('dateStr')}</th>
              <th onClick={hsar('client')}  style={th()}>Client{arArr('client')}</th>
              <th onClick={hsar('jobId')}   style={th()}>Job #{arArr('jobId')}</th>
              <th onClick={hsar('tech')}    style={th()}>Tech{arArr('tech')}</th>
              <th onClick={hsar('quote')}   style={{ ...th(), textAlign: 'right' }}>Quote{arArr('quote')}</th>
              <th onClick={hsar('daysOld')} style={{ ...th(), textAlign: 'right' }}>Jours{arArr('daysOld')}</th>
              <th style={th()}>Notes</th>
            </tr></thead>
            <tbody>
              {arRows.map((r,i) => (
                <tr key={i} style={{ background: (r.daysOld || 0) > 30 ? '#fff7f7' : i%2===0?'#fff':'#f9fafb' }}>
                  <td style={td()}>{r.dateStr}</td>
                  <td style={{ ...td(), fontWeight: 600, color: '#1A2B4A' }}>{r.client}</td>
                  <td style={td()}>{r.jobId}</td>
                  <td style={td()}>{r.tech}</td>
                  <td style={{ ...td(), textAlign: 'right', fontWeight: 700, color: '#dc2626' }}>{fmt$(r.quote)}</td>
                  <td style={{ ...td(), textAlign: 'right', fontWeight: 700, color: (r.daysOld || 0) > 30 ? '#dc2626' : '#333' }}>{r.daysOld !== null ? r.daysOld + 'j' : '-'}</td>
                  <td style={{ ...td(), color: '#666', fontSize: 12 }}>{r.notes}</td>
                </tr>
              ))}
              {arRows.length === 0 && <tr><td colSpan={7} style={{ ...td(), textAlign: 'center', color: '#aaa' }}>Aucun compte a recevoir</td></tr>}
            </tbody>
          </table>
        </div>
      )}

      {activeTab === 'payment' && (
        <div style={{ borderRadius: 10, border: '1px solid #e5e7eb', overflow: 'hidden' }}>
          <div style={{ background: '#1A2B4A', color: '#fff', padding: '12px 16px', fontWeight: 700, fontSize: 14 }}>Detail par type de paiement</div>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead><tr>
              <th style={th()}>Type</th>
              <th style={{ ...th(), textAlign: 'right' }}>Jobs</th>
              <th style={{ ...th(), textAlign: 'right' }}>% Jobs</th>
              <th style={{ ...th(), textAlign: 'right' }}>Montant</th>
              <th style={{ ...th(), textAlign: 'right' }}>% Montant</th>
            </tr></thead>
            <tbody>
              {Object.entries(kpis.byPaymentType).sort((a,b) => b[1].amount - a[1].amount).map(([s,v],i) => {
                const totalJobs = Object.values(kpis.byPaymentType).reduce((sum,x)=>sum+x.count,0);
                const totalAmt  = Object.values(kpis.byPaymentType).reduce((sum,x)=>sum+x.amount,0);
                return (
                  <tr key={s} style={{ background: i%2===0?'#fff':'#f9fafb' }}>
                    <td style={{ ...td(), fontWeight: 600, color: '#1A2B4A' }}>{s}</td>
                    <td style={{ ...td(), textAlign: 'right' }}>{v.count}</td>
                    <td style={{ ...td(), textAlign: 'right', color: '#666' }}>{totalJobs > 0 ? (v.count/totalJobs*100).toFixed(1)+'%' : '-'}</td>
                    <td style={{ ...td(), textAlign: 'right', fontWeight: 600 }}>{fmt$(v.amount)}</td>
                    <td style={{ ...td(), textAlign: 'right', color: '#666' }}>{totalAmt > 0 ? (v.amount/totalAmt*100).toFixed(1)+'%' : '-'}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {activeTab === 'detail' && (
        <div style={{ overflowX: 'auto', borderRadius: 10, border: '1px solid #e5e7eb' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead><tr>
              <th onClick={hs('dateStr')}    style={th()}>Date{arr('dateStr')}</th>
              <th onClick={hs('client')}     style={th()}>Client{arr('client')}</th>
              <th onClick={hs('jobId')}      style={th()}>Job #{arr('jobId')}</th>
              <th onClick={hs('tech')}       style={th()}>Tech{arr('tech')}</th>
              <th onClick={hs('typeOfJob')}  style={th()}>Type{arr('typeOfJob')}</th>
              <th onClick={hs('jobStatus')}  style={th()}>Status{arr('jobStatus')}</th>
              <th onClick={hs('quote')}      style={{ ...th(), textAlign: 'right' }}>Quote{arr('quote')}</th>
              <th onClick={hs('done')}       style={{ ...th(), textAlign: 'right' }}>Done{arr('done')}</th>
              <th onClick={hs('paymentType')}   style={th()}>Paiement{arr('paymentType')}</th>
              <th onClick={hs('paymentStatus')} style={th()}>Statut{arr('paymentStatus')}</th>
            </tr></thead>
            <tbody>
              {sorted.map((r,i) => (
                <tr key={i} style={{ background: i%2===0?'#fff':'#f9fafb' }}>
                  <td style={td()}>{r.dateStr}</td>
                  <td style={{ ...td(), fontWeight: 600 }}>{r.client}</td>
                  <td style={td()}>{r.jobId}</td>
                  <td style={td()}>{r.tech}</td>
                  <td style={td()}>{r.typeOfJob}</td>
                  <td style={td()}>{r.jobStatus}</td>
                  <td style={{ ...td(), textAlign: 'right' }}>{fmt$(r.quote)}</td>
                  <td style={{ ...td(), textAlign: 'right', fontWeight: 600 }}>{fmt$(r.done)}</td>
                  <td style={td()}>{r.paymentType}</td>
                  <td style={td()}><span style={{ background: statusColor(r.paymentStatus)+'22', color: statusColor(r.paymentStatus), borderRadius: 4, padding: '2px 8px', fontSize: 12, fontWeight: 600 }}>{r.paymentStatus}</span></td>
                </tr>
              ))}
              {sorted.length === 0 && <tr><td colSpan={10} style={{ ...td(), textAlign: 'center', color: '#aaa' }}>Aucune donnee</td></tr>}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
