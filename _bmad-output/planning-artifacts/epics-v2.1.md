---
stepsCompleted: [step-01, step-02, step-03, step-04]
inputDocuments:
  - prd-v2.1.md
  - architecture-v2.1.md
  - ux-design-v2.md
  - epics-v2.md
workflowType: 'epics-and-stories'
project_name: 'comportement'
user_name: 'Uhama'
date: '2026-02-17'
author: 'Uhama'
version: 'V2.1'
previous_version: 'V2 (2026-02-10) - epics-v2.md'
---

# Comportement V2.1 - Epics & Stories

## Overview

Ce document definit les epics et stories d'implementation pour la V2.1 du projet Comportement. La V2.1 est une refonte ciblee du Module 3 et une extension de l'infrastructure (annee scolaire, LSU, multi-niveaux) sur un codebase V2 complet.

**Documents source :**
- PRD V2.1 : 65 FRs, 30 NFRs (dont 17 FRs nouvelles/refondues, 3 NFRs nouvelles)
- Architecture V2.1 : 13 ADRs (6 conservees + 7 nouvelles), 8 migrations
- UX Design V2 : reference pour patterns existants, adaptations necessaires pour V2.1
- Epics V2 : reference (epics 10-17, tous completes)

**Relation avec les Epics V2 :**
- Epics 10-17 : Completes et en production (V2 code complete, Sprint 4 done)
- Epics V2.1 : Numerotes a partir de 18

---

## Requirements Inventory

### Functional Requirements

**FRs necessitant une NOUVELLE implementation en V2.1 (17 FRs) :**

FR38 (refonte) : L'enseignant peut dicter des observations via un micro unique global — bouton micro dans la toolbar du Module 3 (pas un par domaine), indicateur visuel, push-to-talk, WAV PCM 16kHz, fonctionne pour l'eleve selectionne

FR40 (refonte) : Le LLM classifie automatiquement le domaine vise par la dictee et fusionne avec l'existant — recoit texte + domaines actifs + observations existantes, identifie le domaine, fusionne nouveau texte avec existant, output JSON `{ "domaine_id": N, "observation_mise_a_jour": "texte" }`, < 5 secondes

FR41 (refonte) : L'enseignant valide via un panneau de revue diff Avant/Apres — panneau par domaine modifie (Avant/Apres), edition inline, dropdown reassignation domaine, boutons Accepter/Modifier/Rejeter par domaine, bouton global "Valider tout"

FR42 (refonte) : Les domaines sont charges dynamiquement selon le cycle de l'eleve — chaque eleve a un niveau (PS-CM2) → cycle (C1/C2/C3), domaines filtres par cycle, adaptation auto au changement de niveau

FR43 (evolution) : L'enseignant peut saisir manuellement une appreciation — formulaire avec liste domaines filtree par cycle de l'eleve, niveau LSU 4 niveaux

FR44 (refonte) : Les domaines suivent le referentiel officiel par cycle — C1: 5 domaines, C2: 7 domaines, C3: 8+1 domaines, domaines custom possibles, referentiel TS

FR46 (evolution) : Le sidecar llama-server demarre avec GBNF dynamique — grammaire generee depuis BDD, system prompt construit cote Rust, ctx-size 2048

FR48 (evolution) : Le LLM genere un JSON de classification et fusion — format change (domaine_id index local + observation_mise_a_jour), Rust mappe index → ID BDD

FR49 (evolution) : Le validateur Rust verifie chaque sortie LLM — couche 2 GBNF dynamique, couche 3 domaine_id dans range dynamique

FR58 (NEW) : L'enseignant peut creer et gerer une annee scolaire — creation label/dates, une seule active, cloture → lecture seule, reouverture possible, conteneur principal

FR59 (NEW) : L'enseignant peut attribuer un niveau scolaire a chaque eleve — PS-CM2, attribution individuelle ou en masse, niveau → cycle → domaines, multi-niveaux

FR60 (NEW) : L'echelle d'evaluation suit les 4 niveaux officiels du LSU — Non atteints / Partiellement atteints / Atteints / Depasses, migration 3→4 niveaux

FR61 (NEW) : L'enseignant peut annuler la derniere modification LLM — colonne previous_observations, bouton Annuler par domaine, swap atomique

FR62 (NEW) : L'enseignant peut saisir une appreciation generale par eleve et par periode — champ texte max 1500 car., bouton "Generer brouillon" LLM, editable

FR63 (NEW) : L'enseignant peut exporter au format LSU XML — generateur Rust quick-xml, par periode ou annee, checklist pre-export, fallback CSV/PDF

FR64 (NEW) : L'enseignant peut saisir les identifiants ONDE — UAI, INC, INE, saisie manuelle ou import CSV

FR65 (NEW) : L'enseignant peut creer une nouvelle annee via l'assistant de rentree — wizard 4 etapes, option conserver eleves ou nouvelle classe

**FRs deja implementees (inchangees V2 — 48 FRs) :**
- FR1-FR30 : Module 1 Comportement Classe (en production)
- FR31-FR37 : Module 2 Comportement Individuel (en production)
- FR39 : Transcription Whisper (en production, inchange)
- FR45 : Sidecar whisper-server on-demand (en production)
- FR47 : Pipeline sequentiel (en production)
- FR50 : VAD natif (en production)
- FR51-FR53 : Gestion modeles GGUF (en production)
- FR54-FR56 : Configuration, navigation (en production, minor evolution FR54)
- FR57 : Capture audio micro (en production)

### NonFunctional Requirements

**NFRs nouvelles/evoluees V2.1 (6 NFRs) :**

NFR6 (evolue) : Temps classification+fusion LLM < 5 secondes (ctx-size 2048)
NFR10 (evolue) : 4 couches securite avec GBNF dynamique (couche 2 evoluee)
NFR11 (evolue) : Taux classification > 95% apres GBNF + review panel
NFR28 (NEW) : Migrations BDD additives et non destructives — backup auto, rollback possible, zero perte
NFR29 (NEW) : Export LSU XML conforme structure Pleiade — fallback CSV/PDF si XSD indisponible
NFR30 (NEW) : Undo observations fiable < 1 seconde — swap atomique, jamais de perte

**NFRs conservees (inchangees — 24 NFRs) :**
- NFR1-NFR5 : Performance actions/lancement/TBI/raccourci/transcription
- NFR7-NFR9 : Pipeline total/recompenses/donnees locales
- NFR12-NFR27 : RGPD, compatibilite, fiabilite, accessibilite TBI

### Additional Requirements

**Architecture V2.1 :**
- 8 migrations SQLite V2→V2.1 additives avec backup fichier + savepoints (ADR-013)
- GBNF dynamique genere par requete depuis BDD (ADR-007)
- Budget tokens adaptatif ctx-size 2048 avec troncature intelligente (ADR-008)
- Review panel inline (pas modal) avec Zustand reviewStore (ADR-009)
- Undo transaction atomique SQL BEGIN/COMMIT (ADR-010)
- Guard Rust `check_annee_not_closed` sur toutes les ecritures (ADR-011)
- Export LSU XML via crate quick-xml (ADR-012)
- Sequence implementation : migrations → annee → GBNF/prompt → undo → review → LSU
- Nouveaux modules Rust : `gbnf.rs`, `prompt_builder.rs`, `migrations/`, `lsu/`
- Nouveaux stores : reviewStore, anneeStore, lsuStore
- Referentiel domaines officiels : `domaines-officiels.ts`

**UX V2 (adaptations necessaires) :**
- Layout Module 3 refonde : micro unique toolbar, review panel inline entre toolbar et tableau
- Nouveau composant ReviewPanel + DomainDiff + DomainReassign
- Nouveau composant GeneralAppreciation
- Nouveau composant LsuExport + checklist pre-export
- Nouveaux Settings : AnneeSettings, NiveauxSettings, LsuSettings, NewYearWizard
- AppreciationTable refonde : domaines par cycle, 4 niveaux LSU, bouton undo par ligne
- VoiceDictation refonde : micro unique global

### FR Coverage Map

| FR | Epic | Description |
|----|------|-------------|
| FR58 | Epic 18 | Gestion annee scolaire (creation, active, cloture, reouverture) |
| FR59 | Epic 18 | Attribution niveau scolaire par eleve (PS-CM2) |
| FR42 | Epic 18 | Domaines charges dynamiquement selon cycle eleve |
| FR44 | Epic 18 | Referentiel domaines officiels par cycle (C1/C2/C3) |
| FR60 | Epic 18 | Echelle evaluation LSU 4 niveaux |
| FR38 | Epic 19 | Micro unique global (toolbar Module 3) |
| FR40 | Epic 19 | LLM classifie domaine + fusionne avec existant |
| FR46 | Epic 19 | Sidecar llama-server avec GBNF dynamique |
| FR48 | Epic 19 | LLM genere JSON classification et fusion |
| FR49 | Epic 19 | Validateur Rust avec GBNF dynamique |
| FR41 | Epic 20 | Review panel diff Avant/Apres |
| FR61 | Epic 20 | Undo derniere modification LLM |
| FR43 | Epic 20 | Saisie manuelle appreciation (4 niveaux, cycle) |
| FR62 | Epic 21 | Appreciation generale par eleve et par periode |
| FR63 | Epic 21 | Export LSU XML |
| FR64 | Epic 21 | Identifiants ONDE (UAI, INC, INE) |
| FR65 | Epic 21 | Assistant de rentree (wizard 4 etapes) |

| NFR | Epic | Description |
|-----|------|-------------|
| NFR28 | Epic 18 | Migrations BDD additives et non destructives |
| NFR6 | Epic 19 | Temps classification+fusion LLM < 5 secondes |
| NFR10 | Epic 19 | 4 couches securite avec GBNF dynamique |
| NFR11 | Epic 19 | Taux classification > 95% |
| NFR30 | Epic 20 | Undo observations fiable < 1 seconde |
| NFR29 | Epic 21 | Export LSU XML conforme structure Pleiade |

---

## Epic List

### Epic 18 : Annee Scolaire & Multi-niveaux

L'enseignant peut gerer les annees scolaires, attribuer des niveaux aux eleves (PS-CM2), et voir les domaines officiels adaptes au cycle de chaque eleve avec l'echelle LSU 4 niveaux.

**FRs couvertes :** FR58, FR59, FR42, FR44, FR60
**NFRs adressees :** NFR28
**Dependances :** Aucune (fondation V2.1)

**Perimetre :**
- 8 migrations SQLite V2→V2.1 additives avec backup fichier + savepoints (ADR-013)
- CRUD annee scolaire (creation label/dates, active unique, cloture → lecture seule, reouverture)
- Guard Rust `check_annee_not_closed` sur toutes les ecritures (ADR-011)
- Attribution niveaux PS-CM2 (individuel ou en masse), mapping niveau → cycle
- Referentiel domaines officiels par cycle : C1 (5), C2 (7), C3 (8+1) + domaines custom
- Migration echelle 3→4 niveaux LSU
- Nouveaux composants : AnneeSettings, NiveauxSettings
- Nouveaux stores : anneeStore
- Fichier referentiel : `domaines-officiels.ts`

---

### Epic 19 : Pipeline Vocal Intelligent

L'enseignant dicte une observation via le micro unique, le LLM identifie automatiquement le domaine vise et fusionne intelligemment avec les observations existantes.

**FRs couvertes :** FR38, FR40, FR46, FR48, FR49
**NFRs adressees :** NFR6, NFR10, NFR11
**Dependances :** Epic 18 (domaines par cycle, referentiel)

**Perimetre :**
- Refonte VoiceDictation : micro unique global dans toolbar (pas un par domaine)
- Sidecar llama-server avec GBNF dynamique genere depuis BDD (ADR-007)
- System prompt construit cote Rust avec budget tokens adaptatif ctx-size 2048 (ADR-008)
- LLM classificateur/fusionneur : recoit texte + domaines actifs + observations existantes
- Output JSON `{ "domaine_id": N, "observation_mise_a_jour": "texte" }`
- Rust mappe index local → ID BDD
- Validateur 4 couches : prompt → GBNF dynamique → domaine_id range → prepared statements
- Nouveaux modules Rust : `gbnf.rs`, `prompt_builder.rs`

---

### Epic 20 : Validation, Saisie & Undo

L'enseignant controle totalement les resultats LLM via un panneau de revue diff Avant/Apres, peut annuler toute modification, et dispose d'une saisie manuelle complete avec niveaux LSU.

**FRs couvertes :** FR41, FR61, FR43
**NFRs adressees :** NFR30
**Dependances :** Epic 18 (domaines/niveaux), Epic 19 (resultats LLM a valider)

**Perimetre :**
- Review panel inline entre toolbar et tableau (ADR-009) — pas modal
- Panneau diff par domaine modifie (Avant/Apres), edition inline
- Dropdown reassignation domaine, boutons Accepter/Modifier/Rejeter par domaine
- Bouton global "Valider tout"
- Undo atomique : colonne previous_observations, swap SQL BEGIN/COMMIT (ADR-010)
- Bouton Annuler par domaine dans AppreciationTable
- Saisie manuelle refonde : domaines filtres par cycle, 4 niveaux LSU
- Nouveaux composants : ReviewPanel, DomainDiff, DomainReassign
- Nouveau store : reviewStore

---

### Epic 21 : Export LSU & Cycle Scolaire

L'enseignant peut generer des appreciations generales, saisir les identifiants ONDE, exporter au format LSU XML officiel, et preparer sa rentree via un assistant guide.

**FRs couvertes :** FR62, FR63, FR64, FR65
**NFRs adressees :** NFR29
**Dependances :** Epic 18 (annee scolaire, niveaux), exploite observations Epics 19-20

**Perimetre :**
- Appreciation generale par eleve/periode : champ texte max 1500 car., bouton "Generer brouillon" LLM, editable
- Identifiants ONDE : UAI, INC, INE (saisie manuelle ou import CSV)
- Export LSU XML via crate quick-xml Rust (ADR-012), par periode ou annee
- Checklist pre-export (completude observations, identifiants, appreciations)
- Fallback CSV/PDF si XSD indisponible
- Assistant de rentree : wizard 4 etapes, option conserver eleves ou nouvelle classe
- Nouveaux composants : GeneralAppreciation, LsuExport, LsuSettings, NewYearWizard
- Nouveau store : lsuStore
- Nouveau module Rust : `lsu/`

---

## Epic 18 : Annee Scolaire & Multi-niveaux

### Story 18.1 : Migrations SQLite V2→V2.1

En tant qu'enseignant,
Je veux que l'application se mette a jour automatiquement au lancement,
Afin que ma base de donnees soit prete pour les nouvelles fonctionnalites sans perte de donnees.

**Acceptance Criteria :**

**Given** une base SQLite V2 existante avec des donnees eleves et appreciations
**When** l'application V2.1 demarre pour la premiere fois
**Then** les 8 migrations additives s'executent sequentiellement (M001-M008)
**And** un backup fichier de la BDD est cree avant la premiere migration
**And** un SQL SAVEPOINT est pose entre chaque migration
**And** en cas d'erreur sur une migration, rollback au savepoint precedent et message d'erreur clair
**And** les colonnes ajoutees ont des valeurs par defaut (niveau=NULL, annee_scolaire_id=NULL, previous_observations=NULL, niveau_lsu=NULL)
**And** la migration M008 convertit l'echelle 3→4 niveaux (mapping : 1→1, 2→2, 3→4)
**And** les migrations ne s'executent pas si deja appliquees (idempotent)

**FRs :** Infrastructure pour FR58, FR59, FR42, FR44, FR60, FR61, FR62, FR63, FR64
**NFRs :** NFR28

---

### Story 18.2 : Gestion Annee Scolaire

En tant qu'enseignant,
Je veux creer et gerer mes annees scolaires,
Afin d'organiser le suivi de mes eleves par annee et de cloturer une annee terminee.

**Acceptance Criteria :**

**Given** l'enseignant accede aux parametres (AnneeSettings)
**When** il cree une annee scolaire avec un label (ex: "2025-2026") et des dates debut/fin
**Then** l'annee est creee et activee automatiquement
**And** une seule annee peut etre active a la fois (la precedente est desactivee)

**Given** une annee scolaire active
**When** l'enseignant la cloture
**Then** l'annee passe en lecture seule
**And** toute tentative d'ecriture (ajout eleve, modification note) est bloquee par le guard Rust `check_annee_not_closed`
**And** un message explicite informe que l'annee est cloturee

**Given** une annee cloturee
**When** l'enseignant choisit de la reouvrir
**Then** l'annee redevient active et les ecritures sont a nouveau possibles

**Given** le store Zustand `anneeStore`
**When** l'enseignant change d'annee active
**Then** les donnees affichees (eleves, appreciations) sont filtrees par l'annee selectionnee

**FRs :** FR58

---

### Story 18.3 : Niveaux Scolaires & Referentiel Domaines

En tant qu'enseignant,
Je veux attribuer un niveau scolaire a chaque eleve et voir les domaines d'apprentissage officiels correspondant a son cycle,
Afin que le suivi respecte les programmes officiels par cycle (C1/C2/C3).

**Acceptance Criteria :**

**Given** l'enseignant accede aux parametres (NiveauxSettings)
**When** il attribue un niveau (PS, MS, GS, CP, CE1, CE2, CM1, CM2) a un eleve
**Then** le niveau est enregistre et le cycle deduit automatiquement (PS-GS→C1, CP-CE2→C2, CM1-CM2→C3)

**Given** l'enseignant a plusieurs eleves a configurer
**When** il utilise l'attribution en masse
**Then** il peut selectionner plusieurs eleves et leur attribuer le meme niveau en une action

**Given** le fichier referentiel `domaines-officiels.ts`
**When** l'application charge les domaines pour un eleve
**Then** les domaines sont filtres par cycle : C1 (5 domaines), C2 (7 domaines), C3 (8+1 domaines)
**And** les domaines correspondent au referentiel officiel (noms, descriptions)
**And** les domaines custom definis par l'enseignant restent visibles en complement

**Given** l'enseignant change le niveau d'un eleve (ex: CE2→CM1, passage C2→C3)
**When** le cycle change
**Then** les domaines affiches dans le Module 3 s'adaptent automatiquement au nouveau cycle

**FRs :** FR59, FR42, FR44

---

### Story 18.4 : Echelle LSU 4 Niveaux

En tant qu'enseignant,
Je veux evaluer mes eleves sur l'echelle officielle LSU a 4 niveaux,
Afin que mes evaluations soient conformes au Livret Scolaire Unique.

**Acceptance Criteria :**

**Given** le tableau des appreciations (AppreciationTable) dans le Module 3
**When** l'enseignant selectionne un niveau pour un domaine
**Then** les 4 niveaux LSU sont proposes : Non atteints / Partiellement atteints / Atteints / Depasses

**Given** des donnees existantes V2 avec l'ancienne echelle 3 niveaux
**When** la migration M008 a ete appliquee (Story 18.1)
**Then** les anciennes valeurs sont converties : 1→"Non atteints", 2→"Partiellement atteints", 3→"Depasses"
**And** le niveau "Atteints" (nouveau) n'a pas de donnees migrees automatiquement

**Given** l'AppreciationTable avec domaines par cycle (Story 18.3)
**When** l'enseignant consulte le tableau pour un eleve
**Then** seuls les domaines du cycle de l'eleve sont affiches avec les 4 niveaux LSU

**FRs :** FR60

---

## Epic 19 : Pipeline Vocal Intelligent

### Story 19.1 : GBNF Dynamique & Prompt Builder

En tant qu'enseignant,
Je veux que le systeme genere automatiquement les contraintes de sortie du LLM a partir de mes domaines configures,
Afin que le LLM ne puisse classifier que dans les domaines reellement actifs pour l'eleve.

**Acceptance Criteria :**

**Given** un eleve avec un cycle et des domaines actifs (ex: CM2 → C3 → 9 domaines)
**When** le module Rust `gbnf.rs` genere la grammaire GBNF
**Then** la grammaire contraint `domaine_id` aux index 0..N-1 correspondant aux domaines actifs
**And** le champ `observation_mise_a_jour` est contraint en string non-vide

**Given** les domaines actifs et les observations existantes d'un eleve
**When** le module Rust `prompt_builder.rs` construit le system prompt
**Then** le prompt inclut la liste des domaines (index + nom) et les observations existantes par domaine
**And** le budget tokens respecte ctx-size 2048 avec troncature intelligente (ADR-008)
**And** les observations les plus longues sont tronquees en priorite si depassement

**FRs :** FR46, FR49 (couche 2 GBNF dynamique)
**NFRs :** NFR10

---

### Story 19.2 : Micro Unique Global

En tant qu'enseignant,
Je veux un bouton micro unique dans la toolbar du Module 3,
Afin de dicter une observation pour l'eleve selectionne sans chercher un micro par domaine.

**Acceptance Criteria :**

**Given** le Module 3 avec un eleve selectionne
**When** l'enseignant clique sur le bouton micro dans la toolbar
**Then** l'enregistrement audio demarre en push-to-talk (WAV PCM 16kHz)
**And** un indicateur visuel (animation/couleur) montre que l'enregistrement est actif

**Given** l'enregistrement en cours
**When** l'enseignant relache le bouton micro
**Then** l'enregistrement s'arrete et l'audio est envoye a Whisper pour transcription

**Given** aucun eleve selectionne dans le Module 3
**When** l'enseignant clique sur le micro
**Then** un message demande de selectionner un eleve d'abord
**And** le micro ne s'active pas

**Given** le composant VoiceDictation refondu
**When** il est affiche
**Then** il n'y a qu'un seul bouton micro global (pas un par domaine comme en V2)

**FRs :** FR38

---

### Story 19.3 : Classification & Fusion LLM

En tant qu'enseignant,
Je veux que le LLM identifie automatiquement le domaine vise par ma dictee et fusionne le texte avec mes observations existantes,
Afin de gagner du temps sur la saisie structuree des observations.

**Acceptance Criteria :**

**Given** un texte transcrit par Whisper + les domaines actifs de l'eleve + ses observations existantes
**When** le texte est envoye au LLM (sidecar llama-server) avec la GBNF dynamique (Story 19.1)
**Then** le LLM retourne un JSON `{ "domaine_id": N, "observation_mise_a_jour": "texte" }`
**And** `domaine_id` est un index local (0..N-1) mappe cote Rust vers l'ID BDD reel
**And** `observation_mise_a_jour` contient la fusion du texte dicte avec l'observation existante du domaine
**And** le temps de traitement est < 5 secondes (NFR6)

**Given** le LLM retourne un resultat
**When** Rust recoit le JSON
**Then** le validateur verifie : couche 1 (prompt), couche 2 (GBNF parsable), couche 3 (domaine_id dans range), couche 4 (prepared statements)
**And** si validation echoue, un message d'erreur est affiche et l'operation est annulee proprement

**Given** le pipeline complet micro → Whisper → LLM → validation
**When** l'enseignant dicte et relache le micro
**Then** le resultat structure est disponible pour le review panel (Epic 20)
**And** aucune ecriture en BDD n'est faite sans validation utilisateur

**FRs :** FR40, FR48, FR49 (couches 1, 3, 4)
**NFRs :** NFR6, NFR11

---

### Story 19.4 : Integration Pipeline Bout-en-bout

En tant qu'enseignant,
Je veux que le flux complet dictee → transcription → classification → resultat fonctionne de maniere fluide,
Afin d'utiliser la dictee vocale au quotidien avec confiance.

**Acceptance Criteria :**

**Given** le micro unique (19.2), la GBNF dynamique (19.1) et le LLM classificateur (19.3) implementes
**When** l'enseignant selectionne un eleve et dicte une observation
**Then** le pipeline sequentiel s'execute : stop whisper-server → start llama-server (GBNF dynamique) → classification → stop llama-server
**And** le sidecar llama-server demarre avec la grammaire GBNF generee pour cet eleve specifique

**Given** un indicateur de progression dans la toolbar
**When** le pipeline est en cours (transcription puis classification)
**Then** l'enseignant voit l'etape en cours (Transcription... / Classification...)
**And** le taux de classification correcte est > 95% (NFR11)

**Given** une erreur a n'importe quelle etape du pipeline
**When** le sidecar echoue ou le LLM retourne un resultat invalide
**Then** un message d'erreur clair est affiche
**And** l'etat revient a la normale (pas de sidecar bloque)

**FRs :** FR38, FR40, FR46, FR48, FR49 (integration)
**NFRs :** NFR6, NFR10, NFR11

---

## Epic 20 : Validation, Saisie & Undo

### Story 20.1 : Review Panel Diff Avant/Apres

En tant qu'enseignant,
Je veux voir exactement ce que le LLM propose de modifier avant de l'accepter,
Afin de garder le controle total sur les observations de mes eleves.

**Acceptance Criteria :**

**Given** le LLM a produit un resultat de classification+fusion (Epic 19)
**When** le resultat est disponible
**Then** un panneau de revue inline s'affiche entre la toolbar et le tableau (pas un modal)
**And** le panneau montre un diff par domaine modifie avec Avant (texte actuel) / Apres (texte propose)

**Given** le review panel affiche avec un domaine modifie
**When** l'enseignant clique "Accepter" sur un domaine
**Then** l'observation est mise a jour en BDD avec le texte propose
**And** la colonne `previous_observations` stocke l'ancien texte (pour undo)

**Given** le review panel affiche
**When** l'enseignant clique "Modifier" sur un domaine
**Then** le texte propose devient editable inline
**And** l'enseignant peut corriger avant de valider

**Given** le review panel affiche
**When** l'enseignant clique "Rejeter" sur un domaine
**Then** l'observation reste inchangee et le domaine est retire du panneau

**Given** le review panel avec un domaine mal classifie
**When** l'enseignant utilise le dropdown de reassignation
**Then** il peut choisir un autre domaine parmi les domaines actifs du cycle
**And** l'observation est reassignee au domaine choisi

**Given** le review panel avec plusieurs domaines modifies
**When** l'enseignant clique "Valider tout"
**Then** toutes les modifications en attente sont acceptees d'un coup

**Given** le Zustand `reviewStore`
**When** des resultats LLM arrivent
**Then** le store gere l'etat du review panel (pending, accepted, rejected, modified par domaine)

**FRs :** FR41

---

### Story 20.2 : Undo Derniere Modification LLM

En tant qu'enseignant,
Je veux pouvoir annuler la derniere modification faite par le LLM sur un domaine,
Afin de revenir facilement en arriere si le resultat ne me convient pas apres validation.

**Acceptance Criteria :**

**Given** une observation qui vient d'etre modifiee via le review panel (Story 20.1)
**When** l'enseignant clique le bouton "Annuler" sur la ligne du domaine dans l'AppreciationTable
**Then** l'observation courante est swappee avec `previous_observations` en une transaction atomique SQL (BEGIN/COMMIT)
**And** le swap s'execute en < 1 seconde (NFR30)

**Given** un domaine dont `previous_observations` est NULL (jamais modifie par LLM ou deja annule)
**When** l'enseignant regarde l'AppreciationTable
**Then** le bouton "Annuler" est grise/masque pour ce domaine

**Given** un swap undo effectue
**When** l'enseignant clique a nouveau "Annuler"
**Then** le re-swap restaure le texte LLM (toggle entre les deux versions)

**Given** une erreur pendant la transaction SQL
**When** le COMMIT echoue
**Then** le ROLLBACK restaure l'etat precedent sans perte de donnees
**And** un message d'erreur est affiche

**FRs :** FR61
**NFRs :** NFR30

---

### Story 20.3 : Saisie Manuelle Refonte

En tant qu'enseignant,
Je veux saisir manuellement une appreciation avec les domaines de mon cycle et les 4 niveaux LSU,
Afin d'avoir une alternative a la dictee vocale qui respecte le referentiel officiel.

**Acceptance Criteria :**

**Given** l'enseignant ouvre le formulaire de saisie manuelle dans le Module 3
**When** il selectionne un eleve
**Then** la liste des domaines est filtree par le cycle de l'eleve (C1/C2/C3)
**And** les domaines custom sont inclus en complement des domaines officiels

**Given** le formulaire de saisie manuelle
**When** l'enseignant selectionne un domaine et redige une observation
**Then** il peut choisir un niveau LSU parmi les 4 niveaux (Non atteints / Partiellement atteints / Atteints / Depasses)
**And** l'observation est enregistree en BDD avec le niveau choisi

**Given** un domaine qui a deja une observation
**When** l'enseignant saisit une nouvelle observation manuellement
**Then** l'ancienne observation est stockee dans `previous_observations` (pour undo)
**And** le bouton "Annuler" devient actif pour ce domaine (Story 20.2)

**FRs :** FR43

---

## Epic 21 : Export LSU & Cycle Scolaire

### Story 21.1 : Appreciation Generale par Eleve

En tant qu'enseignant,
Je veux rediger une appreciation generale pour chaque eleve et par periode,
Afin de completer le livret scolaire avec un bilan global au-dela des domaines.

**Acceptance Criteria :**

**Given** l'enseignant accede a la fiche d'un eleve dans le Module 3
**When** il ouvre le composant GeneralAppreciation
**Then** un champ texte permet de saisir une appreciation generale (max 1500 caracteres)
**And** l'appreciation est liee a l'eleve et a la periode active

**Given** le champ appreciation generale
**When** l'enseignant clique "Generer brouillon"
**Then** le LLM genere un brouillon base sur les observations existantes de l'eleve pour la periode
**And** le brouillon est affiche dans le champ texte, entierement editable

**Given** une appreciation generale redigee (manuellement ou via brouillon LLM)
**When** l'enseignant valide
**Then** l'appreciation est enregistree en BDD (table `appreciations_generales`)
**And** elle est modifiable tant que l'annee n'est pas cloturee

**Given** une annee cloturee
**When** l'enseignant consulte les appreciations generales
**Then** elles sont affichees en lecture seule

**FRs :** FR62

---

### Story 21.2 : Identifiants ONDE

En tant qu'enseignant,
Je veux saisir les identifiants ONDE de mon ecole et de mes eleves,
Afin que l'export LSU contienne les references officielles necessaires.

**Acceptance Criteria :**

**Given** l'enseignant accede aux parametres LSU (LsuSettings)
**When** il saisit l'UAI (identifiant ecole)
**Then** l'UAI est enregistre et sera utilise dans tous les exports LSU

**Given** la liste des eleves dans LsuSettings
**When** l'enseignant saisit manuellement l'INC et/ou l'INE pour chaque eleve
**Then** les identifiants sont enregistres dans la table `identifiants_onde`

**Given** un fichier CSV contenant les identifiants ONDE
**When** l'enseignant utilise l'import CSV
**Then** les identifiants sont importes et associes aux eleves par correspondance de nom
**And** un rapport montre les associations reussies et les eleves non trouves

**Given** des identifiants ONDE incomplets
**When** l'enseignant consulte la checklist pre-export (Story 21.3)
**Then** les eleves sans identifiants sont signales comme bloquants pour l'export

**FRs :** FR64

---

### Story 21.3 : Export LSU XML

En tant qu'enseignant,
Je veux exporter les donnees de ma classe au format LSU XML officiel,
Afin de les importer dans l'application Pleiade du ministere.

**Acceptance Criteria :**

**Given** l'enseignant ouvre le composant LsuExport
**When** il selectionne une periode ou l'annee entiere
**Then** une checklist pre-export s'affiche avec l'etat de completude :
- Identifiants ONDE (UAI, INC/INE par eleve)
- Observations par domaine (% de completude)
- Appreciations generales (presence par eleve)
- Niveaux LSU attribues (% de completude)

**Given** la checklist pre-export validee (tous les elements requis sont complets)
**When** l'enseignant clique "Exporter XML"
**Then** un fichier XML est genere via le module Rust `lsu/` avec la crate quick-xml
**And** le XML suit la structure conforme Pleiade (NFR29)
**And** le fichier est propose en telechargement

**Given** la checklist avec des elements manquants non-bloquants
**When** l'enseignant clique "Exporter quand meme"
**Then** l'export s'execute avec les donnees disponibles
**And** les champs manquants sont laisses vides dans le XML

**Given** le XSD officiel indisponible ou l'export XML echoue
**When** l'enseignant choisit un fallback
**Then** un export CSV et/ou PDF est propose comme alternative
**And** le format contient les memes donnees structurees

**FRs :** FR63
**NFRs :** NFR29

---

### Story 21.4 : Assistant de Rentree

En tant qu'enseignant,
Je veux preparer ma nouvelle annee scolaire via un assistant guide,
Afin de demarrer rapidement avec ma classe configuree.

**Acceptance Criteria :**

**Given** l'enseignant lance l'assistant de rentree (NewYearWizard)
**When** le wizard s'ouvre
**Then** il se deroule en 4 etapes sequentielles avec navigation avant/arriere

**Given** l'etape 1 du wizard
**When** l'enseignant saisit le label et les dates de la nouvelle annee
**Then** les informations sont validees (label non-vide, dates coherentes)

**Given** l'etape 2 du wizard
**When** l'enseignant choisit "Conserver les eleves" ou "Nouvelle classe"
**Then** si conservation : les eleves sont copies dans la nouvelle annee (sans leurs donnees d'evaluation)
**And** si nouvelle classe : la liste eleves demarre vide

**Given** l'etape 3 du wizard (si conservation des eleves)
**When** l'enseignant met a jour les niveaux des eleves conserves (ex: CM1→CM2)
**Then** les niveaux sont mis a jour et les cycles/domaines recalcules

**Given** l'etape 4 du wizard (confirmation)
**When** l'enseignant clique "Creer l'annee"
**Then** la nouvelle annee scolaire est creee et activee
**And** l'ancienne annee est automatiquement cloturee
**And** l'application redirige vers le tableau de bord de la nouvelle annee

**FRs :** FR65
