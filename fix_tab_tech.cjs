const fs = require('fs');
let c = fs.readFileSync('src/App.jsx', 'utf8');

// Add byTechnicien useMemo after byCategorie
c = c.replace(
  "  }, [filtered]);",
  `  }, [filtered]);

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
  }, [filtered]);`
);

// Add Techniciens tab button
c = c.replace(
  "[['overview', 'Gestionnaires'], ['condos', 'Condos'], ['services', 'Mix Services']]",
  "[['overview', 'Gestionnaires'], ['condos', 'Condos'], ['services', 'Mix Services'], ['techniciens', 'Techniciens']]"
);

// Add Techniciens tab content after services tab
c = c.replace(
  "        {activeTab === 'services' &&",
  `        {activeTab === 'techniciens' && (
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
              dphFormatted: t.dph !== null ? \`$\${t.dph.toFixed(0)}/h\` : 'N/A',
              bar: <div style={{ minWidth: 120 }}><ProgressBar val={t.nbJours > 0 ? t.revenu / t.nbJours : 0} max={1200} color={(t.nbJours > 0 ? t.revenu / t.nbJours : 0) >= 1200 ? '#1E7D46' : '#E8A020'} /></div>,
            }))} />
          </Section>
        )}

        {activeTab === 'services' &&`
);

fs.writeFileSync('src/App.jsx', c, 'utf8');
console.log('done');
console.log('Has byTechnicien:', c.includes('byTechnicien'));
