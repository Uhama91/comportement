---
stepsCompleted: [step-01-validate-prerequisites, step-02-design-epics, step-03-create-stories, step-04-final-validation]
inputDocuments:
  - prd.md
  - architecture.md
workflowType: 'epics-and-stories'
project_name: 'comportement'
user_name: 'Uhama'
date: '2026-01-26'
---

# comportement - Epic Breakdown

## Overview

This document provides the complete epic and story breakdown for comportement, decomposing the requirements from the PRD, UX Design if it exists, and Architecture requirements into implementable stories.

## Requirements Inventory

### Functional Requirements

**Gestion des Élèves (8 FRs)**
- FR1: L'enseignant peut ajouter un nouvel élève à la classe
- FR2: L'enseignant peut modifier le prénom d'un élève
- FR3: L'enseignant peut supprimer un élève de la classe
- FR4: L'enseignant peut voir la liste de tous les élèves avec leur statut actuel
- FR5: Le système supporte un maximum de 30 élèves par classe
- FR6: Le système trie les élèves sans sanction par ordre alphabétique de prénom
- FR7: Le système affiche les élèves avec sanction(s) en haut de la liste
- FR8: Le système trie les élèves avec sanctions par nombre de sanctions décroissant

**Système d'Avertissements (5 FRs)**
- FR9: L'enseignant peut donner un avertissement à un élève
- FR10: Le système affiche le 1er avertissement comme un émoji partiel
- FR11: Le système affiche le 2ème avertissement avec un indicateur "x2"
- FR12: Le système convertit automatiquement un 3ème avertissement en sanction
- FR13: Le système réinitialise automatiquement tous les avertissements à 16h30

**Système de Sanctions (8 FRs)**
- FR14: L'enseignant peut ajouter une sanction à un élève
- FR15: L'enseignant peut retirer une sanction d'un élève
- FR16: L'enseignant peut ajouter une raison optionnelle lors d'une sanction
- FR17: Le système affiche les sanctions sous forme d'émojis tristes
- FR18: Le système comptabilise les sanctions jusqu'à 10 par semaine par élève
- FR19: Le système affiche une alerte visuelle quand un élève atteint 10 sanctions
- FR20: Le système réinitialise automatiquement les sanctions chaque lundi
- FR21: Retirer une sanction supprime également sa raison associée

**Historique & Export (4 FRs)**
- FR22: L'enseignant peut consulter le bilan hebdomadaire par élève
- FR23: Le système stocke l'historique sur 36 semaines (année scolaire)
- FR24: L'enseignant peut exporter toutes les données au format JSON
- FR25: Les données persistent après redémarrage de l'app et de l'ordinateur

**Affichage & Interface (4 FRs)**
- FR26: L'enseignant peut accéder à l'app en mode fenêtre rapide
- FR27: L'enseignant peut basculer en mode plein écran TBI
- FR28: Les élèves peuvent lire leur statut depuis leur place (affichage TBI)
- FR29: L'interface utilise un design lisible pour des enfants de 7-10 ans

**Intégration Système (5 FRs)**
- FR30: L'app peut se lancer au démarrage du système
- FR31: L'app affiche une icône dans la barre système (tray)
- FR32: L'enseignant peut ouvrir l'app via un raccourci clavier global
- FR33: Fermer la fenêtre minimise dans le tray (ne quitte pas l'app)
- FR34: L'enseignant peut quitter l'app via clic droit sur l'icône tray

### NonFunctional Requirements

**Performance (4 NFRs)**
- NFR1: Toute action utilisateur (avertir, sanctionner, naviguer) s'exécute en moins de 1 seconde
- NFR2: L'app se lance et est utilisable en moins de 3 secondes
- NFR3: L'affichage TBI se met à jour instantanément après une action (< 500ms)
- NFR4: Le raccourci clavier global ouvre l'app en moins de 1 seconde

**Fiabilité (4 NFRs)**
- NFR5: Les données sont sauvegardées automatiquement après chaque modification
- NFR6: Aucune perte de données en cas de fermeture inattendue de l'app
- NFR7: Les resets automatiques (16h30, lundi) s'exécutent avec 100% de fiabilité
- NFR8: L'app reste stable lors d'une utilisation continue sur une journée complète

**Accessibilité TBI (5 NFRs)**
- NFR9: Les prénoms sont lisibles à 6 mètres de distance sur un TBI standard
- NFR10: Contraste élevé entre texte et fond (ratio minimum 4.5:1)
- NFR11: Les émojis sont suffisamment grands pour être distingués à distance
- NFR12: Pas de clignotements ou animations qui pourraient distraire les élèves
- NFR13: Palette de couleurs compatible avec le daltonisme (ne pas utiliser uniquement rouge/vert pour différencier)

### Additional Requirements

**Architecture - Starter Template (CRITIQUE pour Epic 1 Story 1)**
- Utiliser Tauri 2.0 + React + TypeScript comme starter
- Commande d'initialisation : `npm create tauri-app@latest comportement -- --template react-ts`
- Ajouter Tailwind CSS : `npm install -D tailwindcss postcss autoprefixer && npx tailwindcss init -p`

**Architecture - Base de données**
- SQLite via tauri-plugin-sql pour la persistence locale
- Schema avec 3 tables : `students`, `warnings`, `sanctions`
- Index optimisés pour les requêtes fréquentes

**Architecture - State Management**
- Zustand pour la gestion d'état côté React
- Pattern try/catch systématique pour les actions async
- Frontière IPC claire : composants → store → Tauri commands

**Architecture - Déploiement**
- Mode portable obligatoire (pas d'installateur)
- Build en fichier `.exe` unique pour Windows
- Test précoce sur Windows pro pour valider le déploiement

**Architecture - Scheduling**
- Scheduler Rust pour les resets automatiques
- Reset avertissements à 16h30 (quotidien)
- Reset sanctions le lundi (hebdomadaire)

**Architecture - Intégration OS**
- System tray via Tauri plugins
- Raccourci clavier global configurable
- Auto-start au démarrage système

### FR Coverage Map

| FR | Epic | Description |
|----|------|-------------|
| FR1 | Epic 1 | Ajouter élève |
| FR2 | Epic 1 | Modifier prénom |
| FR3 | Epic 1 | Supprimer élève |
| FR4 | Epic 1 | Voir liste + statut |
| FR5 | Epic 1 | Max 30 élèves |
| FR6 | Epic 1 | Tri alphabétique |
| FR7 | Epic 1 | Sanctions en haut |
| FR8 | Epic 1 | Tri par sanctions décroissant |
| FR9 | Epic 2 | Donner avertissement |
| FR10 | Epic 2 | 1er avert = émoji partiel |
| FR11 | Epic 2 | 2ème avert = indicateur x2 |
| FR12 | Epic 2 | 3ème avert → sanction auto |
| FR13 | Epic 2 | Reset 16h30 |
| FR14 | Epic 3 | Ajouter sanction |
| FR15 | Epic 3 | Retirer sanction |
| FR16 | Epic 3 | Raison optionnelle |
| FR17 | Epic 3 | Affichage émojis tristes |
| FR18 | Epic 3 | Max 10/semaine |
| FR19 | Epic 3 | Alerte visuelle à 10 |
| FR20 | Epic 3 | Reset lundi |
| FR21 | Epic 3 | Retirer supprime raison |
| FR22 | Epic 4 | Bilan hebdomadaire |
| FR23 | Epic 4 | Stockage 36 semaines |
| FR24 | Epic 4 | Export JSON |
| FR25 | Epic 1 | Persistence données |
| FR26 | Epic 5 | Mode fenêtre rapide |
| FR27 | Epic 5 | Mode TBI plein écran |
| FR28 | Epic 5 | Lisible depuis place élève |
| FR29 | Epic 5 | Design enfants 7-10 ans |
| FR30 | Epic 6 | Auto-start système |
| FR31 | Epic 6 | Icône tray |
| FR32 | Epic 6 | Raccourci clavier global |
| FR33 | Epic 6 | Fermer = minimise tray |
| FR34 | Epic 6 | Quitter via tray |

## Epic List

### Epic 1: Fondation & Gestion des Élèves
L'enseignant peut gérer sa liste d'élèves et voir leur statut en temps réel.
**FRs couverts:** FR1, FR2, FR3, FR4, FR5, FR6, FR7, FR8, FR25
**Note:** Inclut initialisation Tauri + SQLite + schema de base

### Epic 2: Système d'Avertissements
L'enseignant peut avertir un élève avec le système 1-2-3 et reset automatique quotidien.
**FRs couverts:** FR9, FR10, FR11, FR12, FR13

### Epic 3: Système de Sanctions
L'enseignant peut gérer les sanctions avec raisons optionnelles et limite hebdomadaire.
**FRs couverts:** FR14, FR15, FR16, FR17, FR18, FR19, FR20, FR21

### Epic 4: Historique & Export
L'enseignant peut consulter l'historique hebdomadaire et exporter les données en JSON.
**FRs couverts:** FR22, FR23, FR24

### Epic 5: Interface TBI & Accessibilité
Les élèves peuvent voir leur statut sur le TBI depuis leur place avec un design adapté.
**FRs couverts:** FR26, FR27, FR28, FR29
**NFRs adressés:** NFR9, NFR10, NFR11, NFR12, NFR13

### Epic 6: Intégration Système
L'app s'intègre au système d'exploitation avec tray, raccourcis et auto-start.
**FRs couverts:** FR30, FR31, FR32, FR33, FR34

---

## Epic 1: Fondation & Gestion des Élèves

L'enseignant peut gérer sa liste d'élèves et voir leur statut en temps réel.

### Story 1.1: Initialisation du projet Tauri

As a développeur,
I want initialiser le projet avec Tauri + React + TypeScript + Tailwind + SQLite,
So that j'ai une base technique fonctionnelle pour développer l'application.

**Acceptance Criteria:**

**Given** aucun projet n'existe
**When** j'exécute les commandes d'initialisation Tauri
**Then** le projet se crée avec React + TypeScript
**And** Tailwind CSS est configuré et fonctionnel
**And** le plugin tauri-plugin-sql est installé
**And** le schema SQLite (table `students`) est créé
**And** `npm run tauri dev` lance l'application sans erreur

### Story 1.2: Ajouter un élève

As a enseignant,
I want ajouter un nouvel élève à ma classe,
So that je puisse suivre son comportement.

**Acceptance Criteria:**

**Given** je suis sur l'écran principal
**When** je clique sur "Ajouter un élève" et saisis un prénom
**Then** l'élève apparaît dans la liste
**And** l'élève est sauvegardé en base de données

**Given** j'ai déjà 30 élèves
**When** je tente d'ajouter un 31ème élève
**Then** un message m'informe que la limite est atteinte
**And** l'ajout est bloqué

### Story 1.3: Afficher la liste des élèves

As a enseignant,
I want voir la liste de tous mes élèves avec leur statut,
So that je sache rapidement qui a des avertissements ou sanctions.

**Acceptance Criteria:**

**Given** j'ai des élèves enregistrés
**When** j'ouvre l'application
**Then** je vois la liste de tous les élèves
**And** chaque élève affiche son prénom
**And** chaque élève affiche son statut (avertissements/sanctions)

**Given** je n'ai aucun élève
**When** j'ouvre l'application
**Then** je vois un message "Aucun élève" avec un bouton d'ajout

### Story 1.4: Modifier un élève

As a enseignant,
I want modifier le prénom d'un élève,
So that je puisse corriger une erreur de saisie.

**Acceptance Criteria:**

**Given** un élève existe dans la liste
**When** je clique sur "Modifier" et change le prénom
**Then** le nouveau prénom est affiché
**And** la modification est sauvegardée en base

**Given** je tente de sauvegarder un prénom vide
**When** je valide
**Then** un message d'erreur s'affiche
**And** la modification n'est pas sauvegardée

### Story 1.5: Supprimer un élève

As a enseignant,
I want supprimer un élève de ma classe,
So that je puisse retirer un élève qui a changé de classe.

**Acceptance Criteria:**

**Given** un élève existe dans la liste
**When** je clique sur "Supprimer"
**Then** une confirmation me demande de valider
**And** si je confirme, l'élève disparaît de la liste
**And** l'élève est supprimé de la base de données

**Given** je clique sur "Supprimer"
**When** j'annule la confirmation
**Then** l'élève reste dans la liste

### Story 1.6: Tri dynamique de la liste

As a enseignant,
I want que les élèves avec sanctions soient affichés en premier,
So that je voie immédiatement qui a des problèmes de comportement.

**Acceptance Criteria:**

**Given** des élèves avec et sans sanctions
**When** j'affiche la liste
**Then** les élèves avec sanctions apparaissent en haut
**And** ils sont triés par nombre de sanctions décroissant
**And** les élèves sans sanction sont triés par ordre alphabétique

**Given** deux élèves ont le même nombre de sanctions
**When** j'affiche la liste
**Then** ils sont triés alphabétiquement entre eux

### Story 1.7: Persistence des données

As a enseignant,
I want que mes données soient sauvegardées automatiquement,
So that je ne perde jamais mon travail.

**Acceptance Criteria:**

**Given** j'ai ajouté/modifié/supprimé des élèves
**When** je ferme et rouvre l'application
**Then** toutes mes données sont toujours présentes

**Given** l'ordinateur redémarre
**When** je relance l'application
**Then** toutes mes données sont intactes

**Given** je fais une modification
**When** l'application plante
**Then** ma dernière modification est sauvegardée

---

## Epic 2: Système d'Avertissements

L'enseignant peut avertir un élève avec le système 1-2-3 et reset automatique quotidien.

### Story 2.1: Donner un avertissement

As a enseignant,
I want donner un avertissement à un élève en un clic,
So that je puisse réagir rapidement sans interrompre mon cours.

**Acceptance Criteria:**

**Given** un élève sans avertissement
**When** je clique sur le bouton avertissement
**Then** l'élève passe à 1 avertissement
**And** un émoji partiel s'affiche (FR10)

**Given** un élève avec 1 avertissement
**When** je clique sur le bouton avertissement
**Then** l'élève passe à 2 avertissements
**And** un indicateur "x2" s'affiche (FR11)

### Story 2.2: Conversion automatique 3ème avertissement

As a enseignant,
I want que le 3ème avertissement se convertisse automatiquement en sanction,
So that le système applique la règle pédagogique sans action supplémentaire.

**Acceptance Criteria:**

**Given** un élève avec 2 avertissements
**When** je clique sur le bouton avertissement
**Then** les avertissements sont remis à 0
**And** une sanction est automatiquement ajoutée (FR12)
**And** une modale propose d'ajouter une raison (optionnel)

### Story 2.3: Reset automatique des avertissements à 16h30

As a enseignant,
I want que les avertissements se réinitialisent automatiquement à 16h30,
So that chaque journée reparte à zéro sans action manuelle.

**Acceptance Criteria:**

**Given** des élèves ont des avertissements (1 ou 2)
**When** l'horloge passe 16h30
**Then** tous les avertissements sont remis à 0 (FR13)
**And** les sanctions restent inchangées

**Given** l'application était fermée à 16h30
**When** je l'ouvre après 16h30
**Then** les avertissements du jour précédent sont à 0

---

## Epic 3: Système de Sanctions

L'enseignant peut gérer les sanctions avec raisons optionnelles et limite hebdomadaire.

### Story 3.1: Ajouter une sanction manuellement

As a enseignant,
I want ajouter une sanction directement à un élève,
So that je puisse sanctionner sans passer par les 3 avertissements.

**Acceptance Criteria:**

**Given** un élève dans la liste
**When** je clique sur "Ajouter sanction"
**Then** une sanction est ajoutée (FR14)
**And** un émoji triste s'affiche (FR17)
**And** une modale propose d'ajouter une raison optionnelle (FR16)

### Story 3.2: Retirer une sanction

As a enseignant,
I want retirer une sanction d'un élève,
So that je puisse corriger une erreur.

**Acceptance Criteria:**

**Given** un élève avec au moins une sanction
**When** je clique sur "Retirer sanction"
**Then** la dernière sanction est supprimée (FR15)
**And** la raison associée est également supprimée (FR21)
**And** l'affichage se met à jour instantanément

### Story 3.3: Limite de 10 sanctions par semaine

As a enseignant,
I want être alerté quand un élève atteint 10 sanctions,
So that je sache qu'une intervention est nécessaire.

**Acceptance Criteria:**

**Given** un élève avec 9 sanctions cette semaine
**When** j'ajoute une 10ème sanction
**Then** la sanction est ajoutée (FR18)
**And** une alerte visuelle s'affiche (FR19)

**Given** un élève avec 10 sanctions
**When** je tente d'ajouter une 11ème sanction
**Then** un message m'informe que la limite est atteinte
**And** l'ajout est bloqué

### Story 3.4: Reset automatique des sanctions le lundi

As a enseignant,
I want que les sanctions se réinitialisent automatiquement chaque lundi,
So that chaque semaine reparte à zéro.

**Acceptance Criteria:**

**Given** des élèves ont des sanctions
**When** on passe au lundi (00h00)
**Then** toutes les sanctions de la semaine précédente sont archivées (FR20)
**And** le compteur de sanctions de la semaine est remis à 0
**And** l'historique conserve les données

**Given** l'application était fermée pendant le weekend
**When** je l'ouvre le lundi
**Then** les sanctions sont bien réinitialisées

---

## Epic 4: Historique & Export

L'enseignant peut consulter l'historique hebdomadaire et exporter les données en JSON.

### Story 4.1: Consulter le bilan hebdomadaire

As a enseignant,
I want voir le bilan de la semaine par élève,
So that je puisse faire le point avant le weekend.

**Acceptance Criteria:**

**Given** je suis sur l'écran historique
**When** je sélectionne une semaine
**Then** je vois la liste des élèves avec leurs sanctions (FR22)
**And** je vois les raisons associées à chaque sanction
**And** les élèves sont triés par nombre de sanctions décroissant

### Story 4.2: Stockage de l'historique sur 36 semaines

As a enseignant,
I want conserver l'historique sur toute l'année scolaire,
So that je puisse analyser l'évolution des comportements.

**Acceptance Criteria:**

**Given** j'utilise l'application depuis plusieurs semaines
**When** je consulte l'historique
**Then** je peux naviguer sur les 36 dernières semaines (FR23)
**And** les données anciennes sont accessibles

**Given** plus de 36 semaines de données
**When** une nouvelle semaine commence
**Then** les données les plus anciennes sont archivées/supprimées

### Story 4.3: Export JSON des données

As a enseignant,
I want exporter toutes les données au format JSON,
So that je puisse les analyser avec un outil IA externe.

**Acceptance Criteria:**

**Given** j'ai des données d'élèves et sanctions
**When** je clique sur "Exporter JSON"
**Then** un fichier JSON est généré (FR24)
**And** il contient tous les élèves, sanctions et raisons
**And** il contient l'historique complet
**And** je peux choisir l'emplacement de sauvegarde

---

## Epic 5: Interface TBI & Accessibilité

Les élèves peuvent voir leur statut sur le TBI depuis leur place avec un design adapté.

### Story 5.1: Mode fenêtre rapide (compact)

As a enseignant,
I want accéder à l'app en mode fenêtre compacte,
So that je puisse agir rapidement sans quitter mon bureau.

**Acceptance Criteria:**

**Given** l'application est lancée
**When** j'ouvre la fenêtre principale
**Then** elle s'affiche en mode compact (FR26)
**And** tous les élèves sont visibles avec leurs contrôles
**And** je peux avertir/sanctionner en moins de 3 secondes

### Story 5.2: Mode TBI plein écran

As a enseignant,
I want basculer en mode plein écran pour le TBI,
So that les élèves puissent voir leur statut depuis leur place.

**Acceptance Criteria:**

**Given** je suis en mode compact
**When** je clique sur "Mode TBI"
**Then** l'affichage passe en plein écran (FR27)
**And** les prénoms sont lisibles à 6 mètres (NFR9)
**And** les émojis sont très grands (NFR11)
**And** le contraste est élevé (NFR10)

**Given** je suis en mode TBI
**When** j'appuie sur Échap ou le bouton retour
**Then** je reviens en mode compact

### Story 5.3: Design accessible et adapté aux enfants

As a élève de 7-10 ans,
I want comprendre facilement mon statut,
So that je sache où j'en suis dans mon comportement.

**Acceptance Criteria:**

**Given** l'affichage TBI est actif
**When** un élève regarde depuis sa place
**Then** il peut lire son prénom (FR28)
**And** il distingue clairement les émojis (FR29)
**And** il n'y a pas de clignotements distrayants (NFR12)
**And** les couleurs ne reposent pas sur rouge/vert uniquement (NFR13)

---

## Epic 6: Intégration Système

L'app s'intègre au système d'exploitation avec tray, raccourcis et auto-start.

### Story 6.1: Lancement automatique au démarrage

As a enseignant,
I want que l'app se lance automatiquement au démarrage de l'ordinateur,
So that elle soit toujours disponible sans action de ma part.

**Acceptance Criteria:**

**Given** l'option auto-start est activée
**When** l'ordinateur démarre
**Then** l'application se lance automatiquement (FR30)
**And** elle se minimise dans le tray

**Given** l'option auto-start est désactivée
**When** l'ordinateur démarre
**Then** l'application ne se lance pas

### Story 6.2: Icône dans la barre système (tray)

As a enseignant,
I want voir une icône dans la barre système,
So that je sache que l'app est active en arrière-plan.

**Acceptance Criteria:**

**Given** l'application est lancée
**When** je regarde la barre système
**Then** une icône de l'app est visible (FR31)
**And** un clic gauche ouvre/affiche la fenêtre principale

### Story 6.3: Raccourci clavier global

As a enseignant,
I want ouvrir l'app avec un raccourci clavier global,
So that je puisse y accéder instantanément depuis n'importe quelle application.

**Acceptance Criteria:**

**Given** l'application est en arrière-plan
**When** j'appuie sur le raccourci configuré (ex: Ctrl+Shift+C)
**Then** la fenêtre principale s'affiche au premier plan (FR32)
**And** le raccourci fonctionne en moins de 1 seconde (NFR4)

### Story 6.4: Comportement de fermeture (minimise dans tray)

As a enseignant,
I want que fermer la fenêtre minimise dans le tray,
So that l'app reste active pour les resets automatiques.

**Acceptance Criteria:**

**Given** la fenêtre principale est ouverte
**When** je clique sur le bouton fermer (X)
**Then** la fenêtre se cache (FR33)
**And** l'icône reste dans le tray
**And** l'application continue de fonctionner en arrière-plan

### Story 6.5: Quitter l'application via le tray

As a enseignant,
I want quitter complètement l'app via le menu tray,
So that je puisse l'arrêter si nécessaire.

**Acceptance Criteria:**

**Given** l'icône est dans le tray
**When** je fais un clic droit et sélectionne "Quitter"
**Then** l'application se ferme complètement (FR34)
**And** l'icône disparaît du tray

---

## Epic 7: Système de Récompenses

L'enseignant peut suivre le comportement positif des élèves avec un système de récompenses automatiques quotidiennes.

**Contexte:** Ce système ajoute une dimension positive au suivi comportemental. Les élèves qui se comportent bien accumulent des émojis positifs, créant une échelle positive/négative plutôt que uniquement punitive.

**Jours concernés:** Lundi, Mardi, Jeudi, Vendredi (pas de mercredi - jour non travaillé)

### Story 7.1: Création de la table daily_rewards

As a développeur,
I want créer une table SQLite pour stocker les récompenses quotidiennes,
So that le système puisse persister l'historique des récompenses par jour.

**Acceptance Criteria:**

**Given** la base de données existe
**When** l'application démarre
**Then** la table `daily_rewards` est créée avec les colonnes :
  - `id` INTEGER PRIMARY KEY
  - `student_id` INTEGER (FK vers students)
  - `date` TEXT (format "YYYY-MM-DD")
  - `day_of_week` TEXT ("L", "M", "J", "V")
  - `reward_type` TEXT ("full", "partial", "cancelled")
  - `had_warnings` INTEGER (0 ou 1-2)
  - `created_at` TEXT

**Given** la table existe déjà
**When** l'application démarre
**Then** aucune erreur, la table reste intacte

### Story 7.2: Attribution automatique des récompenses à 16h30

As a enseignant,
I want que les récompenses soient attribuées automatiquement à 16h30,
So that je n'aie pas d'action manuelle à faire en fin de journée.

**Acceptance Criteria:**

**Given** il est 16h30 un jour travaillé (L, M, J, V)
**When** le scheduler s'exécute
**Then** pour chaque élève :
  - Si 0 avertissement et 0 sanction aujourd'hui → `reward_type = "full"` (😊)
  - Si 1-2 avertissements et 0 sanction → `reward_type = "partial"` (🙂)
  - Si sanction aujourd'hui → pas de récompense créée
**And** l'attribution est silencieuse (pas de popup)

**Given** c'est mercredi
**When** 16h30 arrive
**Then** aucune attribution (jour non travaillé)

**Given** l'application était fermée à 16h30
**When** je l'ouvre après 16h30 le même jour
**Then** l'attribution ratée est effectuée au lancement

### Story 7.3: Annulation d'une récompense par sanction

As a enseignant,
I want qu'une sanction annule la dernière récompense positive de l'élève,
So that le système reflète l'impact d'un mauvais comportement sur le bilan de la semaine.

**Acceptance Criteria:**

**Given** un élève a des récompenses cette semaine (ex: 😊🙂😊)
**When** je lui donne une sanction
**Then** le système cherche la dernière récompense "partial" (🙂)
**And** la convertit en "cancelled" (🙁)

**Given** un élève n'a que des récompenses "full" (😊😊😊)
**When** je lui donne une sanction
**Then** le système convertit la dernière "full" en "cancelled" (🙁)

**Given** un élève n'a aucune récompense cette semaine
**When** je lui donne une sanction
**Then** la sanction est ajoutée normalement (pas d'annulation possible)

### Story 7.4: Affichage de la ligne hebdomadaire L-M-J-V

As a enseignant,
I want voir la ligne de récompenses de la semaine sur chaque carte élève,
So that je visualise rapidement le bilan comportemental de chacun.

**Acceptance Criteria:**

**Given** on est jeudi
**When** j'affiche la carte d'un élève
**Then** je vois uniquement les jours écoulés : [L] [M] (2 cases)
**And** chaque case affiche l'émoji correspondant : 😊, 🙂, 🙁 ou vide

**Given** un élève a le bilan : Lundi=😊, Mardi=🙂
**When** j'affiche sa carte
**Then** je vois : [😊] [🙂]

**Given** c'est lundi matin
**When** j'affiche la carte
**Then** la ligne est vide (aucun jour écoulé encore)

### Story 7.5: Reset hebdomadaire des récompenses

As a enseignant,
I want que les récompenses se réinitialisent chaque lundi,
So that chaque semaine reparte à zéro comme les sanctions.

**Acceptance Criteria:**

**Given** on passe au lundi (00h00)
**When** le scheduler s'exécute
**Then** les récompenses de la semaine précédente sont archivées
**And** la ligne L-M-J-V est vide pour la nouvelle semaine

**Given** l'application était fermée pendant le weekend
**When** je l'ouvre le lundi
**Then** le reset est bien effectué

---

## Epic 8: Refonte Interface en Cartes

L'interface principale passe d'une liste à une grille de cartes fixes pour une meilleure lisibilité sur TBI.

**Contexte:** Les élèves doivent pouvoir voir leur prénom et leur statut sans que l'ordre change quand quelqu'un est sanctionné. L'interface doit s'adapter au nombre d'élèves (18-28) sans scroll.

### Story 8.1: Layout en grille de cartes (remplace la liste)

As a enseignant,
I want voir mes élèves sous forme de cartes dans une grille,
So that chaque élève ait une position fixe facilement repérable.

**Acceptance Criteria:**

**Given** j'ai 18 élèves
**When** j'affiche l'interface
**Then** les élèves sont affichés en grille (ex: 6×3)
**And** toutes les cartes sont visibles sans scroll
**And** l'ordre est alphabétique fixe (A→Z)

**Given** j'ai 28 élèves
**When** j'affiche l'interface
**Then** la grille s'adapte (ex: 7×4)
**And** les cartes sont plus petites mais lisibles
**And** toujours pas de scroll

**Given** un élève reçoit une sanction
**When** l'interface se met à jour
**Then** sa carte reste à la même position (pas de réordonnancement)

### Story 8.2: Contenu de chaque carte élève

As a enseignant,
I want que chaque carte affiche toutes les informations essentielles,
So that je n'aie pas besoin de cliquer pour voir le statut.

**Acceptance Criteria:**

**Given** une carte élève
**When** je la regarde
**Then** je vois :
  - Le prénom
  - Les avertissements du jour (⚠️ ou ⚠️⚠️ à côté du prénom)
  - La ligne hebdomadaire L-M-J-V avec émojis
  - Bouton [Avertir]
  - Bouton [Sanction]

**Given** un élève a 2 avertissements
**When** je regarde sa carte
**Then** je vois "Marie ⚠️⚠️" dans l'en-tête

### Story 8.3: Adaptation responsive sans scroll

As a enseignant,
I want que l'interface s'adapte à la taille de l'écran,
So that tous les élèves soient toujours visibles sur un écran 16:9.

**Acceptance Criteria:**

**Given** un écran 1920×1080 (Full HD)
**When** j'affiche 18 élèves
**Then** la grille utilise tout l'espace disponible
**And** les cartes sont suffisamment grandes pour être lisibles
**And** aucun scroll n'est nécessaire

**Given** un écran 1920×1080
**When** j'affiche 28 élèves
**Then** la grille s'ajuste (plus de colonnes, cartes plus petites)
**And** tout reste visible sans scroll
**And** les boutons restent cliquables (taille minimum)

### Story 8.4: Mode TBI avec le nouveau layout cartes

As a élève,
I want voir mon prénom et mon statut sur le TBI,
So that je sache où j'en suis depuis ma place.

**Acceptance Criteria:**

**Given** le mode TBI est activé
**When** l'affichage plein écran s'affiche
**Then** la grille de cartes est visible
**And** les prénoms sont lisibles à 6 mètres
**And** les émojis (😊🙂🙁⚠️) sont clairement distinguables
**And** l'ordre alphabétique est conservé

**Given** le mode TBI est actif
**When** l'enseignant donne un avertissement
**Then** la carte de l'élève se met à jour instantanément
**And** sa position ne change pas

---

## Epic 9: Barre Latérale d'Accès Rapide

L'enseignant peut accéder rapidement à la liste des élèves via une barre latérale escamotable.

**Contexte:** Une fine barre sur le bord droit de l'écran permet d'ouvrir/fermer une liste minimaliste pour des actions rapides sans quitter l'application en cours.

### Story 9.1: Barre fine toujours visible sur le bord droit

As a enseignant,
I want voir une fine barre sur le bord droit de l'écran,
So that je sache que l'accès rapide est disponible.

**Acceptance Criteria:**

**Given** l'application est lancée
**When** je regarde le bord droit de l'écran
**Then** une barre fine (~10-15px) est visible
**And** elle reste au premier plan (toujours visible)
**And** elle ne gêne pas les autres applications

**Given** la barre est visible
**When** je passe ma souris dessus
**Then** un effet visuel indique qu'elle est cliquable

### Story 9.2: Expansion/collapse au clic

As a enseignant,
I want ouvrir la liste en cliquant sur la barre,
So that je puisse accéder aux élèves rapidement.

**Acceptance Criteria:**

**Given** la barre est en mode collapsed (~15px)
**When** je clique dessus
**Then** elle s'étend (~250-300px) pour afficher la liste des élèves
**And** l'animation est fluide (<300ms)

**Given** la barre est en mode expanded
**When** je clique sur la zone de collapse (ou en dehors)
**Then** elle revient en mode collapsed
**And** l'animation est fluide

### Story 9.3: Liste minimaliste dans la barre latérale

As a enseignant,
I want voir une liste simple des élèves dans la barre,
So that je puisse agir rapidement sans informations superflues.

**Acceptance Criteria:**

**Given** la barre est ouverte (expanded)
**When** je regarde le contenu
**Then** je vois une liste scrollable des élèves
**And** chaque élève affiche : Prénom + [⚠️] + [🙁]
**And** PAS de ligne L-M-J-V (trop d'informations)

**Given** la liste d'élèves
**When** je scroll
**Then** je peux voir tous les élèves
**And** le scroll est fluide

### Story 9.4: Actions rapides sans modal

As a enseignant,
I want avertir ou sanctionner en un seul clic depuis la barre,
So that l'action soit instantanée.

**Acceptance Criteria:**

**Given** la barre est ouverte
**When** je clique sur [⚠️] d'un élève
**Then** l'avertissement est ajouté immédiatement
**And** aucune modal ne s'affiche
**And** un feedback visuel confirme l'action

**Given** la barre est ouverte
**When** je clique sur [🙁] d'un élève
**Then** la sanction est ajoutée immédiatement
**And** aucune modal de raison ne s'affiche (mode rapide)
**And** un feedback visuel confirme l'action

**Given** un élève atteint le 3ème avertissement depuis la barre
**When** je clique sur [⚠️]
**Then** la sanction auto est appliquée
**And** pas de modal (cohérent avec le mode rapide)

### Story 9.5: Synchronisation avec l'interface principale

As a enseignant,
I want que les actions dans la barre se reflètent dans l'interface principale,
So that tout reste cohérent.

**Acceptance Criteria:**

**Given** l'interface principale est visible
**When** j'ajoute un avertissement via la barre latérale
**Then** la carte de l'élève se met à jour instantanément dans l'interface principale

**Given** je donne une sanction via la barre
**When** je regarde l'interface principale
**Then** la ligne L-M-J-V est mise à jour (annulation si applicable)
**And** le compteur de sanctions est incrémenté

---

## Résumé des nouveaux Epics

| Epic | Titre | Stories | Priorité |
|------|-------|---------|----------|
| 7 | Système de Récompenses | 5 | Haute |
| 8 | Refonte Interface en Cartes | 4 | Haute |
| 9 | Barre Latérale d'Accès Rapide | 5 | Moyenne |

## Ordre d'implémentation suggéré

1. **Epic 8 - Stories 8.1, 8.2, 8.3** : Refonte UI en cartes (base visuelle)
2. **Epic 7 - Stories 7.1, 7.2, 7.4** : Système récompenses (DB + auto + affichage)
3. **Epic 7 - Story 7.3** : Annulation par sanction
4. **Epic 8 - Story 8.4** : Adaptation TBI
5. **Epic 7 - Story 7.5** : Reset hebdomadaire
6. **Epic 9** : Barre latérale (feature indépendante)
