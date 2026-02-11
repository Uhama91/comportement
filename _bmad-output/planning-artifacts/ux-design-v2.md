---
title: "UX Design Specification V2 - Comportement"
version: "V2"
date: "2026-02-10"
author: "Uhama"
stepsCompleted: 14
inputDocuments:
  - "product-brief-comportement-2026-02-10.md"
  - "suivi-comportement-briefing-complet.md"
  - "technical-ia-locale-tauri-sidecars-research-2026-02-10.md"
  - "archive-v1/prd.md"
  - "archive-v1/architecture.md"
  - "archive-v1/epics.md"
  - "src/App.tsx"
  - "src/components/StudentGrid/*"
  - "src/stores/studentStore.ts"
  - "src/types/index.ts"
---

# UX Design Specification V2 — Comportement

> Application desktop locale de suivi du comportement et des apprentissages des eleves en classe elementaire (CM2, 18 eleves, Ecole Victor Hugo Sevran).

---

## Table des matieres

1. [Philosophie de Design](#1-philosophie-de-design)
2. [Architecture de l'Information](#2-architecture-de-linformation)
3. [Patterns de Layout](#3-patterns-de-layout)
4. [Patterns d'Interaction](#4-patterns-dinteraction)
5. [Bibliotheque de Composants](#5-bibliotheque-de-composants)
6. [Flux d'Ecrans](#6-flux-decrans)
7. [Considerations Responsives](#7-considerations-responsives)
8. [Accessibilite](#8-accessibilite)
9. [Animations et Feedback](#9-animations-et-feedback)

---

## 1. Philosophie de Design

### 1.1 Vision

L'application Comportement V2 est l'outil quotidien d'un enseignant de CM2. Chaque interaction se produit dans le contexte d'une classe vivante, souvent en plein cours, parfois devant un TBI avec 18 eleves qui observent. Le design doit etre **invisible** : il ne doit jamais ralentir l'enseignant ni detourner l'attention de la classe.

### 1.2 Principes directeurs

| Principe | Description | Application concrete |
|----------|-------------|---------------------|
| **Vitesse absolue** | Toute action courante en < 3 secondes | 1 clic pour avertissement, 2 clics pour sanction |
| **Clarte a distance** | Lisible a 5+ metres sur TBI | Emojis larges, couleurs contrastees, pas de texte superflu |
| **Zero configuration** | Fonctionne des le lancement | Resets automatiques, periodes pre-configurees |
| **Confiance locale** | 100% hors-ligne, RGPD natif | Aucune donnee ne quitte la machine, SQLite local |
| **Progressivite** | Complexite revelee au besoin | Module 1 simple au quotidien, Modules 2-3 pour analyses approfondies |

### 1.3 Persona principale

**Ullie** — Enseignante CM2, Ecole Victor Hugo, Sevran
- Utilise l'application sur PC portable connecte au TBI
- Besoin principal : noter un incident en < 3 sec sans interrompre le cours
- Moments cles : 8h30 (arrivee), incidents spontanes, 16h30 (bilan automatique), vendredi (resume hebdo), fin de periode (dictee vocale appreciations)
- Contrainte technique : PCs ecole avec 4 Go RAM minimum

### 1.4 Hierarchie visuelle

```
Priorite 1 (toujours visible)  : Prenom + etat comportement (couleur carte)
Priorite 2 (visible sur carte) : Avertissements (nombre) + Recompenses (ligne L-M-J-V)
Priorite 3 (a la demande)      : Sanctions details + raisons + historique
Priorite 4 (module dedie)      : Observations individuelles + appreciations IA
```

---

## 2. Architecture de l'Information

### 2.1 Structure modulaire V2

L'application V2 passe d'un ecran unique (V1) a une architecture a 3 modules accessibles via une barre de navigation laterale.

```
+------------------------------------------------------------------+
|                        COMPORTEMENT V2                            |
+--------+---------------------------------------------------------+
|        |                                                         |
|  NAV   |              ZONE DE CONTENU PRINCIPALE                 |
|  LAT.  |                                                         |
|        |   Module 1 : Comportement Classe (grille cartes)        |
|  [M1]  |   Module 2 : Comportement Individuel (fiche eleve)      |
|  [M2]  |   Module 3 : Domaines d'Apprentissage (dictee vocale)   |
|  [M3]  |                                                         |
|        |                                                         |
|  ---   |                                                         |
| [CFG]  |                                                         |
| [EXP]  |                                                         |
+--------+---------------------------------------------------------+
```

### 2.2 Navigation principale

| Element | Icone | Label | Description |
|---------|-------|-------|-------------|
| Module 1 | Grille | Classe | Vue grille cartes (ecran par defaut) |
| Module 2 | Personne | Individuel | Fiche comportement detaillee par eleve |
| Module 3 | Micro | Apprentissages | Dictee vocale + appreciations structurees |
| Config | Engrenage | Parametres | Periodes, classes, preferences |
| Export | Fleche | Export | Export JSON / impression |

### 2.3 Hierarchie par module

**Module 1 — Comportement Classe**
```
Grille de cartes (18 eleves)
  +-- Carte eleve
       +-- Prenom
       +-- Indicateur avertissements (0/1/2/3)
       +-- Ligne recompenses L-M-J-V
       +-- Sanctions (emojis tristes)
       +-- Boutons action (avertir / sanctionner)
       +-- Toggle absence
```

**Module 2 — Comportement Individuel**
```
Selection eleve (liste ou clic depuis Module 1)
  +-- En-tete : prenom + photo placeholder + periode en cours
  +-- Onglet Comportement
  |    +-- Timeline avertissements/sanctions
  |    +-- Graphique tendance hebdomadaire
  |    +-- Observations libres
  +-- Onglet Historique
       +-- Filtre par periode
       +-- Resume par semaine
       +-- Export individuel
```

**Module 3 — Domaines d'Apprentissage**
```
Selection eleve
  +-- Zone dictee vocale
  |    +-- Bouton Push-to-Talk
  |    +-- Transcription temps reel
  |    +-- Zone correction manuelle
  |    +-- Bouton validation -> structuration LLM
  +-- Observations structurees
  |    +-- Domaine (Francais, Maths, etc.)
  |    +-- Competence
  |    +-- Niveau observe
  |    +-- Commentaire
  +-- Appreciations generees
       +-- Par periode
       +-- Editables avant export
```

### 2.4 Flux de donnees utilisateur

```
                    QUOTIDIEN                          PERIODIQUE
                    =========                          ==========

 8h30               Incidents            16h30         Vendredi        Fin periode
  |                    |                   |              |               |
  v                    v                   v              v               v
Ouvrir app       Clic avertir       Recompenses     Resume hebdo    Dictee vocale
  |              Clic sanctionner    automatiques    Export JSON     Appreciations
  v              Toggle absence          |              |           Correction
Module 1              |                  v              v           Structuration
(grille)              v              Notification   Module 1 +     Export
                 Module 1            toast           Export
                 (1-2 clics)
```

---

## 3. Patterns de Layout

### 3.1 Layout principal — Shell Application

Le shell de l'application est compose de 3 zones fixes :

```
+------------------------------------------------------------------+
| BARRE TITRE (32px) : Titre app + controles fenetre Tauri         |
+--------+---------------------------------------------------------+
|        |  BARRE OUTILS (48px)                                    |
|  NAV   |  [Ajouter eleve] [Resume] [Export] [Periode: Trim 2]   |
| LATER. +- - - - - - - - - - - - - - - - - - - - - - - - - - - - +
|  64px  |                                                         |
|        |                                                         |
|  [M1]  |              ZONE CONTENU                               |
|  [M2]  |              (100% - 64px - 48px - 32px)                |
|  [M3]  |                                                         |
|        |              Scroll vertical si necessaire               |
|  ---   |                                                         |
| [CFG]  |                                                         |
+--------+---------------------------------------------------------+
```

**Dimensions cles :**
- Barre laterale : 64px (icones seules) ou 200px (avec labels, retractable)
- Barre titre Tauri : 32px
- Barre outils contextuelle : 48px (change selon le module actif)
- Zone contenu : tout l'espace restant, sans scroll horizontal

### 3.2 Layout Module 1 — Grille de cartes

La grille suit l'ordre alphabetique **fixe** des eleves (ne change jamais). Le nombre de colonnes s'adapte a la largeur de la fenetre.

```
Disposition standard (1280px+) : 6 colonnes x 3 lignes
+--------+--------+--------+--------+--------+--------+
| Amira  | Amine  | Ayman  | Bilel  | Camila | Celian |
+--------+--------+--------+--------+--------+--------+
| Djibri | Elias  | Hawa   | Ines   | Ismail | Kenza  |
+--------+--------+--------+--------+--------+--------+
| Lina   | Maham  | Nahel  | Rayan  | Sana   | Yanis  |
+--------+--------+--------+--------+--------+--------+

Disposition moyenne (960-1279px) : 5 colonnes x 4 lignes
+--------+--------+--------+--------+--------+
| Amira  | Amine  | Ayman  | Bilel  | Camila |
+--------+--------+--------+--------+--------+
| Celian | Djibri | Elias  | Hawa   | Ines   |
+--------+--------+--------+--------+--------+
| Ismail | Kenza  | Lina   | Maham  | Nahel  |
+--------+--------+--------+--------+--------+
| Rayan  | Sana   | Yanis  |        |        |
+--------+--------+--------+--------+--------+

Disposition compacte (640-959px) : 4 colonnes
Disposition mobile (<640px) : mode liste (1 colonne)
```

**Algorithme de calcul des colonnes (existant V1) :**
```
colonnes = min(6, max(2, floor(largeur_fenetre / largeur_carte_min)))
```

Largeur carte minimum : 180px. Largeur carte ideale : 200px. Les cartes s'etirent pour remplir l'espace disponible (CSS Grid avec `auto-fill` et `minmax`).

### 3.3 Layout Module 2 — Fiche individuelle

```
+------------------------------------------------------------------+
| BARRE OUTILS : [< Retour] Prenom Nom    [Periode: Trimestre 2]  |
+---------------------------+--------------------------------------+
|                           |                                      |
|  PANNEAU GAUCHE (320px)   |  PANNEAU DROIT (flex)                |
|                           |                                      |
|  +---------------------+ |  +----------------------------------+ |
|  | Avatar / Initiales  | |  | ONGLET: [Comportement] [Histo]  | |
|  | Prenom              | |  +----------------------------------+ |
|  | Classe              | |  |                                  | |
|  +---------------------+ |  |  Timeline evenements             | |
|                           |  |  - 10/02 Avertissement 1        | |
|  Resume rapide :          |  |  - 10/02 Avertissement 2        | |
|  - Avert. aujourd'hui: 2 |  |  - 10/02 Sanction (bavardage)   | |
|  - Sanctions semaine : 1 |  |  - 09/02 Journee parfaite       | |
|  - Recompenses : 3/4     |  |  - ...                           | |
|  - Absences : 1           |  |                                  | |
|                           |  +----------------------------------+ |
|  Actions rapides :        |  |                                  | |
|  [Avertir] [Sanctionner] |  |  Graphique tendance (sparkline)  | |
|  [Absent/Present]        |  |  Semaine 1: ████░  4/5           | |
|                           |  |  Semaine 2: ███░░  3/5           | |
+---------------------------+  |  Semaine 3: █████  5/5           | |
                               |                                  | |
                               +----------------------------------+ |
```

### 3.4 Layout Module 3 — Dictee vocale

```
+------------------------------------------------------------------+
| BARRE OUTILS : [< Retour]  Eleve: [Dropdown selection]          |
+------------------------------------------------------------------+
|                                                                  |
|  +------------------------------------------------------------+ |
|  |  ZONE DICTEE VOCALE                                         | |
|  |                                                             | |
|  |  +------------------------------------------------------+  | |
|  |  |  Transcription :                                      |  | |
|  |  |  "Nahel a bien progresse en lecture cette semaine,    |  | |
|  |  |   il arrive a lire des textes de 200 mots sans       |  | |
|  |  |   difficulte. En maths, les fractions restent         |  | |
|  |  |   difficiles."                                        |  | |
|  |  +------------------------------------------------------+  | |
|  |                                                             | |
|  |  [  MAINTENIR POUR DICTER  ]    [Corriger] [Structurer]    | |
|  |       (bouton push-to-talk)                                 | |
|  +------------------------------------------------------------+ |
|                                                                  |
|  +------------------------------------------------------------+ |
|  |  OBSERVATIONS STRUCTUREES (apres LLM)                       | |
|  |                                                             | |
|  |  Domaine     | Competence       | Niveau    | Commentaire  | |
|  |  ------------|------------------|-----------|-------------- | |
|  |  Francais    | Lecture fluide   | Acquis    | Textes 200   | |
|  |  |           |                  |           | mots OK      | |
|  |  Maths       | Fractions        | En cours  | Difficultes  | |
|  |  |           |                  |           | persistantes | |
|  |                                                             | |
|  |  [Valider et enregistrer]   [Modifier]   [Annuler]         | |
|  +------------------------------------------------------------+ |
+------------------------------------------------------------------+
```

### 3.5 Layout Mode TBI

Le mode TBI est une vue plein ecran (F11) du Module 1, optimisee pour la lisibilite a distance.

```
+------------------------------------------------------------------+
|                                                                  |
|  +--------+  +--------+  +--------+  +--------+  +--------+     |
|  |        |  |        |  |        |  |        |  |        |     |
|  | AMIRA  |  | AMINE  |  | AYMAN  |  | BILEL  |  | CAMILA |     |
|  |        |  |        |  |        |  |        |  |        |     |
|  |  0/3   |  |  1/3   |  |  0/3   |  |  2/3   |  |  0/3   |     |
|  | L M J V|  | L M J V|  | L M J V|  | L M J V|  | L M J V|     |
|  +--------+  +--------+  +--------+  +--------+  +--------+     |
|                                                                  |
|  +--------+  +--------+  +--------+  +--------+  +--------+     |
|  |        |  |        |  |        |  |        |  |        |     |
|  | CELIAN |  | DJIBRI |  | ELIAS  |  | HAWA   |  | INES   |     |
|  |   ...  |  |   ...  |  |   ...  |  |   ...  |  |   ...  |     |
|  +--------+  +--------+  +--------+  +--------+  +--------+     |
|                                                                  |
|  ...                                                [ESC]        |
+------------------------------------------------------------------+

Differences TBI vs normal :
- Prenoms en MAJUSCULES, police 24px+
- Pas de boutons d'action (lecture seule)
- Pas de barre laterale
- Couleurs de fond amplifiees
- Emojis recompenses 2x plus grands
```

---

## 4. Patterns d'Interaction

### 4.1 Avertissement (interaction la plus frequente)

**Objectif** : < 1 seconde pour le premier avertissement

```
ETAT INITIAL          CLIC 1              CLIC 2              CLIC 3
+----------+         +----------+        +----------+        +----------+
| Amira    |         | Amira    |        | Amira    |        | Amira    |
|          |  --->   |    !     | --->   |   !!     | --->   |   !!!    |
| [Avertir]|         | [Avertir]|        | [Avertir]|        | [Sanctio]|
| fond:    |         | fond:    |        | fond:    |        | fond:    |
| blanc    |         | ambre    |        | ambre    |        | rouge    |
+----------+         | clair    |        | fonce    |        +----------+
                     +----------+        +----------+
```

**Regles d'interaction :**
- Clic sur le bouton "Avertir" : incremente de 1 (max 3)
- A 3 avertissements : le bouton change en "Sanctionner" (action directe)
- Retrait d'avertissement : clic droit ou menu contextuel
- Reset automatique a 16h30

### 4.2 Sanction

**Objectif** : 2 clics maximum (clic + choix raison)

```
Clic "Sanctionner"           Modal raison              Resultat
+----------+                +------------------+       +----------+
| Amira    |                | Raison :         |       | Amira    |
|   !!!    |  ----------->  | O Bavardage      |  -->  |   !!!    |
| [Sanctio]|                | O Violence       |       | 1x 😢    |
+----------+                | O Travail        |       | fond:    |
                            | O Autre: [____]  |       | rouge    |
                            |                  |       +----------+
                            | [Confirmer]      |
                            +------------------+
```

**Regles d'interaction :**
- La sanction ouvre un modal avec choix de raison (obligatoire)
- Raisons predefinies : Bavardage, Violence, Travail non fait, Autre (saisie libre)
- La sanction annule automatiquement la recompense la plus recente (partielle d'abord, puis complete)
- Emoji triste ajoute sur la carte
- Maximum 10 sanctions par semaine par eleve
- Reset automatique le lundi

### 4.3 Absence

**Objectif** : 1 clic pour marquer absent/present

```
PRESENT                      ABSENT
+----------+                +----------+
| Amira    |   clic toggle  | Amira    |
|          |  ----------->  |   A      |
| fond:    |                | fond:    |
| blanc    |  <-----------  | gris     |
+----------+   clic toggle  | (desature|
                            +----------+
```

**Regles d'interaction :**
- Toggle present/absent en 1 clic (coin superieur droit de la carte, ou bouton dedie)
- L'eleve absent : fond gris, actions desactivees, "A" gris sur la ligne recompenses du jour
- L'absence est enregistree pour la journee courante
- Pas d'avertissement ni sanction possible sur un eleve absent

### 4.4 Push-to-Talk (Module 3)

**Objectif** : Dictee naturelle avec correction avant structuration

```
Phase 1: ENREGISTREMENT          Phase 2: CORRECTION         Phase 3: STRUCTURATION
+------------------------+      +------------------------+   +------------------------+
|                        |      |                        |   |                        |
| [======MAINTENIR======]|      | "Nahel a bien         |   |  Domaine  | Competence |
|                        |      |  progress en lecture"  |   |  ---------|----------- |
| Niveau audio: ████░░░  |      |           ^            |   |  Francais | Lecture    |
| Duree: 0:04            |      |     (zone editable)    |   |  Maths    | Fractions  |
|                        |      |                        |   |                        |
| "Relacher pour          |      | [Re-dicter] [Valider] |   | [Enregistrer] [Modif]  |
|  arreter"              |      +------------------------+   +------------------------+
+------------------------+
     |                              |                              |
     v                              v                              v
  whisper-server               Correction                    llama-server
  HTTP (< 5 sec)               manuelle                     + GBNF (< 5 sec)
                               par enseignant               -> JSON valide
                                                            -> Rust validation
                                                            -> SQLite INSERT
```

**Regles d'interaction :**
- Bouton Push-to-Talk : maintenir enfonce pour enregistrer, relacher pour arreter
- Feedback visuel en temps reel : indicateur niveau audio + duree
- Apres transcription : texte editable pour correction manuelle
- Bouton "Structurer" : envoie au LLM pour decomposition en observations
- Resultat structure editable avant validation finale
- Chaque etape est annulable (retour arriere possible)

### 4.5 Recompenses automatiques

**Objectif** : Zero interaction — attribution automatique a 16h30

```
AVANT 16h30                    16h30 AUTOMATIQUE              RESULTAT
+----------+                  +--------------------+         +----------+
| Amira    |                  | Notification toast |         | Amira    |
| 0 avert. |  -- 16h30 -->   | "Recompenses       |  -->   | 0 avert. |
| L _ _ _  |                  |  attribuees !"     |         | L M _ _  |
+----------+                  +--------------------+         | (vert)   |
                                                             +----------+

| Bilel    |                                                 | Bilel    |
| 1 avert. |  -- 16h30 -->                           -->    | 1 avert. |
| L _ _ _  |                                                 | L M _ _  |
+----------+                                                 | (jaune)  |
                                                             +----------+
```

**Types de recompenses :**
- 0 avertissement : recompense complete (vert, emoji content)
- 1-2 avertissements : recompense partielle (jaune, emoji neutre)
- 3 avertissements : pas de recompense (rouge, pas d'emoji)
- Absent : "A" gris (ni recompense ni penalite)

### 4.6 Menu contextuel (clic droit)

```
+----------+
| Amira    |
|          |  clic droit
+----------+      |
                  v
          +------------------+
          | Retirer 1 avert. |
          | Modifier sanction|
          | Voir historique  |
          | ----             |
          | Changer prenom   |
          | Supprimer eleve  |
          +------------------+
```

### 4.7 Navigation inter-modules

L'utilisateur peut naviguer directement vers le Module 2 ou 3 depuis une carte du Module 1 :

```
Module 1 (Grille)              Module 2 (Individuel)
+----------+                   +-------------------------+
| Amira    |  double-clic     | < Retour                |
|          |  ----------->    | AMIRA                   |
+----------+                   | Timeline comportement   |
                               +-------------------------+

Module 1 (Grille)              Module 3 (Apprentissages)
+----------+                   +-------------------------+
| Amira    |  clic droit >    | < Retour                |
| "Dicter  |  ----------->    | Eleve: Amira            |
|  obs."   |                   | [Push-to-Talk]          |
+----------+                   +-------------------------+
```

---

## 5. Bibliotheque de Composants

### 5.1 Carte eleve (StudentGridCard)

Composant central de l'application, present dans le Module 1 et le mode TBI.

```
Carte standard (200px x 160px)
+----------------------------------+
|  [A]                    Amira  * |   * = menu contextuel (...)
|                                  |
|  Avertissements: !! (2/3)       |
|                                  |
|  L  M  J  V                     |   Ligne recompenses hebdo
|  o  o  _  _                     |   o=vert, o=jaune, x=annule
|                                  |
|  Sanctions: (aucune)             |
|                                  |
|  [  Avertir  ] [ Sanctionner ]  |
+----------------------------------+

Variantes de fond selon etat :
- Blanc (bg-white)         : 0 avertissement, present
- Ambre clair (bg-amber-50) : 1 avertissement
- Ambre (bg-amber-100)      : 2 avertissements
- Rouge clair (bg-red-50)   : 3 avertissements ou sanction
- Gris (bg-slate-200)       : absent (actions desactivees)
```

**Props du composant :**

| Prop | Type | Description |
|------|------|-------------|
| student | StudentWithSanctions | Donnees eleve completes |
| compact | boolean | Mode compact (grille) vs mode large (liste) |
| tbiMode | boolean | Mode TBI (lecture seule, grande taille) |
| onWarn | () => void | Callback avertissement |
| onSanction | (reason: string) => void | Callback sanction |
| onToggleAbsence | () => void | Callback toggle absence |
| onNavigateDetail | () => void | Navigation vers Module 2 |

### 5.2 Ligne recompenses (WeeklyRewardLine)

Affiche le statut des recompenses pour les 4 jours ouvrables (pas mercredi).

```
Jours ouvrables : L(lundi=1) M(mardi=2) J(jeudi=4) V(vendredi=5)

Etats possibles par jour :
+-----+-------------------+-------------------+
| Etat| Visuel            | Couleur           |
+-----+-------------------+-------------------+
| Futur    | Lettre grise  | text-gray-400     |
| Complet  | Emoji content | text-green-500    |
| Partiel  | Emoji neutre  | text-yellow-500   |
| Annule   | Emoji barre   | line-through      |
| Absent   | "A" gris      | text-gray-400     |
| Aucun    | Emoji triste   | text-red-400      |
+-----+-------------------+-------------------+

Exemples :
  Lundi parfait, mardi 1 avert, jeudi a venir, vendredi a venir :
  L    M    J    V
  😊   🙂   _    _

  Lundi parfait annule par sanction, mardi absent :
  L    M    J    V
  😊̶   A    _    _
```

**Props du composant :**

| Prop | Type | Description |
|------|------|-------------|
| rewards | DailyReward[] | Recompenses de la semaine |
| absences | Absence[] | Absences de la semaine |
| compact | boolean | Taille reduite pour grille |

### 5.3 Modal de sanction (SanctionReasonModal)

```
+------------------------------------------+
|  Sanction — Amira                   [X]  |
|                                          |
|  Raison de la sanction :                 |
|                                          |
|  ( ) Bavardage                           |
|  ( ) Violence / Comportement dangereux   |
|  ( ) Travail non fait                    |
|  ( ) Manque de respect                   |
|  ( ) Autre : [________________________]  |
|                                          |
|            [Annuler]  [Confirmer]         |
+------------------------------------------+

- Modal centre, overlay sombre
- Focus automatique sur le premier choix
- Touche Entree pour confirmer
- Touche Echap pour annuler
- Le bouton Confirmer est desactive tant qu'aucune raison n'est selectionnee
```

### 5.4 Barre laterale de navigation (Sidebar)

```
Mode retracte (64px)          Mode deploye (200px)
+------+                      +------------------+
| [==] |  <-- hamburger       | [==] Comportement|
|      |                      |                  |
| [##] |  <-- Module 1        | [##] Classe      |
| [@@] |  <-- Module 2        | [@@] Individuel  |
| [!!] |  <-- Module 3        | [!!] Apprentiss. |
|      |                      |                  |
| ---- |                      | ----             |
| [**] |  <-- Config          | [**] Parametres  |
| [->] |  <-- Export          | [->] Export      |
+------+                      +------------------+

- Retractable au clic sur le hamburger
- Icones toujours visibles meme en mode retracte
- Indicateur actif : barre laterale coloree sur le module courant
- Tooltip au survol en mode retracte
```

### 5.5 Zone dictee vocale (VoiceDictation)

```
Etat repos :
+--------------------------------------------------+
|  Transcription :                                  |
|  (Aucune dictee en cours)                        |
|                                                  |
|  [ MAINTENIR POUR DICTER ]                       |
+--------------------------------------------------+

Etat enregistrement :
+--------------------------------------------------+
|  Enregistrement en cours...           0:04       |
|  Niveau : ████████░░░░░░░░                       |
|                                                  |
|  [========= RELACHER POUR ARRETER =========]     |
+--------------------------------------------------+
   fond du bouton : rouge pulsant

Etat transcription :
+--------------------------------------------------+
|  Transcription en cours...                       |
|  [=========== Barre de progression ===========]  |
+--------------------------------------------------+

Etat correction :
+--------------------------------------------------+
|  Transcription :                                  |
|  +----------------------------------------------+|
|  | Nahel a bien progresse en lecture cette       ||
|  | semaine, il arrive a lire des textes de      ||
|  | 200 mots sans difficulte. En maths, les      ||
|  | fractions restent difficiles.                ||
|  +----------------------------------------------+|
|           (zone de texte editable)               |
|                                                  |
|  [Re-dicter]  [Effacer]  [Structurer ->]         |
+--------------------------------------------------+

Etat structuration :
+--------------------------------------------------+
|  Structuration IA en cours...                    |
|  [=========== Barre de progression ===========]  |
+--------------------------------------------------+
```

### 5.6 Tableau observations structurees (StructuredObservations)

```
+--------------------------------------------------------------+
| Observations — Nahel — 10/02/2026                            |
+--------------------------------------------------------------+
| Domaine    | Competence          | Niveau      | Commentaire |
|------------|---------------------|-------------|-------------|
| Francais   | Lecture fluide      | [Acquis v]  | Textes 200  |
|            |                     |             | mots OK     |
| Maths      | Fractions           | [En cours v]| Difficultes |
|            |                     |             | persistantes|
+--------------------------------------------------------------+
| [+ Ajouter ligne]                                            |
+--------------------------------------------------------------+
|                                                              |
| [Annuler]                           [Enregistrer]            |
+--------------------------------------------------------------+

Niveaux possibles (dropdown) :
- (vide / placeholder "Non evalue") → valeur NULL en base
- Debut
- En cours d'acquisition
- Maitrise

> Alignement GBNF : les valeurs DB sont `"debut"`, `"en_cours_acquisition"`, `"maitrise"`. Le label "Non evalue" correspond a NULL (aucune appreciation).

Domaines predefinies :
- Francais (lecture, ecriture, grammaire, conjugaison, vocabulaire, dictee)
- Mathematiques (numeration, calcul, geometrie, mesures, problemes)
- Sciences
- Histoire-Geographie
- Arts
- EPS
- Comportement general
```

### 5.7 Toast de notification

```
Position : en haut a droite, empile vers le bas
Duree : 3 secondes (auto-dismiss)

+-----------------------------------+
| Recompenses attribuees !   [X]   |
| 14 eleves recompenses            |
+-----------------------------------+
   fond vert pour succes
   fond orange pour attention
   fond rouge pour erreur
```

### 5.8 Selecteur de periode (PeriodSelector)

```
+----------------------------------------------+
| Periode : [Trimestre 2 v]                    |
+----------------------------------------------+
          |
          v
  +--------------------+
  | Trimestre 1        |
  |   01/09 - 30/11    |
  | Trimestre 2    <-- |   (actif = surligne)
  |   01/12 - 28/02    |
  | Trimestre 3        |
  |   01/03 - 30/06    |
  +--------------------+

- Dropdown dans la barre d'outils
- Affiche la periode active avec ses dates
- Change le contexte des donnees affichees (filtrage)
- Ne supprime jamais les donnees des autres periodes
```

### 5.9 Formulaire ajout eleve (AddStudentForm)

```
Mode compact (dans la barre d'outils) :
[+ Ajouter] --> [Prenom: [_______] [OK]]

Validation :
- Prenom non vide
- Prenom unique dans la classe
- Premiere lettre auto-capitalisee
- Max 30 caracteres
```

### 5.10 Bouton Export (ExportButton)

```
[Export v]
    |
    v
+-------------------------+
| Export JSON complet     |
| Export periode active   |
| Export eleve individuel |
+-------------------------+
```

---

## 6. Flux d'Ecrans

### 6.1 Flux quotidien — Arrivee le matin (8h30)

```
ETAPE 1                    ETAPE 2                    ETAPE 3
Lancement app              Grille chargee             Marquage absences
                           (Module 1 auto)

+------------------+      +------------------+      +------------------+
|                  |      | Nav | Grille 6x3 |      | Nav | Grille 6x3 |
|   Splash Tauri   | ---> |     |            | ---> |     | Hawa = abs |
|   (< 2 sec)     |      |     | 18 cartes  |      |     | Ines = abs |
|                  |      |     | blanches   |      |     |            |
+------------------+      +------------------+      +------------------+
                           Auto: charger eleves      Clic toggle sur
                           Auto: verifier resets     les eleves absents
                           Auto: charger rewards     (2 clics pour 2 abs)
```

### 6.2 Flux incident — Avertissement en cours

```
ETAPE 1                    ETAPE 2                    ETAPE 3 (optionnel)
Situation normale          1er avertissement          2eme avertissement

+----------+              +----------+               +----------+
| Bilel    |   1 clic     | Bilel    |   1 clic      | Bilel    |
| fond:    |  -------->   | !        |  ---------->   | !!       |
| blanc    |              | fond:    |                | fond:    |
| [Avertir]|              | ambre    |                | ambre    |
+----------+              | clair    |                | fonce    |
                          | [Avertir]|                | [Avertir]|
                          +----------+                +----------+

Temps total : < 1 seconde par avertissement
L'enseignant ne quitte pas la vue grille
Le TBI se met a jour en temps reel (si affiche)
```

### 6.3 Flux sanction

```
ETAPE 1                    ETAPE 2                    ETAPE 3
3eme avertissement         Modal raison               Sanction enregistree

+----------+              +------------------+        +----------+
| Bilel    |   1 clic     | Raison :         |  clic  | Bilel    |
| !!!      |  -------->   | (o) Bavardage    | -----> | !!!      |
| fond:    |              | ( ) Violence     |        | 😢       |
| rouge    |              | ( ) Travail      |        | fond:    |
| [Sanctio]|              | [Confirmer]      |        | rouge    |
+----------+              +------------------+        +----------+
                                                       Recompense du
                                                       jour annulee
                                                       automatiquement
```

### 6.4 Flux 16h30 — Attribution recompenses

```
ETAPE 1                    ETAPE 2                    ETAPE 3
Avant 16h30                16h30 automatique          Apres attribution

+------------------+      +------------------+      +------------------+
| Nav | Grille     |      | Nav | Grille     |      | Nav | Grille     |
|     |            |      |     |            |      |     |            |
|     | L _ _ _    |      | +---------------+|      |     | L M _ _    |
|     | (mardi,    | ---> | | Recompenses   ||      |     | (mardi mis |
|     |  pas encore| auto | | attribuees !  || ---> |     |  a jour)   |
|     |  attribue) |      | | 16/18 eleves  ||      |     |            |
|     |            |      | +---------------+|      |     |            |
+------------------+      +------------------+      +------------------+
                           Toast notification
                           (3 sec auto-dismiss)
```

### 6.5 Flux fin de semaine — Export vendredi

```
ETAPE 1                    ETAPE 2                    ETAPE 3
Clic Resume               Vue resume hebdo           Export

+------------------+      +------------------+      +------------------+
| Nav | Grille     |      | Resume semaine   |      | Fichier JSON     |
|     |            |      | 10-14 fev 2026   |      | telecharge !     |
|     | [Resume]   | ---> |                  | ---> |                  |
|     |            |      | Amira : 0 av, 0s |      | comportement-    |
|     |            |      | Bilel : 2 av, 1s |      | sem7-2026.json   |
|     |            |      | ...              |      |                  |
|     |            |      | [Exporter JSON]  |      | [OK]             |
+------------------+      +------------------+      +------------------+
```

### 6.6 Flux dictee vocale — Module 3

```
ETAPE 1                    ETAPE 2                    ETAPE 3
Selection eleve            Dictee                     Transcription

+------------------+      +------------------+      +------------------+
| Nav | Eleve:     |      | Nav | Enreg...   |      | Nav | Transcrip. |
|     | [Nahel v]  |      |     | ████░ 0:06 |      |     | en cours...|
|     |            | ---> |     |            | ---> |     | [========] |
|     | [MAINTENIR |      |     | [RELACHER] |      |     |            |
|     |  POUR      |      |     |            |      |     |            |
|     |  DICTER]   |      +------------------+      +------------------+
+------------------+           whisper-server             < 5 sec
                               demarre

ETAPE 4                    ETAPE 5                    ETAPE 6
Correction                 Structuration              Validation

+------------------+      +------------------+      +------------------+
| Nav | "Nahel a   |      | Nav | Structur.  |      | Nav | Observ.    |
|     |  bien prog |      |     | en cours...|      |     | structurees|
|     |  resse..." |      |     | [========] |      |     |            |
|     |            | ---> |     |            | ---> |     | Francais   |
|     | (editable) |      +------------------+      |     |  Lecture:  |
|     |            |           llama-server          |     |  Acquis    |
|     | [Structur] |           + GBNF                |     |            |
+------------------+           < 5 sec               |     | [Enregist] |
  Correction manuelle                                +------------------+
  par l'enseignant                                    Rust validation
                                                      avant INSERT
```

### 6.7 Flux configuration periodes

```
ETAPE 1                    ETAPE 2                    ETAPE 3
Parametres                 Config periodes            Confirmation

+------------------+      +------------------+      +------------------+
| Parametres       |      | Periodes scolaire|      | Periodes         |
|                  |      |                  |      | enregistrees !   |
| [Periodes]       | ---> | Mode: [Trim. v]  | ---> |                  |
| [Classe]         |      |                  |      | Trimestre 1 :    |
| [Preferences]    |      | T1: 01/09-30/11  |      |  01/09 - 30/11   |
|                  |      | T2: 01/12-28/02  |      | Trimestre 2 :    |
|                  |      | T3: 01/03-30/06  |      |  01/12 - 28/02   |
|                  |      |                  |      | ...              |
|                  |      | [Enregistrer]    |      | [OK]             |
+------------------+      +------------------+      +------------------+
```

---

## 7. Considerations Responsives

### 7.1 Breakpoints

L'application est une app desktop Tauri, mais doit gerer differentes tailles de fenetre (redimensionnement, ecrans varies).

| Breakpoint | Largeur | Colonnes grille | Sidebar | Comportement |
|------------|---------|-----------------|---------|--------------|
| XL | >= 1280px | 6 colonnes | Deployee (200px) | Layout complet |
| LG | 960-1279px | 5 colonnes | Retractee (64px) | Cartes moyennes |
| MD | 768-959px | 4 colonnes | Retractee (64px) | Cartes compactes |
| SM | 640-767px | 3 colonnes | Masquee (overlay) | Cartes minimales |
| XS | < 640px | Mode liste | Masquee (overlay) | 1 eleve par ligne |

### 7.2 Adaptation des cartes

```
XL (>= 1280px)                    MD (768-959px)
+-------------------------+        +------------------+
| Amira                   |        | Amira            |
|                         |        | !! (2/3)         |
| Avertissements: !! 2/3  |        | L M J V          |
|                         |        | o o _ _          |
| L  M  J  V              |        | [Av] [Sa]        |
| o  o  _  _              |        +------------------+
|                         |
| Sanctions: (aucune)      |
|                         |
| [  Avertir  ] [Sanction]|
+-------------------------+

XS (< 640px) - Mode liste
+------------------------------------------+
| Amira  | !! | L:o M:o | 0 sanc | [Av][Sa] |
+------------------------------------------+
| Amine  | .  | L:o M:o | 0 sanc | [Av][Sa] |
+------------------------------------------+
```

### 7.3 Adaptation Module 2

```
Ecran large (>= 1024px)           Ecran etroit (< 1024px)
+-----------+------------------+   +---------------------------+
| Panneau   | Contenu          |   | En-tete eleve             |
| gauche    | principal        |   +---------------------------+
| (320px)   | (flex)           |   | [Comportement] [Histo]    |
|           |                  |   +---------------------------+
| Info      | Timeline         |   | Timeline (pleine largeur) |
| Resume    | Graphiques       |   | Graphiques                |
| Actions   |                  |   | Actions                   |
+-----------+------------------+   +---------------------------+
 2 colonnes                         1 colonne empilee
```

### 7.4 Mode TBI — Plein ecran

Le mode TBI utilise tout l'espace ecran sans chrome d'application :
- Pas de barre laterale
- Pas de barre d'outils
- Pas de controles de fenetre
- Police minimale : 24px pour les prenoms
- Emojis : 32px minimum
- Seule echappatoire : touche ESC ou F11

---

## 8. Accessibilite

### 8.1 Navigation clavier

| Touche | Action |
|--------|--------|
| Tab | Naviguer entre les cartes (ordre alphabetique) |
| Entree | Activer le bouton selectionne |
| Espace | Toggle absence sur la carte focalisee |
| A | Avertir l'eleve focalise |
| S | Sanctionner l'eleve focalise (ouvre modal) |
| F11 | Basculer mode TBI |
| Echap | Fermer modal / Quitter TBI |
| 1-3 | Naviguer vers Module 1, 2 ou 3 (avec Ctrl) |
| Fleches | Naviguer dans la grille (haut/bas/gauche/droite) |

### 8.2 Contraste et couleurs

Le systeme de couleurs respecte un ratio de contraste minimum de 4.5:1 (WCAG AA) :

| Element | Couleur fond | Couleur texte | Ratio |
|---------|-------------|---------------|-------|
| Carte normale | #FFFFFF | #1E293B (slate-800) | 13.5:1 |
| Carte avertie | #FFFBEB (amber-50) | #1E293B | 12.8:1 |
| Carte sanctionnee | #FEF2F2 (red-50) | #1E293B | 13.1:1 |
| Carte absente | #E2E8F0 (slate-200) | #475569 (slate-600) | 5.3:1 |
| Bouton avertir | #F59E0B (amber-500) | #FFFFFF | 4.6:1 |
| Bouton sanctionner | #EF4444 (red-500) | #FFFFFF | 4.6:1 |
| Recompense verte | #22C55E (green-500) | transparent | N/A (emoji) |
| Recompense jaune | #EAB308 (yellow-500) | transparent | N/A (emoji) |

### 8.3 Taille des elements interactifs

- Boutons : minimum 44px x 44px (cible tactile WCAG)
- Cartes : minimum 180px x 120px
- Icones sidebar : 40px x 40px avec zone cliquable 48px x 48px
- Bouton Push-to-Talk : 200px x 56px minimum (zone large pour maintien)

### 8.4 Indicateurs non-coleur

Chaque etat est communique par au moins 2 canaux :
- Avertissement : couleur ambre **ET** icone "!" **ET** compteur numerique
- Sanction : couleur rouge **ET** emoji triste **ET** texte raison
- Absence : couleur grise **ET** lettre "A" **ET** actions desactivees
- Recompense : couleur verte/jaune **ET** emoji specifique **ET** lettre du jour

### 8.5 Textes et labels

- Tous les boutons ont un `aria-label` descriptif
- Les cartes ont `role="article"` avec `aria-label` incluant le prenom et l'etat
- Les modals ont `role="dialog"` avec `aria-modal="true"`
- Le focus est piege dans les modals ouvertes
- Les toasts ont `role="status"` et `aria-live="polite"`

---

## 9. Animations et Feedback

### 9.1 Principes d'animation

| Principe | Regle |
|----------|-------|
| Duree maximale | 300ms pour les transitions d'etat |
| Duree minimale | 150ms (pas de flash imperceptible) |
| Pas d'animation bloquante | L'utilisateur peut toujours interagir |
| Desactivable | Respecter `prefers-reduced-motion` |
| Fonctionnelle | Toute animation communique un changement d'etat |

### 9.2 Catalogue d'animations

**Transition de couleur de carte (avertissement) :**
```css
.student-card {
  transition: background-color 200ms ease-out;
}
/* De blanc a ambre en 200ms — feedback immediat */
```

**Apparition du compteur d'avertissement :**
```css
.warning-badge {
  animation: bump 200ms ease-out;
}
@keyframes bump {
  0%   { transform: scale(1); }
  50%  { transform: scale(1.3); }
  100% { transform: scale(1); }
}
/* Effet "bump" pour attirer l'attention sur le changement */
```

**Ajout de sanction (emoji triste) :**
```css
.sanction-emoji {
  animation: drop-in 250ms ease-out;
}
@keyframes drop-in {
  0%   { transform: translateY(-10px); opacity: 0; }
  100% { transform: translateY(0); opacity: 1; }
}
/* L'emoji "tombe" en place — feedback visible a distance */
```

**Attribution recompense (16h30) :**
```css
.reward-emoji {
  animation: reward-pop 300ms ease-out;
}
@keyframes reward-pop {
  0%   { transform: scale(0); opacity: 0; }
  70%  { transform: scale(1.2); }
  100% { transform: scale(1); opacity: 1; }
}
/* Effet "pop" joyeux pour les recompenses */
```

**Toast notification :**
```css
.toast {
  animation: slide-in 200ms ease-out;
}
.toast.dismiss {
  animation: slide-out 200ms ease-in;
}
@keyframes slide-in {
  from { transform: translateX(100%); opacity: 0; }
  to   { transform: translateX(0); opacity: 1; }
}
/* Glissement depuis la droite */
```

**Bouton Push-to-Talk (enregistrement actif) :**
```css
.recording-active {
  animation: pulse-red 1s ease-in-out infinite;
}
@keyframes pulse-red {
  0%, 100% { box-shadow: 0 0 0 0 rgba(239, 68, 68, 0.4); }
  50%      { box-shadow: 0 0 0 12px rgba(239, 68, 68, 0); }
}
/* Pulsation rouge continue pendant l'enregistrement */
```

**Barre de progression (transcription/structuration) :**
```css
.progress-bar {
  animation: progress-indeterminate 1.5s ease-in-out infinite;
}
@keyframes progress-indeterminate {
  0%   { transform: translateX(-100%); }
  100% { transform: translateX(100%); }
}
/* Barre indeterminee — on ne connait pas la duree exacte */
```

### 9.3 Feedback haptique et sonore

L'application est silencieuse par defaut (contexte salle de classe). Aucun son n'est emis sauf configuration explicite dans les parametres.

**Feedback visuel uniquement :**
- Avertissement : changement couleur carte + animation bump compteur
- Sanction : changement couleur + emoji drop-in + flash rapide de la bordure (rouge, 150ms)
- Recompense : emoji pop-in + toast notification
- Absence : desaturation de la carte (transition 200ms vers gris)
- Push-to-Talk actif : pulsation rouge du bouton + indicateur niveau audio
- Erreur : bordure rouge clignotante (2x) + toast rouge

### 9.4 Etats de chargement

```
Chargement initial (splash) :
+---------------------------+
|                           |
|     Comportement          |
|     Chargement...         |
|     [====      ]          |
|                           |
+---------------------------+
Duree max : 2 secondes

Chargement transcription Whisper :
+---------------------------+
|  Transcription...         |
|  [========        ]       |
|  Estimation : < 5 sec     |
+---------------------------+

Chargement structuration LLM :
+---------------------------+
|  Structuration IA...      |
|  [========        ]       |
|  Estimation : < 5 sec     |
+---------------------------+
```

### 9.5 Etats d'erreur

```
Erreur transcription :
+------------------------------------------+
|  Erreur de transcription          [X]    |
|  Le service Whisper n'a pas repondu.     |
|  [Reessayer]  [Saisir manuellement]      |
+------------------------------------------+
   fond rouge clair, icone alerte

Erreur structuration :
+------------------------------------------+
|  Erreur de structuration          [X]    |
|  Le modele IA n'a pas pu traiter le      |
|  texte. Verifiez et reessayez.           |
|  [Reessayer]  [Saisir manuellement]      |
+------------------------------------------+

Erreur base de donnees :
+------------------------------------------+
|  Erreur de sauvegarde             [X]    |
|  Impossible d'enregistrer. Les           |
|  donnees seront reessayees au            |
|  prochain demarrage.                     |
|  [OK]                                    |
+------------------------------------------+
```

### 9.6 Respect de prefers-reduced-motion

```css
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }
}
/* Toutes les animations sont supprimees.
   Les changements d'etat restent visibles
   grace aux couleurs et icones. */
```

---

## Annexes

### A. Palette de couleurs complete

| Token | Tailwind | Hex | Usage |
|-------|----------|-----|-------|
| bg-default | white | #FFFFFF | Fond carte normal |
| bg-warn-1 | amber-50 | #FFFBEB | 1 avertissement |
| bg-warn-2 | amber-100 | #FEF3C7 | 2 avertissements |
| bg-sanction | red-50 | #FEF2F2 | Sanction active |
| bg-absent | slate-200 | #E2E8F0 | Eleve absent |
| bg-app | slate-100 | #F1F5F9 | Fond application |
| text-primary | slate-800 | #1E293B | Texte principal |
| text-secondary | slate-600 | #475569 | Texte secondaire |
| accent-warn | amber-500 | #F59E0B | Bouton avertir |
| accent-danger | red-500 | #EF4444 | Bouton sanctionner |
| accent-success | green-500 | #22C55E | Recompense complete |
| accent-partial | yellow-500 | #EAB308 | Recompense partielle |
| accent-info | blue-500 | #3B82F6 | Liens, actions secondaires |
| sidebar-bg | slate-800 | #1E293B | Fond barre laterale |
| sidebar-text | slate-200 | #E2E8F0 | Texte barre laterale |
| sidebar-active | blue-500 | #3B82F6 | Module actif |

### B. Typographie

| Element | Police | Taille | Poids | Usage |
|---------|--------|--------|-------|-------|
| Titre app | System UI | 20px | Bold | En-tete |
| Prenom carte | System UI | 16px | Semibold | Carte eleve |
| Prenom TBI | System UI | 28px | Bold | Mode TBI |
| Texte carte | System UI | 13px | Normal | Details carte |
| Label sidebar | System UI | 14px | Medium | Navigation |
| Toast | System UI | 14px | Medium | Notifications |
| Bouton | System UI | 14px | Semibold | Actions |
| Emoji recompense | — | 20px | — | Ligne L-M-J-V |
| Emoji TBI | — | 36px | — | Mode TBI |
| Transcription | System UI | 16px | Normal | Zone dictee |
| Tableau obs. | System UI | 14px | Normal | Observations |

### C. Espacement

Systeme base sur un multiple de 4px (Tailwind standard) :

| Token | Valeur | Usage |
|-------|--------|-------|
| gap-card | 8px (gap-2) | Espace entre cartes |
| pad-card | 12px (p-3) | Padding interne carte |
| pad-section | 16px (p-4) | Padding sections |
| pad-page | 16px (p-4) | Marge page |
| gap-button | 8px (gap-2) | Espace entre boutons |
| gap-form | 12px (gap-3) | Espace champs formulaire |
| border-radius | 8px (rounded-lg) | Coins arrondis cartes |
| border-radius-btn | 6px (rounded-md) | Coins arrondis boutons |

### D. Icones

Jeu d'icones : Lucide React (coherent avec l'ecosysteme existant)

| Icone | Nom Lucide | Usage |
|-------|-----------|-------|
| Grille | LayoutGrid | Module 1 (Classe) |
| Personne | User | Module 2 (Individuel) |
| Micro | Mic | Module 3 (Apprentissages) |
| Engrenage | Settings | Parametres |
| Fleche export | Download | Export |
| Plus | Plus | Ajouter eleve |
| Alerte | AlertTriangle | Avertissement |
| X | X | Fermer |
| Menu | Menu | Hamburger sidebar |
| Chevron | ChevronDown | Dropdowns |
| Horloge | Clock | Historique |
| Graphique | BarChart3 | Statistiques |

### E. Glossaire

| Terme | Definition |
|-------|-----------|
| Avertissement | Rappel a l'ordre (1-3 par jour, reset 16h30) |
| Sanction | Consequence comportementale avec raison obligatoire (max 10/sem) |
| Recompense | Attribution automatique a 16h30 selon le nombre d'avertissements |
| Recompense complete | 0 avertissement dans la journee |
| Recompense partielle | 1-2 avertissements dans la journee |
| TBI | Tableau Blanc Interactif (videoprojection en classe) |
| Push-to-Talk | Mode d'enregistrement vocal : maintenir pour parler, relacher pour arreter |
| Structuration | Transformation d'un texte libre en observations structurees par le LLM |
| Periode | Trimestre ou semestre scolaire (configurable) |
| Sidecar | Processus externe (Whisper, Qwen) lance par Tauri en arriere-plan |
| GBNF | Grammar-Based Notation Format — contrainte de sortie LLM |

---

*Document genere le 2026-02-10 dans le cadre du workflow BMM V2.*
*Auteur : Uhama | Projet : Comportement V2 | Agent : ux-designer*
