---
stepsCompleted: [step-01-init, step-02-discovery, step-03-success, step-04-journeys, step-07-project-type, step-08-scoping, step-09-functional, step-10-nonfunctional, step-11-polish]
inputDocuments:
  - product-brief-comportement-2026-01-26.md
workflowType: 'prd'
documentCounts:
  briefs: 1
  research: 0
  projectDocs: 0
classification:
  projectType: desktop_app
  domain: edtech
  complexity: low
  projectContext: greenfield
---

# Product Requirements Document - comportement

**Author:** Uhama
**Date:** 2026-01-26

---

## Executive Summary

**Comportement** est une application desktop locale pour le suivi du comportement des élèves en classe élémentaire. Elle remplace le tableau physique par une interface numérique ultra-rapide avec affichage TBI.

**Problème résolu :** Gain de temps, charge mentale réduite, historique automatique.
**Différenciateur :** 100% local, accès en 1 clic, sur-mesure pour le système pédagogique de l'utilisateur.
**Plateformes :** Windows 10/11 (prioritaire), macOS (secondaire).

---

## Success Criteria

### User Success

| Critère | Indicateur mesurable |
|---------|---------------------|
| **Installation sans friction** | L'app se lance au premier essai sur Windows/Mac |
| **Rapidité d'action** | Avertir/sanctionner un élève en moins de 3 secondes |
| **Remplacement du tableau** | 0 utilisation du feutre Véléda pour le suivi comportement |
| **Charge mentale réduite** | L'enseignant ne mémorise plus les sanctions en cours |
| **Affichage élèves** | Les élèves lisent leur statut depuis leur place (TBI) |

### Business Success

> *Projet personnel — pas d'objectifs commerciaux*

| Objectif | Indicateur |
|----------|------------|
| **Outil fonctionnel** | Utilisable au quotidien en classe sans bug bloquant |
| **Apprentissage Claude Code** | Projet terminé et déployé avec succès |
| **Valeur pédagogique** | Export utilisable pour analyse IA des comportements |

### Technical Success

| Critère | Cible |
|---------|-------|
| **Capacité** | Gestion de 30 élèves maximum par classe |
| **Stockage** | Base de données locale (SQLite ou équivalent) |
| **Export** | Format JSON pour intégration IA externe |
| **Historique** | 36 semaines (année scolaire complète) |
| **Reset automatique** | Avertissements à 16h30, sanctions le lundi — fiable à 100% |
| **Plateformes** | Windows (.exe) prioritaire, Mac (.app) secondaire |

### Measurable Outcomes

- ✅ **Jour 1** : L'app s'installe et se lance sans erreur
- ✅ **Semaine 1** : Toutes les fonctions core marchent (avertir, sanctionner, reset)
- ✅ **Semaine 4** : L'historique s'accumule correctement
- ✅ **Fin d'année** : Export JSON complet de l'année scolaire

---

## Product Scope

### MVP - Minimum Viable Product (V1)

**Gestion des élèves :**
- Ajouter/modifier/supprimer des élèves (max 30)
- Liste avec statut visible (avertissements + sanctions)

**Système d'avertissements :**
- 1er avertissement → émoji partiel
- 2ème avertissement → émoji partiel + indicateur "x2"
- 3ème avertissement → sanction automatique
- Reset automatique à 16h30

**Système de sanctions :**
- Ajouter/retirer une sanction (émoji triste)
- Maximum 10/semaine avec alerte visuelle à 10
- Champ optionnel pour la raison
- Reset automatique le lundi

**Historique & Export :**
- Bilan par élève par semaine
- Stockage local (36 semaines)
- Export JSON de toutes les données

**Interface :**
- Fenêtre rapide (accès en un clic)
- Mode plein écran TBI
- Design lisible pour enfants 7-10 ans

**Installation :**
- Windows (.exe) — prioritaire
- Mac (.app/.dmg) — secondaire

### Growth Features (Post-MVP / V2)

- Gestion des métiers de classe
- Affectation manuelle ou aléatoire
- Rotation hebdomadaire automatique
- Connexion mobile (si solution technique trouvée)

### Vision (Future)

- Dictée vocale pour les raisons
- Thèmes visuels personnalisables
- Export PDF des bilans
- Intégration directe avec outils IA pour synthèse comportementale

---

## User Journeys

### Journey 1 : Début de semaine (Lundi matin)

**Utilisateur :** Enseignant | **Type :** Happy path

**Contexte :** C'est lundi matin, une nouvelle semaine commence. Les sanctions de la semaine précédente ont été automatiquement effacées.

**Parcours :**
1. L'enseignant arrive en classe, allume l'ordinateur
2. Ouvre l'app en un clic
3. Vérifie que le reset du lundi s'est bien fait (tous les émojis tristes à zéro)
4. Affiche le tableau comportement sur le TBI pour que les élèves voient le "compteur à zéro"
5. La semaine peut commencer

**Moment clé :** La satisfaction de voir un tableau propre sans avoir rien eu à faire.

---

### Journey 2 : Gestion d'un incident (Pendant le cours)

**Utilisateur :** Enseignant | **Type :** Core usage

**Contexte :** L'enseignant est en plein cours. Un élève perturbe la classe.

**Parcours — Avertissement :**
1. Avertit verbalement l'élève
2. Sans quitter son bureau, clique sur l'app (fenêtre rapide)
3. Sélectionne l'élève dans la liste
4. Clique "Avertissement" → émoji partiel s'affiche
5. L'élève voit sur le TBI qu'il a reçu un avertissement
6. Retourne à son cours en 3 secondes

**Parcours — 3ème avertissement (sanction auto) :**
1. L'élève récidive pour la 3ème fois
2. Clique "Avertissement" → sanction automatique (émoji triste complet)
3. L'app propose d'ajouter une raison (optionnel)
4. Tape rapidement "bavardage répété" et valide

**Moment clé :** La fluidité — pas d'interruption du cours, l'élève est averti visuellement.

---

### Journey 3 : Fin de journée (16h30)

**Utilisateur :** Système (automatique) | **Type :** Automatisation

**Contexte :** C'est 16h30, fin de la journée de classe.

**Parcours :**
1. L'app détecte automatiquement 16h30
2. Tous les avertissements non transformés en sanctions disparaissent
3. Les sanctions de la journée restent (elles s'accumulent sur la semaine)
4. Aucune action requise de l'enseignant

**Moment clé :** Charge mentale libérée — pas besoin de se souvenir des avertissements.

---

### Journey 4 : Bilan de fin de semaine (Vendredi)

**Utilisateur :** Enseignant | **Type :** Consultation

**Contexte :** C'est vendredi après-midi, l'enseignant fait le point avant le weekend.

**Parcours :**
1. Ouvre l'app et va dans "Historique"
2. Voit le bilan de la semaine : qui a eu combien de sanctions
3. Un élève a atteint 10 émojis → alerte visuelle
4. Note mentalement de parler aux parents
5. Peut exporter en JSON si besoin pour analyse ultérieure

**Moment clé :** Vue claire de la semaine sans avoir à compter manuellement.

---

### Journey 5 : L'élève consulte son statut

**Utilisateur :** Élève (passif) | **Type :** Consultation visuelle

**Contexte :** Un élève veut savoir où il en est.

**Parcours :**
1. L'élève lève les yeux vers le TBI
2. Voit la liste des prénoms avec les émojis
3. Repère son nom et compte ses émojis tristes
4. Comprend immédiatement son statut

**Moment clé :** Transparence — l'élève sait exactement où il en est.

---

### Journey 6 : Correction d'une erreur

**Utilisateur :** Enseignant | **Type :** Edge case

**Contexte :** L'enseignant a sanctionné le mauvais élève ou réalise que la sanction n'était pas justifiée.

**Parcours :**
1. Ouvre l'app
2. Sélectionne l'élève concerné
3. Voit ses sanctions avec leurs raisons
4. Clique "Retirer" sur la sanction en question
5. La sanction ET sa raison sont supprimées
6. Le TBI se met à jour instantanément

**Moment clé :** Possibilité de corriger rapidement sans stress.

---

### Journey Requirements Summary

| Journey | Capacités révélées |
|---------|-------------------|
| Début de semaine | Reset automatique lundi, affichage TBI, vérification statut |
| Gestion d'incident | Fenêtre rapide, sélection élève, avertissement/sanction, raison optionnelle |
| Fin de journée | Reset automatique 16h30, persistence des sanctions |
| Bilan de semaine | Vue historique, alerte 10 émojis, export JSON |
| Consultation élève | Affichage TBI lisible, liste prénoms + émojis |
| Correction d'erreur | Suppression sanction + raison, mise à jour TBI temps réel |

---

## Desktop App Specific Requirements

### Platform Support

| Plateforme | Priorité | Format |
|------------|----------|--------|
| **Windows** | Primaire | `.exe` (installateur) |
| **macOS** | Secondaire | `.app` / `.dmg` |
| **Linux** | Non supporté | — |

### System Integration

**Lancement automatique :**
- Démarrage avec le système d'exploitation (option activée par défaut)
- L'app reste active en arrière-plan toute la journée

**Accès rapide :**
- Icône dans la barre système (system tray Windows / menu bar Mac)
- Raccourci clavier global configurable pour ouvrir/afficher l'app
- Clic sur l'icône tray = affiche la fenêtre principale

**Comportement fenêtre :**
- Fermer la fenêtre = minimise dans le tray (ne quitte pas l'app)
- Quitter réellement = clic droit sur icône tray → "Quitter"

### Update Strategy

| Aspect | Choix |
|--------|-------|
| **Méthode** | Manuelle (téléchargement nouvelle version) |
| **Notification** | Optionnelle — vérification au lancement si nouvelle version disponible |
| **Raison** | Outil personnel, simplicité maximale |

### Offline & Data Persistence

**Mode 100% local :**
- Aucune connexion internet requise
- Aucune synchronisation cloud (présent ou futur)
- Toutes les données stockées localement

**Persistence des données (CRITIQUE) :**
- Base SQLite locale sauvegardée automatiquement
- Survit aux redémarrages de l'ordinateur
- Survit aux fermetures/réouvertures de l'app
- Données conservées : élèves, avertissements, sanctions, historique, raisons

**Resets automatiques (logique métier, pas perte de données) :**
- 16h30 : Reset des avertissements du jour (sanctions conservées)
- Lundi : Reset des sanctions de la semaine (historique conservé)

---

## Project Scoping & Phased Development

### MVP Strategy & Philosophy

**Approche MVP :** Problem-solving — résoudre un problème quotidien concret
**Ressources :** Développement solo assisté par Claude Code
**Méthode :** Itérations successives jusqu'à satisfaction

### MVP Validation

Toutes les 6 user journeys sont essentielles au MVP :
- ✅ Reset automatique (lundi + 16h30)
- ✅ Gestion avertissements/sanctions
- ✅ Affichage TBI
- ✅ Historique et export
- ✅ Correction d'erreurs

**Le MVP est minimaliste et cohérent — rien à retirer.**

### Phased Development

| Phase | Contenu |
|-------|---------|
| **Phase 1 (MVP)** | Suivi comportement complet, TBI, historique, export JSON |
| **Phase 2 (Growth)** | Métiers de classe, connexion mobile |
| **Phase 3 (Vision)** | Dictée vocale, thèmes, PDF, intégration IA |

### Risk Mitigation Strategy

**Risque technique CRITIQUE — Windows Deployment :**

> ⚠️ Tentative précédente : écran blanc sur Windows pro, désinstallation impossible

**Environnement cible :**
- Windows 10/11 (ordinateur professionnel)
- Politiques de sécurité entreprise potentiellement actives

**Causes probables :**
- Application non signée bloquée par politiques entreprise
- Windows SmartScreen/Defender bloquant l'exécution
- Dépendances manquantes (VC++ redistributables)

**Stratégies de mitigation :**
1. **Test précoce** — Tester sur Windows pro AVANT de développer toutes les fonctionnalités
2. **Code signing** — Obtenir un certificat de signature si nécessaire
3. **Framework adapté** — Tauri ou Electron avec configuration Windows correcte
4. **Installateur propre** — Utiliser NSIS ou WiX pour un installateur Windows standard
5. **Mode portable** — Option sans installation si blocage persistant

**Risque ressource :** Faible — approche itérative acceptée
**Risque marché :** Aucun — outil personnel

---

## Functional Requirements

### Gestion des Élèves

- FR1: L'enseignant peut ajouter un nouvel élève à la classe
- FR2: L'enseignant peut modifier le prénom d'un élève
- FR3: L'enseignant peut supprimer un élève de la classe
- FR4: L'enseignant peut voir la liste de tous les élèves avec leur statut actuel
- FR5: Le système supporte un maximum de 30 élèves par classe
- FR6: Le système trie les élèves sans sanction par ordre alphabétique de prénom
- FR7: Le système affiche les élèves avec sanction(s) en haut de la liste
- FR8: Le système trie les élèves avec sanctions par nombre de sanctions décroissant

### Système d'Avertissements

- FR9: L'enseignant peut donner un avertissement à un élève
- FR10: Le système affiche le 1er avertissement comme un émoji partiel
- FR11: Le système affiche le 2ème avertissement avec un indicateur "x2"
- FR12: Le système convertit automatiquement un 3ème avertissement en sanction
- FR13: Le système réinitialise automatiquement tous les avertissements à 16h30

### Système de Sanctions

- FR14: L'enseignant peut ajouter une sanction à un élève
- FR15: L'enseignant peut retirer une sanction d'un élève
- FR16: L'enseignant peut ajouter une raison optionnelle lors d'une sanction
- FR17: Le système affiche les sanctions sous forme d'émojis tristes
- FR18: Le système comptabilise les sanctions jusqu'à 10 par semaine par élève
- FR19: Le système affiche une alerte visuelle quand un élève atteint 10 sanctions
- FR20: Le système réinitialise automatiquement les sanctions chaque lundi
- FR21: Retirer une sanction supprime également sa raison associée

### Historique & Export

- FR22: L'enseignant peut consulter le bilan hebdomadaire par élève
- FR23: Le système stocke l'historique sur 36 semaines (année scolaire)
- FR24: L'enseignant peut exporter toutes les données au format JSON
- FR25: Les données persistent après redémarrage de l'app et de l'ordinateur

### Affichage & Interface

- FR26: L'enseignant peut accéder à l'app en mode fenêtre rapide
- FR27: L'enseignant peut basculer en mode plein écran TBI
- FR28: Les élèves peuvent lire leur statut depuis leur place (affichage TBI)
- FR29: L'interface utilise un design lisible pour des enfants de 7-10 ans

### Intégration Système

- FR30: L'app peut se lancer au démarrage du système
- FR31: L'app affiche une icône dans la barre système (tray)
- FR32: L'enseignant peut ouvrir l'app via un raccourci clavier global
- FR33: Fermer la fenêtre minimise dans le tray (ne quitte pas l'app)
- FR34: L'enseignant peut quitter l'app via clic droit sur l'icône tray

---

## Non-Functional Requirements

### Performance

- NFR1: Toute action utilisateur (avertir, sanctionner, naviguer) s'exécute en moins de 1 seconde
- NFR2: L'app se lance et est utilisable en moins de 3 secondes
- NFR3: L'affichage TBI se met à jour instantanément après une action (< 500ms)
- NFR4: Le raccourci clavier global ouvre l'app en moins de 1 seconde

### Fiabilité

- NFR5: Les données sont sauvegardées automatiquement après chaque modification
- NFR6: Aucune perte de données en cas de fermeture inattendue de l'app
- NFR7: Les resets automatiques (16h30, lundi) s'exécutent avec 100% de fiabilité
- NFR8: L'app reste stable lors d'une utilisation continue sur une journée complète

### Accessibilité (TBI)

- NFR9: Les prénoms sont lisibles à 6 mètres de distance sur un TBI standard
- NFR10: Contraste élevé entre texte et fond (ratio minimum 4.5:1)
- NFR11: Les émojis sont suffisamment grands pour être distingués à distance
- NFR12: Pas de clignotements ou animations qui pourraient distraire les élèves
- NFR13: Palette de couleurs compatible avec le daltonisme (ne pas utiliser uniquement rouge/vert pour différencier)
