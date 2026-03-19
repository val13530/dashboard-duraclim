import { useState } from 'react';

const HELP_CONTENT = {
  condo: {
    gestionnaire: {
      title: "Dashboard Condo — Votre vue",
      sections: [
        {
          heading: "Ce que vous voyez",
          body: "Vous voyez uniquement vos propres données — vos jobs, votre revenu, vos points et votre $/h. Les autres gestionnaires ne sont pas visibles."
        },
        {
          heading: "KPIs affichés",
          body: "Revenu Total : somme de vos jobs réels vs prévus. $/h Moyen : votre revenu divisé par vos heures réelles, cible $120/h. Pts/Jour : objectif 8 pts/jour = 2 équipes à pleine capacité. Rev/Tech/Jour : objectif $1 200/tech/jour."
        },
        {
          heading: "Filtres disponibles",
          body: "Filtrez par période (date début / date fin) pour analyser une semaine, un mois ou une saison spécifique. Le filtre technicien vous permet de voir les stats d'un tech en particulier."
        },
        {
          heading: "Les 4 onglets",
          body: "Gestionnaires : vue globale de vos performances. Condos : revenu et points par immeuble. Mix Services : répartition des types de services vendus. Techniciens : performance par tech sur vos jobs."
        }
      ]
    },
    manager_condo: {
      title: "Dashboard Condo — Vue Manager",
      sections: [
        {
          heading: "Ce que vous voyez",
          body: "Accès complet à tous les gestionnaires. Vous pouvez filtrer par gestionnaire, technicien, condo et période pour analyser n'importe quelle combinaison."
        },
        {
          heading: "KPIs et seuils",
          body: "$/h cible : $120/h. Pts/jour cible : 8 pts. Rev/tech/jour cible : $1 200. Un KPI en rouge indique une sous-performance qui nécessite une action corrective."
        },
        {
          heading: "Système de points",
          body: "Grille complete ci-dessous", isTable: true
        },
        {
          heading: "Les 4 onglets",
          body: "Gestionnaires : comparaison des performances entre gestionnaires. Condos : rentabilité par immeuble. Mix Services : distribution des catégories de services. Techniciens : $/h et revenus par technicien."
        }
      ]
    },
    dispatch_condo: {
      title: "Dashboard Condo — Vue Dispatch",
      sections: [
        {
          heading: "Ce que vous voyez",
          body: "Accès complet au dashboard Condo — tous les gestionnaires, tous les condos, tous les techniciens."
        },
        {
          heading: "Indicateurs clés pour le dispatch",
          body: "$/h Moyen : cible $120/h. Si le $/h chute, c'est souvent un problème de densité géographique ou de trous horaires. Rev/Tech/Jour : cible $1 200/jour. Un tech sous $1 000 signale une journée mal optimisée."
        },
        {
          heading: "Utilisation pratique",
          body: "Filtrez par date pour analyser des journées spécifiques. Utilisez la vue Techniciens pour identifier les techs sous-performants et ajuster la planification."
        }
      ]
    },
    admin: {
      title: "Dashboard Condo — Vue Admin",
      sections: [
        {
          heading: "Accès complet",
          body: "Vous avez accès à tous les modules : Condo, Casa et Techniciens. Vous pouvez voir et analyser toutes les données sans restriction."
        },
        {
          heading: "KPIs Condo",
          body: "$/h cible : $120/h. Pts/jour cible : 8 pts. Rev/tech/jour cible : $1 200. Taux de callbacks cible : 2-3%."
        },
        {
          heading: "Système de points",
          body: "Grille complete ci-dessous", isTable: true
        }
      ]
    }
  },
  casa: {
    dispatch_casa: {
      title: "Dashboard Casa — Vue Dispatch",
      sections: [
        {
          heading: "Ce que vous voyez",
          body: "Performance journalière des techniciens Casa : revenu réel vs prévu, $/h, $/km, et heures travaillées par technicien par journée."
        },
        {
          heading: "KPIs clés",
          body: "$/h cible : varie selon la saison (déc-mars : $90/h, avr/oct/nov : $100/h, mai-sept : $120/h). $/km cible : $27/km. Rev/tech/jour cible : $1 200/jour."
        },
        {
          heading: "Filtres disponibles",
          body: "Filtrez par date, par technicien (multi-sélection avec recherche), et excluez des techniciens des calculs KPI sans les retirer du tableau. Le toggle Mixte/Ticket exclut les journées mixtes des KPIs."
        },
        {
          heading: "Les 2 tableaux",
          body: "Par technicien : vue consolidée avec jours, revenus, $/h et heures. Détail journées : chaque ligne = 1 technicien pour 1 journée, avec l'écart rev et $/km."
        }
      ]
    },
    admin: {
      title: "Dashboard Casa — Vue Admin",
      sections: [
        {
          heading: "Ce que vous voyez",
          body: "Performance complète des techniciens Casa. Données journalières : revenu réel vs prévu, $/h, $/km, heures travaillées."
        },
        {
          heading: "KPIs et seuils saisonniers",
          body: "$/h : $90/h (déc-mars), $100/h (avr/oct/nov), $120/h (mai-sept). $/km cible : $27/km. Rev/tech/jour : $1 200/jour."
        },
        {
          heading: "Exclusions",
          body: "Lignes avec note 'mixte' ou 'ticket' peuvent être exclues des KPIs via le toggle. Les lignes avec Real KM = 1 sont exclues du $/km (déplacements sans service)."
        }
      ]
    }
  },
  tech: {
    manager_tech: {
      title: "Dashboard Techniciens",
      sections: [
        {
          heading: "Ce que vous voyez",
          body: "Performance consolidée de chaque technicien sur Condo et Casa : revenu total, $/h, jours travaillés, cible et écart vs cible."
        },
        {
          heading: "Cibles $/h par saison — Condo",
          body: "Décembre à mars : $100/h. Avril à novembre : $120/h."
        },
        {
          heading: "Cibles $/h par saison — Casa",
          body: "Décembre à mars : $90/h. Avril, octobre, novembre : $100/h. Mai à septembre : $120/h."
        },
        {
          heading: "Colonnes du tableau",
          body: "Rev Total : revenu Condo + Casa. $/h Total : performance globale vs cible. Cible $ : revenu qu'il aurait dû générer avec ses heures. Écart $ : positif = au-dessus de la cible (vert), négatif = sous la cible (rouge). Cible $/h et Écart $/h : même logique en taux horaire."
        },
        {
          heading: "Filtres",
          body: "Filtrez par période et par technicien pour analyser un ou plusieurs techs spécifiques. Excluez des techniciens des KPIs globaux sans les retirer du tableau."
        }
      ]
    },
    admin: {
      title: "Dashboard Techniciens — Vue Admin",
      sections: [
        {
          heading: "Ce que vous voyez",
          body: "Performance consolidée Condo + Casa de chaque technicien avec cibles saisonnières pondérées."
        },
        {
          heading: "Cibles $/h — Condo",
          body: "Décembre à mars : $100/h. Avril à novembre : $120/h."
        },
        {
          heading: "Cibles $/h — Casa",
          body: "Décembre à mars : $90/h. Avril, octobre, novembre : $100/h. Mai à septembre : $120/h."
        },
        {
          heading: "Lecture des écarts",
          body: "Écart $ = Revenu réel - Cible $. Vert = au-dessus de la cible. Rouge = sous la cible. La cible est pondérée par les heures réelles travaillées chaque mois."
        }
      ]
    },
    manager_condo: {
      title: "Dashboard Techniciens",
      sections: [
        {
          heading: "Ce que vous voyez",
          body: "Performance consolidée Condo + Casa de chaque techinicien avec cibles saisonnières et écarts."
        },
        {
          heading: "Cibles $/h — Condo",
          body: "Décembre à mars : $100/h!怔 Avril à novembre : $120/h."
        },
        {
          heading: "Cibles $/h — Casa",
          body: "Décembre à mars : $90/h. Avril, octobre, novembre : $100/h. Mai à septembre : $120/h."
        },
        {
          heading: "Colonnes clés",
          body: "Cible $ = heures travaillées x cible du mois. Écart $ = Revenu réel - Cible $. Vert = au-dessus, rouge = sous la cible."
        }
      ]
    }
  },
  billing: {
    admin: {
      title: 'Dashboard Facturation — Guide',
      sections: [
        {
          heading: 'KPIs principaux',
          body: 'Revenu Facture : somme des Quote sur les jobs Done (hors CONDO KPI). Revenu Encaisse : somme des Done sur les jobs payes. Ecart : Facture moins Encaisse — negatif = rabais ou service annule, positif = vente additionnelle.'
        },
        {
          heading: 'Comptes a recevoir (AR)',
          body: 'AR Total : somme des Quote sur les jobs Unpaid (hors CONDO KPI). AR +30 jours : jobs Unpaid depuis plus de 30 jours — priorite de relance. AR 0-30 jours : jobs Unpaid recents — a surveiller.'
        },
        {
          heading: 'Onglets disponibles',
          body: 'Vue ensemble : repartition par statut et type de paiement. Comptes a recevoir : liste detaillee des Unpaid triable par date, client, montant, anciennete. Par type paiement : Cash, CARD, CHECK, E-TRANSFER, EXTERNAL, FREE, INTERAC, VIREMENT avec % du total. Detail complet : toutes les lignes triables avec filtres.'
        },
        {
          heading: 'Filtres',
          body: 'Annee (2025 / 2026 / les deux), date debut et fin, Job Status (Done / Cancelled / Replanned / Duplicate), Payment Status (Paid / Unpaid / Free / Ticket / On other invoice / No Payment).'
        },
        {
          heading: 'Regles de calcul',
          body: 'Les lignes CONDO KPI sont exclues de tous les calculs. Les jobs avec Quote = 0 sont exclus du detail et des AR. Payment Status Unpaid = montant Quote dans AR. Payment Status Paid = montant Done dans Encaisse.'
        }
      ]
    },
    billing: {
      title: 'Dashboard Facturation — Guide',
      sections: [
        {
          heading: 'KPIs principaux',
          body: 'Revenu Facture : somme des Quote sur les jobs Done. Revenu Encaisse : somme des Done sur les jobs payes. Ecart : Facture moins Encaisse.'
        },
        {
          heading: 'Comptes a recevoir',
          body: 'AR Total : jobs Unpaid a recouvrer. AR +30 jours : priorite de relance immediate. AR 0-30 jours : a surveiller. Dans longlet Comptes a recevoir, les lignes en rouge sont les jobs de plus de 30 jours.'
        },
        {
          heading: 'Relance client',
          body: 'Trier le tableau AR par Jours (decroissant) pour voir les plus anciens en premier. La colonne Notes contient les informations utiles pour la relance.'
        },
        {
          heading: 'Types de paiement',
          body: 'Cash, CARD, CHECK, E-TRANSFER, EXTERNAL, FREE, INTERAC, VIREMENT. Longlet Par type paiement montre la repartition en % du revenu total encaisse.'
        }
      ]
    }
  },
};

function getHelp(dept, role) {
  const deptContent = HELP_CONTENT[dept];
  if (!deptContent) return null;
  return deptContent[role] || deptContent['admin'] || null;
}

export default function HelpPanel({ dept, role }) {
  const [open, setOpen] = useState(false);
  const help = getHelp(dept, role);
  if (!help) return null;

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        style={{ padding: '6px 14px', borderRadius: 6, border: '1px solid #1A2B4A', fontSize: 13, cursor: 'pointer', background: 'transparent', color: '#1A2B4A', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6 }}
      >
        <span style={{ fontSize: 15, fontWeight: 700 }}>?</span> Aide
      </button>

      {open && (
        <>
          <div onClick={() => setOpen(false)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.3)', zIndex: 200 }} />
          <div style={{ position: 'fixed', top: 0, right: 0, height: '100vh', width: 420, background: '#fff', zIndex: 201, boxShadow: '-4px 0 24px rgba(0,0,0,0.15)', display: 'flex', flexDirection: 'column', overflowY: 'auto' }}>
            <div style={{ background: '#1A2B4A', padding: '24px 24px 20px', color: '#fff' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <div style={{ fontSize: 11, color: '#93C5FD', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6 }}>Guide d'utilisation</div>
                  <div style={{ fontSize: 18, fontWeight: 700 }}>{help.title}</div>
                </div>
                <button onClick={() => setOpen(false)} style={{ background: 'rgba(255,255,255,0.15)', border: 'none', color: '#fff', borderRadius: 6, width: 32, height: 32, cursor: 'pointer', fontSize: 18, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>×</button>
              </div>
            </div>
            <div style={{ padding: '24px', flex: 1 }}>
              {help.sections.map((s, i) => (
                <div key={i} style={{ marginBottom: 24 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: '#1A2B4A', marginBottom: 8, paddingBottom: 6, borderBottom: '2px solid #E8A020' }}>{s.heading}</div>
                  <div style={{ fontSize: 13, color: '#444', lineHeight: 1.7 }}>
                  {s.isTable ? (
                    <>
                      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12, marginBottom: 8 }}>
                        <thead><tr>
                          <th style={{ background: '#1A2B4A', color: '#fff', padding: '5px 8px', textAlign: 'left' }}>Service</th>
                          <th style={{ background: '#1A2B4A', color: '#fff', padding: '5px 8px', textAlign: 'right' }}>Pts/RDV</th>
                        </tr></thead>
                        <tbody>
                          {[['Contrat Day','4,00'],['Trio (Ech+M/C+Sech)','1,00'],['Ech+Centrale/Murale','1,00'],['Centrale seule','1,00'],['Echangeur seul','0,75'],['Murale seule','0,50'],['Sech+Inspection','0,50'],['Sech simple','0,25'],['Inspection seule','0']].map(([svc,pts],i) => (
                            <tr key={i} style={{ background: i%2===0 ? '#fff' : '#f5f7fa' }}>
                              <td style={{ padding: '4px 8px', borderBottom: '1px solid #eee', color: '#333' }}>{svc}</td>
                              <td style={{ padding: '4px 8px', borderBottom: '1px solid #eee', textAlign: 'right', fontWeight: 600, color: '#1A2B4A' }}>{pts}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                      <div style={{ fontSize: 11, color: '#666', marginBottom: 6 }}>Add-ons (+0.25 pt chacun, max +0.50/RDV) : Fan salle de bain, Hotte, Benefect, 5.5/Penthouse</div>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                        <span style={{ background: '#dcfce7', color: '#166534', borderRadius: 4, padding: '2px 6px', fontSize: 11 }}>8+ pts = objectif</span>
                        <span style={{ background: '#fef9c3', color: '#713f12', borderRadius: 4, padding: '2px 6px', fontSize: 11 }}>7.9 à 4 = acceptable</span>
                        <span style={{ background: '#fee2e2', color: '#991b1b', borderRadius: 4, padding: '2px 6px', fontSize: 11 }}>sous 4 = action corrective</span>
                      </div>
                    </>
                  ) : s.body}
                </div>
                </div>
              ))}
            </div>
            <div style={{ padding: '16px 24px', borderTop: '1px solid #f0f0f0', fontSize: 11, color: '#aaa', textAlign: 'center' }}>
              DuraClim — Dashboard Opérationnel 2026
            </div>
          </div>
        </>
      )}
    </>
  );
}
