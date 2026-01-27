---
stepsCompleted: [1, 2, 3, 4, 5]
inputDocuments: []
date: 2026-01-26
author: Uhama
---

# Product Brief: comportement

## Executive Summary

**Comportement** est une application desktop locale destinée aux enseignants pour le suivi quotidien du comportement des élèves et la gestion des métiers de classe. L'application remplace le système manuel sur tableau physique par une interface numérique rapide, accessible en un clic, avec affichage sur TBI pour la classe.

L'outil combine deux fonctionnalités essentielles : un système de sanctions/avertissements avec émojis (reset hebdomadaire) et une gestion des responsabilités de classe avec rotation automatique. Simple, local, sans compte requis.

---

## Core Vision

### Problem Statement

Les enseignants utilisent souvent le tableau physique pour suivre le comportement des élèves (émojis, points, etc.). Cette méthode occupe de l'espace précieux, n'est pas pratique à mettre à jour en temps réel, et manque d'organisation. L'enseignant utilise déjà l'ordinateur toute la journée — il serait plus logique d'avoir cet outil directement accessible sur son poste de travail.

### Problem Impact

- Perte de temps pour mettre à jour le tableau manuellement
- Espace physique occupé inutilement
- Pas d'historique des sanctions pour le suivi long terme
- Gestion des métiers de classe également manuelle et chronophage

### Why Existing Solutions Fall Short

Les applications existantes (ClassDojo, etc.) sont souvent :
- Trop complexes avec des fonctionnalités superflues
- Dépendantes d'internet et de comptes utilisateurs
- Non adaptées à un système pédagogique personnalisé
- Pas conçues pour un accès ultra-rapide en classe

### Proposed Solution

Une application desktop locale qui offre :
1. **Suivi du comportement** — Système d'avertissements (1-2-3) et sanctions (émojis tristes, max 10/semaine) avec reset automatique
2. **Gestion des métiers** — Création de rôles, affectation manuelle ou aléatoire, rotation hebdomadaire
3. **Double interface** — Fenêtre rapide pour l'enseignant + affichage TBI pour les élèves
4. **Historique** — Bilan des sanctions par élève et par semaine

### Key Differentiators

- **100% local** — Pas d'internet requis, pas de compte, données privées
- **Ultra-rapide** — Un clic pour ouvrir, un clic pour agir
- **Sur-mesure** — Adapté au système pédagogique spécifique de l'utilisateur
- **Projet d'apprentissage** — Opportunité de maîtriser Claude Code sur un cas concret

---

## Target Users

### Primary Users

#### Persona : L'Enseignant en Élémentaire

**Profil type :**
- Enseignant en classe élémentaire (CE1 à CM1)
- Gère une classe de 20-30 élèves âgés de 7 à 10 ans
- Utilise l'ordinateur toute la journée en classe
- Dispose d'un TBI (Tableau Blanc Interactif) pour l'affichage collectif

**Contexte d'utilisation :**
- Utilisation pendant le temps de classe, tout au long de la journée
- Besoin d'accès ultra-rapide lors des moments de discipline
- Gestion des métiers le lundi matin
- Consultation du bilan en fin de semaine

**Problème actuel :**
- Utilise le tableau physique pour noter les émojis → prend de l'espace, pas pratique
- Gestion manuelle des métiers de classe → chronophage
- Pas d'historique pour le suivi long terme

**Objectif :**
- Gagner du temps sur la gestion quotidienne
- Avoir un outil organisé et accessible en un clic
- Afficher visuellement le suivi pour les élèves via le TBI
- Apprendre à créer des applications avec Claude Code

**Ce qui ferait dire "c'est exactement ce qu'il me fallait" :**
- Un clic pour ouvrir l'app, un clic pour sanctionner/avertir
- Affichage propre sur le TBI que les élèves comprennent
- Reset automatique sans rien avoir à faire

### Secondary Users

#### Les Élèves (utilisateurs passifs)

**Profil :**
- Élèves de 7 à 10 ans (CE1 à CM1)
- Habitués au système d'émojis tristes
- Comprennent la logique des sanctions et avertissements

**Interaction avec le produit :**
- Ne manipulent pas l'application directement
- Voient l'affichage sur le TBI de la classe
- Consultent leur nombre d'émojis / leurs métiers visuellement

**Besoin :**
- Affichage clair et lisible depuis leur place
- Compréhension immédiate de leur statut (avertissements, sanctions)
- Visibilité de leur métier de la semaine

### User Journey

#### Parcours de l'enseignant

| Étape | Action | Moment |
|-------|--------|--------|
| **Lundi matin** | Ouvre l'app, vérifie le reset, affecte les métiers (manuel ou aléatoire) | Début de semaine |
| **En classe** | Un élève se comporte mal → clic sur l'app → sélectionne l'élève → avertissement | Pendant le cours |
| **16h30** | Les avertissements non confirmés disparaissent automatiquement | Fin de journée |
| **Vendredi** | Consulte le bilan de la semaine, note les élèves à 10 émojis | Fin de semaine |
| **Affichage TBI** | Bascule entre vue "comportement" et vue "métiers" selon le besoin | À tout moment |

#### Moment "Aha!"
L'enseignant réalise la valeur quand, en plein cours, il peut sanctionner un élève en 2 secondes sans quitter son bureau ni interrompre le flux de la classe.

---

## Success Metrics

### Métriques de Succès Utilisateur

| Critère | Indicateur de succès |
|---------|---------------------|
| **Fonctionnalité** | L'application s'installe et fonctionne sans problème sur l'ordinateur professionnel |
| **Gain de temps** | Plus besoin de prendre le feutre Véléda pour noter les prénoms/émojis au tableau |
| **Charge mentale** | Ne plus avoir à garder le suivi "en tête" — l'app gère automatiquement |
| **Praticité** | Accès rapide en un clic, actions immédiates |

### Critères d'Adoption

L'outil sera considéré comme "adopté" quand :
- ✅ Il remplace complètement le tableau physique pour le suivi comportement
- ✅ L'enseignant l'utilise naturellement au quotidien sans y penser
- ✅ Le gain de temps est ressenti concrètement

### Business Objectives

> *Note : Ce projet est un outil personnel, pas un produit commercial.*

**Objectif principal :** Créer un outil fonctionnel qui résout un vrai problème quotidien.

**Objectif secondaire :** Apprentissage de la création d'applications avec Claude Code.

### Key Performance Indicators

| KPI | Cible | Mesure |
|-----|-------|--------|
| **Installation réussie** | 100% | L'app se lance sans erreur sur l'ordinateur pro |
| **Fonctionnalités core** | 100% | Toutes les fonctions principales marchent (avertir, sanctionner, métiers, affichage TBI) |
| **Temps d'action** | < 3 sec | Temps entre "ouvrir l'app" et "avertir un élève" |
| **Reset automatique** | Fiable | Les avertissements s'effacent à 16h30, les sanctions se resetent le lundi |

### Critère de Succès du Projet d'Apprentissage

Le projet sera considéré comme **réussi** quand :
- 🎯 L'application est **fonctionnelle** sur l'ordinateur professionnel
- 🎯 L'installation s'est faite **sans problème**
- 🎯 L'outil est **utilisable au quotidien** en classe

---

## MVP Scope

### Core Features (V1)

**Gestion des élèves :**
- Ajouter/supprimer des élèves manuellement
- Liste des élèves avec leur statut visible

**Système d'avertissements :**
- Donner un avertissement (émoji partiel)
- Indicateur visuel pour 2ème avertissement
- 3ème avertissement = sanction automatique
- Reset automatique des avertissements à 16h30

**Système de sanctions :**
- Ajouter une sanction (émoji triste)
- Retirer une sanction si besoin
- Maximum 10 sanctions/semaine avec alerte visuelle
- Reset automatique le lundi
- Champ optionnel pour noter la raison

**Historique :**
- Bilan des sanctions par élève par semaine

**Interface :**
- Fenêtre rapide accessible en un clic
- Mode plein écran pour affichage TBI
- Design lisible pour les élèves (7-10 ans)

**Installation :**
- Application desktop Windows (.exe) — prioritaire
- Application desktop Mac (.app/.dmg) — secondaire

### Out of Scope for MVP

| Fonctionnalité | Raison du report | Version cible |
|----------------|------------------|---------------|
| Gestion des métiers de classe | Pas essentiel pour le problème principal | V2 |
| Connexion mobile (tablette/téléphone) | Contrainte technique (pas de WiFi dans les classes) | V2 |
| Dictée vocale | Dépend de la connexion mobile | V2 |
| Synchronisation cloud | L'app doit rester 100% locale | Non prévu |

### MVP Success Criteria

Le MVP sera considéré comme **réussi** quand :
- ✅ L'application s'installe sans problème sur Windows
- ✅ Le système avertissement/sanction fonctionne correctement
- ✅ Les resets automatiques (16h30 et lundi) sont fiables
- ✅ L'affichage TBI est lisible pour les élèves
- ✅ L'enseignant peut sanctionner un élève en moins de 3 secondes

### Future Vision (V2+)

**V2 — Métiers de classe :**
- Créer et gérer les métiers (distributeur, ramasseur, etc.)
- Affectation manuelle ou aléatoire
- Rotation hebdomadaire automatique
- Priorité aux élèves sans métier la semaine précédente

**V2 — Connexion mobile :**
- Contrôle depuis tablette/téléphone
- Dictée vocale pour les raisons
- Notification sur TBI quand sanction donnée depuis mobile
- Solution technique à trouver (Bluetooth ? Hotspot ? Autre ?)

**Vision long terme :**
- Export des bilans (PDF, impression)
- Personnalisation des émojis/icônes
- Thèmes visuels pour le TBI
