export function scoreService(raw) {
  if (!raw || String(raw).trim() === '') return 0;
  const sl = String(raw).trim().toLowerCase();

  const hasEch = /échangeur|echangeur|air ex/.test(sl);
  const hasMural = /murale|mural/.test(sl);
  const hasCentrale = /centrale/.test(sl);
  const hasSech = /sécheuse|secheuse|séch|evacuateur|evacuat/.test(sl);
  const hasInspection = /inspection/.test(sl);
  const hasFan = /fan de salle/.test(sl);
  const hasHotte = /hotte/.test(sl);
  const hasBenefect = /benefect/.test(sl);
  const has5Demi = /5 1\/2|5½|penthouse/.test(sl);
  const isContratDay = /contrat day/.test(sl);
  const isTrio = /trio/.test(sl);
  const isCommune = /commune|commun|chute|conduit commun|camera/.test(sl);

  if (isCommune) return 0;
  if (hasInspection && !hasSech && !hasEch && !hasMural && !hasCentrale) return 0;

  let addonPts = 0;
  if (hasFan) addonPts += 0.25;
  if (hasHotte) addonPts += 0.25;
  if (hasBenefect) addonPts += 0.25;
  if (has5Demi) addonPts += 0.25;
  addonPts = Math.min(addonPts, 0.50);

  let base = 0;
  if (isContratDay) { base = 4.00; addonPts = 0; }
  else if (isTrio) { base = 1.00; }
  else if (hasInspection && !hasSech && !hasEch && !hasMural && !hasCentrale) { base = 0; }
  else if (hasSech && hasInspection && !hasEch && !hasMural && !hasCentrale) { base = 0.50; }
  else if (hasFan && !hasEch && !hasMural && !hasCentrale && !hasSech && !hasHotte) { base = 0.25; addonPts = 0; }
  else if (hasHotte && !hasEch && !hasMural && !hasCentrale && !hasSech && !hasFan) { base = 0.25; addonPts = 0; }
  else if (hasMural && !hasEch && !hasCentrale && !hasSech) { base = 0.50; }
  else if (hasCentrale && !hasEch && !hasMural && !hasSech) { base = 1.00; }
  else if (hasEch && !hasMural && !hasCentrale && !hasSech) { base = 0.75; }
  else if (hasSech && !hasEch && !hasMural && !hasCentrale) { base = 0.25; }
  else if (hasEch && (hasMural || hasCentrale)) { base = 1.00; }
  else if ((hasMural || hasCentrale) && hasSech) { base = 1.00; }
  else if (hasEch && hasSech) { base = 1.00; }
  else if (hasMural && hasCentrale) { base = 1.00; }
  else { base = 0.25; }

  return Math.round((base + addonPts) * 100) / 100;
}

export function serviceCategory(raw) {
  if (!raw || String(raw).trim() === '') return 'Inconnu';
  const sl = String(raw).trim().toLowerCase();

  if (/contrat day/.test(sl)) return 'Contrat Day';
  if (/trio/.test(sl)) return 'Trio';
  if (/commune|commun|chute/.test(sl)) return 'Commun';
  if (/inspection/.test(sl) && !/sécheuse|secheuse/.test(sl)) return 'Inspection';

  const hasEch = /échangeur|echangeur|air ex/.test(sl);
  const hasMural = /murale|mural/.test(sl);
  const hasCentrale = /centrale/.test(sl);
  const hasSech = /sécheuse|secheuse/.test(sl);

  if (hasEch && hasMural && hasSech) return 'Éch + Murale + Séch';
  if (hasEch && hasCentrale && hasSech) return 'Éch + Centrale + Séch';
  if (hasEch && hasMural) return 'Éch + Murale';
  if (hasEch && hasCentrale) return 'Éch + Centrale';
  if (hasEch) return 'Échangeur seul';
  if (hasMural && hasSech) return 'Murale + Séch';
  if (hasCentrale && hasSech) return 'Centrale + Séch';
  if (hasMural) return 'Murale seule';
  if (hasCentrale) return 'Centrale seule';
  if (hasSech) return 'Sécheuse';
  return 'Autre';
}
