---
stepsCompleted: [step-01-validate-prerequisites, step-02-design-epics, step-03-create-stories, step-04-final-validation]
inputDocuments:
  - product-brief-comportement-2026-02-10.md
  - prd-v2.md
  - ux-design-v2.md
  - suivi-comportement-briefing-complet.md
  - research/technical-ia-locale-tauri-sidecars-research-2026-02-10.md
  - archive-v1/epics.md
  - archive-v1/architecture.md
workflowType: 'epics-and-stories'
project_name: 'comportement'
user_name: 'Uhama'
date: '2026-02-10'
author: 'Uhama'
version: 'V2'
previous_version: 'V1 (2026-01-26) - archive-v1/epics.md'
---

# Comportement V2 - Epics & Stories

## Overview

Ce document definit les epics et stories d'implementation pour la V2 du projet Comportement. La V2 transforme l'application existante (V1 en production) en une plateforme de suivi pedagogique a 3 modules avec IA locale (100% offline, conforme RGPD).

**Documents source :**
- PRD V2 : 57 Functional Requirements, 27 Non-Functional Requirements
- UX Design V2 : 10 composants, 7 flux d'ecrans, mode TBI, dictee vocale
- Recherche technique : Whisper.cpp, Qwen 2.5, sidecars Tauri, GBNF, securite 4 couches

**Relation avec les Epics V1 :**
- Epics 1-6 : Completes et en production (core V1)
- Epic 7 (Recompenses) : Stories 7.1-7.4 completees, 7.5 a verifier
- Epic 8 (Grille cartes) : Stories 8.1, 8.2, 8.4 completees, 8.3 a verifier
- Epic 9 (Sidebar) : Non commence, reporte a V2.2 (hors scope V2 MVP)

**Epics V2 :** Numerotes a partir de 10, pour les nouvelles fonctionnalites.

---

## Requirements Inventory

### Functional Requirements (57 FRs)

**Module 1 — Comportement Classe (FR1-FR30) :**
- FR1-FR5 : Gestion des eleves (CRUD, max 30) — V1 existant
- FR6-FR9 : Systeme d'avertissements (1-2-3, reset 16h30) — V1 existant
- FR10-FR15 : Systeme de sanctions (emojis tristes, motif obligatoire V2, export enrichi) — V1 evolue
- FR16-FR18 : Gestion des absences (nouveau V2)
- FR19-FR21 : Systeme de recompenses (V1 existant)
- FR22-FR24 : Interface en cartes (V1 existant)
- FR25-FR26 : Historique et export enrichi (V1 evolue)
- FR27-FR30 : Integration systeme (V1 existant)

**Module 2 — Comportement Individuel (FR31-FR37) :**
- FR31 : Fiche detaillee eleve
- FR32 : Saisie d'incidents detailles
- FR33-FR34 : Historique par eleve avec filtres
- FR35-FR36 : Modification/suppression d'incidents
- FR37 : Dictee vocale pour description incident (Could)

**Module 3 — Domaines d'Apprentissage (FR38-FR44) :**
- FR38 : Push-to-talk capture audio
- FR39 : Transcription automatique Whisper
- FR40 : Structuration LLM par domaine
- FR41 : Validation et insertion en base
- FR42 : Vue tableau appreciations
- FR43 : Saisie manuelle alternative
- FR44 : Domaines parametrables

**Infrastructure IA (FR45-FR50) :**
- FR45-FR46 : Sidecars on-demand (whisper-server, llama-server)
- FR47 : Pipeline sequentiel
- FR48-FR49 : Sortie JSON + validateur Rust 4 couches
- FR50 : VAD natif whisper.cpp

**Gestion des Modeles (FR51-FR53) :**
- FR51 : Ecran premier lancement
- FR52 : Stockage app_data_dir
- FR53 : Installation USB alternative

**Configuration (FR54-FR56) :**
- FR54 : Periodes scolaires configurables
- FR55 : Page parametres
- FR56 : Navigation entre modules

**Capture Audio (FR57) :**
- FR57 : Capture micro WAV PCM 16-bit 16kHz

### Non-Functional Requirements (27 NFRs)

- NFR1-NFR8 : Performance (actions < 1s, transcription < 5s, pipeline < 15s)
- NFR9-NFR12 : Securite et RGPD (donnees locales, validation 4 couches)
- NFR13-NFR17 : Compatibilite et deploiement (Windows 4 Go RAM, portable, < 2 Go)
- NFR18-NFR22 : Fiabilite (sauvegarde auto, resets 100%, watchdog)
- NFR23-NFR27 : Accessibilite TBI (lisible 6m, contraste WCAG AA, daltonisme-friendly)

### Additional Requirements (Architecture + UX)

**Architecture :**
- Restructuration modulaire V1 vers `modules/` + `shared/`
- Migrations SQLite V2 incrementales (nouvelles tables, pas de breaking changes)
- SidecarManager Rust custom (start on-demand, healthcheck, graceful shutdown, restart)
- Bundling binaires sidecars avec target triple (Windows x86_64, macOS ARM/x86)
- Grammaire GBNF custom pour contrainte JSON
- Pipeline sequentiel obligatoire sur PC 4 Go RAM

**UX :**
- Barre laterale de navigation (64px retractee, 200px deployee)
- Layout Module 2 en 2 panneaux (gauche 320px + droit flex)
- Composant VoiceDictation avec 4 etats (idle, recording, processing, done)
- Composant StructuredObservations (tableau editable)
- Selecteur de periode dans la barre d'outils
- Animations : bump avertissement, drop-in sanction, pop recompense, pulse push-to-talk
- Respect `prefers-reduced-motion`
- Toast notifications (3 sec auto-dismiss)

---

## FR Coverage Map

### Module 1 — Comportement Classe

| FR | Epic | Description |
|----|------|-------------|
| FR1-FR5 | V1 (Epics 1) | Gestion eleves — en production |
| FR6-FR9 | V1 (Epic 2) | Avertissements — en production |
| FR10-FR11 | V1 (Epic 3) | Sanctions base — en production |
| FR12 | Epic 11 | Motif obligatoire pour sanctions |
| FR13-FR14 | V1 (Epic 3) | Sanctions (limites, reset) — en production |
| FR15 | Epic 11 | Export JSON enrichi avec motifs |
| FR16-FR18 | V1 (Epic 7/8) | Absences — en production |
| FR19-FR21 | V1 (Epic 7) | Recompenses — en production |
| FR22-FR24 | V1 (Epic 8) | Interface cartes — en production |
| FR25-FR26 | Epic 11 | Historique + export enrichi V2 |
| FR27-FR30 | V1 (Epic 6) | Integration systeme — en production |

### Module 2 — Comportement Individuel

| FR | Epic | Description |
|----|------|-------------|
| FR31 | Epic 12 | Fiche individuelle eleve |
| FR32 | Epic 12 | Saisie incidents detailles |
| FR33-FR34 | Epic 12 | Historique par eleve + filtres periode |
| FR35-FR36 | Epic 12 | Modification/suppression incidents |
| FR37 | Epic 14 | Dictee vocale description incident |

### Module 3 — Domaines d'Apprentissage

| FR | Epic | Description |
|----|------|-------------|
| FR38 | Epic 14 | Push-to-talk capture audio |
| FR39 | Epic 14 | Transcription Whisper |
| FR40 | Epic 15 | Structuration LLM par domaine |
| FR41 | Epic 15 | Validation + insertion en base |
| FR42 | Epic 15 | Vue tableau appreciations |
| FR43 | Epic 15 | Saisie manuelle alternative |
| FR44 | Epic 15 | Domaines parametrables |

### Infrastructure IA

| FR | Epic | Description |
|----|------|-------------|
| FR45-FR46 | Epic 13 | Sidecars on-demand |
| FR47 | Epic 13 | Pipeline sequentiel |
| FR48-FR49 | Epic 13 | JSON output + validateur Rust |
| FR50 | Epic 13 | VAD natif whisper.cpp |

### Gestion des Modeles

| FR | Epic | Description |
|----|------|-------------|
| FR51 | Epic 16 | Ecran premier lancement + telechargement |
| FR52 | Epic 16 | Stockage app_data_dir |
| FR53 | Epic 16 | Installation USB |

### Configuration

| FR | Epic | Description |
|----|------|-------------|
| FR54 | Epic 10 | Configuration periodes scolaires |
| FR55 | Epic 10 | Page parametres |
| FR56 | Epic 10 | Navigation entre modules |

### Capture Audio

| FR | Epic | Description |
|----|------|-------------|
| FR57 | Epic 14 | Capture micro WAV PCM |

---

## Epic List

### Epic 10 : Restructuration Modulaire V1 vers V2
L'enseignant peut naviguer entre les 3 modules de l'application et configurer ses periodes scolaires. Le code est reorganise pour supporter l'architecture modulaire.
**FRs couverts :** FR54, FR55, FR56
**NFRs adresses :** NFR1, NFR2

### Epic 11 : Module 1 Evolutions (Comportement Classe)
L'enseignant peut sanctionner avec un motif obligatoire, et l'export JSON inclut toutes les donnees enrichies (motifs, absences).
**FRs couverts :** FR12, FR15, FR25, FR26

### Epic 12 : Module 2 — Comportement Individuel
L'enseignant peut documenter en detail les incidents comportementaux de chaque eleve, par periode scolaire, avec historique filtrable.
**FRs couverts :** FR31, FR32, FR33, FR34, FR35, FR36

### Epic 13 : Infrastructure IA — Sidecars
Le systeme gere les moteurs IA locaux (Whisper, Qwen) de maniere fiable et securisee, avec demarrage a la demande et validation 4 couches.
**FRs couverts :** FR45, FR46, FR47, FR48, FR49, FR50
**NFRs adresses :** NFR5, NFR6, NFR7, NFR10, NFR11, NFR16, NFR22

### Epic 14 : Capture Audio + Transcription
L'enseignant peut dicter ses observations vocalement et obtenir une transcription automatique en francais.
**FRs couverts :** FR37, FR38, FR39, FR57
**NFRs adresses :** NFR5, NFR7

### Epic 15 : Module 3 — Domaines d'Apprentissage
L'enseignant peut saisir des appreciations par domaine d'apprentissage, soit par dictee vocale structuree automatiquement, soit manuellement.
**FRs couverts :** FR40, FR41, FR42, FR43, FR44
**NFRs adresses :** NFR6, NFR7, NFR11

### Epic 16 : Gestion des Modeles GGUF
L'enseignant peut installer les modeles IA necessaires lors du premier lancement, par telechargement ou depuis une cle USB.
**FRs couverts :** FR51, FR52, FR53
**NFRs adresses :** NFR15

### Epic 17 : Polish et Distribution
L'application est testee, optimisee et distribuee en mode portable pour Windows et macOS.
**NFRs adresses :** NFR13, NFR14, NFR15, NFR16, NFR17, NFR21

---

## Ordre d'implementation recommande

| Sprint | Epics | Duree estimee | Objectif |
|--------|-------|--------------|----------|
| Sprint 1 | Epic 10 + Epic 11 | 1-2 semaines | Restructuration + evolutions Module 1 |
| Sprint 2 | Epic 13 + Epic 14 | 2-3 semaines | Infrastructure IA + capture audio |
| Sprint 3 | Epic 12 + Epic 15 | 2-3 semaines | Modules 2 et 3 complets |
| Sprint 4 | Epic 16 + Epic 17 | 1-2 semaines | Gestion modeles + distribution |

---

## Epic 10 : Restructuration Modulaire V1 vers V2

L'enseignant peut naviguer entre les 3 modules de l'application et configurer ses periodes scolaires. Le code est reorganise pour supporter l'architecture modulaire.

### Story 10.1 : Reorganiser l'arborescence en modules/ et shared/

As a developpeur,
I want reorganiser le code V1 en architecture modulaire,
So that les 3 modules puissent coexister sans conflits.

**Description :**
Deplacer les composants V1 existants dans `modules/comportement-classe/` et creer la structure `shared/` pour les elements communs (types, stores partages, composants UI). Le code continue de fonctionner a l'identique apres la reorganisation.

**Criteres d'acceptation :**

**Given** le code V1 actuel dans `src/`
**When** la reorganisation est terminee
**Then** l'arborescence suit ce schema :
```
src/
  modules/
    comportement-classe/
      components/ (StudentGrid, StudentGridCard, WeeklyRewardLine, etc.)
      index.tsx
    comportement-individuel/
      components/
      index.tsx
    apprentissage/
      components/
      index.tsx
  shared/
    components/ (SanctionReasonModal, AddStudentForm, ExportButton, etc.)
    stores/ (studentStore.ts)
    types/ (index.ts)
    utils/ (date.ts)
    hooks/ (useWindowSize.ts)
  App.tsx
```
**And** `npm run tauri dev` lance l'application sans erreur
**And** toutes les fonctionnalites V1 continuent de fonctionner (avertissements, sanctions, recompenses, absences, grille cartes, TBI, export)
**And** aucune regression visuelle
**And** la grille des eleves affiche les cartes en ordre alphabetique fixe (`firstName ASC`) — le tri par sanctions V1 (`weekSanctionCount DESC`) est supprime (FR22)

**FRs references :** FR22 (ordre alphabetique fixe)
**Priorite :** Must
**Taille :** M
**Dependances :** Aucune

---

### Story 10.2 : Migrations SQLite V2

As a developpeur,
I want ajouter les nouvelles tables V2 au schema SQLite existant,
So that les Modules 2 et 3 puissent stocker leurs donnees.

**Description :**
Ajouter les migrations incrementales dans `lib.rs` pour creer les tables V2 : `config_periodes`, `comportement_detail`, `domaines_apprentissage`, `appreciations`, `models_status`. Les tables V1 existantes (`students`, `sanctions`, `daily_rewards`, `absences`) restent inchangees — aucune migration necessaire pour les absences (table V1 `absences` couvre deja tous les besoins). La colonne `reason` de `sanctions` existe deja — le changement est dans la validation applicative (motif obligatoire).

**Criteres d'acceptation :**

**Given** la base de donnees V1 existante
**When** l'application demarre
**Then** les nouvelles tables sont creees sans erreur :
- `config_periodes` (id, annee_scolaire, type_periode, numero, date_debut, date_fin, nom_affichage)
- `comportement_detail` (id, eleve_id FK, date_incident, heure_incident, periode_id FK, type_evenement, motif, description, intervenant)
- `domaines_apprentissage` (id, nom, ordre_affichage, actif)
- `appreciations` (id, eleve_id FK, periode_id FK, domaine_id FK, date_evaluation, niveau, observations, texte_dictation)
- `models_status` (id, model_name, file_path, file_size, sha256, installed_at, version)
**And** les tables V1 existantes sont intactes (pas de breaking changes)
**And** les domaines d'apprentissage par defaut sont inseres (seed data : Francais, Mathematiques, Sciences, etc.)
**And** les index de performance sont crees
**And** les foreign keys sont actives (`PRAGMA foreign_keys = ON`)

**Given** les tables V2 existent deja
**When** l'application redemarre
**Then** aucune erreur (migrations idempotentes)

**FRs references :** Prerequis pour FR31-FR44, FR51-FR56
**Priorite :** Must
**Taille :** M
**Dependances :** Story 10.1

---

### Story 10.3 : Configuration des periodes scolaires

As a enseignant,
I want configurer mes periodes scolaires (trimestres ou semestres),
So that le suivi individuel et les appreciations soient organises par periode.

**Description :**
Implementer l'ecran de configuration des periodes dans la page Parametres. L'enseignant choisit entre trimestres (3 periodes) et semestres (2 periodes), puis definit les dates de debut/fin de chaque periode. Le store partage et la table `config_periodes` sont utilises. Le selecteur de periode dans la barre d'outils permet de filtrer les donnees par periode.

**Criteres d'acceptation :**

**Given** l'enseignant accede aux Parametres > Periodes scolaires
**When** il choisit le mode "Trimestres"
**Then** 3 lignes de periode apparaissent avec champs : nom d'affichage, date debut, date fin
**And** les valeurs par defaut sont pre-remplies (T1: 01/09-30/11, T2: 01/12-28/02, T3: 01/03-30/06)

**Given** l'enseignant choisit le mode "Semestres"
**When** il confirme
**Then** 2 lignes de periode apparaissent

**Given** l'enseignant valide les periodes
**When** il clique sur "Enregistrer"
**Then** les periodes sont sauvegardees en base dans `config_periodes`
**And** le selecteur de periode dans la barre d'outils affiche les periodes configurees
**And** la periode active est detectee automatiquement selon la date du jour

**Given** aucune periode n'est configuree
**When** l'enseignant accede au Module 2 ou 3
**Then** un message l'invite a configurer les periodes d'abord

**FRs references :** FR54, FR55
**Priorite :** Must
**Taille :** L
**Dependances :** Story 10.2

---

### Story 10.4 : Navigation entre modules

As a enseignant,
I want naviguer entre les 3 modules de l'application,
So that j'accede facilement au suivi global, individuel, ou aux appreciations.

**Description :**
Implementer la barre laterale de navigation (sidebar) definie dans le UX Design V2. La sidebar affiche les icones des 3 modules + Config + Export. Le Module 1 est la vue par defaut. La navigation est fluide (< 300ms). L'etat de chaque module est conserve lors du changement.

**Criteres d'acceptation :**

**Given** l'application est lancee
**When** je regarde la barre laterale gauche
**Then** je vois les icones : Classe (Module 1), Individuel (Module 2), Apprentissages (Module 3), Parametres, Export
**And** le Module 1 est actif par defaut (indicateur visuel)

**Given** je suis sur le Module 1
**When** je clique sur l'icone Module 2
**Then** la vue Module 2 s'affiche en < 300ms
**And** le Module 1 conserve son etat (positions, donnees chargees)

**Given** la fenetre est large (>= 1280px)
**When** je regarde la sidebar
**Then** elle est deployee (200px) avec icones + labels

**Given** la fenetre est moyenne (960-1279px)
**When** je regarde la sidebar
**Then** elle est retractee (64px) avec icones uniquement
**And** un tooltip apparait au survol

**Given** le mode TBI est active (F11)
**When** je regarde l'ecran
**Then** la sidebar est masquee (grille cartes plein ecran)

**FRs references :** FR56
**NFRs references :** NFR1 (< 300ms transition)
**Priorite :** Must
**Taille :** L
**Dependances :** Story 10.1

---

## Epic 11 : Module 1 Evolutions (Comportement Classe)

L'enseignant peut sanctionner avec un motif obligatoire, et l'export JSON inclut toutes les donnees enrichies (motifs, absences).

### Story 11.1 : Motif obligatoire pour les sanctions

As a enseignant,
I want que le motif de sanction soit obligatoire,
So that chaque sanction soit justifiee pour les parents et l'inspecteur.

**Description :**
Modifier le composant SanctionReasonModal pour rendre la selection d'un motif obligatoire avant de pouvoir confirmer. Le bouton "Confirmer" est desactive tant qu'aucun motif n'est selectionne. Les motifs predefinis sont : "Bavardage", "Insolence", "Violence", "Non-respect des regles", "Autre" (avec champ libre). La colonne `reason` de la table `sanctions` existe deja — le changement est uniquement dans la validation front-end et la modale.

**Criteres d'acceptation :**

**Given** je clique sur "Sanctionner" pour un eleve
**When** la modale s'affiche
**Then** le bouton "Confirmer" est desactive (grise)
**And** les motifs predefinis sont affiches sous forme de radio buttons

**Given** la modale est ouverte sans motif selectionne
**When** je tente de cliquer sur "Confirmer"
**Then** rien ne se passe (bouton desactive)

**Given** j'ai selectionne un motif (ex: "Bavardage")
**When** je clique sur "Confirmer"
**Then** la sanction est enregistree avec le motif "Bavardage"
**And** l'emoji triste apparait sur la carte
**And** la derniere recompense positive est annulee (si applicable)

**Given** j'ai selectionne "Autre"
**When** je ne remplis pas le champ libre
**Then** le bouton "Confirmer" reste desactive

**Given** j'ai selectionne "Autre" et saisi "Lancer des objets"
**When** je clique sur "Confirmer"
**Then** la sanction est enregistree avec le motif "Lancer des objets"

**Given** le 3eme avertissement se convertit en sanction automatique
**When** la conversion se produit
**Then** la modale de motif s'affiche automatiquement
**And** le motif par defaut "3 avertissements" est pre-selectionne mais modifiable

**FRs references :** FR12
**Priorite :** Must
**Taille :** S
**Dependances :** Aucune (composant V1 existant a modifier)

---

### Story 11.2 : Gestion des absences consolidee

As a enseignant,
I want que les absences soient correctement integrees au systeme complet,
So that les eleves absents soient exclus des statistiques et de l'export.

**Description :**
Verifier et consolider la fonctionnalite d'absence existante (V1 Epics 7/8) pour s'assurer que toutes les exigences V2 sont couvertes : pas d'avertissement/sanction possible sur un eleve absent, label "ABS" dans la ligne hebdo, exclusion des recompenses a 16h30. Cette story est principalement une verification + corrections si necessaire.

**Criteres d'acceptation :**

**Given** un eleve est marque absent
**When** je tente de lui donner un avertissement
**Then** l'action est bloquee (bouton desactive)

**Given** un eleve est marque absent
**When** 16h30 arrive
**Then** aucune recompense n'est attribuee pour cet eleve
**And** la case du jour affiche "ABS" dans la ligne L-M-J-V

**Given** un eleve etait absent et revient dans la journee
**When** je clique a nouveau sur "ABS"
**Then** la carte redevient normale
**And** l'eleve est de nouveau eligible aux actions et recompenses

**Given** l'export JSON est genere
**When** je consulte les donnees d'un eleve absent
**Then** les jours d'absence sont explicitement listes

**FRs references :** FR16, FR17, FR18
**Priorite :** Must
**Taille :** S
**Dependances :** Aucune (verification de l'existant)

---

### Story 11.3 : Export JSON enrichi V2

As a enseignant,
I want exporter toutes les donnees au format JSON avec les motifs de sanction et les absences,
So that je dispose d'un export complet pour analyse ou entretiens parents.

**Description :**
Enrichir la fonction `exportToJSON` du store pour inclure : les motifs de sanction pour chaque sanction, les absences par eleve et par semaine, les recompenses avec leur type et statut d'annulation. L'export est retrocompatible (motif = null pour les anciennes sanctions). Ajouter un selecteur pour export par periode ou complet.

**Criteres d'acceptation :**

**Given** j'ai des sanctions avec motifs
**When** je clique sur "Exporter JSON"
**Then** chaque sanction dans le JSON contient le champ `motif` avec la valeur saisie
**And** les anciennes sanctions (V1) ont `motif: null`

**Given** j'ai des eleves avec des absences
**When** je consulte l'export
**Then** les absences sont listees par date avec le nombre total

**Given** j'ai des recompenses annulees par sanction
**When** je consulte l'export
**Then** chaque recompense indique `cancelled: true/false` et `cancelledBy: [motif sanction]`

**Given** je choisis "Export par periode"
**When** la periode active est "Trimestre 2"
**Then** seules les donnees du trimestre 2 sont exportees

**Given** je choisis "Export complet"
**When** l'export est genere
**Then** toutes les donnees de l'annee scolaire sont incluses

**FRs references :** FR15, FR25, FR26
**Priorite :** Must
**Taille :** M
**Dependances :** Story 10.3 (periodes pour export par periode)

---

## Epic 12 : Module 2 — Comportement Individuel

L'enseignant peut documenter en detail les incidents comportementaux de chaque eleve, par periode scolaire, avec historique filtrable.

### Story 12.1 : Fiche individuelle eleve

As a enseignant,
I want acceder a la fiche detaillee d'un eleve,
So that je voie son historique comportemental complet.

**Description :**
Creer la vue Module 2 avec le layout en 2 panneaux defini dans le UX Design (panneau gauche 320px avec info resume + actions rapides, panneau droit flex avec onglets). La navigation se fait depuis la grille de cartes (double-clic sur un prenom) ou depuis le Module 2 (selecteur d'eleve). Le panneau gauche affiche : initiales/avatar, prenom, avertissements aujourd'hui, sanctions semaine, recompenses, absences. Le panneau droit affiche les onglets Comportement et Historique.

**Criteres d'acceptation :**

**Given** je suis sur le Module 1 (grille de cartes)
**When** je double-clique sur le prenom d'un eleve
**Then** le Module 2 s'affiche avec la fiche de cet eleve
**And** un bouton "Retour" permet de revenir a la grille

**Given** je suis sur le Module 2
**When** j'utilise le selecteur d'eleve (dropdown)
**Then** la fiche change pour l'eleve selectionne

**Given** la fiche d'un eleve est affichee
**When** je regarde le panneau gauche
**Then** je vois : initiales, prenom, avertissements aujourd'hui, sanctions cette semaine, recompenses cette semaine (ligne L-M-J-V), nombre d'absences cette periode
**And** les boutons d'actions rapides [Avertir] [Sanctionner] [Absent] sont disponibles

**Given** l'ecran est etroit (< 1024px)
**When** je regarde la fiche
**Then** le layout passe en 1 colonne empilee (en-tete + onglets en pleine largeur)

**FRs references :** FR31
**Priorite :** Must
**Taille :** L
**Dependances :** Story 10.1, Story 10.4

---

### Story 12.2 : Saisie d'incidents detailles

As a enseignant,
I want saisir un incident detaille pour un eleve,
So that je documente chaque evenement avec son contexte.

**Description :**
Creer le formulaire de saisie d'incident dans le Module 2. Le formulaire contient : date (defaut: aujourd'hui), heure (defaut: heure actuelle), type d'evenement (dropdown predefini), motif (champ texte obligatoire), description (champ texte optionnel), intervenant (defaut: "Enseignant"). L'incident est enregistre dans la table `comportement_detail` avec la FK vers `config_periodes` (periode active detectee automatiquement).

**Criteres d'acceptation :**

**Given** je suis sur la fiche d'un eleve
**When** je clique sur "Nouvel incident"
**Then** un formulaire s'affiche avec les champs pre-remplis :
- Date : aujourd'hui
- Heure : heure actuelle
- Type d'evenement : dropdown vide
- Motif : champ vide (obligatoire)
- Description : champ vide (optionnel)
- Intervenant : "Enseignant"

**Given** les types d'evenement disponibles
**When** j'ouvre le dropdown
**Then** je vois : "Comportement perturbateur", "Violence", "Insolence", "Non-respect du materiel", "Refus de travail", "Autre"

**Given** j'ai rempli tous les champs obligatoires
**When** je clique sur "Enregistrer"
**Then** l'incident est sauvegarde en base avec la FK vers la periode active
**And** il apparait dans l'historique de l'eleve
**And** un toast "Incident enregistre" confirme l'action

**Given** le champ motif est vide
**When** je tente de sauvegarder
**Then** un message d'erreur indique que le motif est obligatoire
**And** l'enregistrement est bloque

**Given** aucune periode n'est configuree
**When** j'essaie de creer un incident
**Then** la `periode_id` est NULL (pas de blocage, mais un message suggere de configurer les periodes)

**FRs references :** FR32
**Priorite :** Must
**Taille :** M
**Dependances :** Story 10.2, Story 10.3, Story 12.1

---

### Story 12.3 : Historique chronologique par eleve

As a enseignant,
I want consulter l'historique des incidents par eleve,
So that je puisse identifier des patterns comportementaux.

**Description :**
Implementer l'onglet Historique dans la fiche eleve (Module 2). L'historique affiche les incidents tries par date decroissante, avec filtrage par type d'evenement et par periode scolaire. Un resume par periode montre le nombre d'incidents par type.

**Criteres d'acceptation :**

**Given** un eleve a des incidents enregistres
**When** j'ouvre l'onglet Historique
**Then** je vois la liste des incidents tries par date decroissante
**And** chaque incident affiche : date, heure, type, motif, description (si present), intervenant

**Given** l'historique est affiche
**When** je filtre par type "Violence"
**Then** seuls les incidents de type "Violence" sont affiches

**Given** l'historique est affiche
**When** je filtre par "Trimestre 1"
**Then** seuls les incidents dont la date est dans la plage du Trimestre 1 sont affiches

**Given** je selectionne une periode
**When** je regarde le resume
**Then** je vois le nombre total d'incidents et la repartition par type (ex: "Bavardage: 5, Violence: 1")

**Given** un eleve n'a aucun incident
**When** j'ouvre l'onglet Historique
**Then** un message "Aucun incident enregistre" est affiche

**FRs references :** FR33, FR34
**Priorite :** Must
**Taille :** M
**Dependances :** Story 12.2

---

### Story 12.4 : Modification et suppression d'incidents

As a enseignant,
I want modifier ou supprimer un incident,
So that je puisse corriger des erreurs de saisie.

**Description :**
Ajouter les actions de modification et suppression sur chaque incident de l'historique. La modification ouvre le meme formulaire que la saisie, pre-rempli avec les donnees existantes. La suppression demande une confirmation.

**Criteres d'acceptation :**

**Given** un incident existe dans l'historique
**When** je clique sur "Modifier"
**Then** le formulaire s'ouvre pre-rempli avec les donnees de l'incident
**And** tous les champs sont editables

**Given** j'ai modifie un incident
**When** je clique sur "Enregistrer"
**Then** l'incident est mis a jour en base
**And** l'historique se rafraichit

**Given** un incident existe dans l'historique
**When** je clique sur "Supprimer"
**Then** une confirmation s'affiche : "Supprimer cet incident ?"

**Given** je confirme la suppression
**When** je valide
**Then** l'incident est supprime definitivement de la base
**And** l'historique se met a jour

**Given** j'annule la suppression
**When** je clique sur "Annuler"
**Then** l'incident reste intact

**FRs references :** FR35, FR36
**Priorite :** Should
**Taille :** S
**Dependances :** Story 12.3

---

## Epic 13 : Infrastructure IA — Sidecars

Le systeme gere les moteurs IA locaux (Whisper, Qwen) de maniere fiable et securisee, avec demarrage a la demande et validation 4 couches.

### Story 13.1 : SidecarManager Rust

As a developpeur,
I want un gestionnaire de sidecars en Rust,
So that les moteurs IA soient demarres a la demande, surveilles et arretes proprement.

**Description :**
Implementer un module Rust `sidecar_manager` dans `src-tauri/src/` qui encapsule la gestion du cycle de vie des sidecars. Fonctionnalites : start on-demand (pas au lancement de l'app), healthcheck HTTP periodique, graceful shutdown (SIGTERM puis SIGKILL apres timeout), restart on failure, un seul sidecar actif a la fois (mode sequentiel sur PC 4 Go RAM). Le manager expose des commandes Tauri pour le frontend : `start_sidecar`, `stop_sidecar`, `get_sidecar_status`.

**Criteres d'acceptation :**

**Given** aucun sidecar n'est actif
**When** le frontend invoque `start_sidecar("whisper")`
**Then** le processus `whisper-server` est lance en tant que sidecar Tauri
**And** le manager attend le healthcheck HTTP (GET /health ou similaire)
**And** le frontend recoit un evenement `sidecar_ready("whisper")`

**Given** whisper-server est actif
**When** le frontend invoque `start_sidecar("llama")`
**Then** whisper-server est arrete d'abord (mode sequentiel)
**And** llama-server est lance ensuite
**And** le frontend recoit `sidecar_stopped("whisper")` puis `sidecar_ready("llama")`

**Given** un sidecar est actif
**When** le healthcheck echoue 3 fois consecutives
**Then** le sidecar est redemarreautomatiquement
**And** le frontend recoit `sidecar_restarting("whisper")`

**Given** l'application se ferme
**When** le processus Tauri termine
**Then** tous les sidecars sont arretes proprement (SIGTERM)
**And** apres un timeout de 5 secondes, SIGKILL est envoye si le processus est toujours actif

**Given** les binaires sidecars ne sont pas trouves (modeles pas encore telecharges)
**When** le frontend invoque `start_sidecar`
**Then** une erreur claire est retournee : "Modeles IA non installes"

**FRs references :** FR45, FR46, FR47
**NFRs references :** NFR16 (RAM < 2 Go sequentiel)
**Priorite :** Must
**Taille :** XL
**Dependances :** Aucune (module Rust independant)

---

### Story 13.2 : Integration whisper-server sidecar

As a developpeur,
I want integrer whisper-server comme sidecar Tauri,
So that la transcription vocale fonctionne localement.

**Description :**
Bundler le binaire `whisper-server` dans le projet Tauri avec les suffixes target triple (x86_64-pc-windows-msvc.exe, aarch64-apple-darwin). Configurer `tauri.conf.json` avec `externalBin`. Le sidecar est lance par le SidecarManager sur le port 8081 avec les parametres : modele small FR GGUF, langue francais, flag `--vad` pour Voice Activity Detection natif. L'endpoint d'inference est `POST /inference` (multipart form avec fichier WAV).

**Criteres d'acceptation :**

**Given** le binaire whisper-server est dans `src-tauri/binaries/`
**When** le build Tauri s'execute
**Then** le binaire est inclus dans le bundle pour la plateforme cible

**Given** le SidecarManager lance whisper-server
**When** le healthcheck reussit
**Then** whisper-server ecoute sur `localhost:8081`
**And** le modele GGUF est charge depuis `app_data_dir()/models/`
**And** le flag `--vad` est actif

**Given** un fichier WAV 16-bit 16kHz est envoye a `/inference`
**When** whisper-server transcrit
**Then** le texte transcrit en francais est retourne en < 5 secondes (pour 15 sec d'audio)

**Given** whisper-server est lance sans modele GGUF
**When** le demarrage echoue
**Then** une erreur explicite est loguee et remontee au frontend

**FRs references :** FR45, FR50
**NFRs references :** NFR5 (< 5 sec transcription)
**Priorite :** Must
**Taille :** L
**Dependances :** Story 13.1

---

### Story 13.3 : Integration llama-server sidecar

As a developpeur,
I want integrer llama-server comme sidecar Tauri,
So that la structuration IA des observations fonctionne localement.

**Description :**
Bundler le binaire `llama-server` avec les suffixes target triple. Le sidecar est lance par le SidecarManager sur le port 8080 avec : modele Qwen 2.5 Coder 1.5B GGUF Q4, grammaire GBNF chargee au demarrage, ctx-size reduit (512-1024 tokens). L'API est OpenAI-compatible : `POST /v1/chat/completions`.

**Criteres d'acceptation :**

**Given** le binaire llama-server est dans `src-tauri/binaries/`
**When** le build Tauri s'execute
**Then** le binaire est inclus dans le bundle pour la plateforme cible

**Given** le SidecarManager lance llama-server
**When** le healthcheck reussit
**Then** llama-server ecoute sur `localhost:8080`
**And** le modele Qwen 2.5 est charge depuis `app_data_dir()/models/`
**And** la grammaire GBNF est active

**Given** une requete POST /v1/chat/completions avec un prompt contraint
**When** llama-server genere la reponse
**Then** la sortie est un JSON valide conforme a la grammaire GBNF
**And** le temps de reponse est < 5 secondes

**Given** la grammaire GBNF est chargee
**When** le modele genere des tokens
**Then** la structure JSON est garantie au niveau token (pas de SQL, pas de texte libre)

**FRs references :** FR46, FR48
**NFRs references :** NFR6 (< 5 sec structuration)
**Priorite :** Must
**Taille :** L
**Dependances :** Story 13.1

---

### Story 13.4 : Pipeline sequentiel on-demand

As a developpeur,
I want orchestrer les sidecars en mode sequentiel,
So that le pipeline fonctionne sur un PC ecole avec 4 Go de RAM.

**Description :**
Implementer le pattern de pipeline sequentiel dans le SidecarManager : (1) Push-to-talk declenche le demarrage de whisper-server, (2) Whisper transcrit, (3) Whisper s'arrete, (4) L'utilisateur corrige le texte, (5) "Structurer" declenche le demarrage de llama-server, (6) LLM genere le JSON, (7) llama-server s'arrete. Jamais les deux sidecars ne sont actifs simultanement. Optionnel : detection auto de 8 Go+ RAM pour mode concurrent.

**Criteres d'acceptation :**

**Given** le pipeline est declenche (push-to-talk relache)
**When** whisper-server doit transcrire
**Then** llama-server est arrete d'abord (s'il etait actif)
**And** whisper-server est lance
**And** apres transcription, whisper-server est arrete

**Given** l'utilisateur clique sur "Structurer"
**When** llama-server doit generer
**Then** whisper-server est arrete d'abord (s'il etait actif)
**And** llama-server est lance
**And** apres generation, llama-server est arrete

**Given** les deux sidecars ne sont jamais actifs simultanement
**When** je mesure la RAM pendant le pipeline
**Then** le pic est < 2 Go (un seul modele en memoire a la fois)

**Given** le PC a >= 8 Go de RAM (detection auto)
**When** le mode concurrent est active
**Then** les deux sidecars peuvent etre actifs simultanement (optionnel)

**FRs references :** FR47
**NFRs references :** NFR16 (< 2 Go RAM sequentiel), NFR7 (< 15 sec pipeline)
**Priorite :** Must
**Taille :** M
**Dependances :** Story 13.2, Story 13.3

---

### Story 13.5 : Watchdog whisper-server

As a developpeur,
I want un watchdog pour whisper-server,
So that les bugs de handle leak Windows soient geres automatiquement.

**Description :**
Implementer un watchdog dans le SidecarManager specifique a whisper-server. Le watchdog effectue un healthcheck HTTP apres chaque requete de transcription. Si la reponse est vide ou si le healthcheck echoue, le sidecar est redemarreautomatiquement. De plus, apres ~50 requetes cumulees, un redemarrage preventif est effectue (contournement du bug handle leak Windows, issue #3358).

**Criteres d'acceptation :**

**Given** whisper-server a transcrit avec succes
**When** le healthcheck post-requete reussit
**Then** rien ne se passe (fonctionnement normal)

**Given** whisper-server retourne une reponse vide
**When** le watchdog detecte la reponse vide
**Then** whisper-server est redemarreautomatiquement
**And** un log est emis : "Watchdog: restart whisper-server (reponse vide)"
**And** le frontend est notifie (evenement `sidecar_restarting`)

**Given** whisper-server a traite ~50 requetes
**When** le compteur atteint le seuil
**Then** un redemarrage preventif est effectue apres la prochaine inactivite

**Given** le healthcheck echoue 3 fois consecutives
**When** le watchdog detecte l'echec
**Then** whisper-server est redemarreavec les memes parametres

**FRs references :** FR45 (watchdog)
**NFRs references :** NFR22 (redemarrage auto)
**Priorite :** Must
**Taille :** M
**Dependances :** Story 13.2

---

### Story 13.6 : Validateur Rust 4 couches

As a developpeur,
I want un validateur Rust qui verifie chaque sortie LLM avant insertion en base,
So que l'injection soit impossible et les donnees soient toujours valides.

**Description :**
Implementer le validateur Rust avec les 4 couches de securite definies dans le PRD et la recherche technique :
- Couche 1 (Prompt) : Le system prompt limite le LLM aux operations INSERT sur les tables autorisees
- Couche 2 (GBNF) : La grammaire GBNF contraint la sortie JSON au niveau token
- Couche 3 (Validation Rust) : Parse le JSON, verifie table autorisee, types corrects, IDs coherents
- Couche 4 (Prepared Statements) : Rust reconstruit l'INSERT avec des prepared statements SQLite

Le validateur expose une commande Tauri `validate_and_insert_llm_output` qui recoit le JSON brut du LLM et retourne un resultat (succes ou erreur).

**Criteres d'acceptation :**

**Given** le LLM genere un JSON valide `{ "table": "appreciations", "row": { "eleve_id": 5, ... } }`
**When** le validateur recoit ce JSON
**Then** il verifie :
1. Le JSON est parsable
2. La table est dans la whitelist (`appreciations`, `comportement_detail`)
3. Les colonnes correspondent au schema de la table
4. `eleve_id` correspond a un eleve existant
5. `periode_id` correspond a une periode active (si present)
**And** si tout est valide, un INSERT est execute via prepared statement
**And** la commande retourne `{ "success": true, "insertedId": 42 }`

**Given** le JSON contient une table non autorisee (ex: "students")
**When** le validateur recoit ce JSON
**Then** le JSON est rejete avec erreur "Table non autorisee: students"
**And** aucun INSERT n'est execute

**Given** le JSON contient un `eleve_id` inexistant
**When** le validateur recoit ce JSON
**Then** le JSON est rejete avec erreur "eleve_id 999 introuvable"

**Given** le JSON est malformed (syntaxe invalide)
**When** le validateur recoit ce JSON
**Then** le JSON est rejete avec erreur "JSON invalide"

**Given** le LLM tente d'inclure du SQL dans le JSON
**When** le validateur recoit ce JSON
**Then** la grammaire GBNF empeche la generation de SQL (pas de passage a la couche Rust)
**And** si du SQL passe quand meme, le prepared statement le traite comme une valeur texte (pas d'injection)

**FRs references :** FR48, FR49
**NFRs references :** NFR10, NFR11 (> 95% inserts valides)
**Priorite :** Must
**Taille :** XL
**Dependances :** Story 13.3

---

## Epic 14 : Capture Audio + Transcription

L'enseignant peut dicter ses observations vocalement et obtenir une transcription automatique en francais.

### Story 14.1 : Integration tauri-plugin-mic-recorder

As a developpeur,
I want capturer l'audio du microphone au format WAV PCM 16-bit 16kHz,
So que l'audio puisse etre envoye a Whisper pour transcription.

**Description :**
Integrer `tauri-plugin-mic-recorder` (Plan A) pour capturer l'audio du microphone. Configurer la sortie en WAV PCM 16-bit, 16kHz, mono. La permission micro est demandee a l'utilisateur au premier usage. Le fichier WAV est sauvegarde dans un repertoire temporaire.

**Criteres d'acceptation :**

**Given** le plugin tauri-plugin-mic-recorder est installe
**When** le build compile
**Then** le plugin est disponible via Tauri IPC

**Given** l'utilisateur n'a jamais utilise le micro
**When** il demarre un enregistrement
**Then** le navigateur demande la permission micro
**And** si autorisee, l'enregistrement commence

**Given** la permission micro est accordee
**When** l'enregistrement demarre
**Then** l'audio est capture au format WAV PCM 16-bit 16kHz mono

**Given** l'enregistrement est arrete
**When** le fichier est sauvegarde
**Then** un fichier WAV temporaire est disponible dans le repertoire temp
**And** le chemin du fichier est retourne au frontend

**FRs references :** FR57
**Priorite :** Must
**Taille :** M
**Dependances :** Aucune

---

### Story 14.2 : Fallback Web Audio API

As a developpeur,
I want un fallback Web Audio API si tauri-plugin-mic-recorder echoue,
So que la capture audio fonctionne meme si le plugin pose probleme.

**Description :**
Implementer un fallback basee sur `navigator.mediaDevices.getUserMedia()` et l'API MediaRecorder. L'audio est capture cote frontend, converti en WAV PCM 16-bit 16kHz via un AudioWorklet, puis envoye au backend Rust via `invoke()`. La selection du plan (A ou B) est automatique au premier usage.

**Criteres d'acceptation :**

**Given** tauri-plugin-mic-recorder echoue au demarrage
**When** l'utilisateur tente d'enregistrer
**Then** le systeme bascule automatiquement sur Web Audio API
**And** un log indique "Fallback: Web Audio API active"

**Given** le fallback Web Audio est actif
**When** l'utilisateur enregistre
**Then** l'audio est capture en PCM 16kHz mono
**And** le format de sortie est identique au Plan A (WAV)

**Given** le micro est indisponible (pas de peripherique)
**When** l'utilisateur tente d'enregistrer
**Then** un message d'erreur clair s'affiche : "Aucun microphone detecte"

**FRs references :** FR57 (Plan B)
**Priorite :** Must
**Taille :** M
**Dependances :** Story 14.1

---

### Story 14.3 : Pipeline audio complet

As a enseignant,
I want dicter une observation et obtenir le texte transcrit,
So que je n'aie pas a taper au clavier.

**Description :**
Implementer le pipeline audio complet : push-to-talk (maintenir le bouton) → capture audio → fin enregistrement → invoke Rust → SidecarManager demarre whisper-server → envoi WAV a `/inference` → reception texte transcrit → affichage dans zone editable. Le frontend gere les etats : idle, recording, processing, done.

**Criteres d'acceptation :**

**Given** je suis sur le Module 3 (ou le formulaire incident Module 2)
**When** je maintiens le bouton push-to-talk enfonce
**Then** l'indicateur visuel "Enregistrement en cours" s'affiche (bouton rouge pulsant)
**And** le niveau audio est affiche en temps reel
**And** la duree est affichee

**Given** je relache le bouton push-to-talk
**When** l'enregistrement s'arrete
**Then** l'etat passe a "processing"
**And** whisper-server est demarre (si pas actif)
**And** l'audio est envoye a l'endpoint `/inference`
**And** une barre de progression indeterminee s'affiche

**Given** la transcription est terminee
**When** le texte est recu
**Then** le texte est affiche dans une zone editable
**And** l'etat passe a "done"
**And** les boutons "Re-dicter", "Effacer", "Structurer" sont disponibles

**Given** la transcription prend plus de 10 secondes
**When** un timeout est atteint
**Then** un message d'erreur s'affiche : "Transcription trop lente"
**And** un bouton "Reessayer" est disponible

**Given** whisper-server n'est pas disponible (modeles pas installes)
**When** je tente de dicter
**Then** un message clair s'affiche : "Modeles IA non installes. Allez dans Parametres > Modeles IA."

**FRs references :** FR38, FR39
**NFRs references :** NFR5 (< 5 sec pour 15 sec audio), NFR7 (pipeline < 15 sec)
**Priorite :** Must
**Taille :** L
**Dependances :** Story 13.1, Story 13.2, Story 14.1 ou 14.2

---

### Story 14.4 : Affichage et correction du texte transcrit

As a enseignant,
I want corriger le texte transcrit avant structuration,
So que les erreurs de transcription soient corrigees avant insertion en base.

**Description :**
Implementer la zone de texte editable qui affiche le resultat de la transcription Whisper. L'enseignant peut modifier librement le texte (corriger les erreurs de reconnaissance, ajouter des precisions). Les boutons d'action sont : "Re-dicter" (efface et recommence), "Effacer" (vide le champ), "Structurer" (envoie au LLM pour decomposition).

**Criteres d'acceptation :**

**Given** le texte transcrit est affiche
**When** je clique dans la zone de texte
**Then** je peux modifier le texte librement

**Given** le texte transcrit contient "progress" au lieu de "progresse"
**When** je corrige manuellement
**Then** le texte corrige est pret pour la structuration

**Given** je clique sur "Re-dicter"
**When** le texte est efface
**Then** je reviens a l'etat "idle" (bouton push-to-talk)

**Given** je clique sur "Structurer"
**When** le texte est envoye au LLM
**Then** l'etat passe a "structuration en cours" (barre de progression)

**FRs references :** FR39 (correction avant validation)
**Priorite :** Must
**Taille :** S
**Dependances :** Story 14.3

---

### Story 14.5 : Composant VoiceDictation

As a developpeur,
I want un composant VoiceDictation reutilisable,
So qu'il puisse etre utilise dans le Module 3 et dans le formulaire d'incident du Module 2.

**Description :**
Creer le composant React `VoiceDictation` avec 4 etats definis dans le UX Design :
1. **idle** : Bouton "Maintenir pour dicter" visible
2. **recording** : Bouton rouge pulsant, niveau audio, duree
3. **processing** : Barre de progression indeterminee, "Transcription en cours..."
4. **done** : Texte editable, boutons Re-dicter/Effacer/Structurer (ou juste Re-dicter/Effacer pour Module 2)

Le composant accepte un callback `onTranscriptionComplete(text)` et un mode `mode: "full" | "transcription-only"` (full = avec structuration, transcription-only = Module 2 description).

**Criteres d'acceptation :**

**Given** le composant est en mode "full" (Module 3)
**When** la transcription est terminee
**Then** les boutons "Re-dicter", "Effacer", "Structurer" sont affiches

**Given** le composant est en mode "transcription-only" (Module 2)
**When** la transcription est terminee
**Then** seuls les boutons "Re-dicter" et "Effacer" sont affiches
**And** le texte est directement utilisable dans le champ description

**Given** le composant est dans l'etat "recording"
**When** je regarde l'interface
**Then** le bouton pulse en rouge (animation `pulse-red` du UX Design)
**And** le niveau audio est affiche
**And** la duree est affichee

**Given** le composant respecte `prefers-reduced-motion`
**When** le systeme desactive les animations
**Then** la pulsation rouge est remplacee par un indicateur statique

**FRs references :** FR37 (Module 2), FR38 (Module 3)
**Priorite :** Must
**Taille :** M
**Dependances :** Story 14.3, Story 14.4

---

## Epic 15 : Module 3 — Domaines d'Apprentissage

L'enseignant peut saisir des appreciations par domaine d'apprentissage, soit par dictee vocale structuree automatiquement, soit manuellement.

### Story 15.1 : Interface tableau domaines x eleves

As a enseignant,
I want voir un tableau des appreciations par domaine et par eleve,
So que je visualise l'etat des evaluations de ma classe.

**Description :**
Creer la vue principale du Module 3 avec : un selecteur d'eleve (dropdown), un selecteur de periode, et un tableau affichant les domaines d'apprentissage en lignes avec pour chaque domaine : le niveau (dropdown), les observations (texte). Le composant `StructuredObservations` du UX Design est la base. Les donnees proviennent de la table `appreciations`.

**Criteres d'acceptation :**

**Given** je suis sur le Module 3
**When** je selectionne un eleve et une periode
**Then** le tableau affiche les domaines d'apprentissage avec les appreciations existantes
**And** les domaines sont : Francais, Mathematiques, Sciences et Technologies, Histoire-Geographie, EMC, EPS, Arts Plastiques, Education Musicale, Langues Vivantes

**Given** un eleve n'a aucune appreciation pour la periode
**When** je consulte le tableau
**Then** toutes les cellules sont vides avec un placeholder "Non evalue"

**Given** un eleve a des appreciations
**When** je consulte le tableau
**Then** chaque domaine affiche le niveau (Maitrise / En cours d'acquisition / Debut) et les observations

**Given** je selectionne un autre eleve
**When** le tableau se met a jour
**Then** les appreciations changent pour l'eleve selectionne

**FRs references :** FR42
**Priorite :** Must
**Taille :** M
**Dependances :** Story 10.2, Story 10.3, Story 10.4

---

### Story 15.2 : Pipeline LLM complet

As a enseignant,
I want que le texte dicte soit automatiquement structure par domaine,
So que les appreciations soient inserees sans saisie manuelle.

**Description :**
Implementer le pipeline complet : texte transcrit (valide par l'enseignant) → invoke Rust `structure_observation` → construction du prompt contraint avec contexte (eleve, periode, domaines) → envoi a llama-server avec grammaire GBNF → reception JSON structure → validation Rust 4 couches → affichage du resultat structure pour validation → INSERT via prepared statement. Le prompt systeme indique les domaines autorisees et le format JSON attendu.

**Criteres d'acceptation :**

**Given** l'enseignant a valide le texte transcrit "Nahel progresse bien en lecture, les fractions restent difficiles"
**When** il clique sur "Structurer"
**Then** llama-server est demarre (si pas actif)
**And** un prompt contraint est envoye avec le texte et la liste des domaines
**And** la grammaire GBNF contraint la sortie JSON

**Given** le LLM retourne le JSON structure
**When** le validateur Rust verifie
**Then** le JSON est valide (table = "appreciations", domaine existant, eleve correct)
**And** le resultat est affiche dans le composant StructuredObservations :
| Domaine | Competence | Niveau | Commentaire |
| Francais | Lecture | En cours d'acquisition | Progresse bien |
| Mathematiques | Fractions | Debut | Difficultes persistantes |

**Given** le resultat structure est affiche
**When** l'enseignant modifie un champ (ex: change le niveau)
**Then** la modification est prise en compte avant l'insertion

**Given** l'enseignant clique sur "Valider et enregistrer"
**When** l'insertion est executee
**Then** les appreciations sont inserees dans la table `appreciations` via prepared statements
**And** un toast "Appreciations enregistrees" confirme
**And** le tableau du Module 3 se met a jour

**Given** le LLM genere un JSON invalide
**When** le validateur Rust rejette
**Then** un message d'erreur s'affiche : "Le modele IA n'a pas pu traiter le texte"
**And** les boutons "Reessayer" et "Saisir manuellement" sont disponibles

**Given** le temps de structuration depasse 10 secondes
**When** le timeout est atteint
**Then** un message d'erreur s'affiche avec option de reessai

**FRs references :** FR40, FR41
**NFRs references :** NFR6 (< 5 sec), NFR7 (< 15 sec pipeline total), NFR11 (> 95% inserts valides)
**Priorite :** Must
**Taille :** XL
**Dependances :** Story 13.3, Story 13.4, Story 13.6, Story 14.5

---

### Story 15.3 : Affichage resultat structure avant validation

As a enseignant,
I want verifier et modifier le resultat de la structuration avant insertion,
So que les appreciations inserees soient correctes.

**Description :**
Implementer le composant `StructuredObservations` (UX Design section 5.6) : tableau editable avec colonnes Domaine, Competence, Niveau (dropdown), Commentaire. L'enseignant peut modifier chaque cellule, ajouter ou supprimer des lignes, avant de valider l'insertion finale.

**Criteres d'acceptation :**

**Given** le resultat structure est affiche dans le tableau
**When** je clique sur le dropdown "Niveau"
**Then** les options sont : (vide = "Non evalue"), "Debut", "En cours d'acquisition", "Maitrise"
**And** les valeurs DB correspondantes sont : NULL, "debut", "en_cours_acquisition", "maitrise" (alignement GBNF)

**Given** le LLM a detecte un mauvais domaine
**When** je change le domaine dans le dropdown
**Then** la valeur est mise a jour

**Given** je veux ajouter une observation supplementaire
**When** je clique sur "+ Ajouter ligne"
**Then** une nouvelle ligne vide apparait avec les dropdowns

**Given** je veux supprimer une ligne incorrecte
**When** je clique sur le bouton supprimer de la ligne
**Then** la ligne disparait

**Given** je suis satisfait du resultat
**When** je clique sur "Enregistrer"
**Then** toutes les lignes valides sont inserees en base
**And** le tableau du Module 3 se met a jour

**FRs references :** FR41 (apercu avant insertion)
**Priorite :** Must
**Taille :** M
**Dependances :** Story 15.2

---

### Story 15.4 : Saisie manuelle alternative

As a enseignant,
I want saisir manuellement une appreciation sans dictee vocale,
So que je puisse renseigner les evaluations meme si le micro est indisponible.

**Description :**
Ajouter un formulaire classique de saisie dans le Module 3 : selecteur d'eleve, selecteur de periode, selecteur de domaine, dropdown niveau, champ observations (textarea). Ce formulaire est une alternative a la dictee vocale et produit le meme resultat en base (table `appreciations`).

**Criteres d'acceptation :**

**Given** je suis sur le Module 3
**When** je clique sur "Saisie manuelle"
**Then** un formulaire s'affiche avec :
- Eleve : dropdown (tous les eleves)
- Periode : dropdown (periodes configurees)
- Domaine : dropdown (domaines d'apprentissage)
- Niveau : dropdown (vide = "Non evalue" / Debut / En cours d'acquisition / Maitrise) — valeurs DB : NULL, "debut", "en_cours_acquisition", "maitrise"
- Observations : textarea

**Given** je remplis le formulaire
**When** je clique sur "Enregistrer"
**Then** l'appreciation est sauvegardee en base
**And** le tableau du Module 3 se met a jour
**And** un toast confirme l'enregistrement

**Given** le champ domaine est vide
**When** je tente d'enregistrer
**Then** un message d'erreur indique que le domaine est obligatoire

**Given** une appreciation existe deja pour cet eleve/periode/domaine
**When** je saisis une nouvelle appreciation
**Then** la nouvelle appreciation est ajoutee (pas de remplacement)

**FRs references :** FR43
**Priorite :** Must
**Taille :** S
**Dependances :** Story 15.1

---

### Story 15.5 : Domaines d'apprentissage parametrables

As a enseignant,
I want personnaliser la liste des domaines d'apprentissage,
So que je puisse adapter les domaines a mon programme specifique.

**Description :**
Ajouter une section dans les Parametres pour gerer les domaines d'apprentissage. L'enseignant peut ajouter, modifier, desactiver (pas supprimer pour conserver les FK) un domaine. Les domaines par defaut (Francais, Maths, etc.) sont pre-installes par le seed data (Story 10.2).

**Criteres d'acceptation :**

**Given** j'accede a Parametres > Domaines d'apprentissage
**When** je vois la liste des domaines
**Then** les 9 domaines par defaut sont affiches avec un toggle "Actif"

**Given** je veux ajouter un domaine
**When** je clique sur "Ajouter" et saisis "Informatique"
**Then** le domaine est ajoute en fin de liste
**And** il est immediatement disponible dans le Module 3

**Given** je veux desactiver un domaine (ex: "Education Musicale")
**When** je bascule le toggle
**Then** le domaine n'apparait plus dans le Module 3
**And** les appreciations existantes pour ce domaine restent en base

**Given** je veux renommer un domaine
**When** je modifie "Arts Plastiques" en "Arts"
**Then** le nom est mis a jour partout

**Given** je veux reordonner les domaines
**When** je deplace un domaine (drag & drop ou fleches)
**Then** l'ordre d'affichage est mis a jour dans le Module 3

**FRs references :** FR44
**Priorite :** Should
**Taille :** M
**Dependances :** Story 10.2, Story 15.1

---

## Epic 16 : Gestion des Modeles GGUF

L'enseignant peut installer les modeles IA necessaires lors du premier lancement, par telechargement ou depuis une cle USB.

### Story 16.1 : Detection premier lancement et ecran setup

As a enseignant,
I want etre guide lors du premier lancement pour installer les modeles IA,
So que la dictee vocale soit fonctionnelle.

**Description :**
Implementer la detection de l'absence des modeles GGUF au demarrage. Si les modeles ne sont pas trouves dans `app_data_dir()/models/`, afficher un ecran "Configuration initiale" avec les options : "Telecharger depuis internet" et "Installer depuis un dossier local (cle USB)". Les Modules 1 et 2 restent accessibles immediatement (pas besoin des modeles). Le Module 3 affiche un message "Modeles IA non installes".

**Criteres d'acceptation :**

**Given** c'est le premier lancement (pas de modeles dans `app_data_dir()`)
**When** l'application demarre
**Then** un ecran "Configuration initiale" s'affiche avec :
- Message : "Pour utiliser la dictee vocale, des modeles IA doivent etre installes (~1.5 Go)"
- Bouton "Telecharger depuis internet"
- Bouton "Installer depuis un dossier local"
- Lien "Passer cette etape" (pour utiliser les Modules 1 et 2 sans IA)

**Given** l'utilisateur clique sur "Passer cette etape"
**When** il accede au Module 1
**Then** tout fonctionne normalement (avertissements, sanctions, recompenses)

**Given** l'utilisateur accede au Module 3 sans modeles
**When** il tente de dicter
**Then** un message s'affiche : "Modeles IA non installes. Allez dans Parametres > Modeles IA."

**Given** les modeles sont deja installes
**When** l'application demarre
**Then** l'ecran de configuration ne s'affiche pas

**FRs references :** FR51, FR52
**Priorite :** Must
**Taille :** M
**Dependances :** Story 10.4 (navigation)

---

### Story 16.2 : Telechargement sequentiel avec progression

As a enseignant,
I want telecharger les modeles IA avec une barre de progression,
So que je sache combien de temps cela va prendre.

**Description :**
Implementer le telechargement sequentiel des modeles depuis Hugging Face (HTTP direct). Ordre : Whisper small FR (~480 Mo) puis Qwen 2.5 Coder 1.5B (~980 Mo). Progression en temps reel via events Tauri. Cote Rust : `reqwest` pour HTTP async + streaming + events. Le telechargement peut etre repris si interrompu (HTTP Range headers si supporte).

**Criteres d'acceptation :**

**Given** l'utilisateur clique sur "Telecharger depuis internet"
**When** le telechargement commence
**Then** une barre de progression s'affiche pour chaque modele
**And** le nom du modele en cours est affiche
**And** la taille telechargee / taille totale est indiquee
**And** une estimation du temps restant est affichee

**Given** le telechargement de Whisper est termine
**When** le telechargement de Qwen commence
**Then** la barre de progression se reinitialise pour le second modele

**Given** les deux modeles sont telecharges
**When** la verification SHA256 reussit
**Then** un message "Modeles installes avec succes" s'affiche
**And** le flag `models_ready` est ecrit en base (table `models_status`)
**And** le Module 3 devient actif

**Given** la connexion est interrompue pendant le telechargement
**When** l'utilisateur revient
**Then** le telechargement peut etre repris (si Range headers supportes)
**And** sinon, le fichier partiel est supprime et le telechargement recommence

**Given** le proxy de l'ecole bloque Hugging Face
**When** le telechargement echoue
**Then** un message indique : "Telechargement impossible. Utilisez l'option cle USB."

**FRs references :** FR51
**NFRs references :** NFR15 (< 2 Go total)
**Priorite :** Must
**Taille :** L
**Dependances :** Story 16.1

---

### Story 16.3 : Verification SHA256 et stockage

As a developpeur,
I want verifier l'integrite des modeles telecharges,
So que les fichiers corrompus ne soient pas utilises.

**Description :**
Calculer le SHA256 de chaque fichier GGUF apres telechargement et comparer avec les hashes attendus (hardcodes dans l'application). Stocker les modeles dans `app_data_dir()/models/`. Enregistrer les metadonnees dans la table `models_status`.

**Criteres d'acceptation :**

**Given** un fichier GGUF est telecharge
**When** le SHA256 est calcule
**Then** il est compare au hash attendu

**Given** le SHA256 correspond
**When** la verification reussit
**Then** le fichier est conserve dans `app_data_dir()/models/`
**And** une entree est ajoutee dans `models_status` (nom, chemin, taille, sha256, date)

**Given** le SHA256 ne correspond pas
**When** la verification echoue
**Then** le fichier corrompu est supprime
**And** un message d'erreur invite a re-telecharger
**And** aucune entree n'est ajoutee en base

**Given** les modeles sont dans `app_data_dir()/models/`
**When** l'application verifie au demarrage
**Then** les chemins sont resolus correctement sur Windows (`AppData/comportement/models/`) et macOS (`~/Library/.../comportement/models/`)

**FRs references :** FR52
**Priorite :** Must
**Taille :** S
**Dependances :** Story 16.2

---

### Story 16.4 : Installation USB alternative

As a enseignant,
I want installer les modeles IA depuis une cle USB,
So que je puisse installer l'IA meme si le proxy de l'ecole bloque le telechargement.

**Description :**
Ajouter un bouton "Installer depuis un dossier local" sur l'ecran de configuration initiale. L'enseignant selectionne un dossier contenant les fichiers GGUF. Le systeme copie les fichiers vers `app_data_dir()/models/`, verifie les SHA256, et active les modeles.

**Criteres d'acceptation :**

**Given** l'ecran de configuration initiale est affiche
**When** je clique sur "Installer depuis un dossier local"
**Then** un selecteur de dossier s'ouvre

**Given** je selectionne un dossier contenant les 2 fichiers GGUF
**When** la detection des fichiers est terminee
**Then** les fichiers trouves sont listes avec leur taille
**And** un bouton "Installer" est disponible

**Given** je clique sur "Installer"
**When** les fichiers sont copies
**Then** une barre de progression indique la copie
**And** la verification SHA256 est effectuee
**And** en cas de succes, les modeles sont actifs

**Given** le dossier ne contient pas les bons fichiers
**When** la detection echoue
**Then** un message indique les fichiers manquants
**And** les noms de fichiers attendus sont affiches

**FRs references :** FR53
**Priorite :** Must
**Taille :** M
**Dependances :** Story 16.1, Story 16.3

---

## Epic 17 : Polish et Distribution

L'application est testee, optimisee et distribuee en mode portable pour Windows et macOS.

### Story 17.1 : Build cross-platform

As a developpeur,
I want builder l'application pour Windows et macOS,
So que l'enseignant puisse l'installer sur son PC ecole.

**Description :**
Configurer le build Tauri pour produire un .exe portable Windows (x86_64) et un .app macOS (ARM + x86). Les binaires sidecars sont bundled avec les suffixes target triple corrects. Le build inclut tous les assets (icones, polices, etc.) mais PAS les modeles GGUF (telecharges separement).

**Criteres d'acceptation :**

**Given** le build Windows est execute
**When** le .exe est produit
**Then** l'executable fonctionne sans installateur (mode portable)
**And** les binaires whisper-server et llama-server sont inclus
**And** la taille de l'exe est < 50 Mo (sans modeles)

**Given** le build macOS est execute
**When** le .app est produit
**Then** l'application fonctionne sur macOS ARM (Apple Silicon) et Intel
**And** les binaires sidecars sont inclus pour les deux architectures

**Given** le .exe est lance sur Windows 10
**When** l'application demarre
**Then** pas de blocage SmartScreen (ou documentation pour contourner)
**And** l'application se lance en < 3 secondes

**FRs references :** Aucun FR specifique (distribution)
**NFRs references :** NFR13 (Windows 10/11, 4 Go RAM), NFR14 (portable), NFR17 (cross-platform)
**Priorite :** Must
**Taille :** L
**Dependances :** Toutes les stories precedentes

---

### Story 17.2 : Tests performance PC ecole

As a enseignant,
I want que l'application fonctionne sur le PC de l'ecole,
So que je puisse l'utiliser au quotidien en classe.

**Description :**
Tester l'application sur un PC reel avec les specifications de l'ecole : Windows 10/11, 4 Go RAM, CPU standard (pas de GPU). Verifier les KPIs de performance : temps d'action < 3 sec, transcription < 5 sec, structuration < 5 sec, pipeline total < 15 sec, RAM pic < 2 Go en mode sequentiel.

**Criteres d'acceptation :**

**Given** l'application est lancee sur le PC ecole (4 Go RAM)
**When** je donne un avertissement
**Then** l'action s'execute en < 1 seconde

**Given** le mode sequentiel est actif
**When** je fais une dictee vocale complete (push-to-talk → transcription → structuration → insertion)
**Then** le pipeline complet prend < 15 secondes
**And** la RAM ne depasse jamais 2 Go pour les sidecars

**Given** whisper-server transcrit 15 secondes d'audio
**When** je mesure le temps
**Then** la transcription est terminee en < 5 secondes

**Given** llama-server structure une observation
**When** je mesure le temps
**Then** la structuration est terminee en < 5 secondes

**Given** l'application tourne une journee complete (8h30-16h30)
**When** je verifie la stabilite
**Then** pas de freeze, pas de memory leak, pas de crash

**FRs references :** Aucun FR specifique (validation)
**NFRs references :** NFR1, NFR5, NFR6, NFR7, NFR13, NFR16, NFR21
**Priorite :** Must
**Taille :** M
**Dependances :** Story 17.1

---

### Story 17.3 : Mode portable .exe

As a enseignant,
I want un fichier .exe unique sans installateur,
So que je puisse lancer l'application sans droits administrateur.

**Description :**
S'assurer que le build Windows produit un .exe portable : pas de modification du registre, pas d'installateur MSI/NSIS, pas de SmartScreen (ou documentation pour l'admin IT). Les donnees sont stockees dans `app_data_dir()` (pas dans le repertoire de l'exe). Le pattern V1 est conserve.

**Criteres d'acceptation :**

**Given** le .exe est copie sur un PC
**When** je double-clique dessus
**Then** l'application se lance sans demander d'installation
**And** les donnees sont creees dans `AppData/comportement/`

**Given** le .exe est sur une cle USB
**When** je le lance depuis la cle
**Then** l'application fonctionne normalement
**And** la base SQLite est creee dans `AppData/` (pas sur la cle)

**Given** SmartScreen bloque l'exe
**When** l'admin IT suit la documentation fournie
**Then** l'exe peut etre autorise

**FRs references :** Aucun FR specifique
**NFRs references :** NFR14 (mode portable)
**Priorite :** Must
**Taille :** S
**Dependances :** Story 17.1

---

### Story 17.4 : Documentation utilisateur

As a enseignant,
I want un guide de demarrage rapide,
So que je puisse commencer a utiliser l'application sans aide technique.

**Description :**
Creer une documentation minimaliste integree a l'application (section "Aide" dans les Parametres ou page dediee). Contenu : guide premier lancement (installation modeles), guide dictee vocale (push-to-talk → correction → structuration), guide configuration periodes, raccourcis clavier (F11 pour TBI, Ctrl+Shift+C, etc.).

**Criteres d'acceptation :**

**Given** l'enseignant accede a l'aide
**When** il consulte la section "Premier lancement"
**Then** un guide pas-a-pas explique l'installation des modeles (internet ou USB)

**Given** l'enseignant accede a l'aide
**When** il consulte la section "Dictee vocale"
**Then** un guide illustre explique : maintenir pour parler → relacher → corriger → structurer → valider

**Given** l'enseignant accede a l'aide
**When** il consulte la section "Raccourcis"
**Then** la liste des raccourcis clavier est affichee

**FRs references :** Aucun FR specifique (UX)
**Priorite :** Should
**Taille :** S
**Dependances :** Aucune

---

### Story 17.5 : Validation accessibilite TBI

As a enseignant utilisant le TBI,
I want que l'affichage soit lisible et utilisable sur un ecran tactile grand format,
So que les eleves puissent voir clairement les informations et que je puisse interagir facilement.

**Description :**
Valider et ajuster l'accessibilite de l'application en mode TBI selon les NFRs 23-27 : taille de police minimum 24px, contraste WCAG AA, zones tactiles minimum 48x48px, pas de hover-only, temps de reponse visuel < 100ms. Tester sur resolution 1920x1080 projetee. Creer un mode d'affichage TBI-optimise si necessaire (tailles de police agrandies, boutons elargis).

**Criteres d'acceptation :**

**Given** l'application est en mode TBI (F11)
**When** j'affiche la grille des eleves
**Then** les prenoms sont lisibles a 3 metres (police >= 24px)
**And** les emojis sont visibles a 5 metres

**Given** l'application est en mode TBI
**When** je touche un bouton d'avertissement
**Then** la zone tactile fait au moins 48x48px
**And** le retour visuel apparait en < 100ms

**Given** l'application est en mode TBI
**When** j'examine tous les elements interactifs
**Then** aucun element ne depend uniquement du hover pour etre accessible

**Given** l'application est en mode TBI
**When** je verifie les contrastes de couleur
**Then** tous les textes ont un ratio de contraste >= 4.5:1 (WCAG AA)

**NFRs references :** NFR23 (police min), NFR24 (contraste), NFR25 (zones tactiles), NFR26 (pas de hover-only), NFR27 (reponse visuelle)
**Priorite :** Must
**Taille :** M
**Dependances :** Stories 17.1, 17.2

---

### Note technique : Fiabilite et schedulers (NFR18-20)

Les NFRs de fiabilite (NFR18 reset quotidien 100%, NFR19 zero perte de donnees, NFR20 recuperation panne) sont couverts par le pattern V1 existant :
- **Reset quotidien** : `useEffect` avec `setInterval` verifiant l'heure systeme toutes les 60s → declenche reset a 16h30
- **Zero perte** : SQLite WAL mode + transactions atomiques
- **Recuperation** : Au demarrage, verification de l'etat (dernier reset effectue ?) et rattrapage si necessaire (pattern V1 conserve dans Story 10.1)

Aucune story supplementaire necessaire — le pattern V1 est eprouve et sera conserve dans la restructuration modulaire (Epic 10).

---

## Resume des Epics V2

| Epic | Titre | Stories | Priorite | Sprint |
|------|-------|---------|----------|--------|
| 10 | Restructuration Modulaire V1 vers V2 | 4 | Must | Sprint 1 |
| 11 | Module 1 Evolutions | 3 | Must | Sprint 1 |
| 12 | Module 2 — Comportement Individuel | 4 | Must | Sprint 3 |
| 13 | Infrastructure IA — Sidecars | 6 | Must | Sprint 2 |
| 14 | Capture Audio + Transcription | 5 | Must | Sprint 2 |
| 15 | Module 3 — Domaines d'Apprentissage | 5 | Must | Sprint 3 |
| 16 | Gestion des Modeles GGUF | 4 | Must | Sprint 4 |
| 17 | Polish et Distribution | 5 | Must/Should | Sprint 4 |
| **TOTAL** | | **36** | | |

## Tailles estimees

| Taille | Stories | Repartition |
|--------|---------|-------------|
| S | 8 | 23% |
| M | 15 | 42% |
| L | 8 | 22% |
| XL | 3 | 8% |
| **Non estime (validation)** | 2 | 6% |
| **TOTAL** | **36** | **100%** |

## Verification de couverture

### FRs couverts par les Epics V2

| FR Range | Module | Statut |
|----------|--------|--------|
| FR1-FR11 | M1 | V1 en production |
| FR12 | M1 | Epic 11 (Story 11.1) |
| FR13-FR14 | M1 | V1 en production |
| FR15 | M1 | Epic 11 (Story 11.3) |
| FR16-FR18 | M1 | V1/Epic 11 (Story 11.2) |
| FR19-FR24 | M1 | V1 en production |
| FR25-FR26 | M1 | Epic 11 (Story 11.3) |
| FR27-FR30 | M1 | V1 en production |
| FR31-FR36 | M2 | Epic 12 (Stories 12.1-12.4) |
| FR37 | M2 | Epic 14 (Story 14.5) |
| FR38-FR39 | M3 | Epic 14 (Stories 14.3-14.5) |
| FR40-FR41 | M3 | Epic 15 (Stories 15.2-15.3) |
| FR42 | M3 | Epic 15 (Story 15.1) |
| FR43 | M3 | Epic 15 (Story 15.4) |
| FR44 | M3 | Epic 15 (Story 15.5) |
| FR45-FR50 | IA | Epic 13 (Stories 13.1-13.6) |
| FR51-FR53 | Modeles | Epic 16 (Stories 16.1-16.4) |
| FR54-FR56 | Config | Epic 10 (Stories 10.3-10.4) |
| FR57 | Audio | Epic 14 (Stories 14.1-14.2) |

**Resultat : 57/57 FRs couverts (100%)**

---

*Document genere le : 2026-02-10*
*Auteur : Uhama*
*Prochain livrable : Architecture V2 (`architecture-v2.md`)*
