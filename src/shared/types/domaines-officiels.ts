// Referentiel officiel des domaines d'apprentissage par cycle
// Source: programmes officiels de l'Education Nationale (cycles 1, 2, 3)

export type NiveauCode = 'PS' | 'MS' | 'GS' | 'CP' | 'CE1' | 'CE2' | 'CM1' | 'CM2';
export type CycleNumber = 1 | 2 | 3;

export const NIVEAU_TO_CYCLE: Record<NiveauCode, CycleNumber> = {
  PS: 1, MS: 1, GS: 1,
  CP: 2, CE1: 2, CE2: 2,
  CM1: 3, CM2: 3,
};

export const NIVEAUX_ORDERED: { code: NiveauCode; libelle: string; cycle: CycleNumber }[] = [
  { code: 'PS',  libelle: 'Petite Section',      cycle: 1 },
  { code: 'MS',  libelle: 'Moyenne Section',      cycle: 1 },
  { code: 'GS',  libelle: 'Grande Section',       cycle: 1 },
  { code: 'CP',  libelle: 'Cours Preparatoire',   cycle: 2 },
  { code: 'CE1', libelle: 'Cours Elementaire 1',  cycle: 2 },
  { code: 'CE2', libelle: 'Cours Elementaire 2',  cycle: 2 },
  { code: 'CM1', libelle: 'Cours Moyen 1',        cycle: 3 },
  { code: 'CM2', libelle: 'Cours Moyen 2',        cycle: 3 },
];

export interface DomaineOfficiel {
  nom: string;
  codeLsu: string;
  ordreAffichage: number;
}

// Domaines par cycle — source de verite pour le filtrage
// Les domaines portant le meme nom entre cycles partagent une seule ligne en DB
export const DOMAINES_OFFICIELS: Record<CycleNumber, DomaineOfficiel[]> = {
  1: [
    { nom: 'Mobiliser le langage dans toutes ses dimensions', codeLsu: 'LGA', ordreAffichage: 1 },
    { nom: 'Agir, s\'exprimer, comprendre a travers l\'activite physique', codeLsu: 'APH', ordreAffichage: 2 },
    { nom: 'Agir, s\'exprimer, comprendre a travers les activites artistiques', codeLsu: 'AAR', ordreAffichage: 3 },
    { nom: 'Construire les premiers outils pour structurer sa pensee', codeLsu: 'OPS', ordreAffichage: 4 },
    { nom: 'Explorer le monde', codeLsu: 'EXM', ordreAffichage: 5 },
  ],
  2: [
    { nom: 'Francais', codeLsu: 'FRA', ordreAffichage: 1 },
    { nom: 'Mathematiques', codeLsu: 'MAT', ordreAffichage: 2 },
    { nom: 'Questionner le monde', codeLsu: 'QLM', ordreAffichage: 3 },
    { nom: 'Enseignement Moral et Civique', codeLsu: 'EMC', ordreAffichage: 4 },
    { nom: 'Education Physique et Sportive', codeLsu: 'EPS', ordreAffichage: 5 },
    { nom: 'Arts', codeLsu: 'ART', ordreAffichage: 6 },
    { nom: 'Langues Vivantes', codeLsu: 'LVE', ordreAffichage: 7 },
  ],
  3: [
    { nom: 'Francais', codeLsu: 'FRA', ordreAffichage: 1 },
    { nom: 'Mathematiques', codeLsu: 'MAT', ordreAffichage: 2 },
    { nom: 'Sciences et Technologies', codeLsu: 'SCT', ordreAffichage: 3 },
    { nom: 'Histoire-Geographie', codeLsu: 'HGE', ordreAffichage: 4 },
    { nom: 'Enseignement Moral et Civique', codeLsu: 'EMC', ordreAffichage: 5 },
    { nom: 'Education Physique et Sportive', codeLsu: 'EPS', ordreAffichage: 6 },
    { nom: 'Arts Plastiques', codeLsu: 'APL', ordreAffichage: 7 },
    { nom: 'Education Musicale', codeLsu: 'EMU', ordreAffichage: 8 },
    { nom: 'Langues Vivantes', codeLsu: 'LVE', ordreAffichage: 9 },
  ],
};

/** Derive le cycle a partir du niveau scolaire */
export function getCycleForNiveau(niveau: NiveauCode): CycleNumber {
  return NIVEAU_TO_CYCLE[niveau];
}

/** Retourne la liste des noms de domaines pour un cycle donne */
export function getDomaineNamesForCycle(cycle: CycleNumber): string[] {
  return DOMAINES_OFFICIELS[cycle].map(d => d.nom);
}

/** Retourne tous les noms de domaines officiels (tous cycles confondus, dedupliques) */
export function getAllOfficialDomaineNames(): string[] {
  const names = new Set<string>();
  for (const cycle of [1, 2, 3] as CycleNumber[]) {
    for (const d of DOMAINES_OFFICIELS[cycle]) {
      names.add(d.nom);
    }
  }
  return Array.from(names);
}
