---
stepsCompleted: [1, 2, 3, 4, 5, 6]
inputDocuments:
  - suivi-comportement-briefing-complet.md
  - research/technical-ia-locale-tauri-sidecars-research-2026-02-10.md
  - analysis/brainstorming-session-2026-01-28.md
  - archive-v1/product-brief-comportement-2026-01-26.md
  - archive-v1/prd.md
  - archive-v1/architecture.md
  - archive-v1/epics.md
date: 2026-02-10
author: Uhama
version: V2
previous_version: V1 (2026-01-26)
---

# Product Brief: comportement V2

## Executive Summary

**Comportement V2** est l'évolution majeure d'une application desktop locale (Tauri v2) utilisée quotidiennement par un enseignant de CM2 (École Victor Hugo, Sevran) pour le suivi du comportement des élèves. La V1 — déjà en production — remplace le tableau physique à émojis par une interface numérique rapide avec affichage TBI.

La V2 transforme cet outil en une **plateforme complète de suivi pédagogique à 3 modules** avec **IA locale** (100% offline, conforme RGPD) :
- **Module 1 — Comportement Classe** (évolution V1) : suivi global hebdomadaire + synthèse LLM de progression + export tableau imprimable (Comportement | Travail)
- **Module 2 — Comportement Individuel** : suivi détaillé par élève et par période (incidents, contexte, intervenant)
- **Module 3 — Domaines d'Apprentissage** : dictée vocale en français → transcription automatique (Whisper.cpp) → structuration par domaine via LLM local (Qwen 2.5) → insertion en base

L'IA locale fonctionne **à la demande** (push-to-talk, pipeline séquentiel) : l'enseignant dicte ses observations, le système transcrit puis structure automatiquement les données en JSON validé, sans jamais envoyer de données sur internet.

---

## Core Vision

### Problem Statement

Les enseignants d'école élémentaire gèrent quotidiennement le suivi du comportement et des apprentissages de leurs élèves via des méthodes manuelles : tableau physique à émojis, cahiers de suivi papier, notes manuscrites. L'enseignant utilise déjà l'ordinateur toute la journée en classe — mais il n'existe pas d'outil local, simple et rapide adapté au contexte scolaire français.

De plus, la saisie des appréciations par domaine d'apprentissage (français, mathématiques, etc.) est particulièrement chronophage : l'enseignant doit taper manuellement pour chaque élève, dans chaque matière, en fin de période.

### Problem Impact

- **Perte de temps** : mise à jour manuelle du tableau, saisie individuelle des appréciations (2+ min par élève)
- **Espace physique** : le tableau de comportement occupe une surface précieuse en classe
- **Pas d'historique exploitable** : aucune traçabilité des sanctions ni des tendances sur plusieurs semaines
- **Charge mentale** : l'enseignant doit garder le suivi "en tête" entre les outils papier
- **Inspections** : difficulté à prouver la cohérence du suivi disciplinaire et pédagogique
- **Relation parents** : pas de support structuré pour justifier les décisions lors des entretiens

### Why Existing Solutions Fall Short

Les solutions existantes (ClassDojo, Pronote, etc.) sont :
- **Dépendantes d'internet** — incompatible avec les contraintes réseau des écoles (proxy, WiFi limité)
- **Trop complexes** — fonctionnalités superflues, temps de prise en main élevé
- **Non conformes RGPD** — données élèves envoyées vers des serveurs tiers (problème institutionnel en France)
- **Pas d'IA locale** — aucun outil n'offre la dictée vocale + structuration automatique 100% offline
- **Non adaptées au contexte** — pas conçues pour un accès ultra-rapide en classe ni pour le système pédagogique français personnalisé

### Proposed Solution

Une application desktop locale (Tauri v2) intégrant 3 modules interconnectés + 2 moteurs IA locaux :

1. **Module Comportement Classe** — Suivi global hebdomadaire avec synthèse LLM de progression et export imprimable
2. **Module Comportement Individuel** — Détail par élève, par période scolaire configurable (trimestre ou semestre)
3. **Module Domaines d'Apprentissage** — Dictée vocale → transcription → structuration automatique par domaine

**Architecture IA locale :**
- Whisper.cpp (Speech-to-Text français, ~480 Mo) en sidecar Tauri
- Qwen 2.5 Coder 1.5B (structuration JSON, ~980 Mo) en sidecar Tauri
- Pipeline séquentiel à la demande : Push-to-talk → Whisper transcrit → Whisper s'arrête → LLM structure → LLM s'arrête
- Sécurité 4 couches : Prompt contraint → GBNF grammar → Validateur Rust → Prepared Statements SQLite

**Périodes configurables** : l'enseignant paramètre lui-même trimestres ou semestres selon son école/circonscription.

### Key Differentiators

- **100% local, 100% offline** — Données sur le poste uniquement, conforme RGPD nativement, pas de compte ni de serveur
- **IA locale à la demande** — Dictée vocale + structuration automatique sans internet, activation uniquement quand l'enseignant appuie (push-to-talk)
- **Pipeline séquentiel** — Un seul modèle actif à la fois, compatible avec les PC d'école modestes (4 Go RAM)
- **Sur-mesure contexte français** — Adapté au système scolaire élémentaire français (périodes, domaines d'apprentissage, vocabulaire pédagogique)
- **Stack V1 éprouvée** — Extension d'une application déjà en production quotidienne (Tauri + React + SQLite + Zustand)
- **Sécurité LLM-as-DB** — Le LLM génère du JSON (jamais du SQL) → Rust reconstruit les requêtes avec prepared statements → injection impossible

---

## Target Users

### Primary Users

#### Persona : Ullie — Enseignant(e) d'École Élémentaire

**Profil :**
- Enseignant(e) en CM2, École Élémentaire Victor Hugo, Sevran (93)
- Gère une classe de 18 élèves (9-11 ans)
- Utilise un ordinateur toute la journée en classe, connecté au TBI
- Connaissances numériques intermédiaires : à l'aise avec les outils bureautiques, curieux(se) de technologie
- Pas d'accès WiFi fiable en classe, PC fourni par la mairie (souvent 4 Go RAM, CPU modeste)

**Contexte d'utilisation :**
- Moments de discipline : plusieurs fois par jour, intervention rapide pendant le cours sans interrompre le flux
- Saisie des appréciations : en fin de période (trimestre/semestre), pour chaque élève et chaque domaine d'apprentissage
- Incidents individuels : documentation ponctuelle en temps réel (contexte, intervenant, motif)
- Consultation du bilan : vendredi en fin de semaine, préparation des entretiens parents

**Problème actuel :**
- Tableau physique pour les émojis de comportement → prend de l'espace, pas d'historique
- Appréciations saisies manuellement au clavier → 2+ minutes par élève, chronophage en fin de période
- Cahier de suivi papier pour les incidents → pas de traçabilité structurée, difficulté à retrouver l'historique
- Aucune synthèse automatique des tendances de comportement

**Objectifs :**
- Gagner du temps sur la gestion quotidienne du comportement (< 3 secondes par action)
- Dicter les appréciations au lieu de les taper (~30 sec vs 2 min par élève)
- Avoir un suivi structuré et traçable pour les inspections et les entretiens parents
- Garder les données des élèves 100% sur son poste (pas de cloud, conforme RGPD)

**Ce qui ferait dire "c'est exactement ce qu'il me fallait" :**
- Un clic pour ouvrir, un clic pour agir — jamais plus de 3 secondes pour sanctionner ou avertir
- Dicter ses observations et voir le résultat structuré automatiquement, sans taper
- Un export imprimable prêt pour les parents (tableau Comportement | Travail)
- Affichage propre sur le TBI que les élèves comprennent immédiatement

### Secondary Users

#### Les Élèves (utilisateurs passifs)

**Profil :**
- 18 élèves de CM2 (9-11 ans), École Victor Hugo, Sevran
- Habitués au système d'émojis (tristes = sanctions, heureux = récompenses)
- Comprennent la logique des avertissements et sanctions
- Lisent l'affichage TBI depuis leur place en classe

**Interaction avec le produit :**
- Ne manipulent jamais l'application directement
- Voient l'affichage sur le TBI : leur nom, leurs avertissements, leurs récompenses de la semaine
- Consultent visuellement leur statut (ligne L-M-J-V avec émojis)

**Besoin :**
- Affichage clair, lisible depuis le fond de la classe
- Compréhension immédiate de leur statut quotidien et hebdomadaire
- Sentiment de justice : le système est visible et transparent pour tous

#### Les Parents (utilisateurs indirects)

**Profil :**
- Parents des 18 élèves, contexte multiculturel (Sevran, Seine-Saint-Denis)
- Reçoivent le bilan comportement/travail imprimé en fin de semaine ou de période
- Signent le document comme preuve de communication

**Interaction :**
- Aucune interaction directe avec l'application
- Reçoivent l'export papier (tableau 2 colonnes : Comportement | Travail)
- Lors des entretiens, l'enseignant peut s'appuyer sur l'historique structuré

#### L'Inspecteur / Conseiller pédagogique (utilisateur occasionnel)

**Profil :**
- Visite l'école ponctuellement pour évaluer les pratiques pédagogiques
- Évalue la cohérence et la traçabilité du suivi des élèves

**Interaction :**
- Consultation de l'historique structuré lors d'une inspection
- Vérification de la cohérence entre sanctions, motifs et suivi individualisé

### User Journey

#### Parcours de l'enseignant — Journée type avec V2

| Moment | Action | Module |
|--------|--------|--------|
| **8h30 — Arrivée** | Ouvre l'app (déjà dans le tray), vérifie le reset quotidien, affiche le TBI | Module 1 |
| **En classe — Incident** | Élève se comporte mal → clic sur sa carte → avertissement (< 3 sec) | Module 1 |
| **En classe — Incident grave** | Sanction directe → clic + motif (dropdown ou dictée) | Module 1 + 2 |
| **Pause — Documentation** | Push-to-talk : dicte l'incident détaillé → transcription + structuration auto | Module 2 + IA |
| **16h30 — Fin de journée** | Attribution automatique des récompenses (parfait/partiel), reset avertissements | Module 1 |
| **Vendredi — Bilan** | Consulte le résumé hebdo, vérifie les tendances, prépare l'export parents | Module 1 |
| **Fin de période** | Saisie appréciations par dictée vocale : "En français, Léo progresse bien..." → structuration auto par domaine | Module 3 + IA |
| **Entretien parents** | S'appuie sur l'historique structuré + export imprimé | Module 1 + 2 |

#### Moment "Aha!" (V2)

L'enseignant réalise la valeur de la V2 quand, en fin de trimestre, il dicte les appréciations de ses 18 élèves en 15 minutes au lieu d'1h30 de saisie clavier — et que tout est automatiquement structuré par domaine d'apprentissage.

---

## Success Metrics

### Métriques de Succès Utilisateur

| Critère | Indicateur de succès | Mesure |
|---------|---------------------|--------|
| **Rapidité d'action** | Avertir ou sanctionner un élève en < 3 secondes | Chrono : ouverture app → action complétée |
| **Gain de temps appréciations** | Dictée vocale : ~30 sec/élève vs 2+ min au clavier | Temps par élève en fin de période |
| **Adoption quotidienne** | L'app remplace complètement le tableau physique | Le tableau physique n'est plus utilisé |
| **Fiabilité** | Zéro perte de données sur l'année scolaire | Aucun incident de perte de BDD |
| **Autonomie** | L'enseignant utilise l'app sans aide technique | Aucun besoin de support externe après la 1ère semaine |

### Critères d'Adoption

L'outil sera considéré comme "adopté" quand :
- L'enseignant l'utilise naturellement au quotidien sans y penser
- Le tableau physique à émojis a été retiré de la classe
- Les appréciations de fin de période sont saisies par dictée vocale
- L'export imprimé (Comportement | Travail) est distribué aux parents chaque semaine

### Business Objectives

> *Note : Ce projet est un outil personnel, pas un produit commercial.*

**Objectif principal :** Créer un outil fonctionnel qui résout un vrai problème quotidien d'enseignant — suivi du comportement ET saisie des appréciations.

**Objectif secondaire :** Apprentissage technique — maîtriser l'intégration d'IA locale (Whisper + LLM) dans une application desktop Tauri avec Claude Code.

**Objectif tertiaire :** Produire un outil potentiellement partageable avec d'autres enseignants du même contexte (école élémentaire, France).

### Key Performance Indicators

#### KPIs Fonctionnels

| KPI | Cible | Mesure |
|-----|-------|--------|
| **Installation réussie** | 100% | L'app se lance sans erreur sur le PC école |
| **Temps d'action comportement** | < 3 sec | Ouverture → avertissement/sanction |
| **Resets automatiques** | 100% fiable | Avertissements à 16h30, sanctions le lundi |
| **Affichage TBI** | Lisible à 5m | Élèves lisent leur statut depuis leur place |

#### KPIs IA Locale (V2)

| KPI | Cible | Mesure |
|-----|-------|--------|
| **Temps de transcription** | < 5 sec pour 15 sec d'audio | Chrono push-to-talk → texte affiché |
| **Temps de structuration LLM** | < 5 sec par observation | Chrono texte validé → JSON structuré |
| **Taux d'INSERT valides** | > 95% | INSERTs acceptés par le validateur Rust / total |
| **Taille distribution** | < 2 Go | Exe + modèles GGUF |
| **RAM pic** | < 2 Go (séquentiel) | Mesure en mode séquentiel (un sidecar actif à la fois) |

#### Critère de Succès Global

Le projet V2 sera considéré comme **réussi** quand :
- L'application est **fonctionnelle sur le PC école** (Windows, 4 Go RAM)
- Les **3 modules** sont opérationnels (Comportement Classe, Individuel, Apprentissage)
- La **dictée vocale** fonctionne en français avec un taux de compréhension acceptable
- Le **pipeline IA** (transcription → structuration → insertion) fonctionne de bout en bout
- L'enseignant **utilise l'outil au quotidien** en classe

---

## MVP Scope

### Core Features (V2 MVP)

> *Note : La V1 est en production. Le MVP V2 étend la V1 avec les 3 modules + IA locale.*

**Prérequis — Restructuration V1 :**
- Réorganisation du code V1 en architecture modulaire (`modules/`, `shared/`)
- Migrations SQLite V2 (nouvelles tables, FK vers `config_periodes`)
- Configuration des périodes scolaires (trimestres ou semestres, dates de début/fin)

**Module 1 — Comportement Classe (évolution V1) :**
- Conservation de toutes les fonctionnalités V1 (avertissements, sanctions, récompenses, grille cartes, TBI, tray)
- Ajout du champ motif obligatoire pour les sanctions (bug fix demandé)
- Gestion des absences (bouton absent, exclusion des statistiques)
- Export JSON enrichi (motifs de sanction inclus)

**Module 2 — Comportement Individuel :**
- Fiche détaillée par élève et par période
- Saisie d'incidents : date, heure, type d'événement, motif, description, intervenant
- Historique chronologique des incidents par élève
- Vue par période scolaire

**Module 3 — Domaines d'Apprentissage :**
- Dictée vocale push-to-talk (bouton micro)
- Transcription automatique via Whisper.cpp sidecar
- Affichage du texte transcrit avec possibilité de correction manuelle
- Structuration automatique via LLM Qwen 2.5 (texte libre → JSON par domaine)
- Validation Rust + insertion en base via prepared statements
- Vue tableau : domaines d'apprentissage × élèves × niveaux

**Infrastructure IA :**
- Sidecar Whisper.cpp (whisper-server avec watchdog + fallback CLI)
- Sidecar llama-server + Qwen 2.5 Coder 1.5B
- Pipeline séquentiel à la demande (un seul modèle actif à la fois)
- Grammaire GBNF pour contrainte JSON
- Validateur Rust 4 couches
- Écran premier lancement : téléchargement des modèles GGUF (~1.5 Go)

### Out of Scope for V2 MVP

| Fonctionnalité | Raison du report | Version cible |
|----------------|------------------|---------------|
| Synthèse LLM hebdomadaire (tendances progression) | Complexité prompt + validation qualité | V2.1 |
| Export PDF tableau 2 colonnes (Comportement \| Travail) | L'export JSON suffit pour le MVP | V2.1 |
| Upgrade Qwen3 4B | Attendre stabilisation GGUF + chat template | V2.1 |
| Barre latérale (sidebar window séparée) | Nice-to-have, pas essentiel | V2.2 |
| Gestion des métiers de classe | Module séparé, hors périmètre V2 | V3 |
| Connexion mobile/tablette | Contrainte réseau école, complexité | V3 |
| Multi-classe (plusieurs classes/enseignants) | Un seul utilisateur pour l'instant | V3 |
| Synchronisation cloud | Contradictoire avec le principe 100% local | Non prévu |
| Thèmes visuels TBI | Cosmétique, pas prioritaire | V2.2 |

### MVP Success Criteria

Le MVP V2 sera considéré comme **réussi** quand :
- L'application se lance et fonctionne sur le PC école Windows (4 Go RAM)
- Les 3 modules sont accessibles et fonctionnels
- La dictée vocale transcrit correctement le français parlé (> 80% de compréhension)
- Le pipeline complet (push-to-talk → transcription → structuration → insertion) fonctionne de bout en bout
- Le temps total du pipeline (dictée → données en base) est < 15 secondes
- L'enseignant utilise l'app au quotidien pour les 3 cas d'usage (comportement global, incidents, appréciations)

### Future Vision (V2.1+)

**V2.1 — Synthèse et Export :**
- Synthèse LLM hebdomadaire : analyse des tendances comportementales sur plusieurs semaines
- Export PDF tableau 2 colonnes (Comportement | Travail) prêt à imprimer et faire signer
- Upgrade optionnel vers Qwen3 4B si gains confirmés

**V2.2 — Polish et UX :**
- Barre latérale (sidebar window) pour accès rapide multi-module
- Thèmes visuels TBI (personnalisation couleurs, taille texte)
- Statistiques avancées (graphiques de tendances par élève)

**V3 — Extension :**
- Gestion des métiers de classe (rotation automatique, historique)
- Support multi-classe / multi-enseignant
- Connexion mobile/tablette (si réseau école disponible)
- Package USB pour installation offline dans d'autres écoles

**Vision long terme :**
- Outil partageable avec d'autres enseignants d'élémentaire en France
- Architecture extensible : nouveaux modules via plugins
- Mise à jour des modèles IA (meilleurs modèles français au fil du temps)
