# Projet : Application Suivi Comportement — Briefing Complet

Compilé depuis la mémoire de Moltbot (VPS) le 2026-02-10.
Contient tous les documents existants pour relancer le développement.

---

# TABLE DES MATIÈRES

1. [Briefing V2 — Architecture & Specs](#1-briefing-v2)
2. [Problème actuel — Champ motif manquant](#2-problème-actuel)
3. [Note complémentaire — Compartiment](#3-note-compartiment)
4. [Infos classe 2025-2026](#4-infos-classe)
5. [Liste des 18 élèves](#5-liste-élèves)
6. [Règles noms élèves (phonétique)](#6-règles-noms)
7. [Structure observations pédagogiques](#7-structure-observations)
8. [Exemple observations](#8-exemple-observations)
9. [Section MEMORY.md du bot](#9-memory)

---

# 1. Briefing V2

## Présentation du Projet : Système de Suivi Élève avec IA Locale

### 1. Contexte et Objectif

#### Description du Projet Existant
L'application Tauri actuelle permet aux enseignants de gérer les données scolaires des élèves :
- Enregistrement des sanctions et avertissements
- Documentation des motifs de sanctions
- Stockage centralisé des informations disciplinaires

#### Évolution Proposée : 3 Modules Interconnectés

##### Module 1 : Suivi Comportement Classe (Global)
- Base de données globale pour toute la classe
- Suivi hebdomadaire par élève (sanctions, avertissements, motifs)
- Synthèse LLM : Progression sur plusieurs semaines (tendance bonne/mauvaise)
- Export : Tableau 2 colonnes (Comportement | Travail) à imprimer, découper et faire signer par les parents

##### Module 2 : Suivi Comportement Individuel (Détaillé)
- Par élève, par période
- Comportement spécifique détaillé (incidents, contexte, intervenant)

##### Module 3 : Domaines d'Apprentissage (Évaluations)
- Dictée vocale en français pour saisir rapidement les appréciations
- Structuration automatique par domaine (Français, Maths, etc.)
- Génération JSON propre et structuré

##### Configuration Flexible des Périodes
- Paramétrage manuel des périodes scolaires (trimestres ou semestres)
- Adaptation selon l'école/circonscription
- Dates de début/fin configurables par l'utilisateur

#### Valeur Ajoutée
- Gain de temps : Les professeurs dictent plutôt que de taper
- Confidentialité garantie : Les données restent sur l'ordinateur local (conforme RGPD)
- Structuration automatique : Le JSON est généré proprement, sans erreurs de saisie manuelle
- Pas de dépendance internet : Fonctionne hors ligne

---

### 2. Architecture Technique Détaillée

#### 2.1 Vue d'Ensemble de la Stack

```
┌─────────────────────────────────────────────────┐
│      INTERFACE UTILISATEUR (Frontend)           │
│  React/Vue/Svelte + TypeScript + Tauri API     │
│  Formulaires | Micro (WebRTC) | Tableaux       │
└──────────────────┬──────────────────────────────┘
                   │ (Communication IPC)
┌──────────────────▼──────────────────────────────┐
│    BACKEND TAURI (Rust)                         │
│  • Gestion fichiers système                     │
│  • Orchestration des sidecars                   │
│  • Base de données SQLite locale               │
└──────────────────┬──────────────────────────────┘
                   │
        ┌──────────┴──────────┐
        │                     │
┌───────▼────────┐  ┌────────▼──────────┐
│  Sidecar 1     │  │  Sidecar 2        │
│ Whisper.cpp    │  │  llama-server     │
│ (Speech-to-    │  │  (LLM Qwen)       │
│  Text)         │  │  (JSON Process)   │
└────────────────┘  └───────────────────┘
```

#### 2.2 Composants Détaillés

##### Frontend (Interface Utilisateur)
- Technologie : React ou Vue.js avec TypeScript
- Fonctionnalités :
  - Affichage du formulaire d'appréciation (avec liste d'élèves)
  - Bouton "Microphone" pour la dictée
  - Visualisation du texte en cours de transcription
  - Tableau de synthèse (Domaines d'apprentissage × Compétences)
  - Historique des modifications
- Poids : ~8-12 Mo (incluant les dépendances)

##### Backend Tauri (Rust)
- Rôle principal :
  - Lancer les moteurs IA au démarrage (Whisper, llama-server)
  - Recevoir les requêtes du frontend via IPC (Inter-Process Communication)
  - Transmettre l'audio vers Whisper
  - Envoyer les JSON vers le LLM
  - Gérer les fichiers de modèles (téléchargement initial)
  - Stocker les données en base SQLite
- Poids : ~15-20 Mo (exécutable compilé)

##### Sidecar 1 : Whisper.cpp (Speech-to-Text)
- Modèle utilisé : Whisper `small` en français (qualité optimale)
- Format : GGUF (quantization q4_k_m)
- Poids du modèle : ~480 Mo
- Performance : Transcrit ~5 secondes d'audio en 1-2 secondes sur CPU standard
- Complément : Silero VAD (modèle VAD ultra-léger, ~1 Mo) pour détecter la fin de phrase

##### Sidecar 2 : llama-server (LLM)
- Moteur : llama.cpp en mode serveur
- Modèle utilisé : Qwen 2.5 Coder 1.5B (format GGUF, q4_k_m)
- Raison du choix :
  - Excellent pour les structures JSON et données (entraîné sur du code)
  - Multi-langue, supériorité en français technique/scolaire
  - Fiable et stable (comparé à Gemma qui peut être trop "bavard")
  - ~980 Mo au format compressé
- Port : localhost:8080 (API REST)
- Performance : Génère une réponse structurée en 2-5 secondes

---

### 3. Workflow Utilisateur Détaillé

#### Scénario : "Appréciations quotidiennes"

Étape 1 : Sélection de l'élève
```
Prof : Clique sur "Léo Dupont" dans la liste
App : Affiche le formulaire d'appréciation pour Léo
```

Étape 2 : Dictée vocale
```
Prof : Appuie sur le bouton "Microphone" et parle :
       "En français, Léo progresse bien, sa compréhension s'améliore.
        En mathématiques, il maîtrise le calcul mental.
        Mais il doit arrêter les bavardages pendant les leçons."

App (Frontend) :
  1. Capture l'audio via WebRTC/Web Audio API
  2. Envoie au backend : "Lance Whisper"

App (Backend Tauri) :
  1. Reçoit l'audio
  2. L'envoie au Sidecar Whisper
  3. Reçoit le texte brut en retour

Frontend :
  • Affiche le texte transcrit (2-3 secondes plus tard)
  • Le prof peut corriger s'il y a des erreurs
```

Étape 3 : Structuration avec le LLM
```
App (Frontend) :
  L'utilisateur appuie sur "Générer la synthèse"

App (Backend) :
  1. Récupère le JSON actuel de l'élève
  2. Construit un prompt pour Qwen
  3. Envoie au Sidecar llama-server (port 8080)
  4. Reçoit la réponse JSON structurée
  5. Sauvegarde dans SQLite

Frontend :
  • Affiche le tableau de synthèse
```

Étape 4 : Validation et Sauvegarde
```
Prof : Valide avec le bouton "Enregistrer"
App : Sauvegarde dans la base de données locale
```

---

### 4. Estimation des Ressources

#### Taille Totale (Disque)

| Composant | Taille | Notes |
| :--- | :--- | :--- |
| Application Tauri (.exe/.app) | 18 Mo | Interface + logique de coordination |
| Binaires sidecars (whisper.cpp + llama.cpp) | 50 Mo | Exécutables compilés |
| Modèle Whisper (small-fr-Q4_K_M.gguf) | 480 Mo | Speech-to-Text français |
| Modèle Qwen 2.5 Coder (Q4_K_M.gguf) | 980 Mo | LLM pour structuration JSON |
| TOTAL | ~1.53 Go | Equivalent à un jeu mobile moyen |

#### Mémoire (RAM) en Utilisation

- Frontend : ~150 Mo (React/interface)
- Backend Tauri : ~50 Mo (Rust base)
- Whisper actif : ~500 Mo (lors de la transcription)
- LLM actif : ~1.2 Go (lors du traitement JSON)
- Total concurrent : ~2 Go (acceptable pour un PC d'école moderne)

---

### 5. Choix Technologiques Justifiés

#### Pourquoi Qwen 2.5 Coder plutôt que Gemma 3 ?

| Critère | Qwen 2.5 Coder | Gemma 3 1B |
| :--- | :--- | :--- |
| Spécialité | Code + Données structurées | Usage général |
| Fiabilité JSON | Excellente | Bonne |
| Français | Excellent | Très bon |
| Tendance à "bavarder" | Faible | Moyenne-élevée |
| Performance CPU | Très rapide | Très rapide |
| Taille (Q4) | 980 Mo | 580 Mo |

#### Pourquoi Whisper.cpp ?
- Standard pour Speech-to-Text hors ligne
- Excellent en français (même avec accents et ponctuation)
- Format GGUF facilement intégrable

#### Pourquoi Tauri ?
- Application légère (WebView native)
- Gestion native des sidecars (excellente pour les moteurs IA)
- Support multiplateforme (Windows, macOS, Linux)
- Idéal pour les établissements scolaires français

---

### 6. Données et Privacy

Données 100% locales, jamais transmises à internet, conforme RGPD.

#### Structure de la Base de Données

##### Configuration des Périodes Scolaires
```sql
CREATE TABLE config_periodes (
  id INTEGER PRIMARY KEY,
  annee_scolaire TEXT NOT NULL,
  type_periode TEXT NOT NULL,   -- "trimestre" ou "semestre"
  numero INTEGER NOT NULL,
  date_debut DATE NOT NULL,
  date_fin DATE NOT NULL,
  nom_affichage TEXT
);
```

##### Module 1 : Suivi Comportement Classe (Global)
```sql
CREATE TABLE comportement_classe (
  id INTEGER PRIMARY KEY,
  eleve_id INTEGER NOT NULL,
  date_saisie DATE NOT NULL,
  semaine_numero INTEGER,
  periode_id INTEGER,
  progression_globale TEXT,
  tendance TEXT,
  nb_sanctions INTEGER DEFAULT 0,
  nb_avertissements INTEGER DEFAULT 0,
  motifs_principaux TEXT,
  created_at TIMESTAMP,
  FOREIGN KEY(eleve_id) REFERENCES eleves(id),
  FOREIGN KEY(periode_id) REFERENCES config_periodes(id)
);

CREATE TABLE synthese_hebdomadaire (
  id INTEGER PRIMARY KEY,
  classe TEXT NOT NULL,
  semaine_numero INTEGER,
  periode_id INTEGER,
  date_generation DATE,
  contenu_comportement TEXT,
  contenu_travail TEXT,
  export_pdf_path TEXT,
  FOREIGN KEY(periode_id) REFERENCES config_periodes(id)
);
```

##### Module 2 : Suivi Comportement Individuel (Détaillé)
```sql
CREATE TABLE comportement_detail (
  id INTEGER PRIMARY KEY,
  eleve_id INTEGER NOT NULL,
  date_incident DATE NOT NULL,
  heure_incident TIME,
  periode_id INTEGER,
  type_evenement TEXT NOT NULL,
  motif TEXT NOT NULL,
  description TEXT,
  intervenant TEXT,
  created_at TIMESTAMP,
  FOREIGN KEY(eleve_id) REFERENCES eleves(id),
  FOREIGN KEY(periode_id) REFERENCES config_periodes(id)
);
```

##### Module 3 : Domaines d'Apprentissage (Évaluations)
```sql
CREATE TABLE eleves (
  id INTEGER PRIMARY KEY,
  nom TEXT NOT NULL,
  prenom TEXT NOT NULL,
  classe TEXT
);

CREATE TABLE appreciations (
  id INTEGER PRIMARY KEY,
  eleve_id INTEGER NOT NULL,
  periode_id INTEGER NOT NULL,
  date_evaluation DATE,
  domaine_apprentissage TEXT,
  niveau REAL,
  details TEXT,
  comportement TEXT,
  texte_dictation TEXT,
  created_at TIMESTAMP,
  FOREIGN KEY(eleve_id) REFERENCES eleves(id),
  FOREIGN KEY(periode_id) REFERENCES config_periodes(id)
);
```

---

### 7. Architecture LLM-as-DB-Interface (Phase 3)

Le LLM devient l'interface naturelle vers la base de données, avec contrôle d'accès strict.

```
Professeur parle librement
         ↓
[Whisper] → Texte brut
         ↓
[LLM Qwen] Analyse + Génère requêtes INSERT
         ↓
[Validateur Rust] Vérifie sécurité
         ↓
[SQLite] Exécution INSERT uniquement
         ↓
Confirmation à l'utilisateur
```

Système de Prompt Contraint :
```
Tu es un assistant pédagogique qui transforme les observations en INSERT SQL.
RÈGLES STRICTES :
- Tu ne peux générer QUE des requêtes INSERT
- Tu ne peux PAS faire DELETE, UPDATE, DROP, ALTER, SELECT
- Tu identifies automatiquement la table cible :
  • Domaine d'apprentissage → table 'appreciations'
  • Comportement général → table 'comportement_classe'
  • Incident/sanction → table 'comportement_detail'
```

Couche de Validation (Rust) :
```rust
fn validate_llm_query(query: &LlmQuery) -> Result<(), ValidationError> {
    // 1. Vérifier action = INSERT uniquement
    if query.action != "INSERT" {
        return Err("Seuls les INSERT sont autorisés");
    }
    // 2. Vérifier table autorisée
    let allowed_tables = ["appreciations", "comportement_classe", "comportement_detail"];
    if !allowed_tables.contains(&query.table) {
        return Err("Table non autorisée");
    }
    // 3. Vérifier eleve_id correspond à l'élève sélectionné
    if query.data.eleve_id != current_eleve_id {
        return Err("ID élève non concordant");
    }
    // 4. Vérifier periode_id correspond à la période active
    if query.data.periode_id != current_periode_id {
        return Err("Période non active");
    }
    Ok(())
}
```

---

### 8. Timeline et Livrables

- Semaine 1 : Setup complet Tauri + sidecars, Communication Whisper fonctionnelle
- Semaine 2 : Intégration Qwen 2.5 Coder, Génération JSON structurée
- Semaine 3 : Interface utilisateur améliorée, Base de données SQLite
- Semaine 4 : Tests et optimisations, Documentation, Release v1.0 locale

### 9. Résumé Exécutif

Ce que vous gagnez :
1. Productivité : Saisie vocale 2 min → 30 sec par élève, synthèse auto, export bulletins
2. Confidentialité : 100% hors ligne, conforme RGPD
3. Qualité : JSON structurés, suivi de progression, zéro erreur de saisie
4. Flexibilité : Périodes configurables (trimestre/semestre)
5. Scalabilité : 100 ou 1000 élèves sans ralentissement

Ressources Nécessaires :
- Espace disque : 1.5 Go
- RAM : 2-3 Go concurrent
- Internet : Uniquement pour le téléchargement initial des modèles
- CPU : Standard (pas de GPU obligatoire)

---

# 2. Problème actuel — Champ motif manquant

Date : 2026-02-06
Status : À corriger — Fonctionnalité manquante

## Problème identifié

Application : Suivi du comportement des élèves
Fichier concerné : `Jisani.json` (export JSON des comportements)
Problème : Les motifs de sanction ne sont pas enregistrés dans le fichier JSON d'export.

## Ce qui manque

- Pas de champ `motif` associé aux sanctions dans le JSON
- Impossible d'expliquer la raison d'une sanction
- L'export ne contient pas l'information pour justifier les décisions disciplinaires

## Logique métier attendue
```
Sanction
├── type (ex: retenue, exclusion, etc.)
├── date
├── élève (référence)
├── motif ← CHAMP À AJOUTER
│   └── ex: "Trois avertissements d'affilée"
└── détails (optionnel)
```

## Actions de développement

1. Analyser le JSON actuel — Comprendre la structure existante de `Jisani.json`
2. Ajouter le champ `motif` dans l'objet `sanction`
3. Modifier le formulaire de saisie — Ajouter un champ "Motif de la sanction" obligatoire
4. Modifier l'affichage — Afficher le motif dans le tableau/vue des sanctions
5. Modifier la logique d'export — S'assurer que le champ `motif` est inclus
6. Gérer la rétrocompatibilité pour les anciennes sanctions

## Structure attendue après correction
```json
{
  "sanctions": [
    {
      "id": "sanction_001",
      "eleve_id": "eleve_123",
      "type": "retenue",
      "date": "2026-02-06",
      "motif": "Trois avertissements d'affilée",
      "details": "Avertissements pour bavardage répété"
    }
  ]
}
```

## Priorité et impact

- Priorité : HAUTE — Impact pédagogique immédiat
- Urgence : Inspections possibles, besoin de traçabilité
- Complexité : MOYENNE — Ajout d'un champ + interface + export
- Temps estimé : 2-4 heures de développement

## Pourquoi c'est important
- Transparence pédagogique : Pouvoir expliquer chaque sanction à l'élève
- Relation parents : Justifier les décisions lors des entretiens
- Inspecteur : Prouver la cohérence du suivi disciplinaire
- Progression élève : Comprendre les schémas de comportement répétés

---

## Amélioration demandée — Gestion des absences

Besoin : Pouvoir indiquer qu'un élève est absent pour qu'il ne soit pas comptabilisé dans le suivi des comportements positifs.

Logique métier :
- Si un élève est absent → pas de comportement positif attendu
- L'absence doit être visible dans le workflow de suivi quotidien
- Ne pas pénaliser l'élève absent dans les statistiques

Interface utilisateur :
- Bouton "Absent" à côté du nom de l'élève dans la liste du jour
- Visuel distinct (grisé, icône, ou tag "Absent")
- Possibilité d'annuler l'absence si erreur de saisie

Impact sur les statistiques :
- Les jours d'absence ne comptent pas dans le total des jours
- Taux de comportement positif calculé sur jours présents uniquement
- Rapport mensuel : mention des absences

---

# 3. Note complémentaire — Compartiment

Date : 2026-02-06
Status : À corriger

Problème identifié : L'application compartiment (outil de gestion de classe) présente un dysfonctionnement concernant l'affichage des sanctions et avertissements.

Ce qui manque :
- Explications des sanctions — Les motifs ne sont pas visibles/accessibles
- Avertissements sur les comportements — Pas de traçabilité
- Historique complet — Manque de cohérence dans le suivi disciplinaire

---

# 4. Infos classe 2025-2026

| Information | Détail |
|-------------|--------|
| Nom école | École Élémentaire Victor Hugo |
| Adresse | Sevran |
| Académie | Créteil |
| Département | 93 (Seine-Saint-Denis) |
| Niveau | CM2 |
| Année scolaire | 2025-2026 |
| Effectif | 18 élèves |
| Professeur principal | Maillot Ullie |
| Email professeur | ullie.maillot@ac-creteil.fr |

---

# 5. Liste des 18 élèves

| N° | Prénom |
|----|--------|
| 1 | Athénaïs |
| 2 | Fateh |
| 3 | Naïm |
| 4 | Safa |
| 5 | Anas |
| 6 | Aylin |
| 7 | Wandé |
| 8 | Chiril |
| 9 | Sahra |
| 10 | Andrija |
| 11 | Adam |
| 12 | Aarrukzia |
| 13 | Ahmed |
| 14 | Jasleen |
| 15 | Manel |
| 16 | Onojie |
| 17 | Khadija |
| 18 | Nejmi |

Filles : Athénaïs, Safa, Aylin, Sahra, Aarrukzia, Jasleen, Manel, Khadija
Garçons : Fateh, Naïm, Anas, Wandé, Chiril, Andrija, Adam, Ahmed, Onojie, Nejmi

---

# 6. Règles noms élèves (phonétique)

Quand l'utilisateur mentionne un élève par son prénom (souvent par dictée vocale) :
1. Vérifier la ressemblance phonétique avec les prénoms existants
2. Confirmer l'identité avant d'enregistrer
3. Éviter les confusions entre prénoms similaires

| Prénom | Phonétique | Variantes à éviter |
|--------|-----------|-------------------|
| Athénaïs | A-te-na-is | Athéna, Athanaïs |
| Fateh | Fa-te | Fatha, Fathi, Fathé |
| Naïm | Na-im | Naime, Naim, Naym |
| Safa | Sa-fa | Safaa, Safah |
| Anas | A-nas | Annas, Anass |
| Aylin | Ai-lin | Aïline, Ailine, Eileen |
| Wandé | Wan-dé | Wandy, Wanda, Wendé |
| Chiril | Chi-ril | Kiril, Cyril, Chiryl |
| Sahra | Sa-hra | Sarah, Sara, Sahraa |
| Andrija | An-dri-ya | Andrea, Andria, Andrijia |
| Adam | A-dam | Adem, Addam |
| Aarrukzia | A-rouk-sia | Arrouxia, Arouxia, Arukzia |
| Ahmed | Ah-med | Ahmad, Ahmet |
| Jasleen | Jas-lin | Jocelyne, Jasline |
| Manel | Ma-nel | Mannell, Manelle |
| Onojie | O-no-ji | Onoji, Onojy, Onodge |
| Khadija | Kha-di-ja | Kadidja, Kadija |
| Nejmi | Nej-mi | Nejmy, Neymi |

L'orthographe des prénoms est IMMUABLE.

---

# 7. Structure observations pédagogiques

Chemin racine : `work/classe/cm1/observations/`

```
work/classe/cm1/observations/
├── README.md
├── francais/
│   ├── imparfait.md
│   ├── accords-nom-adj.md
│   └── ...
├── maths/
│   ├── nombres-999-1999.md
│   ├── division-posee.md
│   ├── fractions-simples.md
│   └── ...
└── [autres-domaines]/
```

Format de fichier standard :
```markdown
---
apprentissage: "Nom de l'apprentissage"
domaine: "Français / Maths / ..."
date_evaluation: YYYY-MM-DD
niveau_attendu: "CM1 - ..."
eleves:
  - prenom: "Prénom"
    niveau: "maitrise | en_cours_acquisition | debut"
    observations: "..."
    contexte: "Evaluation diagnostic / Bilan / ..."
---

# Observations - [Apprentissage]

## Avant l'évaluation
-

## Pendant l'évaluation
-

## Après l'évaluation / Bilan
-
```

Niveaux d'acquisition :
- `maitrise` — Maîtrise / Autonomie
- `en_cours_acquisition` — En cours d'acquisition
- `debut` — Début d'apprentissage / Fragile

---

# 8. Exemple observations

## Format recommandé

### Observation simple
Toi : "Athénaïs a eu du mal avec la division aujourd'hui"

Ce qui est enregistré :
- Élève : Athénaïs
- Sujet : Mathématiques — Division
- Observation : Difficultés avec la division
- Contexte : Séance du matin
- Action prévue : Revoir les tables de multiplication, exercices supplémentaires

### Point positif
- Élève : [Prénom]
- Sujet : Français — Participation orale
- Observation : Participation active et pertinente

### À surveiller
- Élève : [Prénom]
- Type : Comportement / Attention
- Observation : Distractions fréquentes en début de séance
- Fréquence : Régulier depuis 1 semaine
- Actions : Placer en début de classe, vérifier contexte, contacter parents si persistance

---

# 9. Section MEMORY.md du bot

## Extrait concernant ce projet

### Application Comportement (Suivi Classe)
- Description : Application interne pour le suivi disciplinaire des élèves
- Technologie : JavaScript/TypeScript, export JSON
- Fichier clé : `Jisani.json` (export des comportements/sanctions)
- Status : Opérationnel — problème du champ "motif" des sanctions corrigé (fév 2025)
- Historique : Projet antérieur à la création du bot, développé en autonomie
- Priorité : Haute — impact pédagogique quotidien

### Évolution V2 : IA Locale pour Suivi Complet (fév 2026)
- Concept : 3 modules interconnectés avec IA locale pour automatiser le suivi pédagogique complet
- Stack technique : Tauri v2 + Whisper.cpp (STT) + Qwen 2.5 Coder (LLM local) + SQLite
- Architecture clé : LLM-as-DB-Interface — Le modèle génère directement les INSERT SQL (lecture/insertion seule, contrôlé par validateur Rust)
- Module 1 - Comportement Classe : Suivi hebdo global, synthèse LLM de progression, export tableau (Comportement|Travail) à faire signer
- Module 2 - Comportement Individuel : Détail par élève, par période (sanctions/avertissements contextualisés)
- Module 3 - Domaines d'Apprentissage : Dictée vocale → INSERT auto dans BDD par LLM contrôlé (Français, Maths, etc.)
- Configuration flexible : Périodes scolaires paramétrables (trimestre/semestre) selon école/circonscription
- Valeur ajoutée : Gain de temps massif + suivi de tendances + interface naturelle (parler → BDD) + 100% offline RGPD
- Ressources nécessaires : ~1.5 Go disque, 2 Go RAM, CPU standard
- Status : Prêt pour développement — Architecture validée
