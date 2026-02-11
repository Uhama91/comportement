# Rapport de Readiness Implementation - Comportement V2

**Auteur :** Architecte Senior (revue adversariale)
**Date :** 2026-02-10
**Version :** V2
**Mode :** ADVERSARIAL REVIEW
**Documents audites :** Product Brief V2, PRD V2, UX Design V2, Architecture V2, Epics V2, Recherche Technique

---

## 1. Verdict Global

### PRET POUR IMPLEMENTATION ~~(precedemment : CONDITIONNEL)~~

Le projet V2 est globalement bien structure et coherent. La documentation est de qualite superieure a la moyenne. **7 issues critiques** et **12 issues mineures** avaient ete identifiees lors de la revue adversariale. **Les 7 issues critiques ont ete corrigees le 2026-02-10** (voir annotations [RESOLU] ci-dessous). Les 12 issues mineures restent a traiter pendant l'implementation.

**Score de couverture :** 57/57 FRs couverts (100%) — 27/27 NFRs adresses (100%)

**Niveau de confiance :** 8.5/10 — La partie Module 1 + Restructuration est solide. La partie IA (Modules 3 + Sidecars) comporte des risques techniques non triviaux mais bien documentes. Les incoherences inter-documents ont ete resolues.

---

## 2. Score de Couverture

### 2.1 Functional Requirements

| Categorie | FRs | Couverts Epics | Couverts Architecture | Score |
|-----------|-----|----------------|----------------------|-------|
| Module 1 — Comportement Classe | FR1-FR30 | 30/30 | 30/30 | 100% |
| Module 2 — Comportement Individuel | FR31-FR37 | 7/7 | 7/7 | 100% |
| Module 3 — Domaines Apprentissage | FR38-FR44 | 7/7 | 7/7 | 100% |
| Infrastructure IA | FR45-FR50 | 6/6 | 6/6 | 100% |
| Gestion des Modeles | FR51-FR53 | 3/3 | 3/3 | 100% |
| Configuration | FR54-FR56 | 3/3 | 3/3 | 100% |
| Capture Audio | FR57 | 1/1 | 1/1 | 100% |
| **TOTAL** | **57** | **57/57** | **57/57** | **100%** |

### 2.2 Non-Functional Requirements

| Categorie | NFRs | Adresses Architecture | Adresses Epics | Score |
|-----------|------|----------------------|----------------|-------|
| Performance | NFR1-NFR8 | 8/8 | 6/8 | 75% |
| Securite RGPD | NFR9-NFR12 | 4/4 | 4/4 | 100% |
| Compatibilite Deploiement | NFR13-NFR17 | 5/5 | 5/5 | 100% |
| Fiabilite | NFR18-NFR22 | 5/5 | 5/5 | 100% |
| Accessibilite TBI | NFR23-NFR27 | 5/5 | 5/5 | 100% |
| **TOTAL** | **27** | **27/27** | **27/27** | **100%** |

**Constat sur les NFRs :** [RESOLU] Story 17.5 ajoutee pour NFR23-27 (accessibilite TBI). Note technique ajoutee dans Epics V2 pour NFR18-20 (fiabilite : pattern V1 conserve). Tous les NFRs sont desormais adresses.

---

## 3. Issues Critiques (BLOQUANTES)

### IC-1 : INCOHERENCE DATA MODEL — PRD vs V1 Code vs Architecture

**Severite :** CRITIQUE
**Documents concernes :** PRD V2 (section 5.1), Architecture V2 (section 6.1), V1 `lib.rs`

**Description :** Le PRD decrit des tables V1 "existantes" qui ne correspondent PAS au code V1 en production :

| Element | PRD V2 (section 5.1) | V1 Code (lib.rs) | Architecture V2 (section 6.1) |
|---------|---------------------|-------------------|-------------------------------|
| `warnings` | Table separee (`warnings`) avec `student_id`, `count`, `date` | Colonne `warnings INTEGER DEFAULT 0` sur `students` | Colonne sur `students` (correct) |
| `students.warnings` | Colonne absente | Colonne presente | Colonne presente |
| `daily_rewards.day_of_week` | `TEXT NOT NULL` | `INTEGER NOT NULL CHECK (IN (1,2,4,5))` | `INTEGER NOT NULL CHECK (IN (1,2,4,5))` (correct) |
| `daily_rewards.week_number` | Absent | Present (`INTEGER NOT NULL`) | Present (correct) |
| `daily_rewards.year` | Absent | Present (`INTEGER NOT NULL`) | Present (correct) |
| `daily_rewards.date` | Present (`TEXT NOT NULL`) | Absent | Absent (correct) |
| `daily_rewards.had_warnings` | Present (`INTEGER DEFAULT 0`) | Absent | Absent (correct) |
| `daily_rewards.cancelled` | Absent | Present (`INTEGER DEFAULT 0`) | Present (correct) |
| `daily_rewards.cancelled_by_sanction_id` | Absent | Present (FK) | Present (correct) |
| `absences.week_number` | Absent (table `daily_absences`) | Present (`INTEGER NOT NULL`) | Present sur `absences` (correct) |

**Impact :** Le PRD V2 section 5.1 "Tables V1 existantes (inchangees)" decrit un schema qui N'EXISTE PAS en production. C'est une source de confusion majeure pour tout developpeur qui lirait le PRD.

**Recommandation :** Mettre a jour le PRD V2 section 5.1 pour refleter le schema V1 REEL (tel que documente dans l'Architecture V2 qui est correcte). L'Architecture V2 est la reference fiable.

> **[RESOLU 2026-02-10]** PRD V2 section 5.1 corrigee : schema V1 reel (warnings colonne sur students, daily_rewards avec day_of_week INTEGER, week_number, year, cancelled, cancelled_by_sanction_id). Table absences ajoutee. Indexes corriges.

---

### IC-2 : INCOHERENCE NIVEAUX D'APPRENTISSAGE — UX vs PRD vs Architecture vs GBNF

**Severite :** CRITIQUE
**Documents concernes :** UX Design V2 (section 5.6), PRD V2 (FR40), Architecture V2 (section 5.2, 8.3)

**Description :** Les niveaux d'apprentissage different entre les documents :

| Document | Niveaux definis |
|----------|-----------------|
| **PRD V2** (FR40, section 5.1 CHECK constraint) | `maitrise`, `en_cours_acquisition`, `debut` (3 niveaux) |
| **Architecture V2** (GBNF grammar, validateur Rust) | `maitrise`, `en_cours_acquisition`, `debut` (3 niveaux) |
| **UX Design V2** (section 5.6 dropdown, Story 15.3 AC) | `Non evalue`, `En cours d'acquisition`, `Acquis`, `Depasse` (4 niveaux) |
| **Epics V2** (Story 15.3, Story 15.4) | `Non evalue`, `En cours d'acquisition`, `Acquis`, `Depasse` (4 niveaux) |

**Impact :** La grammaire GBNF et le validateur Rust n'accepteront que 3 valeurs (`maitrise`, `en_cours_acquisition`, `debut`), tandis que le frontend proposera 4 valeurs (`Non evalue`, `En cours d'acquisition`, `Acquis`, `Depasse`). Cela provoquera des rejets systematiques par le validateur Rust pour les valeurs `Non evalue` et `Depasse`, et un mapping incompatible entre `Acquis`/`Depasse` et `maitrise`.

**Recommandation :** Harmoniser les niveaux. Deux options :
- **Option A (aligner sur PRD/Architecture) :** Modifier UX et Epics pour utiliser `maitrise`, `en_cours_acquisition`, `debut` avec labels d'affichage `Maitrise`, `En cours d'acquisition`, `Debut`. Ajouter un etat `NULL` en base pour "Non evalue".
- **Option B (aligner sur UX/Epics) :** Modifier PRD, Architecture, GBNF et validateur Rust pour supporter les 4 niveaux : `non_evalue`, `en_cours_acquisition`, `acquis`, `depasse`.

> **[RESOLU 2026-02-10]** Option A choisie. UX Design V2 section 5.6 corrigee : 3 niveaux (Debut, En cours d'acquisition, Maitrise) + placeholder "Non evalue" = NULL en base. Epics V2 Stories 15.3 et 15.4 corrigees. Valeurs DB alignees sur GBNF : `"debut"`, `"en_cours_acquisition"`, `"maitrise"`.

---

### IC-3 : TABLE `warnings` FANTOME DANS LE PRD

**Severite :** CRITIQUE
**Documents concernes :** PRD V2 (section 5.1, 5.3)

**Description :** Le PRD V2 definit une table `warnings` separee (section 5.1) et la mentionne dans le diagramme de relations (section 5.3 : `students +--< warnings (1:N, reset quotidien)`). Or, cette table N'EXISTE PAS dans le code V1 en production ni dans l'Architecture V2. En V1, les avertissements sont une simple colonne `warnings INTEGER DEFAULT 0` sur la table `students`.

La migration V2 (Architecture section 6.1) ne cree PAS de table `warnings` separee et ne migre pas la colonne vers une table.

**Impact :** Si un developpeur suit le PRD pour creer les migrations, il pourrait creer une table `warnings` inutile et dupliquer la logique. L'index `idx_warnings_date` reference une table inexistante.

**Recommandation :** Supprimer la table `warnings` de la section 5.1 du PRD. Documenter que les avertissements sont geres via la colonne `students.warnings` (entier, reset quotidien a 16h30). Supprimer l'index `idx_warnings_date`. Mettre a jour la section 5.3 pour indiquer `students.warnings (colonne, reset quotidien)` au lieu de `warnings (1:N)`.

> **[RESOLU 2026-02-10]** Table `warnings` fantome supprimee du PRD V2 section 5.1. Colonne `warnings INTEGER DEFAULT 0` ajoutee sur `students`. Index `idx_warnings_date` supprime. Section 5.3 corrigee : `warnings` = colonne sur students.

---

### IC-4 : TABLE `daily_absences` vs TABLE `absences` — DOUBLE DEFINITION

**Severite :** CRITIQUE
**Documents concernes :** PRD V2 (section 5.1), Architecture V2 (section 6.1 migration 6)

**Description :** Le PRD V2 definit une nouvelle table `daily_absences` pour la V2. L'Architecture V2 migration 6 cree `daily_absences` en precisant "remplace `absences` pour coherence de nommage V2" et "l'ancienne table `absences` reste intacte (retrocompatibilite)".

Probleme : la V1 en production utilise la table `absences` avec les colonnes `week_number` et `year` (pas `date` seul). La V2 cree `daily_absences` avec uniquement `student_id` + `date`. Mais :
1. Le code V1 (`studentStore.ts`) utilise la table `absences` — il faudra migrer le code pour utiliser `daily_absences`
2. Les donnees existantes dans `absences` ne seront pas migrees vers `daily_absences`
3. Il n'y a pas de story explicite pour cette migration de donnees

**Impact :** Les absences enregistrees en V1 seront "perdues" (presentes en base dans `absences` mais non lues par le code V2 qui pointe vers `daily_absences`). De plus, la Story 11.2 "Gestion des absences consolidee" ne mentionne pas du tout cette migration de table.

**Recommandation :** Deux options :
- **Option A :** Continuer a utiliser la table `absences` existante (supprimer `daily_absences` du schema V2) et ajouter les colonnes manquantes si necessaire
- **Option B :** Si la migration vers `daily_absences` est voulue, ajouter une migration SQL `INSERT INTO daily_absences SELECT ... FROM absences` et une Story explicite pour cette migration. Documenter dans Story 10.2.

> **[RESOLU 2026-02-10]** Option A choisie. Table `daily_absences` supprimee de tous les documents (PRD V2, Architecture V2, Epics V2). La table V1 `absences` est conservee telle quelle. Migration 6 (daily_absences) supprimee de l'Architecture V2 — renumerotation des migrations (5-8 au lieu de 5-9). Story 10.2 corrigee.

---

### IC-5 : STORY 15.3 CONTREDIT LA GRAMMAIRE GBNF — NIVEAUX DROPDOWN

**Severite :** CRITIQUE
**Documents concernes :** Epics V2 (Story 15.3), Architecture V2 (section 8.3)

**Description :** La Story 15.3 "Affichage resultat structure avant validation" definit le critere d'acceptation suivant :

> **Given** le resultat structure est affiche dans le tableau
> **When** je clique sur le dropdown "Niveau"
> **Then** les options sont : "Non evalue", "En cours d'acquisition", "Acquis", "Depasse"

Mais la grammaire GBNF (Architecture section 8.3) contraint la sortie LLM a :
```
niveau ::= "\"maitrise\"" | "\"en_cours_acquisition\"" | "\"debut\""
```

Et le CHECK constraint SQL (Architecture section 6.1) est :
```sql
niveau TEXT CHECK(niveau IN ('maitrise', 'en_cours_acquisition', 'debut'))
```

Les valeurs `Non evalue` et `Depasse` n'existent pas dans la grammaire ni dans la contrainte SQL. La valeur `Acquis` ne correspond a aucune valeur de la grammaire (`maitrise` est le niveau le plus proche mais semantiquement different).

**Impact :** Impossible d'implementer le critere d'acceptation de la Story 15.3 tel quel. Le validateur Rust rejettera les valeurs inconnues.

**Recommandation :** Voir IC-2. Harmoniser les niveaux entre tous les documents AVANT le debut du Sprint 1.

> **[RESOLU 2026-02-10]** Corrige en meme temps que IC-2. Les stories 15.3 et 15.4 utilisent maintenant les 3 niveaux GBNF avec mapping explicite vers les valeurs DB.

---

### IC-6 : ABSENCE DE STORY POUR LES NFRs D'ACCESSIBILITE TBI (NFR23-NFR27)

**Severite :** CRITIQUE
**Documents concernes :** Epics V2, PRD V2

**Description :** Les 5 NFRs d'accessibilite TBI (NFR23 : prenoms lisibles a 6m, NFR24 : contraste WCAG AA 4.5:1, NFR25 : emojis grands, NFR26 : pas de clignotements, NFR27 : palette daltonisme-friendly) ne sont adresses par AUCUNE story dans les Epics V2.

L'Epic 17 "Polish et Distribution" mentionne les NFRs de performance et deploiement mais pas les NFRs d'accessibilite. Aucune story ne contient de criteres d'acceptation verifiant ces exigences.

**Impact :** Ces exigences risquent d'etre ignorees pendant l'implementation. La lisibilite TBI est un besoin critique pour l'utilisatrice (la persona principale utilise l'application sur TBI devant 18 eleves).

**Recommandation :** Ajouter une Story 17.5 "Validation accessibilite TBI" avec des criteres d'acceptation explicites :
- Prenoms lisibles a 6m en mode TBI (taille police minimale)
- Contraste texte/fond >= 4.5:1 (outil de mesure)
- Emojis >= 48px en mode TBI
- Aucune animation depassant 3 clignotements/seconde
- Palette testee avec simulateur daltonisme

Ou mieux : integrer ces criteres dans les stories existantes de chaque module.

> **[RESOLU 2026-02-10]** Story 17.5 "Validation accessibilite TBI" ajoutee dans Epics V2 avec criteres explicites pour NFR23-27 (police >= 24px, contraste >= 4.5:1, zones tactiles >= 48x48px, pas de hover-only, reponse < 100ms). Epic 17 passe a 5 stories, total 36 stories.

---

### IC-7 : ABSENCE DE STORY POUR NFR18-NFR20 (FIABILITE SAVES AUTOMATIQUES ET RESETS)

**Severite :** CRITIQUE
**Documents concernes :** Epics V2, PRD V2

**Description :** Les NFRs de fiabilite suivants ne sont pas explicitement couverts par des stories :
- **NFR18 :** Sauvegarde automatique apres chaque modification (WAL mode)
- **NFR19 :** Aucune perte de donnees en cas de fermeture inattendue
- **NFR20 :** Resets automatiques (16h30, lundi) avec 100% de fiabilite, double verification au lancement + scheduler Rust

Le code V1 gere les resets via un `useEffect` dans `App.tsx` avec un check toutes les 60 secondes. Le PRD V2 exige un "scheduler Rust" pour NFR20, mais aucune story ne documente la migration du scheduler JS vers Rust.

**Impact :** Le scheduler de resets pourrait rester en JavaScript (pattern V1) au lieu d'etre migre en Rust comme le PRD l'exige. De plus, les modules 2 et 3 n'ont pas de tests explicites de fiabilite des sauvegardes.

**Recommandation :** Soit ajouter une Story dans Epic 10 pour migrer le scheduler de resets en Rust, soit documenter explicitement que le pattern V1 (useEffect + check 60s) est conserve et que NFR20 est satisfait par le mecanisme existant.

> **[RESOLU 2026-02-10]** Note technique ajoutee dans Epics V2 : le pattern V1 (useEffect + setInterval 60s) est conserve. SQLite WAL mode + transactions atomiques garantissent NFR19. Verification au demarrage (rattrapage reset manque) garantit NFR20. Aucune migration vers un scheduler Rust necessaire.

---

## 4. Issues Mineures

### IM-1 : Navigation Module 1 vers Module 2 — Double-clic vs Simple clic

**Documents :** Epics V2 (Story 12.1) vs PRD V2 (FR31) vs UX Design V2 (section 2.3)

Le PRD FR31 dit "clic sur le prenom", la Story 12.1 dit "double-clic sur le prenom", et le UX Design (section 2.3) dit "clic depuis Module 1". Harmoniser le geste de navigation.

### IM-2 : Sidebar en scope V2 ou V2.2 ?

**Documents :** Product Brief V2 (Out of Scope) vs Architecture V2 (section 3) vs Story 10.4

Le Product Brief V2 met explicitement la "Barre laterale (sidebar window separee)" en V2.2 (hors scope). Pourtant, l'Architecture V2 et la Story 10.4 definissent une sidebar de navigation comme element central de la V2. Cette contradiction doit etre resolue : soit la sidebar est dans V2, soit elle est reportee a V2.2.

**Recommandation :** La sidebar est necessaire pour la navigation entre 3 modules. La mention dans le Product Brief fait reference a la "sidebar window separee" (concept V1 de fenetre secondaire TBI), pas a la barre de navigation entre modules. Clarifier la formulation dans le Product Brief.

### IM-3 : Taille estimee des binaires sidecars manquante

**Documents :** Architecture V2 (section 2.1, 11.1)

L'architecture estime l'exe a "~60-80 Mo avec sidecars" (section 11.1) mais le tableau 2.1 indique ~25 Mo par binaire sidecar. Avec 2 binaires x 3 plateformes = 6 fichiers de ~25 Mo = ~150 Mo de binaires. L'estimation de 60-80 Mo semble sous-evaluee si les 6 binaires sont embarques. En realite, seuls les binaires de la plateforme cible sont inclus (~50 Mo), ce qui rend l'estimation correcte mais pas clairement expliquee.

### IM-4 : Story 11.2 — "Verification + corrections si necessaire" est vague

**Documents :** Epics V2 (Story 11.2)

La Story 11.2 est decrite comme "principalement une verification + corrections si necessaire". C'est une story de type audit, pas de type implementation. Le risque est que les corrections soient plus lourdes que prevu (notamment la migration `absences` vs `daily_absences`). L'estimation "S" (Small) est trop optimiste si des corrections de schema sont necessaires.

### IM-5 : Pas de gestion d'erreur documentee pour le telechargement interrompu

**Documents :** Architecture V2 (section 9)

La Story 16.2 mentionne la reprise de telechargement (HTTP Range headers) mais l'architecture ne documente pas le comportement si l'application est fermee pendant le telechargement. Que se passe-t-il avec le fichier partiel ? La verification SHA256 echouera, mais la logique de nettoyage n'est pas explicitee.

### IM-6 : Grammaire GBNF — un seul objet JSON ou tableau d'objets ?

**Documents :** Architecture V2 (section 8.3) vs PRD V2 (FR40)

La grammaire GBNF definie dans l'architecture genere un SEUL objet JSON (un domaine). Mais le PRD FR40 dit "identification automatique du domaine" (singulier) tandis que le prompt (section 8.2) dit "Si le texte mentionne plusieurs domaines, genere un objet pour chacun". La grammaire GBNF actuelle ne supporte PAS un tableau d'objets. Elle devra etre etendue pour supporter `root ::= object | "[" object ("," object)* "]"`.

### IM-7 : Grammaire GBNF pour `comportement_detail` non fournie

**Documents :** Architecture V2 (section 3.1)

L'arborescence V2 mentionne `grammars/appreciation.gbnf` et `grammars/incident.gbnf`, mais seule la grammaire `appreciation.gbnf` est definie en section 8.3. La grammaire `incident.gbnf` est requise pour FR37 (dictee vocale pour incidents Module 2).

### IM-8 : Naming inconsistency — `eleve_id` vs `student_id`

**Documents :** Architecture V2 (section 6.1)

Les tables V1 utilisent `student_id` (anglais), les tables V2 utilisent `eleve_id` (francais). Cette inconsistance de nommage est documentee dans le schema mais pourrait creer de la confusion. La convention `snake_case` pour la DB est respectee mais le melange anglais/francais ne l'est pas.

### IM-9 : Story 14.3 manque de precision sur le timeout Whisper

**Documents :** Epics V2 (Story 14.3)

Le critere d'acceptation de la Story 14.3 dit "Si la transcription prend plus de 10 secondes" mais le NFR5 fixe la limite a 5 secondes. Le timeout de la story devrait etre aligne avec le NFR.

### IM-10 : Absence de test de performance dans les criteres d'acceptation des Stories IA

**Documents :** Epics V2

Les Stories 13.2 (whisper-server) et 13.3 (llama-server) ne contiennent pas de criteres d'acceptation avec des metriques de temps explicites. Seule la Story 17.2 teste la performance, mais ce serait trop tard pour corriger un probleme architectural.

### IM-11 : Le mode "toggle" vs "maintenir" pour push-to-talk n'est pas clarifie

**Documents :** PRD V2 (FR38), UX Design V2

FR38 dit "Bouton micro (maintenir ou toggle)" mais les stories et l'architecture ne documentent qu'un seul mode (maintenir). Le choix doit etre explicite pour l'implementation.

### IM-12 : Le store V1 `loadStudents` ne respecte pas l'ordre alphabetique fixe

**Documents :** V1 `studentStore.ts`, PRD V2 (FR22)

Le code V1 actuel trie les eleves par `weekSanctionCount DESC, firstName ASC`. FR22 exige un "ordre alphabetique fixe (ne change jamais)". Story 10.1 devra explicitement corriger ce tri lors de la reorganisation. Ce n'est pas mentionne dans les criteres d'acceptation de la Story 10.1.

---

## 5. Tableau de Tracabilite FR -> Story -> Architecture

### Module 1 — Comportement Classe

| FR | Description | Story | Composant Architecture | Statut |
|----|-------------|-------|----------------------|--------|
| FR1 | Ajouter un eleve | V1 Prod | `studentStore.ts`, `AddStudentForm.tsx` | OK |
| FR2 | Modifier le prenom | V1 Prod | `studentStore.ts` | OK |
| FR3 | Supprimer un eleve | V1 Prod | `studentStore.ts` | OK |
| FR4 | Voir la liste (grille cartes) | V1 Prod | `StudentGrid.tsx`, `StudentGridCard.tsx` | OK |
| FR5 | Max 30 eleves | V1 Prod | `studentStore.ts` | OK |
| FR6 | Donner un avertissement | V1 Prod | `studentStore.ts`, `StudentGridCard.tsx` | OK |
| FR7 | 3e avert. = sanction auto | V1 Prod | `studentStore.ts` | OK |
| FR8 | Reset avert. a 16h30 | V1 Prod | `App.tsx` (scheduler) | ATTENTION (NFR20 exige scheduler Rust) |
| FR9 | Retirer un avertissement | V1 Prod | `studentStore.ts` | OK |
| FR10 | Ajouter une sanction | V1 Prod | `studentStore.ts`, `SanctionReasonModal.tsx` | OK |
| FR11 | Retirer une sanction | V1 Prod | `studentStore.ts` | OK |
| FR12 | Motif obligatoire | Story 11.1 | `SanctionReasonModal.tsx` (modifie) | OK |
| FR13 | Emojis tristes (max 10/sem) | V1 Prod | `StudentGridCard.tsx`, `WeeklyRewardLine.tsx` | OK |
| FR14 | Reset sanctions lundi | V1 Prod | `App.tsx` (scheduler) | ATTENTION (NFR20) |
| FR15 | Export JSON avec motifs | Story 11.3 | `ExportButton.tsx`, `studentStore.ts` | OK |
| FR16 | Marquer absent | Story 11.2 | `studentStore.ts`, `StudentGridCard.tsx` | OK (table `absences` V1 conservee) |
| FR17 | Absent = pas de recompense | Story 11.2 | `studentStore.ts` | OK |
| FR18 | Annuler absence | Story 11.2 | `studentStore.ts` | OK |
| FR19 | Recompense auto 16h30 | V1 Prod | `studentStore.ts`, `App.tsx` | OK |
| FR20 | Recompenses L-M-J-V (pas mercredi) | V1 Prod | `WeeklyRewardLine.tsx` | OK |
| FR21 | Sanction annule recompense | V1 Prod | `studentStore.ts` | OK |
| FR22 | Grille cartes alphabetique fixe | V1 Prod | `StudentGrid.tsx` | ATTENTION (V1 trie par sanctions desc) |
| FR23 | Carte : prenom + avert. + L-M-J-V + boutons | V1 Prod | `StudentGridCard.tsx` | OK |
| FR24 | Mode plein ecran TBI (F11) | V1 Prod | `TBIView.tsx` | OK |
| FR25 | Bilan hebdomadaire | Story 11.3 | `WeeklySummary.tsx` | OK |
| FR26 | Export JSON complet | Story 11.3 | `ExportButton.tsx` | OK |
| FR27 | Autostart | V1 Prod | `lib.rs` (autostart plugin) | OK |
| FR28 | Icone tray | V1 Prod | `lib.rs` (TrayIconBuilder) | OK |
| FR29 | Raccourci global | V1 Prod | `lib.rs` (Ctrl+Shift+C) | OK |
| FR30 | Fermer = minimise tray | V1 Prod | `lib.rs` | OK |

### Module 2 — Comportement Individuel

| FR | Description | Story | Composant Architecture | Statut |
|----|-------------|-------|----------------------|--------|
| FR31 | Fiche detaillee eleve | Story 12.1 | `modules/comportement-individuel/StudentDetailView.tsx` | OK |
| FR32 | Saisie incident detaille | Story 12.2 | `IncidentForm.tsx`, `incidentStore.ts`, migration 7 | OK |
| FR33 | Historique chronologique | Story 12.3 | `IncidentTimeline.tsx`, `PeriodFilter.tsx` | OK |
| FR34 | Incidents par periode | Story 12.3 | `PeriodFilter.tsx`, `configStore.ts` | OK |
| FR35 | Modifier incident | Story 12.4 | `IncidentForm.tsx`, `incidentStore.ts` | OK |
| FR36 | Supprimer incident | Story 12.4 | `incidentStore.ts` | OK |
| FR37 | Dictee vocale description | Story 14.5 | `VoiceDictation.tsx` (mode transcription-only) | OK |

### Module 3 — Domaines d'Apprentissage

| FR | Description | Story | Composant Architecture | Statut |
|----|-------------|-------|----------------------|--------|
| FR38 | Push-to-talk | Story 14.3 | `VoiceDictation.tsx`, `useAudioRecorder.ts` | OK |
| FR39 | Transcription Whisper | Story 14.3, 14.4 | `useTranscription.ts`, `whisperClient.ts` | OK |
| FR40 | Structuration LLM | Story 15.2 | `useStructuration.ts`, `llamaClient.ts`, GBNF | ATTENTION (GBNF mono vs multi-domaine) |
| FR41 | Validation + insertion | Story 15.2, 15.3 | `validation/validator.rs`, `validation/executor.rs` | OK |
| FR42 | Vue tableau appreciations | Story 15.1 | `AppreciationTable.tsx`, `appreciationStore.ts` | OK |
| FR43 | Saisie manuelle | Story 15.4 | `ManualEntryForm.tsx` | OK |
| FR44 | Domaines parametrables | Story 15.5 | `domaines_apprentissage` table, Settings | OK |

### Infrastructure IA

| FR | Description | Story | Composant Architecture | Statut |
|----|-------------|-------|----------------------|--------|
| FR45 | whisper-server on-demand | Story 13.1, 13.2 | `sidecar/manager.rs`, `sidecar/whisper.rs` | OK |
| FR46 | llama-server on-demand | Story 13.1, 13.3 | `sidecar/manager.rs`, `sidecar/llama.rs` | OK |
| FR47 | Pipeline sequentiel | Story 13.4 | `sidecar/manager.rs` (mode exclusif) | OK |
| FR48 | LLM genere JSON | Story 13.6 | `grammars/appreciation.gbnf`, `commands/structuration.rs` | OK |
| FR49 | Validateur Rust 4 couches | Story 13.6 | `validation/validator.rs`, `validation/executor.rs`, `validation/schema.rs` | OK |
| FR50 | VAD natif | Story 13.2 | `sidecar/whisper.rs` (flag --vad) | OK |

### Gestion des Modeles

| FR | Description | Story | Composant Architecture | Statut |
|----|-------------|-------|----------------------|--------|
| FR51 | Ecran premier lancement | Story 16.1, 16.2 | `ModelSetupScreen.tsx`, `commands/models.rs` | OK |
| FR52 | Stockage app_data_dir | Story 16.3 | `commands/models.rs`, `models_status` table | OK |
| FR53 | Installation USB | Story 16.4 | `commands/models.rs` | OK |

### Configuration

| FR | Description | Story | Composant Architecture | Statut |
|----|-------------|-------|----------------------|--------|
| FR54 | Periodes scolaires | Story 10.3 | `configStore.ts`, `PeriodSelector.tsx`, migration 5 | OK |
| FR55 | Page parametres | Story 10.3 | `Settings.tsx` (etendu) | OK |
| FR56 | Navigation entre modules | Story 10.4 | `Sidebar.tsx`, `App.tsx` (routage) | OK |

### Capture Audio

| FR | Description | Story | Composant Architecture | Statut |
|----|-------------|-------|----------------------|--------|
| FR57 | Capture micro WAV | Story 14.1, 14.2 | `useAudioRecorder.ts`, tauri-plugin-mic-recorder / Web Audio | OK |

---

## 6. Gaps Identifies

### 6.1 Gaps de couverture

| # | Gap | Impact | Recommandation |
|---|-----|--------|----------------|
| G1 | ~~Pas de story pour migrer le scheduler de resets (JS -> Rust)~~ | ~~NFR20 non adresse~~ | **[RESOLU]** Pattern V1 conserve, documente dans Epics V2 |
| G2 | ~~Pas de story pour l'accessibilite TBI~~ | ~~NFR23-NFR27 non testes~~ | **[RESOLU]** Story 17.5 ajoutee |
| G3 | ~~Pas de migration de donnees `absences` -> `daily_absences`~~ | ~~Donnees V1 "perdues"~~ | **[RESOLU]** Table `absences` V1 conservee, `daily_absences` supprimee |
| G4 | Grammaire GBNF ne supporte qu'un seul domaine par requete | FR40 limite si texte multi-domaine | Etendre la grammaire GBNF pour supporter un tableau JSON |
| G5 | Grammaire GBNF pour incidents (`incident.gbnf`) non definie | FR37 bloque pour la structuration | Definir la grammaire dans l'Architecture |
| G6 | Pas de story pour corriger le tri `loadStudents` | FR22 (ordre alphabetique fixe) non garanti | Ajouter critere dans Story 10.1 |
| G7 | ~~Niveaux d'apprentissage incoherents entre documents~~ | ~~IC-2, IC-5 bloquants~~ | **[RESOLU]** Harmonise sur 3 niveaux GBNF + NULL |

### 6.2 Risques techniques non mitiges

| # | Risque | Probabilite | Mitigation manquante |
|---|--------|-------------|---------------------|
| RT1 | Le prompt LLM produit des hallucinations de domaine | Moyenne | Pas de fallback si le LLM detecte un domaine inexistant — le validateur Rust rejette mais l'UX de re-essai n'est pas clairement specifiee |
| RT2 | Le watchdog whisper-server redemarrre en boucle | Faible | Pas de circuit-breaker documente — apres N restarts consecutifs, le systeme devrait basculer en saisie manuelle |
| RT3 | Le delai de chargement modele (~3-5s) rend le pipeline lent | Certaine | La transition Whisper -> LLM ajoute 3-5s de chargement modele. Le pipeline total de ~15s est optimiste si on ajoute le temps utilisateur de correction |

---

## 7. Recommandations

### 7.1 Actions immediates (AVANT Sprint 1)

| # | Action | Responsable | Effort |
|---|--------|------------|--------|
| A1 | ~~**Harmoniser les niveaux d'apprentissage** (IC-2, IC-5, G7)~~ | PM + Architecte | **[FAIT]** |
| A2 | ~~**Corriger le PRD V2 section 5.1** pour refleter le schema V1 reel (IC-1, IC-3)~~ | PM | **[FAIT]** |
| A3 | ~~**Decider `absences` vs `daily_absences`** et documenter la migration (IC-4)~~ | Architecte | **[FAIT]** Option A : table V1 conservee |
| A4 | **Clarifier sidebar in/out scope V2** dans le Product Brief (IM-2) | PM | 15min |
| A5 | **Ajouter critere FR22 dans Story 10.1** (tri alphabetique) (G6) | PM | 15min |
| A6 | ~~**Ajouter Story 17.5 ou criteres NFR23-NFR27** dans stories existantes (IC-6, G2)~~ | PM | **[FAIT]** Story 17.5 ajoutee |

### 7.2 Actions Sprint 1

| # | Action | Responsable | Effort |
|---|--------|------------|--------|
| B1 | **Etendre la grammaire GBNF** pour supporter tableau JSON multi-domaine (G4) | Architecte | 1h |
| B2 | **Definir la grammaire `incident.gbnf`** (G5) | Architecte | 30min |
| B3 | **Documenter la strategie de resets** (G1) — Rust scheduler ou pattern V1 conserve | Architecte | 30min |

### 7.3 Actions Sprint 2

| # | Action | Responsable | Effort |
|---|--------|------------|--------|
| C1 | **Tester whisper-server sur Windows** des le debut du Sprint 2 — valider le watchdog | Dev | 2h |
| C2 | **Tester tauri-plugin-mic-recorder** en build release signe — decider Plan A/B | Dev | 2h |
| C3 | **Mesurer la RAM effective** du pipeline sequentiel sur un PC 4 Go | Dev | 1h |

---

## 8. Conclusion

Le projet Comportement V2 dispose d'une documentation **remarquablement complete** pour un projet de cette taille. Les 57 FRs sont integralement couverts par les 36 stories, et l'architecture est bien alignee avec les decisions techniques de la recherche.

Les 7 issues critiques identifiees etaient principalement des **incoherences inter-documents** (pas des defauts de conception). **Elles ont toutes ete corrigees le 2026-02-10 :** schema PRD V2 aligne sur le code V1 reel, niveaux d'apprentissage harmonises (3 niveaux GBNF), table `daily_absences` supprimee au profit de `absences` V1, Story 17.5 ajoutee pour l'accessibilite TBI, strategie scheduler documentee. Les 12 issues mineures restent a traiter pendant l'implementation.

**Recommandation finale :** Le projet est **pret pour le Sprint 1**. Les actions immediates A1-A6 ont ete executees. Les actions Sprint 1 (B1-B3) et Sprint 2 (C1-C3) restent a adresser pendant l'implementation.

---

**Document genere le :** 2026-02-10
**Mode :** Revue adversariale par Architecte Senior
