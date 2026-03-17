const fs = require('fs');
let c = fs.readFileSync('src/App.jsx', 'utf8');

// Add rev/tech/jour to kpis useMemo
c = c.replace(
  "return { totalRevenu, totalRDV, dph, totalRevenuPrevu, ecart: totalRevenu - totalRevenuPrevu, avgPtsDay, pctAbove8, nbJours: ptsDayVals.length };",
  `// Rev moyen par technicien par jour
    const byDayTech = {};
    filtered.forEach(r => {
      if (!r.date || !r.tech1) return;
      const key = dateStr(r.date) + '_' + r.tech1;
      if (!byDayTech[key]) byDayTech[key] = 0;
      byDayTech[key] += r.revenuReel;
    });
    const techDayVals = Object.values(byDayTech);
    const avgRevTechJour = techDayVals.length > 0 ? techDayVals.reduce((a,b) => a+b, 0) / techDayVals.length : 0;
    return { totalRevenu, totalRDV, dph, totalRevenuPrevu, ecart: totalRevenu - totalRevenuPrevu, avgPtsDay, pctAbove8, nbJours: ptsDayVals.length, avgRevTechJour };`
);

// Add KPICard in the display
c = c.replace(
  "<KPICard label=\"Jours Analyses\" value={kpis.nbJours} sub=\"Journees gestionnaire\" />",
  `<KPICard label="Jours Analyses" value={kpis.nbJours} sub="Journees gestionnaire" />
            <KPICard label="Rev/Tech/Jour" value={fmtMoney(kpis.avgRevTechJour)} sub="Cible: $1 200/tech/jour" color={kpis.avgRevTechJour >= 1200 ? '#1E7D46' : kpis.avgRevTechJour >= 900 ? '#E8A020' : '#C0392B'} bg={kpis.avgRevTechJour >= 1200 ? '#D6F0E0' : kpis.avgRevTechJour >= 900 ? '#FFF9C4' : '#FDECEA'} />`
);

fs.writeFileSync('src/App.jsx', c, 'utf8');
console.log('done');
console.log('Has avgRevTechJour:', c.includes('avgRevTechJour'));
