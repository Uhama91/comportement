# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Description

**Comportement** — Application desktop locale (Tauri v2) pour le suivi pédagogique complet des élèves en école élémentaire (CM2, École Victor Hugo, Sevran). V1 en production, V2 implémentée (4 sprints), V2.1 en planning.

**V1 (en production) :**
- Système d'avertissements (1-2-3) avec reset quotidien à 16h30
- Système de sanctions (émojis tristes, max 10/semaine) avec reset hebdomadaire
- Récompenses automatiques (parfait/partiel) + grille cartes avec ligne L-M-J-V
- Double interface : vue compact enseignant + vue TBI plein écran
- Export JSON pour analyse externe

**V2 (implémentée — 3 modules + IA locale) :**
- Module 1 — Comportement Classe : évolution V1 + motifs sanctions + absences
- Module 2 — Comportement Individuel : incidents détaillés par élève et par période
- Module 3 — Domaines d'Apprentissage : dictée vocale (Whisper.cpp) + structuration auto (Qwen 2.5 LLM)
- IA locale 100% offline : pipeline séquentiel push-to-talk, un seul modèle actif à la fois
- Périodes scolaires configurables (trimestres/semestres)

**V2.1-rev2 (en cours — 5 modules, event sourcing, LSU vivant) :**
- Refonte Module 3 : LLM classificateur+fusionneur, GBNF dynamique, review panel inline, undo atomique
- Multi-niveaux : eleves PS→CM2 dans une meme classe, domaines par cycle (C1/C2/C3)
- Annee scolaire : creation → active → cloturee (read-only), guard Rust
- Event sourcing : table `evenements_pedagogiques` (observations, evaluations, motifs sanctions)
- Registre d'appel : absences par demi-journee, 3 types, motifs, retards, alertes legales
- Module Evaluations : saisie individuelle/lot, 4 niveaux LSU, historique chronologique
- Micro dual-mode par eleve : tap toggle / press & hold push-to-talk (300ms seuil)
- LSU Vivant (a venir) : synthese LLM progressive + appreciation generale + export XML
- Migrations V2→V2.1 : 12 migrations (M001-M012, user_version 10) avec backup + savepoints

## Stack Technique

| Composant | Technologie |
|-----------|-------------|
| **Framework** | Tauri 2.0 |
| **Frontend** | React 18 + TypeScript |
| **Backend** | Rust (Tauri core) |
| **Base de données** | SQLite (tauri-plugin-sql) |
| **State Management** | Zustand |
| **Styling** | Tailwind CSS |
| **Build** | Vite + Tauri bundler |
| **Déploiement** | Mode portable (.exe unique) |
| **STT (V2)** | Whisper.cpp small FR (sidecar, ~480 Mo GGUF Q4) |
| **LLM (V2)** | Qwen 2.5 Coder 1.5B (sidecar llama-server, ~980 Mo GGUF Q4) |
| **Audio (V2)** | tauri-plugin-mic-recorder (Plan A) / Web Audio API (Plan B) |

## BMM Workflow Status

### V2.1 — Phase 4 Implementation (EN COURS)

**Phases 1-3** (Analysis, Planning, Solutioning) : COMPLET
- Docs : `brainstorming-session-2026-02-17.md`, `prd-v2.1.md`, `architecture-v2.1.md`, `epics-v2.1.md`

**Phase 4 — Implementation :**
- [x] **Sprint 1 : Epic 18** (4/4 stories — COMPLET)
  - Annee Scolaire & Multi-niveaux (migrations, CRUD, niveaux PS-CM2, referentiel domaines, echelle LSU)
- [x] **Sprint 2 : Epic 19** (4/4 stories — COMPLET)
  - 19.1 GBNF dynamique + prompt builder (ADR-007/008)
  - 19.2 Micro unique global (ToolbarMic, TranscriptPreview, dictationStore)
  - 19.3 Classification & Fusion LLM (classify_and_merge, DB queries, 7 tests)
  - 19.4 Pipeline bout-en-bout : auto-classification, indicateur progression, bouton Valider/Rejeter
- [x] **Sprint 5 : Epic 22** (4/4 stories — COMPLET)
  - 22.1 Migrations V2.1-rev2 (M009-M012, user_version 10)
  - 22.2 Event Store Rust/TS (journal pedagogique immutable, 10 tests)
  - 22.3 Micro dual-mode par eleve (useDualModeMic, tap/press 300ms)
  - 22.4 Classification + validation → event sourcing (TranscriptPreview)
- [x] **Sprint 6 : Epic 23 + Epic 24** (6/6 stories — COMPLET)
  - 23.1 Appel matin/apres-midi (absences/mod.rs, 14 tests Rust, absenceStore, AttendanceGrid)
  - 23.2 Motifs, retards & retroactivite (AbsenceDetailModal, type/motif/retard editing)
  - 23.3 Alerte legale & totaux LSU (30-day rolling alert, AbsenceSummary par periode)
  - 24.1 Saisie evaluation individuelle (EvaluationForm, 4 niveaux LSU, reuse eventStore)
  - 24.2 Saisie par lot (BatchEvaluation, grille eleves x niveaux)
  - 24.3 Historique evaluations (EvaluationHistory, timeline + filtres domaine/periode)

### V2 — Phase 4 Implementation (COMPLETE)

**Phase 1 — Analysis :**
- [x] Brainstorming : `suivi-comportement-briefing-complet.md` (via Moltbot)
- [x] Recherche technique : `research/technical-ia-locale-tauri-sidecars-research-2026-02-10.md` + revue Perplexity
- [x] Product Brief V2 : `product-brief-comportement-2026-02-10.md`

**Phase 2 — Planning :**
- [x] PRD V2 : `prd-v2.md` (57 FRs, 27 NFRs, 3 modules + IA locale)
- [x] UX Design V2 : `ux-design-v2.md` (9 sections, 10 composants, 7 flux d'écrans)

**Phase 3 — Solutioning :**
- [x] Architecture V2 : `architecture-v2.md` (14 sections, 6 ADRs, 9 migrations SQLite)
- [x] Epics & Stories V2 : `epics-v2.md` (8 epics 10-17, 35 stories, 4 sprints)
- [x] Implementation Readiness : complété (7 issues critiques résolues)

**Phase 4 — Implementation :**
- [x] **Sprint 1 : Epic 10 + Epic 11** (7/7 stories — COMPLET)
  - Epic 10 : Restructuration Modulaire V1→V2 (4/4 - COMPLET, 10.3 fait en Sprint 3)
  - Epic 11 : Module 1 Evolutions (3/3 - COMPLET)
- [x] **Sprint 2 : Epic 13 + Epic 14** (11/11 stories — COMPLET)
  - Epic 13 : Infrastructure IA — Sidecars (6/6 - COMPLET)
  - Epic 14 : Capture Audio + Transcription (5/5 - COMPLET)
- [x] **Sprint 3 : Epic 12 + Epic 15** (9/9 stories — COMPLET)
  - Story 10.3 : Configuration périodes scolaires (rattrapage Sprint 1)
  - Epic 12 : Module 2 — Comportement Individuel (4/4 - COMPLET)
  - Epic 15 : Module 3 — Domaines d'Apprentissage (5/5 - COMPLET)
- [x] **Sprint 4 : Epic 16 + Epic 17** (8/9 stories code — COMPLET, 17.2 validation terrain)
  - Epic 16 : Gestion Modeles GGUF (4/4 - COMPLET)
  - Epic 17 : Polish et Distribution (4/5 code - COMPLET, 17.2 = validation terrain)

**Documents V1 archivés dans** `archive-v1/` (tag git v1.0)

Tous les documents V2 sont dans `_bmad-output/planning-artifacts/`

### V1 en production

**Epics V1 complétés (1-8) :**
- Epic 1-6 : Core (CRUD, avertissements, sanctions, export, TBI, tray)
- Epic 7 : Récompenses (7.1-7.4 done, 7.5 restant)
- Epic 8 : Grille cartes (8.1, 8.2, 8.4 done, 8.3 restant)
- Epic 9 : Barre latérale (reporté à V2.2)

## Décisions techniques clés

**V1 :**
- **Tauri vs Electron** : Tauri choisi car problème écran blanc avec Electron sur Windows pro
- **Mode portable** : Pas d'installateur pour éviter les blocages SmartScreen en entreprise
- **Naming** : `snake_case` en DB, `camelCase` en TypeScript, conversion auto via Serde
- **State** : Zustand avec pattern try/catch systématique pour les actions async

**V2 (ADRs — voir `architecture-v2.md`) :**
- **ADR-001 : JSON pas SQL** — Le LLM génère du JSON, Rust reconstruit les INSERT avec prepared statements (sécurité)
- **ADR-002 : Pipeline séquentiel** — Un seul sidecar actif à la fois, compatible PC 4 Go RAM
- **ADR-003 : VAD natif** — Utiliser `--vad` de whisper.cpp (pas d'ONNX séparé)
- **ADR-004 : Watchdog whisper-server** — Restart auto après handle leak Windows (~50 requêtes)
- **ADR-005 : Audio capture** — tauri-plugin-mic-recorder Plan A, Web Audio API Plan B
- **ADR-006 : Qwen 2.5 Coder 1.5B** — Pas Qwen3 pour V2.0, évaluer en V2.1

**V2.1-rev2 (ADRs — voir `architecture-v2.1.md`) :**
- **ADR-007 : GBNF dynamique** — Grammaire generee par requete depuis DB (domaines actifs par cycle eleve)
- **ADR-008 : Budget tokens adaptatif** — ctx-size 2048, troncature intelligente du prompt
- **ADR-009 : Review panel inline** — Panneau diff Avant/Apres (pas de modal), Zustand reviewStore
- **ADR-010 : Undo atomique** — Colonne previous_observations, transaction SQL BEGIN/COMMIT
- **ADR-011 : Annee scolaire flag+guard** — Champ cloturee en DB, guard Rust check_annee_not_closed
- **ADR-012 : Export LSU XML** — Crate quick-xml Rust, mapping echelle 4 niveaux
- **ADR-013 : Migrations backup+savepoints** — Backup fichier SQLite + SQL SAVEPOINT par migration
- **ADR-014 : Event sourcing leger** — Table evenements_pedagogiques append-only, UUID + synced_at
- **ADR-015 : Syntheses LSU versionnees** — Table syntheses_lsu, version incrementale, generated_by
- **ADR-016 : Micro dual-mode** — Tap toggle (>300ms) / press & hold push-to-talk (<300ms)
- **ADR-017 : 3 jobs LLM** — Classifier domaine, synthetiser par domaine, appreciation generale
- **ADR-018 : Registre appel demi-journee** — Table absences_v2, UNIQUE(eleve, date, demi_journee)
- **ADR-019 : Alerte legale 30 jours** — Rolling window 30j, seuil 4 demi-journees injustifiees
- **ADR-020 : Totaux LSU par periode** — Justifiees + injustifiees agrege par periode

## Commandes de développement

```bash
# Développement (nécessite Rust installé)
npm run tauri dev

# Build production
npm run tauri build

# Frontend seul (sans Tauri)
npm run dev

# Tests frontend
npm test

# Tests Rust (sidecar, pipeline, watchdog)
cargo test --manifest-path src-tauri/Cargo.toml

# TypeScript type check
npx tsc --noEmit
```

## Modules implementes (V2 + V2.1)

### Module 1 — Comportement Classe (Epic 11)
- Motifs sanctions obligatoires (radio buttons + modal 3e avertissement)
- Gestion absences consolidée (bouton Absent + label ABS)
- Export JSON enrichi V2

### Module 2 — Comportement Individuel (Epic 12)
- Fiche individuelle élève (2-panel layout, stats, actions rapides)
- Saisie d'incidents détaillés (modal form, types prédéfinis)
- Historique chronologique (timeline, filtres type/période)
- Modification/suppression incidents (edit inline, confirmation)
- Navigation depuis Module 1 (double-clic sur carte élève)

### Module 3 — Domaines d'Apprentissage (Epic 15 + Epic 19-20)
- Tableau domaines x eleves (AppreciationTable)
- Pipeline LLM complet (dictee vocale → Whisper → texte → Qwen → observations structurees)
- GBNF dynamique par cycle eleve (ADR-007), classification auto domaine
- Micro dual-mode par eleve : tap toggle / press & hold (useDualModeMic)
- Undo atomique (previous_observations, bouton retour)
- Saisie manuelle avec filtre cycle + edition (ManualEntryForm)
- Domaines parametrables dans Settings (DomainsSettings)

### Module 4 — Registre d'Appel (Epic 23)
- Grille appel matin/apres-midi par semaine (AttendanceGrid)
- Navigation semaine precedente/suivante
- 3 types d'absence : justifiee, medicale, injustifiee
- Modal detail : type, motif (texte libre), retard (toggle)
- Saisie retroactive (dates passees)
- Alerte legale : 4+ demi-journees injustifiees sur 30 jours glissants
- Totaux LSU par periode (justifiees + injustifiees)
- Backend Rust complet (absences/mod.rs, 14 tests, 7 commandes Tauri)

### Module 5 — Evaluations (Epic 24)
- Saisie individuelle : selection eleve + domaine + lecon + niveau LSU + observations
- Saisie par lot : grille eleves x 4 niveaux LSU pour une lecon/domaine
- Historique chronologique par eleve avec filtres domaine/periode
- Reutilise eventStore (type='evaluation'), pas de nouveau backend Rust

---

## Session Log

### V1 (26-28 jan 2026) — COMPLET

Planning (PRD, Architecture, Epics) + Implementation (Epics 1-8) en 3 jours. Tag `v1.0`, archive dans `archive-v1/`.

### V2 (10-17 fev 2026) — COMPLET

| Phase | Dates | Resume |
|-------|-------|--------|
| Planning | 10 fev | Product Brief, PRD (57 FRs), UX Design, Architecture (6 ADRs), Epics (8 epics, 35 stories), Readiness Check |
| Sprint 1 | 10-12 fev | Epic 10 (restructuration V1→V2) + Epic 11 (Module 1 evolutions) — 7/7 stories |
| Sprint 2 | 12 fev | Epic 13 (sidecars Whisper+Llama, pipeline, watchdog, validateur 4 couches) + Epic 14 (audio capture) — 11/11 stories |
| Sprint 3 | 13 fev | Story 10.3 (periodes) + Epic 12 (Module 2 incidents) + Epic 15 (Module 3 appreciations+LLM) — 9/9 stories |
| Sprint 4 | 17 fev | Epic 16 (modeles GGUF) + Epic 17 (polish, TBI, build) — 8/9 stories (17.2=terrain) |
| Fixes | 17 fev | Permission micro macOS, sidecar name resolution, retrait --vad |

### V2.1 (17 fev → en cours)

| Date | Action | Fichiers cles |
|------|--------|---------------|
| 2026-02-17 | Planning V2.1 complet (brainstorming, PRD 65 FRs, architecture 13 ADRs, epics 18-21) | `_bmad-output/planning-artifacts/*-v2.1.md` |
| 2026-02-22 | Epic 18 COMPLET (4/4) : migrations V2.1, CRUD annee, niveaux PS-CM2, referentiel domaines, echelle LSU | `migrations/`, `annee.rs`, `types/index.ts`, `appreciationStore.ts` |
| 2026-02-22 | Story 19.1 : GBNF dynamique + prompt builder (ADR-007/008, ctx-size 2048, 15 tests) | `gbnf.rs`, `prompt_builder.rs`, `config.rs` |
| 2026-02-22 | Story 19.2 : Micro unique global toolbar (ToolbarMic, TranscriptPreview, dictationStore) | `dictationStore.ts`, `ToolbarMic.tsx`, `TranscriptPreview.tsx` |
| 2026-02-22 | Story 19.3 : Classification & Fusion LLM (classify_and_merge, DB queries, GBNF+prompt, 7 tests) | `structuration.rs`, `types/index.ts`, `dictationStore.ts`, `TranscriptPreview.tsx`, `lib.rs` |
| 2026-02-23 | Story 19.4 : Pipeline bout-en-bout (auto-classification, indicateur progression, bouton Valider/Rejeter) | `ToolbarMic.tsx`, `TranscriptPreview.tsx` |
| 2026-02-24 | Epic 20 COMPLET (3/3) : save previous_observations, undo button, ManualEntryForm refonte (cycle filter + edit) | `appreciationStore.ts`, `AppreciationTable.tsx`, `ManualEntryForm.tsx` |
| 2026-02-24 | Brainstorming V2.1 refonte (Party Mode + 3 techniques) : 5 modules, 44 questions, modele event sourcing, flux donnees | `brainstorming-session-2026-02-24.md` |
| 2026-02-24 | PRD V2.1-rev2 : 71 FRs, 4 modules, event sourcing, 3 jobs LLM, micro par eleve, registre appel, LSU vivant | `prd-v2.1.md` |
| 2026-02-24 | Architecture + Epics V2.1-rev2 : 20 ADRs, 5 epics (22-26), 19 stories, 4 sprints | `architecture-v2.1.md`, `epics-v2.1.md` |
| 2026-02-24 | Epic 22 COMPLET (4/4) : migrations rev2, event store, micro dual-mode, classification→event sourcing | `v2_1_rev2.rs`, `events/mod.rs`, `eventStore.ts`, `useDualModeMic.ts`, `TranscriptPreview.tsx` |
| 2026-02-24 | Epic 23 COMPLET (3/3) : registre appel, motifs/retards/retroactivite, alertes legales+totaux LSU (14 tests Rust) | `absences/mod.rs`, `absenceStore.ts`, `AttendanceGrid.tsx`, `AbsenceDetailModal.tsx`, `AbsenceSummary.tsx` |
| 2026-02-24 | Epic 24 COMPLET (3/3) : evaluations individuelles, saisie par lot, historique chronologique (reuse eventStore) | `EvaluationForm.tsx`, `BatchEvaluation.tsx`, `EvaluationHistory.tsx`, `evaluations/index.tsx` |
| 2026-02-25 | Story 25.1 : Jobs LLM 2+3 — generate_synthese + generate_appreciation (Rust-only, 14 tests, 127 total) | `gbnf.rs`, `prompt_builder.rs`, `structuration.rs`, `lib.rs` |
| 2026-02-25 | Story 25.2 : Synthese On-Demand & Versioning — CRUD Rust syntheses_lsu, store Zustand, SynthesisCard + VersionModal (9 tests, 136 total) | `synthese/mod.rs`, `syntheseStore.ts`, `SynthesisCard.tsx`, `VersionModal.tsx` |
| 2026-02-25 | Story 25.3 : Double Vue LSU — page lsu-vivant (tabs par-eleve/par-domaine), SourcesAccordion, StudentSynthesisView, navigation sidebar | `lsu-vivant/index.tsx`, `SourcesAccordion.tsx`, `StudentSynthesisView.tsx`, `App.tsx`, `Sidebar.tsx`, `SynthesisCard.tsx` |
