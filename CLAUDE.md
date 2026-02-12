# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Description

**Comportement** — Application desktop locale (Tauri v2) pour le suivi pédagogique complet des élèves en école élémentaire (CM2, École Victor Hugo, Sevran). V1 en production, V2 en implémentation (Sprint 1 complété).

**V1 (en production) :**
- Système d'avertissements (1-2-3) avec reset quotidien à 16h30
- Système de sanctions (émojis tristes, max 10/semaine) avec reset hebdomadaire
- Récompenses automatiques (parfait/partiel) + grille cartes avec ligne L-M-J-V
- Double interface : vue compact enseignant + vue TBI plein écran
- Export JSON pour analyse externe

**V2 (en planning — 3 modules + IA locale) :**
- Module 1 — Comportement Classe : évolution V1 + motifs sanctions + absences + synthèse LLM
- Module 2 — Comportement Individuel : incidents détaillés par élève et par période
- Module 3 — Domaines d'Apprentissage : dictée vocale (Whisper.cpp) + structuration auto (Qwen 2.5 LLM)
- IA locale 100% offline : pipeline séquentiel push-to-talk, un seul modèle actif à la fois
- Périodes scolaires configurables (trimestres/semestres)

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

### Phase actuelle : Phase 4 Implementation (Sprint 1 complété)

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
- [x] **Sprint 1 : Epic 10 + Epic 11** (6/7 stories complétées)
  - Epic 10 : Restructuration Modulaire V1→V2 (3/4 - Story 10.3 déférée à Sprint 3)
  - Epic 11 : Module 1 Evolutions (3/3 - COMPLET)
- [ ] Sprint 2 : Epic 13 + Epic 14 (Infrastructure IA + Capture audio)
- [ ] Sprint 3 : Epic 12 + Epic 15 (Modules 2 et 3)
- [ ] Sprint 4 : Epic 16 + Epic 17 (Gestion modèles + Polish)

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

## Commandes de développement

```bash
# Développement (nécessite Rust installé)
npm run tauri dev

# Build production
npm run tauri build

# Frontend seul (sans Tauri)
npm run dev

# Tests
npm test
```

## Stories en attente

### Story 10.3 : Configuration des périodes scolaires (SKIP temporaire)
**Raison :** Story de taille L (complexe) nécessitant :
- Store configStore pour gérer les périodes
- UI complète dans Settings (trimestres/semestres, dates, validation)
- Sélecteur de période dans barre d'outils
- Logique de détection automatique période active
- Pas bloquante pour Epic 10 (navigation modulaire)

**Quand la reprendre :** Début Sprint 3 (avant Modules 2 et 3 qui dépendent des périodes)

---

## Session Log

| Date | Action | Fichiers |
|------|--------|----------|
| 2026-01-26 | Initialisation CLAUDE.md | `CLAUDE.md` |
| 2026-01-26 | Complétion PRD (34 FRs, 13 NFRs) | `prd.md` |
| 2026-01-26 | Architecture steps 1-6 complétés | `architecture.md` |
| 2026-01-26 | Architecture step 7 validation finale ✅ | `architecture.md` |
| 2026-01-26 | Epics & Stories créés (6 epics, 25 stories) ✅ | `epics.md` |
| 2026-01-27 | Story 1.1 : Tauri + React + Tailwind + SQLite initialisés | `src-tauri/`, `package.json` |
| 2026-01-27 | Rust 1.93.0 installé, Tailwind v4 fix (`@tailwindcss/postcss`) | `postcss.config.js` |
| 2026-01-27 | Story 1.1 complétée : structure base + store + types | `src/stores/`, `src/types/` |
| 2026-01-27 | Stories 1.2-1.3 : CRUD élèves + liste + SQLite connecté | `src/components/` |
| 2026-01-27 | Epic 4 : Résumé hebdo + Export JSON | `WeeklySummary.tsx`, `ExportButton.tsx` |
| 2026-01-27 | Epic 5 : Mode TBI plein écran (F11) | `TBIView.tsx`, `App.tsx` |
| 2026-01-27 | Epic 6 : Tray, raccourci global, autostart | `lib.rs`, `Settings.tsx` |
| 2026-01-27 | Sanction directe + reset avertissements + emoji 🙁 | `studentStore.ts`, composants |
| 2026-01-28 | Epic 8 : Grille cartes + ordre alphabétique fixe | `StudentGrid/`, `TBIView.tsx` |
| 2026-01-28 | Epic 7 : Table daily_rewards + store rewards + UI ligne L-M-J-V | `lib.rs`, `studentStore.ts`, `WeeklyRewardLine.tsx` |
| 2026-01-28 | Attribution auto 16h30 + annulation par sanction | `App.tsx`, `date.ts`, `studentStore.ts` |
| 2026-01-28 | Sprint 4: Retrait avert. + mode liste + boutons adaptatifs | `StudentGridCard.tsx`, `StudentGrid.tsx`, `useWindowSize.ts` |
| 2026-02-10 | Planning V2 complet (Product Brief, PRD, UX, Architecture, Epics, Implementation Readiness) | `_bmad-output/planning-artifacts/*-v2.md` |
| 2026-02-10 | Résolution 7 issues critiques BMM (IC-1 à IC-7) | Tous docs V2 |
| 2026-02-10 | Sprint Planning généré (36 stories, 8 epics) | `sprint-status.yaml` |
| 2026-02-10 | Story 10.1 : Réorganisation modulaire V1→V2 | `src/modules/`, `src/shared/` |
| 2026-02-10 | Story 10.2 : Migrations SQLite V2 (5 tables, seed data) | `src-tauri/src/lib.rs` |
| 2026-02-10 | Story 10.3 SKIP (reprendre Sprint 3) | - |
| 2026-02-10 | Workflow BMM V2 init : tag v1.0, archive V1, recherche technique + Perplexity | `bmm-workflow-status.yaml`, `research/` |
| 2026-02-10 | Product Brief V2 (6 étapes collaboratives) | `product-brief-comportement-2026-02-10.md` |
| 2026-02-10 | PRD V2 (57 FRs, 27 NFRs) + UX Design V2 (9 sections) — en parallèle | `prd-v2.md`, `ux-design-v2.md` |
| 2026-02-10 | Architecture V2 (14 sections, 6 ADRs) + Epics V2 (8 epics, 35 stories) — en parallèle | `architecture-v2.md`, `epics-v2.md` |
| 2026-02-10 | Implementation Readiness Check complété (7 issues critiques résolues) | `implementation-readiness-v2.md` |
| 2026-02-12 | Story 10.4 : Navigation entre modules (Sidebar responsive) | `App.tsx`, `Sidebar.tsx`, `ModuleHeader.tsx` |
| 2026-02-12 | Story 11.1 : Motifs sanctions obligatoires (radio buttons + modal 3e avertissement) | `SanctionReasonModal.tsx`, `StudentGridCard.tsx`, `studentStore.ts` |
| 2026-02-12 | Story 11.2 : Gestion absences consolidée (bouton Absent + label ABS) | `WeeklyRewardLine.tsx`, `StudentGridCard.tsx` |
| 2026-02-12 | Story 11.3 : Export JSON enrichi V2 (rewards + raison annulation) | `studentStore.ts`, `types/index.ts` |
| 2026-02-12 | **Sprint 1 complété** (6/7 stories - Epic 10: 3/4, Epic 11: 3/3 COMPLET) | `sprint-status.yaml` |
| 2026-02-12 | Story 13.1 : SidecarManager Rust (start/stop/status, pipeline séquentiel, events, 5 tests) | `src-tauri/src/sidecar/`, `lib.rs`, `Cargo.toml`, `tauri.conf.json`, `capabilities/` |
