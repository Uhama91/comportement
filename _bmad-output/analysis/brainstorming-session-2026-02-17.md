---
stepsCompleted: [1, 2, 3, 4]
inputDocuments: []
session_topic: 'Refonte Module 3 - Architecture LLM-aware avec domaines officiels par cycle et compatibilite LSU'
session_goals: 'Architecture LLM contextuelle par niveau, coherence BDD, non-regression code, workflow enseignant micro unique -> structuration auto -> export LSU'
selected_approach: 'ai-recommended'
techniques_used: ['Morphological Analysis', 'First Principles Thinking', 'Failure Analysis']
ideas_generated: 40
risks_identified: 15
session_active: false
workflow_completed: true
---

# Brainstorming Session Results

**Facilitator:** Uhama
**Date:** 2026-02-17

## Session Overview

**Topic:** Refonte Module 3 - Architecture LLM-aware avec domaines officiels par cycle et compatibilite LSU

**Goals:**
1. Architecture LLM contextuelle : prompt/grammaire Qwen adaptes dynamiquement au niveau de classe (PS-CM2) et aux domaines correspondants
2. Coherence base de donnees : le LLM comprend et respecte le schema SQLite pour injection correcte des donnees
3. Non-regression : cartographier le code actuel en profondeur pour eviter la casse a l'implementation
4. Workflow enseignant fluide : micro unique -> dictee libre -> structuration auto -> revue -> export LSU

### Context Guidance

_Recherche LSU completee : format XML, XSD non public (Pleiade), domaines officiels par cycle (5 domaines C1, 7 domaines C2, 8 domaines C3), echelle 4 niveaux (non atteints/partiellement/atteints/depasses), identifiants ONDE (UAI/INC/INE), limites caracteres (1500 general, 300 disciplinaire)._

### Session Setup

_Session focalisee sur l'architecture technique du Module 3 refonde. Le brainstorming doit explorer comment le LLM (Qwen 2.5 Coder 1.5B) s'adapte au contexte pedagogique (niveau + domaines), comment la BDD evolue sans casser l'existant, et comment le workflow enseignant reste simple malgre la complexite sous-jacente._

---

## Technique Selection

**Approach:** AI-Recommended Techniques
**Analysis Context:** Architecture logicielle complexe avec contraintes multiples (BDD existante, compatibilite LSU, modele IA 1.5B limite, non-regression)

**Recommended Techniques:**
- **Morphological Analysis (structured):** Decomposition systematique des parametres (7 axes) et exploration des combinaisons viables
- **First Principles Thinking (creative):** Repartir des verites fondamentales, challenger les hypotheses du code actuel
- **Failure Analysis (deep):** Anticiper les modes de defaillance et integrer les mitigations dans l'architecture

---

## Technique Execution Results

### Phase 1 : Morphological Analysis — 7 axes, 37 idees

**Axe 1 — Niveau scolaire**
- **Idee #1** : Niveau rattache a l'eleve (pas a la classe) pour supporter les classes multi-niveaux
- Config initiale : le prof coche les niveaux presents (ex: CE1+CM2), puis assigne chaque eleve

**Axe 2 — Domaines d'apprentissage**
- **Idee #2** : Referentiel domaines cote TypeScript (fichier `domaines-officiels.ts`) + table de travail SQLite
- Domaines officiels par cycle : 5 en C1, 7 en C2, 8 en C3
- Table enrichie : colonnes `cycle`, `code_lsu`, `is_custom`
- Le changement de niveau propose un "Reinitialiser les domaines pour [niveau]"

**Axe 3 — Echelle d'evaluation**
- **Idee #3** : Migration de 3 niveaux (maitrise/en_cours/debut) vers 4 niveaux LSU (non_atteints/partiellement_atteints/atteints/depasses)
- Conversion automatique des donnees existantes

**Axe 4 — Pipeline LLM (coeur de la refonte)**
- **Idee #4** : Grammaire GBNF generee dynamiquement depuis la BDD (domaines actifs de l'eleve)
- **Idee #5** : System prompt contextuel construit cote Rust (niveau + domaines + niveaux d'evaluation)
- **Idee #6** : LLM comme classificateur + fusionneur de contenu (PAS generateur)
  - Tache 1 : Identifier le domaine d'apprentissage vise par la dictee
  - Tache 2 : Fusionner le nouveau texte avec l'existant en eliminant les redondances
  - Ne touche JAMAIS a la structure BDD, uniquement au contenu
- **Idee #7** : Le LLM recoit le contexte existant (observations actuelles) pour fusionner intelligemment
- **Idee #8** : Securite par design — le LLM ne produit que du texte, jamais de SQL
- **Idee #9** : Grammaire enrichie avec `observation_mise_a_jour` + `niveau_suggere` optionnel

**Axe 5 — Workflow micro unique**
- **Idee #15** : Micro flottant global dans la toolbar (plus un par domaine)
- **Idee #16** : Panneau de revue post-dictee avec diff Avant/Apres par domaine
- **Idee #17** : (REJETEE) Dictee multi-eleves — trop de risque de confusion sur les prenoms
- **Idee #18** : Double voie d'entree — voix ET clavier coexistent
- **Idee #19** : Panneau de revue avec edition inline (accepter/modifier/rejeter par domaine)

**Axe 6 — Evolution BDD**
- **Idee #20** : Table `annees_scolaires` comme conteneur principal
- **Idee #21** : Migration echelle LSU (ajout colonne `niveau_lsu`)
- **Idee #22** : Colonne `previous_observations` pour undo/redo
- **Idee #23** : Enrichissement `domaines_apprentissage` (cycle, code_lsu, is_custom)
- **Idee #24** : Table `config_lsu` + colonne `ine` sur students

**Axe 7 — Export LSU**
- **Idee #25** : Export LSU comme fonctionnalite optionnelle
- **Idee #26** : Generateur XML cote Rust
- **Idee #27** : Checklist pre-export visuelle
- **Idee #28** : Appreciation generale par eleve/periode (nouveau champ)
- **Idee #29** : LLM comme generateur de brouillon d'appreciation generale

**Idees complementaires (multi-niveaux + cycle annuel)**
- **Idee #30** : Niveau rattache a l'eleve, pas a la classe
- **Idee #31** : Table de liaison niveau -> domaines actifs (filtrage par cycle)
- **Idee #32** : Le LLM recoit les domaines de l'eleve, pas de la classe
- **Idee #33** : Configuration initiale multi-niveaux dans Settings
- **Idee #34** : Attribution en masse du niveau aux eleves (groupes)
- **Idee #35** : Cycle de vie annee scolaire (creation, cloture, archive)
- **Idee #36** : Archive accessible en lecture seule
- **Idee #37** : Assistant de rentree pour nouvelle annee

### Phase 2 : First Principles Thinking — Regles fondamentales

**Idees issues du challenge des hypotheses :**
- **Idee #38** : Le LLM pourrait suggerer l'evolution du niveau — MAIS risque de biais d'ancrage
- **Idee #39** : (RETENUE) Separation stricte : LLM = texte, Prof = note. Le niveau d'evaluation est 100% manuel
- **Idee #40** : Historique des dictees conserve pour le prof (pas pour le LLM)

**Regles fondamentales validees :**

| Regle | Justification |
|-------|---------------|
| Le LLM ne touche QUE le texte des observations | Securite, pas d'impact sur evaluations officielles |
| Le LLM ne voit QUE domaines actifs + texte existant + nouvelle dictee | Prompt court, ctx-size gerable |
| Le niveau d'evaluation est 100% manuel | Document officiel LSU, responsabilite du prof |
| L'undo restaure le texte d'avant la derniere modification LLM | Filet de securite simple |
| Le prof peut toujours ecrire manuellement | Le LLM est optionnel, pas obligatoire |
| L'export LSU est optionnel et guide | Pas de friction quotidienne |
| Les domaines sont dynamiques par eleve/cycle | Classes multi-niveaux |
| L'annee scolaire est le conteneur principal | Cycle de vie propre, archives accessibles |

### Phase 3 : Failure Analysis — 15 risques identifies

**Risques critiques :**
- **F6** : Migration BDD echoue sur donnees V1 → Backup auto + migrations additives uniquement
- **F11** : XML LSU rejete par la plateforme → Fallback CSV/PDF + reverse-engineer XSD

**Risques hauts :**
- **F2** : LLM perd du contenu lors de la fusion → Undo + diff visuel obligatoire
- **F5** : ctx-size insuffisant en fin de periode → Monter a 2048 + resume des observations
- **F14** : Pipeline sequentiel trop lent → Modele plus petit + pre-chauffage LLM

**Risques moyens :**
- **F1** : LLM classe dans le mauvais domaine → Dropdown de reassignation dans le panneau de revue
- **F12** : Identifiants ONDE manquants → Import CSV + checklist pre-export
- **F13** : Dates de periodes discordantes app/LSU → Avertissement dans settings

**Risques faibles :**
- **F3** : Dictee hors-sujet → Message "Aucun domaine reconnu"
- **F4** : LLM hallucine du texte → Prompt "ne reformule QUE ce qui est dicte"
- **F7** : Incoherence domaines apres changement de niveau → Anciennes appreciations preservees
- **F8** : Cloture d'annee par erreur → Double confirmation + reouverture possible
- **F9** : Whisper transcrit mal un domaine → Le LLM comprend le contexte, pas les mots-cles
- **F10** : Bruit de classe dans l'audio → Push-to-talk + revue transcription
- **F15** : Prof ne lit pas le panneau de revue → UI simple + undo disponible

---

## Idea Organization and Prioritization

### Theme A : Gestion du contexte scolaire
_Le conteneur qui conditionne tout le reste_

- Annee scolaire comme unite principale (creation, cloture, archive en lecture seule)
- Multi-niveaux par classe (CE1+CM2, etc.) avec niveau par eleve
- Domaines dynamiques charges selon le cycle de l'eleve
- Assistant de rentree pour configurer rapidement une nouvelle annee
- Attribution en masse du niveau aux eleves

### Theme B : Pipeline LLM cadre
_Le LLM comme classificateur + fusionneur, rien de plus_

- Role strict : classifier le domaine + fusionner le texte existant
- Prompt et grammaire GBNF generes dynamiquement depuis la BDD
- Le LLM ne touche JAMAIS le niveau d'evaluation (100% decision du prof)
- Modele plus leger a tester (Qwen 0.5B vs 1.5B) avec benchmark integre
- Le LLM recoit les observations existantes pour fusion intelligente
- Securite par design : output = texte uniquement, jamais de SQL ni d'IDs

### Theme C : Workflow enseignant
_Micro unique, revue visuelle, double voie d'entree_

- UN micro global dans la toolbar (plus un par domaine)
- Panneau de revue diff Avant/Apres avec edition inline par domaine
- Double voie : voix OU clavier, meme resultat en BDD
- Undo/redo par snapshot (colonne `previous_observations`)
- Appreciation generale generee par le LLM (brouillon editable)

### Theme D : Compatibilite LSU
_Export XML optionnel mais natif_

- Echelle 4 niveaux LSU (migration 3 -> 4 niveaux)
- Identifiants ONDE optionnels (UAI/INC/INE) — requis uniquement pour l'export
- Checklist pre-export visuelle (verification completude)
- Generateur XML cote Rust
- Fallback CSV/PDF si XSD officiel indisponible

### Theme E : Evolution BDD
_Migrations additives, jamais destructives_

- ~5-6 migrations : annee scolaire, niveau par eleve, echelle LSU, undo, enrichissement domaines, config LSU
- Backup automatique de la BDD avant chaque migration
- Domaines enrichis (cycle, code_lsu, is_custom)
- Contrainte UNIQUE retiree sur nom domaine (meme nom possible dans 2 cycles)

### Concepts transversaux

- Le panneau de revue = filet de securite universel (couvre risques F1-F4)
- Le undo = protection contre la perte de contenu (F2)
- Le benchmark modeles = optimisation performance (F14)
- Le fallback CSV/PDF = assurance export (F11)

---

## Prioritization Results

| Priorite | Element | Impact | Effort |
|----------|---------|--------|--------|
| P0 | Migrations BDD (annee scolaire, niveau eleve, echelle LSU) | Critique | Moyen |
| P0 | Referentiel domaines par cycle (fichier TS + seed BDD) | Critique | Faible |
| P1 | Pipeline LLM dynamique (prompt + grammaire depuis BDD) | Tres haut | Haut |
| P1 | Micro unique + panneau de revue diff | Tres haut | Haut |
| P1 | Undo/redo (colonne previous_observations) | Haut | Faible |
| P2 | Gestion annee scolaire (creation, cloture, archive) | Haut | Moyen |
| P2 | Configuration multi-niveaux + attribution eleves | Haut | Moyen |
| P2 | Benchmark modeles (0.5B vs 1.5B) | Moyen | Faible |
| P3 | Export LSU XML | Tres haut mais bloque par XSD | Haut |
| P3 | Appreciation generale auto-generee par LLM | Haut | Moyen |
| P3 | Checklist pre-export + identifiants ONDE | Moyen | Moyen |

---

## Action Planning

### Sprint A — Fondations (P0)

**Objectif :** Poser les bases BDD et referentiel pour supporter tout le reste

1. Migrations BDD :
   - Table `annees_scolaires` (label, dates, cloturee, active)
   - Colonne `annee_id` sur `config_periodes` et `students`
   - Colonne `niveau` sur `students` (PS/MS/GS/CP/CE1/CE2/CM1/CM2)
   - Table `niveaux_classe` (annee_id, niveau, cycle)
   - Colonne `niveau_lsu` sur `appreciations` (non_atteints/partiellement_atteints/atteints/depasses)
   - Migration donnees existantes (debut->non_atteints, en_cours->partiellement, maitrise->atteints)
   - Colonne `previous_observations` sur `appreciations`
   - Colonnes `cycle`, `code_lsu`, `is_custom` sur `domaines_apprentissage`
   - Table `config_lsu` (uai, inc, annee_scolaire) + colonne `ine` sur students

2. Referentiel domaines officiels :
   - Fichier `domaines-officiels.ts` avec hierarchie complete (cycle -> domaines -> sous-domaines)
   - Fonction de seed BDD par niveau selectionne

3. Settings adaptes :
   - Configuration multi-niveaux (cocher CE1+CM2)
   - Attribution niveau par eleve (groupes ou individuel)
   - Gestion annee scolaire (creation, cloture)

### Sprint B — Pipeline LLM refonde (P1)

**Objectif :** Micro unique -> Whisper -> LLM classificateur/fusionneur -> revue -> BDD

1. Benchmark modeles :
   - Tester Qwen 2.5 0.5B Instruct vs 1.5B sur la tache exacte
   - Phrase test de reference avec classification + fusion
   - Mesurer : precision classification, qualite fusion, temps de reponse, RAM

2. Pipeline LLM dynamique :
   - Generateur GBNF dynamique en Rust (domaines actifs de l'eleve)
   - Constructeur de system prompt dynamique (domaines + niveaux + instructions fusion)
   - Commande Rust `structure_and_merge_text` (remplace `structure_text`)
   - ctx-size monte a 2048

3. Workflow vocal refonde :
   - Retrait des `InlineDictation` par domaine dans `AppreciationTable.tsx`
   - Micro unique global dans la toolbar du module
   - Panneau de revue diff Avant/Apres (modal ou slide panel)
   - Edition inline par domaine + dropdown reassignation domaine
   - Boutons : Valider tout / Valider individuel / Rejeter / Modifier
   - Undo/redo sur chaque domaine (swap `observations` <-> `previous_observations`)

### Sprint C — LSU + Polish (P3)

**Objectif :** Export LSU natif + appreciation generale + finitions

1. Export LSU :
   - Inscription Pleiade OU reverse-engineer XSD depuis Opencomp/Gepi (code source GitHub)
   - Generateur XML cote Rust (`export_lsu_xml` command)
   - Checklist pre-export dans le frontend
   - Gestion identifiants ONDE (import CSV ou saisie manuelle)
   - Fallback : export CSV/PDF si XML non viable

2. Appreciation generale :
   - Nouveau champ/table pour appreciation generale par eleve/periode
   - Bouton "Generer brouillon" qui envoie toutes les observations au LLM
   - Le LLM synthetise un paragraphe (max 1500 car.) que le prof edite

3. Finitions :
   - Navigation annees precedentes (archives en lecture seule)
   - Assistant de rentree (wizard nouvelle annee)
   - Tests Rust et frontend sur les nouvelles fonctionnalites

---

## Session Summary and Insights

**Resultats de la session :**
- **40 idees** generees a travers 3 techniques (Morphological Analysis, First Principles, Failure Analysis)
- **15 risques** identifies avec strategies de mitigation
- **5 themes** organises (Contexte scolaire, Pipeline LLM, Workflow, LSU, BDD)
- **3 sprints** d'implementation definis avec priorites claires
- **8 regles fondamentales** d'architecture validees

**Decisions cles prises :**
1. Le LLM est un classificateur + fusionneur, PAS un generateur ni un evaluateur
2. Le niveau d'evaluation reste 100% decision du professeur
3. Les domaines et la grammaire GBNF sont dynamiques, generes depuis la BDD
4. Le micro est unique et global, pas un par domaine
5. Le panneau de revue diff est le filet de securite universel
6. Les classes multi-niveaux sont supportees nativement (niveau par eleve)
7. L'annee scolaire est le conteneur principal avec cycle de vie complet
8. L'export LSU est optionnel avec fallback CSV/PDF

**Prochaine etape recommandee :** Transformer ce brainstorming en PRD V2.1 via le workflow BMAD, en commencant par les migrations BDD (Sprint A) qui sont la fondation de tout le reste.
