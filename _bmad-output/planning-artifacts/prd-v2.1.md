---
stepsCompleted: [step-e-01-discovery, step-e-02-review, step-e-03-edit]
inputDocuments:
  - prd-v2.md
  - analysis/brainstorming-session-2026-02-17.md
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
  complexity: medium-high
  projectContext: brownfield
date: 2026-02-17
author: Uhama
version: V2.1
previous_version: V2 (2026-02-10)
editHistory:
  - date: 2026-02-17
    changes: 'Refonte Module 3 (LLM classificateur+fusionneur, domaines dynamiques par cycle, micro unique, panneau revue diff), compatibilite LSU 4 niveaux, gestion annee scolaire, classes multi-niveaux, undo/redo, appreciation generale, export LSU XML optionnel'
---

# Product Requirements Document - Comportement V2.1

**Auteur :** Uhama
**Date :** 2026-02-17
**Version :** V2.1
**Version precedente :** V2 (2026-02-10) — `prd-v2.md`

---

## 1. Introduction

### 1.1 Contexte

**Comportement** est une application desktop locale (Tauri v2) utilisee quotidiennement par un enseignant de CM2 a l'Ecole Elementaire Victor Hugo (Sevran, 93) pour le suivi du comportement et des apprentissages de ses 18 eleves. La **V1** (production depuis janvier 2026) remplace le tableau physique a emojis. La **V2** (completee fevrier 2026) ajoute 3 modules + IA locale.

La **V2.1** refond le **Module 3 — Domaines d'Apprentissage** pour :

- **Compatibilite LSU** : echelle 4 niveaux officielle, domaines par cycle, export XML optionnel
- **Classes multi-niveaux** : niveau rattache a l'eleve (CE1+CM2 dans une meme classe)
- **LLM classificateur+fusionneur** : le LLM identifie le domaine vise et fusionne le texte avec l'existant (plus de generation de contenu)
- **Micro unique global** : un seul bouton micro dans la toolbar (plus un par domaine)
- **Panneau de revue diff** : visualisation Avant/Apres par domaine avant validation
- **Gestion de l'annee scolaire** : conteneur principal avec cycle de vie complet (creation, cloture, archive)

### 1.2 Objectifs V2.1

| Objectif | Description |
|----------|-------------|
| **Compatibilite LSU** | Echelle 4 niveaux, domaines officiels par cycle, export XML optionnel |
| **Classes multi-niveaux** | Niveau par eleve (PS-CM2), domaines charges selon le cycle |
| **Refondre le pipeline LLM** | LLM = classificateur + fusionneur, prompt/GBNF dynamiques depuis BDD |
| **Simplifier le workflow vocal** | Micro unique global, panneau de revue diff, undo/redo |
| **Gerer l'annee scolaire** | Creation, cloture, archive en lecture seule, assistant de rentree |
| **Appreciation generale** | Brouillon auto-genere par LLM, editable par le professeur |

### 1.3 Relation avec la V2

La V2.1 est une **refonte ciblee du Module 3** et une extension de l'infrastructure :

- Modules 1 et 2 **inchanges** (avertissements, sanctions, recompenses, incidents)
- Le pipeline IA existant (sidecars whisper-server + llama-server) est **conserve** mais le role du LLM change
- Les tables BDD V2 sont **conservees** avec migrations additives (jamais destructives)
- Nouvelles tables : `annees_scolaires`, `niveaux_classe`, `config_lsu`
- Colonnes ajoutees : `students.niveau`, `students.annee_id`, `appreciations.previous_observations`, `appreciations.niveau_lsu`, `domaines_apprentissage.cycle/code_lsu/is_custom`

---

## 2. Product Overview

### 2.1 Vue d'ensemble

```
+-----------------------------------------------------------------------+
|                    COMPORTEMENT V2.1                                    |
|                                                                         |
|  +-----------------+  +-----------------+  +------------------------+  |
|  |   MODULE 1      |  |   MODULE 2      |  |   MODULE 3 (refonde)   |  |
|  |   Comportement  |  |   Comportement  |  |   Domaines             |  |
|  |   Classe        |  |   Individuel    |  |   Apprentissage        |  |
|  |                 |  |                 |  |                        |  |
|  | - Avertissements|  | - Fiche eleve   |  | - Micro unique global  |  |
|  | - Sanctions     |  | - Incidents     |  | - LLM classif+fusion   |  |
|  | - Recompenses   |  | - Par periode   |  | - Panneau revue diff   |  |
|  | - Motifs        |  | - Historique    |  | - Domaines par cycle   |  |
|  | - Absences      |  | - Intervenants  |  | - 4 niveaux LSU        |  |
|  | - TBI + Export  |  |                 |  | - Undo/redo            |  |
|  +--------+--------+  +--------+--------+  | - Appre. generale      |  |
|           |                     |           | - Export LSU XML       |  |
|           |                     |           +----------+-------------+  |
|  +--------+---------------------+-----------------------+----------+   |
|  |                 COUCHE PARTAGEE                                  |   |
|  |  Eleves | Annee scolaire | Niveaux | Periodes | SQLite | Zustand|   |
|  +---+-------------------------------------------------+----------+   |
|      |                                                  |              |
|  +---+------------------+  +---------------------------+----------+   |
|  |  SIDECAR 1           |  |  SIDECAR 2                           |   |
|  |  whisper-server      |  |  llama-server + Qwen 2.5             |   |
|  |  (STT francais)      |  |  (classificateur + fusionneur)       |   |
|  |  + VAD natif          |  |  + GBNF dynamique depuis BDD        |   |
|  +----------------------+  +--------------------------------------+   |
+-----------------------------------------------------------------------+
```

### 2.2 Modules

#### Module 1 — Comportement Classe (inchange V2)

Suivi global hebdomadaire de toute la classe. Avertissements, sanctions avec motifs obligatoires, absences, recompenses automatiques, grille de cartes, mode TBI, export JSON.

#### Module 2 — Comportement Individuel (inchange V2)

Suivi detaille par eleve, par periode scolaire. Incidents structures : date, heure, type, motif, description, intervenant. Historique chronologique avec filtres.

#### Module 3 — Domaines d'Apprentissage (refonde V2.1)

Saisie des appreciations par domaine via dictee vocale avec **micro unique global**. Pipeline IA refonde : le LLM **classifie** le domaine vise par la dictee et **fusionne** le texte avec les observations existantes. **Panneau de revue diff** Avant/Apres par domaine avant validation. Domaines officiels charges dynamiquement par cycle de l'eleve. Echelle 4 niveaux LSU. Undo/redo par snapshot. Appreciation generale par eleve/periode.

### 2.3 Infrastructure IA locale

- **Whisper.cpp** (whisper-server sidecar) : transcription STT francais, modele small FR GGUF Q4 (~480 Mo) — inchange
- **Qwen 2.5 Coder 1.5B** (llama-server sidecar) : **classificateur + fusionneur** (plus generateur), GGUF Q4 (~980 Mo)
- **Pipeline sequentiel a la demande** : un seul modele actif a la fois — inchange
- **GBNF dynamique** : grammaire generee depuis la BDD (domaines actifs de l'eleve)
- **Prompt contextuel** : construit cote Rust avec niveau, domaines, observations existantes
- **Securite 4 couches** : Prompt contraint, Grammaire GBNF, Validateur Rust, Prepared Statements — inchange
- **LLM output = texte** : classification domaine + observation fusionnee, jamais de SQL ni d'IDs

### 2.4 Gestion de l'annee scolaire

- **Annee scolaire** = conteneur principal pour periodes, eleves, appreciations
- **Cycle de vie** : creation → active → cloturee (lecture seule)
- **Archives** : annees precedentes accessibles en consultation
- **Assistant de rentree** : wizard de creation d'une nouvelle annee scolaire

---

## 3. Functional Requirements

### 3.1 Module 1 — Comportement Classe (inchange V2)

#### 3.1.1 Gestion des Eleves

| ID | Description | Criteres d'acceptation | Priorite | Module |
|----|-------------|----------------------|----------|--------|
| **FR1** | L'enseignant peut ajouter un nouvel eleve a la classe | - L'eleve apparait dans la grille apres ajout<br>- L'eleve est sauvegarde en base<br>- Maximum 30 eleves par classe | Must | M1 |
| **FR2** | L'enseignant peut modifier le prenom d'un eleve | - Le nouveau prenom est affiche immediatement<br>- La modification est persistee en base<br>- Prenom vide = erreur | Must | M1 |
| **FR3** | L'enseignant peut supprimer un eleve de la classe | - Confirmation requise avant suppression<br>- Suppression en cascade (warnings, sanctions, rewards)<br>- L'eleve disparait de la grille | Must | M1 |
| **FR4** | L'enseignant peut voir la liste de tous les eleves avec leur statut actuel | - Grille de cartes avec prenom, avertissements, ligne L-M-J-V, boutons<br>- Mise a jour temps reel | Must | M1 |
| **FR5** | Le systeme supporte un maximum de 30 eleves par classe | - Message d'erreur si tentative d'ajout au-dela de 30<br>- Ajout bloque | Must | M1 |

#### 3.1.2 Systeme d'Avertissements

| ID | Description | Criteres d'acceptation | Priorite | Module |
|----|-------------|----------------------|----------|--------|
| **FR6** | L'enseignant peut donner un avertissement a un eleve | - 1er avertissement = emoji partiel affiche<br>- 2eme avertissement = indicateur "x2"<br>- Action en < 1 seconde | Must | M1 |
| **FR7** | Le systeme convertit automatiquement un 3eme avertissement en sanction | - Avertissements remis a 0<br>- Sanction ajoutee automatiquement<br>- Modale propose d'ajouter un motif | Must | M1 |
| **FR8** | Le systeme reinitialise automatiquement tous les avertissements a 16h30 | - Tous les avertissements passes a 0<br>- Sanctions inchangees<br>- Reset rattrape si app fermee a 16h30 | Must | M1 |
| **FR9** | L'enseignant peut retirer un avertissement d'un eleve | - Decrementation du compteur<br>- Mise a jour immediate de l'affichage<br>- Pas de passage en dessous de 0 | Must | M1 |

#### 3.1.3 Systeme de Sanctions

| ID | Description | Criteres d'acceptation | Priorite | Module |
|----|-------------|----------------------|----------|--------|
| **FR10** | L'enseignant peut ajouter une sanction a un eleve | - Emoji triste ajoute<br>- Modale de motif obligatoire s'affiche<br>- Sanction persistee en base avec motif | Must | M1 |
| **FR11** | L'enseignant peut retirer une sanction d'un eleve | - Derniere sanction supprimee<br>- Motif associe egalement supprime<br>- Affichage mis a jour | Must | M1 |
| **FR12** | Le motif de sanction est obligatoire | - La sanction ne peut pas etre enregistree sans motif<br>- Dropdown avec motifs predefinis + champ libre<br>- Motifs predefinis : "Bavardage", "Insolence", "Violence", "Non-respect des regles", "Autre" | Must | M1 |
| **FR13** | Le systeme affiche les sanctions sous forme d'emojis tristes | - Chaque sanction = 1 emoji triste<br>- Maximum 10 par semaine par eleve<br>- Alerte visuelle a 10 | Must | M1 |
| **FR14** | Le systeme reinitialise automatiquement les sanctions chaque lundi | - Sanctions de la semaine precedente archivees<br>- Compteur remis a 0<br>- Historique conserve<br>- Reset rattrape si app fermee le weekend | Must | M1 |
| **FR15** | L'export JSON inclut les motifs de sanction | - Chaque sanction dans le JSON contient le champ `motif`<br>- Retrocompatibilite avec les exports V1 (motif = null pour anciennes sanctions) | Must | M1 |

#### 3.1.4 Gestion des Absences

| ID | Description | Criteres d'acceptation | Priorite | Module |
|----|-------------|----------------------|----------|--------|
| **FR16** | L'enseignant peut marquer un eleve comme absent | - Bouton "Absent" sur chaque carte<br>- Visuel distinct (carte grisee, icone "ABS")<br>- Label jour dans la ligne hebdo = "ABS" au lieu de emoji | Must | M1 |
| **FR17** | Un eleve absent n'est pas comptabilise dans les recompenses | - Pas d'attribution de recompense a 16h30 pour un absent<br>- La case du jour reste vide ou affiche "ABS"<br>- Les statistiques excluent les jours d'absence | Must | M1 |
| **FR18** | L'enseignant peut annuler une absence | - Clic sur le bouton "Absent" (toggle)<br>- La carte redevient normale<br>- L'eleve est de nouveau eligible aux recompenses | Must | M1 |

#### 3.1.5 Systeme de Recompenses

| ID | Description | Criteres d'acceptation | Priorite | Module |
|----|-------------|----------------------|----------|--------|
| **FR19** | Le systeme attribue automatiquement une recompense quotidienne a 16h30 | - 0 avertissement + 0 sanction = emoji plein (parfait)<br>- 1-2 avertissements + 0 sanction = emoji attenue (partiel)<br>- Sanction aujourd'hui = pas de recompense<br>- Absent = pas de recompense | Must | M1 |
| **FR20** | Les recompenses sont comptabilisees sur 4 jours : L, M, J, V | - Mercredi exclu (jour non travaille)<br>- Ligne hebdomadaire affiche uniquement les jours ecoules<br>- Reset le lundi avec les sanctions | Must | M1 |
| **FR21** | Une sanction annule la derniere recompense positive de la semaine | - Cherche d'abord un emoji partiel a annuler<br>- Si pas de partiel, annule le dernier emoji plein<br>- Si aucune recompense, la sanction est ajoutee sans annulation | Must | M1 |

#### 3.1.6 Interface en Cartes

| ID | Description | Criteres d'acceptation | Priorite | Module |
|----|-------------|----------------------|----------|--------|
| **FR22** | L'interface affiche les eleves sous forme de grille de cartes | - Ordre alphabetique fixe<br>- Toutes les cartes visibles sans scroll<br>- Adaptation automatique au nombre d'eleves (18-28) | Must | M1 |
| **FR23** | Chaque carte affiche : prenom, avertissements, ligne L-M-J-V, boutons | - Prenom en en-tete<br>- Avertissements a cote du prenom<br>- Ligne hebdomadaire toujours visible<br>- Boutons Avertir / Sanctionner / Absent | Must | M1 |
| **FR24** | L'enseignant peut basculer en mode plein ecran TBI | - Touche F11 ou bouton<br>- Grille de cartes en plein ecran<br>- Prenoms lisibles a 6 metres<br>- Emojis clairement distinguables<br>- Echap pour revenir | Must | M1 |

#### 3.1.7 Historique et Export

| ID | Description | Criteres d'acceptation | Priorite | Module |
|----|-------------|----------------------|----------|--------|
| **FR25** | L'enseignant peut consulter le bilan hebdomadaire par eleve | - Vue par semaine<br>- Nombre de sanctions + motifs<br>- Recompenses de la semaine<br>- Navigation sur 36 semaines | Must | M1 |
| **FR26** | L'enseignant peut exporter toutes les donnees au format JSON | - Export contient : eleves, sanctions (avec motifs), avertissements, recompenses, absences<br>- L'enseignant choisit l'emplacement de sauvegarde<br>- Export par periode ou complet | Must | M1 |

#### 3.1.8 Integration Systeme

| ID | Description | Criteres d'acceptation | Priorite | Module |
|----|-------------|----------------------|----------|--------|
| **FR27** | L'app se lance au demarrage du systeme | - Option autostart activee par defaut<br>- Minimisee dans le tray au lancement | Must | M1 |
| **FR28** | Icone dans la barre systeme (tray) | - Icone visible<br>- Clic gauche = affiche fenetre<br>- Clic droit = menu (Ouvrir / Quitter) | Must | M1 |
| **FR29** | Raccourci clavier global pour ouvrir l'app | - Configurable (defaut : Ctrl+Shift+C)<br>- Fonctionne depuis n'importe quelle application<br>- Ouvre en < 1 seconde | Must | M1 |
| **FR30** | Fermer la fenetre minimise dans le tray | - Le bouton X cache la fenetre<br>- L'app continue en arriere-plan<br>- Les resets automatiques continuent | Must | M1 |

---

### 3.2 Module 2 — Comportement Individuel (inchange V2)

| ID | Description | Criteres d'acceptation | Priorite | Module |
|----|-------------|----------------------|----------|--------|
| **FR31** | L'enseignant peut acceder a la fiche detaillee d'un eleve | - Navigation depuis la grille de cartes (clic sur le prenom)<br>- Vue individuelle avec historique complet<br>- Retour a la grille en un clic | Must | M2 |
| **FR32** | L'enseignant peut saisir un incident detaille pour un eleve | - Formulaire : date, heure, type d'evenement, motif, description, intervenant<br>- Types predefinis : "Comportement perturbateur", "Violence", "Insolence", "Non-respect du materiel", "Refus de travail", "Autre"<br>- Intervenant optionnel (defaut = enseignant)<br>- Sauvegarde en base avec FK vers eleve et periode | Must | M2 |
| **FR33** | L'enseignant peut consulter l'historique chronologique des incidents par eleve | - Liste triee par date decroissante<br>- Filtrage par type d'evenement<br>- Filtrage par periode scolaire<br>- Affichage : date, heure, type, motif, description, intervenant | Must | M2 |
| **FR34** | L'enseignant peut consulter les incidents par periode scolaire | - Selecteur de periode (trimestre/semestre configures)<br>- Resume par periode : nombre d'incidents par type<br>- Liste detaillee des incidents de la periode | Must | M2 |
| **FR35** | L'enseignant peut modifier un incident | - Tous les champs sont editables apres saisie<br>- Validation des champs obligatoires | Should | M2 |
| **FR36** | L'enseignant peut supprimer un incident | - Confirmation requise avant suppression<br>- Suppression definitive | Should | M2 |
| **FR37** | L'enseignant peut saisir un incident par dictee vocale | - Bouton micro sur le formulaire d'incident<br>- Transcription Whisper du champ description<br>- Correction possible avant validation | Could | M2 |

---

### 3.3 Module 3 — Domaines d'Apprentissage (refonde V2.1)

#### 3.3.1 Dictee vocale — Micro unique global

| ID | Description | Criteres d'acceptation | Priorite | Module |
|----|-------------|----------------------|----------|--------|
| **FR38** | L'enseignant peut dicter des observations via un micro unique global | - Bouton micro dans la toolbar du Module 3 (pas un par domaine)<br>- Indicateur visuel d'enregistrement (LED rouge, onde sonore)<br>- Push-to-talk (maintenir ou toggle)<br>- Audio capture au format WAV PCM 16-bit 16kHz<br>- Le micro fonctionne pour l'eleve actuellement selectionne | Must | M3 |
| **FR39** | Le systeme transcrit automatiquement l'audio en texte | - Whisper.cpp sidecar transcrit en francais<br>- Temps de transcription < 5 secondes pour 15 secondes d'audio<br>- Texte affiche dans une zone editable<br>- L'enseignant peut corriger avant structuration | Must | M3 |

#### 3.3.2 Pipeline LLM — Classificateur + Fusionneur

| ID | Description | Criteres d'acceptation | Priorite | Module |
|----|-------------|----------------------|----------|--------|
| **FR40** | Le LLM classifie automatiquement le domaine vise par la dictee et fusionne avec l'existant | - Le LLM recoit : texte dicte + domaines actifs de l'eleve + observations existantes par domaine<br>- Tache 1 : identifier le domaine d'apprentissage vise<br>- Tache 2 : fusionner le nouveau texte avec les observations existantes du domaine identifie, en eliminant les redondances<br>- Le LLM ne genere PAS de nouveau contenu, il reformule/fusionne uniquement ce qui est dicte<br>- Le LLM ne touche JAMAIS le niveau d'evaluation (100% decision du prof)<br>- Output JSON : `{ "domaine_id": N, "observation_mise_a_jour": "texte fusionne" }`<br>- Temps de structuration < 5 secondes | Must | M3 |
| **FR41** | L'enseignant valide via un panneau de revue diff Avant/Apres | - Panneau affichant pour chaque domaine modifie : texte Avant (existant) et texte Apres (fusionne)<br>- Edition inline du texte Apres<br>- Dropdown de reassignation du domaine (si le LLM s'est trompe de domaine)<br>- Boutons par domaine : Accepter / Modifier / Rejeter<br>- Bouton global "Valider tout"<br>- Insertion via prepared statements Rust apres validation<br>- Confirmation visuelle de l'enregistrement | Must | M3 |

#### 3.3.3 Domaines dynamiques par cycle

| ID | Description | Criteres d'acceptation | Priorite | Module |
|----|-------------|----------------------|----------|--------|
| **FR42** | Les domaines sont charges dynamiquement selon le cycle de l'eleve | - Chaque eleve a un niveau (PS-CM2) determinant son cycle (C1/C2/C3)<br>- Domaines affiches = domaines actifs du cycle de l'eleve<br>- Cycle 1 : 5 domaines, Cycle 2 : 7 domaines, Cycle 3 : 8 domaines<br>- Les domaines s'adaptent automatiquement au changement de niveau | Must | M3 |
| **FR43** | L'enseignant peut saisir manuellement une appreciation (sans dictee) | - Formulaire : eleve, periode, domaine (liste filtree par cycle), niveau LSU, observations<br>- Alternative a la dictee vocale<br>- Meme resultat en base | Must | M3 |
| **FR44** | Les domaines d'apprentissage suivent le referentiel officiel par cycle | - Referentiel TS `domaines-officiels.ts` avec hierarchie cycle → domaines<br>- Cycle 3 : Francais, Mathematiques, Sciences et Technologies, Histoire-Geographie, EMC, EPS, Arts Plastiques + Education Musicale, Langues Vivantes<br>- Cycle 2 : Francais, Mathematiques, Questionner le monde, EMC, EPS, Arts, Langues Vivantes<br>- Cycle 1 : Mobiliser le langage, Agir s'exprimer comprendre (activite physique), Agir s'exprimer comprendre (activites artistiques), Construire les premiers outils, Explorer le monde<br>- L'enseignant peut ajouter des domaines custom (`is_custom = true`)<br>- Le changement de niveau propose "Reinitialiser les domaines pour [niveau]" | Must | M3 |

#### 3.3.4 Echelle d'evaluation LSU

| ID | Description | Criteres d'acceptation | Priorite | Module |
|----|-------------|----------------------|----------|--------|
| **FR60** | L'echelle d'evaluation suit les 4 niveaux officiels du LSU | - Niveaux : "Non atteints", "Partiellement atteints", "Atteints", "Depasses"<br>- Valeurs BDD : `non_atteints`, `partiellement_atteints`, `atteints`, `depasses`<br>- Migration automatique des donnees V2 : debut→non_atteints, en_cours_acquisition→partiellement_atteints, maitrise→atteints<br>- Le niveau est 100% choisi par l'enseignant (jamais par le LLM) | Must | M3 |

#### 3.3.5 Undo/Redo des observations

| ID | Description | Criteres d'acceptation | Priorite | Module |
|----|-------------|----------------------|----------|--------|
| **FR61** | L'enseignant peut annuler la derniere modification LLM sur une observation | - Colonne `previous_observations` stocke le texte avant modification LLM<br>- Bouton "Annuler" (undo) par domaine dans le tableau<br>- Swap `observations` ↔ `previous_observations`<br>- Undo disponible tant que `previous_observations` n'est pas null<br>- L'undo restaure uniquement le texte, pas le niveau d'evaluation | Must | M3 |

#### 3.3.6 Appreciation generale

| ID | Description | Criteres d'acceptation | Priorite | Module |
|----|-------------|----------------------|----------|--------|
| **FR62** | L'enseignant peut saisir une appreciation generale par eleve et par periode | - Champ texte libre (max 1500 caracteres, limite LSU)<br>- Bouton "Generer brouillon" envoie toutes les observations de la periode au LLM<br>- Le LLM synthetise un paragraphe (brouillon editable)<br>- L'enseignant modifie librement avant validation<br>- Sauvegarde en base independante des appreciations par domaine | Must | M3 |

---

### 3.4 Infrastructure IA

| ID | Description | Criteres d'acceptation | Priorite | Module |
|----|-------------|----------------------|----------|--------|
| **FR45** | Le sidecar whisper-server demarre a la demande pour la transcription | - Demarrage declenche par push-to-talk<br>- Healthcheck HTTP confirme la disponibilite<br>- Arret automatique apres 30 secondes d'inactivite<br>- Watchdog avec restart automatique si reponse vide | Must | IA |
| **FR46** | Le sidecar llama-server demarre a la demande avec GBNF dynamique | - Demarrage declenche apres validation du texte transcrit<br>- **Grammaire GBNF generee dynamiquement** depuis les domaines actifs de l'eleve en BDD<br>- **System prompt construit cote Rust** : niveau, domaines, observations existantes, instructions classification+fusion<br>- API REST OpenAI-compatible sur localhost<br>- ctx-size = 2048 tokens<br>- Arret automatique apres 60 secondes d'inactivite | Must | IA |
| **FR47** | Le pipeline s'execute de maniere sequentielle (un seul modele actif) | - Whisper demarre, transcrit, puis s'arrete<br>- Ensuite llama-server demarre, structure, puis s'arrete<br>- Jamais les deux simultanes sur PC 4 Go RAM<br>- Mode concurrent optionnel si PC 8 Go+ detecte | Must | IA |
| **FR48** | Le LLM genere un JSON de classification et fusion (pas de SQL, pas d'IDs BDD) | - Output LLM contraint par GBNF dynamique<br>- Format : `{ "domaine_id": N, "observation_mise_a_jour": "texte fusionne" }`<br>- Le `domaine_id` est un index local (1-N des domaines actifs), pas un ID BDD<br>- Rust mappe l'index local vers l'ID BDD reel<br>- Le LLM n'a jamais connaissance de la structure BDD | Must | IA |
| **FR49** | Le validateur Rust verifie chaque sortie LLM avant insertion | - Couche 1 : Prompt contraint (classification+fusion uniquement)<br>- Couche 2 : Grammaire GBNF dynamique (controle au niveau token)<br>- Couche 3 : Validation Rust (domaine_id dans range, texte non vide, longueur < 300 car.)<br>- Couche 4 : Prepared statements SQLite<br>- Rejet avec message d'erreur si validation echoue | Must | IA |
| **FR50** | Le VAD filtre les silences avant transcription | - Flag `--vad` natif de whisper.cpp<br>- Seuls les segments de parole sont transcrits<br>- Reduction des hallucinations Whisper sur les silences | Must | IA |

---

### 3.5 Gestion des Modeles IA (inchange V2)

| ID | Description | Criteres d'acceptation | Priorite | Module |
|----|-------------|----------------------|----------|--------|
| **FR51** | Premier lancement : ecran de telechargement des modeles | - Detection automatique de l'absence des modeles GGUF<br>- Ecran "Configuration initiale" avec barre de progression<br>- Telechargement sequentiel : Whisper small FR (~480 Mo), Qwen 2.5 (~980 Mo)<br>- Verification SHA256<br>- Stockage dans app_data_dir() | Must | IA |
| **FR52** | Les modeles sont stockes dans le repertoire de donnees de l'application | - Chemin : `AppData/comportement/models/` (Windows), `~/Library/.../comportement/models/` (macOS)<br>- Flag `models_ready` en base apres telechargement reussi<br>- L'app fonctionne sans les modeles (Modules 1 et 2 disponibles, Module 3 desactive) | Must | IA |
| **FR53** | Installation des modeles depuis une cle USB | - Bouton "Installer depuis un dossier local"<br>- Copie des fichiers GGUF + verification SHA256<br>- Solution alternative si proxy ecole bloque Hugging Face | Must | IA |

---

### 3.6 Configuration (evolue V2.1)

| ID | Description | Criteres d'acceptation | Priorite | Module |
|----|-------------|----------------------|----------|--------|
| **FR54** | L'enseignant peut configurer les periodes scolaires | - Choix entre trimestres et semestres<br>- Date de debut et fin pour chaque periode<br>- Periodes rattachees a l'annee scolaire active<br>- Nom d'affichage personnalisable | Must | Config |
| **FR55** | L'enseignant peut acceder aux parametres de l'application | - Page Parametres accessible depuis le menu<br>- Sections : Annee scolaire, Periodes, Niveaux de classe, Domaines, Modeles IA, LSU, Raccourci clavier, Autostart<br>- Sauvegarde immediate | Must | Config |
| **FR56** | L'enseignant peut naviguer entre les 3 modules | - Navigation principale (onglets ou menu lateral)<br>- Module 1 = vue par defaut au lancement<br>- Transition fluide entre modules (< 300ms)<br>- Etat conserve lors du changement de module | Must | Config |

---

### 3.7 Capture Audio (inchange V2)

| ID | Description | Criteres d'acceptation | Priorite | Module |
|----|-------------|----------------------|----------|--------|
| **FR57** | Le systeme capture l'audio du microphone pour la dictee vocale | - Plan A : tauri-plugin-mic-recorder<br>- Plan B (fallback) : Web Audio API (`getUserMedia`)<br>- Format de sortie : WAV PCM 16-bit, 16kHz, mono<br>- Permission micro demandee au premier usage<br>- Indicateur visuel pendant l'enregistrement | Must | M3 |

---

### 3.8 Gestion de l'annee scolaire (nouveau V2.1)

| ID | Description | Criteres d'acceptation | Priorite | Module |
|----|-------------|----------------------|----------|--------|
| **FR58** | L'enseignant peut creer et gerer une annee scolaire | - Creation avec label (ex: "2025-2026"), date debut, date fin<br>- Une seule annee active a la fois<br>- Cloture d'annee : double confirmation, passage en lecture seule<br>- Reouverture possible (si cloture par erreur)<br>- L'annee scolaire est le conteneur principal pour periodes, appreciations, incidents | Must | Config |
| **FR59** | L'enseignant peut attribuer un niveau scolaire a chaque eleve | - Niveaux disponibles : PS, MS, GS, CP, CE1, CE2, CM1, CM2<br>- Attribution individuelle ou en masse (selectionner plusieurs eleves → meme niveau)<br>- Le niveau determine le cycle (C1: PS-GS, C2: CP-CE2, C3: CM1-CM2)<br>- Le cycle conditionne les domaines affiches pour l'eleve<br>- Classes multi-niveaux supportees nativement (ex: CE1+CM2 dans la meme classe) | Must | Config |
| **FR65** | L'enseignant peut creer une nouvelle annee scolaire via l'assistant de rentree | - Wizard : nom de l'annee, dates, nombre de periodes<br>- Option "Conserver les eleves" (reset donnees, garder prenoms+niveaux)<br>- Option "Nouvelle classe" (partir de zero)<br>- L'ancienne annee est cloturee automatiquement | Should | Config |

---

### 3.9 Export LSU (nouveau V2.1)

| ID | Description | Criteres d'acceptation | Priorite | Module |
|----|-------------|----------------------|----------|--------|
| **FR63** | L'enseignant peut exporter les donnees au format LSU XML | - Generateur XML cote Rust<br>- Export par periode ou par annee complete<br>- XML conforme a la structure attendue par Pleiade (ONDE/LSU)<br>- Checklist pre-export : verification completude (appreciations remplies, niveaux attribues, identifiants presents)<br>- L'enseignant choisit l'emplacement de sauvegarde<br>- Fallback CSV/PDF si le format XML n'est pas viable (XSD non public) | Should | M3 |
| **FR64** | L'enseignant peut saisir les identifiants ONDE pour l'export LSU | - Identifiants : UAI (etablissement), INC (inspection), INE (eleve)<br>- Saisie manuelle dans les parametres<br>- Import CSV optionnel (export Base Eleves)<br>- Identifiants requis uniquement pour l'export LSU, pas pour l'usage quotidien | Should | Config |

---

## 4. Non-Functional Requirements

### 4.1 Performance

| ID | Description | Cible | Priorite |
|----|-------------|-------|----------|
| **NFR1** | Toute action utilisateur (avertir, sanctionner, naviguer) s'execute rapidement | < 1 seconde | Must |
| **NFR2** | L'app se lance et est utilisable rapidement | < 3 secondes (sans demarrage sidecars) | Must |
| **NFR3** | L'affichage TBI se met a jour instantanement apres une action | < 500ms | Must |
| **NFR4** | Le raccourci clavier global ouvre l'app rapidement | < 1 seconde | Must |
| **NFR5** | Le temps de transcription Whisper est acceptable | < 5 secondes pour 15 secondes d'audio | Must |
| **NFR6** | Le temps de classification+fusion LLM est acceptable | < 5 secondes par observation (ctx-size 2048) | Must |
| **NFR7** | Le temps total du pipeline dictee-a-insertion est acceptable | < 15 secondes (dictee, transcription, correction, classification+fusion, revue, validation) | Must |
| **NFR8** | L'attribution automatique des recompenses a 16h30 est rapide | < 1 seconde pour 30 eleves | Must |

### 4.2 Securite et Conformite RGPD

| ID | Description | Cible | Priorite |
|----|-------------|-------|----------|
| **NFR9** | Les donnees ne quittent jamais le poste | Zero connexion reseau apres installation des modeles | Must |
| **NFR10** | Le LLM ne peut pas executer d'operations destructrices | 4 couches de validation (Prompt, GBNF dynamique, Rust, Prepared Statements) | Must |
| **NFR11** | Le taux de classification+fusion valide est eleve | > 95% apres validation GBNF + Rust | Must |
| **NFR12** | Les donnees nominatives restent locales | Prenoms et INE stockes uniquement en SQLite local, pas de telemetrie | Must |

### 4.3 Compatibilite et Deploiement

| ID | Description | Cible | Priorite |
|----|-------------|-------|----------|
| **NFR13** | L'app fonctionne sur le PC ecole | Windows 10/11, 4 Go RAM minimum, CPU standard (pas de GPU) | Must |
| **NFR14** | Mode portable sans installateur | .exe unique, pas de modification du registre | Must |
| **NFR15** | La taille totale de la distribution est raisonnable | < 2 Go (exe + modeles GGUF) | Must |
| **NFR16** | Le pic de RAM reste dans les limites du PC ecole | < 2 Go en mode sequentiel, ctx-size LLM = 2048 tokens | Must |
| **NFR17** | Le build cross-platform est supporte | Windows (.exe) prioritaire, macOS (.app) secondaire | Should |

### 4.4 Fiabilite

| ID | Description | Cible | Priorite |
|----|-------------|-------|----------|
| **NFR18** | Les donnees sont sauvegardees automatiquement apres chaque modification | Sauvegarde SQLite immediate, WAL mode | Must |
| **NFR19** | Aucune perte de donnees en cas de fermeture inattendue | Durabilite SQLite garantie | Must |
| **NFR20** | Les resets automatiques (16h30, lundi) s'executent avec 100% de fiabilite | Double verification au lancement + scheduler Rust | Must |
| **NFR21** | L'app reste stable lors d'une utilisation continue sur une journee complete | Pas de memory leak, pas de freeze | Must |
| **NFR22** | Le watchdog whisper-server redemarrage automatiquement | Healthcheck + restart apres N requetes ou reponse vide | Must |

### 4.5 Accessibilite TBI

| ID | Description | Cible | Priorite |
|----|-------------|-------|----------|
| **NFR23** | Les prenoms sont lisibles a distance sur TBI | Lisible a 6 metres | Must |
| **NFR24** | Contraste eleve entre texte et fond | Ratio minimum 4.5:1 (WCAG AA) | Must |
| **NFR25** | Les emojis sont grands et distinguables | Taille adaptee au mode TBI | Must |
| **NFR26** | Pas de clignotements ou animations distrayantes | Animations statiques uniquement | Must |
| **NFR27** | Palette daltonisme-friendly | Pas de differentiation rouge/vert uniquement | Must |

### 4.6 Migrations et Donnees (nouveau V2.1)

| ID | Description | Cible | Priorite |
|----|-------------|-------|----------|
| **NFR28** | Les migrations BDD sont additives et non destructives | Backup automatique de la BDD avant chaque migration, rollback possible, zero perte de donnees | Must |
| **NFR29** | L'export LSU XML est conforme a la structure attendue | XML valide contre la structure Pleiade (ONDE/LSU), fallback CSV/PDF si XSD indisponible | Should |
| **NFR30** | L'undo des observations est fiable et instantane | Restauration du texte en < 1 seconde, swap atomique observations ↔ previous_observations, jamais de perte de donnees | Must |

---

## 5. Data Model

### 5.1 Schema SQLite complet

#### Tables V1 (inchangees)

```sql
CREATE TABLE students (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  first_name TEXT NOT NULL,
  warnings INTEGER DEFAULT 0,
  niveau TEXT CHECK(niveau IN ('PS','MS','GS','CP','CE1','CE2','CM1','CM2')),  -- V2.1
  annee_id INTEGER REFERENCES annees_scolaires(id),  -- V2.1
  ine TEXT,  -- V2.1 (identifiant national eleve, optionnel)
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE sanctions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  student_id INTEGER NOT NULL,
  reason TEXT,
  week_number INTEGER NOT NULL,
  year INTEGER NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE
);

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
```

#### Tables V2.1 — Annee scolaire (nouveau)

```sql
CREATE TABLE annees_scolaires (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  label TEXT NOT NULL,           -- ex: "2025-2026"
  date_debut DATE NOT NULL,
  date_fin DATE NOT NULL,
  active INTEGER DEFAULT 1,      -- 1 = annee en cours
  cloturee INTEGER DEFAULT 0,    -- 1 = lecture seule
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE niveaux_classe (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  annee_id INTEGER NOT NULL REFERENCES annees_scolaires(id),
  niveau TEXT NOT NULL CHECK(niveau IN ('PS','MS','GS','CP','CE1','CE2','CM1','CM2')),
  cycle TEXT NOT NULL CHECK(cycle IN ('C1','C2','C3')),
  UNIQUE(annee_id, niveau)
);

CREATE INDEX idx_niveaux_annee ON niveaux_classe(annee_id);
```

#### Tables V2 — Configuration des Periodes (evoluee V2.1)

```sql
CREATE TABLE config_periodes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  annee_scolaire TEXT NOT NULL,
  annee_id INTEGER REFERENCES annees_scolaires(id),  -- V2.1
  type_periode TEXT NOT NULL CHECK(type_periode IN ('trimestre', 'semestre')),
  numero INTEGER NOT NULL,
  date_debut DATE NOT NULL,
  date_fin DATE NOT NULL,
  nom_affichage TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_periodes_annee ON config_periodes(annee_scolaire);
CREATE INDEX idx_periodes_annee_id ON config_periodes(annee_id);
CREATE INDEX idx_periodes_dates ON config_periodes(date_debut, date_fin);
```

#### Tables V2 — Module 2 : Comportement Individuel (inchange)

```sql
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

#### Tables V2.1 — Module 3 : Domaines d'Apprentissage (evolue)

```sql
-- Domaines parametrables — enrichis V2.1
CREATE TABLE domaines_apprentissage (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  nom TEXT NOT NULL,
  cycle TEXT CHECK(cycle IN ('C1','C2','C3')),          -- V2.1
  code_lsu TEXT,                                         -- V2.1 (code officiel LSU)
  is_custom INTEGER DEFAULT 0,                           -- V2.1 (0=officiel, 1=custom)
  ordre_affichage INTEGER DEFAULT 0,
  actif INTEGER DEFAULT 1,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  -- Note: UNIQUE sur nom RETIRE — meme nom possible dans 2 cycles
);

CREATE INDEX idx_domaines_cycle ON domaines_apprentissage(cycle);

-- Appreciations — evoluees V2.1
CREATE TABLE appreciations (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  eleve_id INTEGER NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  periode_id INTEGER NOT NULL REFERENCES config_periodes(id),
  domaine_id INTEGER NOT NULL REFERENCES domaines_apprentissage(id),
  date_evaluation DATE,
  niveau_lsu TEXT CHECK(niveau_lsu IN (
    'non_atteints', 'partiellement_atteints', 'atteints', 'depasses'
  )),                                                    -- V2.1 : 4 niveaux LSU
  observations TEXT,
  previous_observations TEXT,                            -- V2.1 : undo/redo
  texte_dictation TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_appreciations_eleve ON appreciations(eleve_id);
CREATE INDEX idx_appreciations_periode ON appreciations(periode_id);
CREATE INDEX idx_appreciations_domaine ON appreciations(domaine_id);

-- Appreciation generale par eleve/periode — V2.1
CREATE TABLE appreciations_generales (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  eleve_id INTEGER NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  periode_id INTEGER NOT NULL REFERENCES config_periodes(id),
  texte TEXT,                                            -- max 1500 car. (limite LSU)
  genere_par_llm INTEGER DEFAULT 0,                      -- 1 si brouillon LLM
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(eleve_id, periode_id)
);

CREATE INDEX idx_appre_gen_eleve ON appreciations_generales(eleve_id);
```

#### Tables V2.1 — Configuration LSU (nouveau)

```sql
CREATE TABLE config_lsu (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  annee_id INTEGER NOT NULL REFERENCES annees_scolaires(id),
  uai TEXT,              -- Unité Administrative Immatriculée (code établissement)
  inc TEXT,              -- Inspection (code inspection)
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(annee_id)
);
```

#### Tables V2 — Infrastructure IA (inchange)

```sql
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

### 5.2 Donnees initiales (seed) — V2.1

```sql
-- Domaines d'apprentissage officiels par cycle

-- Cycle 1 (PS, MS, GS)
INSERT INTO domaines_apprentissage (nom, cycle, code_lsu, is_custom, ordre_affichage) VALUES
  ('Mobiliser le langage dans toutes ses dimensions', 'C1', 'LGA', 0, 1),
  ('Agir, s''exprimer, comprendre a travers l''activite physique', 'C1', 'APH', 0, 2),
  ('Agir, s''exprimer, comprendre a travers les activites artistiques', 'C1', 'AAR', 0, 3),
  ('Construire les premiers outils pour structurer sa pensee', 'C1', 'OPS', 0, 4),
  ('Explorer le monde', 'C1', 'EXM', 0, 5);

-- Cycle 2 (CP, CE1, CE2)
INSERT INTO domaines_apprentissage (nom, cycle, code_lsu, is_custom, ordre_affichage) VALUES
  ('Francais', 'C2', 'FRA', 0, 1),
  ('Mathematiques', 'C2', 'MAT', 0, 2),
  ('Questionner le monde', 'C2', 'QLM', 0, 3),
  ('Enseignement Moral et Civique', 'C2', 'EMC', 0, 4),
  ('Education Physique et Sportive', 'C2', 'EPS', 0, 5),
  ('Arts', 'C2', 'ART', 0, 6),
  ('Langues Vivantes', 'C2', 'LVE', 0, 7);

-- Cycle 3 (CM1, CM2)
INSERT INTO domaines_apprentissage (nom, cycle, code_lsu, is_custom, ordre_affichage) VALUES
  ('Francais', 'C3', 'FRA', 0, 1),
  ('Mathematiques', 'C3', 'MAT', 0, 2),
  ('Sciences et Technologies', 'C3', 'SCT', 0, 3),
  ('Histoire-Geographie', 'C3', 'HGE', 0, 4),
  ('Enseignement Moral et Civique', 'C3', 'EMC', 0, 5),
  ('Education Physique et Sportive', 'C3', 'EPS', 0, 6),
  ('Arts Plastiques', 'C3', 'APL', 0, 7),
  ('Education Musicale', 'C3', 'EMU', 0, 8),
  ('Langues Vivantes', 'C3', 'LVE', 0, 9);
```

### 5.3 Migrations V2 → V2.1

```sql
-- Migration 1 : Table annees_scolaires
CREATE TABLE IF NOT EXISTS annees_scolaires (...);

-- Migration 2 : Colonnes sur students
ALTER TABLE students ADD COLUMN niveau TEXT;
ALTER TABLE students ADD COLUMN annee_id INTEGER REFERENCES annees_scolaires(id);
ALTER TABLE students ADD COLUMN ine TEXT;

-- Migration 3 : Table niveaux_classe
CREATE TABLE IF NOT EXISTS niveaux_classe (...);

-- Migration 4 : Echelle LSU sur appreciations
ALTER TABLE appreciations ADD COLUMN niveau_lsu TEXT;
ALTER TABLE appreciations ADD COLUMN previous_observations TEXT;
-- Migration donnees existantes :
UPDATE appreciations SET niveau_lsu = CASE
  WHEN niveau = 'debut' THEN 'non_atteints'
  WHEN niveau = 'en_cours_acquisition' THEN 'partiellement_atteints'
  WHEN niveau = 'maitrise' THEN 'atteints'
  ELSE NULL
END;

-- Migration 5 : Enrichissement domaines_apprentissage
ALTER TABLE domaines_apprentissage ADD COLUMN cycle TEXT;
ALTER TABLE domaines_apprentissage ADD COLUMN code_lsu TEXT;
ALTER TABLE domaines_apprentissage ADD COLUMN is_custom INTEGER DEFAULT 0;
-- Marquer les domaines existants comme C3 (CM2 actuel)
UPDATE domaines_apprentissage SET cycle = 'C3', is_custom = 0;

-- Migration 6 : FK annee_id sur config_periodes
ALTER TABLE config_periodes ADD COLUMN annee_id INTEGER;

-- Migration 7 : Table appreciations_generales
CREATE TABLE IF NOT EXISTS appreciations_generales (...);

-- Migration 8 : Table config_lsu
CREATE TABLE IF NOT EXISTS config_lsu (...);
```

### 5.4 Relations entre tables

```
annees_scolaires (conteneur principal V2.1)
  |
  +--< niveaux_classe (niveaux presents dans la classe cette annee)
  +--< config_periodes.annee_id
  +--< students.annee_id
  +--< config_lsu.annee_id

students (table centrale)
  |  (warnings = colonne INTEGER, reset quotidien)
  |  (niveau = PS-CM2, determine le cycle → domaines)
  |
  +--< sanctions (1:N, reset hebdo, motif obligatoire)
  +--< daily_rewards (1:N, 1 par jour travaille L-M-J-V)
  +--< absences (1:N)
  +--< comportement_detail (1:N, Module 2, FK periode)
  +--< appreciations (1:N, Module 3, FK periode + domaine)
  +--< appreciations_generales (1:N, V2.1, FK periode)

config_periodes
  |
  +--< comportement_detail.periode_id
  +--< appreciations.periode_id
  +--< appreciations_generales.periode_id

domaines_apprentissage (filtres par cycle de l'eleve)
  |
  +--< appreciations.domaine_id
```

---

## 6. User Interaction Flows

### 6.1 Flow : Dictee vocale et classification+fusion (Module 3 — refonde V2.1)

```
1. Enseignant selectionne un eleve dans le tableau des appreciations
2. Appuie sur le micro unique global (toolbar)
   → Indicateur visuel "Enregistrement en cours"
   → Audio capture en WAV PCM 16kHz

3. Relache le bouton (fin d'enregistrement)
   → [SIDECAR] whisper-server demarre (si pas deja actif)
   → [SIDECAR] Whisper transcrit l'audio en texte (~3-5s)
   → [SIDECAR] whisper-server s'arrete
   → Texte affiche dans une zone editable

4. Enseignant verifie/corrige le texte transcrit
   → Peut corriger les erreurs de transcription
   → Bouton "Structurer" pour lancer le LLM

5. Clic sur "Structurer"
   → [RUST] Recupere domaines actifs de l'eleve (selon son cycle)
   → [RUST] Recupere observations existantes par domaine pour la periode
   → [RUST] Genere GBNF dynamique + system prompt contextuel
   → [SIDECAR] llama-server demarre avec GBNF dynamique (ctx-size 2048)
   → [SIDECAR] LLM classifie le domaine + fusionne texte (~3-5s)
   → [SIDECAR] llama-server s'arrete
   → [RUST] Valide le JSON (domaine dans range, texte non vide)

6. Panneau de revue diff s'affiche
   → Pour chaque domaine modifie : texte Avant | texte Apres
   → Edition inline du texte Apres
   → Dropdown reassignation domaine (si erreur de classification)
   → Boutons : Accepter / Modifier / Rejeter (par domaine)
   → Bouton "Valider tout"

7. Enseignant valide
   → [RUST] previous_observations = ancien texte (pour undo)
   → [RUST] Prepared statement UPDATE execute
   → Confirmation visuelle
   → Retour au tableau des appreciations
```

### 6.2 Flow : Sanction avec motif obligatoire (Module 1 — inchange)

```
1. Eleve perturbe la classe
2. Enseignant clique sur la carte de l'eleve
3. Clique sur le bouton "Sanctionner"
4. Modale s'affiche avec :
   - Dropdown motifs predefinis (Bavardage, Insolence, Violence, Non-respect, Autre)
   - Champ libre pour precisions
   - Bouton "Valider" (actif uniquement si motif selectionne)
5. Enseignant selectionne un motif et valide
   → Sanction enregistree avec motif
   → Emoji triste ajoute sur la carte
   → Derniere recompense positive annulee (si applicable)
   → Affichage TBI mis a jour
```

### 6.3 Flow : Saisie d'un incident detaille (Module 2 — inchange)

```
1. Enseignant clique sur le prenom d'un eleve (ou navigue vers Module 2)
2. Fiche individuelle de l'eleve s'affiche
3. Clique sur "Nouvel incident"
4. Formulaire :
   - Date (defaut : aujourd'hui)
   - Heure (defaut : heure actuelle)
   - Type d'evenement (dropdown)
   - Motif (champ texte obligatoire)
   - Description (champ texte optionnel, micro dictee optionnel)
   - Intervenant (defaut : Enseignant)
5. Enregistrement → incident ajoute a l'historique
```

### 6.4 Flow : Marquage d'absence (Module 1 — inchange)

```
1. Eleve absent
2. Enseignant clique sur "ABS" sur la carte
3. La carte se grise, icone "ABS" affichee
4. A 16h30 : pas de recompense pour cet eleve
5. Dans la ligne L-M-J-V : case du jour = "ABS"
6. Si l'eleve revient : re-clic sur "ABS" pour annuler
```

### 6.5 Flow : Premier lancement (telechargement modeles — inchange)

```
1. L'enseignant lance l'app pour la premiere fois
2. L'app detecte l'absence des modeles GGUF
3. Ecran "Configuration initiale" :
   - "Pour utiliser la dictee vocale, des modeles IA doivent etre installes (~1.5 Go)"
   - Bouton "Telecharger depuis internet"
   - Bouton "Installer depuis un dossier local (cle USB)"
4a. Si telechargement internet :
   - Barre de progression pour chaque modele
   - Verification SHA256
   - Confirmation "Modeles installes avec succes"
4b. Si installation USB :
   - Selecteur de dossier
   - Copie + verification SHA256
   - Confirmation
5. Les Modules 1 et 2 sont utilisables immediatement
6. Le Module 3 devient actif apres installation des modeles
```

### 6.6 Flow : Configuration des periodes scolaires (inchange)

```
1. Enseignant va dans Parametres
2. Section "Periodes scolaires"
3. Choix : Trimestres (3 periodes) ou Semestres (2 periodes)
4. Pour chaque periode :
   - Nom d'affichage (ex: "Trimestre 1")
   - Date de debut
   - Date de fin
5. Validation → periodes enregistrees en base
6. Les Modules 2 et 3 utilisent ces periodes comme reference
```

### 6.7 Flow : Creation d'une annee scolaire (nouveau V2.1)

```
1. Enseignant va dans Parametres > Annee scolaire
2. Clique sur "Nouvelle annee scolaire"
3. Wizard etape 1 — Informations :
   - Label (ex: "2026-2027")
   - Date de debut, Date de fin
4. Wizard etape 2 — Niveaux :
   - Cocher les niveaux presents dans la classe (ex: CM1 + CM2)
   - Les cycles correspondants sont affiches automatiquement
5. Wizard etape 3 — Eleves :
   - Option A : "Conserver les eleves de l'annee precedente" (reset donnees, garder prenoms+niveaux)
   - Option B : "Nouvelle classe" (partir de zero)
6. Wizard etape 4 — Periodes :
   - Configuration rapide des periodes (trimestres ou semestres)
7. Validation
   → Ancienne annee cloturee automatiquement (si applicable)
   → Nouvelle annee active
   → Domaines charges selon les niveaux selectionnes
```

### 6.8 Flow : Export LSU XML (nouveau V2.1)

```
1. Enseignant va dans Module 3 > Export LSU
2. Checklist pre-export s'affiche :
   - [ ] Tous les domaines de chaque eleve ont un niveau attribue
   - [ ] Appreciation generale remplie pour chaque eleve
   - [ ] Identifiants ONDE configures (UAI, INE)
   - Elements manquants surlignés en rouge
3. Enseignant complete les elements manquants (ou choisit d'exporter quand meme)
4. Selection de la periode a exporter (ou annee complete)
5. Clic sur "Exporter"
   → [RUST] Generation du fichier XML
   → Boite de dialogue pour choisir l'emplacement
   → Confirmation "Export LSU genere avec succes"
6. Si XML non viable (XSD non public) : fallback CSV ou PDF
```

### 6.9 Flow : Undo d'une modification LLM (nouveau V2.1)

```
1. L'enseignant constate que la fusion LLM a degrade une observation
2. Sur la ligne du domaine concerne, clique sur "Annuler"
3. Le texte d'avant la modification est restaure
   → observations = previous_observations (swap)
   → Confirmation visuelle "Observation restauree"
4. Le bouton "Annuler" disparait (undo = un seul niveau)
```

### 6.10 Flow : Generation de l'appreciation generale (nouveau V2.1)

```
1. Enseignant selectionne un eleve dans le Module 3
2. Clique sur "Appreciation generale" (onglet ou section dediee)
3. Si aucune appreciation n'existe pour cette periode :
   → Champ texte vide + bouton "Generer brouillon"
4. Clic sur "Generer brouillon"
   → [RUST] Recupere toutes les observations de l'eleve pour la periode en cours
   → [SIDECAR] llama-server demarre avec prompt de synthese
   → [SIDECAR] LLM synthetise un paragraphe (~3-5s)
   → [SIDECAR] llama-server s'arrete
   → [RUST] Valide la longueur (< 1500 car.)
   → Texte affiche dans le champ editable (marque "brouillon LLM")
5. Enseignant modifie librement le texte
   → Edition inline, pas de contrainte de format
   → Compteur de caracteres visible (limite 1500 LSU)
6. Clic sur "Enregistrer"
   → Sauvegarde en base (appreciations_generales)
   → Confirmation visuelle
7. Modification ulterieure possible (le brouillon LLM n'ecrase jamais un texte existant sans confirmation)
```

---

## 7. Constraints & Assumptions

### 7.1 Contraintes techniques

| Contrainte | Impact | Mitigation |
|------------|--------|------------|
| **PC ecole 4 Go RAM** | Les deux sidecars ne peuvent pas tourner simultanement | Pipeline sequentiel obligatoire |
| **Pas de GPU** | Inference CPU uniquement | Whisper.cpp et llama.cpp optimises CPU (AVX2, ARM NEON) |
| **Proxy ecole** | Peut bloquer le telechargement des modeles | Solution USB alternative (FR53) |
| **Mode portable** | Pas d'installateur, pas de modification registre | .exe unique + modeles dans AppData |
| **Windows SmartScreen** | Peut bloquer l'exe non signe | Mode portable eprouve en V1 |
| **Pas de WiFi fiable** | L'app doit fonctionner 100% offline apres installation | Aucune connexion reseau post-installation |
| **XSD LSU non public** | Le schema XML officiel (Pleiade) n'est pas distribue | Reverse-engineer depuis Opencomp/Gepi (open source) + fallback CSV/PDF |
| **ctx-size LLM limite** | En fin de periode, observations cumulees peuvent depasser le contexte | ctx-size monte a 2048, resume des observations si depassement |
| **Mise a jour manuelle** | Pas d'auto-updater (mode portable, pas d'installateur) | L'enseignant remplace manuellement le .exe. Notification visuelle de version dans Settings (compare version locale vs version attendue). Distribution par l'administration ou telechargement direct. |

### 7.2 Contraintes metier

| Contrainte | Description |
|------------|-------------|
| **Utilisateur unique** | Un seul enseignant, une seule classe (plusieurs niveaux possible) |
| **18 eleves actuels** | Effectif reel, systeme supporte jusqu'a 30 |
| **Calendrier scolaire francais** | 4 jours travailles (L, M, J, V), mercredi exclu |
| **Prenoms immuables** | L'orthographe des prenoms ne change jamais |
| **Periodes variables** | Trimestres ou semestres selon l'ecole/circonscription |
| **Classes multi-niveaux** | Un eleve CE1 et un eleve CM2 dans la meme classe = domaines differents |
| **Echelle LSU officielle** | 4 niveaux : Non atteints / Partiellement atteints / Atteints / Depasses |
| **Limite caracteres LSU** | Appreciation generale : 1500 car. max, appreciation disciplinaire : 300 car. max |

### 7.3 Assumptions

| Assumption | Justification |
|------------|---------------|
| Le PC ecole dispose d'un microphone | Micro USB externe si absent |
| Whisper small FR est suffisant pour le francais parle avec accents | Recherche technique confirme |
| Qwen 2.5 Coder 1.5B classifie correctement le domaine > 90% du temps | Le panneau de revue + dropdown reassignation couvre les erreurs |
| L'enseignant accepte un temps de pipeline de ~15 secondes | Gain de temps par rapport a la saisie manuelle |
| Le mode sequentiel suffit pour l'usage en classe | L'enseignant ne fait pas 2 dictees en parallele |
| La stack V1 (Tauri + React + SQLite + Zustand) est stable | 3+ mois de production quotidienne |
| Qwen 2.5 0.5B pourrait suffire pour classification+fusion | Benchmark a realiser (V2.1 Sprint B) |

---

## 8. Out of Scope

| Fonctionnalite | Raison du report | Version cible |
|----------------|------------------|---------------|
| Export PDF tableau 2 colonnes (Comportement / Travail) | L'export JSON + LSU XML suffisent | V2.2 |
| Upgrade Qwen3 4B | Attendre stabilisation GGUF + chat template | V2.2 |
| Barre laterale (sidebar window separee) | Nice-to-have, pas essentiel | V2.2 |
| Themes visuels TBI | Cosmetique, pas prioritaire | V2.2 |
| Statistiques avancees (graphiques tendances) | Nice-to-have | V2.2 |
| Notation chiffree ou lettres | Pas dans le LSU, pas de besoin identifie | Non prevu |
| Import automatique ONDE depuis Base Eleves | API non publique, risque compliance | Non prevu |
| Gestion des metiers de classe | Module separe, hors perimetre | V3 |
| Connexion mobile/tablette | Contrainte reseau ecole, complexite | V3 |
| Multi-classe / multi-enseignant | Un seul utilisateur pour l'instant | V3 |
| Synchronisation cloud | Contradictoire avec le principe 100% local | Non prevu |

---

## 9. Recapitulatif des Functional Requirements

### Par module

| Module | FRs | Count |
|--------|-----|-------|
| Module 1 — Comportement Classe | FR1-FR30 | 30 |
| Module 2 — Comportement Individuel | FR31-FR37 | 7 |
| Module 3 — Domaines d'Apprentissage (refonde) | FR38-FR44, FR60-FR62 | 10 |
| Infrastructure IA | FR45-FR50 | 6 |
| Gestion des Modeles | FR51-FR53 | 3 |
| Configuration + Annee scolaire | FR54-FR56, FR58-FR59, FR65 | 6 |
| Capture Audio | FR57 | 1 |
| Export LSU | FR63-FR64 | 2 |
| **TOTAL** | | **65** |

### Par priorite

| Priorite | Count | Pourcentage |
|----------|-------|-------------|
| Must | 58 | 89% |
| Should | 5 | 8% |
| Could | 2 | 3% |
| **TOTAL** | **65** | **100%** |

### Recapitulatif des Non-Functional Requirements

| Categorie | NFRs | Count |
|-----------|------|-------|
| Performance | NFR1-NFR8 | 8 |
| Securite et RGPD | NFR9-NFR12 | 4 |
| Compatibilite et Deploiement | NFR13-NFR17 | 5 |
| Fiabilite | NFR18-NFR22 | 5 |
| Accessibilite TBI | NFR23-NFR27 | 5 |
| Migrations et Donnees | NFR28-NFR30 | 3 |
| **TOTAL** | | **30** |

---

## 10. Decisions Architecturales Cles (Reference)

| Decision | Choix | Justification |
|----------|-------|---------------|
| Framework Desktop | Tauri v2 (conserver V1) | Mature, sidecar natif, leger |
| Frontend | React 18 + TypeScript (conserver V1) | Pas de raison de changer |
| State Management | Zustand (conserver V1) | Pattern simple, efficace |
| Base de donnees | SQLite via tauri-plugin-sql (conserver V1) | Offline-first, fichier unique |
| STT | Whisper.cpp small FR (GGUF Q4) | Meilleur rapport qualite/taille pour francais |
| VAD | whisper.cpp natif (`--vad` flag) | Integre, pas de dependance ONNX separee |
| LLM | Qwen 2.5 Coder 1.5B (GGUF Q4) | Specialise JSON/code, benchmark 0.5B prevu |
| Serveur LLM | llama-server (llama.cpp) | API OpenAI-compatible, GBNF natif |
| **Role LLM (V2.1)** | **Classificateur + fusionneur** | **Le LLM identifie le domaine et fusionne le texte dicte avec l'existant. Ne genere jamais de contenu nouveau. Ne touche jamais au niveau d'evaluation.** |
| **GBNF (V2.1)** | **Dynamique depuis BDD** | **Grammaire generee cote Rust a partir des domaines actifs de l'eleve. Pas de GBNF statique.** |
| **Niveau evaluation (V2.1)** | **100% decision du professeur** | **Le LLM ne suggere ni ne modifie jamais le niveau. Document officiel LSU, responsabilite de l'enseignant.** |
| **Echelle evaluation (V2.1)** | **4 niveaux LSU** | **Non atteints, Partiellement atteints, Atteints, Depasses. Migration 3→4 niveaux depuis V2.** |
| Sortie LLM | JSON structure (pas SQL) | Securite : Rust reconstruit avec prepared statements |
| Audio capture | tauri-plugin-mic-recorder (Plan A) / Web Audio API (Plan B) | Simplicite, fallback si plugin instable |
| Pipeline | Sequentiel a la demande | Mode obligatoire sur PC 4 Go RAM |
| Watchdog | Restart auto whisper-server | Bug handle leak Windows |

---

## 11. Glossaire

| Terme | Definition |
|-------|------------|
| **TBI** | Tableau Blanc Interactif — ecran connecte au PC de la classe |
| **Sidecar** | Binaire externe embarque dans le bundle Tauri, lance comme processus enfant |
| **GGUF** | Format de fichier pour les modeles IA quantifies (llama.cpp ecosystem) |
| **GBNF** | GGML BNF — format de grammaire pour contraindre la sortie de llama.cpp au niveau token |
| **Whisper.cpp** | Port C/C++ du modele Whisper d'OpenAI, optimise CPU, MIT license |
| **Qwen 2.5 Coder** | Modele LLM specialise code/donnees structurees par Alibaba |
| **Push-to-talk** | Mode d'enregistrement audio : maintenir un bouton pour parler, relacher pour terminer |
| **Pipeline sequentiel** | Un seul moteur IA actif a la fois (Whisper OU Qwen, pas les deux simultanement) |
| **Prepared Statement** | Requete SQL pre-compilee avec parametres, protection contre l'injection SQL |
| **VAD** | Voice Activity Detection — detection des segments de parole dans un flux audio |
| **STT** | Speech-to-Text — conversion de la parole en texte |
| **LLM** | Large Language Model — modele de langage generatif |
| **RGPD** | Reglement General sur la Protection des Donnees (EU) |
| **Mode portable** | Application executable sans installateur, pas de modification du systeme |
| **Periode scolaire** | Trimestre ou semestre, configurable par l'enseignant |
| **LSU** | Livret Scolaire Unique — document officiel de suivi des acquis scolaires (Education nationale) |
| **ONDE** | Outil Numerique pour la Direction d'Ecole — systeme de gestion administrative |
| **UAI** | Unite Administrative Immatriculee — code identifiant unique de l'etablissement scolaire |
| **INC** | Code de l'inspection de circonscription |
| **INE** | Identifiant National Eleve — numero unique attribue a chaque eleve |
| **Pleiade** | Portail de l'Education nationale pour le telechargement/import des LSU |
| **Cycle** | Regroupement de niveaux scolaires : C1 (PS-GS), C2 (CP-CE2), C3 (CM1-CM2) |
| **Appreciation generale** | Commentaire synthetique sur la scolarite globale d'un eleve pour une periode |
| **Classificateur** | Role du LLM : identifier a quel domaine d'apprentissage correspond la dictee |
| **Fusionneur** | Role du LLM : combiner le texte nouvellement dicte avec les observations existantes |

---

**Document genere le :** 2026-02-17
**Prochain livrable :** Architecture V2.1 (`architecture-v2.1.md`)
