---
stepsCompleted: [1, 2, 3, 4, 5, 6, 7, 8]
status: 'complete'
completedAt: '2026-02-17'
inputDocuments:
  - prd-v2.1.md
  - architecture-v2.md
  - analysis/brainstorming-session-2026-02-17.md
  - ux-design-v2.md
  - research/technical-ia-locale-tauri-sidecars-research-2026-02-10.md
  - product-brief-comportement-2026-02-10.md
  - validation-report-2026-02-17.md
workflowType: 'architecture'
project_name: 'comportement'
user_name: 'Uhama'
date: '2026-02-17'
version: 'V2.1'
previous_version: 'V2'
---

# Architecture Decision Document — Comportement V2.1

_This document builds collaboratively through step-by-step discovery. Sections are appended as we work through each architectural decision together._

## Project Context Analysis

### Requirements Overview

**Functional Requirements:**
65 FRs au total — 30 Module 1 (inchange), 7 Module 2 (inchange), 10 Module 3 (refonde), 6 Infrastructure IA, 3 Gestion modeles, 6 Config+Annee scolaire, 1 Capture audio, 2 Export LSU. Priorite : 89% Must, 8% Should, 3% Could.

Le coeur de V2.1 est la refonte du Module 3 (FR38-FR44, FR60-FR62) et l'ajout de l'annee scolaire (FR58-FR59, FR65) + Export LSU (FR63-FR64). Les Modules 1 et 2 sont stables et inchanges.

**Non-Functional Requirements:**
30 NFRs — Performance (8), Securite RGPD (4), Compatibilite (5), Fiabilite (5), Accessibilite TBI (5), Migrations (3). Les NFRs critiques pour V2.1 : NFR6 (LLM < 5s avec ctx-size 2048), NFR10 (4 couches securite avec GBNF dynamique), NFR11 (classification > 95%), NFR16 (RAM < 2 Go), NFR28 (migrations non destructives), NFR30 (undo fiable < 1s).

**Scale & Complexity:**

- Primary domain: desktop_app (Tauri v2)
- Complexity level: medium-high
- Estimated architectural components: ~12 (3 modules UI, sidebar, settings, sidecar manager, whisper integration, llama integration, GBNF generator, review panel, LSU exporter, migration system)

### Technical Constraints & Dependencies

- **Hardware** : PC ecole 4 Go RAM, pas de GPU — pipeline sequentiel obligatoire
- **Offline-first** : zero connexion reseau apres installation des modeles GGUF
- **Mode portable** : .exe unique sans installateur, modeles dans AppData
- **XSD LSU non public** : reverse-engineering depuis projets open source, fallback CSV/PDF
- **ctx-size 2048** : budget tokens limite pour prompt+observations+output LLM
- **Brownfield** : V1 en production quotidienne, V2 completee (4 sprints) — migrations additives uniquement
- **Stack figee** : Tauri v2 + React 18 + TypeScript + SQLite + Zustand + Tailwind (pas de changement de stack)

### Cross-Cutting Concerns Identified

1. **Pipeline sequentiel IA** : un seul sidecar actif, gestion lifecycle start/stop/healthcheck, watchdog
2. **Securite 4 couches** : le passage a GBNF dynamique impacte la couche 2 — la grammaire n'est plus un fichier mais une string generee par Rust
3. **Multi-niveaux/multi-cycles** : impacte le frontend (filtrage domaines), le backend (GBNF, prompt, seed), et la BDD (cycle par domaine, niveau par eleve)
4. **Annee scolaire comme conteneur** : nouvelle entite racine — toutes les donnees Module 2 et 3 sont scopees par annee+periode
5. **Migrations non destructives** : 8 migrations additives avec backup auto, migration de donnees (3→4 niveaux)
6. **RGPD** : prenoms + INE locaux uniquement, pas de telemetrie
7. **Panneau de revue diff** : pattern UI nouveau — composant transversal utilise a chaque dictee
8. **Undo/redo** : mecanisme de snapshot simple mais qui doit etre atomique (pas de perte de donnees)

### Delta V2 → V2.1

| Aspect | V2 | V2.1 |
|--------|-----|------|
| Role LLM | Generateur de contenu | Classificateur + fusionneur |
| GBNF | Statique (fichier `.gbnf`) | Dynamique (genere depuis BDD par Rust) |
| Domaines | Fixes, meme pour tous | Par cycle de l'eleve (C1/C2/C3) |
| Echelle evaluation | 3 niveaux custom | 4 niveaux LSU officiels |
| Micro | Un par domaine | Unique global (toolbar) |
| Revue | Aucune (insertion directe) | Panneau diff Avant/Apres |
| Undo | Aucun | Snapshot `previous_observations` |
| Annee scolaire | Implicite | Entite explicite avec cycle de vie |
| Export | JSON uniquement | JSON + LSU XML optionnel |
| Appreciation generale | Absente | Par eleve/periode + brouillon LLM |

## Starter Template Evaluation

### Primary Technology Domain

Desktop application (Tauri v2) — projet brownfield avec stack etablie.

### Starter Options Considered

N/A — projet brownfield. Le codebase V2 existant sert de fondation pour V2.1.

### Selected Starter: Codebase V2 existant

**Rationale:** V1 en production depuis janvier 2026, V2 completee (4 sprints, 8 epics). La stack est validee en conditions reelles. Aucun changement de stack prevu pour V2.1.

**Architectural Decisions Already Established:**

**Language & Runtime:**
- Frontend: TypeScript strict + React 18
- Backend: Rust (Tauri v2 core + commandes IPC)
- Convention: camelCase (TS) / snake_case (Rust/SQLite), conversion via Serde

**Styling Solution:**
- Tailwind CSS (utility-first)
- Responsive design pour mode TBI (prenoms lisibles a 6m)
- WCAG AA compliance (contraste 4.5:1, daltonisme-friendly)

**Build Tooling:**
- Vite (frontend dev + build)
- Tauri bundler (packaging .exe portable)
- Mode portable: pas d'installateur, pas de modification registre

**Testing Framework:**
- Rust: cargo test (32 tests existants — sidecar manager, validateur, pipeline)
- Frontend: npm test

**Code Organization:**
```
src/
  modules/
    comportement-classe/     # Module 1
    comportement-individuel/ # Module 2
    apprentissage/           # Module 3 (refonde V2.1)
  shared/
    components/
    stores/
    types/
    utils/
src-tauri/
  src/
    sidecar/                # manager, transcription, structuration, validation
    audio/                  # capture micro
    models/                 # gestion GGUF
```

**State Management:**
- Zustand (stores par domaine: studentStore, incidentStore, appreciationStore, configStore, modelStore)
- Pattern try/catch systematique pour actions async

**Development Experience:**
- `npm run tauri dev` — hot reload frontend + backend
- `npm run dev` — frontend seul
- `cargo test` — tests Rust
- `npx tsc --noEmit` — typecheck

**Note:** Aucune initialisation de projet necessaire. V2.1 est une evolution du codebase existant.

## Core Architectural Decisions

### Decision Priority Analysis

**ADRs V2 conserves (inchanges) :**
- ADR-001 : JSON pas SQL (LLM output)
- ADR-002 : Pipeline sequentiel (4 Go RAM)
- ADR-003 : VAD natif whisper.cpp
- ADR-004 : Watchdog whisper-server
- ADR-005 : tauri-plugin-mic-recorder + Web Audio fallback
- ADR-006 : Qwen 2.5 Coder 1.5B

**Nouvelles ADRs V2.1 (critiques) :**

### ADR-007 : GBNF dynamique — generation par requete

**Decision :** Rust genere la grammaire GBNF a chaque requete LLM, en lisant les domaines actifs du cycle de l'eleve en BDD.

**Rationale :** La latence BDD est negligeable (< 5ms SQLite local). Le GBNF est une petite string (~200 caracteres). Pas de cache = pas de complexite d'invalidation. llama-server accepte la grammaire dans le body JSON de `/completion` (parametre `grammar`).

**Affects :** `src-tauri/src/sidecar/structuration.rs`, nouveau module `src-tauri/src/sidecar/gbnf.rs`

**Format GBNF genere :**
```
root ::= "{" ws "\"domaine_id\":" ws domaine-id "," ws "\"observation_mise_a_jour\":" ws string "}"
domaine-id ::= "1" | "2" | "3" | ... | "N"  # N = nombre de domaines actifs
ws ::= [ \t\n]*
string ::= "\"" [^"\\]* "\""
```

### ADR-008 : Budget tokens — prompt adaptatif ctx-size 2048

**Decision :** Estimation adaptative du budget tokens. Troncature intelligente des observations existantes seulement si le prompt depasse ~1900 tokens (reserve ~150 pour l'output).

**Rationale :** En debut de periode, les observations sont courtes — tout tient. En fin de periode, troncature uniforme des observations non-ciblees a 200 caracteres chacune, domaine cible en entier. Estimation : 1 token ~ 4 caracteres en francais.

**Affects :** `src-tauri/src/sidecar/structuration.rs`, nouveau module `src-tauri/src/sidecar/prompt_builder.rs`

**Budget tokens :**
- System prompt (instructions) : ~300 tokens fixes
- Domaines actifs (noms) : ~50 tokens
- Observations existantes : variable (budget restant - output reserve)
- Texte dicte : ~50-150 tokens
- Output reserve : ~150 tokens
- **Total disponible input : ~1900 tokens**

### ADR-009 : Review panel — panel inline dans le flow Module 3

**Decision :** Le panneau de revue diff s'affiche inline dans le Module 3, entre la toolbar et le tableau des appreciations. Pas de modal.

**Rationale :** Workflow lineaire (dicter → revoir → valider). Pas de z-index, pas de gestion modal. Le panel se ferme apres validation, le tableau se met a jour. Etat gere dans un Zustand store dedie (`reviewStore`).

**Affects :** `src/modules/apprentissage/`, nouveau composant `ReviewPanel.tsx`, nouveau store `reviewStore.ts`

**Composants du review panel :**
- `ReviewPanel` : conteneur principal, affiché conditionnellement
- `DomainDiff` : affichage Avant/Apres par domaine
- `DomainReassign` : dropdown reassignation domaine (si erreur de classification)
- Boutons par domaine : Accepter / Modifier / Rejeter
- Bouton global : "Valider tout"

### ADR-010 : Undo — transaction SQL atomique

**Decision :** Chaque validation LLM execute une transaction SQLite unique qui sauvegarde l'ancien texte dans `previous_observations` et met a jour `observations` atomiquement.

**Rationale :** Atomicite garantie par SQLite. Pas d'etat inconsistant si crash. Un seul round-trip BDD.

**Affects :** `src-tauri/src/sidecar/validation/executor.rs`, `appreciationStore.ts`

**SQL :**
```sql
BEGIN;
UPDATE appreciations
SET previous_observations = observations,
    observations = ?new_text
WHERE eleve_id = ? AND periode_id = ? AND domaine_id = ?;
COMMIT;
```

**Undo :**
```sql
UPDATE appreciations
SET observations = previous_observations,
    previous_observations = NULL
WHERE id = ? AND previous_observations IS NOT NULL;
```

### ADR-011 : Annee scolaire — flag + guard Rust

**Decision :** Flag `cloturee` en BDD + guard Rust `check_annee_not_closed(annee_id)` appele dans chaque commande Tauri qui modifie des donnees scopees par annee. Reouverture possible via double confirmation UI.

**Rationale :** Les VIEWs SQLite ne bloquent pas les ecritures. La validation doit etre cote Rust. Un guard unique reutilise partout.

**Affects :** `src-tauri/src/lib.rs` (nouveau guard), toutes les commandes Tauri qui ecrivent des donnees Module 2/3

**State machine :**
```
creation → active (active=1, cloturee=0)
         → cloturee (active=0, cloturee=1) [lecture seule]
         → reouverture (active=1, cloturee=0) [double confirmation]
```

### ADR-012 : Export LSU XML — Rust natif quick-xml

**Decision :** Generation XML via la crate `quick-xml` en Rust. Structs Rust typees serialisees en XML. Structure LSU reverse-engineered depuis Opencomp (open source). Fallback CSV/PDF si le format XML ne passe pas dans Pleiade.

**Rationale :** Typage Rust fort, pas de risque d'oubli de placeholder, testable unitairement. `quick-xml` est legere et performante.

**Affects :** Nouveau module `src-tauri/src/lsu/`, nouveau composant `LsuExport.tsx`

### ADR-013 : Migrations — backup fichier + savepoints SQL

**Decision :** Backup automatique du fichier `.sqlite` avant le lot de migrations. Chaque migration individuelle dans un `SAVEPOINT`. Version de schema dans `PRAGMA user_version`.

**Rationale :** Double securite : backup fichier (rollback ultime) + savepoints (rollback granulaire). Si une migration echoue, rollback du savepoint, log erreur, app continue avec version anterieure.

**Affects :** `src-tauri/src/lib.rs` (systeme de migration), nouveau module `src-tauri/src/migrations/`

**Sequence des 8 migrations :**
1. CREATE TABLE annees_scolaires
2. ALTER TABLE students ADD COLUMN niveau, annee_id, ine
3. CREATE TABLE niveaux_classe
4. ALTER TABLE appreciations ADD COLUMN niveau_lsu, previous_observations + DATA MIGRATION (3→4 niveaux)
5. ALTER TABLE domaines_apprentissage ADD COLUMN cycle, code_lsu, is_custom + UPDATE existants → C3
6. ALTER TABLE config_periodes ADD COLUMN annee_id
7. CREATE TABLE appreciations_generales
8. CREATE TABLE config_lsu

### Decision Impact Analysis

**Implementation Sequence :**
1. ADR-013 (migrations) — prerequis pour toutes les nouvelles tables
2. ADR-011 (annee scolaire) — nouvelle entite racine
3. ADR-007 (GBNF dynamique) — refonte pipeline LLM
4. ADR-008 (budget tokens) — depend de ADR-007
5. ADR-010 (undo) — depend de la nouvelle structure BDD
6. ADR-009 (review panel) — composant UI, depend du pipeline refonde
7. ADR-012 (LSU XML) — independant, peut etre fait en dernier

**Cross-Component Dependencies :**
- ADR-007 + ADR-008 : GBNF dynamique et prompt adaptatif se construisent ensemble cote Rust
- ADR-009 + ADR-010 : le review panel declenche l'undo (previous_observations)
- ADR-011 + ADR-013 : l'annee scolaire est creee par la migration

## Implementation Patterns & Consistency Rules

### Pattern Categories Defined

**8 points de conflit potentiels identifies** ou des agents IA pourraient diverger.

### Naming Patterns

| Contexte | Convention | Exemple |
|----------|-----------|---------|
| Tables SQLite | `snake_case` pluriel | `annees_scolaires`, `config_periodes` |
| Colonnes SQLite | `snake_case` | `niveau_lsu`, `previous_observations` |
| Index SQLite | `idx_{table}_{colonne}` | `idx_domaines_cycle` |
| Commandes Tauri (Rust) | `snake_case` | `structure_text`, `undo_appreciation` |
| Fonctions TS | `camelCase` | `undoAppreciation()`, `generateGbnf()` |
| Composants React | `PascalCase` | `ReviewPanel.tsx`, `DomainDiff.tsx` |
| Stores Zustand | `camelCase` + suffixe `Store` | `reviewStore.ts`, `anneeStore.ts` |
| Fichiers TS | `camelCase` | `reviewStore.ts`, `useStructuration.ts` |
| Fichiers Rust modules | `snake_case` | `gbnf.rs`, `prompt_builder.rs` |
| Events Tauri | `kebab-case` | `sidecar-status`, `pipeline-progress` |
| Types TS | `PascalCase` | `ReviewState`, `LlmClassification` |

### Structure Patterns

**Nouveaux modules Rust V2.1 :**

```
src-tauri/src/
  sidecar/
    mod.rs                  # re-exports
    manager.rs              # SidecarManager (existant V2)
    transcription.rs        # whisper-server (existant V2)
    structuration.rs        # llama-server (refonde V2.1)
    gbnf.rs                 # NEW: generateur GBNF dynamique
    prompt_builder.rs       # NEW: constructeur de prompt adaptatif
    validation/
      mod.rs                # re-exports (existant V2)
      schema.rs             # (existant V2)
      validator.rs          # (existant V2)
      executor.rs           # (refonde V2.1 — undo transaction)
  migrations/
    mod.rs                  # NEW: runner de migrations
    v2_1.rs                 # NEW: 8 migrations V2→V2.1
  lsu/
    mod.rs                  # NEW: export LSU
    xml_builder.rs          # NEW: generation XML quick-xml
    checklist.rs            # NEW: verification pre-export
  audio/                    # (inchange V2)
  models/                   # (inchange V2)
```

### Format Patterns

**Sortie LLM (contraint par GBNF) :**

```json
{
  "domaine_id": 3,
  "observation_mise_a_jour": "L'eleve fait des progres reguliers en mathematiques..."
}
```

Regles :
- `domaine_id` = index local 1-N (pas un ID BDD), Rust mappe vers l'ID reel
- `observation_mise_a_jour` = texte francais, jamais de SQL, jamais d'ID BDD
- Longueur max observation : 300 caracteres (valide par Rust couche 3)

### Communication Patterns

**Events Tauri pipeline :**

| Event | Payload | Emetteur |
|-------|---------|----------|
| `sidecar-status` | `{ name: string, status: "starting"\|"ready"\|"stopping"\|"stopped"\|"error" }` | SidecarManager |
| `pipeline-progress` | `{ step: "recording"\|"transcribing"\|"structuring"\|"reviewing"\|"done", detail?: string }` | Pipeline orchestrator |
| `migration-progress` | `{ current: number, total: number, name: string }` | Migration runner |

### State Management Patterns

**Pattern store V2.1 :**

```typescript
// Tous les stores suivent ce pattern
interface ReviewStore {
  // State
  isReviewing: boolean;
  pendingChanges: DomainChange[];
  // Actions (try/catch obligatoire)
  submitForReview: (classification: LlmClassification) => Promise<void>;
  acceptDomain: (domainId: number) => Promise<void>;
  rejectDomain: (domainId: number) => void;
  acceptAll: () => Promise<void>;
  // Reset
  clearReview: () => void;
}
```

Regles :
- Chaque action async wrappee dans try/catch
- Erreurs loggees `console.error` + affichees via toast/notification
- Stores n'appellent pas `invoke()` directement — passer par `utils/` ou `hooks/`

### Process Patterns

**Error handling pipeline IA :**

| Etape | Erreur possible | Handling |
|-------|----------------|----------|
| Audio capture | Permission micro refusee | Toast + redirection Settings OS |
| Whisper transcription | Reponse vide | Retry 1x (watchdog), puis message erreur |
| LLM classification | JSON invalide (GBNF fail) | Retry 1x prompt simplifie, puis fallback saisie manuelle |
| LLM classification | domaine_id hors range | Rejet Rust couche 3, message "classification echouee" |
| Validation Rust | Texte > 300 chars | Troncature automatique avec avertissement |
| INSERT BDD | Erreur SQL | Rollback transaction, message erreur, donnees intactes |

**Loading states — convention uniforme :**

```typescript
{ isRecording: boolean }       // audio
{ isTranscribing: boolean }    // whisper
{ isStructuring: boolean }     // llama
{ isReviewing: boolean }       // review panel
{ isSaving: boolean }          // BDD write
```

Pas de loading state global — chaque composant gere son propre etat.

**Guard pattern — verification annee scolaire :**

```rust
fn check_annee_not_closed(db: &Connection, annee_id: i64) -> Result<(), String> {
    let cloturee: bool = db.query_row(
        "SELECT cloturee FROM annees_scolaires WHERE id = ?",
        [annee_id],
        |row| row.get(0),
    )?;
    if cloturee {
        return Err("Annee scolaire cloturee — modification impossible".into());
    }
    Ok(())
}
```

### Enforcement Guidelines

**Tout agent IA DOIT :**
1. Suivre les conventions de nommage du tableau ci-dessus — aucune exception
2. Placer les nouveaux fichiers Rust dans le module correspondant (`sidecar/`, `migrations/`, `lsu/`)
3. Wrapper toute action async dans try/catch (TS) ou `Result<>` (Rust)
4. Appeler `check_annee_not_closed()` avant toute ecriture scopee par annee
5. Emettre les events Tauri avec les noms et payloads documentes
6. Ne jamais exposer d'ID BDD au LLM — utiliser des index locaux 1-N
7. Valider la sortie LLM avec les 4 couches avant insertion

### Anti-Patterns

- Creer un store global qui gere tout le pipeline (trop gros, trop couple)
- Appeler `invoke()` directement dans un composant React (passer par store ou hook)
- Utiliser `camelCase` dans les colonnes SQLite (conflit avec Serde)
- Hardcoder des domaines dans le GBNF (doit etre dynamique depuis BDD)
- Oublier le guard `check_annee_not_closed` sur une nouvelle commande Tauri

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
├── _bmad-output/planning-artifacts/     # Planning BMM
├── src/
│   ├── App.tsx                          # Router modules + sidebar
│   ├── main.tsx                         # Entry point React
│   ├── index.css                        # Tailwind imports
│   ├── modules/
│   │   ├── comportement-classe/         # Module 1 (inchange)
│   │   │   ├── index.tsx
│   │   │   ├── StudentGrid.tsx
│   │   │   ├── StudentGridCard.tsx
│   │   │   ├── TBIView.tsx
│   │   │   ├── WeeklySummary.tsx
│   │   │   ├── SanctionReasonModal.tsx
│   │   │   └── WeeklyRewardLine.tsx
│   │   ├── comportement-individuel/     # Module 2 (inchange)
│   │   │   ├── index.tsx
│   │   │   ├── StudentSummaryPanel.tsx
│   │   │   ├── IncidentForm.tsx
│   │   │   └── IncidentTabs.tsx
│   │   └── apprentissage/              # Module 3 (REFONDE V2.1)
│   │       ├── index.tsx                # Layout principal refonde
│   │       ├── AppreciationTable.tsx    # Tableau domaines x eleves (refonde)
│   │       ├── ReviewPanel.tsx          # NEW: panneau revue diff
│   │       ├── DomainDiff.tsx           # NEW: affichage diff par domaine
│   │       ├── DomainReassign.tsx       # NEW: dropdown reassignation
│   │       ├── ManualEntryForm.tsx      # Saisie manuelle (evolue)
│   │       ├── VoiceDictation.tsx       # Micro unique global (refonde)
│   │       ├── GeneralAppreciation.tsx  # NEW: appreciation generale
│   │       └── LsuExport.tsx            # NEW: ecran export LSU
│   ├── shared/
│   │   ├── components/
│   │   │   ├── Sidebar.tsx
│   │   │   ├── ModuleHeader.tsx
│   │   │   ├── Settings.tsx             # Evolue (sections annee, niveaux, LSU)
│   │   │   ├── PeriodsSettings.tsx
│   │   │   ├── DomainsSettings.tsx      # Evolue (par cycle)
│   │   │   ├── ModelSetupWizard.tsx
│   │   │   ├── DownloadProgress.tsx
│   │   │   ├── UsbInstall.tsx
│   │   │   ├── HelpSection.tsx
│   │   │   ├── PeriodSelector.tsx
│   │   │   ├── AnneeSettings.tsx        # NEW: gestion annee scolaire
│   │   │   ├── NiveauxSettings.tsx      # NEW: niveaux de classe
│   │   │   ├── LsuSettings.tsx          # NEW: config identifiants ONDE
│   │   │   └── NewYearWizard.tsx        # NEW: assistant de rentree
│   │   ├── stores/
│   │   │   ├── studentStore.ts          # Evolue (niveau, annee_id, ine)
│   │   │   ├── incidentStore.ts
│   │   │   ├── appreciationStore.ts     # Evolue (niveau_lsu, undo)
│   │   │   ├── configStore.ts           # Evolue (annee_id sur periodes)
│   │   │   ├── modelStore.ts
│   │   │   ├── reviewStore.ts           # NEW: etat review panel
│   │   │   ├── anneeStore.ts            # NEW: gestion annee scolaire
│   │   │   └── lsuStore.ts              # NEW: export LSU state
│   │   ├── hooks/
│   │   │   ├── useAudioRecorder.ts
│   │   │   ├── useStructuration.ts      # Refonde (classification+fusion)
│   │   │   ├── useFullscreen.ts
│   │   │   └── useReview.ts             # NEW: logique review panel
│   │   ├── types/
│   │   │   ├── index.ts                 # Evolue (nouveaux types V2.1)
│   │   │   └── domaines-officiels.ts    # NEW: referentiel C1/C2/C3
│   │   └── utils/
│   │       ├── date.ts
│   │       ├── webAudioRecorder.ts
│   │       └── periodes.ts
├── src-tauri/
│   ├── Cargo.toml                       # Evolue (+quick-xml dep)
│   ├── tauri.conf.json
│   ├── capabilities/default.json
│   ├── src/
│   │   ├── lib.rs                       # Commandes Tauri (evolue V2.1)
│   │   ├── main.rs
│   │   ├── sidecar/
│   │   │   ├── mod.rs
│   │   │   ├── manager.rs              # SidecarManager (inchange)
│   │   │   ├── transcription.rs        # Whisper (inchange)
│   │   │   ├── structuration.rs        # LLM (REFONDE — classif+fusion)
│   │   │   ├── config.rs
│   │   │   ├── types.rs                # Evolue
│   │   │   ├── gbnf.rs                 # NEW: generateur GBNF dynamique
│   │   │   ├── prompt_builder.rs       # NEW: constructeur prompt adaptatif
│   │   │   └── validation/
│   │   │       ├── mod.rs
│   │   │       ├── schema.rs           # Evolue (nouveau format output)
│   │   │       ├── validator.rs        # Evolue (range dynamique)
│   │   │       └── executor.rs         # REFONDE (undo transaction)
│   │   ├── migrations/                  # NEW
│   │   │   ├── mod.rs                  # Runner + backup + savepoints
│   │   │   └── v2_1.rs                 # 8 migrations V2→V2.1
│   │   ├── lsu/                         # NEW
│   │   │   ├── mod.rs                  # Commandes export
│   │   │   ├── xml_builder.rs          # Generation XML (quick-xml)
│   │   │   └── checklist.rs            # Verification pre-export
│   │   ├── audio/mod.rs
│   │   └── models/
│   │       ├── checker.rs
│   │       ├── downloader.rs
│   │       ├── verifier.rs
│   │       └── installer.rs
│   └── grammars/
│       └── appreciation.gbnf           # DEPRECATED (remplace par gbnf.rs)
```

### Architectural Boundaries

**IPC Boundary (Tauri invoke) :**
Frontend (React/TS) ne touche JAMAIS la BDD directement. Toute operation passe par `invoke()` → Rust → SQLite.

**Sidecar Boundary :**
Rust communique avec whisper-server (localhost:8081) et llama-server (localhost:8080) via HTTP REST. Le frontend ne contacte jamais les sidecars directement.

**Module Boundaries :**

| Module | Tables BDD | Sidecars | Stores |
|--------|-----------|----------|--------|
| Module 1 | students, sanctions, daily_rewards, absences | Non | studentStore |
| Module 2 | comportement_detail | Non | incidentStore |
| Module 3 | appreciations, domaines, appreciations_generales | whisper + llama | appreciationStore, reviewStore |
| Config | config_periodes, annees_scolaires, niveaux_classe, config_lsu | Non | configStore, anneeStore |
| IA | models_status | lifecycle | modelStore |

### Data Flow — Pipeline dictee V2.1

```
[Micro] Frontend
  │
  ▼
[WAV PCM 16kHz] ──invoke save_wav──> Rust (audio/)
  │
  ▼
[whisper-server] ──HTTP /inference──> Texte FR
  │
  ▼
[Zone editable] Frontend (correction manuelle)
  │
  ▼
[Clic "Structurer"] ──invoke──> Rust (sidecar/)
  │                                │
  │                   ┌────────────┘
  │                   ▼
  │             [gbnf.rs] lit domaines actifs BDD
  │             [prompt_builder.rs] construit prompt adaptatif
  │             [structuration.rs] appelle llama-server
  │             [validator.rs] valide JSON output
  │                   │
  │                   ▼ event pipeline-progress
  ▼
[ReviewPanel] Frontend (Avant/Apres par domaine)
  │
  ▼
[Validation] ──invoke──> Rust (executor.rs)
  │                       BEGIN; previous_obs=obs; obs=new; COMMIT;
  ▼
[Tableau MAJ] Frontend (store refresh)
```

### Requirements to Structure Mapping

| FRs | Fichiers principaux |
|-----|-------------------|
| FR38-FR39 (micro+STT) | `VoiceDictation.tsx`, `useAudioRecorder.ts`, `transcription.rs` |
| FR40 (LLM classif+fusion) | `structuration.rs`, `gbnf.rs`, `prompt_builder.rs` |
| FR41 (review panel) | `ReviewPanel.tsx`, `DomainDiff.tsx`, `reviewStore.ts` |
| FR42-FR44 (domaines/cycle) | `domaines-officiels.ts`, `DomainsSettings.tsx`, `AppreciationTable.tsx` |
| FR58-FR59, FR65 (annee) | `anneeStore.ts`, `AnneeSettings.tsx`, `NewYearWizard.tsx` |
| FR60 (echelle LSU) | `appreciationStore.ts`, `v2_1.rs` (migration 4) |
| FR61 (undo) | `executor.rs`, `appreciationStore.ts` |
| FR62 (appreciation generale) | `GeneralAppreciation.tsx`, table `appreciations_generales` |
| FR63-FR64 (export LSU) | `lsu/xml_builder.rs`, `LsuExport.tsx`, `lsuStore.ts` |
| ADR-013 (migrations) | `migrations/mod.rs`, `migrations/v2_1.rs` |

## Architecture Validation Results

### Coherence Validation

**Decision Compatibility :** Toutes les decisions V2.1 sont compatibles entre elles et avec les ADRs V2 conservees. ADR-007 (GBNF dynamique) + ADR-008 (prompt adaptatif) se construisent ensemble cote Rust. ADR-009 (review panel) + ADR-010 (undo) sont lies par le mecanisme `previous_observations`. ADR-012 (quick-xml) est independant. Le passage GBNF statique→dynamique est une evolution d'ADR-001, pas une contradiction.

**Pattern Consistency :** Conventions de nommage coherentes avec V2 existant (`snake_case` BDD, `camelCase` TS, `PascalCase` composants). Events Tauri en `kebab-case` (convention Tauri standard). Guard pattern s'integre dans le pattern commandes Tauri existant.

**Structure Alignment :** Nouveaux modules Rust (`migrations/`, `lsu/`) bien separes. Nouveaux composants dans `apprentissage/`. Nouveaux stores suivent le pattern existant.

**Resultat : Aucune incoherence detectee.**

### Requirements Coverage Validation

**Functional Requirements V2.1 — 100% couvertes :**

| FR | Support architectural | Status |
|----|----------------------|--------|
| FR40 (LLM classif+fusion) | ADR-007 + ADR-008 + `structuration.rs` | Couvert |
| FR41 (review panel) | ADR-009 + `ReviewPanel.tsx` + `reviewStore.ts` | Couvert |
| FR42-FR44 (domaines/cycle) | `domaines-officiels.ts` + seed + GBNF dynamique | Couvert |
| FR58-FR59, FR65 (annee) | ADR-011 + `anneeStore.ts` + wizard | Couvert |
| FR60 (echelle LSU) | Migration 4 + `appreciationStore.ts` | Couvert |
| FR61 (undo) | ADR-010 + `executor.rs` transaction atomique | Couvert |
| FR62 (appreciation generale) | `GeneralAppreciation.tsx` + table | Couvert |
| FR63-FR64 (export LSU) | ADR-012 + `lsu/xml_builder.rs` | Couvert |

**Non-Functional Requirements V2.1 — 100% couvertes :**

| NFR | Support | Status |
|-----|---------|--------|
| NFR6 (LLM < 5s) | ADR-008 budget tokens adaptatif, ctx-size 2048 | Couvert |
| NFR10 (4 couches securite) | GBNF dynamique = couche 2 evoluee | Couvert |
| NFR11 (classification > 95%) | GBNF + review panel filet de securite | Couvert |
| NFR16 (RAM < 2 Go) | Pipeline sequentiel conserve (ADR-002) | Couvert |
| NFR28 (migrations non destructives) | ADR-013 backup + savepoints | Couvert |
| NFR29 (XML conforme LSU) | ADR-012 quick-xml + fallback CSV/PDF | Couvert |
| NFR30 (undo < 1s) | ADR-010 transaction atomique SQLite | Couvert |

### Implementation Readiness Validation

**Decisions :** 7 ADRs V2.1 avec rationale, fichiers affectes, exemples SQL/GBNF. Complet.
**Structure :** Arbre complet, 15 fichiers NEW, mapping FRs→fichiers. Complet.
**Patterns :** 8 categories, guard Rust, error handling pipeline, anti-patterns. Complet.

### Gap Analysis

**Gaps critiques : aucun.**

**Gaps importants (intentionnels) :**
1. **Prompt LLM exact** — Le texte du system prompt sera itere pendant l'implementation. L'architecture definit le mecanisme (`prompt_builder.rs`), pas le contenu exact.
2. **Structure XML LSU** — Les balises/namespaces XML seront determines par reverse-engineering d'Opencomp/Gepi. Le fallback CSV/PDF est prevu.

**Gaps nice-to-have :**
3. **Benchmark Qwen 0.5B vs 1.5B** — A faire pendant le sprint, pas bloquant.

### Architecture Completeness Checklist

**Requirements Analysis :**
- [x] Contexte projet analyse (65 FRs, 30 NFRs)
- [x] Complexite evaluee (medium-high, brownfield)
- [x] Contraintes techniques identifiees (4 Go RAM, offline, portable)
- [x] Concerns transversaux mappes (8 identifies)

**Decisions Architecturales :**
- [x] 6 ADRs V2 conservees
- [x] 7 ADRs V2.1 nouvelles avec rationale
- [x] Stack figee documentee
- [x] Sequence d'implementation definie

**Patterns d'Implementation :**
- [x] Naming conventions (11 categories)
- [x] Structure patterns (arbre Rust complet)
- [x] Communication patterns (3 events Tauri)
- [x] Process patterns (error handling, loading, guard)

**Structure Projet :**
- [x] Arbre complet avec fichiers NEW marques
- [x] Frontieres modules definies
- [x] Data flow pipeline documente
- [x] Mapping FRs→fichiers complet

### Architecture Readiness Assessment

**Overall Status : READY FOR IMPLEMENTATION**

**Confidence Level : HIGH**

**Forces :**
- Brownfield avec stack eprouvee (3+ mois de production)
- Pipeline IA existant, seul le role LLM change
- Migrations additives (zero destruction)
- Review panel comme filet de securite universel
- 4 couches securite conservees et renforcees (GBNF dynamique)

**Ameliorations futures :**
- Benchmark Qwen 0.5B (sprint B)
- Prompt LLM exact a iterer pendant implementation
- Structure XML LSU a reverse-engineer depuis Opencomp

### Implementation Handoff

**AI Agent Guidelines :**
- Suivre les 13 ADRs (6 V2 + 7 V2.1) exactement comme documentees
- Utiliser les patterns d'implementation pour toute decision de nommage/structure
- Respecter les frontieres de modules et le data flow pipeline
- Consulter ce document pour toute question architecturale

**Sequence d'implementation :**
1. Migrations V2→V2.1 (ADR-013)
2. Annee scolaire + niveaux (ADR-011)
3. GBNF dynamique + prompt adaptatif (ADR-007 + ADR-008)
4. Undo transaction (ADR-010)
5. Review panel (ADR-009)
6. Export LSU XML (ADR-012)

## Architecture Completion Summary

### Workflow Completion

**Architecture Decision Workflow :** COMPLETED
**Total Steps Completed :** 8
**Date Completed :** 2026-02-17
**Document Location :** `_bmad-output/planning-artifacts/architecture-v2.1.md`
**Previous Version :** `architecture-v2.md` (conservee comme reference)

### Final Architecture Deliverables

**Complete Architecture Document :**
- 13 ADRs (6 V2 conservees + 7 V2.1 nouvelles)
- 8 categories de patterns d'implementation
- Arbre projet complet avec 15 fichiers NEW
- Mapping 10 FRs→fichiers
- Validation coherence, couverture, readiness : HIGH

**Implementation Ready Foundation :**
- 13 decisions architecturales documentees
- 11 conventions de nommage
- 8 patterns de process (error handling, loading, guard)
- 65 FRs et 30 NFRs couverts a 100%

**Architecture Status :** READY FOR IMPLEMENTATION

**Next Phase :** Creer les epics et stories V2.1 a partir de ce document et du PRD V2.1.

**Document Maintenance :** Mettre a jour ce document si des decisions majeures changent pendant l'implementation.
