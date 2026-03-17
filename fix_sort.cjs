const fs = require('fs');
let c = fs.readFileSync('src/App.jsx', 'utf8');

// Replace Table component with sortable version
c = c.replace(
`function Table({ headers, rows, keyField }) {
  return (
    <div style={{ overflowX: 'auto' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
        <thead>
          <tr>{headers.map(h => <th key={h.key} style={{ background: '#1A2B4A', color: '#fff', padding: '10px 12px', textAlign: h.right ? 'right' : 'left', fontWeight: 600, fontSize: 12, whiteSpace: 'nowrap' }}>{h.label}</th>)}</tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={row[keyField] ?? i} style={{ background: i % 2 === 0 ? '#F5F7FA' : '#fff' }}>
              {headers.map(h => <td key={h.key} style={{ padding: '9px 12px', textAlign: h.right ? 'right' : 'left', borderBottom: '1px solid #e5e7eb', color: '#1A2B4A' }}>{row[h.key]}</td>)}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}`,
`function Table({ headers, rows, keyField }) {
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
      const an = typeof av === 'string' ? parseFloat(av.replace(/[$,\\s]/g,'')) : av;
      const bn = typeof bv === 'string' ? parseFloat(bv.replace(/[$,\\s]/g,'')) : bv;
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
}`
);

fs.writeFileSync('src/App.jsx', c, 'utf8');
console.log('done');
console.log('Has sortable:', c.includes('handleSort'));
