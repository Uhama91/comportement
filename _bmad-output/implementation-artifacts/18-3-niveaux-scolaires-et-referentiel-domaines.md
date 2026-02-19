# Story 18.3 : Niveaux Scolaires & Referentiel Domaines

Status: ready-for-dev

## Story

En tant qu'enseignant,
Je veux attribuer un niveau scolaire a chaque eleve et voir les domaines d'apprentissage officiels correspondant a son cycle,
Afin que le suivi respecte les programmes officiels par cycle (C1/C2/C3).

## Acceptance Criteria

1. **Given** l'enseignant accede aux parametres (NiveauxSettings),
   **When** il attribue un niveau (PS, MS, GS, CP, CE1, CE2, CM1, CM2) a un eleve,
   **Then** le niveau est enregistre dans `students.niveau`,
   **And** le cycle est deduit automatiquement (PS-GS → C1, CP-CE2 → C2, CM1-CM2 → C3).

2. **Given** l'enseignant a plusieurs eleves a configurer,
   **When** il utilise l'attribution en masse,
   **Then** il peut selectionner plusieurs eleves et leur attribuer le meme niveau en une action.

3. **Given** le fichier referentiel `domaines-officiels.ts`,
   **When** l'application charge les domaines pour un eleve,
   **Then** les domaines sont filtres par cycle : C1 (5 domaines), C2 (7 domaines), C3 (9 domaines),
   **And** les domaines custom definis par l'enseignant restent visibles en complement.

4. **Given** l'enseignant change le niveau d'un eleve (ex: CE2 → CM1, passage C2 → C3),
   **When** le cycle change,
   **Then** les domaines affiches dans le Module 3 s'adaptent automatiquement au nouveau cycle.

## Tasks / Subtasks

- [ ] **Task 1 : Referentiel TS `domaines-officiels.ts`** (AC: #3)
  - [ ] 1.1 Creer `src/shared/types/domaines-officiels.ts` avec :
    - Types `NiveauCode`, `CycleNumber`, `DomaineOfficiel`
    - Constante `NIVEAU_TO_CYCLE: Record<NiveauCode, CycleNumber>`
    - Constante `DOMAINES_OFFICIELS: Record<CycleNumber, DomaineOfficiel[]>` (5+7+9 domaines)
    - Helper `getCycleForNiveau(niveau: NiveauCode): CycleNumber`
  - [ ] 1.2 Ajouter les types `NiveauCode` et `CycleNumber` dans `types/index.ts` (re-export depuis domaines-officiels)

- [ ] **Task 2 : Seed domaines officiels par cycle** (AC: #3)
  - [ ] 2.1 Dans `appreciationStore.ts`, ajouter action `seedDomainesOfficiels()` :
    - Insere les domaines officiels depuis `DOMAINES_OFFICIELS` dans `domaines_apprentissage` (cycle, code_lsu, is_custom=0)
    - Utilise `INSERT OR IGNORE` (idempotent, basé sur nom+cycle UNIQUE)
    - Marque les domaines V2 existants (cycle=3 par M005) avec `is_custom=0`
  - [ ] 2.2 Appeler `seedDomainesOfficiels()` au demarrage (App.tsx) si la table est vide des domaines cycles 1 et 2

- [ ] **Task 3 : Etendre Student avec niveau** (AC: #1, #4)
  - [ ] 3.1 Ajouter `niveau: NiveauCode | null` dans l'interface `Student` (types/index.ts)
  - [ ] 3.2 Dans `studentStore.ts` :
    - Modifier la requete `loadStudents()` pour inclure `s.niveau` dans le SELECT
    - Ajouter action `updateStudentNiveau(studentId: number, niveau: NiveauCode | null): Promise<void>`
    - Ajouter action `updateStudentNiveauBatch(studentIds: number[], niveau: NiveauCode): Promise<void>` (AC: #2)

- [ ] **Task 4 : Composant `NiveauxSettings`** (AC: #1, #2)
  - [ ] 4.1 Creer `src/shared/components/NiveauxSettings.tsx` :
    - Liste des eleves avec dropdown niveau (PS→CM2) + badge cycle colore
    - Checkbox de selection multiple + bouton "Attribuer le niveau" (masse)
    - Afficher "(non defini)" pour les eleves sans niveau
  - [ ] 4.2 Integrer dans `Settings.tsx` (nouvelle section entre AnneeSettings et PeriodsSettings)

- [ ] **Task 5 : Filtrage domaines par cycle dans le Module 3** (AC: #3, #4)
  - [ ] 5.1 Etendre l'interface `Domaine` dans `appreciationStore.ts` :
    - Ajouter `cycle: number | null`, `codeLsu: string | null`, `isCustom: boolean`
  - [ ] 5.2 Modifier `loadDomaines()` dans `appreciationStore.ts` :
    - Ajouter parametre optionnel `cycle?: number`
    - Si cycle fourni : `WHERE (cycle = $1 OR is_custom = 1) AND actif = 1`
    - Si cycle absent (null) : charger tous les domaines actifs (retrocompatibilite)
  - [ ] 5.3 Modifier `apprentissage/index.tsx` :
    - Deriver le cycle de l'eleve selectionne via `NIVEAU_TO_CYCLE[student.niveau]`
    - Appeler `loadDomaines(cycle)` quand l'eleve selectionne change
    - Afficher le niveau et cycle de l'eleve dans la toolbar

- [ ] **Task 6 : Adapter DomainsSettings pour les cycles** (AC: #3)
  - [ ] 6.1 Modifier `DomainsSettings.tsx` :
    - Ajouter badge cycle (C1/C2/C3) a cote de chaque domaine
    - Les domaines officiels (is_custom=0) sont non-editables (nom grise)
    - Les domaines custom (is_custom=1) restent editables
    - L'ajout d'un nouveau domaine le cree avec `is_custom=1, cycle=NULL` (visible partout)

## Dev Notes

### Referentiel officiel des domaines par cycle

**Cycle 1 (PS, MS, GS) — 5 domaines :**
1. Mobiliser le langage dans toutes ses dimensions (LGA)
2. Agir, s'exprimer, comprendre a travers l'activite physique (APH)
3. Agir, s'exprimer, comprendre a travers les activites artistiques (AAR)
4. Construire les premiers outils pour structurer sa pensee (OPS)
5. Explorer le monde (EXM)

**Cycle 2 (CP, CE1, CE2) — 7 domaines :**
1. Francais (FRA)
2. Mathematiques (MAT)
3. Questionner le monde (QLM)
4. Enseignement Moral et Civique (EMC)
5. Education Physique et Sportive (EPS)
6. Arts (ART)
7. Langues Vivantes (LVE)

**Cycle 3 (CM1, CM2) — 9 domaines :**
1. Francais (FRA)
2. Mathematiques (MAT)
3. Sciences et Technologies (SCT)
4. Histoire-Geographie (HGE)
5. Enseignement Moral et Civique (EMC)
6. Education Physique et Sportive (EPS)
7. Arts Plastiques (APL)
8. Education Musicale (EMU)
9. Langues Vivantes (LVE)

[Source: prd-v2.1.md#FR44]

### Schema DB existant (migrations Story 18.1)

**M002** a ajoute `students.niveau TEXT DEFAULT NULL` + `students.annee_scolaire_id` + `students.ine`.

**M003** a cree `niveaux_classe` (referentiel lookup) :
```sql
niveaux_classe(code TEXT PK, libelle TEXT, cycle INTEGER CHECK(1,2,3), ordre INTEGER)
-- 8 rows: PS(1,1), MS(1,2), GS(1,3), CP(2,4), CE1(2,5), CE2(2,6), CM1(3,7), CM2(3,8)
```

**M005** a ajoute sur `domaines_apprentissage` :
```sql
cycle INTEGER DEFAULT NULL  -- 1, 2 ou 3
code_lsu TEXT DEFAULT NULL  -- code court pour export LSU
is_custom INTEGER DEFAULT 0 -- 0=officiel, 1=custom enseignant
-- + UPDATE existants: cycle=3, is_custom=0
```

→ Les colonnes existent deja en DB. Cette story ajoute les donnees et le code TS/React.

### Pattern store — loadStudents() modification

La requete actuelle (studentStore.ts:69-82) ne selectionne pas `s.niveau`. Ajouter simplement `s.niveau` dans le SELECT. Le mapping en StudentWithSanctions propagera automatiquement le champ.

### Seed strategy pour domaines officiels

Les 9 domaines V2 (Cycle 3 uniquement) existent deja dans `domaines_apprentissage` depuis V1 migration 7 (lib.rs:162-171). M005 les a marques `cycle=3, is_custom=0`.

Il faut ajouter les domaines Cycle 1 (5) et Cycle 2 (7) = 12 nouvelles lignes. Strategy :
- `INSERT OR IGNORE INTO domaines_apprentissage (nom, cycle, code_lsu, is_custom, ordre_affichage, actif) VALUES (...)`
- Les noms C3 existants ne seront pas dupliques grace a la contrainte UNIQUE(nom)

**Probleme potentiel :** La contrainte UNIQUE est sur `nom` seul, mais "Francais" existe en C2 ET C3. Il faut donc verifier si UNIQUE(nom) bloque l'insertion. Si oui, il faudra enlever la contrainte ou utiliser UNIQUE(nom, cycle).

→ **Verifier** : la migration V1 `CREATE TABLE domaines_apprentissage (nom TEXT NOT NULL UNIQUE)`. La contrainte UNIQUE(nom) est sur le nom seul. Pour supporter le meme nom dans des cycles differents (ex: "Francais" C2 et "Francais" C3), on devra soit :
  - (a) Modifier la contrainte UNIQUE(nom) → UNIQUE(nom, cycle) via une migration additionnelle
  - (b) Utiliser des noms distincts ("Francais" pour C3 existe, pas d'insert pour C2 Francais)
  - (c) Les domaines C2 et C3 avec le meme nom partagent la meme ligne DB (cycle=NULL = "tous cycles")

**Choix recommande :** Option (a) — ajouter une migration dans le seed code qui fait un `CREATE TABLE ... AS SELECT`, puis drop/recreate sans UNIQUE(nom), avec UNIQUE(nom, cycle). Ou plus simple : ne pas utiliser INSERT OR IGNORE mais verifier programmatiquement.

**Choix pragmatique :** Les domaines portant le meme nom entre C2 et C3 (Francais, Maths, EMC, EPS, LVE) sont en fait les memes domaines. On peut les traiter comme partages (cycle=NULL = "visible dans tous les cycles qui l'incluent"). Les domaines specifiques a un cycle ont des noms uniques (ex: "Questionner le monde" = C2 only, "Sciences et Technologies" = C3 only). Dans ce cas, le referentiel `DOMAINES_OFFICIELS` en TS gere le mapping, et en DB on garde une seule ligne par nom avec `cycle=NULL` pour les partages.

→ **Decision finale :** Creer un champ `cycles` en TS (pas en DB) pour savoir quels cycles affichent quel domaine. En DB, les domaines avec le meme nom n'ont qu'une seule ligne. Le filtrage par cycle se fait en TS via le referentiel.

**Approche simplifiee retenue :**
1. `domaines-officiels.ts` est le referentiel source de verite pour le mapping cycle → domaines
2. Les domaines en DB restent comme ils sont (une ligne par nom, cycle=3 pour les existants V2)
3. Le seed ajoute les domaines C1 et C2 qui n'existent PAS dans les C3 (noms uniques) + met a jour les domaines partages
4. Le filtrage dans `loadDomaines(cycle)` utilise le referentiel TS : `SELECT * FROM domaines_apprentissage WHERE nom IN (...)` avec la liste de noms du cycle demande

### Niveaux dans le select eleve (Module 3)

Ajouter un badge `(CM2 - C3)` a cote du nom de l'eleve dans le dropdown du Module 3 pour que l'enseignant voie le cycle de chaque eleve.

### Retrocompatibilite V2

Si un eleve n'a pas de niveau (`niveau = NULL`), les domaines C3 sont affiches par defaut (comportement V2 actuel = classe CM2 de l'ecole Victor Hugo).

### Conventions de nommage

| Element | Convention | Exemple |
|---------|-----------|---------|
| Types TS | `PascalCase` | `NiveauCode`, `CycleNumber`, `DomaineOfficiel` |
| Constantes TS | `UPPER_SNAKE` | `NIVEAU_TO_CYCLE`, `DOMAINES_OFFICIELS` |
| Composant React | `PascalCase` | `NiveauxSettings.tsx` |
| Colonnes DB | `snake_case` | `niveau`, `cycle`, `code_lsu`, `is_custom` |
| Referentiel fichier | `kebab-case` | `domaines-officiels.ts` |

### Fichiers a creer

- `src/shared/types/domaines-officiels.ts` — referentiel officiel
- `src/shared/components/NiveauxSettings.tsx` — composant Settings

### Fichiers a modifier

- `src/shared/types/index.ts` — `NiveauCode`, `CycleNumber` + `Student.niveau`
- `src/shared/stores/studentStore.ts` — SELECT niveau, actions updateNiveau + batch
- `src/shared/stores/appreciationStore.ts` — Domaine etendu, loadDomaines(cycle), seed
- `src/shared/components/Settings.tsx` — integrer NiveauxSettings
- `src/shared/components/DomainsSettings.tsx` — badges cycle, protection domaines officiels
- `src/modules/apprentissage/index.tsx` — filtrage domaines par cycle eleve
- `src/App.tsx` — appel seed domaines au demarrage

### References

- FR59 (niveaux) : [Source: prd-v2.1.md#FR59]
- FR42 (domaines dynamiques) : [Source: prd-v2.1.md#FR42]
- FR44 (referentiel officiel) : [Source: prd-v2.1.md#FR44]
- M002 (students.niveau) : [Source: v2_1.rs#M002]
- M003 (niveaux_classe) : [Source: v2_1.rs#M003]
- M005 (domaines cycle+code_lsu) : [Source: v2_1.rs#M005]
- Pattern stores Zustand : [Source: src/shared/stores/configStore.ts]
- Pattern Settings sections : [Source: src/shared/components/Settings.tsx]

## Dev Agent Record

### Agent Model Used

_A remplir par l'agent dev_

### Debug Log References

_A remplir pendant l'implementation_

### Completion Notes List

_A remplir apres implementation_

### File List

_Fichiers crees/modifies par l'agent dev_
