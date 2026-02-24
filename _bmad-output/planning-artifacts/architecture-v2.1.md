---
stepsCompleted: [1, 2, 3, 4, 5, 6, 7, 8]
status: 'complete'
completedAt: '2026-02-24'
inputDocuments:
  - prd-v2.1.md (V2.1-rev2)
  - architecture-v2.md
  - analysis/brainstorming-session-2026-02-24.md
  - ux-design-v2.md
  - research/technical-ia-locale-tauri-sidecars-research-2026-02-10.md
workflowType: 'architecture'
project_name: 'comportement'
user_name: 'Uhama'
date: '2026-02-24'
version: 'V2.1-rev2'
previous_version: 'V2.1 (2026-02-17)'
---

# Architecture Decision Document — Comportement V2.1-rev2

## Project Context Analysis

### Requirements Overview

**Functional Requirements:**
71 FRs au total — 33 Module 1 (enrichi, +3 FRs micro par eleve), 7 Module 2 Registre d'appel (nouveau), 5 Module 3 Evaluations (nouveau), 9 Module 4 LSU Vivant (nouveau), 6 Infrastructure IA (3 jobs LLM), 3 Gestion modeles, 7 Config+Annee+Import CSV, 1 Capture audio. Priorite : 85% Must, 15% Should.

Le coeur de V2.1-rev2 est la transformation en assistant pedagogique complet : event sourcing (`evenements_pedagogiques`), 4 modules (enrichi + 3 nouveaux), 3 jobs LLM, micro dual-mode par eleve, LSU vivant progressif.

**Non-Functional Requirements:**
34 NFRs — Performance (10), Securite RGPD (4), Compatibilite (5), Fiabilite (5), Accessibilite TBI (5), Migrations+Donnees (5). NFRs critiques : NFR6 (classify < 5s), NFR31 (synthese < 10s), NFR32 (appreciation < 15s), NFR33 (event sourcing immutable), NFR34 (versioning syntheses).

**Scale & Complexity:**

- Primary domain: desktop_app (Tauri v2)
- Complexity level: high (4 modules, 3 LLM jobs, event sourcing, double vue LSU)
- Estimated architectural components: ~18 (4 modules UI, sidebar, settings, sidecar manager, whisper, llama 3 jobs, GBNF, prompt builder, event store, synthese engine, absence manager, LSU exporter, migration system, CSV importer)

### Technical Constraints & Dependencies

- **Hardware** : PC ecole 4 Go RAM, pas de GPU — pipeline sequentiel obligatoire
- **Offline-first** : zero connexion reseau apres installation des modeles GGUF
- **Mode portable** : .exe unique sans installateur, modeles dans AppData
- **XSD LSU non public** : reverse-engineering depuis projets open source, fallback CSV/PDF
- **ctx-size 2048** : budget tokens limite pour prompt+observations+output LLM
- **Brownfield** : V1 en production, V2 completee (4 sprints), Epic 18-19 implementes — migrations additives uniquement
- **Stack figee** : Tauri v2 + React 18 + TypeScript + SQLite + Zustand + Tailwind

### Cross-Cutting Concerns

1. **Pipeline sequentiel IA** : un seul sidecar actif, 3 jobs LLM avec GBNF/prompt differents
2. **Event sourcing** : table `evenements_pedagogiques` immutable, jamais UPDATE/DELETE
3. **Multi-niveaux/multi-cycles** : impacte frontend (filtrage domaines), backend (GBNF, prompt), BDD (cycle par domaine)
4. **Micro dual-mode** : onPointerDown/onPointerUp avec seuil ~300ms, sur chaque carte eleve
5. **Double vue LSU** : par eleve (tous domaines) ET par domaine (tous eleves)
6. **Versioning syntheses** : 4-5 versions conservees, restauration possible
7. **Annee scolaire comme conteneur** : toutes les donnees scopees par annee+periode
8. **Migrations non destructives** : additives, backup auto, savepoints SQL
9. **RGPD** : prenoms + INE locaux uniquement, pas de telemetrie

### Delta V2.1 initiale → V2.1-rev2

| Aspect | V2.1 initiale (17 fev) | V2.1-rev2 (24 fev) |
|--------|------------------------|---------------------|
| Modules | 3 (Comportement+Individuel+Apprentissage) | 4 (Comportement enrichi + Registre + Evaluations + LSU Vivant) |
| Module 2 | Comportement Individuel (conserve) | **SUPPRIME** → vues filtrees |
| Micro | Unique global toolbar | **Par eleve** dual-mode sur carte |
| Modele donnees | Table `appreciations` evoluee | **Event sourcing** (`evenements_pedagogiques`) |
| LLM jobs | 1 (classify+merge) | **3** (classify, synthesize, appreciation) |
| Synthese | Manuelle | **On-demand LLM** versionnee |
| Vue LSU | Par eleve uniquement | **Double vue** par eleve + par domaine |
| Absences | Simple toggle | **Registre d'appel** complet (demi-journee, types, motifs) |
| Import | Saisie manuelle | **Import CSV** eleves |

## Starter Template Evaluation

### Selected Starter: Codebase V2 + Epic 18-19 implementes

**Rationale:** V1 en production depuis janvier 2026, V2 completee (4 sprints), Epics 18-20 de V2.1 implementes. La stack est validee. Aucun changement de stack.

**Architectural Decisions Already Established:**

**Language & Runtime:**
- Frontend: TypeScript strict + React 18
- Backend: Rust (Tauri v2 core + commandes IPC)
- Convention: camelCase (TS) / snake_case (Rust/SQLite), conversion via Serde

**Styling:** Tailwind CSS, responsive TBI, WCAG AA

**Build:** Vite + Tauri bundler, mode portable

**Testing:** cargo test (Rust), npm test (frontend), npx tsc --noEmit

**State Management:** Zustand (stores par domaine, try/catch obligatoire)

## Core Architectural Decisions

### ADRs V2 conservees (inchangees)

- ADR-001 : JSON pas SQL (LLM output → JSON, Rust reconstruit les INSERT)
- ADR-002 : Pipeline sequentiel (un seul sidecar actif, 4 Go RAM)
- ADR-003 : VAD natif whisper.cpp
- ADR-004 : Watchdog whisper-server (restart auto)
- ADR-005 : tauri-plugin-mic-recorder + Web Audio fallback
- ADR-006 : Qwen 2.5 Coder 1.5B

### ADRs V2.1 conservees (implementees)

- ADR-007 : GBNF dynamique (genere depuis BDD par Rust)
- ADR-008 : Budget tokens adaptatif (ctx-size 2048, troncature intelligente)
- ADR-010 : Undo atomique (previous_observations, swap SQL)
- ADR-011 : Annee scolaire flag+guard (check_annee_not_closed)
- ADR-013 : Migrations backup+savepoints

### ADR-009-rev : TranscriptPreview inline par carte eleve

**Decision :** Le panneau de revue n'est plus un ReviewPanel global mais un TranscriptPreview inline qui s'affiche apres chaque dictee depuis une carte eleve. Le micro est sur la carte, la preview aussi.

**Rationale :** Le micro est desormais par eleve (pas global toolbar). Le flux naturel est : carte → micro → preview → valider. Pas besoin d'un review panel centralise.

**Affects :** `TranscriptPreview.tsx` (existant, evolue), `dictationStore.ts` (existant)

### ADR-012 : Export LSU XML — Rust natif quick-xml

**Decision :** Conservee. Generation XML via `quick-xml` en Rust. Integre maintenant les absences (totaux par periode) et les syntheses versionnees.

**Affects :** `src-tauri/src/lsu/`, `LsuExport.tsx`

### ADR-014 : Event sourcing leger

**Decision :** Table `evenements_pedagogiques` immutable (append-only). Chaque observation, evaluation, et motif de sanction est un evenement. Jamais de UPDATE/DELETE sur cette table.

**Rationale :** Tracabilite complete, audit possible, sources depliables sous les syntheses. Compatible avec future sync mobile (V4, events immutables = merge trivial).

**Affects :** Nouveau module Rust `src-tauri/src/events/`, nouveau store `eventStore.ts`, impacte tous les modules qui capturent des donnees.

**SQL (table principale) :**
```sql
CREATE TABLE evenements_pedagogiques (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  uuid TEXT UNIQUE,
  eleve_id INTEGER NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  annee_scolaire_id INTEGER NOT NULL REFERENCES annees_scolaires(id),
  periode_id INTEGER REFERENCES config_periodes(id),
  type TEXT NOT NULL CHECK(type IN ('observation', 'evaluation', 'motif_sanction')),
  domaine_id INTEGER REFERENCES domaines_apprentissage(id),
  lecon TEXT,
  niveau_lsu TEXT CHECK(niveau_lsu IN ('non_atteints', 'partiellement_atteints', 'atteints', 'depasses')),
  observations TEXT,
  texte_dictation TEXT,
  source TEXT DEFAULT 'manual' CHECK(source IN ('vocal', 'manual')),
  created_at TEXT DEFAULT (datetime('now')),
  synced_at TEXT
);
```

**Enforcement :** Aucune commande Tauri ne doit exposer de UPDATE/DELETE sur `evenements_pedagogiques`. Si une correction est necessaire, un nouvel evenement est cree.

### ADR-015 : 3 jobs LLM

**Decision :** Le sidecar llama-server execute 3 jobs distincts au lieu de 1. Chaque job a son propre prompt et sa propre GBNF.

**Rationale :** Separation des responsabilites. Chaque job optimise pour sa tache. Budget tokens adapte (Job 1 court, Job 2-3 plus longs).

| Job | Input | Output | GBNF | Budget tokens | Temps max |
|-----|-------|--------|------|---------------|-----------|
| **Job 1 — Classify** | Texte dicte + domaines actifs + obs existantes | `{ "domaine_id": N, "observation": "texte" }` | Dynamique (domaines) | 2048 | < 5s |
| **Job 2 — Synthesize** | Tous events d'un domaine pour la periode | `{ "synthese": "texte" }` | Simple string | 2048 | < 10s |
| **Job 3 — Appreciation** | Toutes syntheses + comportement | `{ "appreciation": "texte" }` | Simple string | 2048 | < 15s |

**Affects :** `src-tauri/src/sidecar/structuration.rs` (evolue, 3 fonctions), `gbnf.rs` (evolue), `prompt_builder.rs` (evolue, 3 builders)

### ADR-016 : Micro dual-mode par eleve

**Decision :** Bouton micro sur chaque carte eleve dans le tableau collectif. Dual-mode via `onPointerDown`/`onPointerUp` avec seuil ~300ms.

**Rationale :** L'eleve est deja identifie par la carte — pas besoin de le selectionner. Tap court = toggle continu (pratique au bureau), press long = push-to-talk (pratique debout).

**Affects :** `StudentGridCard.tsx` (evolue), `dictationStore.ts` (evolue), `useAudioRecorder.ts` (inchange)

**Implementation :**
```typescript
// Sur chaque StudentGridCard
onPointerDown → startTimer (300ms)
onPointerUp →
  if elapsed < 300ms → toggle continuous recording
  else → stop push-to-talk recording
```

### ADR-017 : Double vue LSU

**Decision :** Module 4 (LSU Vivant) offre deux vues : par eleve (tous domaines) et par domaine (tous eleves).

**Rationale :** Miroir de l'interface Pleiade. Vue par eleve = rediger le livret. Vue par domaine = verifier coherence entre eleves.

**Affects :** Nouveau module `src/modules/lsu-vivant/`, nouveaux composants `StudentLsuView.tsx`, `DomainLsuView.tsx`

### ADR-018 : Suppression Module 2

**Decision :** Module 2 (Comportement Individuel) supprime. Les incidents sont remplaces par des `evenements_pedagogiques`. Les vues individuelles sont des filtres dans Evaluations et LSU Vivant.

**Rationale :** Evite la duplication de saisie. Tout passe par un flux unique (event sourcing).

**Affects :** `src/modules/comportement-individuel/` deprecie (conserve pour retrocompat), navigation sidebar mise a jour.

### ADR-019 : Registre d'appel

**Decision :** Nouvelle table `absences_v2` avec demi-journees, 3 types d'absence, motifs, retards. Alerte glissante 30 jours (pas calendaire).

**Rationale :** Le registre d'appel est une obligation legale. Les totaux alimentent automatiquement l'export LSU.

**Affects :** Nouveau module `src/modules/registre-appel/`, nouveau store `absenceStore.ts`, nouveau module Rust `src-tauri/src/absences/`

**SQL :**
```sql
CREATE TABLE absences_v2 (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  eleve_id INTEGER NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  date TEXT NOT NULL,
  demi_journee TEXT NOT NULL CHECK(demi_journee IN ('matin', 'apres_midi')),
  type_absence TEXT NOT NULL CHECK(type_absence IN ('justifiee', 'medicale', 'injustifiee')),
  motif TEXT,
  retard INTEGER DEFAULT 0,
  annee_scolaire_id INTEGER NOT NULL REFERENCES annees_scolaires(id),
  created_at TEXT DEFAULT (datetime('now')),
  UNIQUE(eleve_id, date, demi_journee)
);
```

### ADR-020 : Import CSV eleves

**Decision :** Parsing CSV simple (prenom, niveau PS-CM2, optionnel: nom). Rapport d'import. Pas de mapping complexe.

**Rationale :** L'enseignant recoit une liste d'eleves en debut d'annee. Evite la saisie manuelle fastidieuse.

**Affects :** Nouveau composant `CsvImport.tsx`, nouveau module Rust `src-tauri/src/import/`

### Decision Impact Analysis

**Implementation Sequence :**
1. ADR-014 (event sourcing) — nouvelle table fondamentale + migrations
2. ADR-019 (registre d'appel) — nouveau module independant
3. ADR-016 (micro par eleve) — refonte capture audio
4. ADR-015 (3 jobs LLM) — extension pipeline existant
5. ADR-017 (double vue LSU) — nouveau module UI
6. ADR-018 (suppression Module 2) — nettoyage navigation
7. ADR-012 (LSU XML) — export final
8. ADR-020 (import CSV) — utilitaire independant

## Implementation Patterns & Consistency Rules

### Naming Patterns

| Contexte | Convention | Exemple |
|----------|-----------|---------|
| Tables SQLite | `snake_case` pluriel | `evenements_pedagogiques`, `absences_v2`, `syntheses_lsu` |
| Colonnes SQLite | `snake_case` | `niveau_lsu`, `demi_journee`, `type_absence` |
| Index SQLite | `idx_{table}_{colonne}` | `idx_events_eleve`, `idx_absences_v2_date` |
| Commandes Tauri (Rust) | `snake_case` | `add_event`, `generate_synthese`, `compute_absences` |
| Fonctions TS | `camelCase` | `addEvent()`, `generateSynthese()`, `computeAbsences()` |
| Composants React | `PascalCase` | `StudentLsuView.tsx`, `AttendanceGrid.tsx` |
| Stores Zustand | `camelCase` + suffixe `Store` | `eventStore.ts`, `absenceStore.ts`, `syntheseStore.ts` |
| Fichiers TS | `camelCase` | `eventStore.ts`, `useDualModeMic.ts` |
| Fichiers Rust modules | `snake_case` | `events.rs`, `absences.rs`, `synthese.rs` |
| Events Tauri | `kebab-case` | `sidecar-status`, `pipeline-progress` |
| Types TS | `PascalCase` | `EvenementPedagogique`, `SyntheseLsu`, `AbsenceV2` |

### Structure Patterns

**Modules Rust V2.1-rev2 :**

```
src-tauri/src/
  sidecar/
    mod.rs                  # re-exports
    manager.rs              # SidecarManager (existant V2)
    transcription.rs        # whisper-server (existant V2)
    structuration.rs        # llama-server (REFONDE — 3 jobs)
    gbnf.rs                 # generateur GBNF (existant, evolue pour Job 2-3)
    prompt_builder.rs       # constructeur prompt (existant, evolue 3 builders)
    config.rs               # (existant)
    types.rs                # (evolue — 3 formats output)
    validation/
      mod.rs                # (existant V2)
      schema.rs             # (evolue — 3 schemas)
      validator.rs          # (existant)
      executor.rs           # (existant — undo transaction)
  events/
    mod.rs                  # NEW: CRUD evenements pedagogiques
    queries.rs              # NEW: requetes filtrage/aggregation
  absences/
    mod.rs                  # NEW: CRUD absences + calculs
    alerts.rs               # NEW: alerte 4+ injustifiees/30j
  synthese/
    mod.rs                  # NEW: generation + versioning syntheses
  import/
    mod.rs                  # NEW: parser CSV eleves
  migrations/
    mod.rs                  # runner de migrations (existant)
    v2_1.rs                 # migrations V2→V2.1 (existant)
    v2_1_rev2.rs            # NEW: migrations V2.1→V2.1-rev2
  lsu/
    mod.rs                  # export LSU (existant, evolue)
    xml_builder.rs          # generation XML (existant, evolue)
    checklist.rs            # verification pre-export (existant, evolue)
  audio/mod.rs              # (inchange)
  models/                   # (inchange)
```

### Format Patterns

**Job 1 — Classify (GBNF dynamique) :**
```json
{ "domaine_id": 3, "observation": "L'eleve fait des progres..." }
```

**Job 2 — Synthesize :**
```json
{ "synthese": "Durant cette periode, l'eleve a montre..." }
```

**Job 3 — Appreciation generale :**
```json
{ "appreciation": "Eleve serieux et implique..." }
```

### Communication Patterns

**Events Tauri :**

| Event | Payload | Emetteur |
|-------|---------|----------|
| `sidecar-status` | `{ name, status: "starting"\|"ready"\|"stopping"\|"stopped"\|"error" }` | SidecarManager |
| `pipeline-progress` | `{ step: "recording"\|"transcribing"\|"classifying"\|"done", detail? }` | Pipeline |
| `synthese-progress` | `{ step: "generating"\|"done", domainId, eleveId }` | Synthese engine |
| `migration-progress` | `{ current, total, name }` | Migration runner |

### State Management Patterns

**Nouveaux stores V2.1-rev2 :**

```typescript
// eventStore — evenements pedagogiques (event sourcing)
interface EventStore {
  events: EvenementPedagogique[];
  isLoading: boolean;
  loadEvents: (eleveId: number, periodeId?: number) => Promise<void>;
  loadEventsByDomaine: (domaineId: number, periodeId: number) => Promise<void>;
  addEvent: (data: NewEvent) => Promise<boolean>;
  // Pas de update/delete — event sourcing immutable
}

// absenceStore — registre d'appel
interface AbsenceStore {
  absences: AbsenceV2[];
  alerts: AbsenceAlert[];
  isLoading: boolean;
  loadAbsences: (date: string) => Promise<void>;
  toggleAbsence: (eleveId: number, date: string, demiJournee: string) => Promise<void>;
  updateType: (id: number, type: string) => Promise<void>;
  addMotif: (id: number, motif: string) => Promise<void>;
  toggleRetard: (eleveId: number, date: string, demiJournee: string) => Promise<void>;
  computeAlerts: () => Promise<void>;
  getTotauxPeriode: (periodeId: number) => Promise<TotauxAbsences>;
}

// syntheseStore — syntheses LSU versionnees
interface SyntheseStore {
  syntheses: SyntheseLsu[];
  appreciations: AppreciationGenerale[];
  isLoading: boolean;
  isGenerating: boolean;
  loadSyntheses: (eleveId: number, periodeId: number) => Promise<void>;
  generateSynthese: (eleveId: number, periodeId: number, domaineId: number) => Promise<void>;
  updateSynthese: (id: number, contenu: string) => Promise<void>;
  generateAppreciation: (eleveId: number, periodeId: number) => Promise<void>;
  updateAppreciation: (id: number, contenu: string) => Promise<void>;
  getVersions: (eleveId: number, periodeId: number, domaineId: number) => Promise<SyntheseLsu[]>;
  restoreVersion: (id: number) => Promise<void>;
}
```

Regles :
- Chaque action async wrappee dans try/catch
- `eventStore` n'a PAS de `updateEvent` ni `deleteEvent` (ADR-014)
- Stores appellent `invoke()` via utils (pas directement dans composants)

### Process Patterns

**Error handling pipeline IA :**

| Etape | Erreur | Handling |
|-------|--------|----------|
| Audio capture | Permission micro refusee | Toast + redirection Settings OS |
| Whisper STT | Reponse vide | Retry 1x (watchdog), puis message erreur |
| LLM Job 1 (classify) | JSON invalide | Retry 1x, puis fallback saisie manuelle |
| LLM Job 2 (synthese) | Texte vide/trop court | Message erreur, enseignant redige manuellement |
| LLM Job 3 (appreciation) | Texte > 1500 chars | Troncature avec avertissement |
| INSERT event | Erreur SQL | Message erreur, donnees intactes |

**Guard pattern (inchange) :**
```rust
fn check_annee_not_closed(db: &Connection, annee_id: i64) -> Result<(), String>
```

### Enforcement Guidelines

**Tout agent IA DOIT :**
1. Suivre les conventions de nommage
2. JAMAIS executer UPDATE/DELETE sur `evenements_pedagogiques`
3. Wrapper toute action async dans try/catch (TS) ou `Result<>` (Rust)
4. Appeler `check_annee_not_closed()` avant toute ecriture scopee par annee
5. Emettre les events Tauri avec les noms documentes
6. Ne jamais exposer d'ID BDD au LLM — utiliser des index locaux 1-N
7. Valider la sortie LLM avec les 4 couches avant insertion
8. Versionner les syntheses (version N+1, conserver N-4 a N)

### Anti-Patterns

- UPDATE/DELETE sur `evenements_pedagogiques` (immutable !)
- Generer automatiquement des syntheses (toujours on-demand)
- Micro global au lieu de micro par carte eleve
- Store unique pour tout le pipeline
- `invoke()` directement dans un composant React
- `camelCase` dans les colonnes SQLite
- Hardcoder des domaines dans le GBNF

## Project Structure & Boundaries

### Complete Project Directory Structure

```
comportement/
├── package.json
├── tsconfig.json
├── vite.config.ts
├── postcss.config.js
├── tailwind.config.js
├── index.html
├── CLAUDE.md
├── _bmad-output/planning-artifacts/
├── src/
│   ├── App.tsx                          # Router 4 modules + sidebar
│   ├── main.tsx
│   ├── index.css
│   ├── modules/
│   │   ├── comportement-classe/         # Module 1 (enrichi — micro par eleve)
│   │   │   ├── index.tsx
│   │   │   ├── StudentGrid.tsx
│   │   │   ├── StudentGridCard.tsx      # EVOLUE — bouton micro dual-mode
│   │   │   ├── TBIView.tsx
│   │   │   ├── WeeklySummary.tsx
│   │   │   ├── SanctionReasonModal.tsx
│   │   │   └── WeeklyRewardLine.tsx
│   │   ├── registre-appel/              # Module 2 (NOUVEAU)
│   │   │   ├── index.tsx                # Layout registre
│   │   │   ├── AttendanceGrid.tsx       # Grille eleves x jours
│   │   │   ├── AbsenceTypeSelect.tsx    # Select type absence
│   │   │   ├── MotifInput.tsx           # Motif texte ou vocal
│   │   │   ├── AlertBadge.tsx           # Badge alerte 4+ injustifiees
│   │   │   └── AbsenceSummary.tsx       # Totaux par periode
│   │   ├── evaluations/                 # Module 3 (NOUVEAU, remplace apprentissage)
│   │   │   ├── index.tsx                # Layout evaluations
│   │   │   ├── EvaluationForm.tsx       # Formulaire saisie individuelle
│   │   │   ├── BatchEvaluation.tsx      # Saisie par lot (grille)
│   │   │   ├── EvaluationHistory.tsx    # Timeline par eleve
│   │   │   └── DomainSelect.tsx         # Select domaine filtre par cycle
│   │   ├── lsu-vivant/                  # Module 4 (NOUVEAU)
│   │   │   ├── index.tsx                # Layout avec tabs vue eleve/domaine
│   │   │   ├── StudentLsuView.tsx       # Vue par eleve (tous domaines)
│   │   │   ├── DomainLsuView.tsx        # Vue par domaine (tous eleves)
│   │   │   ├── SynthesisCard.tsx        # Carte synthese + edit + versions
│   │   │   ├── SourceAccordion.tsx      # Sources depliables
│   │   │   ├── GeneralAppreciation.tsx  # Appreciation generale
│   │   │   ├── VersionHistory.tsx       # Historique versions (4-5)
│   │   │   └── LsuExport.tsx            # Export XML + checklist
│   │   ├── apprentissage/               # DEPRECATED (conserve pour retrocompat)
│   │   │   └── ...                      # Fichiers existants, plus d'evolution
│   │   └── comportement-individuel/     # DEPRECATED (ADR-018)
│   │       └── ...
│   ├── shared/
│   │   ├── components/
│   │   │   ├── Sidebar.tsx              # EVOLUE — 4 modules + deprecated hidden
│   │   │   ├── ModuleHeader.tsx
│   │   │   ├── Settings.tsx             # EVOLUE — sections annee, niveaux, LSU, import
│   │   │   ├── PeriodsSettings.tsx
│   │   │   ├── DomainsSettings.tsx
│   │   │   ├── ModelSetupWizard.tsx
│   │   │   ├── DownloadProgress.tsx
│   │   │   ├── UsbInstall.tsx
│   │   │   ├── HelpSection.tsx
│   │   │   ├── PeriodSelector.tsx
│   │   │   ├── AnneeSettings.tsx        # Existant (Epic 18)
│   │   │   ├── NiveauxSettings.tsx      # Existant (Epic 18)
│   │   │   ├── LsuSettings.tsx          # EVOLUE (identifiants ONDE)
│   │   │   ├── NewYearWizard.tsx        # NEW
│   │   │   ├── CsvImport.tsx            # NEW
│   │   │   ├── ToolbarMic.tsx           # DEPRECATED (micro desormais par carte)
│   │   │   └── TranscriptPreview.tsx    # EVOLUE (appele depuis carte eleve)
│   │   ├── stores/
│   │   │   ├── studentStore.ts          # Evolue (niveau, annee_id, ine)
│   │   │   ├── incidentStore.ts         # DEPRECATED (remplace par eventStore)
│   │   │   ├── appreciationStore.ts     # DEPRECATED (remplace par eventStore+syntheseStore)
│   │   │   ├── configStore.ts           # Evolue (annee_id sur periodes)
│   │   │   ├── modelStore.ts
│   │   │   ├── dictationStore.ts        # Evolue (micro par carte au lieu de toolbar)
│   │   │   ├── anneeStore.ts            # Existant (Epic 18)
│   │   │   ├── eventStore.ts            # NEW — evenements pedagogiques
│   │   │   ├── absenceStore.ts          # NEW — registre d'appel
│   │   │   ├── syntheseStore.ts         # NEW — syntheses LSU + appreciations generales
│   │   │   └── lsuStore.ts              # NEW — export LSU state
│   │   ├── hooks/
│   │   │   ├── useAudioRecorder.ts
│   │   │   ├── useDualModeMic.ts        # NEW — logique tap/press seuil 300ms
│   │   │   ├── useStructuration.ts      # Evolue (3 jobs)
│   │   │   ├── useFullscreen.ts
│   │   │   └── useSynthese.ts           # NEW — generation synthese on-demand
│   │   ├── types/
│   │   │   ├── index.ts                 # Evolue (nouveaux types)
│   │   │   └── domaines-officiels.ts    # Existant (referentiel C1/C2/C3)
│   │   └── utils/
│   │       ├── date.ts
│   │       ├── webAudioRecorder.ts
│   │       ├── periodes.ts
│   │       └── csvParser.ts             # NEW — parsing CSV eleves
├── src-tauri/
│   ├── Cargo.toml                       # Evolue (+quick-xml dep)
│   ├── tauri.conf.json
│   ├── capabilities/default.json
│   ├── src/
│   │   ├── lib.rs                       # Commandes Tauri (EVOLUE — 4 modules)
│   │   ├── main.rs
│   │   ├── sidecar/                     # (evolue — 3 jobs)
│   │   ├── events/                      # NEW
│   │   │   ├── mod.rs                   # CRUD evenements pedagogiques
│   │   │   └── queries.rs               # Requetes filtrage/aggregation
│   │   ├── absences/                    # NEW
│   │   │   ├── mod.rs                   # CRUD absences
│   │   │   └── alerts.rs               # Alerte 4+ injustifiees/30j
│   │   ├── synthese/                    # NEW
│   │   │   └── mod.rs                   # Generation + versioning
│   │   ├── import/                      # NEW
│   │   │   └── mod.rs                   # Parser CSV
│   │   ├── migrations/
│   │   │   ├── mod.rs
│   │   │   ├── v2_1.rs                  # Existant
│   │   │   └── v2_1_rev2.rs             # NEW — nouvelles tables
│   │   ├── lsu/                         # Evolue
│   │   ├── audio/
│   │   └── models/
│   └── grammars/
│       └── appreciation.gbnf            # DEPRECATED (remplace par gbnf.rs)
```

### Architectural Boundaries

**IPC Boundary (Tauri invoke) :**
Frontend ne touche JAMAIS la BDD. Tout passe par `invoke()` → Rust → SQLite.

**Sidecar Boundary :**
Rust communique avec whisper-server (8081) et llama-server (8080) via HTTP REST. Frontend ne contacte jamais les sidecars.

**Event Sourcing Boundary :**
`evenements_pedagogiques` est en append-only. Les syntheses sont des vues materialisees versionnees. Le store TS ne doit PAS exposer update/delete sur les events.

**Module Boundaries :**

| Module | Tables BDD | Sidecars | Stores |
|--------|-----------|----------|--------|
| Module 1 Comportement | students, sanctions, daily_rewards, evenements_pedagogiques | whisper + llama (Job 1) | studentStore, eventStore, dictationStore |
| Module 2 Registre | absences_v2 | Non | absenceStore |
| Module 3 Evaluations | evenements_pedagogiques | Non (saisie manuelle/vocale) | eventStore |
| Module 4 LSU Vivant | syntheses_lsu, appreciations_generales | llama (Jobs 2-3) | syntheseStore, lsuStore |
| Config | config_periodes, annees_scolaires, niveaux_classe, config_lsu | Non | configStore, anneeStore |
| IA | models_status | lifecycle | modelStore |

### Data Flow — Pipeline observation vocale V2.1-rev2

```
[Carte eleve — Module 1]
  │  Bouton micro dual-mode
  │  (tap <300ms = toggle, press >300ms = push-to-talk)
  ▼
[WAV PCM 16kHz] ──invoke save_wav──> Rust (audio/)
  │
  ▼
[whisper-server] ──HTTP /inference──> Texte FR
  │
  ▼
[TranscriptPreview] Frontend (texte editable)
  │
  ▼ invoke structure_text
[Rust — Job 1 Classify]
  │  gbnf.rs (GBNF dynamique)
  │  prompt_builder.rs (prompt Job 1)
  │  structuration.rs → llama-server
  │  validator.rs (4 couches)
  │
  ▼ event pipeline-progress
[TranscriptPreview] Frontend (carte diff Avant/Apres, reassign domaine)
  │
  ▼ Valider
[Rust — events/mod.rs]
  │  INSERT INTO evenements_pedagogiques (type='observation', domaine_id=...)
  ▼
[eventStore refresh] Frontend
```

### Data Flow — Synthese LSU

```
[LSU Vivant — Module 4]
  │  Bouton "Synthetiser" (par domaine)
  ▼
[Rust — Job 2 Synthesize]
  │  Charge tous evenements_pedagogiques du domaine pour la periode
  │  prompt_builder.rs (prompt Job 2)
  │  structuration.rs → llama-server
  │
  ▼ event synthese-progress
[SynthesisCard] Frontend (texte genere editable)
  │  Enseignant modifie si besoin
  ▼ Valider
[Rust — synthese/mod.rs]
  │  INSERT INTO syntheses_lsu (version=N+1)
  │  Conserver versions N-4 a N
  ▼
[syntheseStore refresh]
```

### Requirements to Structure Mapping

| FRs | Fichiers principaux |
|-----|-------------------|
| FR70-FR72 (micro par eleve) | `StudentGridCard.tsx`, `useDualModeMic.ts`, `dictationStore.ts` |
| FR73-FR79 (registre appel) | `registre-appel/*`, `absenceStore.ts`, `absences/mod.rs` |
| FR80-FR84 (evaluations) | `evaluations/*`, `eventStore.ts`, `events/mod.rs` |
| FR85-FR88 (syntheses LSU) | `lsu-vivant/SynthesisCard.tsx`, `syntheseStore.ts`, `synthese/mod.rs` |
| FR89-FR90 (double vue LSU) | `StudentLsuView.tsx`, `DomainLsuView.tsx` |
| FR91 (appreciation generale) | `GeneralAppreciation.tsx`, `syntheseStore.ts` |
| FR92-FR93 (export LSU) | `LsuExport.tsx`, `lsu/xml_builder.rs`, `lsuStore.ts` |
| FR94 (import CSV) | `CsvImport.tsx`, `import/mod.rs`, `csvParser.ts` |
| FR46 (3 jobs LLM) | `structuration.rs`, `gbnf.rs`, `prompt_builder.rs` |
| ADR-014 (event sourcing) | `events/mod.rs`, `eventStore.ts`, `v2_1_rev2.rs` |

## Architecture Validation Results

### Coherence Validation

**Decision Compatibility :** Toutes les ADRs sont compatibles. ADR-014 (event sourcing) est le fondement — ADR-015 (3 jobs) et ADR-016 (micro par eleve) s'appuient dessus. ADR-017 (double vue) lit les donnees creees par ADR-015. ADR-019 (registre) est independant. ADR-018 (suppression Module 2) nettoie la navigation.

**Pattern Consistency :** Conventions V2 conservees. Nouveaux modules suivent les memes patterns (naming, stores, Rust).

**Resultat : Aucune incoherence detectee.**

### Requirements Coverage

| FR/NFR | Support architectural | Status |
|--------|----------------------|--------|
| FR70-72 (micro par eleve) | ADR-016 + StudentGridCard + dictationStore | Couvert |
| FR73-79 (registre appel) | ADR-019 + absences_v2 + absenceStore | Couvert |
| FR80-84 (evaluations) | ADR-014 + evenements_pedagogiques + eventStore | Couvert |
| FR85-91 (LSU vivant) | ADR-015 + ADR-017 + syntheseStore | Couvert |
| FR92-93 (export LSU) | ADR-012 + lsu/ | Couvert |
| FR94 (import CSV) | ADR-020 + import/ | Couvert |
| NFR6 (classify < 5s) | ADR-015 Job 1, ctx-size 2048 | Couvert |
| NFR31 (synthese < 10s) | ADR-015 Job 2 | Couvert |
| NFR33 (immutable events) | ADR-014, enforcement rules | Couvert |
| NFR34 (versioning) | syntheseStore, version column | Couvert |

**100% des FRs et NFRs couverts.**

### Implementation Readiness

**Overall Status : READY FOR IMPLEMENTATION**
**Confidence Level : HIGH**

**Forces :**
- Brownfield avec stack eprouvee + Epics 18-19 implementes
- Event sourcing simplifie la tracabilite et la future sync mobile
- 3 jobs LLM = extension naturelle du pipeline existant
- Double vue = deux composants lisant les memes donnees

**Gaps intentionnels :**
1. Prompts LLM exacts pour Jobs 2 et 3 — a iterer pendant l'implementation
2. Structure XML LSU — reverse-engineering Opencomp
3. Benchmark Qwen 0.5B vs 1.5B pour Jobs 2-3

### Implementation Handoff

**Sequence d'implementation :**
1. Migrations V2.1-rev2 (nouvelles tables event sourcing + absences_v2)
2. Module 2 — Registre d'appel (independant)
3. Module 1 enrichi — Micro par eleve + event sourcing
4. Module 3 — Evaluations (events pedagogiques)
5. 3 Jobs LLM (extension pipeline)
6. Module 4 — LSU Vivant (syntheses + double vue)
7. Export LSU XML + Import CSV
8. Nettoyage (suppression Module 2, deprecated stores)
