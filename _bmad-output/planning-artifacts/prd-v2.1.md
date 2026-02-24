---
stepsCompleted: [step-e-01-discovery, step-e-02-review, step-e-03-edit]
inputDocuments:
  - prd-v2.md
  - analysis/brainstorming-session-2026-02-17.md
  - analysis/brainstorming-session-2026-02-24.md
  - product-brief-comportement-2026-02-10.md
  - research/technical-ia-locale-tauri-sidecars-research-2026-02-10.md
  - architecture-v2.md
  - epics-v2.md
  - ux-design-v2.md
workflowType: 'prd'
workflow: 'edit'
classification:
  projectType: desktop_app
  domain: edtech
  complexity: high
  projectContext: brownfield
date: 2026-02-24
author: Uhama
version: V2.1-rev2
previous_version: V2.1 (2026-02-17)
editHistory:
  - date: 2026-02-17
    changes: 'Refonte Module 3 (LLM classificateur+fusionneur, domaines dynamiques par cycle, micro unique, panneau revue diff), compatibilite LSU 4 niveaux, gestion annee scolaire, classes multi-niveaux, undo/redo, appreciation generale, export LSU XML optionnel'
  - date: 2026-02-24
    changes: 'REVISION MAJEURE post-brainstorming : suppression Module 2, ajout Registre d appel, Module Evaluations, LSU Vivant, event sourcing, micro par eleve (dual-mode), synthese LLM on-demand, versioning syntheses, double vue LSU, import CSV eleves'
---

# Product Requirements Document - Comportement V2.1 (rev2)

**Auteur :** Uhama
**Date :** 2026-02-24 (revision majeure)
**Version :** V2.1-rev2
**Version precedente :** V2.1 (2026-02-17), V2 (2026-02-10)

---

## 1. Introduction

### 1.1 Contexte

**MonCahier** (anciennement Comportement) est une application desktop locale (Tauri v2) utilisee quotidiennement par un enseignant d'ecole elementaire (CM2, Ecole Victor Hugo, Sevran, 93) pour le suivi pedagogique complet de ses 18 eleves. La **V1** (production depuis janvier 2026) gere le comportement de classe. La **V2** (completee fevrier 2026) ajoute 3 modules + IA locale.

La **V2.1** est une **refonte majeure** qui transforme MonCahier d'un outil de suivi comportemental en un **assistant pedagogique complet** ou le LSU (Livret Scolaire Unique) se construit progressivement a partir des observations quotidiennes et des evaluations.

### 1.2 Vision V2.1

> Le LSU ne devrait plus etre un formulaire penible a remplir en fin de periode, mais un document vivant qui se nourrit du travail quotidien de l'enseignant.

### 1.3 Changements majeurs par rapport a V2.1 initiale (2026-02-17)

| Aspect | V2.1 initiale (17 fev) | V2.1-rev2 (24 fev) |
|--------|------------------------|---------------------|
| Module 2 | Comportement Individuel (conserve) | **SUPPRIME** — remplace par vues filtrees journal/LSU |
| Module 1 micro | Micro unique toolbar Module 3 | **Micro par eleve** sur carte (dual-mode tap/press) |
| Absences | Simple toggle (Module 1) | **Registre d'appel complet** (demi-journee, 3 types, motifs, retards, alerte legale) |
| Module 3 | Refonte appreciation table | **Module Evaluations** (lecons, niveaux, observations) + **LSU Vivant** (syntheses progressives) |
| Modele donnees | Table `appreciations` evoluee | **Event sourcing leger** (`evenements_pedagogiques` immutable) + `syntheses_lsu` versionnees |
| LLM pipeline | 1 job (classify+merge) | **3 jobs** (classifier domaine, synthetiser par domaine, appreciation generale) |
| Synthese | Manuelle | **On-demand LLM** avec versioning (4-5 versions) |
| Vue LSU | Par eleve uniquement | **Double vue** : par eleve ET par domaine |
| Import eleves | Saisie manuelle | **Import CSV** en debut d'annee |

### 1.4 Objectifs V2.1

| Objectif | Description |
|----------|-------------|
| **Assistant pedagogique** | Observations spontanees + evaluations structurees → LSU qui se construit tout seul |
| **Registre d'appel** | Absences par demi-journee, types, motifs, retards, alerte legale 4+ injustifiees/mois |
| **Module Evaluations** | Saisie par lecon, domaine, niveau LSU, observations (vocal ou manuel) |
| **LSU Vivant** | Synthese progressive par domaine (LLM on-demand), appreciation generale, double vue, versioning |
| **Micro par eleve** | Bouton micro dual-mode sur chaque carte eleve (tap toggle / press & hold push-to-talk) |
| **Event sourcing** | Table immutable `evenements_pedagogiques` — observations, evaluations, motifs sanctions |
| **Import CSV** | Import liste de classe en debut d'annee |

### 1.5 Relation avec la V2

- **Module 1 — Comportement Classe** : conserve et **enrichi** (micro par eleve, integration registre d'appel)
- **Module 2 — Comportement Individuel** : **SUPPRIME** (remplace par vues filtrees)
- **Module 3 — Domaines d'Apprentissage** : **REMPLACE** par Module Evaluations + LSU Vivant
- Pipeline IA (sidecars whisper-server + llama-server) : conserve, **3 jobs LLM** au lieu de 1
- Tables BDD V2 : conservees avec migrations additives + nouvelles tables event sourcing
- Annee scolaire, multi-niveaux, echelle LSU : conserves de V2.1 initiale

---

## 2. Product Overview

### 2.1 Vue d'ensemble

```
+-----------------------------------------------------------------------+
|                    MONCAHIER V2.1                                      |
|                                                                         |
|  +-------------------+  +-------------------+                          |
|  | MODULE 1          |  | MODULE 2          |                          |
|  | Comportement      |  | Registre d'appel  |                          |
|  | Classe (enrichi)  |  | (NOUVEAU)         |                          |
|  |                   |  |                   |                          |
|  | - Avertissements  |  | - Appel matin/pm  |                          |
|  | - Sanctions       |  | - 3 types absence |                          |
|  | - Recompenses     |  | - Motifs          |                          |
|  | - Micro par eleve |  | - Retards         |                          |
|  | - Motifs vocaux   |  | - Alerte legale   |                          |
|  +--------+----------+  | - Totaux LSU      |                          |
|           |              +--------+----------+                          |
|  +--------+------+  +-----------+----------+                           |
|  | MODULE 3      |  | MODULE 4             |                           |
|  | Evaluations   |  | LSU Vivant (NOUVEAU) |                           |
|  | (NOUVEAU)     |  |                      |                           |
|  |               |  | - Vue par eleve      |                           |
|  | - Par lecon   |  | - Vue par domaine    |                           |
|  | - Domaine     |  | - Synthese LLM       |                           |
|  | - Niveau LSU  |  | - Appre. generale    |                           |
|  | - Observations|  | - Versioning         |                           |
|  | - Historique  |  | - Sources depliables |                           |
|  | - Saisie lot  |  | - Export LSU XML     |                           |
|  +-------+-------+  +----------+-----------+                           |
|          |                      |                                       |
|  +-------+----------------------+-----------------------------------+  |
|  |                 COUCHE PARTAGEE                                   |  |
|  | evenements_pedagogiques | syntheses_lsu | absences | Zustand     |  |
|  | Eleves | Annee scolaire | Niveaux | Periodes | SQLite           |  |
|  +---+-----------------------------------------------------------+--+  |
|      |                                                            |     |
|  +---+------------------+  +-------------------------------------++    |
|  |  SIDECAR 1           |  |  SIDECAR 2                           |    |
|  |  whisper-server      |  |  llama-server + Qwen 2.5              |    |
|  |  (STT francais)      |  |  3 jobs : classifier, synthetiser,    |    |
|  |  + VAD natif          |  |  appreciation generale               |    |
|  +----------------------+  +--------------------------------------+    |
+-----------------------------------------------------------------------+
```

### 2.2 Modules

#### Module 1 — Comportement Classe (enrichi V2.1)

Suivi global hebdomadaire. Avertissements, sanctions avec motifs (vocaux ou texte), recompenses automatiques, grille de cartes, mode TBI, export JSON. **Nouveau** : bouton micro dual-mode sur chaque carte eleve pour observations spontanees et motifs de sanctions.

#### Module 2 — Registre d'Appel (nouveau V2.1)

Registre d'appel numerique par demi-journee (matin/apres-midi). 3 types d'absence (justifiee, medicale, injustifiee), motifs (vocal ou texte), retards (present + flag). Saisie retroactive possible. Alerte legale si 4+ demi-journees injustifiees sur 30 jours glissants. Totaux auto-calcules pour integration LSU.

#### Module 3 — Evaluations (nouveau V2.1, remplace ancien Module 3)

Saisie d'evaluations structurees par lecon, domaine d'apprentissage (filtre par cycle eleve), niveau LSU (4 niveaux officiels), observations (vocal ou manuel). Saisie par lot (meme lecon, tous les eleves). Historique par eleve (timeline chronologique). Les evaluations alimentent les evenements pedagogiques.

#### Module 4 — LSU Vivant (nouveau V2.1)

Synthese progressive par domaine generee on-demand par le LLM a partir du journal pedagogique (observations + evaluations). Double vue : par eleve (tous domaines) ET par domaine (tous eleves). Appreciation generale cross-domaines (inclut patterns comportement formules avec tact). Sources depliables sous chaque synthese. Versioning (4-5 versions en arriere). Modifiable vocalement ou manuellement. Export LSU officiel XML.

### 2.3 Infrastructure IA locale

- **Whisper.cpp** (whisper-server sidecar) : transcription STT francais, modele small FR GGUF Q4 (~480 Mo) — inchange
- **Qwen 2.5 Coder 1.5B** (llama-server sidecar) : **3 jobs** au lieu de 1
  - **Job 1 — Classifier** : identifie le domaine vise par l'observation dictee
  - **Job 2 — Synthetiser** : genere une synthese par domaine pour le LSU (on-demand)
  - **Job 3 — Appreciation generale** : cross-domaines + comportement formule avec tact
- **Pipeline sequentiel a la demande** : un seul modele actif a la fois — inchange
- **GBNF dynamique** : grammaire generee depuis la BDD (domaines actifs de l'eleve)
- **Securite 4 couches** : Prompt contraint, Grammaire GBNF, Validateur Rust, Prepared Statements — inchange

### 2.4 Modele de donnees — Event Sourcing leger

Le coeur de V2.1 est un modele event sourcing leger :

- **`evenements_pedagogiques`** : table immutable (append-only) qui capture toutes les observations, evaluations, et motifs de sanctions
- **`syntheses_lsu`** : syntheses generees par LLM (versionnees, 4-5 versions en arriere)
- **`appreciations_generales`** : appreciation cross-domaines par eleve/periode (versionnee)
- **`absences`** : refonte avec demi-journees, types, motifs, retards

### 2.5 Gestion de l'annee scolaire (inchange V2.1)

- **Annee scolaire** = conteneur principal
- **Cycle de vie** : creation → active → cloturee (lecture seule)
- Archive possible en fin d'annee ou entre periodes
- Mono-user, une DB par machine

---

## 3. Functional Requirements

### 3.1 Module 1 — Comportement Classe (enrichi)

#### 3.1.1-3.1.7 FRs existantes (inchangees V2)

FR1-FR30 sont conservees telles quelles (voir PRD V2.1 initiale).

#### 3.1.8 Micro par eleve (nouveau V2.1-rev2)

| ID | Description | Criteres d'acceptation | Priorite | Module |
|----|-------------|----------------------|----------|--------|
| **FR70** | L'enseignant peut dicter une observation via le micro sur la carte d'un eleve | - Bouton micro sur chaque carte eleve dans le tableau collectif<br>- **Dual-mode** : tap court (<300ms) = toggle enregistrement continu, press long (>300ms) = push-to-talk<br>- L'eleve est identifie par la carte (pas besoin de le selectionner)<br>- Audio capture WAV PCM 16kHz<br>- Indicateur visuel d'enregistrement (LED, animation) | Must | M1 |
| **FR71** | Le systeme transcrit et classifie automatiquement l'observation dictee | - Whisper STT → texte editable<br>- LLM classifie le domaine d'apprentissage vise<br>- TranscriptPreview affiche la carte editable avec diff Avant/Apres<br>- L'enseignant peut corriger, reassigner le domaine, valider ou rejeter<br>- L'observation validee alimente `evenements_pedagogiques` | Must | M1 |
| **FR72** | Le micro sert aussi pour les motifs de sanctions | - Meme bouton micro, contexte different (le systeme detecte si c'est une observation ou un motif)<br>- Le motif vocal est transcrit et associe a la sanction<br>- Le motif est stocke dans `evenements_pedagogiques` (type=motif_sanction) | Should | M1 |

---

### 3.2 Module 2 — Registre d'Appel (nouveau)

| ID | Description | Criteres d'acceptation | Priorite | Module |
|----|-------------|----------------------|----------|--------|
| **FR73** | L'enseignant peut faire l'appel du matin et de l'apres-midi | - Grille eleves x jours avec toggle absent/present par demi-journee<br>- Demi-journees : matin et apres-midi<br>- Saisie rapide : un clic par eleve absent | Must | M2 |
| **FR74** | L'enseignant peut typer chaque absence | - 3 types : justifiee, medicale, injustifiee<br>- Select inline sur chaque absence<br>- Type par defaut configurable | Must | M2 |
| **FR75** | L'enseignant peut ajouter un motif a chaque absence | - Champ texte ou vocal (micro)<br>- Motif optionnel | Should | M2 |
| **FR76** | L'enseignant peut marquer un retard | - Retard = present + flag retard (pas une absence)<br>- Toggle retard par eleve | Must | M2 |
| **FR77** | L'enseignant peut saisir retroactivement | - Date picker pour saisir des absences sur jours passes<br>- Motifs ajoutables apres coup | Must | M2 |
| **FR78** | Le systeme alerte si 4+ demi-journees injustifiees sur 30 jours | - Calcul glissant sur 30 jours (pas calendaire)<br>- Badge alerte rouge visible uniquement pour l'enseignant<br>- Notification visuelle (pas de mail/courrier) | Must | M2 |
| **FR79** | Le systeme calcule les totaux d'absences pour le LSU | - Somme auto par periode : demi-journees justifiees + injustifiees (separement)<br>- Integre dans l'export LSU XML | Must | M2 |

---

### 3.3 Module 3 — Evaluations (nouveau, remplace ancien Module 3)

| ID | Description | Criteres d'acceptation | Priorite | Module |
|----|-------------|----------------------|----------|--------|
| **FR80** | L'enseignant peut saisir une evaluation | - Formulaire : nom de la lecon, domaine (filtre par cycle eleve), niveau LSU (4 niveaux), observations (texte ou vocal)<br>- L'evaluation est stockee dans `evenements_pedagogiques` (type=evaluation) | Must | M3 |
| **FR81** | Les domaines sont filtres par le cycle de l'eleve | - Chaque eleve a un niveau (PS-CM2) → cycle (C1/C2/C3)<br>- Domaines filtres automatiquement<br>- C1: 5 domaines, C2: 7 domaines, C3: 8+1 domaines<br>- Domaines custom en complement | Must | M3 |
| **FR82** | L'enseignant peut saisir par lot (meme lecon, tous les eleves) | - Grille eleves x niveau pour une meme lecon et domaine<br>- Saisie rapide : un clic par eleve pour le niveau<br>- Observations individuelles optionnelles | Should | M3 |
| **FR83** | L'enseignant peut consulter l'historique des evaluations par eleve | - Timeline chronologique des evaluations<br>- Filtrable par domaine et periode | Must | M3 |
| **FR84** | L'echelle d'evaluation suit les 4 niveaux LSU officiels | - Non atteints / Partiellement atteints / Atteints / Depasses<br>- Le niveau est 100% decision de l'enseignant (jamais par le LLM) | Must | M3 |

---

### 3.4 Module 4 — LSU Vivant (nouveau)

#### 3.4.1 Syntheses par domaine

| ID | Description | Criteres d'acceptation | Priorite | Module |
|----|-------------|----------------------|----------|--------|
| **FR85** | L'enseignant peut generer une synthese par domaine pour un eleve | - Bouton "Synthetiser" par domaine<br>- Le LLM genere une synthese a partir de toutes les observations/evaluations du domaine pour la periode<br>- La synthese est affichee dans un champ editable<br>- L'enseignant peut modifier vocalement ou manuellement | Must | M4 |
| **FR86** | La synthese est on-demand, jamais automatique | - Le LLM ne se declenche que quand l'enseignant clique "Synthetiser"<br>- Pas de regeneration automatique apres une nouvelle observation | Must | M4 |
| **FR87** | Les syntheses sont versionnees | - 4-5 versions en arriere conservees<br>- Bouton "Regenerer" conserve la version precedente<br>- L'enseignant peut restaurer une version anterieure | Must | M4 |
| **FR88** | Les sources sont depliables sous chaque synthese | - Accordeon affichant les observations/evaluations qui ont nourri la synthese<br>- Lien vers l'evenement source | Should | M4 |

#### 3.4.2 Double vue LSU

| ID | Description | Criteres d'acceptation | Priorite | Module |
|----|-------------|----------------------|----------|--------|
| **FR89** | L'enseignant peut voir le LSU par eleve (tous domaines) | - Fiche eleve avec tous les domaines de son cycle<br>- Synthese + niveau par domaine<br>- Appreciation generale en bas | Must | M4 |
| **FR90** | L'enseignant peut voir le LSU par domaine (tous eleves) | - Liste de tous les eleves pour un domaine donne<br>- Synthese + niveau par eleve<br>- Vue pratique pour verifier la coherence | Must | M4 |

#### 3.4.3 Appreciation generale

| ID | Description | Criteres d'acceptation | Priorite | Module |
|----|-------------|----------------------|----------|--------|
| **FR91** | L'enseignant peut generer une appreciation generale par eleve/periode | - Bouton "Generer" envoie toutes les observations + syntheses + patterns comportement au LLM<br>- Le LLM synthetise un paragraphe cross-domaines (max 1500 car. LSU)<br>- Le comportement est formule avec tact (jamais punitif, toujours constructif)<br>- Champ editable (texte ou vocal)<br>- Versionnee (4-5 versions) | Must | M4 |

#### 3.4.4 Export LSU

| ID | Description | Criteres d'acceptation | Priorite | Module |
|----|-------------|----------------------|----------|--------|
| **FR92** | L'enseignant peut exporter au format LSU XML | - Generateur Rust quick-xml<br>- Par periode ou annee complete<br>- Export partiel (un seul eleve) possible<br>- Checklist pre-export (completude)<br>- Absences auto-integrees (totaux par periode, justifiees + injustifiees separement)<br>- Fallback CSV/PDF si XML non viable | Should | M4 |
| **FR93** | L'enseignant peut saisir les identifiants ONDE | - UAI (etablissement), INE (eleve)<br>- Saisie manuelle dans les parametres<br>- Import CSV optionnel (export Base Eleves)<br>- Requis uniquement pour l'export LSU | Should | M4 |

---

### 3.5 Infrastructure IA

| ID | Description | Criteres d'acceptation | Priorite | Module |
|----|-------------|----------------------|----------|--------|
| **FR38** | Le micro dual-mode enregistre et envoie a Whisper | - Tap court (<300ms) = toggle continu, press long (>300ms) = push-to-talk<br>- WAV PCM 16kHz<br>- Whisper STT < 5 secondes pour 15s d'audio | Must | IA |
| **FR45** | Le sidecar whisper-server demarre a la demande | - Healthcheck HTTP, arret apres 30s inactivite, watchdog restart | Must | IA |
| **FR46** | Le sidecar llama-server supporte 3 jobs LLM | - Job 1 : classifier domaine (GBNF dynamique, < 5s)<br>- Job 2 : synthetiser par domaine (on-demand, < 10s)<br>- Job 3 : appreciation generale (on-demand, < 15s)<br>- Un seul job a la fois (pipeline sequentiel) | Must | IA |
| **FR47** | Pipeline sequentiel (inchange) | - Un seul sidecar actif, compatible 4 Go RAM | Must | IA |
| **FR49** | Validateur 4 couches (inchange) | - Prompt, GBNF, Rust, Prepared Statements | Must | IA |
| **FR50** | VAD natif (inchange) | - `--vad` whisper.cpp | Must | IA |

---

### 3.6 Gestion des Modeles IA (inchange V2)

FR51-FR53 conservees.

---

### 3.7 Configuration (evolue V2.1)

| ID | Description | Criteres d'acceptation | Priorite | Module |
|----|-------------|----------------------|----------|--------|
| **FR54** | Configuration des periodes scolaires | - Trimestres ou semestres, dates, rattachees a l'annee active | Must | Config |
| **FR55** | Page parametres accessible | - Sections : Annee scolaire, Periodes, Niveaux, Domaines, Modeles IA, LSU, Import CSV | Must | Config |
| **FR56** | Navigation entre les 4 modules | - Module 1 = vue par defaut<br>- Transition < 300ms<br>- Etat conserve | Must | Config |
| **FR58** | Gestion annee scolaire | - Creation, active unique, cloture → lecture seule, reouverture | Must | Config |
| **FR59** | Attribution niveaux scolaires par eleve | - PS-CM2, individuel ou masse, niveau → cycle → domaines | Must | Config |
| **FR94** | Import CSV eleves | - Import fichier CSV (prenom, niveau PS-CM2, optionnel: nom)<br>- Rapport d'import (nb eleves importes, erreurs)<br>- Debut d'annee scolaire | Must | Config |
| **FR65** | Assistant de rentree (wizard) | - 4 etapes, conserver eleves ou nouvelle classe | Should | Config |

---

### 3.8 Capture Audio (inchange V2)

FR57 conservee (tauri-plugin-mic-recorder / Web Audio API fallback).

---

## 4. Non-Functional Requirements

### 4.1 Performance

| ID | Description | Cible | Priorite |
|----|-------------|-------|----------|
| **NFR1** | Actions utilisateur rapides | < 1 seconde | Must |
| **NFR2** | Lancement app | < 3 secondes (sans sidecars) | Must |
| **NFR3** | Mise a jour TBI | < 500ms | Must |
| **NFR4** | Raccourci clavier global | < 1 seconde | Must |
| **NFR5** | Transcription Whisper | < 5 secondes pour 15s audio | Must |
| **NFR6** | Classification LLM (Job 1) | < 5 secondes | Must |
| **NFR31** | Synthese LLM (Job 2) | < 10 secondes par domaine | Must |
| **NFR32** | Appreciation generale LLM (Job 3) | < 15 secondes | Should |
| **NFR7** | Pipeline total dictee→validation | < 15 secondes | Must |
| **NFR8** | Attribution recompenses 16h30 | < 1 seconde pour 30 eleves | Must |

### 4.2 Securite et Conformite RGPD

NFR9-NFR12 conservees.

### 4.3 Compatibilite et Deploiement

NFR13-NFR17 conservees.

### 4.4 Fiabilite

NFR18-NFR22 conservees.

### 4.5 Accessibilite TBI

NFR23-NFR27 conservees.

### 4.6 Migrations et Donnees (evolue V2.1)

| ID | Description | Cible | Priorite |
|----|-------------|-------|----------|
| **NFR28** | Migrations BDD additives et non destructives | Backup auto, rollback, zero perte | Must |
| **NFR29** | Export LSU XML conforme | Structure Pleiade, fallback CSV/PDF | Should |
| **NFR30** | Undo observations fiable | < 1 seconde, swap atomique | Must |
| **NFR33** | Event sourcing immuable | `evenements_pedagogiques` append-only, jamais de DELETE/UPDATE | Must |
| **NFR34** | Versioning syntheses | 4-5 versions conservees, restauration possible | Must |

---

## 5. Data Model

### 5.1 Tables existantes (conservees)

Tables V1 (`students`, `sanctions`, `daily_rewards`) et V2 (`config_periodes`, `comportement_detail`, `domaines_apprentissage`, `models_status`) conservees.

**Note :** La table `comportement_detail` (Module 2) reste en BDD pour retrocompatibilite mais n'est plus alimentee. Les incidents sont desormais des `evenements_pedagogiques`.

### 5.2 Nouvelles tables V2.1-rev2

#### Evenements pedagogiques (event sourcing)

```sql
CREATE TABLE evenements_pedagogiques (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  uuid TEXT UNIQUE,                          -- future sync mobile (V4)
  eleve_id INTEGER NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  annee_scolaire_id INTEGER NOT NULL REFERENCES annees_scolaires(id),
  periode_id INTEGER REFERENCES config_periodes(id),
  type TEXT NOT NULL CHECK(type IN ('observation', 'evaluation', 'motif_sanction')),
  domaine_id INTEGER REFERENCES domaines_apprentissage(id),  -- NULL si observation diverse
  lecon TEXT,                                -- NULL si pas evaluation
  niveau_lsu TEXT CHECK(niveau_lsu IN (
    'non_atteints', 'partiellement_atteints', 'atteints', 'depasses'
  )),                                        -- NULL si observation
  observations TEXT,
  texte_dictation TEXT,                      -- transcription brute Whisper
  source TEXT DEFAULT 'manual' CHECK(source IN ('vocal', 'manual')),
  created_at TEXT DEFAULT (datetime('now')),
  synced_at TEXT                              -- future sync mobile (V4)
);

CREATE INDEX idx_events_eleve ON evenements_pedagogiques(eleve_id);
CREATE INDEX idx_events_annee ON evenements_pedagogiques(annee_scolaire_id);
CREATE INDEX idx_events_periode ON evenements_pedagogiques(periode_id);
CREATE INDEX idx_events_domaine ON evenements_pedagogiques(domaine_id);
CREATE INDEX idx_events_type ON evenements_pedagogiques(type);
```

#### Syntheses LSU (versionnees)

```sql
CREATE TABLE syntheses_lsu (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  eleve_id INTEGER NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  periode_id INTEGER NOT NULL REFERENCES config_periodes(id),
  domaine_id INTEGER NOT NULL REFERENCES domaines_apprentissage(id),
  version INTEGER DEFAULT 1,
  contenu TEXT NOT NULL,
  generated_by TEXT DEFAULT 'llm' CHECK(generated_by IN ('llm', 'manual')),
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX idx_syntheses_eleve ON syntheses_lsu(eleve_id);
CREATE INDEX idx_syntheses_periode ON syntheses_lsu(periode_id);
CREATE INDEX idx_syntheses_domaine ON syntheses_lsu(domaine_id);
```

#### Appreciations generales (versionnees)

```sql
CREATE TABLE appreciations_generales (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  eleve_id INTEGER NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  periode_id INTEGER NOT NULL REFERENCES config_periodes(id),
  version INTEGER DEFAULT 1,
  contenu TEXT NOT NULL,
  generated_by TEXT DEFAULT 'llm' CHECK(generated_by IN ('llm', 'manual')),
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX idx_appre_gen_eleve ON appreciations_generales(eleve_id);
CREATE INDEX idx_appre_gen_periode ON appreciations_generales(periode_id);
```

#### Absences refonte (demi-journee)

```sql
CREATE TABLE absences_v2 (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  eleve_id INTEGER NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  date TEXT NOT NULL,                        -- YYYY-MM-DD
  demi_journee TEXT NOT NULL CHECK(demi_journee IN ('matin', 'apres_midi')),
  type_absence TEXT NOT NULL CHECK(type_absence IN ('justifiee', 'medicale', 'injustifiee')),
  motif TEXT,
  retard INTEGER DEFAULT 0,                  -- present mais en retard
  annee_scolaire_id INTEGER NOT NULL REFERENCES annees_scolaires(id),
  created_at TEXT DEFAULT (datetime('now')),
  UNIQUE(eleve_id, date, demi_journee)
);

CREATE INDEX idx_absences_v2_eleve ON absences_v2(eleve_id);
CREATE INDEX idx_absences_v2_annee ON absences_v2(annee_scolaire_id);
CREATE INDEX idx_absences_v2_date ON absences_v2(date);
```

### 5.3 Tables conservees de V2.1 initiale

- `annees_scolaires` (creation/active/cloture)
- `niveaux_classe` (niveaux presents par annee)
- `config_lsu` (UAI, INC)
- Colonnes ajoutees : `students.niveau`, `students.annee_id`, `students.ine`
- `domaines_apprentissage` enrichi (cycle, code_lsu, is_custom)

### 5.4 Tables deprecated

- `appreciations` : conservee pour retrocompatibilite donnees V2 existantes, plus alimentee
- `comportement_detail` : conservee pour retrocompatibilite, plus alimentee

### 5.5 Relations

```
annees_scolaires (conteneur principal)
  |
  +--< evenements_pedagogiques.annee_scolaire_id
  +--< absences_v2.annee_scolaire_id
  +--< niveaux_classe.annee_id
  +--< config_periodes.annee_id
  +--< students.annee_id
  +--< config_lsu.annee_id

students (table centrale)
  |  (niveau = PS-CM2, determine le cycle → domaines)
  |
  +--< evenements_pedagogiques (1:N, observations/evaluations/motifs)
  +--< syntheses_lsu (1:N, par domaine et periode, versionnees)
  +--< appreciations_generales (1:N, par periode, versionnees)
  +--< absences_v2 (1:N, par demi-journee)
  +--< sanctions (1:N, comportement)
  +--< daily_rewards (1:N)

config_periodes
  |
  +--< evenements_pedagogiques.periode_id
  +--< syntheses_lsu.periode_id
  +--< appreciations_generales.periode_id

domaines_apprentissage (filtres par cycle)
  |
  +--< evenements_pedagogiques.domaine_id
  +--< syntheses_lsu.domaine_id
```

---

## 6. User Interaction Flows

### 6.1 Flow : Observation spontanee via micro (Module 1)

```
1. L'enseignant voit un eleve qui progresse/regresse
2. Tap court (<300ms) sur le micro de la carte de l'eleve → toggle enregistrement
   OU press long (>300ms) → push-to-talk (relache = stop)
3. Dicte pendant 30s-2min
4. Whisper STT → texte editable (TranscriptPreview)
5. LLM classifie le domaine automatiquement
6. Carte editable avec diff Avant/Apres, reassignation domaine possible
7. Valider → evenements_pedagogiques (type=observation, domaine=auto)
   OU Rejeter → rien ne se passe
```

### 6.2 Flow : Appel du matin/apres-midi (Module 2)

```
1. Enseignant ouvre le Registre d'appel
2. Grille eleves affichee (defaut: tous presents)
3. Toggle absent pour chaque eleve absent
4. Pour chaque absent : select type (justifiee/medicale/injustifiee)
5. Optionnel : ajouter motif (texte ou vocal)
6. Si retard : toggle retard (present + flag)
7. Les totaux se calculent automatiquement
8. Si 4+ injustifiees/30j : badge alerte rouge s'affiche
```

### 6.3 Flow : Saisie evaluation (Module 3)

```
1. Enseignant ouvre le Module Evaluations
2. Selectionne l'eleve (ou mode lot : tous les eleves)
3. Saisit le nom de la lecon
4. Selectionne le domaine (filtre par cycle)
5. Selectionne le niveau LSU (4 niveaux)
6. Ajoute des observations (texte ou vocal)
7. Valider → evenements_pedagogiques (type=evaluation)
```

### 6.4 Flow : Generation synthese LSU (Module 4)

```
1. Enseignant ouvre LSU Vivant → vue par eleve
2. Selectionne un eleve
3. Voit les domaines de son cycle avec les syntheses existantes
4. Clique "Synthetiser" sur un domaine
5. LLM Job 2 genere une synthese a partir de toutes les observations/evaluations
6. Synthese affichee dans champ editable
7. Enseignant modifie si besoin (texte ou vocal)
8. Valider → syntheses_lsu (version N+1, conserve N-1 a N-4)
```

### 6.5 Flow : Appreciation generale (Module 4)

```
1. Enseignant ouvre LSU Vivant → vue par eleve
2. Section "Appreciation generale" en bas
3. Clique "Generer"
4. LLM Job 3 synthetise cross-domaines + comportement avec tact
5. Brouillon affiche dans champ editable (max 1500 car.)
6. Enseignant modifie librement
7. Valider → appreciations_generales (version N+1)
```

### 6.6 Flow : Export LSU XML (Module 4)

```
1. Enseignant ouvre LSU Vivant → Export
2. Checklist pre-export :
   - Identifiants ONDE (UAI, INE par eleve)
   - Syntheses par domaine (% completude)
   - Appreciations generales (presence par eleve)
   - Niveaux LSU attribues (% completude)
   - Absences comptabilisees
3. Selection : periode ou annee, un eleve ou tous
4. Exporter → XML genere via Rust quick-xml
5. Si XSD non public : fallback CSV/PDF
```

### 6.7 Flow : Undo observation/synthese

```
1. Enseignant constate une erreur sur une synthese/observation
2. Bouton versions → liste des 4-5 dernieres versions
3. Selectionne la version a restaurer
4. Confirmation → version restauree
   (observations : swap atomique previous_observations)
   (syntheses : nouvelle version = copie de l'ancienne)
```

### 6.8 Flows conserves

- 6.7 (ancien) : Sanction avec motif obligatoire (inchange)
- 6.5 (ancien) : Premier lancement / telechargement modeles (inchange)
- 6.6 (ancien) : Configuration periodes scolaires (inchange)
- 6.7 (ancien) : Creation annee scolaire (inchange)

---

## 7. Constraints & Assumptions

### 7.1 Contraintes techniques (conservees + ajouts)

| Contrainte | Impact | Mitigation |
|------------|--------|------------|
| **PC ecole 4 Go RAM** | Pipeline sequentiel obligatoire | Un seul sidecar actif |
| **Pas de GPU** | Inference CPU uniquement | Whisper.cpp + llama.cpp optimises CPU |
| **Mode portable** | .exe unique | Modeles dans AppData |
| **100% offline** | Pas de cloud | Tout local |
| **3 jobs LLM** | Plus de temps total si les 3 sont lances | On-demand, pas automatique |
| **Event sourcing append-only** | Table peut grossir | Archive annuelle, VACUUM |
| **XSD LSU non public** | Reverse-engineering | Fallback CSV/PDF |

### 7.2 Contraintes metier (conservees + ajouts)

| Contrainte | Description |
|------------|-------------|
| **Mono-user** | Un enseignant, une classe, une DB |
| **18 eleves** | Effectif reel, max 30 |
| **Multi-niveaux** | PS-CM2 dans la meme classe |
| **Double saisie appel** | Papier (officiel) + app (calcul auto) |
| **Sanctions ≠ apprentissage** | Jamais melanges |
| **Synthese on-demand** | Jamais automatique |
| **Comportement avec tact** | Le LLM formule toujours positivement |

### 7.3 Hors scope V2.1

| Feature | Version cible |
|---------|--------------|
| Canvas infini (grille temporelle Miro-like) | V3 |
| Sync mobile Bluetooth/WiFi Direct | V4 |
| Cantine/etude | Jamais |
| Cahier navette | Jamais |
| Embeddings / recherche semantique | V3 si besoin |
| Multi-user / multi-poste | V4 (sync) |

---

## 8. Recapitulatif des Requirements

### Par module

| Module | FRs | Count |
|--------|-----|-------|
| Module 1 — Comportement Classe (enrichi) | FR1-FR30, FR70-FR72 | 33 |
| Module 2 — Registre d'Appel | FR73-FR79 | 7 |
| Module 3 — Evaluations | FR80-FR84 | 5 |
| Module 4 — LSU Vivant | FR85-FR93 | 9 |
| Infrastructure IA | FR38, FR45-FR47, FR49-FR50 | 6 |
| Gestion des Modeles | FR51-FR53 | 3 |
| Configuration + Annee scolaire | FR54-FR56, FR58-FR59, FR65, FR94 | 7 |
| Capture Audio | FR57 | 1 |
| **TOTAL** | | **71** |

### Par priorite

| Priorite | Count | Pourcentage |
|----------|-------|-------------|
| Must | 60 | 85% |
| Should | 11 | 15% |
| **TOTAL** | **71** | **100%** |

### NFRs

| Categorie | Count |
|-----------|-------|
| Performance | 10 |
| Securite et RGPD | 4 |
| Compatibilite et Deploiement | 5 |
| Fiabilite | 5 |
| Accessibilite TBI | 5 |
| Migrations et Donnees | 5 |
| **TOTAL** | **34** |

---

## 9. Decisions Architecturales (Reference)

### ADRs conservees V2

- ADR-001 : JSON pas SQL (LLM output)
- ADR-002 : Pipeline sequentiel (4 Go RAM)
- ADR-003 : VAD natif whisper.cpp
- ADR-004 : Watchdog whisper-server
- ADR-005 : tauri-plugin-mic-recorder + Web Audio fallback
- ADR-006 : Qwen 2.5 Coder 1.5B

### ADRs conservees V2.1

- ADR-007 : GBNF dynamique
- ADR-008 : Budget tokens adaptatif
- ADR-010 : Undo atomique
- ADR-011 : Annee scolaire flag+guard
- ADR-012 : Export LSU XML quick-xml
- ADR-013 : Migrations backup+savepoints

### ADRs nouvelles/modifiees V2.1-rev2

| ADR | Decision | Justification |
|-----|----------|---------------|
| **ADR-009-rev** | Review panel → TranscriptPreview (inline, par carte eleve) | Plus naturel : le micro est sur la carte, la preview aussi |
| **ADR-014** | Event sourcing leger | Table `evenements_pedagogiques` immutable, append-only. Les syntheses et appreciations generales sont des vues materialisees versionnees. |
| **ADR-015** | 3 jobs LLM | Classification (GBNF dynamique, < 5s), Synthese (prompt adaptatif, < 10s), Appreciation generale (cross-domaines, < 15s). Un seul job a la fois. |
| **ADR-016** | Micro dual-mode par eleve | onPointerDown/onPointerUp avec seuil ~300ms. Tap court = toggle, press long = push-to-talk. |
| **ADR-017** | Double vue LSU | Par eleve (tous domaines) ET par domaine (tous eleves). Miroir de l'interface Pleiade. |
| **ADR-018** | Suppression Module 2 | Suivi individuel remplace par vues filtrees dans Evaluations et LSU Vivant. Table `comportement_detail` conservee read-only. |
| **ADR-019** | Registre d'appel | Nouvelle table `absences_v2` avec demi-journees, 3 types, motifs, retards. Alerte glissante 30 jours. |
| **ADR-020** | Import CSV eleves | Parsing CSV simple (prenom, niveau), rapport d'import. Pas de mapping complexe. |

---

## 10. Glossaire

Glossaire V2.1 initiale conserve + ajouts :

| Terme | Definition |
|-------|------------|
| **Event sourcing** | Pattern architectural ou chaque changement est capture comme un evenement immutable |
| **Synthese LSU** | Texte genere par le LLM resumant les observations/evaluations d'un domaine pour une periode |
| **Dual-mode micro** | Bouton micro avec 2 modes : tap court (toggle) et press long (push-to-talk) |
| **Double vue LSU** | Visualisation du LSU par eleve (tous domaines) ou par domaine (tous eleves) |
| **Registre d'appel** | Document officiel de suivi des presences/absences par demi-journee |
| **Demi-journee** | Matin ou apres-midi, unite de comptage des absences |
| **Alerte legale** | Obligation de signalement si 4+ demi-journees injustifiees par mois |

---

**Document genere le :** 2026-02-24
**Revision majeure post-brainstorming**
**Prochain livrable :** Revision Architecture V2.1 + Revision Epics & Stories
