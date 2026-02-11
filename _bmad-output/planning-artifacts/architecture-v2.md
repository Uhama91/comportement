---
stepsCompleted: [step-01-init, step-02-context, step-03-starter, step-04-decisions, step-05-patterns, step-06-structure, step-07-validation, step-08-complete]
inputDocuments:
  - product-brief-comportement-2026-02-10.md
  - prd-v2.md
  - ux-design-v2.md
  - suivi-comportement-briefing-complet.md
  - research/technical-ia-locale-tauri-sidecars-research-2026-02-10.md
  - archive-v1/architecture.md
  - archive-v1/epics.md
workflowType: 'architecture'
project_name: 'comportement'
user_name: 'Uhama'
date: '2026-02-10'
author: 'Uhama'
version: 'V2'
previous_version: 'V1 (2026-01-26)'
---

# Architecture V2 — Comportement

**Auteur :** Uhama
**Date :** 2026-02-10
**Version :** V2
**Version precedente :** V1 (2026-01-26) — archivee dans `archive-v1/architecture.md`

---

## Table des matieres

1. [Vue d'ensemble de l'architecture](#1-vue-densemble-de-larchitecture)
2. [Stack technique](#2-stack-technique)
3. [Structure du projet](#3-structure-du-projet)
4. [Architecture Sidecar](#4-architecture-sidecar)
5. [Architecture de securite](#5-architecture-de-securite)
6. [Architecture des donnees](#6-architecture-des-donnees)
7. [Pipeline audio](#7-pipeline-audio)
8. [Pipeline LLM](#8-pipeline-llm)
9. [Gestion des modeles](#9-gestion-des-modeles)
10. [Gestion de l'etat (State Management)](#10-gestion-de-letat-state-management)
11. [Architecture de deploiement](#11-architecture-de-deploiement)
12. [Strategie de migration V1 vers V2](#12-strategie-de-migration-v1-vers-v2)
13. [Mitigations des risques](#13-mitigations-des-risques)
14. [ADR (Architecture Decision Records)](#14-adr-architecture-decision-records)

---

## 1. Vue d'ensemble de l'architecture

### 1.1 Modele multi-processus

L'application Comportement V2 suit une architecture multi-processus heritee de Tauri v2. Chaque composant s'execute dans un processus isole, garantissant qu'un crash d'un sidecar IA n'affecte pas l'application principale.

```
+===================================================================+
|                     COMPORTEMENT V2                                |
|                                                                    |
|  [PID 1] TAURI CORE (Rust)                                        |
|  +--------------------------------------------------------------+ |
|  | - Orchestration sidecars (SidecarManager)                     | |
|  | - Commandes IPC (#[tauri::command])                           | |
|  | - Validateur JSON LLM                                         | |
|  | - Migrations SQLite                                           | |
|  | - Scheduler resets (16h30, lundi)                             | |
|  | - Telechargement modeles (reqwest)                            | |
|  +--------------------------------------------------------------+ |
|           |                                                        |
|           | IPC (JSON serialize via invoke())                       |
|           v                                                        |
|  [PID 2] WEBVIEW (React + TypeScript)                              |
|  +--------------------------------------------------------------+ |
|  | Module 1: Comportement Classe (grille cartes, TBI, export)    | |
|  | Module 2: Comportement Individuel (fiche eleve, incidents)    | |
|  | Module 3: Domaines Apprentissage (dictee vocale, appreciations)| |
|  | Shared: Navigation, Stores Zustand, Composants UI             | |
|  +--------------------------------------------------------------+ |
|           |                                                        |
|           | invoke("transcribe_audio") / invoke("structure_text")   |
|           v                                                        |
|  [PID 3] SIDECAR 1: whisper-server (a la demande)                 |
|  +--------------------------------------------------------------+ |
|  | - HTTP localhost:8081                                          | |
|  | - Endpoint POST /inference                                    | |
|  | - Modele: whisper-small-fr (GGUF Q4) ~480 Mo                  | |
|  | - VAD natif (--vad flag)                                      | |
|  | - Watchdog: restart auto apres reponse vide / ~50 requetes    | |
|  +--------------------------------------------------------------+ |
|                                                                    |
|  [PID 4] SIDECAR 2: llama-server (a la demande)                   |
|  +--------------------------------------------------------------+ |
|  | - HTTP localhost:8080                                          | |
|  | - API compatible OpenAI (/v1/chat/completions)                | |
|  | - Modele: Qwen 2.5 Coder 1.5B (GGUF Q4) ~980 Mo              | |
|  | - Grammaire GBNF pour contrainte JSON                         | |
|  | - ctx-size: 512-1024 tokens                                   | |
|  +--------------------------------------------------------------+ |
|                                                                    |
|  [FICHIER] SQLite (comportement.db)                                |
|  +--------------------------------------------------------------+ |
|  | - Mode WAL (Write-Ahead Logging)                              | |
|  | - Tables V1 + Tables V2                                       | |
|  | - Chemin: app_data_dir()/comportement.db                      | |
|  +--------------------------------------------------------------+ |
+===================================================================+
```

**Ref PRD :** FR45-FR50 (infrastructure IA), NFR13 (PC ecole 4 Go RAM), NFR16 (RAM < 2 Go sequentiel)

### 1.2 Communication entre processus

```
FRONTEND (React)                    RUST BACKEND                     SIDECARS
+------------------+               +-------------------+            +------------------+
|                  |   invoke()    |                   |  HTTP POST |                  |
| Zustand Store    | ------------> | #[tauri::command]  | ---------> | whisper-server   |
|                  |   Promise     |                   |  JSON resp |  :8081           |
|                  | <------------ | Tauri Commands    | <--------- |                  |
|                  |               |                   |            +------------------+
| Event listeners  |   emit()      |                   |  HTTP POST |                  |
|                  | <------------ | SidecarManager    | ---------> | llama-server     |
|                  |               |                   |  JSON resp |  :8080           |
|                  |               |                   | <--------- |                  |
+------------------+               +---+---------------+            +------------------+
                                       |
                                       | SQL (prepared statements)
                                       v
                                   +-------------------+
                                   | SQLite            |
                                   | comportement.db   |
                                   +-------------------+
```

- **Frontend -> Rust** : `invoke("command_name", { params })` retourne une Promise (JSON serialise via Serde)
- **Rust -> Frontend** : `app.emit("event_name", payload)` pour notifications asynchrones (progression telechargement, statut sidecar)
- **Rust -> Sidecars** : HTTP POST sur localhost (reqwest ou ureq)
- **Rust -> SQLite** : `tauri-plugin-sql` avec prepared statements

---

## 2. Stack technique

### 2.1 Tableau recapitulatif

| Composant | Technologie | Version | Taille | RAM actif | Justification |
|-----------|-------------|---------|--------|-----------|---------------|
| Framework Desktop | Tauri | v2.9+ | ~18 Mo exe | ~200 Mo | Conserve V1, sidecar natif, leger (NFR14) |
| Frontend | React | 19 | inclus | inclus | Conserve V1, ecosysteme mature |
| Language Frontend | TypeScript | ~5.9 | inclus | inclus | Conserve V1, typage strict |
| Styling | Tailwind CSS | v4 | inclus | inclus | Conserve V1, utilitaire |
| State Management | Zustand | 5.x | ~1 Ko | negligeable | Conserve V1, leger, API simple |
| Build | Vite | 7.x | inclus | dev only | Conserve V1, HMR rapide |
| Backend | Rust | >= 1.77.2 | inclus | inclus | Tauri core, memory safety |
| Base de donnees | SQLite | via tauri-plugin-sql | inclus | negligeable | Conserve V1, offline-first, WAL |
| STT | Whisper.cpp (whisper-server) | >= v1.8.1 | ~480 Mo modele, ~25 Mo bin | ~852 Mo actif | Meilleur rapport qualite/taille FR (NFR5) |
| VAD | whisper.cpp natif (--vad) | inclus | inclus | negligeable | Integre, pas de dependance ONNX (ADR-003) |
| LLM | Qwen 2.5 Coder 1.5B | GGUF Q4_K_M | ~980 Mo modele | ~2 Go actif | Specialise JSON/code, taille CPU (ADR-006) |
| Serveur LLM | llama-server (llama.cpp) | pinned release | ~25 Mo bin | inclus dans LLM | API OpenAI-compatible, GBNF natif |
| Contrainte sortie | Grammaire GBNF | custom | < 1 Ko | negligeable | Controle deterministe au token (ADR-001) |
| Capture audio | tauri-plugin-mic-recorder | v2.x | inclus | negligeable | Plan A, simplicite (ADR-005) |
| Capture audio fallback | Web Audio API (getUserMedia) | standard | inclus | negligeable | Plan B si plugin instable (ADR-005) |
| **TOTAL distribution** | | | **~1.5 Go** | **~2 Go pic (sequentiel)** | Ref NFR15, NFR16 |

### 2.2 Nouvelles dependances Rust (Cargo.toml)

```toml
# Dependances V1 conservees
tauri = { version = "2.9", features = ["tray-icon"] }
tauri-plugin-sql = { version = "2", features = ["sqlite"] }
tauri-plugin-global-shortcut = "2"
tauri-plugin-autostart = "2"
tauri-plugin-single-instance = "2"
tauri-plugin-log = "2"
serde = { version = "1.0", features = ["derive"] }
serde_json = "1.0"
log = "0.4"

# Nouvelles dependances V2
tauri-plugin-shell = "2"              # Gestion sidecars (spawn, kill)
reqwest = { version = "0.12", features = ["json", "stream"] }  # HTTP pour sidecars + telechargement modeles
tokio = { version = "1", features = ["time", "process"] }      # Async runtime, timers
sha2 = "0.10"                          # Verification SHA256 modeles
hex = "0.4"                            # Affichage SHA256
```

### 2.3 Nouvelles dependances Frontend (package.json)

```json
{
  "dependencies": {
    "@tauri-apps/plugin-shell": "^2.x",
    "lucide-react": "^0.x"
  }
}
```

**Ref PRD :** NFR13 (Windows 10/11, 4 Go RAM), NFR14 (mode portable), NFR15 (< 2 Go distribution)

---

## 3. Structure du projet

### 3.1 Arborescence V2 complete

```
comportement/
+-- package.json
+-- tsconfig.json
+-- vite.config.ts
+-- postcss.config.js
+-- index.html
+-- CLAUDE.md
|
+-- src/                                    # Frontend React/TypeScript
|   +-- main.tsx                            # Entry point React
|   +-- App.tsx                             # Shell application + routage modules
|   +-- App.css                             # Styles globaux Tailwind
|   |
|   +-- modules/                            # [V2] Architecture modulaire
|   |   +-- comportement-classe/            # Module 1 (evolution V1)
|   |   |   +-- components/
|   |   |   |   +-- StudentGrid.tsx         # Grille cartes (existant V1)
|   |   |   |   +-- StudentGridCard.tsx     # Carte individuelle (existant V1)
|   |   |   |   +-- WeeklyRewardLine.tsx    # Ligne L-M-J-V (existant V1)
|   |   |   |   +-- SanctionReasonModal.tsx # Modal motif obligatoire (existant V1)
|   |   |   |   +-- WeeklySummary.tsx       # Resume hebdomadaire (existant V1)
|   |   |   |   +-- ExportButton.tsx        # Export JSON enrichi (existant V1)
|   |   |   |   +-- AddStudentForm.tsx      # Ajout eleve (existant V1)
|   |   |   |   +-- TBIView.tsx            # [V2] Vue TBI mode lecture
|   |   |   +-- hooks/
|   |   |   |   +-- useWindowSize.ts        # Hook taille fenetre (existant V1)
|   |   |   +-- index.ts                    # Re-export module
|   |   |
|   |   +-- comportement-individuel/        # Module 2 [V2 nouveau]
|   |   |   +-- components/
|   |   |   |   +-- StudentDetailView.tsx   # Vue fiche eleve detaillee
|   |   |   |   +-- IncidentForm.tsx        # Formulaire saisie incident
|   |   |   |   +-- IncidentTimeline.tsx    # Timeline chronologique
|   |   |   |   +-- PeriodFilter.tsx        # Filtre par periode scolaire
|   |   |   +-- hooks/
|   |   |   |   +-- useIncidents.ts         # Hook donnees incidents
|   |   |   +-- index.ts
|   |   |
|   |   +-- apprentissage/                  # Module 3 [V2 nouveau]
|   |       +-- components/
|   |       |   +-- VoiceDictation.tsx      # Zone dictee push-to-talk
|   |       |   +-- TranscriptionEditor.tsx # Zone correction texte transcrit
|   |       |   +-- StructuredObservations.tsx # Tableau observations LLM
|   |       |   +-- AppreciationTable.tsx   # Tableau domaines x periodes
|   |       |   +-- ManualEntryForm.tsx     # Saisie manuelle (sans dictee)
|   |       +-- hooks/
|   |       |   +-- useAudioRecorder.ts     # Hook capture audio
|   |       |   +-- useTranscription.ts     # Hook pipeline Whisper
|   |       |   +-- useStructuration.ts     # Hook pipeline LLM
|   |       +-- index.ts
|   |
|   +-- shared/                             # [V2] Couche partagee
|   |   +-- ai/                             # Interface sidecars
|   |   |   +-- whisperClient.ts            # Client HTTP whisper-server
|   |   |   +-- llamaClient.ts             # Client HTTP llama-server
|   |   |   +-- aiStatus.ts               # Etat des sidecars (idle/running/error)
|   |   |   +-- types.ts                  # Types pipeline IA
|   |   +-- db/                             # Acces SQLite partage
|   |   |   +-- database.ts               # Singleton Database.load()
|   |   |   +-- queries.ts                # Requetes SQL communes
|   |   +-- types/                          # Types communs
|   |   |   +-- index.ts                   # Student, Sanction, Reward, Absence (existant V1)
|   |   |   +-- v2.ts                      # [V2] Periode, Incident, Appreciation, Domaine
|   |   +-- components/                     # Composants UI partages
|   |   |   +-- Sidebar.tsx                # Barre laterale navigation
|   |   |   +-- PeriodSelector.tsx         # Selecteur periode scolaire
|   |   |   +-- Toast.tsx                  # Notifications toast
|   |   |   +-- LoadingBar.tsx             # Barre progression indeterminee
|   |   |   +-- ErrorBoundary.tsx          # Gestion erreurs (existant V1)
|   |   |   +-- ModelSetupScreen.tsx       # [V2] Ecran premier lancement
|   |   +-- utils/
|   |       +-- date.ts                    # Utilitaires dates/semaines (existant V1)
|   |       +-- periodes.ts               # [V2] Logique periodes scolaires
|   |
|   +-- stores/                             # Zustand stores
|   |   +-- studentStore.ts                # Store Module 1 (existant V1, etendu)
|   |   +-- incidentStore.ts              # [V2] Store Module 2
|   |   +-- appreciationStore.ts          # [V2] Store Module 3
|   |   +-- configStore.ts                # [V2] Store periodes + settings
|   |   +-- aiStore.ts                    # [V2] Store statut IA (sidecars, modeles)
|   |
|   +-- components/                         # [DEPRECIE] Deplace vers modules/
|       +-- Settings.tsx                    # Parametres (existant V1, etendu)
|
+-- src-tauri/                              # Backend Rust
|   +-- Cargo.toml                          # Dependances Rust
|   +-- tauri.conf.json                     # Configuration Tauri + externalBin
|   +-- build.rs                            # Script de build
|   +-- icons/                              # Icones application
|   |
|   +-- src/
|   |   +-- main.rs                         # Entry point Rust (genere)
|   |   +-- lib.rs                          # Setup Tauri + plugins + migrations
|   |   |
|   |   +-- commands/                       # [V2] Commandes Tauri par module
|   |   |   +-- mod.rs                      # Re-export commandes
|   |   |   +-- transcription.rs           # invoke("transcribe_audio")
|   |   |   +-- structuration.rs           # invoke("structure_text")
|   |   |   +-- models.rs                  # invoke("download_model"), invoke("check_models")
|   |   |   +-- periodes.rs               # invoke("get_periodes"), invoke("save_periodes")
|   |   |
|   |   +-- sidecar/                        # [V2] SidecarManager custom
|   |   |   +-- mod.rs                      # Re-export
|   |   |   +-- manager.rs                 # SidecarManager : start, stop, healthcheck
|   |   |   +-- whisper.rs                 # WhisperSidecar : config, watchdog
|   |   |   +-- llama.rs                   # LlamaSidecar : config, grammaire
|   |   |
|   |   +-- validation/                     # [V2] Validateur LLM JSON
|   |   |   +-- mod.rs                      # Re-export
|   |   |   +-- validator.rs               # Parse JSON, whitelist tables/colonnes
|   |   |   +-- schema.rs                  # Schema autorise (tables, colonnes, types)
|   |   |   +-- executor.rs               # Construction prepared statements
|   |   |
|   |   +-- db/                             # [V2] Migrations SQLite
|   |       +-- mod.rs
|   |       +-- migrations.rs              # Migrations V1 + V2
|   |
|   +-- binaries/                           # [V2] Sidecars pre-compiles
|   |   +-- whisper-server-x86_64-pc-windows-msvc.exe
|   |   +-- whisper-server-aarch64-apple-darwin
|   |   +-- whisper-server-x86_64-apple-darwin
|   |   +-- llama-server-x86_64-pc-windows-msvc.exe
|   |   +-- llama-server-aarch64-apple-darwin
|   |   +-- llama-server-x86_64-apple-darwin
|   |
|   +-- grammars/                           # [V2] Grammaires GBNF
|   |   +-- appreciation.gbnf             # Grammaire pour table appreciations
|   |   +-- incident.gbnf                 # Grammaire pour table comportement_detail
|   |
|   +-- capabilities/
|       +-- default.json                    # Permissions Tauri (V1 + V2)
|
+-- _bmad-output/                           # Artefacts BMM
|   +-- planning-artifacts/
|       +-- architecture-v2.md             # CE DOCUMENT
|       +-- prd-v2.md
|       +-- ux-design-v2.md
|       +-- product-brief-comportement-2026-02-10.md
```

### 3.2 Configuration Tauri V2 (tauri.conf.json)

```json
{
  "productName": "Comportement",
  "version": "2.0.0",
  "identifier": "fr.comportement.app",
  "app": {
    "windows": [
      {
        "title": "Comportement",
        "width": 1200,
        "height": 800,
        "resizable": true,
        "fullscreen": false
      }
    ],
    "security": { "csp": null }
  },
  "bundle": {
    "active": true,
    "targets": "all",
    "externalBin": [
      "binaries/whisper-server",
      "binaries/llama-server"
    ],
    "icon": [
      "icons/32x32.png",
      "icons/128x128.png",
      "icons/128x128@2x.png",
      "icons/icon.icns",
      "icons/icon.ico"
    ]
  }
}
```

Tauri ajoute automatiquement le suffix target triple au runtime (ex: `whisper-server-x86_64-pc-windows-msvc.exe`).

**Ref PRD :** FR56 (navigation entre modules), NFR14 (mode portable)

---

## 4. Architecture Sidecar

### 4.1 SidecarManager Rust (custom)

Le SidecarManager est un composant Rust custom qui orchestre le cycle de vie des deux sidecars IA. Il n'existe pas de plugin officiel Tauri pour ce besoin (issue tauri-apps/plugins-workspace#3062).

```rust
// src-tauri/src/sidecar/manager.rs (pseudo-code)

pub struct SidecarManager {
    whisper: Option<SidecarProcess>,
    llama: Option<SidecarProcess>,
}

pub struct SidecarProcess {
    child: Child,            // Processus enfant
    port: u16,               // Port HTTP
    request_count: u32,      // Compteur pour watchdog
    max_requests: u32,       // Seuil de recyclage
    last_healthcheck: Instant,
}

impl SidecarManager {
    /// Demarre un sidecar a la demande (pas au lancement de l'app)
    pub async fn start_whisper(&mut self, model_path: &str) -> Result<()> {
        // 1. Verifier que llama n'est pas actif (mode sequentiel PC 4 Go)
        if self.llama.is_some() {
            self.stop_llama().await?;
        }
        // 2. Spawn whisper-server avec arguments
        let child = Command::new_sidecar("whisper-server")?
            .args(&[
                "--model", model_path,
                "--port", "8081",
                "--vad",           // VAD natif (ADR-003)
                "--language", "fr",
                "--threads", "4",
            ])
            .spawn()?;
        // 3. Attendre healthcheck HTTP (max 10s)
        self.wait_for_ready("http://127.0.0.1:8081/health", 10_000).await?;
        self.whisper = Some(SidecarProcess { child, port: 8081, .. });
        Ok(())
    }

    /// Demarre llama-server a la demande
    pub async fn start_llama(&mut self, model_path: &str, grammar_path: &str) -> Result<()> {
        // 1. Arreter whisper si actif (mode sequentiel)
        if self.whisper.is_some() {
            self.stop_whisper().await?;
        }
        // 2. Spawn llama-server
        let child = Command::new_sidecar("llama-server")?
            .args(&[
                "--model", model_path,
                "--port", "8080",
                "--ctx-size", "1024",   // Contexte reduit (ADR-002)
                "--threads", "4",
                "--grammar-file", grammar_path,
            ])
            .spawn()?;
        // 3. Attendre healthcheck
        self.wait_for_ready("http://127.0.0.1:8080/health", 15_000).await?;
        self.llama = Some(SidecarProcess { child, port: 8080, .. });
        Ok(())
    }

    /// Arret propre avec timeout force
    pub async fn stop_whisper(&mut self) -> Result<()> {
        if let Some(proc) = self.whisper.take() {
            // Graceful shutdown via signal
            proc.child.kill()?;
            // Attendre max 5 secondes
            tokio::time::timeout(Duration::from_secs(5), proc.child.wait()).await
                .unwrap_or_else(|_| {
                    // Force kill si timeout
                    let _ = proc.child.kill();
                    Ok(())
                });
        }
        Ok(())
    }

    /// Watchdog whisper-server (ADR-004)
    pub async fn watchdog_check(&mut self) -> Result<()> {
        if let Some(ref mut proc) = self.whisper {
            proc.request_count += 1;
            // Recycler apres ~50 requetes (bug handle leak Windows #3358)
            if proc.request_count >= proc.max_requests {
                log::warn!("Whisper watchdog: recyclage apres {} requetes", proc.request_count);
                self.restart_whisper().await?;
            }
        }
        Ok(())
    }
}
```

### 4.2 Pipeline sequentiel (ADR-002)

Sur un PC ecole 4 Go RAM, les deux sidecars ne peuvent **jamais** tourner simultanement. Le pipeline est strictement sequentiel :

```
TEMPS  -->  |  Phase 1          |  Phase 2         |  Phase 3          |
            |  WHISPER ACTIF     |  TRANSITION      |  LLAMA ACTIF      |
            |                    |                   |                   |
RAM:        |  ~852 Mo           |  ~0 Mo            |  ~2 Go            |
            |                    |                   |                   |
Action:     | whisper-server     | whisper s'arrete  | llama-server      |
            | transcrit audio    | llama demarre     | structure JSON    |
            | -> texte           |                   | -> observation    |
            |                    |                   |                   |
Duree:      | 3-5 sec            | 3-5 sec           | 3-5 sec           |
            |                    | (chargement       |                   |
            |                    |  modele)           |                   |
```

**Total pipeline :** < 15 secondes (ref NFR7)

### 4.3 Configuration whisper-server

| Parametre | Valeur | Justification |
|-----------|--------|---------------|
| `--model` | `{app_data_dir}/models/whisper-small-fr-q4.gguf` | Modele small FR quantifie |
| `--port` | 8081 | Eviter conflit avec llama-server |
| `--vad` | flag present | VAD natif ggml (ADR-003) |
| `--language` | `fr` | Francais uniquement |
| `--threads` | 4 | Nombre de CPU cores |
| Endpoint | `POST /inference` (multipart: audio WAV) | API whisper-server standard |
| Watchdog | Restart apres reponse vide ou ~50 requetes | Bug handle leak Windows #3358 (ADR-004) |
| Version | `>= v1.8.1` pinnee | Fix memory leak VAD |

### 4.4 Configuration llama-server

| Parametre | Valeur | Justification |
|-----------|--------|---------------|
| `--model` | `{app_data_dir}/models/qwen25-coder-1.5b-q4.gguf` | Qwen 2.5 Coder 1.5B |
| `--port` | 8080 | Port par defaut llama-server |
| `--ctx-size` | 1024 | Contexte reduit pour economie RAM |
| `--threads` | 4 | Nombre de CPU cores |
| `--grammar-file` | `{app_resources}/grammars/appreciation.gbnf` | GBNF charge au demarrage |
| Endpoint | `POST /v1/chat/completions` | API compatible OpenAI |

**Ref PRD :** FR45 (whisper-server a la demande), FR46 (llama-server a la demande), FR47 (pipeline sequentiel), FR50 (VAD natif)

---

## 5. Architecture de securite

### 5.1 Defense en profondeur — LLM-as-DB-Interface

Le LLM genere du **JSON structure** (jamais du SQL). Rust reconstruit les requetes avec des prepared statements. Ce choix est documente dans l'ADR-001.

```
+------------------------------------------------------------------+
|  PIPELINE DE SECURITE (4 couches)                                 |
|                                                                   |
|  COUCHE 1: PROMPT CONTRAINT                                       |
|  +--------------------------------------------------------------+ |
|  | "Tu es un assistant pedagogique. Tu transformes les           | |
|  |  observations en JSON structure.                              | |
|  |  Tu ne peux generer QUE des objets JSON au format:            | |
|  |  { table: '...', row: { ... } }                              | |
|  |  Tables autorisees: appreciations, comportement_detail        | |
|  |  Tu n'as AUCUNE connaissance de SQL."                         | |
|  +--------------------------------------------------------------+ |
|           |                                                       |
|           v                                                       |
|  COUCHE 2: GRAMMAIRE GBNF                                         |
|  +--------------------------------------------------------------+ |
|  | Controle DETERMINISTE au niveau token.                        | |
|  | Le modele ne peut physiquement PAS generer autre chose        | |
|  | que du JSON valide selon la grammaire.                        | |
|  |                                                               | |
|  | Exemple GBNF pour table appreciations:                        | |
|  | root ::= "{" ws                                               | |
|  |   "\"table\"" ws ":" ws "\"appreciations\"" ws "," ws        | |
|  |   "\"row\"" ws ":" ws row ws                                  | |
|  | "}"                                                           | |
|  | row ::= "{" ws                                                | |
|  |   "\"domaine\"" ws ":" ws string ws "," ws                   | |
|  |   "\"niveau\"" ws ":" ws niveau ws "," ws                    | |
|  |   "\"observations\"" ws ":" ws string ws                     | |
|  | "}"                                                           | |
|  | niveau ::= "\"maitrise\"" | "\"en_cours_acquisition\"" |     | |
|  |            "\"debut\""                                        | |
|  +--------------------------------------------------------------+ |
|           |                                                       |
|           v  JSON { "table": "appreciations", "row": {...} }      |
|                                                                   |
|  COUCHE 3: VALIDATEUR RUST                                         |
|  +--------------------------------------------------------------+ |
|  | 1. Parse JSON (serde_json::from_str)                          | |
|  | 2. Verifier table in ["appreciations","comportement_detail"]  | |
|  | 3. Verifier colonnes autorisees pour cette table              | |
|  | 4. Verifier types de donnees (String, enum, Integer)          | |
|  | 5. Verifier eleve_id == eleve selectionne dans le contexte    | |
|  | 6. Verifier periode_id == periode active                      | |
|  | 7. Verifier taille des champs (max 500 caracteres)            | |
|  | 8. Rejeter avec message d'erreur si echec                     | |
|  +--------------------------------------------------------------+ |
|           |                                                       |
|           v  Donnees validees (Rust struct)                        |
|                                                                   |
|  COUCHE 4: PREPARED STATEMENTS SQLite                              |
|  +--------------------------------------------------------------+ |
|  | Rust construit l'INSERT avec parametres ($1, $2, $3...)       | |
|  | ZERO SQL brut ne traverse la frontiere LLM -> execution       | |
|  | Injection SQL IMPOSSIBLE (prepared statements)                | |
|  |                                                               | |
|  | db.execute(                                                   | |
|  |   "INSERT INTO appreciations                                  | |
|  |    (eleve_id, periode_id, domaine_id, niveau, observations)   | |
|  |    VALUES ($1, $2, $3, $4, $5)",                              | |
|  |   [eleve_id, periode_id, domaine_id, niveau, observations]    | |
|  | )                                                             | |
|  +--------------------------------------------------------------+ |
+------------------------------------------------------------------+
```

### 5.2 Validateur Rust (pseudo-code)

```rust
// src-tauri/src/validation/validator.rs

use serde::{Deserialize, Serialize};

#[derive(Deserialize)]
struct LlmOutput {
    table: String,
    row: serde_json::Value,
}

/// Tables et colonnes autorisees
const ALLOWED_TABLES: &[(&str, &[&str])] = &[
    ("appreciations", &["domaine", "niveau", "observations"]),
    ("comportement_detail", &["type_evenement", "motif", "description", "intervenant"]),
];

/// Niveaux autorises
const ALLOWED_NIVEAUX: &[&str] = &["maitrise", "en_cours_acquisition", "debut"];

pub fn validate_llm_output(
    json_str: &str,
    context_student_id: i64,
    context_period_id: i64,
) -> Result<ValidatedInsert, ValidationError> {
    // 1. Parse JSON
    let output: LlmOutput = serde_json::from_str(json_str)
        .map_err(|e| ValidationError::InvalidJson(e.to_string()))?;

    // 2. Verifier table autorisee
    let allowed_columns = ALLOWED_TABLES.iter()
        .find(|(t, _)| *t == output.table)
        .map(|(_, cols)| *cols)
        .ok_or(ValidationError::UnauthorizedTable(output.table.clone()))?;

    // 3. Verifier colonnes
    let row = output.row.as_object()
        .ok_or(ValidationError::InvalidRow)?;
    for key in row.keys() {
        if !allowed_columns.contains(&key.as_str()) {
            return Err(ValidationError::UnauthorizedColumn(key.clone()));
        }
    }

    // 4. Verifier types et valeurs
    if output.table == "appreciations" {
        if let Some(niveau) = row.get("niveau").and_then(|v| v.as_str()) {
            if !ALLOWED_NIVEAUX.contains(&niveau) {
                return Err(ValidationError::InvalidValue("niveau".into()));
            }
        }
    }

    // 5. Verifier taille des champs
    for (key, value) in row.iter() {
        if let Some(s) = value.as_str() {
            if s.len() > 500 {
                return Err(ValidationError::FieldTooLong(key.clone()));
            }
        }
    }

    // 6. Construire l'insert valide avec IDs contextuels
    Ok(ValidatedInsert {
        table: output.table,
        student_id: context_student_id,
        period_id: context_period_id,
        data: row.clone(),
    })
}
```

### 5.3 Conformite RGPD

| Exigence | Implementation |
|----------|----------------|
| Donnees ne quittent pas le poste | Architecture zero-network post-installation (NFR9) |
| Pas de telemetrie | Aucun appel reseau dans l'app |
| Prenoms stockes localement | SQLite local uniquement (NFR12) |
| Droit a l'effacement | Suppression du fichier `comportement.db` |
| Pas de consentement requis | Pas de collecte externe |
| IA 100% locale | Inference CPU, pas de cloud API |

**Ref PRD :** NFR9-NFR12 (securite RGPD), FR48 (JSON pas SQL), FR49 (validateur Rust)

---

## 6. Architecture des donnees

### 6.1 Schema SQLite complet

#### Tables V1 existantes (inchangees)

```sql
-- Table centrale des eleves
CREATE TABLE students (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    first_name TEXT NOT NULL,
    warnings INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Sanctions (persistantes, reset hebdomadaire)
CREATE TABLE sanctions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    student_id INTEGER NOT NULL,
    reason TEXT,
    week_number INTEGER NOT NULL,
    year INTEGER NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE
);

-- Recompenses quotidiennes
CREATE TABLE daily_rewards (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    student_id INTEGER NOT NULL,
    day_of_week INTEGER NOT NULL CHECK (day_of_week IN (1, 2, 4, 5)),
    week_number INTEGER NOT NULL,
    year INTEGER NOT NULL,
    reward_type TEXT NOT NULL CHECK (reward_type IN ('full', 'partial')),
    cancelled INTEGER DEFAULT 0,
    cancelled_by_sanction_id INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
    FOREIGN KEY (cancelled_by_sanction_id) REFERENCES sanctions(id) ON DELETE SET NULL,
    UNIQUE(student_id, day_of_week, week_number, year)
);

-- Absences quotidiennes
CREATE TABLE absences (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    student_id INTEGER NOT NULL,
    date TEXT NOT NULL,
    week_number INTEGER NOT NULL,
    year INTEGER NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
    UNIQUE(student_id, date)
);

-- Index V1 existants
CREATE INDEX idx_sanctions_student ON sanctions(student_id);
CREATE INDEX idx_sanctions_week ON sanctions(week_number, year);
CREATE INDEX idx_rewards_student ON daily_rewards(student_id);
CREATE INDEX idx_rewards_week ON daily_rewards(week_number, year);
CREATE INDEX idx_absences_student ON absences(student_id);
CREATE INDEX idx_absences_date ON absences(date);
```

#### Tables V2 nouvelles — Migration 5 : Configuration Periodes

```sql
-- Migration version 5
CREATE TABLE config_periodes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    annee_scolaire TEXT NOT NULL,
    type_periode TEXT NOT NULL CHECK(type_periode IN ('trimestre', 'semestre')),
    numero INTEGER NOT NULL,
    date_debut DATE NOT NULL,
    date_fin DATE NOT NULL,
    nom_affichage TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_periodes_annee ON config_periodes(annee_scolaire);
CREATE INDEX idx_periodes_dates ON config_periodes(date_debut, date_fin);
```

#### Tables V2 nouvelles — Migration 6 : Module 2 Comportement Individuel

> **Note :** La table `absences` V1 est conservee telle quelle. Aucune migration necessaire pour les absences — la table V1 couvre deja tous les besoins (student_id, date, week_number, year).

```sql
-- Migration version 7
CREATE TABLE comportement_detail (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    eleve_id INTEGER NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    date_incident DATE NOT NULL,
    heure_incident TIME,
    periode_id INTEGER REFERENCES config_periodes(id),
    type_evenement TEXT NOT NULL,
    motif TEXT NOT NULL,
    description TEXT,
    intervenant TEXT DEFAULT 'Enseignant',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_detail_eleve ON comportement_detail(eleve_id);
CREATE INDEX idx_detail_periode ON comportement_detail(periode_id);
CREATE INDEX idx_detail_date ON comportement_detail(date_incident);
CREATE INDEX idx_detail_type ON comportement_detail(type_evenement);
```

#### Tables V2 nouvelles — Migration 7 : Module 3 Domaines d'Apprentissage

```sql
-- Migration version 7
-- Domaines parametrables
CREATE TABLE domaines_apprentissage (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nom TEXT NOT NULL UNIQUE,
    ordre_affichage INTEGER DEFAULT 0,
    actif INTEGER DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Appreciations par eleve, par domaine, par periode
CREATE TABLE appreciations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    eleve_id INTEGER NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    periode_id INTEGER NOT NULL REFERENCES config_periodes(id),
    domaine_id INTEGER NOT NULL REFERENCES domaines_apprentissage(id),
    date_evaluation DATE,
    niveau TEXT CHECK(niveau IN ('maitrise', 'en_cours_acquisition', 'debut')),
    observations TEXT,
    texte_dictation TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_appreciations_eleve ON appreciations(eleve_id);
CREATE INDEX idx_appreciations_periode ON appreciations(periode_id);
CREATE INDEX idx_appreciations_domaine ON appreciations(domaine_id);

-- Donnees initiales : domaines par defaut (programme cycle 3)
INSERT INTO domaines_apprentissage (nom, ordre_affichage) VALUES
    ('Francais', 1),
    ('Mathematiques', 2),
    ('Sciences et Technologies', 3),
    ('Histoire-Geographie', 4),
    ('Enseignement Moral et Civique', 5),
    ('Education Physique et Sportive', 6),
    ('Arts Plastiques', 7),
    ('Education Musicale', 8),
    ('Langues Vivantes', 9);
```

#### Tables V2 nouvelles — Migration 8 : Infrastructure IA

```sql
-- Migration version 8
CREATE TABLE models_status (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    model_name TEXT NOT NULL UNIQUE,
    file_path TEXT NOT NULL,
    file_size INTEGER,
    sha256 TEXT,
    installed_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    version TEXT
);
```

### 6.2 Diagramme ER (Entity-Relationship)

```
+------------------+
| students         |   (table centrale V1)
| ================ |
| id (PK)          |
| first_name       |
| warnings         |
| created_at       |
+--------+---------+
         |
         | 1:N
         +-----------------------------+-----------------------------+
         |                             |                             |
+--------v---------+    +--------------v------+    +-----------------v---------+
| sanctions (V1)   |    | daily_rewards (V1)  |    | absences (V1)             |
| ================ |    | =================== |    | ========================= |
| id (PK)          |    | id (PK)             |    | id (PK)                   |
| student_id (FK)  |    | student_id (FK)     |    | student_id (FK)           |
| reason           |    | day_of_week         |    | date                      |
| week_number      |    | week_number         |    | week_number               |
| year             |    | year                |    | year                      |
| created_at       |    | reward_type         |    | created_at                |
+------------------+    | cancelled           |    +---------------------------+
                        | cancelled_by_sanc_id|
                        +---------------------+
         |
         | 1:N (V2)
         +-----------------------------+-----------------------------+
         |                             |                             |
+--------v---------+    +--------------v---------+                   |
| comportement_    |    | appreciations (V2)     |                   |
| detail (V2)      |    | ====================== |                   |
| ================ |    | id (PK)                |                   |
| id (PK)          |    | eleve_id (FK->students)|                   |
| eleve_id (FK)    |    | periode_id (FK)        |                   |
| date_incident    |    | domaine_id (FK)        |                   |
| heure_incident   |    | date_evaluation        |                   |
| periode_id (FK)  |    | niveau                 |                   |
| type_evenement   |    | observations           |                   |
| motif            |    | texte_dictation        |                   |
| description      |    | created_at             |                   |
| intervenant      |    +--------+-------+-------+                   |
| created_at       |             |       |                           |
+--------+---------+             |       |                           |
         |                       |       |                           |
         | FK                    |       | FK                        |
         v                       |       v                           |
+------------------+             |    +---------------------------+  |
| config_periodes  | <-----------+    | domaines_apprentissage    |  |
| (V2)             |                  | (V2)                      |  |
| ================ |                  | ========================= |  |
| id (PK)          |                  | id (PK)                   |  |
| annee_scolaire   |                  | nom                       |  |
| type_periode     |                  | ordre_affichage           |  |
| numero           |                  | actif                     |  |
| date_debut       |                  | created_at                |  |
| date_fin         |                  +---------------------------+  |
| nom_affichage    |                                                 |
| created_at       |    +---------------------------+                |
+------------------+    | models_status (V2)        |                |
                        | ========================= |                |
                        | id (PK)                   |                |
                        | model_name                |                |
                        | file_path                 |                |
                        | file_size                 |                |
                        | sha256                    |                |
                        | installed_at              |                |
                        | version                   |                |
                        +---------------------------+                |
```

### 6.3 Strategie de migration

Les migrations V2 (versions 5-8) s'ajoutent aux migrations V1 existantes (versions 1-4) dans `lib.rs`. Le plugin `tauri-plugin-sql` execute automatiquement les migrations au demarrage. Note : la table `absences` V1 est conservee telle quelle — aucune migration necessaire.

**Principe fondamental : ZERO breaking change.** Les tables V1 restent intactes. Les nouvelles tables V2 s'ajoutent au schema existant.

**Ref PRD :** Section 5 (Data Model complet), FR54 (config periodes), FR32-FR36 (Module 2), FR38-FR44 (Module 3)

---

## 7. Pipeline audio

### 7.1 Diagramme de sequence

```
ENSEIGNANT          FRONTEND (React)         RUST BACKEND          WHISPER-SERVER
    |                    |                        |                      |
    | Maintient bouton   |                        |                      |
    | push-to-talk       |                        |                      |
    |------ mousedown -->|                        |                      |
    |                    | Demarre capture audio   |                      |
    |                    | (tauri-plugin-mic-      |                      |
    |                    |  recorder ou Web Audio) |                      |
    |                    |                        |                      |
    | Relache bouton     |                        |                      |
    |------ mouseup ---->|                        |                      |
    |                    | Arrete capture          |                      |
    |                    | -> fichier WAV temp     |                      |
    |                    |                        |                      |
    |                    | invoke("transcribe_     |                      |
    |                    |  audio", { path })      |                      |
    |                    |----------------------->|                      |
    |                    |                        | SidecarManager       |
    |                    |                        | .start_whisper()     |
    |                    |                        |--------------------->|
    |                    |                        |                      | Charge modele
    |                    |                        |  <-- healthcheck OK  | (si pas deja actif)
    |                    |                        |                      |
    |                    |                        | POST /inference      |
    |                    |                        | (multipart: WAV)     |
    |                    |                        |--------------------->|
    |                    |                        |                      | VAD filtre silences
    |                    |                        |                      | Whisper transcrit
    |                    |                        |                      | (~3-5 sec)
    |                    |                        |  <-- texte brut      |
    |                    |                        |                      |
    |                    |                        | Watchdog check       |
    |                    |                        | (compteur requetes)  |
    |                    |                        |                      |
    |                    |  <-- return texte       |                      |
    |                    |                        |                      |
    |  Affiche texte     |                        | SidecarManager       |
    |  editable          |                        | .stop_whisper()      |
    |  <-- transcription |                        | (mode sequentiel)    |
    |                    |                        |--------------------->|
    |                    |                        |                      | Process termine
    | Corrige si besoin  |                        |                      |
    | Valide "Structurer"|                        |                      |
    |                    |                        |                      |
```

### 7.2 Format audio

| Parametre | Valeur | Justification |
|-----------|--------|---------------|
| Format | WAV PCM | Format natif Whisper.cpp |
| Bit depth | 16-bit | Standard Whisper |
| Sample rate | 16 kHz | Optimum Whisper (pas 44.1 kHz) |
| Canaux | Mono | Suffisant pour parole |
| Taille typique | ~320 Ko / 10 sec | 16000 * 2 bytes * 10 sec |

### 7.3 Gestion des erreurs audio

```typescript
// src/modules/apprentissage/hooks/useTranscription.ts
export function useTranscription() {
    const [state, setState] = useState<'idle' | 'recording' | 'transcribing' | 'done' | 'error'>('idle');
    const [text, setText] = useState('');
    const [error, setError] = useState<string | null>(null);

    const transcribe = async (audioPath: string) => {
        setState('transcribing');
        try {
            const result = await invoke<string>('transcribe_audio', { path: audioPath });
            if (!result || result.trim().length === 0) {
                // Whisper a retourne vide -> proposer re-essai ou saisie manuelle
                setError('Transcription vide. Verifiez le microphone.');
                setState('error');
                return;
            }
            setText(result);
            setState('done');
        } catch (e) {
            setError(`Erreur transcription: ${e}`);
            setState('error');
        }
    };

    return { state, text, setText, error, transcribe };
}
```

**Ref PRD :** FR38 (push-to-talk), FR39 (transcription automatique), FR50 (VAD), FR57 (capture audio), NFR5 (< 5 sec transcription)

---

## 8. Pipeline LLM

### 8.1 Diagramme de sequence

```
ENSEIGNANT          FRONTEND (React)         RUST BACKEND          LLAMA-SERVER
    |                    |                        |                      |
    | Valide texte       |                        |                      |
    | corrige            |                        |                      |
    | Clic "Structurer"  |                        |                      |
    |------ click ------>|                        |                      |
    |                    | invoke("structure_     |                      |
    |                    |  text", {              |                      |
    |                    |   text,                |                      |
    |                    |   studentId,            |                      |
    |                    |   periodId              |                      |
    |                    |  })                     |                      |
    |                    |----------------------->|                      |
    |                    |                        | SidecarManager       |
    |                    |                        | .start_llama()       |
    |                    |                        |--------------------->|
    |                    |                        |                      | Charge Qwen 2.5
    |                    |                        |  <-- healthcheck OK  | + grammaire GBNF
    |                    |                        |                      |
    |                    |                        | Construit prompt:    |
    |                    |                        | - system: regles     |
    |                    |                        | - user: texte +      |
    |                    |                        |   contexte eleve     |
    |                    |                        |                      |
    |                    |                        | POST /v1/chat/       |
    |                    |                        | completions          |
    |                    |                        | + grammar: GBNF      |
    |                    |                        |--------------------->|
    |                    |                        |                      | Generation JSON
    |                    |                        |                      | contrainte GBNF
    |                    |                        |                      | (~3-5 sec)
    |                    |                        |  <-- JSON structure   |
    |                    |                        |                      |
    |                    |                        | VALIDATION RUST:     |
    |                    |                        | 1. Parse JSON        |
    |                    |                        | 2. Whitelist table   |
    |                    |                        | 3. Whitelist cols    |
    |                    |                        | 4. Verif IDs         |
    |                    |                        | 5. Verif types       |
    |                    |                        |                      |
    |                    |                        | Si VALIDE:           |
    |                    |                        | -> Prepared INSERT   |
    |                    |                        | -> SQLite            |
    |                    |                        |                      |
    |                    |  <-- return result      |                      |
    |                    |    { success, data }    | SidecarManager       |
    |                    |                        | .stop_llama()        |
    |                    |                        |--------------------->|
    |                    |                        |                      | Process termine
    |  Apercu resultat   |                        |                      |
    |  structure          |                        |                      |
    |  <-- observations  |                        |                      |
    |                    |                        |                      |
    | Valide ou modifie  |                        |                      |
    | "Enregistrer"      |                        |                      |
    |                    |                        |                      |
```

### 8.2 Construction du prompt

```rust
// src-tauri/src/commands/structuration.rs

fn build_prompt(text: &str, student_name: &str, domaines: &[String]) -> String {
    let system = format!(
        r#"Tu es un assistant pedagogique pour une classe de CM2.
Tu transformes les observations dictees par l'enseignant en donnees structurees.

REGLES STRICTES:
- Tu generes UNIQUEMENT un objet JSON au format specifie
- Tu identifies le domaine d'apprentissage parmi: {}
- Tu determines le niveau: "maitrise", "en_cours_acquisition", ou "debut"
- Tu extrais les observations pertinentes
- Si le texte mentionne plusieurs domaines, genere un objet pour chacun
- Tu ne generes JAMAIS de SQL
- Tu ne fais AUCUN commentaire, juste le JSON"#,
        domaines.join(", ")
    );

    let user = format!(
        "Eleve: {}\nObservation dictee: \"{}\"\n\nGenere le JSON structure.",
        student_name, text
    );

    format!(
        r#"{{"messages": [
            {{"role": "system", "content": "{}"}},
            {{"role": "user", "content": "{}"}}
        ]}}"#,
        system.replace('"', "\\\""),
        user.replace('"', "\\\"")
    )
}
```

### 8.3 Grammaire GBNF pour appreciations

```
# grammars/appreciation.gbnf
# Grammaire GBNF contraignant la sortie du LLM
# au format JSON structure pour la table appreciations

root ::= "{" ws
  "\"table\"" ws ":" ws "\"appreciations\"" ws "," ws
  "\"row\"" ws ":" ws row ws
"}"

row ::= "{" ws
  "\"domaine\"" ws ":" ws string ws "," ws
  "\"niveau\"" ws ":" ws niveau ws "," ws
  "\"observations\"" ws ":" ws string ws
"}"

niveau ::= "\"maitrise\"" | "\"en_cours_acquisition\"" | "\"debut\""

string ::= "\"" characters "\""
characters ::= character*
character ::= [^"\\] | "\\" escape
escape ::= "\"" | "\\" | "/" | "n" | "r" | "t"

ws ::= [ \t\n]*
```

### 8.4 Execution du prepared statement

```rust
// src-tauri/src/validation/executor.rs

pub async fn execute_validated_insert(
    db: &Database,
    insert: ValidatedInsert,
) -> Result<(), ExecutionError> {
    match insert.table.as_str() {
        "appreciations" => {
            let domaine = insert.data.get("domaine")
                .and_then(|v| v.as_str())
                .ok_or(ExecutionError::MissingField("domaine"))?;
            let niveau = insert.data.get("niveau")
                .and_then(|v| v.as_str())
                .ok_or(ExecutionError::MissingField("niveau"))?;
            let observations = insert.data.get("observations")
                .and_then(|v| v.as_str())
                .unwrap_or("");

            // Resoudre domaine_id depuis le nom
            let domaine_rows = db.select::<Vec<IdRow>>(
                "SELECT id FROM domaines_apprentissage WHERE nom = $1 AND actif = 1",
                &[domaine],
            ).await?;
            let domaine_id = domaine_rows.first()
                .ok_or(ExecutionError::UnknownDomaine(domaine.to_string()))?
                .id;

            db.execute(
                "INSERT INTO appreciations (eleve_id, periode_id, domaine_id, date_evaluation, niveau, observations) \
                 VALUES ($1, $2, $3, DATE('now', 'localtime'), $4, $5)",
                &[
                    &insert.student_id,
                    &insert.period_id,
                    &domaine_id,
                    &niveau,
                    &observations,
                ],
            ).await?;

            Ok(())
        },
        "comportement_detail" => {
            // Logique similaire pour les incidents
            // ...
            Ok(())
        },
        _ => Err(ExecutionError::UnsupportedTable(insert.table)),
    }
}
```

**Ref PRD :** FR40 (structuration automatique), FR41 (validation avant insertion), FR48 (JSON pas SQL), FR49 (validateur Rust), NFR6 (< 5 sec structuration), NFR10 (4 couches validation), NFR11 (> 95% INSERT valides)

---

## 9. Gestion des modeles

### 9.1 Premier lancement

```
PREMIER LANCEMENT
+------------------------------------------------------------------+
|                                                                    |
|   Configuration initiale                                           |
|                                                                    |
|   Pour utiliser la dictee vocale, des modeles IA                   |
|   doivent etre installes (~1.5 Go).                                |
|                                                                    |
|   Les Modules 1 et 2 sont utilisables immediatement               |
|   sans les modeles.                                                |
|                                                                    |
|   +----------------------------------------------+                 |
|   |  [ Telecharger depuis internet ]              |                 |
|   +----------------------------------------------+                 |
|                                                                    |
|   +----------------------------------------------+                 |
|   |  [ Installer depuis un dossier local (USB) ]  |                 |
|   +----------------------------------------------+                 |
|                                                                    |
|   +----------------------------------------------+                 |
|   |  [ Continuer sans modeles ]                    |                 |
|   +----------------------------------------------+                 |
|                                                                    |
+------------------------------------------------------------------+

TELECHARGEMENT EN COURS
+------------------------------------------------------------------+
|                                                                    |
|   Installation des modeles IA                                      |
|                                                                    |
|   1/2 Whisper small FR (480 Mo)                                    |
|   [=========================>           ] 65%  312 Mo / 480 Mo     |
|                                                                    |
|   2/2 Qwen 2.5 Coder 1.5B (980 Mo)                                |
|   [ en attente ]                                                   |
|                                                                    |
|   Temps estime : ~5 minutes                                        |
|                                                                    |
|   [Annuler]                                                        |
|                                                                    |
+------------------------------------------------------------------+
```

### 9.2 Stockage des modeles

```
{app_data_dir}/                           # Tauri app_data_dir()
+-- comportement.db                        # Base SQLite
+-- models/                                # Repertoire modeles IA
|   +-- whisper-small-fr-q4.gguf          # ~480 Mo
|   +-- qwen25-coder-1.5b-q4.gguf        # ~980 Mo
+-- config.json                            # Settings utilisateur
```

**Chemins par OS :**
- Windows : `%APPDATA%/fr.comportement.app/`
- macOS : `~/Library/Application Support/fr.comportement.app/`

### 9.3 Verification SHA256

```rust
// src-tauri/src/commands/models.rs

use sha2::{Sha256, Digest};
use std::fs::File;
use std::io::Read;

const MODELS: &[(&str, &str, &str)] = &[
    (
        "whisper-small-fr-q4.gguf",
        "https://huggingface.co/ggml-org/whisper-small/resolve/main/ggml-small-q4_0.bin",
        "CHECKSUM_A_REMPLIR"  // SHA256 du fichier GGUF
    ),
    (
        "qwen25-coder-1.5b-q4.gguf",
        "https://huggingface.co/Qwen/Qwen2.5-Coder-1.5B-Instruct-GGUF/resolve/main/qwen2.5-coder-1.5b-instruct-q4_k_m.gguf",
        "CHECKSUM_A_REMPLIR"
    ),
];

pub fn verify_model_sha256(path: &str, expected: &str) -> Result<bool, std::io::Error> {
    let mut file = File::open(path)?;
    let mut hasher = Sha256::new();
    let mut buffer = [0u8; 8192];
    loop {
        let n = file.read(&mut buffer)?;
        if n == 0 { break; }
        hasher.update(&buffer[..n]);
    }
    let hash = hex::encode(hasher.finalize());
    Ok(hash == expected)
}
```

### 9.4 Fallback USB

Si le proxy de l'ecole bloque Hugging Face, l'enseignant peut copier manuellement les fichiers GGUF depuis une cle USB vers le dossier `models/`. L'application detecte les fichiers presents et verifie leur integrite SHA256.

**Ref PRD :** FR51 (ecran telechargement), FR52 (stockage app_data_dir), FR53 (installation USB)

---

## 10. Gestion de l'etat (State Management)

### 10.1 Stores Zustand

L'architecture V2 etend le pattern V1 (un seul store) vers une architecture multi-store avec un store par module.

```
+------------------------------------------------------------------+
|  STORES ZUSTAND                                                    |
|                                                                    |
|  +--- studentStore.ts (Module 1 - existant V1, etendu) ---------+ |
|  | students[], isLoading, error                                   | |
|  | loadStudents(), addWarning(), addSanction(), toggleAbsence()   | |
|  | triggerDailyRewards(), exportToJSON()                          | |
|  +---------------------------------------------------------------+ |
|                                                                    |
|  +--- incidentStore.ts (Module 2 - V2 nouveau) -----------------+ |
|  | incidents[], selectedStudent, selectedPeriod                    | |
|  | loadIncidents(studentId, periodId)                             | |
|  | addIncident(data), updateIncident(id, data), deleteIncident(id)| |
|  +---------------------------------------------------------------+ |
|                                                                    |
|  +--- appreciationStore.ts (Module 3 - V2 nouveau) -------------+ |
|  | appreciations[], domaines[], transcriptionText                  | |
|  | loadAppreciations(studentId, periodId)                         | |
|  | addAppreciation(data), updateAppreciation(id, data)            | |
|  | setTranscriptionText(text)                                     | |
|  +---------------------------------------------------------------+ |
|                                                                    |
|  +--- configStore.ts (V2 nouveau) ------------------------------+ |
|  | periodes[], currentPeriod, anneeScolaire                       | |
|  | loadPeriodes(), savePeriodes(data), getCurrentPeriod()          | |
|  +---------------------------------------------------------------+ |
|                                                                    |
|  +--- aiStore.ts (V2 nouveau) ----------------------------------+ |
|  | modelsReady, whisperStatus, llamaStatus                        | |
|  | downloadProgress: { model, percent, bytes }                    | |
|  | checkModels(), downloadModels(), installFromLocal(path)         | |
|  +---------------------------------------------------------------+ |
+------------------------------------------------------------------+
```

### 10.2 Convention pattern (conservee de V1)

```typescript
// Pattern try/catch systematique pour toutes les actions async
actionName: async (params: ParamType) => {
    try {
        set({ isLoading: true, error: null });
        const db = await getDb();
        await db.execute('...', [params]);
        await get().loadData(); // Refresh apres mutation
    } catch (error) {
        console.error('Error:', error);
        set({ error: String(error) });
    } finally {
        set({ isLoading: false });
    }
}
```

### 10.3 Types V2

```typescript
// src/shared/types/v2.ts

export interface Periode {
    id: number;
    anneeScolaire: string;
    typePeriode: 'trimestre' | 'semestre';
    numero: number;
    dateDebut: string;  // YYYY-MM-DD
    dateFin: string;    // YYYY-MM-DD
    nomAffichage: string | null;
}

export interface Incident {
    id: number;
    eleveId: number;
    dateIncident: string;
    heureIncident: string | null;
    periodeId: number | null;
    typeEvenement: string;
    motif: string;
    description: string | null;
    intervenant: string;
    createdAt: string;
}

export type NiveauApprentissage = 'maitrise' | 'en_cours_acquisition' | 'debut';

export interface Appreciation {
    id: number;
    eleveId: number;
    periodeId: number;
    domaineId: number;
    domaineName?: string;  // JOIN pour affichage
    dateEvaluation: string | null;
    niveau: NiveauApprentissage | null;
    observations: string | null;
    texteDictation: string | null;
    createdAt: string;
}

export interface Domaine {
    id: number;
    nom: string;
    ordreAffichage: number;
    actif: boolean;
}

export type SidecarStatus = 'idle' | 'starting' | 'ready' | 'error' | 'stopping';

export interface AiState {
    modelsReady: boolean;
    whisperStatus: SidecarStatus;
    llamaStatus: SidecarStatus;
    downloadProgress: {
        model: string;
        percent: number;
        bytesDownloaded: number;
        bytesTotal: number;
    } | null;
}
```

**Ref PRD :** FR54 (periodes configurables), FR31-FR36 (incidents Module 2), FR38-FR44 (appreciations Module 3)

---

## 11. Architecture de deploiement

### 11.1 Mode portable (conserve de V1)

L'application est distribuee en fichier unique sans installateur, conformement au choix V1 qui a fait ses preuves en production.

```
Distribution V2:
+-- comportement-v2.exe           # Windows (~60-80 Mo avec sidecars)
    |
    +-- Au premier lancement, cree:
        +-- %APPDATA%/fr.comportement.app/
            +-- comportement.db        # SQLite
            +-- models/
            |   +-- whisper-small-fr-q4.gguf    # 480 Mo (telecharge)
            |   +-- qwen25-coder-1.5b-q4.gguf   # 980 Mo (telecharge)
            +-- config.json
```

### 11.2 Bundling sidecars

Les binaires pre-compiles de whisper-server et llama-server sont inclus dans le bundle via `externalBin` de Tauri. Chaque binaire est suffixe avec le target triple :

| Plateforme | Suffix binaire | Notes |
|------------|---------------|-------|
| Windows x64 | `-x86_64-pc-windows-msvc.exe` | AVX2 requis (CPU 2013+) |
| macOS ARM | `-aarch64-apple-darwin` | Metal GPU support natif |
| macOS Intel | `-x86_64-apple-darwin` | Fallback pour vieux Mac |

### 11.3 Capabilities V2 (permissions Tauri)

```json
{
  "identifier": "default",
  "windows": ["main"],
  "permissions": [
    "core:default",
    "sql:default",
    "sql:allow-load",
    "sql:allow-execute",
    "sql:allow-select",
    "sql:allow-close",
    "global-shortcut:default",
    "global-shortcut:allow-is-registered",
    "global-shortcut:allow-register",
    "global-shortcut:allow-unregister",
    "autostart:default",
    "autostart:allow-enable",
    "autostart:allow-disable",
    "autostart:allow-is-enabled",
    "shell:allow-spawn",
    "shell:allow-kill",
    "shell:allow-stdin-write",
    "shell:allow-open"
  ]
}
```

**Ref PRD :** NFR14 (mode portable), NFR15 (< 2 Go distribution), NFR17 (cross-platform)

---

## 12. Strategie de migration V1 vers V2

### 12.1 Phases de migration

```
PHASE 1: RESTRUCTURATION MODULAIRE (sans casser V1)
+------------------------------------------------------------------+
| - Deplacer code V1 vers modules/comportement-classe/              |
| - Creer shared/ (types, db, utils communs)                        |
| - Ajouter navigation laterale (Sidebar)                           |
| - V1 continue de fonctionner normalement                          |
| Fichiers: src/modules/, src/shared/, App.tsx                       |
+------------------------------------------------------------------+
         |
         v
PHASE 2: NOUVELLES TABLES SQLite (migrations)
+------------------------------------------------------------------+
| - Ajouter migrations 5-9 dans lib.rs                              |
| - Creer configStore.ts (periodes)                                 |
| - Creer incidentStore.ts (Module 2)                               |
| - Creer appreciationStore.ts (Module 3 sans IA)                   |
| - Saisie manuelle Module 3 fonctionnelle                          |
| Fichiers: lib.rs, stores/*.ts, modules/*/                          |
+------------------------------------------------------------------+
         |
         v
PHASE 3: SIDECARS IA
+------------------------------------------------------------------+
| - Implementer SidecarManager Rust                                  |
| - Integrer whisper-server (pipeline audio)                        |
| - Integrer llama-server (pipeline LLM)                            |
| - Validateur Rust + grammaire GBNF                                |
| - Ecran telechargement modeles                                    |
| Fichiers: src-tauri/src/sidecar/, src-tauri/src/validation/        |
|           src-tauri/src/commands/, binaries/, grammars/             |
+------------------------------------------------------------------+
```

### 12.2 Retrocompatibilite

| Aspect | Garantie |
|--------|----------|
| Donnees V1 | Intactes, aucune modification des tables existantes |
| Schema SQLite | Migrations additives uniquement (CREATE TABLE, pas ALTER) |
| studentStore.ts | Etendu (nouvelles methodes), jamais modifie de maniere destructrice |
| Composants V1 | Deplaces vers `modules/comportement-classe/`, API inchangee |
| Settings existants | Conserves dans `settings` (SQLite), etendus pour V2 |

---

## 13. Mitigations des risques

| # | Risque | Probabilite | Impact | Mitigation | Ref |
|---|--------|-------------|--------|------------|-----|
| R1 | **RAM insuffisante PC ecole (4 Go)** | Haute | Critique | Pipeline sequentiel obligatoire (ADR-002) : un seul sidecar actif. Reduire ctx-size LLM a 512 tokens. Fallback: Whisper tiny (~273 Mo) | NFR16 |
| R2 | **Proxy ecole bloque Hugging Face** | Haute | Haut | Solution USB (FR53) : documentation + bouton "Installer depuis dossier local" | FR53 |
| R3 | **whisper-server instable Windows (handle leak)** | Haute | Moyen | Watchdog obligatoire (ADR-004) : restart auto apres reponse vide ou ~50 requetes. Pinner version >= v1.8.1 | FR45 |
| R4 | **Qwen genere du JSON invalide** | Moyenne | Haut | Grammaire GBNF (ADR-001) + validateur Rust 4 couches + fallback saisie manuelle (FR43) | NFR11 |
| R5 | **Whisper hallucine sur francais oral (accents)** | Moyenne | Moyen | VAD natif filtre silences + post-correction manuelle par l'enseignant + noms eleves en contexte | FR39 |
| R6 | **Performance CPU insuffisante transcription** | Moyenne | Haut | Tester sur hardware reel tot (Sprint 2). Fallback: Whisper tiny + beam_size=1 (greedy) | NFR5 |
| R7 | **SmartScreen bloque l'exe Windows** | Moyenne | Moyen | Mode portable sans installateur (pattern V1 eprouve). Documentation admin IT pour exception | NFR14 |
| R8 | **tauri-plugin-mic-recorder maintenance faible** | Moyenne | Moyen | Plan B: Web Audio API getUserMedia (ADR-005). Decider apres test build release | FR57 |
| R9 | **Mise a jour llama.cpp casse l'API** | Faible | Moyen | Figer la version des binaires sidecars. Tester avant toute upgrade | - |
| R10 | **Pas de projet reference identique** | Certaine | Moyen | Prevoir temps supplementaire integration. Tester chaque sidecar independamment | - |

---

## 14. ADR (Architecture Decision Records)

### ADR-001 : JSON output au lieu de SQL

| Champ | Valeur |
|-------|--------|
| **Statut** | Accepte |
| **Date** | 2026-02-10 |
| **Contexte** | Le LLM doit inserer des donnees dans SQLite. L'approche initiale (briefing V2) etait de generer du SQL INSERT directement. |
| **Decision** | Le LLM genere du JSON structure `{ "table": "...", "row": { ... } }`. Rust parse le JSON, valide et reconstruit l'INSERT avec prepared statements. |
| **Justification** | L'etude P2SQL (arxiv 2308.01990) montre que meme les restrictions prompt sont contournables pour du SQL. Microsoft recommande des gardes deterministes. Avec JSON, le LLM n'a jamais connaissance de la syntaxe SQL, et injection devient impossible (prepared statements). La grammaire GBNF est plus simple pour du JSON que pour du SQL. |
| **Consequences** | - Le LLM ne genere jamais de SQL -> securite maximale<br>- GBNF simplifie (JSON schema vs SQL grammar)<br>- Couche Rust supplementaire (parsing + construction INSERT)<br>- Ref: Addendum Perplexity correction #3 |
| **Ref PRD** | FR48, FR49, NFR10, NFR11 |

### ADR-002 : Pipeline sequentiel (RAM 4 Go)

| Champ | Valeur |
|-------|--------|
| **Statut** | Accepte |
| **Date** | 2026-02-10 |
| **Contexte** | Les deux sidecars consomment ~852 Mo (Whisper) + ~2 Go (Qwen) = ~3.5 Go concurrent, incompatible avec un PC ecole 4 Go RAM. |
| **Decision** | Pipeline strictement sequentiel : Whisper demarre, transcrit, s'arrete, puis llama-server demarre, structure, s'arrete. Jamais les deux actifs simultanement. |
| **Justification** | La RAM corrigee par Perplexity montre que le mode concurrent n'est viable que sur 8 Go+. Le mode sequentiel garde le pic RAM sous 2 Go (un seul sidecar actif). L'enseignant ne dicte et structure jamais en parallele. |
| **Consequences** | - Temps pipeline total ~15 sec (acceptable, ref NFR7)<br>- Temps de transition ~3-5 sec (chargement modele)<br>- Mode concurrent optionnel si PC 8 Go+ detecte (V2.1) |
| **Ref PRD** | FR47, NFR16 |

### ADR-003 : VAD natif whisper.cpp (simplicite)

| Champ | Valeur |
|-------|--------|
| **Statut** | Accepte |
| **Date** | 2026-02-10 |
| **Contexte** | La recherche initiale proposait Silero VAD via ONNX Runtime C++ separe. La revue Perplexity a revele que whisper.cpp integre nativement Silero VAD depuis v1.8+. |
| **Decision** | Utiliser le flag `--vad` de whisper-server (modele VAD ggml integre) au lieu d'une integration ONNX separee. |
| **Justification** | Integration native = moins de dependances, moins de risques d'incompatibilite ABI, deja teste cross-platform. ONNX Runtime C++ a des problemes connus de chemins Unicode Windows. |
| **Consequences** | - Simplification de l'architecture (pas de binaire ONNX)<br>- Dependance au flag --vad de whisper.cpp (>= v1.8)<br>- Reduction des hallucinations sur silences<br>- Ref: Addendum Perplexity correction #8 |
| **Ref PRD** | FR50 |

### ADR-004 : Watchdog whisper-server (stabilite Windows)

| Champ | Valeur |
|-------|--------|
| **Statut** | Accepte |
| **Date** | 2026-02-10 |
| **Contexte** | Bug ouvert whisper.cpp issue #3358 : fuite de handles Windows, transcriptions vides apres ~6-7 requetes consecutives. |
| **Decision** | Implementer un watchdog dans le SidecarManager : healthcheck HTTP + restart automatique apres reponse vide ou ~50 requetes. Pinner version >= v1.8.1 (fix memory leak VAD). |
| **Justification** | Le bug est confirme par la communaute et non encore corrige upstream. Le watchdog est la mitigation recommandee. Le recyclage proactif toutes les ~50 requetes previent les fuites avant qu'elles ne causent des erreurs. |
| **Consequences** | - Complexite SidecarManager accrue (healthcheck + compteur)<br>- Latence potentielle lors du recyclage (~3-5 sec)<br>- Fallback whisper-cli si serveur trop instable<br>- Ref: Addendum Perplexity correction #2 |
| **Ref PRD** | FR45, NFR22 |

### ADR-005 : tauri-plugin-mic-recorder avec fallback Web Audio

| Champ | Valeur |
|-------|--------|
| **Statut** | Accepte |
| **Date** | 2026-02-10 |
| **Contexte** | tauri-plugin-mic-recorder est le plugin le plus simple pour la capture audio, mais sa maintenance est faible (derniere activite mars 2025, docs.rs build echoue). |
| **Decision** | Plan A : tauri-plugin-mic-recorder pour la simplicite. Plan B (fallback) : Web Audio API (`navigator.mediaDevices.getUserMedia()`) si le plugin est instable en build release signe. Decider apres test "prod-like" sur Windows + macOS. |
| **Justification** | Le plugin est la solution la plus simple (output WAV direct). Le Web Audio API est un standard fiable mais necessite plus de code (conversion PCM, ecriture fichier). Tester les deux avant de figer le choix. |
| **Consequences** | - Hook `useAudioRecorder.ts` abstrait la source audio derriere une interface commune<br>- Test obligatoire en build release sur Windows avant Sprint 3<br>- Ref: Addendum Perplexity correction #9 |
| **Ref PRD** | FR57 |

### ADR-006 : Qwen 2.5 Coder 1.5B (pas Qwen3 pour V2.0)

| Champ | Valeur |
|-------|--------|
| **Statut** | Accepte |
| **Date** | 2026-02-10 |
| **Contexte** | Qwen3 existe en petits modeles (1.7B, 4B) avec de meilleurs benchmarks, mais le chat template et le thinking mode sont encore instables. Qwen3 4B Q4_K_M pese ~2.7 Go. |
| **Decision** | Rester sur Qwen 2.5 Coder 1.5B (GGUF Q4_K_M, ~980 Mo) pour la V2.0. Evaluer Qwen3 4B en V2.1 apres stabilisation. |
| **Justification** | Qwen 2.5 Coder 1.5B est specialise code/JSON, stable en GGUF, et de taille raisonnable pour CPU. Qwen3 4B est plus lourd (~2.7 Go vs ~980 Mo) et son chat template est encore instable dans llama.cpp. Le risque de regression sur un modele non teste ne vaut pas le gain potentiel pour la V2.0. |
| **Consequences** | - Modele stable et documente pour la V2.0<br>- Taille raisonnable pour distribution (~980 Mo)<br>- Upgrade vers Qwen3 planifie pour V2.1 si gains confirmes |
| **Ref PRD** | Out of Scope (Qwen3 -> V2.1) |

---

## Annexe : Mapping FR/NFR vers composants architecture

### Functional Requirements

| FR | Description | Composant(s) architecture |
|----|-------------|---------------------------|
| FR1-FR5 | Gestion eleves CRUD | `studentStore.ts`, `modules/comportement-classe/` |
| FR6-FR9 | Systeme avertissements | `studentStore.ts`, `StudentGridCard.tsx` |
| FR10-FR15 | Systeme sanctions + motifs | `studentStore.ts`, `SanctionReasonModal.tsx` |
| FR16-FR18 | Gestion absences | `studentStore.ts`, `StudentGridCard.tsx` |
| FR19-FR21 | Systeme recompenses | `studentStore.ts`, `WeeklyRewardLine.tsx`, `App.tsx` (scheduler) |
| FR22-FR24 | Interface cartes + TBI | `StudentGrid.tsx`, `TBIView.tsx` |
| FR25-FR26 | Historique + export | `WeeklySummary.tsx`, `ExportButton.tsx`, `studentStore.ts` |
| FR27-FR30 | Integration systeme | `lib.rs` (tray, shortcut, autostart) |
| FR31-FR36 | Module 2 incidents | `incidentStore.ts`, `modules/comportement-individuel/` |
| FR37 | Dictee incident (optionnel) | `useTranscription.ts`, pipeline Whisper |
| FR38-FR44 | Module 3 apprentissage | `appreciationStore.ts`, `modules/apprentissage/` |
| FR45 | whisper-server a la demande | `sidecar/whisper.rs`, `sidecar/manager.rs` |
| FR46 | llama-server a la demande | `sidecar/llama.rs`, `sidecar/manager.rs` |
| FR47 | Pipeline sequentiel | `sidecar/manager.rs` (mode exclusif) |
| FR48 | JSON output (pas SQL) | `grammars/*.gbnf`, `commands/structuration.rs` |
| FR49 | Validateur Rust 4 couches | `validation/validator.rs`, `validation/executor.rs` |
| FR50 | VAD natif whisper.cpp | `sidecar/whisper.rs` (flag --vad) |
| FR51-FR53 | Gestion modeles | `commands/models.rs`, `ModelSetupScreen.tsx`, `aiStore.ts` |
| FR54 | Config periodes | `configStore.ts`, `Settings.tsx`, migration 5 |
| FR55-FR56 | Navigation + config | `Sidebar.tsx`, `App.tsx` (routage modules) |
| FR57 | Capture audio | `useAudioRecorder.ts` (plugin ou Web Audio) |

### Non-Functional Requirements

| NFR | Description | Composant(s) architecture |
|-----|-------------|---------------------------|
| NFR1-NFR4 | Performance actions/lancement | SQLite local + Zustand reactif + Tauri natif |
| NFR5-NFR6 | Temps pipeline IA | `sidecar/manager.rs` (sequentiel < 15 sec) |
| NFR7 | Pipeline total < 15 sec | Whisper ~5s + transition ~5s + LLM ~5s |
| NFR8 | Recompenses < 1 sec | `studentStore.ts` (batch SQL) |
| NFR9-NFR12 | Securite RGPD | Zero-network, validateur Rust, prepared statements |
| NFR13 | PC ecole 4 Go RAM | Pipeline sequentiel (ADR-002) |
| NFR14 | Mode portable .exe | `tauri.conf.json` (bundle), pas d'installateur |
| NFR15 | < 2 Go distribution | ~1.5 Go (exe ~60 Mo + modeles ~1.46 Go) |
| NFR16 | RAM pic < 2 Go sequentiel | Un seul sidecar actif (ADR-002) |
| NFR17 | Cross-platform | Binaires suffixes target triple |
| NFR18-NFR22 | Fiabilite | SQLite WAL, scheduler Rust, watchdog whisper |
| NFR23-NFR27 | Accessibilite TBI | Tailwind tokens couleurs, tailles, contraste WCAG AA |

---

**Document genere le :** 2026-02-10
**Prochain livrable :** Epics & Stories V2 (`epics-v2.md`)
