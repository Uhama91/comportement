---
stepsCompleted: [1, 2, 3, 4, 5, 6]
perplexity_review: '2026-02-10'
inputDocuments: ["suivi-comportement-briefing-complet.md"]
workflowType: 'research'
lastStep: 1
research_type: 'technical'
research_topic: 'Integration IA locale dans Tauri v2 - Whisper.cpp STT + Qwen 2.5 LLM en sidecars'
research_goals: 'Faisabilite technique et strategie implementation pour app desktop suivi eleve avec IA locale 100% offline'
user_name: 'Uhama'
date: '2026-02-10'
web_research_enabled: true
source_verification: true
---

# IA Locale dans Tauri v2 : Recherche Technique Complete pour le Suivi Eleve

**Date :** 2026-02-10
**Auteur :** Uhama
**Type :** Recherche Technique
**Projet :** Comportement V2 — Application desktop suivi eleve avec IA locale

---

## Executive Summary

Cette recherche technique valide la faisabilite de l'integration d'IA locale (Speech-to-Text + LLM) dans une application Tauri v2 desktop pour le suivi des eleves en ecole elementaire. L'architecture proposee — Whisper.cpp pour la transcription vocale et Qwen 2.5 Coder 1.5B pour la structuration automatique des donnees — est realisable sur du materiel standard (CPU, 2-3 Go RAM, pas de GPU) avec une empreinte disque de ~1.5 Go.

Les principaux findings confirment que :
- **Le pattern est mature** : Plusieurs projets de reference (2025-2026) utilisent exactement cette architecture Tauri + Whisper + LLM local
- **La securite est assurable** : Les grammaires GBNF de llama.cpp permettent un controle deterministe de la sortie LLM au niveau token, rendant le pattern LLM-as-DB-Interface viable avec une defense en 4 couches
- **Les binaires sont disponibles** : Whisper.cpp et llama.cpp fournissent des releases pre-compilees pour Windows et macOS
- **Le risque principal est operationnel** : Les proxys d'ecole pourraient bloquer le telechargement des modeles GGUF → solution USB a prevoir

**Recommandations cles :**
1. Conserver la stack V1 (Tauri + React + SQLite + Zustand) et etendre incrementalement
2. Utiliser la grammaire GBNF comme pierre angulaire de securite LLM
3. Tester sur hardware reel (PC ecole) des le Sprint 2
4. Prevoir une solution USB pour l'installation des modeles

---

## Table des Matieres

1. [Technical Research Scope Confirmation](#technical-research-scope-confirmation)
2. [Technology Stack Analysis](#technology-stack-analysis)
   - Tauri v2, Whisper.cpp, Silero VAD, llama.cpp, Qwen 2.5 Coder
   - Capture Audio, Gestion Modeles GGUF
3. [Integration Patterns Analysis](#integration-patterns-analysis)
   - Tauri IPC, Sidecar Whisper, Sidecar llama-server
   - Pipeline Audio, Pipeline LLM, Securite LLM-as-DB
4. [Architectural Patterns and Design](#architectural-patterns-and-design)
   - Multi-Process Desktop, Local-First AI Pipeline
   - Architecture Modulaire, Data Architecture SQLite
   - Model Management, Securite RGPD, Deployment Portable
5. [Implementation Approaches](#implementation-approaches-and-technology-adoption)
   - Migration V1→V2, Sourcing Binaires, Testing
   - Risk Assessment, Implementation Roadmap
6. [Technical Research Recommendations](#technical-research-recommendations)
7. [Conclusion](#conclusion-de-la-recherche-technique)

---

## Research Overview

Recherche technique sur l'integration d'IA locale (Whisper.cpp pour Speech-to-Text + Qwen 2.5 Coder pour structuration JSON/SQL) dans une application Tauri v2 desktop, destinee au suivi des eleves en ecole elementaire. L'application doit fonctionner 100% offline, sans GPU, sur des PC d'ecole standard.

---

## Technical Research Scope Confirmation

**Research Topic:** Integration IA locale dans Tauri v2 - Whisper.cpp STT + Qwen 2.5 LLM en sidecars
**Research Goals:** Faisabilite technique et strategie implementation pour app desktop suivi eleve avec IA locale 100% offline

**Technical Research Scope:**

- Architecture Analysis - sidecars Tauri v2, communication IPC, cycle de vie processus
- Implementation Approaches - capture audio, streaming STT, prompt contraint LLM, validation Rust
- Technology Stack - Whisper.cpp small FR GGUF, llama.cpp serveur, Qwen 2.5 Coder 1.5B, Silero VAD
- Integration Patterns - API REST localhost, gestion modeles GGUF, premier lancement
- Performance Considerations - CPU standard, RAM 2-3 Go, temps reponse STT <3s, LLM <5s

**Research Methodology:**

- Current web data with rigorous source verification
- Multi-source validation for critical technical claims
- Confidence level framework for uncertain information
- Comprehensive technical coverage with architecture-specific insights

**Scope Confirmed:** 2026-02-10

---

## Technology Stack Analysis

### Tauri v2 — Framework Desktop et Gestion des Sidecars

**Version actuelle :** Tauri 2.x stable (2025-2026)
**Plugin clé :** `@tauri-apps/plugin-shell` (Rust >= 1.77.2)

Tauri v2 supporte nativement l'embedding de binaires externes (sidecars) via la propriété `externalBin` dans `tauri.conf.json`. Chaque binaire doit être suffixé avec le target triple de la plateforme (ex: `whisper-x86_64-pc-windows-msvc.exe`, `whisper-aarch64-apple-darwin`). Le plugin Shell permet de spawner les processus enfants avec gestion des événements `close` et `error`, et méthode `kill()` pour arrêt.

**Lifecycle management :** Tauri n'a pas encore de plugin officiel de gestion du cycle de vie des sidecars (issue [#3062](https://github.com/tauri-apps/plugins-workspace/issues/3062) ouverte). Un plugin communautaire [`tauri-sidecar-manager`](https://github.com/radical-data/tauri-sidecar-manager) existe pour le spawning, monitoring, health checks, auto-restart et graceful shutdown. Pour notre cas, un wrapper Rust custom sera probablement nécessaire.

**Permissions :** Le système de capabilities Tauri v2 requiert une configuration explicite dans `capabilities/default.json` pour autoriser `execute` ou `spawn` sur les sidecars.

_Sources : [Tauri Sidecar Docs](https://v2.tauri.app/develop/sidecar/), [Shell Plugin](https://v2.tauri.app/plugin/shell/), [Sidecar Manager](https://github.com/radical-data/tauri-sidecar-manager)_

### Whisper.cpp — Speech-to-Text Local

**Repo :** [ggml-org/whisper.cpp](https://github.com/ggml-org/whisper.cpp)
**License :** MIT

Port C/C++ du modèle Whisper d'OpenAI, optimisé pour l'inférence CPU sans dépendances externes. Supporte les modèles au format GGUF quantifiés.

**Modèle recommandé pour le français :**
- `whisper-small` (Q4_K_M) : ~480 Mo, bon compromis précision/vitesse
- Real-Time Factor ~0.6 (transcrit plus vite que le temps réel) [High Confidence]
- Un modèle distillé français existe : [`whisper-large-v3-distil-fr`](https://huggingface.co/bofenghuang/whisper-large-v3-distil-fr-v0.2) mais plus lourd (~1.5 Go)
- Performance WER (Word Error Rate) spécifique au français small : données limitées dans les sources publiques [Medium Confidence]

**Intégration Tauri :** Le binaire `whisper-cli` ou `whisper-server` peut être embarqué comme sidecar. L'audio est envoyé via stdin ou fichier WAV temporaire.

_Sources : [whisper.cpp GitHub](https://github.com/ggml-org/whisper.cpp), [Whisper French Distil](https://huggingface.co/bofenghuang/whisper-large-v3-distil-fr-v0.2), [Benchmarks](https://openbenchmarking.org/test/pts/whisper-cpp)_

### Silero VAD — Detection d'Activite Vocale

**Repo :** [snakers4/silero-vad](https://github.com/snakers4/silero-vad)
**License :** MIT | **Taille modele :** ~1 Mo

Detecteur d'activite vocale pre-entraine, compatible avec 6000+ langues. Zero telemetrie, zero inscription.

**Integration avec Whisper.cpp :** Les samples audio passent d'abord par Silero VAD qui detecte les segments de parole. Seuls ces segments sont envoyes a Whisper pour transcription. Benefices :
- Reduction significative du temps de traitement
- Evite les hallucinations du modele sur les silences
- Latence end-to-end 380-520ms avec 95e percentile de precision [High Confidence]
- Amelioration de vitesse ~4x vs Whisper vanilla

**Implementation C++ :** [`silero_vad_cpp`](https://github.com/WiseSync/silero_vad_cpp) utilise ONNX Runtime C++ pour l'inference du modele VAD.

_Sources : [Silero VAD GitHub](https://github.com/snakers4/silero-vad), [whisper_vad](https://github.com/gumblex/whisper_vad), [WhisperX + Silero](https://medium.com/@aidenkoh/how-to-implement-high-speed-voice-recognition-in-chatbot-systems-with-whisperx-silero-vad-cdd45ea30904)_

### llama.cpp — Serveur LLM Local

**Repo :** [ggml-org/llama.cpp](https://github.com/ggml-org/llama.cpp)
**License :** MIT

Moteur d'inference LLM en C/C++ avec mode serveur HTTP integre (`llama-server`). Ecoute par defaut sur `localhost:8080` avec API compatible OpenAI.

**Fonctionnalites cles :**
- API REST compatible OpenAI (completions, chat)
- Support GGUF natif avec quantification (Q4_K_M, Q5_K_M, etc.)
- Inference CPU optimisee (AVX2, ARM NEON)
- Mode serveur persistant (lance une fois, requetes multiples)

_Sources : [llama.cpp GitHub](https://github.com/ggml-org/llama.cpp), [Qwen llama.cpp docs](https://qwen.readthedocs.io/en/latest/run_locally/llama.cpp.html)_

### Qwen 2.5 Coder — Modele LLM pour Structuration JSON/SQL

**Modele cible :** Qwen2.5-Coder-1.5B-Instruct (GGUF Q4_K_M) : ~980 Mo
**Editeur :** Qwen Team (Alibaba)

**Pourquoi Qwen 2.5 Coder 1.5B :**
- Specialise code + donnees structurees (entraine sur 5.5 trillion tokens)
- Ameliorations significatives pour la generation JSON structuree [High Confidence]
- Multilingue, bon support du francais technique
- Taille raisonnable pour CPU (~980 Mo Q4)
- 6 tailles disponibles : 0.5B, 1.5B, 3B, 7B, 14B, 32B

**Alternative Qwen3 (fevrier 2026) :**
- [Qwen3-Coder-Next](https://github.com/QwenLM/Qwen3-Coder) : 80B params (3B actives), score SWE-Bench 70.6
- **MAIS** necessite ~46 Go VRAM ou 8 Go VRAM + 32 Go RAM → trop lourd pour PC ecole
- Qwen3 plus petits (1.7B, 4B) existent mais pas encore valides en GGUF pour notre cas
- **Recommandation : rester sur Qwen 2.5 Coder 1.5B** pour la V2 initiale, evaluer Qwen3 petits modeles plus tard [High Confidence]

_Sources : [Qwen2.5 Blog](https://qwenlm.github.io/blog/qwen2.5/), [Qwen2.5-Coder HuggingFace](https://huggingface.co/Qwen/Qwen2.5-Coder-7B-Instruct-GGUF), [Qwen3-Coder-Next](https://qwen.ai/blog?id=qwen3-coder-next)_

### Capture Audio — Web Audio API dans Tauri

**Approches identifiees :**

1. **tauri-plugin-mic-recorder** : Plugin Tauri v2 dedie, enregistre via microphone et sauvegarde en fichier. Solution la plus simple. [Source](https://crates.io/crates/tauri-plugin-mic-recorder)

2. **MediaRecorder API** : Standard Web, `navigator.mediaDevices.getUserMedia()` pour capturer le flux micro dans le webview. Utilise par les projets [wispr-tauri-voice-to-text](https://github.com/maneeshmkp/wispr-tauri-voice-to-text).

3. **Native PCM via Tauri Events** : Capture PCM brut cote Rust, streaming vers le frontend via events Tauri + AudioWorklet processor. Plus complexe mais plus de controle.

**Permissions plateforme :**
- macOS : `NSMicrophoneUsageDescription` dans `Info.plist`
- Windows : Pas de configuration speciale requise

**Recommandation :** `tauri-plugin-mic-recorder` pour la simplicite, fallback sur MediaRecorder API si besoin de plus de controle.

_Sources : [tauri-plugin-mic-recorder](https://github.com/ayangweb/tauri-plugin-mic-recorder), [MDN MediaStream Recording](https://developer.mozilla.org/en-US/docs/Web/API/MediaStream_Recording_API/Using_the_MediaStream_Recording_API)_

### Gestion des Modeles GGUF — Telechargement et Stockage

**Problematique :** Les modeles (~1.5 Go total) ne peuvent pas etre bundled dans l'executable. Ils doivent etre telecharges au premier lancement.

**Pattern identifie :**
- Premier lancement : detecter absence des modeles dans le repertoire local
- Telecharger depuis Hugging Face (huggingface-cli ou HTTP direct)
- Verifier integrite (SHA256)
- Stocker dans le repertoire app data local de l'OS
- Afficher progression dans l'UI

**Pas de standard Tauri** pour cette gestion → implementation custom necessaire en Rust (reqwest pour HTTP, indicateurs de progression via events Tauri).

**Outils de reference :** [GGUF Loader](https://github.com/GGUFloader/gguf-loader) offre un pattern similaire pour desktop, et [Jan.ai](https://www.jan.ai/docs/desktop/manage-models) gere le telechargement et stockage de modeles GGUF.

_Sources : [GGUF Loader](https://ggufloader.github.io/), [Jan.ai Model Management](https://www.jan.ai/docs/desktop/manage-models)_

### Tableau Recapitulatif — Stack Technique V2

| Composant | Technologie | Taille | RAM | Confiance |
|-----------|-------------|--------|-----|-----------|
| Framework Desktop | Tauri v2 (Rust + React/TS) | ~18 Mo exe | ~200 Mo | High |
| Speech-to-Text | Whisper.cpp (small FR GGUF Q4) | ~480 Mo modele | ~500 Mo actif | High |
| Voice Activity Detection | Silero VAD (ONNX C++) | ~1 Mo | negligeable | High |
| LLM Structuration | Qwen 2.5 Coder 1.5B (GGUF Q4) | ~980 Mo modele | ~1.2 Go actif | High |
| Serveur LLM | llama-server (llama.cpp) | ~25 Mo binaire | inclus dans LLM | High |
| Capture Audio | tauri-plugin-mic-recorder | inclus | negligeable | Medium |
| Base de donnees | SQLite (tauri-plugin-sql) | inclus | negligeable | High |
| **TOTAL** | | **~1.5 Go disque** | **~2 Go concurrent** | |

---

## Integration Patterns Analysis

### Pattern 1 : Tauri IPC — Frontend ↔ Rust Backend

**Protocole :** Asynchronous Message Passing via `invoke()` (JSON serialise)

Le frontend React appelle les commandes Rust via `invoke()` depuis `@tauri-apps/api/core`. Cote Rust, les fonctions annotees `#[tauri::command]` deserializent automatiquement les parametres (via Serde) et retournent des resultats JSON. Les commandes async s'executent sur un thread pool (`tauri::async_runtime::spawn()`) sans bloquer le thread principal.

**Communication bidirectionnelle :**
- Frontend → Rust : `invoke("command_name", { params })` → Promise
- Rust → Frontend : `app.emit("event_name", payload)` → Event listeners JS

**Transport :** Tauri v2 utilise un custom protocol handler (requetes HTTP-like sans reseau) avec fallback postMessage. Tous les parametres doivent implementer `serde::Deserialize`.

_Sources : [Calling Rust from Frontend](https://v2.tauri.app/develop/calling-rust/), [IPC Concept](https://v2.tauri.app/concept/inter-process-communication/), [Calling Frontend from Rust](https://v2.tauri.app/develop/calling-frontend/)_

### Pattern 2 : Sidecar Whisper.cpp — Deux Options d'Integration

**Option A : whisper-server (HTTP API) — RECOMMANDEE**

whisper.cpp fournit un serveur HTTP (`whisper-server`) avec endpoint `/inference` acceptant des requetes POST multipart (fichier audio + parametres). Supporte les requetes concurrentes et plusieurs formats de sortie.

- Avantage : Persistant, pas de redemarrage par requete, API REST standard
- Inconvenient : Consomme RAM en permanence (~500 Mo)

**Option B : whisper-cli (stdin/stdout pipe)**

Le CLI accepte un fichier WAV en entree et produit du texte sur stdout. Support recent du flag `-of -` pour sortie stdout (merge mai 2025). Integration via `Command::new_sidecar()` + `CommandEvent::Stdout`.

- Avantage : Pas de consommation RAM au repos
- Inconvenient : Temps de chargement modele a chaque invocation (~2-3s supplementaires)

**Recommandation :** whisper-server en mode persistant, demarre au lancement de l'app, arrete a la fermeture. Pour les PC avec peu de RAM, fallback sur whisper-cli a la demande. [High Confidence]

_Sources : [whisper.cpp HTTP Server](https://deepwiki.com/ggml-org/whisper.cpp/3.2-http-server), [whisper.cpp GitHub](https://github.com/ggml-org/whisper.cpp), [Tauri Sidecar stdin/stdout](https://medium.com/@samuelint/tauri-how-to-start-stop-a-sidecar-and-pipe-sidecar-stdout-stderr-to-app-logs-from-rust-8f81a92111ad)_

### Pattern 3 : Sidecar llama-server — API REST OpenAI-Compatible

**Endpoint principal :** `POST http://localhost:8080/v1/chat/completions`

llama-server expose une API compatible OpenAI. Pour la generation JSON structuree, deux approches :

**Approche A : response_format avec JSON Schema**
```json
{
  "messages": [...],
  "response_format": {
    "type": "json_schema",
    "json_schema": { "schema": { ... } }
  }
}
```
Note : Des bugs connus existent avec `response_format` vs `grammar` (issue [#11847](https://github.com/ggml-org/llama.cpp/issues/11847)). [Medium Confidence]

**Approche B : Grammaire GBNF (plus fiable)**

GBNF (GGML BNF) contraint la sortie au niveau du token. La grammaire guide la selection des tokens pendant l'inference, garantissant une structure valide. On peut definir une grammaire GBNF custom pour des INSERT SQL ou du JSON structure. Le script `json-schema-to-grammar.py` convertit un JSON Schema en grammaire GBNF.

- Avantage : Controle deterministe de la structure de sortie
- Le modele n'a pas visibilite sur le schema → decrire la structure explicitement dans le prompt

**Recommandation :** Grammaire GBNF pour contraindre la sortie + validation Rust en seconde couche. [High Confidence]

_Sources : [llama.cpp GBNF](https://github.com/ggml-org/llama.cpp/blob/master/grammars/README.md), [Constrained Decoding Guide](https://www.aidancooper.co.uk/constrained-decoding/), [json-schema-to-gbnf](https://github.com/adrienbrault/json-schema-to-gbnf)_

### Pattern 4 : Pipeline Audio Complet

```
[Microphone] → tauri-plugin-mic-recorder → fichier WAV temporaire
     ↓
[Frontend] → invoke("transcribe_audio", { path }) → Rust backend
     ↓
[Rust] → HTTP POST /inference → whisper-server (sidecar)
     ↓
[Silero VAD] → filtre segments parole → Whisper transcrit
     ↓
[Texte brut] → retour au Frontend via IPC
     ↓
[Frontend] → affichage texte, possibilite correction manuelle
```

**Format audio :** WAV PCM 16-bit, 16kHz mono (format natif Whisper)
**Latence estimee :** 2-4 secondes pour 10s d'audio sur CPU standard [Medium Confidence]

### Pattern 5 : Pipeline LLM Structuration

```
[Texte valide] → invoke("structure_observation", { text, student_id, period_id })
     ↓
[Rust Backend] → construit le prompt contraint avec contexte eleve
     ↓
[Rust] → POST /v1/chat/completions → llama-server (sidecar)
         + grammaire GBNF pour contrainte INSERT SQL
     ↓
[llama-server] → genere JSON/SQL structure contraint par GBNF
     ↓
[Rust Validator] → verifie :
  1. Action = INSERT uniquement (pas DELETE/UPDATE/DROP)
  2. Table autorisee (appreciations, comportement_classe, comportement_detail)
  3. eleve_id correspond a l'eleve selectionne
  4. periode_id correspond a la periode active
     ↓
[SQLite] → execution INSERT via tauri-plugin-sql
     ↓
[Frontend] → confirmation + affichage tableau mis a jour
```

### Pattern 6 : Securite LLM-as-DB-Interface — Defense en Profondeur

**Couche 1 : Prompt Contraint**
Le system prompt limite strictement le LLM aux operations INSERT sur les tables autorisees. Le modele ne voit jamais le schema complet de la BDD. [High Confidence]

**Couche 2 : Grammaire GBNF**
La sortie est contrainte au niveau token par une grammaire formelle. Le modele ne peut physiquement pas generer de syntaxe SQL non autorisee. [High Confidence]

**Couche 3 : Validation Rust**
Parsing et verification de chaque champ avant execution. Regex sur le type de requete, whitelist de tables, verification des IDs contextuels. [High Confidence]

**Couche 4 : Permissions Base de Donnees**
Le role SQLite utilise pour les operations LLM n'a que des droits INSERT sur les tables cibles. Note : SQLite n'a pas de systeme de roles natif → la restriction doit etre implementee au niveau applicatif Rust. [Medium Confidence]

**Menaces identifiees (OWASP LLM Top 10 2025) :**
- Prompt injection : attenue par grammaire GBNF + validation Rust
- Backdoor attacks via fine-tuning : non applicable (modele pre-entraine, pas de fine-tuning)
- Data exfiltration : attenue par mode INSERT-only + pas de SELECT expose

_Sources : [OWASP LLM Top 10](https://www.oligo.security/academy/owasp-top-10-llm-updated-2025-examples-and-mitigation-strategies), [LLM Prompt Injection Prevention](https://cheatsheetseries.owasp.org/cheatsheets/LLM_Prompt_Injection_Prevention_Cheat_Sheet.html), [LLM SQL Injection Research](https://arxiv.org/pdf/2308.01990)_

### Diagramme d'Integration Global

```
┌─────────────────────────────────────────────────────────┐
│  FRONTEND (React + TypeScript)                          │
│  ┌──────────┐  ┌──────────┐  ┌──────────────────┐      │
│  │ Mic      │  │ Texte    │  │ Tableaux/Grilles │      │
│  │ Capture  │  │ Edition  │  │ Donnees eleves   │      │
│  └────┬─────┘  └────┬─────┘  └────────┬─────────┘      │
│       │invoke        │invoke           │invoke          │
└───────┼──────────────┼─────────────────┼────────────────┘
        │    TAURI IPC (JSON serialize)  │
┌───────▼──────────────▼─────────────────▼────────────────┐
│  RUST BACKEND (Tauri Core)                              │
│  ┌──────────┐  ┌──────────┐  ┌──────────────────┐      │
│  │ Audio    │  │ LLM      │  │ SQLite           │      │
│  │ Handler  │  │ Handler  │  │ tauri-plugin-sql  │      │
│  └────┬─────┘  └────┬─────┘  └──────────────────┘      │
│       │HTTP          │HTTP POST                         │
└───────┼──────────────┼──────────────────────────────────┘
        │              │
┌───────▼──────┐ ┌─────▼──────────┐
│ SIDECAR 1    │ │ SIDECAR 2      │
│ whisper-     │ │ llama-server   │
│ server       │ │ + Qwen 2.5     │
│ :8081        │ │ :8080          │
│ + Silero VAD │ │ + GBNF grammar │
└──────────────┘ └────────────────┘
```

---

## Architectural Patterns and Design

### Architecture Globale : Multi-Process Desktop avec IA Locale

Tauri utilise une architecture multi-processus similaire aux navigateurs modernes : un **Core process** (Rust) gere un ou plusieurs **WebView processes** (frontend). Les sidecars IA ajoutent des processus supplementaires. Cette isolation garantit qu'un crash d'un composant (ex: Whisper OOM) n'affecte pas l'application principale. [High Confidence]

**Processus en execution :**
```
[PID 1] Tauri Core (Rust) — orchestrateur central, SQLite, IPC
[PID 2] WebView (React/TS) — interface utilisateur
[PID 3] whisper-server — STT, demarre au lancement, arrete a la fermeture
[PID 4] llama-server — LLM, demarre au lancement, arrete a la fermeture
```

Le Core process route tout l'IPC, gere l'etat global (settings, connexion BDD), et orchestre le cycle de vie des sidecars. Les sidecars communiquent via HTTP localhost (pas stdin/stdout) pour fiabilite et concurrence.

_Sources : [Tauri Process Model](https://v2.tauri.app/concept/process-model/), [Evil Martians Tauri Sidecar](https://evilmartians.com/chronicles/making-desktop-apps-with-revved-up-potential-rust-tauri-sidecar)_

### Pattern : Local-First AI Pipeline

L'architecture suit le pattern **Local-First AI** documente dans plusieurs projets recents (2025-2026) :

1. **Capture** → Audio micro via plugin ou Web Audio API
2. **Pre-traitement** → Silero VAD filtre les segments de parole
3. **Transcription** → Whisper.cpp convertit audio → texte
4. **Structuration** → LLM (Qwen 2.5) transforme texte libre → donnees structurees
5. **Validation** → Couche Rust verifie securite et coherence
6. **Persistance** → SQLite stocke les donnees validees
7. **Affichage** → Frontend met a jour les vues

Ce pipeline est **lineaire et unidirectionnel** (pas de boucle de feedback), ce qui simplifie la gestion d'erreur : chaque etape peut echouer independamment et l'utilisateur peut reprendre a l'etape precedente.

**Projets de reference :**
- [local-talking-llm](https://github.com/vndee/local-talking-llm) — Pipeline Whisper + LLM local complet
- [Voice Assistant Desktop with LLaMA3 + Whisper in Rust](https://blog.anubhab.me/tech/voice-assistant-desktop-app-with-llama3-and-whisper-in-rust/part-1/) — Implementation Rust directe
- [Technical Blueprint for Local-First AI with Rust and Tauri](https://medium.com/@Musbell008/a-technical-blueprint-for-local-first-ai-with-rust-and-tauri-b9211352bc0e) — Architecture Tauri + GGUF

_Sources : voir liens ci-dessus_

### Architecture Modulaire : 3 Modules, 1 Base, 2 Sidecars

**Principe de design :** Les 3 modules (Comportement Classe, Comportement Individuel, Domaines d'Apprentissage) partagent :
- La meme base SQLite (tables separees, FK communes vers `eleves` et `config_periodes`)
- Les memes sidecars IA (Whisper et Qwen)
- Le meme cycle de vie applicatif

**Separation des responsabilites :**
```
src/
├── modules/
│   ├── comportement-classe/    # Module 1 : vue globale, synthese hebdo
│   │   ├── components/
│   │   ├── hooks/
│   │   └── store.ts
│   ├── comportement-individuel/ # Module 2 : detail par eleve
│   │   ├── components/
│   │   ├── hooks/
│   │   └── store.ts
│   └── apprentissage/          # Module 3 : domaines, dictee vocale
│       ├── components/
│       ├── hooks/
│       └── store.ts
├── shared/
│   ├── ai/                     # Interface commune vers sidecars
│   ├── db/                     # Acces SQLite partage
│   ├── types/                  # Types communs (Eleve, Periode)
│   └── components/             # Composants UI partages
└── App.tsx                     # Navigation entre modules
```

**Pattern State Management :** Zustand avec un store par module + un store partage pour les donnees communes (eleves, periodes, settings). Convention existante V1 respectee. [High Confidence]

### Data Architecture : SQLite Offline-First

**Schema multi-module :** Un seul fichier SQLite contenant toutes les tables des 3 modules. La table `eleves` est la reference centrale, les tables `config_periodes` gerent les trimestres/semestres configurables.

**Avantages SQLite pour ce cas :**
- Pas de serveur a gerer (in-process) [High Confidence]
- Fichier unique, backup trivial (copie du fichier)
- WAL mode (Write-Ahead Logging) pour performances en ecriture concurrente
- Deja utilise en V1 via `tauri-plugin-sql`

**Migrations :** Tauri plugin SQL supporte les migrations automatiques au demarrage. Le schema V2 etend V1 (nouvelles tables, pas de breaking changes sur les existantes).

**Pas de role-based access natif** dans SQLite (contrairement a PostgreSQL). La restriction INSERT-only pour le LLM doit etre implementee au niveau applicatif Rust. [High Confidence]

_Sources : [SQLite Architecture](https://sqlite.org/arch.html), [SQLite in 2025](https://nerdleveltech.com/sqlite-in-2025-the-unsung-hero-powering-modern-apps)_

### Model Management : Premier Lancement et Mises a Jour

**Problematique :** ~1.5 Go de modeles GGUF ne peuvent pas etre bundled dans l'executable (trop lourd pour distribution).

**Architecture de telechargement :**
```
Premier lancement detecte :
  → Ecran d'accueil "Configuration initiale"
  → Telechargement sequentiel :
     1. Silero VAD (~1 Mo) — quasi instantane
     2. Whisper small FR (~480 Mo) — barre de progression
     3. Qwen 2.5 Coder 1.5B (~980 Mo) — barre de progression
  → Verification SHA256 de chaque modele
  → Stockage dans app_data_dir() de Tauri
  → Flag "models_ready" en BDD
  → Redemarrage des sidecars avec modeles charges
```

**Implementation Rust :** `reqwest` pour HTTP async + events Tauri pour progression en temps reel vers le frontend.

**Source de telechargement :** Hugging Face (URLs directes vers les fichiers GGUF). Alternative : CDN propre si Hugging Face est bloque dans l'ecole.

**Mise a jour :** Verification de version au demarrage (optionnel), telechargement en arriere-plan si nouveau modele disponible.

_Sources : [Building Local LM Desktop Apps with Tauri](https://medium.com/@dillon.desilva/building-local-lm-desktop-applications-with-tauri-f54c628b13d9), [Technical Blueprint Rust+Tauri](https://medium.com/@Musbell008/a-technical-blueprint-for-local-first-ai-with-rust-and-tauri-b9211352bc0e)_

### Securite et Conformite RGPD

**Architecture zero-network :**
- Aucune donnee ne quitte le poste (pas de telemetrie, pas d'API cloud)
- Les modeles IA tournent localement (inference CPU)
- La seule connexion reseau : telechargement initial des modeles (une fois)
- Apres installation, l'app fonctionne 100% offline

**Conformite RGPD :**
- Donnees nominatives (prenoms eleves) stockees uniquement en local
- Pas de transfert vers tiers
- Droit a l'effacement : suppression du fichier SQLite
- Pas de consentement necessaire (pas de collecte externe)

**Securite LLM :** Defense en profondeur documentee dans la section Integration Patterns (4 couches). [High Confidence]

### Deployment Architecture : Mode Portable

**Strategie V1 conservee :** Executable unique (`.exe` Windows, `.app` macOS) sans installateur.

**Specificite V2 :** Les modeles GGUF sont telecharges au premier lancement et stockes dans le repertoire de donnees de l'application, pas dans l'executable.

**Structure de distribution :**
```
comportement-v2.exe          # ~20 Mo (Tauri + React + sidecars compresses)
  → Premier lancement :
    AppData/comportement/
    ├── models/
    │   ├── whisper-small-fr-q4.gguf    # 480 Mo
    │   ├── qwen25-coder-1.5b-q4.gguf  # 980 Mo
    │   └── silero-vad.onnx             # 1 Mo
    ├── data/
    │   └── comportement.db             # SQLite
    └── config.json                     # Settings utilisateur
```

**Compatibilite Windows :** Eviter SmartScreen en signant l'executable (certificat code signing) ou en mode portable sans installateur (pattern V1). [Medium Confidence]

---

## Implementation Approaches and Technology Adoption

### Migration V1 → V2 : Strategie Incrementale

**Principe :** Ne pas repartir de zero. La V1 (Tauri + React + SQLite + Zustand) est la fondation. La V2 ajoute par-dessus.

**Phase 1 — Restructuration (sans IA)**
- Reorganiser le code V1 en architecture modulaire (`modules/`, `shared/`)
- Migrer le module Comportement Classe existant dans `modules/comportement-classe/`
- Ajouter les tables V2 au schema SQLite (migrations)
- Ajouter le Module 2 (Comportement Individuel) — pas d'IA necessaire
- Configurer les periodes scolaires (trimestres/semestres)

**Phase 2 — Integration IA**
- Ajouter les sidecars (whisper-server + llama-server)
- Implementer le pipeline audio (capture → transcription)
- Implementer le pipeline LLM (texte → JSON/SQL structure)
- Ajouter le Module 3 (Domaines d'Apprentissage) avec dictee vocale

**Phase 3 — Polish et Distribution**
- Gestion du telechargement des modeles (premier lancement)
- Tests et optimisations performance
- Packaging cross-platform

### Sourcing des Binaires Sidecars

**whisper.cpp :** Binaires pre-compiles disponibles sur [GitHub Releases](https://github.com/ggml-org/whisper.cpp/releases)
- Windows : `whisper-bin-x64.zip` (CPU, pas de GPU requis)
- macOS Intel : build depuis source avec CMake
- macOS ARM : build avec Metal support (`-DGGML_METAL=1`)
- **Note :** Les releases Windows officielles s'arretent a la v1.6.0, les versions plus recentes necessitent un build CMake ou l'utilisation des artefacts CI. [Medium Confidence]

**llama.cpp :** Binaires pre-compiles sur [GitHub Releases](https://github.com/ggml-org/llama.cpp/releases)
- Windows AVX2 : `llama-bin-win-avx2-x64.zip` (Intel Haswell 2013+ et AMD recents)
- macOS Intel : `llama-bin-macos-x64.zip`
- macOS ARM : `llama-bin-macos-arm64.zip` (avec GPU Metal)
- **Versions regulieres** avec support des derniers modeles GGUF [High Confidence]

**Workflow de bundling Tauri :**
```
src-tauri/binaries/
├── whisper-server-x86_64-pc-windows-msvc.exe
├── whisper-server-aarch64-apple-darwin
├── whisper-server-x86_64-apple-darwin
├── llama-server-x86_64-pc-windows-msvc.exe
├── llama-server-aarch64-apple-darwin
└── llama-server-x86_64-apple-darwin
```
Configuration dans `tauri.conf.json` :
```json
{
  "bundle": {
    "externalBin": ["binaries/whisper-server", "binaries/llama-server"]
  }
}
```
Tauri ajoute automatiquement le suffix target triple au runtime.

_Sources : [whisper.cpp Releases](https://github.com/ggml-org/whisper.cpp/releases), [llama.cpp Releases](https://github.com/ggml-org/llama.cpp/releases), [Tauri Sidecar](https://v2.tauri.app/develop/sidecar/)_

### Strategie de Testing

**Niveau 1 — Tests unitaires (rapides, sans IA)**
- Stores Zustand : test des reducers et actions
- Composants React : tests de rendu avec Vitest + Testing Library
- Validation Rust : test du validateur INSERT-only avec donnees mock
- Grammaire GBNF : validation syntaxique de la grammaire

**Niveau 2 — Tests d'integration avec mocks**
- Mock HTTP pour whisper-server : reponses pre-enregistrees (texte transcrit)
- Mock HTTP pour llama-server : reponses JSON/SQL pre-generees
- Test du pipeline complet Frontend → Rust → Mock sidecar → SQLite
- Pas de dependance aux modeles IA pour ces tests [High Confidence]

**Niveau 3 — Tests end-to-end avec IA reelle**
- Manuels ou semi-automatiques (sortie LLM non deterministe)
- Fichiers audio de test enregistres pour verification STT
- Evaluation semantique des sorties LLM (structure correcte, pas le texte exact)
- A executer sur la machine cible (PC ecole) pour valider les performances

**Frameworks :** Vitest (frontend), `cargo test` (Rust), mocks HTTP via `wiremock` (Rust) ou MSW (frontend)

_Sources : [Testing LLM Applications](https://langfuse.com/blog/2025-10-21-testing-llm-applications), [LLM Testing Strategies](https://www.confident-ai.com/blog/llm-testing-in-2024-top-methods-and-strategies)_

### Risk Assessment et Mitigations

| Risque | Probabilite | Impact | Mitigation |
|--------|------------|--------|------------|
| Performance CPU insuffisante PC ecole | Moyenne | Haut | Tester sur hardware reel tot. Fallback : modeles plus petits (Qwen 0.5B, Whisper tiny) |
| Whisper hallucine sur le francais oral (accents, argot) | Moyenne | Moyen | Silero VAD + post-correction manuelle par l'enseignant |
| Qwen genere du SQL invalide | Faible | Haut | Grammaire GBNF + validation Rust 4 couches. Fallback : insertion manuelle |
| Telechargement modeles bloque (proxy ecole) | Haute | Haut | Prevoir cle USB avec modeles pre-telecharges. Documentation alternative |
| SmartScreen bloque l'exe Windows | Moyenne | Moyen | Mode portable sans installateur (V1 pattern). Documentation pour admin IT |
| Mise a jour llama.cpp casse l'API | Faible | Moyen | Figer la version, tester avant upgrade |
| RAM insuffisante (<4 Go) | Faible | Haut | Mode degrade : un seul sidecar a la fois (Whisper OU Qwen, pas les deux) |

### Implementation Roadmap

**Sprint 1 : Restructuration + Module 2**
- Reorganisation code modulaire
- Module 2 Comportement Individuel (CRUD + detail par eleve)
- Configuration periodes scolaires
- Migrations SQLite V2

**Sprint 2 : Integration Whisper**
- Setup sidecar whisper-server
- Capture audio (tauri-plugin-mic-recorder)
- Pipeline STT complet avec Silero VAD
- Tests avec fichiers audio reels

**Sprint 3 : Integration LLM**
- Setup sidecar llama-server + Qwen 2.5
- Grammaire GBNF pour INSERT SQL
- Validateur Rust
- Module 3 Domaines d'Apprentissage avec dictee vocale

**Sprint 4 : Model Management + Polish**
- Ecran premier lancement / telechargement modeles
- Synthese LLM hebdomadaire (Module 1)
- Export PDF tableau 2 colonnes
- Tests performance sur PC ecole reel

**Sprint 5 : Distribution**
- Build cross-platform (Windows + macOS)
- Documentation utilisateur
- Package USB pour installation offline

---

## Technical Research Recommendations

### Technology Stack — Decisions Finales

| Decision | Choix | Justification |
|----------|-------|---------------|
| Framework Desktop | Tauri v2 (conserver V1) | Mature, sidecar natif, leger |
| Frontend | React 18 + TypeScript (conserver V1) | Pas de raison de changer |
| State Management | Zustand (conserver V1) | Pattern simple, efficace |
| BDD | SQLite via tauri-plugin-sql (conserver V1) | Offline-first, fichier unique |
| STT | Whisper.cpp small FR (GGUF Q4) | Meilleur rapport qualite/taille pour francais |
| VAD | Silero VAD (ONNX C++) | MIT, 1 Mo, integre avec whisper.cpp |
| LLM | Qwen 2.5 Coder 1.5B (GGUF Q4) | Specialise JSON/code, taille raisonnable CPU |
| Serveur LLM | llama-server (llama.cpp) | API OpenAI-compatible, GBNF natif |
| Contrainte sortie | Grammaire GBNF | Controle deterministe au token |
| Audio capture | tauri-plugin-mic-recorder | Plugin Tauri v2 dedie |

### Risques Critiques a Adresser En Premier

1. **Proxy ecole bloquant Hugging Face** → Preparer solution USB des le debut
2. **Performance PC ecole** → Tester sur hardware reel avant Sprint 3
3. **Qualite STT francais avec accents** → Enregistrer corpus de test avec vrais eleves

### Metriques de Succes

- Temps de transcription : <5s pour 15s d'audio sur CPU standard
- Temps de structuration LLM : <5s pour generer un INSERT valide
- Taux d'INSERT valides : >95% (apres validation GBNF + Rust)
- Taille totale distribution : <2 Go (exe + modeles)
- RAM pic : <3 Go en utilisation concurrente

---

## Conclusion de la Recherche Technique

### Verdict : FAISABLE — Architecture Validee

L'integration d'IA locale dans Tauri v2 pour le suivi des eleves est techniquement viable. Tous les composants necessaires existent, sont open-source (MIT), et ont ete valides dans des projets similaires.

### Points Forts de l'Architecture

- **Stack V1 reutilisable** : Tauri + React + SQLite + Zustand restent la fondation
- **Sidecars matures** : whisper.cpp et llama.cpp sont des projets actifs avec releases regulieres
- **Securite LLM solide** : La grammaire GBNF offre un controle deterministe unique
- **RGPD natif** : Architecture zero-network, donnees 100% locales
- **Modularite** : 3 modules independants partageant les memes ressources

### Points de Vigilance

- **Performance PC ecole** : A valider empiriquement (Sprint 2)
- **Qualite STT francais** : Whisper small peut avoir des difficultes avec certains accents → post-correction manuelle necessaire
- **Distribution modeles** : Le telechargement de 1.5 Go peut etre bloque par les proxys scolaires → prevoir alternative USB
- **Maintenance sidecars** : Les mises a jour de whisper.cpp/llama.cpp peuvent casser la compatibilite → figer les versions

### Prochaine Etape

Cette recherche alimente directement le **Product Brief V2** puis le **PRD V2**. Les decisions techniques documentees ici guideront l'architecture et le planning d'implementation.

---

**Recherche completee le :** 2026-02-10
**Verification des sources :** Toutes les affirmations techniques citees avec sources web actuelles
**Niveau de confiance global :** High — base sur de multiples sources autoritatives

### Sources Principales

- [Tauri v2 Documentation](https://v2.tauri.app/) — Framework desktop, sidecars, IPC
- [whisper.cpp GitHub](https://github.com/ggml-org/whisper.cpp) — STT local
- [llama.cpp GitHub](https://github.com/ggml-org/llama.cpp) — LLM local, GBNF
- [Silero VAD GitHub](https://github.com/snakers4/silero-vad) — Detection activite vocale
- [Qwen 2.5 Coder](https://qwenlm.github.io/blog/qwen2.5/) — Modele LLM structure
- [OWASP LLM Top 10](https://www.oligo.security/academy/owasp-top-10-llm-updated-2025-examples-and-mitigation-strategies) — Securite LLM
- [tauri-plugin-mic-recorder](https://crates.io/crates/tauri-plugin-mic-recorder) — Capture audio Tauri v2
- [Technical Blueprint Rust+Tauri AI](https://medium.com/@Musbell008/a-technical-blueprint-for-local-first-ai-with-rust-and-tauri-b9211352bc0e) — Architecture reference

---

## Addendum : Revue Perplexity (2026-02-10)

Revue croisee des conclusions de recherche via Perplexity AI (15 requetes). Synthese des corrections, confirmations et nouvelles recommandations.

### Corrections Critiques (3)

#### 1. RAM Concurrente : 2-3 Go est TROP OPTIMISTE

**Recherche initiale :** ~2 Go concurrent pour les deux sidecars
**Realite Perplexity :**
- Whisper small FR : ~852 Mo (pas ~500 Mo comme estime)
- Qwen 2.5 Coder 1.5B Q4 : ~2 Go base + KV cache (varie avec ctx_size)
- **Total realiste : ~3-4 Go** pour les deux sidecars simultanes

**Impact :** Sur un PC ecole 4 Go RAM, les deux sidecars NE PEUVENT PAS tourner en meme temps.

**Nouvelle recommandation :**
- **Mode sequentiel obligatoire** sur PC 4 Go : Whisper → arret → llama-server → arret
- **Mode concurrent** uniquement si PC 8 Go+ ET Whisper base/tiny (pas small)
- Reduire `--ctx-size` du LLM au minimum necessaire (512-1024 tokens suffisent pour INSERT)

**Tableau RAM corrige :**

| Configuration | Whisper | LLM | Total estim. | PC requis |
|--------------|---------|-----|-------------|-----------|
| Sequentiel (tiny) | ~273 Mo | ~2 Go | ~2 Go pic | 4 Go |
| Sequentiel (small) | ~852 Mo | ~2 Go | ~2 Go pic | 4 Go |
| Concurrent (tiny + Qwen) | ~273 Mo | ~2 Go | ~2.3 Go | 8 Go |
| Concurrent (small + Qwen) | ~852 Mo | ~2 Go | ~3.5 Go+ | 8 Go |

#### 2. whisper-server : Instabilite Windows Confirmee

**Recherche initiale :** whisper-server recommande en mode persistant
**Realite Perplexity :** Bug ouvert — fuite de handles Windows, transcriptions vides apres ~6-7 requetes consecutives (issue #3358). Memory leaks VAD corriges en v1.8.1.

**Nouvelle recommandation :**
- **Watchdog obligatoire** : healthcheck + restart automatique apres N requetes ou reponse vide
- **Pinner version >= v1.8.1** pour les fixes de memory leaks VAD
- **Politique de recyclage** : redemarrer le sidecar toutes les ~50 requetes ou sur symptome
- Mode CLI (whisper-cli) reste un fallback viable si le serveur est instable

#### 3. Architecture LLM : JSON au lieu de SQL

**Recherche initiale :** LLM genere directement du SQL INSERT
**Realite Perplexity :** Risque accru d'injection indirecte. L'etude P2SQL montre que meme les restrictions prompt sont contournables. Microsoft recommande des gardes deterministes.

**Nouvelle recommandation architecturale :**
- **Le LLM genere du JSON structure** (pas du SQL)
- **Rust reconstruit le SQL** avec des prepared statements
- **Zero SQL brut** ne traverse jamais la frontiere LLM → execution

```
Pipeline revise :
[Texte] → LLM → JSON { "op": "insert", "table": "...", "row": {...} }
       → Validation Rust (allowlist tables/colonnes, types, tailles)
       → Rust construit INSERT avec params ($1, $2...)
       → SQLite execute le prepared statement
```

Avantages :
- Le LLM n'a JAMAIS besoin de connaitre la syntaxe SQL
- Injection SQL impossible (prepared statements)
- GBNF contraint le JSON (plus simple qu'une grammaire SQL)
- Validation Rust = source de verite deterministe

### Confirmations avec Nuances (5)

#### 4. Whisper.cpp : Bon choix, RTF conservatif

- RTF ~0.6 est **conservatif** sur CPU modernes (RTF reel ~0.16 sur i7-12700K)
- Sur PC ecole (CPU ancien), RTF ~0.6 reste **plausible** et prudent
- faster-whisper est plus rapide (INT8) mais necessite Python → packaging prohibitif pour Tauri
- **Whisper.cpp confirme comme meilleur compromis** pour sidecar C/C++ sans dependances
- Levier : beam_size=1 (greedy) au lieu de 5 → gain significatif si qualite acceptable

#### 5. Qwen 2.5 Coder 1.5B : Confirme, alternatives identifiees

- **Confirme comme choix par defaut** pour JSON structure
- DeepSeek Coder 1.3B : challenger "code-heavy" si Qwen echoue sur SQL specifique
- Gemma 2 2B : baseline generaliste mais pas "coder"
- **Nouveau :** Qwen3 4B est viable en GGUF (llama.cpp >= b5092), meilleur que Qwen 2.5 sur benchmarks
  - MAIS : thinking mode/chat template instable, Q4_K_M ~2.7 Go
  - **Reco : tester Qwen3 4B en V2.1**, rester sur Qwen 2.5 Coder 1.5B pour V2.0

#### 6. GBNF : Confirme comme plus fiable que response_format

- Bugs response_format corriges depuis b4820 (mars 2025)
- GBNF reste la contrainte "la plus dure" au niveau token
- Pas de grammaire SQL standard dans le repo llama.cpp → custom necessaire
- **Avec le pivot JSON (correction #3), la grammaire GBNF devient plus simple** (JSON schema au lieu de SQL)
- Script `json-schema-to-grammar.py` disponible pour convertir un JSON Schema en GBNF

#### 7. Tauri v2 Sidecars : Packaging OK, lifecycle DIY

- Bundling via `externalBin` + target triple : **mature et documente**
- Lifecycle management (start/stop/healthcheck) : **entierement a notre charge**
- Piege PID : `process.kill()` peut ne tuer que le wrapper, pas le vrai process
- Plugin communautaire `tauri-sidecar-manager` existe mais pas officiel
- **Reco : implementer un SidecarManager Rust custom** avec :
  - Start on-demand (pas au lancement si RAM faible)
  - Healthcheck HTTP (ping endpoint)
  - Graceful shutdown + force kill timeout
  - Restart on failure

#### 8. Silero VAD : Utiliser l'integration whisper.cpp native

- **Recherche initiale :** Integration C++ ONNX separee de Silero VAD
- **Realite Perplexity :** whisper.cpp integre nativement Silero VAD depuis v1.8+ via `--vad` flag + modele ggml
- **Problemes ONNX Runtime C++ :** incompatibilites ABI, chemins Unicode Windows, versions

**Nouvelle recommandation :** Utiliser `--vad` de whisper.cpp directement (modele VAD ggml) au lieu d'une integration ONNX separee. Plus simple, moins de dependances, deja teste cross-platform.

### Nouveaux Risques Identifies (2)

#### 9. tauri-plugin-mic-recorder : Maintenance faible

- Derniere activite : burst v2.0.0 (mars 2025), peu de suivi apres
- docs.rs : build echoue pour la crate 2.0.0
- **Risque** : plugin non maintenu, bugs potentiels Windows non corriges

**Mitigation :**
- Plan A : tauri-plugin-mic-recorder (tester en build release signe)
- Plan B : Web Audio API (`getUserMedia`) cote frontend → envoi chunks vers Rust
- Decider apres test "prod-like" sur Windows + macOS

#### 10. Pas de projet reference identique

- Aucun repo public ne combine exactement Tauri v2 + whisper.cpp + llama.cpp en sidecars
- Projets proches existent separement (Tauri+llama, Tauri+Whisper via Python)
- **Consequence :** Nous sommes pionniers sur cette combinaison precise → prevoir plus de temps pour l'integration et le debugging

### Tableau Recapitulatif Corrige

| Composant | Technologie | Taille | RAM | Confiance | Change |
|-----------|-------------|--------|-----|-----------|--------|
| Framework Desktop | Tauri v2 | ~18 Mo exe | ~200 Mo | High | = |
| Speech-to-Text | Whisper.cpp (small FR Q4) | ~480 Mo modele | **~852 Mo actif** | High | **RAM corrigee** |
| VAD | **whisper.cpp natif (--vad)** | inclus dans whisper | negligeable | High | **Simplifie** |
| LLM | Qwen 2.5 Coder 1.5B (Q4) | ~980 Mo modele | **~2 Go+ actif** | High | **RAM corrigee** |
| Serveur LLM | llama-server | ~25 Mo binaire | inclus dans LLM | High | = |
| Sortie LLM | **JSON structure (pas SQL)** | — | — | High | **CHANGE** |
| Capture Audio | tauri-plugin-mic-recorder | inclus | negligeable | **Low** | **Risque** |
| Base de donnees | SQLite (tauri-plugin-sql) | inclus | negligeable | High | = |
| **TOTAL** | | **~1.5 Go disque** | **~3-4 Go concurrent** | | **RAM hausse** |

### Impact sur la Roadmap

- **Sprint 1** : Inchange (restructuration, pas d'IA)
- **Sprint 2** : Ajouter **watchdog whisper-server** + tester mode sequentiel sur PC 4 Go
- **Sprint 3** : Pivoter vers **JSON output** au lieu de SQL direct + prepared statements Rust
- **Sprint 4** : Tester Qwen3 4B comme upgrade optionnel + solution USB modeles
- **Nouveau** : Prevoir un **test hardware reel** (PC ecole) des le Sprint 2, pas Sprint 4

### Sources Perplexity

- [whisper.cpp issue #3358](https://github.com/ggml-org/whisper.cpp/issues/3358) — Handle leak Windows
- [whisper.cpp releases v1.8.1](https://github.com/ggml-org/whisper.cpp/releases) — VAD memory leak fix
- [llama.cpp issue #11988](https://github.com/ggml-org/llama.cpp/issues/11988) — response_format fix b4820
- [Qwen3-1.7B-GGUF](https://huggingface.co/Qwen/Qwen3-1.7B-GGUF) — Qwen3 petits modeles
- [Microsoft Indirect Injection](https://developer.microsoft.com/blog/protecting-against-indirect-injection-attacks-mcp) — Defense LLM-as-DB
- [GGUF Memory Calculator](https://ggufloader.github.io/gguf-memory-calculator.html) — Estimation RAM
- [whisper.cpp RAM benchmarks](https://github.com/ggerganov/whisper.cpp/issues/2) — RAM par taille modele
- [Silero VAD dans whisper.cpp](https://blog.stackademic.com/silero-vad-the-lightweight-high-precision-voice-activity-detector-26889a862636) — Integration native
- [tauri-plugin-mic-recorder](https://github.com/ayangweb/tauri-plugin-mic-recorder) — Maintenance faible
- [tauri-sidecar-manager](https://github.com/radical-data/tauri-sidecar-manager) — Plugin communautaire lifecycle
