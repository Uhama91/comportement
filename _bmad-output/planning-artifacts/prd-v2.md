---
stepsCompleted: [init, discovery, success, journeys, domain, scoping, functional, nonfunctional, data-model, interaction-flows, constraints, polish]
inputDocuments:
  - product-brief-comportement-2026-02-10.md
  - suivi-comportement-briefing-complet.md
  - research/technical-ia-locale-tauri-sidecars-research-2026-02-10.md
  - archive-v1/prd.md
  - archive-v1/architecture.md
  - archive-v1/epics.md
workflowType: 'prd'
documentCounts:
  briefs: 2
  research: 1
  projectDocs: 3
classification:
  projectType: desktop_app
  domain: edtech
  complexity: medium
  projectContext: brownfield
date: 2026-02-10
author: Uhama
version: V2
previous_version: V1 (2026-01-26)
---

# Product Requirements Document - Comportement V2

**Auteur :** Uhama
**Date :** 2026-02-10
**Version :** V2
**Version precedente :** V1 (2026-01-26) — archivee dans `archive-v1/prd.md`

---

## 1. Introduction

### 1.1 Contexte

**Comportement** est une application desktop locale (Tauri v2) utilisee quotidiennement par un enseignant de CM2 a l'Ecole Elementaire Victor Hugo (Sevran, 93) pour le suivi du comportement de ses 18 eleves. La **V1**, en production depuis janvier 2026, remplace le tableau physique a emojis par une interface numerique rapide avec affichage TBI, grille de cartes, systeme d'avertissements/sanctions/recompenses, et export JSON.

La **V2** transforme cet outil en une **plateforme complete de suivi pedagogique a 3 modules** avec **IA locale** (100% offline, conforme RGPD) :

- **Module 1 — Comportement Classe** : evolution de la V1 avec motifs de sanction obligatoires, gestion des absences, et export enrichi
- **Module 2 — Comportement Individuel** : suivi detaille par eleve et par periode scolaire (incidents, contexte, intervenant)
- **Module 3 — Domaines d'Apprentissage** : dictee vocale en francais, transcription automatique (Whisper.cpp), structuration par domaine via LLM local (Qwen 2.5), insertion en base validee par Rust

### 1.2 Objectifs V2

| Objectif | Description |
|----------|-------------|
| **Etendre le suivi** | Passer du suivi global hebdomadaire au suivi individuel detaille par periode |
| **Automatiser la saisie** | Dictee vocale + structuration automatique pour les appreciations par domaine |
| **IA 100% locale** | Pipeline Whisper.cpp + Qwen 2.5 fonctionnant offline, conforme RGPD |
| **Configurer les periodes** | Trimestres ou semestres parametrables selon l'ecole/circonscription |
| **Corriger les manques V1** | Motifs de sanction obligatoires, gestion des absences |

### 1.3 Relation avec la V1

La V2 est une **extension incrementale** de la V1 :
- Le code V1 est reorganise en architecture modulaire (`modules/`, `shared/`)
- Toutes les fonctionnalites V1 sont conservees (avertissements, sanctions, recompenses, grille cartes, TBI, tray)
- Les nouvelles tables SQLite s'ajoutent au schema existant (pas de breaking changes)
- Le stack technique est inchange (Tauri v2, React 18, TypeScript, SQLite, Zustand, Tailwind CSS)
- Les 2 sidecars IA (Whisper.cpp, llama-server) sont la seule nouveaute architecturale

---

## 2. Product Overview

### 2.1 Vue d'ensemble

```
+-------------------------------------------------------------------+
|                    COMPORTEMENT V2                                  |
|                                                                     |
|  +------------------+  +------------------+  +------------------+  |
|  |   MODULE 1       |  |   MODULE 2       |  |   MODULE 3       |  |
|  |   Comportement   |  |   Comportement   |  |   Domaines       |  |
|  |   Classe         |  |   Individuel     |  |   Apprentissage  |  |
|  |                  |  |                  |  |                  |  |
|  | - Avertissements |  | - Fiche eleve    |  | - Dictee vocale  |  |
|  | - Sanctions      |  | - Incidents      |  | - Transcription  |  |
|  | - Recompenses    |  | - Par periode    |  | - Structuration  |  |
|  | - Motifs         |  | - Historique     |  | - Par domaine    |  |
|  | - Absences       |  | - Intervenants   |  | - Niveaux        |  |
|  | - TBI + Export   |  |                  |  |                  |  |
|  +--------+---------+  +--------+---------+  +--------+---------+  |
|           |                     |                      |            |
|  +--------+---------------------+----------------------+--------+  |
|  |                 COUCHE PARTAGEE                               |  |
|  |  Eleves | Periodes | SQLite | Zustand | UI commune           |  |
|  +---+--------------------------------------------+-------------+  |
|      |                                            |                 |
|  +---+------------------+  +---------------------+--------------+  |
|  |  SIDECAR 1           |  |  SIDECAR 2                        |  |
|  |  whisper-server      |  |  llama-server + Qwen 2.5          |  |
|  |  (STT francais)      |  |  (structuration JSON)             |  |
|  |  + VAD natif          |  |  + grammaire GBNF                |  |
|  +----------------------+  +-----------------------------------+  |
+-------------------------------------------------------------------+
```

### 2.2 Modules

#### Module 1 — Comportement Classe (evolution V1)

Suivi global hebdomadaire de toute la classe. Conservation des fonctionnalites V1 + ajout des motifs de sanction obligatoires, de la gestion des absences, et de l'export enrichi.

#### Module 2 — Comportement Individuel (nouveau)

Suivi detaille par eleve, par periode scolaire configurable (trimestre ou semestre). Documentation structuree des incidents : date, heure, type d'evenement, motif, description, intervenant.

#### Module 3 — Domaines d'Apprentissage (nouveau)

Saisie des appreciations par domaine d'apprentissage via dictee vocale. Pipeline IA local : push-to-talk, transcription Whisper.cpp, correction manuelle optionnelle, structuration automatique par LLM Qwen 2.5, validation Rust, insertion en base.

### 2.3 Infrastructure IA locale

- **Whisper.cpp** (whisper-server sidecar) : transcription STT francais, modele small FR GGUF Q4 (~480 Mo)
- **Qwen 2.5 Coder 1.5B** (llama-server sidecar) : structuration texte libre vers JSON, GGUF Q4 (~980 Mo)
- **Pipeline sequentiel a la demande** : un seul modele actif a la fois (push-to-talk, pas de demarrage permanent)
- **Securite 4 couches** : Prompt contraint, Grammaire GBNF, Validateur Rust, Prepared Statements SQLite
- **LLM genere du JSON** (jamais du SQL) : Rust reconstruit les INSERT avec prepared statements

---

## 3. Functional Requirements

### 3.1 Module 1 — Comportement Classe

#### 3.1.1 Gestion des Eleves (conserve de V1)

| ID | Description | Criteres d'acceptation | Priorite | Module |
|----|-------------|----------------------|----------|--------|
| **FR1** | L'enseignant peut ajouter un nouvel eleve a la classe | - L'eleve apparait dans la grille apres ajout<br>- L'eleve est sauvegarde en base<br>- Maximum 30 eleves par classe | Must | M1 |
| **FR2** | L'enseignant peut modifier le prenom d'un eleve | - Le nouveau prenom est affiche immediatement<br>- La modification est persistee en base<br>- Prenom vide = erreur | Must | M1 |
| **FR3** | L'enseignant peut supprimer un eleve de la classe | - Confirmation requise avant suppression<br>- Suppression en cascade (warnings, sanctions, rewards)<br>- L'eleve disparait de la grille | Must | M1 |
| **FR4** | L'enseignant peut voir la liste de tous les eleves avec leur statut actuel | - Grille de cartes avec prenom, avertissements, ligne L-M-J-V, boutons<br>- Mise a jour temps reel | Must | M1 |
| **FR5** | Le systeme supporte un maximum de 30 eleves par classe | - Message d'erreur si tentative d'ajout au-dela de 30<br>- Ajout bloque | Must | M1 |

#### 3.1.2 Systeme d'Avertissements (conserve de V1)

| ID | Description | Criteres d'acceptation | Priorite | Module |
|----|-------------|----------------------|----------|--------|
| **FR6** | L'enseignant peut donner un avertissement a un eleve | - 1er avertissement = emoji partiel affiché<br>- 2eme avertissement = indicateur "x2"<br>- Action en < 1 seconde | Must | M1 |
| **FR7** | Le systeme convertit automatiquement un 3eme avertissement en sanction | - Avertissements remis a 0<br>- Sanction ajoutee automatiquement<br>- Modale propose d'ajouter un motif | Must | M1 |
| **FR8** | Le systeme reinitialise automatiquement tous les avertissements a 16h30 | - Tous les avertissements passes a 0<br>- Sanctions inchangees<br>- Reset rattrape si app fermee a 16h30 | Must | M1 |
| **FR9** | L'enseignant peut retirer un avertissement d'un eleve | - Decrementation du compteur<br>- Mise a jour immediate de l'affichage<br>- Pas de passage en dessous de 0 | Must | M1 |

#### 3.1.3 Systeme de Sanctions (evolue pour V2)

| ID | Description | Criteres d'acceptation | Priorite | Module |
|----|-------------|----------------------|----------|--------|
| **FR10** | L'enseignant peut ajouter une sanction a un eleve | - Emoji triste ajoute<br>- Modale de motif obligatoire s'affiche<br>- Sanction persistee en base avec motif | Must | M1 |
| **FR11** | L'enseignant peut retirer une sanction d'un eleve | - Derniere sanction supprimee<br>- Motif associe egalement supprime<br>- Affichage mis a jour | Must | M1 |
| **FR12** | Le motif de sanction est obligatoire | - La sanction ne peut pas etre enregistree sans motif<br>- Dropdown avec motifs predéfinis + champ libre<br>- Motifs predéfinis : "Bavardage", "Insolence", "Violence", "Non-respect des regles", "Autre" | Must | M1 |
| **FR13** | Le systeme affiche les sanctions sous forme d'emojis tristes | - Chaque sanction = 1 emoji triste<br>- Maximum 10 par semaine par eleve<br>- Alerte visuelle a 10 | Must | M1 |
| **FR14** | Le systeme reinitialise automatiquement les sanctions chaque lundi | - Sanctions de la semaine precedente archivees<br>- Compteur remis a 0<br>- Historique conserve<br>- Reset rattrape si app fermee le weekend | Must | M1 |
| **FR15** | L'export JSON inclut les motifs de sanction | - Chaque sanction dans le JSON contient le champ `motif`<br>- Retrocompatibilite avec les exports V1 (motif = null pour anciennes sanctions) | Must | M1 |

#### 3.1.4 Gestion des Absences (nouveau V2)

| ID | Description | Criteres d'acceptation | Priorite | Module |
|----|-------------|----------------------|----------|--------|
| **FR16** | L'enseignant peut marquer un eleve comme absent | - Bouton "Absent" sur chaque carte<br>- Visuel distinct (carte grisee, icone "ABS")<br>- Label jour dans la ligne hebdo = "ABS" au lieu de emoji | Must | M1 |
| **FR17** | Un eleve absent n'est pas comptabilise dans les recompenses | - Pas d'attribution de recompense a 16h30 pour un absent<br>- La case du jour reste vide ou affiche "ABS"<br>- Les statistiques excluent les jours d'absence | Must | M1 |
| **FR18** | L'enseignant peut annuler une absence | - Clic sur le bouton "Absent" (toggle)<br>- La carte redevient normale<br>- L'eleve est de nouveau eligible aux recompenses | Must | M1 |

#### 3.1.5 Systeme de Recompenses (conserve de V1)

| ID | Description | Criteres d'acceptation | Priorite | Module |
|----|-------------|----------------------|----------|--------|
| **FR19** | Le systeme attribue automatiquement une recompense quotidienne a 16h30 | - 0 avertissement + 0 sanction = emoji plein (parfait)<br>- 1-2 avertissements + 0 sanction = emoji attenue (partiel)<br>- Sanction aujourd'hui = pas de recompense<br>- Absent = pas de recompense | Must | M1 |
| **FR20** | Les recompenses sont comptabilisees sur 4 jours : L, M, J, V | - Mercredi exclu (jour non travaille)<br>- Ligne hebdomadaire affiche uniquement les jours ecoules<br>- Reset le lundi avec les sanctions | Must | M1 |
| **FR21** | Une sanction annule la derniere recompense positive de la semaine | - Cherche d'abord un emoji partiel a annuler<br>- Si pas de partiel, annule le dernier emoji plein<br>- Si aucune recompense, la sanction est ajoutee sans annulation | Must | M1 |

#### 3.1.6 Interface en Cartes (conserve de V1)

| ID | Description | Criteres d'acceptation | Priorite | Module |
|----|-------------|----------------------|----------|--------|
| **FR22** | L'interface affiche les eleves sous forme de grille de cartes | - Ordre alphabetique fixe (ne change jamais)<br>- Toutes les cartes visibles sans scroll<br>- Adaptation automatique au nombre d'eleves (18-28) | Must | M1 |
| **FR23** | Chaque carte affiche : prenom, avertissements, ligne L-M-J-V, boutons | - Prenom en en-tete<br>- Avertissements a cote du prenom<br>- Ligne hebdomadaire toujours visible<br>- Boutons Avertir / Sanctionner / Absent | Must | M1 |
| **FR24** | L'enseignant peut basculer en mode plein ecran TBI | - Touche F11 ou bouton<br>- Grille de cartes en plein ecran<br>- Prenoms lisibles a 6 metres<br>- Emojis clairement distinguables<br>- Echap pour revenir | Must | M1 |

#### 3.1.7 Historique et Export (evolue pour V2)

| ID | Description | Criteres d'acceptation | Priorite | Module |
|----|-------------|----------------------|----------|--------|
| **FR25** | L'enseignant peut consulter le bilan hebdomadaire par eleve | - Vue par semaine<br>- Nombre de sanctions + motifs<br>- Recompenses de la semaine<br>- Navigation sur 36 semaines | Must | M1 |
| **FR26** | L'enseignant peut exporter toutes les donnees au format JSON | - Export contient : eleves, sanctions (avec motifs), avertissements, recompenses, absences<br>- L'enseignant choisit l'emplacement de sauvegarde<br>- Export par periode ou complet | Must | M1 |

#### 3.1.8 Integration Systeme (conserve de V1)

| ID | Description | Criteres d'acceptation | Priorite | Module |
|----|-------------|----------------------|----------|--------|
| **FR27** | L'app se lance au demarrage du systeme | - Option autostart activee par defaut<br>- Minimisee dans le tray au lancement | Must | M1 |
| **FR28** | Icone dans la barre systeme (tray) | - Icone visible<br>- Clic gauche = affiche fenetre<br>- Clic droit = menu (Ouvrir / Quitter) | Must | M1 |
| **FR29** | Raccourci clavier global pour ouvrir l'app | - Configurable (defaut : Ctrl+Shift+C)<br>- Fonctionne depuis n'importe quelle application<br>- Ouvre en < 1 seconde | Must | M1 |
| **FR30** | Fermer la fenetre minimise dans le tray | - Le bouton X cache la fenetre<br>- L'app continue en arriere-plan<br>- Les resets automatiques continuent | Must | M1 |

---

### 3.2 Module 2 — Comportement Individuel

| ID | Description | Criteres d'acceptation | Priorite | Module |
|----|-------------|----------------------|----------|--------|
| **FR31** | L'enseignant peut acceder a la fiche detaillee d'un eleve | - Navigation depuis la grille de cartes (clic sur le prenom)<br>- Vue individuelle avec historique complet<br>- Retour a la grille en un clic | Must | M2 |
| **FR32** | L'enseignant peut saisir un incident detaille pour un eleve | - Formulaire : date, heure, type d'evenement, motif, description, intervenant<br>- Types d'evenement predéfinis : "Comportement perturbateur", "Violence", "Insolence", "Non-respect du materiel", "Refus de travail", "Autre"<br>- Le champ intervenant est optionnel (defaut = enseignant)<br>- Sauvegarde en base avec FK vers eleve et periode | Must | M2 |
| **FR33** | L'enseignant peut consulter l'historique chronologique des incidents par eleve | - Liste triee par date decroissante<br>- Filtrage par type d'evenement<br>- Filtrage par periode scolaire<br>- Affichage : date, heure, type, motif, description, intervenant | Must | M2 |
| **FR34** | L'enseignant peut consulter les incidents par periode scolaire | - Selecteur de periode (trimestre/semestre configures)<br>- Resume par periode : nombre d'incidents par type<br>- Liste detaillee des incidents de la periode | Must | M2 |
| **FR35** | L'enseignant peut modifier un incident | - Tous les champs sont editables apres saisie<br>- Historique de modification non requis<br>- Validation des champs obligatoires | Should | M2 |
| **FR36** | L'enseignant peut supprimer un incident | - Confirmation requise avant suppression<br>- Suppression definitive (pas de corbeille) | Should | M2 |
| **FR37** | L'enseignant peut saisir un incident par dictee vocale | - Bouton micro sur le formulaire d'incident<br>- Transcription Whisper du champ description<br>- L'enseignant peut corriger avant validation | Could | M2 |

---

### 3.3 Module 3 — Domaines d'Apprentissage

| ID | Description | Criteres d'acceptation | Priorite | Module |
|----|-------------|----------------------|----------|--------|
| **FR38** | L'enseignant peut dicter des observations par push-to-talk | - Bouton micro (maintenir ou toggle)<br>- Indicateur visuel d'enregistrement (LED rouge, onde sonore)<br>- Relachement = fin d'enregistrement<br>- Audio capture au format WAV PCM 16-bit 16kHz | Must | M3 |
| **FR39** | Le systeme transcrit automatiquement l'audio en texte | - Whisper.cpp sidecar transcrit en francais<br>- Temps de transcription < 5 secondes pour 15 secondes d'audio<br>- Texte affiche dans une zone editable<br>- L'enseignant peut corriger avant validation | Must | M3 |
| **FR40** | Le systeme structure automatiquement le texte transcrit par domaine | - LLM Qwen 2.5 transforme le texte libre en JSON structure<br>- Identification automatique du domaine (Francais, Mathematiques, Sciences, etc.)<br>- Identification automatique du niveau (maitrise, en_cours_acquisition, debut)<br>- Temps de structuration < 5 secondes<br>- Resultat affiche pour validation avant insertion | Must | M3 |
| **FR41** | L'enseignant valide et insere le resultat structure en base | - Apercu du JSON structure avant insertion<br>- Possibilite de modifier les champs avant validation<br>- Bouton "Valider et enregistrer"<br>- Insertion via prepared statements Rust<br>- Confirmation visuelle de l'enregistrement | Must | M3 |
| **FR42** | L'enseignant peut consulter les appreciations par eleve et par domaine | - Vue tableau : domaines en lignes, periodes en colonnes<br>- Pour chaque cellule : niveau + observations<br>- Filtrage par eleve et par periode | Must | M3 |
| **FR43** | L'enseignant peut saisir manuellement une appreciation (sans dictee) | - Formulaire classique : eleve, periode, domaine, niveau, observations<br>- Alternative a la dictee vocale si micro indisponible<br>- Meme resultat en base | Must | M3 |
| **FR44** | Les domaines d'apprentissage sont parametrables | - Domaines par defaut : Francais, Mathematiques, Sciences et Technologies, Histoire-Geographie, Enseignement Moral et Civique, EPS, Arts, Langues Vivantes<br>- L'enseignant peut ajouter/modifier/supprimer des domaines<br>- Chaque domaine peut avoir des sous-domaines optionnels | Should | M3 |

---

### 3.4 Infrastructure IA

| ID | Description | Criteres d'acceptation | Priorite | Module |
|----|-------------|----------------------|----------|--------|
| **FR45** | Le sidecar whisper-server demarre a la demande pour la transcription | - Demarrage declenche par push-to-talk<br>- Healthcheck HTTP confirme la disponibilite<br>- Arret automatique apres N secondes d'inactivite<br>- Watchdog avec restart automatique si reponse vide (bug handle leak Windows) | Must | IA |
| **FR46** | Le sidecar llama-server demarre a la demande pour la structuration | - Demarrage declenche apres validation du texte transcrit<br>- API REST OpenAI-compatible sur localhost<br>- Arret automatique apres inactivite<br>- Grammaire GBNF chargee au demarrage | Must | IA |
| **FR47** | Le pipeline s'execute de maniere sequentielle (un seul modele actif) | - Whisper demarre, transcrit, puis s'arrete<br>- Ensuite llama-server demarre, structure, puis s'arrete<br>- Jamais les deux simultanes sur PC 4 Go RAM<br>- Mode concurrent optionnel si PC 8 Go+ detecte | Must | IA |
| **FR48** | Le LLM genere du JSON structure (pas du SQL) | - Output LLM contraint par grammaire GBNF au format JSON<br>- Format : `{ "table": "...", "row": { ... } }`<br>- Le LLM n'a jamais connaissance de la syntaxe SQL<br>- Rust parse le JSON et reconstruit l'INSERT avec prepared statements | Must | IA |
| **FR49** | Le validateur Rust verifie chaque sortie LLM avant insertion | - Couche 1 : Prompt contraint (INSERT-only, tables autorisees)<br>- Couche 2 : Grammaire GBNF (controle au niveau token)<br>- Couche 3 : Validation Rust (table autorisee, types corrects, IDs coherents)<br>- Couche 4 : Prepared statements SQLite (injection impossible)<br>- Rejet avec message d'erreur si validation echoue | Must | IA |
| **FR50** | Le VAD (Voice Activity Detection) filtre les silences avant transcription | - Utilisation du flag `--vad` natif de whisper.cpp (pas ONNX separe)<br>- Seuls les segments de parole sont transcrits<br>- Reduction des hallucinations Whisper sur les silences<br>- Modele VAD ggml inclus avec whisper-server | Must | IA |

---

### 3.5 Gestion des Modeles IA

| ID | Description | Criteres d'acceptation | Priorite | Module |
|----|-------------|----------------------|----------|--------|
| **FR51** | Le premier lancement affiche un ecran de telechargement des modeles | - Detection automatique de l'absence des modeles GGUF<br>- Ecran "Configuration initiale" avec barre de progression<br>- Telechargement sequentiel : Whisper small FR (~480 Mo), Qwen 2.5 (~980 Mo)<br>- Verification SHA256 de chaque modele<br>- Stockage dans le repertoire app_data_dir() de Tauri | Must | IA |
| **FR52** | Les modeles sont stockes dans le repertoire de donnees de l'application | - Chemin : `AppData/comportement/models/` (Windows), `~/Library/.../comportement/models/` (macOS)<br>- Flag `models_ready` en base apres telechargement reussi<br>- L'app fonctionne sans les modeles (Modules 1 et 2 disponibles, Module 3 desactive) | Must | IA |
| **FR53** | L'enseignant peut installer les modeles depuis une cle USB | - Bouton "Installer depuis un dossier local" sur l'ecran de telechargement<br>- Copie des fichiers GGUF depuis le chemin choisi<br>- Meme verification SHA256<br>- Solution alternative si proxy ecole bloque Hugging Face | Must | IA |

---

### 3.6 Configuration

| ID | Description | Criteres d'acceptation | Priorite | Module |
|----|-------------|----------------------|----------|--------|
| **FR54** | L'enseignant peut configurer les periodes scolaires | - Choix entre trimestres et semestres<br>- Date de debut et date de fin pour chaque periode<br>- Annee scolaire configurable<br>- Nom d'affichage personnalisable<br>- Les periodes sont la reference pour les Modules 2 et 3 | Must | Config |
| **FR55** | L'enseignant peut acceder aux parametres de l'application | - Page Parametres accessible depuis le menu<br>- Sections : Periodes scolaires, Domaines d'apprentissage, Modeles IA, Raccourci clavier, Autostart<br>- Sauvegarde immediate des modifications | Must | Config |
| **FR56** | L'enseignant peut naviguer entre les 3 modules | - Navigation principale (onglets ou menu lateral)<br>- Module 1 = vue par defaut au lancement<br>- Transition fluide entre modules (< 300ms)<br>- Etat conserve lors du changement de module | Must | Config |

---

### 3.7 Capture Audio

| ID | Description | Criteres d'acceptation | Priorite | Module |
|----|-------------|----------------------|----------|--------|
| **FR57** | Le systeme capture l'audio du microphone pour la dictee vocale | - Plan A : tauri-plugin-mic-recorder<br>- Plan B (fallback) : Web Audio API (`getUserMedia`)<br>- Format de sortie : WAV PCM 16-bit, 16kHz, mono<br>- Permission micro demandee a l'utilisateur au premier usage<br>- Indicateur visuel pendant l'enregistrement | Must | M3 |

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
| **NFR6** | Le temps de structuration LLM est acceptable | < 5 secondes par observation | Must |
| **NFR7** | Le temps total du pipeline dictee-a-insertion est acceptable | < 15 secondes (dictee, transcription, correction, structuration, validation) | Must |
| **NFR8** | L'attribution automatique des recompenses a 16h30 est rapide | < 1 seconde pour 30 eleves | Must |

### 4.2 Securite et Conformite RGPD

| ID | Description | Cible | Priorite |
|----|-------------|-------|----------|
| **NFR9** | Les donnees ne quittent jamais le poste | Zero connexion reseau apres installation des modeles | Must |
| **NFR10** | Le LLM ne peut pas executer d'operations destructrices | 4 couches de validation (Prompt, GBNF, Rust, Prepared Statements) | Must |
| **NFR11** | Le taux d'INSERT valides est eleve | > 95% apres validation GBNF + Rust | Must |
| **NFR12** | Les donnees nominatives restent locales | Prenoms stockes uniquement en SQLite local, pas de telemetrie | Must |

### 4.3 Compatibilite et Deploiement

| ID | Description | Cible | Priorite |
|----|-------------|-------|----------|
| **NFR13** | L'app fonctionne sur le PC ecole | Windows 10/11, 4 Go RAM minimum, CPU standard (pas de GPU) | Must |
| **NFR14** | Mode portable sans installateur | .exe unique, pas de modification du registre, pas d'installateur SmartScreen | Must |
| **NFR15** | La taille totale de la distribution est raisonnable | < 2 Go (exe + modeles GGUF) | Must |
| **NFR16** | Le pic de RAM reste dans les limites du PC ecole | < 2 Go en mode sequentiel (un sidecar actif a la fois) | Must |
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

---

## 5. Data Model

### 5.1 Schema SQLite complet

#### Tables existantes V1 (inchangees)

```sql
-- Eleves (table centrale, reference pour tous les modules)
-- Note : warnings est une COLONNE (INTEGER DEFAULT 0), pas une table separee
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

-- Recompenses quotidiennes (1 par jour travaille L-M-J-V)
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

-- Index existants
CREATE INDEX idx_sanctions_student ON sanctions(student_id);
CREATE INDEX idx_sanctions_week ON sanctions(week_number, year);
CREATE INDEX idx_rewards_student ON daily_rewards(student_id);
CREATE INDEX idx_absences_student ON absences(student_id);
```

#### Evolutions V2 — Module 1

```sql
-- Migration : Ajout colonne motif obligatoire sur sanctions
-- (motif = reason existant, rendu obligatoire cote applicatif)
-- La colonne `reason` existe deja — le changement est dans la validation Rust/TS
-- Note : la table `absences` existe deja en V1, aucune migration necessaire
```

#### Tables V2 — Configuration des Periodes

```sql
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

#### Tables V2 — Module 2 : Comportement Individuel

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

#### Tables V2 — Module 3 : Domaines d'Apprentissage

```sql
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
```

#### Tables V2 — Infrastructure IA

```sql
-- Suivi des modeles IA installes
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

### 5.2 Donnees initiales (seed)

```sql
-- Domaines d'apprentissage par defaut (programme cycle 3)
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

### 5.3 Relations entre tables

```
students (table centrale)
  |  (warnings = colonne INTEGER sur students, reset quotidien)
  |
  +--< sanctions (1:N, reset hebdo, motif obligatoire V2)
  +--< daily_rewards (1:N, 1 par jour travaille L-M-J-V)
  +--< absences (1:N, V1)
  +--< comportement_detail (1:N, Module 2, FK periode)
  +--< appreciations (1:N, Module 3, FK periode + domaine)

config_periodes
  |
  +--< comportement_detail.periode_id
  +--< appreciations.periode_id

domaines_apprentissage
  |
  +--< appreciations.domaine_id
```

---

## 6. User Interaction Flows

### 6.1 Flow : Dictee vocale et structuration automatique (Module 3)

```
1. Enseignant selectionne un eleve dans la grille
2. Navigue vers Module 3 (Domaines d'Apprentissage)
3. Appuie sur le bouton micro (push-to-talk)
   → Indicateur visuel "Enregistrement en cours"
   → Audio capture en WAV PCM 16kHz

4. Relache le bouton (fin d'enregistrement)
   → [SIDECAR] whisper-server demarre (si pas deja actif)
   → [SIDECAR] Whisper transcrit l'audio en texte (~3-5s)
   → [SIDECAR] whisper-server s'arrete (mode sequentiel)
   → Texte affiche dans une zone editable

5. Enseignant verifie/corrige le texte transcrit
   → Peut corriger les erreurs de transcription
   → Bouton "Structurer" pour lancer le LLM

6. Clic sur "Structurer"
   → [SIDECAR] llama-server demarre avec grammaire GBNF
   → [SIDECAR] Qwen 2.5 genere le JSON structure (~3-5s)
   → [SIDECAR] llama-server s'arrete (mode sequentiel)
   → [RUST] Validateur verifie le JSON (table, colonnes, types, IDs)
   → Apercu du resultat affiche : domaine detecte, niveau, observations

7. Enseignant valide
   → [RUST] Prepared statement INSERT execute
   → Confirmation visuelle
   → Retour a la vue tableau des appreciations
```

### 6.2 Flow : Sanction avec motif obligatoire (Module 1)

```
1. Eleve perturbe la classe
2. Enseignant clique sur la carte de l'eleve
3. Clique sur le bouton "Sanctionner"
4. Modale s'affiche avec :
   - Dropdown motifs predéfinis (Bavardage, Insolence, Violence, Non-respect, Autre)
   - Champ libre pour precisions
   - Bouton "Valider" (actif uniquement si motif selectionne)
5. Enseignant selectionne un motif et valide
   → Sanction enregistree avec motif
   → Emoji triste ajoute sur la carte
   → Derniere recompense positive annulee (si applicable)
   → Affichage TBI mis a jour
```

### 6.3 Flow : Saisie d'un incident detaille (Module 2)

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
5. Enregistrement → incident ajoute a l'historique de l'eleve
6. Visible dans la vue par periode
```

### 6.4 Flow : Marquage d'absence (Module 1)

```
1. Eleve absent
2. Enseignant clique sur "ABS" sur la carte de l'eleve
3. La carte se grise, icone "ABS" affichee
4. A 16h30 : pas de recompense attribuee pour cet eleve
5. Dans la ligne L-M-J-V : case du jour = "ABS" au lieu d'emoji
6. Si l'eleve revient dans la journee : re-clic sur "ABS" pour annuler
```

### 6.5 Flow : Premier lancement (telechargement modeles)

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
5. Les Modules 1 et 2 sont utilisables immediatement (pas besoin des modeles)
6. Le Module 3 devient actif apres installation des modeles
```

### 6.6 Flow : Configuration des periodes scolaires

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

---

## 7. Constraints & Assumptions

### 7.1 Contraintes techniques

| Contrainte | Impact | Mitigation |
|------------|--------|------------|
| **PC ecole 4 Go RAM** | Les deux sidecars ne peuvent pas tourner simultanément | Pipeline sequentiel obligatoire : un sidecar actif a la fois |
| **Pas de GPU** | Inference CPU uniquement | Whisper.cpp et llama.cpp optimises CPU (AVX2, ARM NEON) |
| **Proxy ecole** | Peut bloquer le telechargement des modeles depuis Hugging Face | Solution USB alternative (FR53) |
| **Mode portable** | Pas d'installateur, pas de modification registre | .exe unique + modeles dans AppData |
| **Windows SmartScreen** | Peut bloquer l'exe non signe | Mode portable eprouve en V1, documentation pour admin IT |
| **Pas de WiFi fiable** | L'app doit fonctionner 100% offline apres installation | Aucune connexion reseau post-installation |

### 7.2 Contraintes metier

| Contrainte | Description |
|------------|-------------|
| **Utilisateur unique** | Un seul enseignant, une seule classe |
| **18 eleves actuels** | Effectif reel, le systeme supporte jusqu'a 30 |
| **Calendrier scolaire francais** | 4 jours travailles (L, M, J, V), mercredi exclu |
| **Prenoms immuables** | L'orthographe des prenoms ne change jamais (important pour Whisper) |
| **Periodes variables** | Trimestres ou semestres selon l'ecole/circonscription |

### 7.3 Assumptions

| Assumption | Justification |
|------------|---------------|
| Le PC ecole dispose d'un microphone | Requis pour la dictee vocale — micro USB externe si absent |
| Whisper small FR est suffisant pour le francais parle avec accents | Recherche technique confirme, post-correction manuelle possible |
| Qwen 2.5 Coder 1.5B genere du JSON valide > 95% du temps avec GBNF | Contrainte par grammaire GBNF + validation Rust |
| L'enseignant accepte un temps de pipeline de ~15 secondes | Gain de temps par rapport a la saisie manuelle (30s vs 2min) |
| Le mode sequentiel suffit pour l'usage en classe | L'enseignant ne transcrit et ne structure pas en parallele |
| La stack V1 (Tauri + React + SQLite + Zustand) est stable | 2+ mois de production quotidienne sans bug critique |

---

## 8. Out of Scope

| Fonctionnalite | Raison du report | Version cible |
|----------------|------------------|---------------|
| Synthese LLM hebdomadaire (tendances progression) | Complexite prompt + validation qualite | V2.1 |
| Export PDF tableau 2 colonnes (Comportement / Travail) | L'export JSON suffit pour le MVP | V2.1 |
| Upgrade Qwen3 4B | Attendre stabilisation GGUF + chat template | V2.1 |
| Barre laterale (sidebar window separee) | Nice-to-have, pas essentiel pour les 3 modules | V2.2 |
| Themes visuels TBI | Cosmetique, pas prioritaire | V2.2 |
| Statistiques avancees (graphiques tendances) | Nice-to-have | V2.2 |
| Gestion des metiers de classe | Module separe, hors perimetre V2 | V3 |
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
| Module 3 — Domaines d'Apprentissage | FR38-FR44 | 7 |
| Infrastructure IA | FR45-FR50 | 6 |
| Gestion des Modeles | FR51-FR53 | 3 |
| Configuration | FR54-FR56 | 3 |
| Capture Audio | FR57 | 1 |
| **TOTAL** | | **57** |

### Par priorite

| Priorite | Count | Pourcentage |
|----------|-------|-------------|
| Must | 53 | 93% |
| Should | 3 | 5% |
| Could | 1 | 2% |
| **TOTAL** | **57** | **100%** |

### Recapitulatif des Non-Functional Requirements

| Categorie | NFRs | Count |
|-----------|------|-------|
| Performance | NFR1-NFR8 | 8 |
| Securite et RGPD | NFR9-NFR12 | 4 |
| Compatibilite et Deploiement | NFR13-NFR17 | 5 |
| Fiabilite | NFR18-NFR22 | 5 |
| Accessibilite TBI | NFR23-NFR27 | 5 |
| **TOTAL** | | **27** |

---

## 10. Decisions Architecturales Cles (Reference)

Ces decisions proviennent de la recherche technique et du Product Brief V2 et guident l'implementation :

| Decision | Choix | Justification |
|----------|-------|---------------|
| Framework Desktop | Tauri v2 (conserver V1) | Mature, sidecar natif, leger |
| Frontend | React 18 + TypeScript (conserver V1) | Pas de raison de changer |
| State Management | Zustand (conserver V1) | Pattern simple, efficace |
| Base de donnees | SQLite via tauri-plugin-sql (conserver V1) | Offline-first, fichier unique |
| STT | Whisper.cpp small FR (GGUF Q4) | Meilleur rapport qualite/taille pour francais |
| VAD | whisper.cpp natif (`--vad` flag) | Integre, pas de dependance ONNX separee |
| LLM | Qwen 2.5 Coder 1.5B (GGUF Q4) | Specialise JSON/code, taille raisonnable CPU |
| Serveur LLM | llama-server (llama.cpp) | API OpenAI-compatible, GBNF natif |
| Sortie LLM | JSON structure (pas SQL) | Securite : Rust reconstruit avec prepared statements |
| Contrainte sortie | Grammaire GBNF | Controle deterministe au niveau token |
| Audio capture | tauri-plugin-mic-recorder (Plan A) / Web Audio API (Plan B) | Simplicite, fallback si plugin instable |
| Pipeline | Sequentiel a la demande | Mode obligatoire sur PC 4 Go RAM |
| Watchdog | Restart auto whisper-server | Bug handle leak Windows (issue #3358) |

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
| **Pipeline sequentiel** | Un seul moteur IA actif a la fois (Whisper OU Qwen, pas les deux simultanément) |
| **Prepared Statement** | Requete SQL pre-compilee avec parametres, protection contre l'injection SQL |
| **VAD** | Voice Activity Detection — detection des segments de parole dans un flux audio |
| **STT** | Speech-to-Text — conversion de la parole en texte |
| **LLM** | Large Language Model — modele de langage generatif |
| **RGPD** | Reglement General sur la Protection des Donnees (EU) |
| **Mode portable** | Application executable sans installateur, pas de modification du systeme |
| **Periode scolaire** | Trimestre ou semestre, configurable par l'enseignant |

---

**Document genere le :** 2026-02-10
**Prochain livrable :** Architecture V2 (`architecture-v2.md`)
