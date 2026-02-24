---
stepsCompleted: [step-01, step-02, step-03, step-04]
inputDocuments:
  - prd-v2.1.md (V2.1-rev2)
  - architecture-v2.1.md (V2.1-rev2)
  - analysis/brainstorming-session-2026-02-24.md
  - ux-design-v2.md
  - epics-v2.md
workflowType: 'epics-and-stories'
project_name: 'comportement'
user_name: 'Uhama'
date: '2026-02-24'
author: 'Uhama'
version: 'V2.1-rev2'
previous_version: 'V2.1 (2026-02-17)'
---

# Comportement V2.1-rev2 — Epics & Stories

## Overview

Ce document definit les epics et stories pour la V2.1-rev2 du projet MonCahier. Revision majeure post-brainstorming : suppression Module 2 Individuel, ajout Registre d'appel + Evaluations + LSU Vivant, event sourcing, micro par eleve, 3 jobs LLM.

**Documents source :**
- PRD V2.1-rev2 : 71 FRs, 34 NFRs (4 modules, event sourcing, 3 jobs LLM)
- Architecture V2.1-rev2 : 20 ADRs (6 V2 + 7 V2.1 + 7 V2.1-rev2), nouvelles tables
- Brainstorming 2026-02-24 : 44 questions, 5 modules, modele event sourcing

**Relation avec les Epics precedents :**
- Epics 10-17 (V2) : Completes et en production
- Epic 18 (V2.1 — Annee Scolaire) : **COMPLETE** (4/4 stories, migrations, CRUD annee, niveaux, referentiel domaines, echelle LSU)
- Epic 19 (V2.1 — Pipeline Vocal) : **COMPLETE** (4/4 stories, GBNF dynamique, ToolbarMic, classify_and_merge, pipeline bout-en-bout)
- Epic 20 (V2.1 — Validation/Saisie/Undo) : **COMPLETE** (3/3 stories, save previous_observations, undo button, ManualEntryForm refonte)
- **Epics V2.1-rev2 : Numerotes a partir de 22** (21 saute pour eviter confusion avec l'ancien Epic 21)

---

## Requirements Inventory

### FRs necessitant une NOUVELLE implementation (V2.1-rev2)

**Module 1 enrichi (micro par eleve) :**
- FR70 : Micro dual-mode par eleve sur carte
- FR71 : Transcription + classification auto
- FR72 : Motif vocal sanction

**Module 2 Registre d'appel :**
- FR73-FR79 : Appel demi-journee, types, motifs, retards, retroactif, alerte, totaux LSU

**Module 3 Evaluations :**
- FR80-FR84 : Saisie evaluation, domaines cycle, lot, historique, echelle LSU

**Module 4 LSU Vivant :**
- FR85-FR93 : Syntheses on-demand, versioning, sources, double vue, appreciation generale, export XML, ONDE

**Config :**
- FR94 : Import CSV eleves
- FR65 : Assistant de rentree

### FRs deja implementees (conservees)

- FR1-FR30 : Module 1 Comportement Classe (production)
- FR38-FR50 : Infrastructure IA + Pipeline (production + Epic 19)
- FR51-FR57 : Gestion modeles, config, audio (production)
- FR58-FR60 : Annee scolaire, niveaux, echelle LSU (Epic 18)
- FR61 : Undo (Epic 20)

### FR Coverage Map

| FR | Epic | Description |
|----|------|-------------|
| FR70-72 | Epic 22 | Micro par eleve + event sourcing |
| FR73-79 | Epic 23 | Registre d'appel |
| FR80-84 | Epic 24 | Module Evaluations |
| FR46 (evolue), FR85-88 | Epic 25 | 3 Jobs LLM + Syntheses |
| FR89-91 | Epic 25 | Double vue LSU + Appreciation generale |
| FR92-93 | Epic 26 | Export LSU XML |
| FR94, FR65 | Epic 26 | Import CSV + Assistant rentree |

---

## Epic List

### Epic 22 : Event Sourcing & Micro par Eleve

L'enseignant peut dicter des observations depuis la carte de chaque eleve via un micro dual-mode, et les observations sont stockees dans le journal pedagogique immutable.

**FRs couvertes :** FR70, FR71, FR72
**NFRs adressees :** NFR33 (event sourcing immutable)
**Dependances :** Epics 18-19 (annee scolaire, pipeline vocal existant)
**ADRs :** ADR-014 (event sourcing), ADR-016 (micro dual-mode)

**Perimetre :**
- Nouvelles migrations : tables `evenements_pedagogiques`, `syntheses_lsu`, `appreciations_generales`, `absences_v2`
- Module Rust `events/` : CRUD evenements (INSERT only), requetes filtrage
- Store `eventStore.ts` : chargement, ajout (pas update/delete)
- Bouton micro dual-mode sur `StudentGridCard.tsx` (tap <300ms = toggle, press >300ms = push-to-talk)
- Hook `useDualModeMic.ts` : logique seuil 300ms
- Integration avec pipeline existant (Whisper → LLM classify → TranscriptPreview)
- Les observations validees alimentent `evenements_pedagogiques` au lieu de `appreciations`
- Motifs vocaux de sanctions → `evenements_pedagogiques` (type=motif_sanction)

---

### Epic 23 : Registre d'Appel

L'enseignant peut faire l'appel du matin et de l'apres-midi, typer les absences, ajouter des motifs, marquer les retards, et recevoir une alerte si un eleve depasse 4 demi-journees injustifiees sur 30 jours.

**FRs couvertes :** FR73, FR74, FR75, FR76, FR77, FR78, FR79
**Dependances :** Epic 22 (migrations, table absences_v2)
**ADRs :** ADR-019 (registre d'appel)

**Perimetre :**
- Nouveau module `src/modules/registre-appel/` (6 composants)
- Module Rust `absences/` : CRUD absences, calcul alerte glissante 30j
- Store `absenceStore.ts` : gestion absences, alertes, totaux
- Navigation sidebar : ajout Module 2 Registre d'appel
- Totaux auto-calcules par periode pour integration LSU

---

### Epic 24 : Module Evaluations

L'enseignant peut saisir des evaluations structurees par lecon, domaine et niveau LSU, avec saisie individuelle ou par lot, et consulter l'historique par eleve.

**FRs couvertes :** FR80, FR81, FR82, FR83, FR84
**Dependances :** Epic 22 (event sourcing, evenements_pedagogiques)
**ADRs :** ADR-014 (event sourcing)

**Perimetre :**
- Nouveau module `src/modules/evaluations/` (5 composants)
- Formulaire saisie individuelle (lecon, domaine filtre par cycle, niveau LSU 4 niveaux, observations)
- Saisie par lot (grille eleves x niveau pour une meme lecon)
- Historique evaluations par eleve (timeline chronologique, filtrable)
- Les evaluations = `evenements_pedagogiques` (type=evaluation)
- Reutilisation de `eventStore.ts` (pas de nouveau store)

---

### Epic 25 : LSU Vivant — Syntheses & Double Vue

L'enseignant peut generer des syntheses progressives par domaine via le LLM, voir le LSU en double vue (par eleve et par domaine), et rediger une appreciation generale cross-domaines.

**FRs couvertes :** FR46 (evolue, 3 jobs), FR85, FR86, FR87, FR88, FR89, FR90, FR91
**NFRs adressees :** NFR31, NFR32, NFR34
**Dependances :** Epic 22 (event sourcing, donnees), Epic 24 (evaluations comme source)
**ADRs :** ADR-015 (3 jobs LLM), ADR-017 (double vue)

**Perimetre :**
- Nouveau module `src/modules/lsu-vivant/` (7 composants)
- Module Rust `synthese/` : generation + versioning
- Extension pipeline LLM : Job 2 (synthese) + Job 3 (appreciation)
- Evolution `structuration.rs`, `gbnf.rs`, `prompt_builder.rs` pour 3 jobs
- Store `syntheseStore.ts` : syntheses versionnees + appreciations generales
- Vue par eleve (tous domaines) + vue par domaine (tous eleves)
- Sources depliables (accordeon → events sources)
- Versioning 4-5 versions, restauration possible
- Appreciation generale : cross-domaines + comportement avec tact

---

### Epic 26 : Export LSU, Import CSV & Finition

L'enseignant peut exporter au format LSU XML, importer des eleves par CSV, et preparer sa rentree via l'assistant guide.

**FRs couvertes :** FR92, FR93, FR94, FR65
**NFRs adressees :** NFR29
**Dependances :** Epics 22-25 (donnees completes)
**ADRs :** ADR-012 (LSU XML), ADR-020 (import CSV), ADR-018 (suppression Module 2)

**Perimetre :**
- Export LSU XML via quick-xml (evolue : integre absences + syntheses versionnees)
- Checklist pre-export (identifiants ONDE, completude)
- Identifiants ONDE (UAI, INE) dans parametres
- Import CSV eleves (prenom, niveau PS-CM2)
- Assistant de rentree (wizard 4 etapes)
- Nettoyage navigation : suppression Module 2 Individuel, deprecated stores
- Fallback CSV/PDF si XML non viable

---

## Epic 22 : Event Sourcing & Micro par Eleve

### Story 22.1 : Migrations V2.1-rev2

En tant qu'enseignant,
Je veux que l'application cree les nouvelles tables au lancement,
Afin que le journal pedagogique et le registre d'appel soient prets.

**Acceptance Criteria :**

**Given** une base SQLite V2.1 existante (post-Epic 18)
**When** l'application V2.1-rev2 demarre pour la premiere fois
**Then** les nouvelles tables sont creees : `evenements_pedagogiques`, `syntheses_lsu`, `appreciations_generales`, `absences_v2`
**And** les index sont crees sur les colonnes de filtrage (eleve_id, annee, periode, domaine, type, date)
**And** un backup fichier de la BDD est cree avant les migrations
**And** les migrations ne s'executent pas si deja appliquees (idempotent via PRAGMA user_version)
**And** les tables existantes (`appreciations`, `comportement_detail`) ne sont PAS supprimees (retrocompat)

**FRs :** Infrastructure pour toutes les FRs V2.1-rev2
**NFRs :** NFR28, NFR33

---

### Story 22.2 : Event Store — Journal Pedagogique

En tant qu'enseignant,
Je veux que toutes mes observations et evaluations soient stockees dans un journal immutable,
Afin de garder la tracabilite complete de mon travail pedagogique.

**Acceptance Criteria :**

**Given** le module Rust `events/mod.rs` et le store `eventStore.ts`
**When** une observation ou evaluation est validee
**Then** un nouvel enregistrement est insere dans `evenements_pedagogiques`
**And** le champ `type` est correct ('observation', 'evaluation', 'motif_sanction')
**And** le champ `source` est correct ('vocal' pour dictee, 'manual' pour saisie)
**And** un UUID est genere pour chaque evenement (future sync mobile)

**Given** le store `eventStore.ts`
**When** il est utilise par un composant React
**Then** il expose `addEvent()` et `loadEvents()` mais PAS `updateEvent()` ni `deleteEvent()`
**And** les events sont charges filtres par eleve, periode, domaine, ou type

**Given** le module Rust `events/queries.rs`
**When** une commande Tauri charge les events
**Then** le guard `check_annee_not_closed()` est appele pour les ecritures
**And** les requetes supportent le filtrage multiple (eleve + periode, domaine + periode, etc.)

**FRs :** Infrastructure event sourcing (ADR-014)
**NFRs :** NFR33

---

### Story 22.3 : Micro Dual-Mode par Eleve

En tant qu'enseignant,
Je veux un bouton micro sur chaque carte eleve avec deux modes d'utilisation,
Afin de dicter des observations spontanees sans quitter le tableau collectif.

**Acceptance Criteria :**

**Given** le tableau collectif (Module 1) avec les cartes eleves
**When** l'enseignant fait un **tap court** (<300ms) sur le bouton micro d'une carte
**Then** l'enregistrement continu demarre (toggle on/off)
**And** un indicateur visuel (animation/couleur) montre l'enregistrement actif

**Given** le tableau collectif
**When** l'enseignant fait un **press long** (>300ms) sur le bouton micro
**Then** l'enregistrement push-to-talk demarre
**And** relacher le bouton arrete l'enregistrement

**Given** un enregistrement termine (par toggle ou push-to-talk)
**When** l'audio est envoye a Whisper
**Then** le texte transcrit s'affiche dans `TranscriptPreview`
**And** l'eleve est identifie par la carte (pas besoin de le selectionner)

**Given** le hook `useDualModeMic.ts`
**When** il est utilise dans `StudentGridCard.tsx`
**Then** il gere onPointerDown/onPointerUp avec seuil ~300ms
**And** il appelle `dictationStore` pour demarrer/arreter l'enregistrement

**FRs :** FR70
**ADRs :** ADR-016

---

### Story 22.4 : Classification & Validation vers Event Sourcing

En tant qu'enseignant,
Je veux que l'observation dictee soit classifiee automatiquement et stockee dans le journal,
Afin que mes dictees alimentent directement le LSU.

**Acceptance Criteria :**

**Given** un texte transcrit par Whisper pour un eleve identifie
**When** le LLM classifie le domaine (Job 1 — pipeline existant Epic 19)
**Then** le resultat s'affiche dans TranscriptPreview (carte editable, diff Avant/Apres)
**And** l'enseignant peut corriger le texte, reassigner le domaine, valider ou rejeter

**Given** l'enseignant valide dans TranscriptPreview
**When** le bouton "Valider" est clique
**Then** un `evenement_pedagogique` est insere (type='observation', source='vocal')
**And** le `domaine_id` est celui choisi (auto par LLM ou corrige par l'enseignant)
**And** le `texte_dictation` contient la transcription brute Whisper
**And** les `observations` contiennent le texte final valide

**Given** l'enseignant dicte un motif de sanction (FR72)
**When** le contexte est une sanction (3e avertissement)
**Then** le motif est stocke dans `evenements_pedagogiques` (type='motif_sanction')
**And** il est associe a l'eleve et a la periode

**FRs :** FR71, FR72
**NFRs :** NFR33

---

## Epic 23 : Registre d'Appel

### Story 23.1 : Appel Matin/Apres-midi

En tant qu'enseignant,
Je veux faire l'appel du matin et de l'apres-midi en un clic par eleve absent,
Afin de maintenir un registre des presences numerique.

**Acceptance Criteria :**

**Given** l'enseignant ouvre le Module 2 (Registre d'appel)
**When** la page s'affiche
**Then** une grille eleves x jours (semaine en cours) est visible
**And** chaque cellule a deux emplacements : matin et apres-midi
**And** par defaut tous les eleves sont presents

**Given** un eleve absent
**When** l'enseignant clique sur la cellule matin ou apres-midi
**Then** l'absence est enregistree dans `absences_v2`
**And** un select inline permet de choisir le type (justifiee/medicale/injustifiee)
**And** le type par defaut est "injustifiee"

**Given** un eleve marque absent
**When** l'enseignant re-clique sur la cellule
**Then** l'absence est supprimee (l'eleve redevient present)

**FRs :** FR73, FR74

---

### Story 23.2 : Motifs, Retards & Retroactivite

En tant qu'enseignant,
Je veux ajouter des motifs aux absences, marquer les retards, et saisir retroactivement,
Afin d'avoir un registre complet et precis.

**Acceptance Criteria :**

**Given** une absence enregistree
**When** l'enseignant clique sur l'icone motif
**Then** un champ texte ou vocal (micro) permet de saisir le motif
**And** le motif est enregistre dans `absences_v2.motif`

**Given** un eleve present mais en retard
**When** l'enseignant active le toggle retard
**Then** l'eleve est marque comme present avec un flag retard
**And** le retard ne compte PAS comme une absence

**Given** l'enseignant veut saisir une absence passee
**When** il utilise le date picker
**Then** il peut naviguer vers des jours passes et saisir des absences
**And** les motifs sont ajoutables apres coup

**FRs :** FR75, FR76, FR77

---

### Story 23.3 : Alerte Legale & Totaux LSU

En tant qu'enseignant,
Je veux etre alerte si un eleve depasse 4 demi-journees injustifiees sur 30 jours,
Et voir les totaux d'absences par periode pour le LSU.

**Acceptance Criteria :**

**Given** les absences enregistrees pour tous les eleves
**When** le systeme calcule les alertes (a chaque ouverture du registre)
**Then** un badge alerte rouge s'affiche a cote de chaque eleve depassant 4 demi-journees injustifiees sur les 30 derniers jours glissants
**And** le calcul est glissant (pas calendaire)
**And** l'alerte est visible uniquement par l'enseignant

**Given** l'enseignant consulte les totaux
**When** il selectionne une periode
**Then** les totaux sont affiches : nombre de demi-journees justifiees + injustifiees (separement) par eleve
**And** ces totaux sont disponibles pour l'export LSU (FR79)

**FRs :** FR78, FR79

---

## Epic 24 : Module Evaluations

### Story 24.1 : Saisie Evaluation Individuelle

En tant qu'enseignant,
Je veux saisir une evaluation pour un eleve avec la lecon, le domaine, le niveau et des observations,
Afin de documenter les progres de mes eleves de maniere structuree.

**Acceptance Criteria :**

**Given** l'enseignant ouvre le Module 3 (Evaluations)
**When** il selectionne un eleve et ouvre le formulaire de saisie
**Then** le formulaire propose :
- Nom de la lecon (texte libre)
- Domaine (select filtre par le cycle de l'eleve : C1=5, C2=7, C3=8+1 domaines + custom)
- Niveau LSU (4 niveaux officiels : Non atteints / Partiellement / Atteints / Depasses)
- Observations (textarea ou vocal via micro)

**Given** le formulaire rempli
**When** l'enseignant valide
**Then** un `evenement_pedagogique` est insere (type='evaluation', domaine_id, lecon, niveau_lsu, observations)
**And** le source est 'manual' ou 'vocal' selon le mode de saisie

**Given** le champ observations
**When** l'enseignant utilise le micro (meme dual-mode que les cartes)
**Then** Whisper transcrit le texte dans le champ observations
**And** le texte est editable avant validation

**FRs :** FR80, FR81, FR84

---

### Story 24.2 : Saisie par Lot

En tant qu'enseignant,
Je veux saisir la meme evaluation pour tous mes eleves d'un coup,
Afin de gagner du temps apres une lecon commune.

**Acceptance Criteria :**

**Given** l'enseignant choisit le mode "Saisie par lot"
**When** il saisit le nom de la lecon et selectionne le domaine
**Then** une grille s'affiche avec tous les eleves et les 4 niveaux LSU
**And** un clic par eleve suffit pour attribuer le niveau
**And** des observations individuelles sont optionnelles (icone pour ouvrir un champ)

**Given** la grille remplie
**When** l'enseignant valide
**Then** un `evenement_pedagogique` est cree pour chaque eleve avec un niveau attribue
**And** les eleves sans niveau ne generent pas d'evenement

**Given** une classe multi-niveaux
**When** la grille s'affiche
**Then** seuls les eleves dont le cycle correspond au domaine selectionne sont affiches

**FRs :** FR82

---

### Story 24.3 : Historique Evaluations

En tant qu'enseignant,
Je veux consulter l'historique des evaluations d'un eleve,
Afin de suivre sa progression dans le temps.

**Acceptance Criteria :**

**Given** l'enseignant selectionne un eleve dans le Module Evaluations
**When** il consulte l'historique
**Then** une timeline chronologique affiche toutes les evaluations (type=evaluation)
**And** chaque entree montre : date, lecon, domaine, niveau, observations

**Given** l'historique affiche
**When** l'enseignant filtre par domaine ou par periode
**Then** la timeline se met a jour avec les filtres appliques
**And** un compteur montre le nombre d'evaluations filtrées

**FRs :** FR83

---

## Epic 25 : LSU Vivant — Syntheses & Double Vue

### Story 25.1 : Jobs LLM 2 & 3

En tant qu'enseignant,
Je veux que le LLM puisse generer des syntheses par domaine et des appreciations generales,
Afin d'avoir un brouillon sur lequel travailler plutot que partir de zero.

**Acceptance Criteria :**

**Given** le sidecar llama-server et les modules Rust `structuration.rs`, `gbnf.rs`, `prompt_builder.rs`
**When** Job 2 (synthese) est demande
**Then** Rust charge tous les `evenements_pedagogiques` du domaine pour la periode
**And** Le prompt est construit avec ces events + instructions de synthese
**And** Le GBNF contraint la sortie a `{ "synthese": "texte" }`
**And** Le temps de traitement est < 10 secondes (NFR31)

**Given** Job 3 (appreciation generale) est demande
**When** Rust charge toutes les syntheses + comportement de l'eleve pour la periode
**Then** Le prompt inclut instructions de formulation avec tact (jamais punitif)
**And** Le GBNF contraint la sortie a `{ "appreciation": "texte" }`
**And** Le temps de traitement est < 15 secondes (NFR32)

**Given** le pipeline sequentiel (un seul sidecar actif)
**When** un job est lance
**Then** llama-server demarre avec le prompt et la GBNF du job specifique
**And** Le job precedent doit etre termine avant d'en lancer un nouveau

**FRs :** FR46 (evolue), FR85, FR86
**NFRs :** NFR31, NFR32

---

### Story 25.2 : Synthese On-Demand & Versioning

En tant qu'enseignant,
Je veux generer une synthese par domaine quand je le decide, et conserver les versions precedentes,
Afin de pouvoir revenir en arriere si le LLM produit un resultat moins bon.

**Acceptance Criteria :**

**Given** la vue par eleve dans le Module LSU Vivant
**When** l'enseignant clique "Synthetiser" sur un domaine
**Then** Job 2 est lance et genere une synthese
**And** La synthese s'affiche dans un champ editable (SynthesisCard)
**And** L'enseignant peut modifier le texte manuellement ou vocalement

**Given** une synthese validee (manuellement ou editee)
**When** elle est enregistree
**Then** une nouvelle version est creee dans `syntheses_lsu` (version = N+1)
**And** Les 4-5 versions precedentes sont conservees
**And** `generated_by` est 'llm' ou 'manual' selon l'origine

**Given** l'historique des versions
**When** l'enseignant clique "Versions"
**Then** la liste des versions (4-5) s'affiche avec date et mode de generation
**And** L'enseignant peut restaurer une version anterieure (nouvelle version = copie)

**Given** le bouton "Regenerer"
**When** l'enseignant clique
**Then** Job 2 est relance pour le meme domaine
**And** La version precedente est conservee (pas ecrasee)

**FRs :** FR85, FR86, FR87
**NFRs :** NFR34

---

### Story 25.3 : Double Vue LSU

En tant qu'enseignant,
Je veux voir le LSU par eleve (tous domaines) et par domaine (tous eleves),
Afin de rediger les livrets et verifier la coherence.

**Acceptance Criteria :**

**Given** l'enseignant ouvre le Module 4 (LSU Vivant)
**When** il selectionne l'onglet "Par eleve"
**Then** il voit la fiche d'un eleve avec tous les domaines de son cycle
**And** pour chaque domaine : synthese actuelle (ou "Pas encore de synthese") + niveau + bouton "Synthetiser"
**And** en bas : appreciation generale

**Given** l'enseignant selectionne l'onglet "Par domaine"
**When** il choisit un domaine
**Then** il voit la liste de tous les eleves (du cycle correspondant)
**And** pour chaque eleve : synthese actuelle + niveau
**And** Vue pratique pour verifier la coherence entre eleves

**Given** les sources depliables (FR88)
**When** l'enseignant clique l'accordeon sous une synthese
**Then** les observations et evaluations sources sont affichees (lien vers l'evenement)
**And** Les sources sont triees chronologiquement

**FRs :** FR88, FR89, FR90

---

### Story 25.4 : Appreciation Generale

En tant qu'enseignant,
Je veux rediger une appreciation generale par eleve et par periode, avec aide du LLM,
Afin de completer le livret scolaire avec un bilan global.

**Acceptance Criteria :**

**Given** la vue par eleve dans LSU Vivant
**When** l'enseignant ouvre la section "Appreciation generale"
**Then** un champ texte editable (max 1500 caracteres) est affiche
**And** un bouton "Generer" est disponible

**Given** le bouton "Generer" clique
**When** Job 3 est lance
**Then** le LLM synthetise cross-domaines + comportement
**And** le comportement est formule avec tact (jamais punitif, toujours constructif)
**And** le brouillon s'affiche dans le champ editable

**Given** l'appreciation validee
**When** elle est enregistree
**Then** une nouvelle version est creee dans `appreciations_generales` (version = N+1)
**And** Les 4-5 versions precedentes sont conservees

**FRs :** FR91

---

## Epic 26 : Export LSU, Import CSV & Finition

### Story 26.1 : Export LSU XML

En tant qu'enseignant,
Je veux exporter les donnees de ma classe au format LSU XML officiel,
Afin de les importer dans Pleiade.

**Acceptance Criteria :**

**Given** l'enseignant ouvre l'export dans LSU Vivant
**When** il selectionne une periode ou l'annee, un eleve ou tous
**Then** une checklist pre-export s'affiche :
- Identifiants ONDE (UAI, INE par eleve) — bloquant
- Syntheses par domaine (% completude) — non-bloquant
- Appreciations generales (presence par eleve) — non-bloquant
- Absences comptabilisees (auto) — informatif

**Given** la checklist avec les elements requis complets
**When** l'enseignant clique "Exporter XML"
**Then** le fichier XML est genere via Rust quick-xml
**And** le XML integre : syntheses versionnees (derniere version), niveaux LSU, absences (totaux justifiees + injustifiees separement), appreciations generales
**And** le fichier est propose en telechargement

**Given** le XSD indisponible ou XML non viable
**When** l'enseignant choisit un fallback
**Then** un export CSV et/ou PDF est propose

**FRs :** FR92
**NFRs :** NFR29

---

### Story 26.2 : Identifiants ONDE

En tant qu'enseignant,
Je veux saisir les identifiants ONDE de mon ecole et de mes eleves,
Afin que l'export LSU contienne les references officielles.

**Acceptance Criteria :**

**Given** l'enseignant accede aux parametres LSU (LsuSettings)
**When** il saisit l'UAI (identifiant ecole)
**Then** l'UAI est enregistre dans `config_lsu`

**Given** la liste des eleves
**When** l'enseignant saisit l'INE pour chaque eleve
**Then** l'INE est enregistre dans `students.ine`

**Given** un fichier CSV contenant les identifiants ONDE
**When** l'enseignant utilise l'import CSV
**Then** les INE sont importes et associes aux eleves par correspondance de prenom
**And** un rapport montre les associations reussies et les eleves non trouves

**FRs :** FR93

---

### Story 26.3 : Import CSV Eleves

En tant qu'enseignant,
Je veux importer ma liste d'eleves depuis un fichier CSV,
Afin de gagner du temps en debut d'annee.

**Acceptance Criteria :**

**Given** l'enseignant ouvre l'import CSV dans les parametres
**When** il selectionne un fichier CSV
**Then** le parser lit les colonnes (prenom obligatoire, niveau PS-CM2 obligatoire, nom optionnel)
**And** un apercu des eleves detectes s'affiche
**And** un rapport montre les erreurs (lignes invalides, niveaux inconnus)

**Given** l'apercu valide
**When** l'enseignant clique "Importer"
**Then** les eleves sont crees dans `students` avec le niveau et l'annee active
**And** les eleves existants (meme prenom) ne sont pas dupliques (avertissement)

**FRs :** FR94

---

### Story 26.4 : Assistant de Rentree

En tant qu'enseignant,
Je veux preparer ma nouvelle annee via un assistant guide,
Afin de demarrer rapidement.

**Acceptance Criteria :**

**Given** l'enseignant lance l'assistant (NewYearWizard)
**When** le wizard s'ouvre
**Then** il se deroule en 4 etapes :
1. Label et dates de la nouvelle annee
2. Choix : conserver eleves ou nouvelle classe
3. Mise a jour niveaux (si conservation — ex: CM1→CM2)
4. Confirmation

**Given** l'etape 4 (confirmation)
**When** l'enseignant clique "Creer l'annee"
**Then** la nouvelle annee est creee et activee
**And** l'ancienne annee est automatiquement cloturee
**And** si conservation : les eleves sont copies (sans donnees evaluation)
**And** l'application redirige vers le Module 1

**FRs :** FR65

---

### Story 26.5 : Nettoyage Navigation & Deprecated

En tant qu'enseignant,
Je veux une navigation claire avec les 4 nouveaux modules,
Afin d'acceder facilement a chaque fonctionnalite.

**Acceptance Criteria :**

**Given** la sidebar de navigation
**When** l'application demarre
**Then** 4 modules sont affiches : Comportement Classe, Registre d'appel, Evaluations, LSU Vivant
**And** le Module 2 (Comportement Individuel) n'est plus visible dans la sidebar
**And** les modules deprecated (apprentissage, comportement-individuel) restent dans le code mais ne sont plus accessibles

**Given** les stores deprecated (incidentStore, appreciationStore)
**When** les nouveaux stores (eventStore, syntheseStore) sont en place
**Then** les anciens stores restent dans le code (retrocompat) mais ne sont plus importes par les nouveaux modules

**FRs :** ADR-018
**Note :** Ne pas supprimer les fichiers deprecated — ils sont references par le code V2 encore present.

---

## Sprint Planning

### Sprint 5 : Epic 22 (Event Sourcing & Micro par Eleve)

| Story | Description | Effort |
|-------|-------------|--------|
| 22.1 | Migrations V2.1-rev2 (4 nouvelles tables) | M |
| 22.2 | Event Store (Rust + TS, CRUD events) | L |
| 22.3 | Micro dual-mode par eleve (hook + carte) | L |
| 22.4 | Classification → event sourcing (integration pipeline) | M |

### Sprint 6 : Epic 23 + Epic 24 (Registre + Evaluations)

| Story | Description | Effort |
|-------|-------------|--------|
| 23.1 | Appel matin/apres-midi (grille + CRUD) | L |
| 23.2 | Motifs, retards, retroactivite | M |
| 23.3 | Alerte legale + totaux LSU | M |
| 24.1 | Saisie evaluation individuelle | M |
| 24.2 | Saisie par lot | M |
| 24.3 | Historique evaluations | S |

### Sprint 7 : Epic 25 (LSU Vivant)

| Story | Description | Effort |
|-------|-------------|--------|
| 25.1 | Jobs LLM 2 & 3 (Rust pipeline extension) | L |
| 25.2 | Synthese on-demand + versioning | L |
| 25.3 | Double vue LSU (par eleve + par domaine) | L |
| 25.4 | Appreciation generale | M |

### Sprint 8 : Epic 26 (Export + Import + Finition)

| Story | Description | Effort |
|-------|-------------|--------|
| 26.1 | Export LSU XML | L |
| 26.2 | Identifiants ONDE | S |
| 26.3 | Import CSV eleves | M |
| 26.4 | Assistant de rentree | M |
| 26.5 | Nettoyage navigation + deprecated | S |

### Recapitulatif

| Sprint | Epics | Stories | Effort estime |
|--------|-------|---------|---------------|
| Sprint 5 | Epic 22 | 4 stories | 1 session |
| Sprint 6 | Epic 23 + 24 | 6 stories | 1-2 sessions |
| Sprint 7 | Epic 25 | 4 stories | 1-2 sessions |
| Sprint 8 | Epic 26 | 5 stories | 1 session |
| **TOTAL** | **5 epics** | **19 stories** | **4-6 sessions** |
