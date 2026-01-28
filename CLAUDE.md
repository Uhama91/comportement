# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Description

**Comportement** — Application desktop locale pour le suivi du comportement des élèves en classe élémentaire. Remplace le système de tableau physique avec émojis par une interface numérique rapide, accessible en un clic, avec affichage sur TBI.

**Fonctionnalités principales :**
- Système d'avertissements (1-2-3) avec reset quotidien à 16h30
- Système de sanctions (émojis tristes, max 10/semaine) avec reset hebdomadaire
- Double interface : vue compact enseignant + vue TBI plein écran
- Export JSON pour analyse externe

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

## BMM Workflow Status

### Phase actuelle : Phase 4 - Implementation Ready

**Documents complétés :**
- [x] Product Brief : `_bmad-output/planning-artifacts/product-brief-comportement-2026-01-26.md`
- [x] PRD : `_bmad-output/planning-artifacts/prd.md` (34 FRs, 13 NFRs)
- [x] Architecture : `_bmad-output/planning-artifacts/architecture.md` ✅
- [x] Epics & Stories : `_bmad-output/planning-artifacts/epics.md` ✅ (6 epics, 25 stories)

### Phase actuelle : V2 en cours

**Epics V1 complétés :**
- ✅ Epic 1-6 : Fonctionnalités de base (CRUD, avertissements, sanctions, export, TBI, tray)

**Epics V2 (nouveau) :**
- ✅ Epic 7 : Système Récompenses (7.1-7.4 complétés, 7.5 à faire)
- ✅ Epic 8 : Refonte Interface Cartes (8.1, 8.2, 8.4 complétés, 8.3 à faire)
- 🔲 Epic 9 : Barre Latérale (non commencé)

**Fonctionnalités V2 :**
- Grille de cartes avec ordre alphabétique fixe (ne change jamais)
- Ligne hebdomadaire L-M-J-V sur chaque carte (pas le mercredi)
- Récompenses automatiques à 16h30 : 😊 parfait, 🙂 1-2 avert.
- Sanction annule la récompense la plus récente (partielle d'abord)
- Table SQLite `daily_rewards` pour persistance

## Décisions techniques clés

- **Tauri vs Electron** : Tauri choisi car problème écran blanc avec Electron sur Windows pro
- **Mode portable** : Pas d'installateur pour éviter les blocages SmartScreen en entreprise
- **Naming** : `snake_case` en DB, `camelCase` en TypeScript, conversion auto via Serde
- **State** : Zustand avec pattern try/catch systématique pour les actions async

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
