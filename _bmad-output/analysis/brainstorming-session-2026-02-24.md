---
stepsCompleted: [1, 2, 3, 4, 5]
inputDocuments: []
session_topic: 'Refonte V2.1 MonCahier — Journal pedagogique, LSU vivant, registre appel, architecture future-proof'
session_goals: 'Detailler les ecrans, flux utilisateur, pipeline LLM et modele de donnees pour la refonte du Module 3 en assistant pedagogique complet'
selected_approach: 'ai-recommended'
techniques_used: ['Role Playing', 'Question Storming', 'Morphological Analysis']
ideas_generated: [68]
context_file: ''
---

# Brainstorming Session Results

**Facilitator:** Uhama
**Date:** 2026-02-24

## Session Overview

**Topic:** Refonte V2.1 de MonCahier — Transformer le Module 3 (Domaines d'Apprentissage) en un assistant pedagogique complet avec journal pedagogique, LSU vivant, registre d'appel enrichi, et architecture future-proof pour canvas infini et mobile.

**Goals:**
- Detailler les ecrans et flux utilisateur pour chaque module
- Definir le pipeline LLM (3 jobs : classifier, synthetiser, appreciation generale)
- Formaliser le modele de donnees (event sourcing leger)
- Planifier les interactions vocales (bouton micro dual-mode par eleve)
- Preparer l'architecture pour les futures extensions (canvas infini V3, mobile sync V4)

### Context Guidance

_Session precedee d'un Party Mode avec Sally (UX), John (PM), et Winston (Architecte) qui a etabli le perimetre V2.1 revise :_

1. **Comportement Classe enrichi** — tableau collectif + bouton micro par eleve (tap toggle / press & hold) + motifs vocaux
2. **Registre d'appel** — absences demi-journee, 3 types, motifs, retards, alerte legale 4+ injustifiees/mois
3. **Module Evaluations** — saisie par lecon/domaine/niveau LSU/observations vocal ou manuel
4. **LSU Vivant** — synthese progressive par domaine (LLM), appreciation generale (comportement formule avec tact), modifiable vocalement, export XML
5. **Import CSV eleves** — debut d'annee
6. **Suppression Module Suivi Individuel**

---

## Phase 1 — Role Playing (Enseignant, Parent, Inspecteur)

### Persona : Enseignant (journee type)

**Matin 8h20 — Arrivee :**
- L'app demarre automatiquement dans le tray systeme
- Ouvre MonCahier, fait l'appel du matin (toggle absent par eleve)
- Double saisie : papier (registre officiel) + app (pour calculs auto)

**8h30-11h30 — Cours :**
- Tableau collectif visible (Module 1)
- Observation spontanee d'un eleve : tap micro sur sa carte → dicte 30s-2min → LLM classifie le domaine → carte editable → valider
- Sanction : avertissement 1-2-3, motif obligatoire au 3e (vocal ou texte)
- Utilise Miro sur le TBI comme outil central (grille temporelle : colonnes = jours, lignes = creneaux, ressources pedagogiques en cartes deplacables)

**11h30-13h30 — Pause midi :**
- Corrections : un eleve a la fois, manuellement
- Saisie evaluations si besoin (lecon + domaine + niveau + observation)

**13h30 — Retour :**
- Appel apres-midi
- Meme flux observations/sanctions

**16h30 — Fin de journee :**
- Reset auto des avertissements
- Eventuellement : saisie retroactive d'absences/retards oublies

**Fin de periode :**
- Ouvre LSU Vivant → vue par eleve → bouton "Synthetiser" par domaine
- Le LLM genere une synthese a partir de toutes les observations/evaluations
- Prof relit, modifie vocalement ou manuellement
- Genere l'appreciation generale (cross-domaines + comportement formule avec tact)
- Export LSU XML

### Persona : Parent

- Recoit le LSU imprime (pas d'acces app)
- Voit : synthese par domaine, appreciation generale, absences comptabilisees
- Attend des observations constructives, jamais punitives

### Persona : Inspecteur

- Verifie la conformite du registre d'appel (alerte 4+ demi-journees injustifiees/mois)
- Verifie que les domaines correspondent au referentiel officiel du cycle
- Verifie que l'echelle LSU 4 niveaux est respectee

### Decisions Phase 1

| Decision | Choix |
|----------|-------|
| Demarrage app | Auto dans le tray systeme |
| Cantine/etude | Hors scope |
| Cahier navette | Hors scope |
| Observations | Toujours par eleve, jamais collectives |
| Sanctions vs apprentissage | Separes, jamais melanges |
| Corrections | Manuelles, un eleve a la fois |
| Outil TBI | Miro (hors scope MonCahier) |
| Micro dual-mode | Tap court (<300ms) = toggle, press long = push-to-talk |
| OpenClaw mobile | Pour observations en deplacement (V4) |

---

## Phase 2 — Question Storming (44 questions, regroupees)

### Registre d'appel

| # | Question | Reponse |
|---|----------|---------|
| 1 | Comment gerer le retard vs absence ? | Retard = present + flag retard (pas une absence) |
| 2 | Saisie retroactive possible ? | Oui, date picker pour jours passes |
| 3 | Alerte 4+ injustifiees : calcul glissant ou calendaire ? | Glissant sur 30 jours |
| 4 | Qui voit l'alerte ? | Notification visuelle pour le prof uniquement |
| 5 | Totaux pour LSU ? | Somme auto justifiees + injustifiees par periode |
| 6 | Demi-journees : matin et apres-midi seulement ? | Oui, pas de creneaux plus fins |

### Bouton micro et pipeline vocal

| # | Question | Reponse |
|---|----------|---------|
| 7 | Le LLM identifie le domaine ou l'eleve ? | Domaine uniquement (eleve connu via carte) |
| 8 | Transcription editable avant validation ? | Oui, toujours editable |
| 9 | Duree max dictee ? | < 2 min en pratique, pas de limite technique |
| 10 | Observation sans domaine identifiable ? | "Observation diverse" → nourrit l'appreciation generale |
| 11 | Observations contradictoires dans le temps ? | LLM nuance chronologiquement (progression) |
| 12 | Undo observation ? | Undo (revenir en arriere), jamais delete |
| 13 | Motif sanction aussi en vocal ? | Oui, meme bouton micro, contexte different |

### Module Evaluations

| # | Question | Reponse |
|---|----------|---------|
| 14 | Saisie par lot (meme lecon, tous les eleves) ? | Oui, grille eleves x niveau |
| 15 | Multi-niveaux dans la meme classe ? | Domaines filtres par cycle de chaque eleve |
| 16 | Changement de niveau mid-annee ? | Conserver les donnees, adapter les domaines affiches |
| 17 | Historique evaluations par eleve ? | Oui, timeline chronologique |
| 18 | Deux espaces de saisie observation ? | Oui : spontanee (Module 1 micro) + structuree (Evaluations) |

### LSU Vivant

| # | Question | Reponse |
|---|----------|---------|
| 19 | Synthese automatique ou on-demand ? | On-demand (prof declenche avec bouton "Synthetiser") |
| 20 | Double vue ? | Oui : par eleve (tous domaines) ET par domaine (tous eleves) |
| 21 | Sources depliables sous synthese ? | Oui, accordeon avec observations source |
| 22 | Versioning syntheses ? | 4-5 versions en arriere |
| 23 | Regeneration LLM ? | Bouton "Regenerer" conserve la version precedente |
| 24 | Appreciation generale : quelles sources ? | Cross-domaines + comportement formule avec tact |
| 25 | Recherche dans les observations ? | SQL LIKE suffisant pour V2.1, embeddings si besoin plus tard |
| 26 | Synthese non generee a la cloture ? | Warning avant cloture |

### Architecture et donnees

| # | Question | Reponse |
|---|----------|---------|
| 27 | Event sourcing : events immutables ? | Oui, `evenements_pedagogiques` immutable (append-only) |
| 28 | Archive quand ? | Fin d'annee scolaire, possible entre periodes |
| 29 | Mono-user ou multi-user ? | Mono-user, une DB par machine |
| 30 | Import CSV format ? | Prenom, niveau (PS-CM2), optionnel : nom |
| 31 | Canvas infini (V3) : quel modele ? | Inspire de Miro — grille temporelle (jours x creneaux) |
| 32 | Sync mobile (V4) : quel protocole ? | Bluetooth/WiFi Direct, pas de cloud, sync instantanee ideale |

### Comportement Classe (Module 1)

| # | Question | Reponse |
|---|----------|---------|
| 33 | Motifs ajoutables apres coup ? | Oui, retour sur une sanction pour ajouter/modifier le motif |
| 34 | Observations depuis Module 1 ? | Oui, le micro sur la carte eleve sert aussi pour observations |
| 35 | Vue TBI changee ? | Non, le tableau collectif reste la vue principale |

### Questions supplementaires (rafale 3)

| # | Question | Reponse |
|---|----------|---------|
| 36 | Categorie "observation diverse" explicite ? | Non, pas besoin de categorie visible — le LLM route en interne |
| 37 | Synthese regeneree automatiquement apres nouvelle obs ? | Non, toujours on-demand |
| 38 | Niveau eleve change : que deviennent les anciennes obs ? | Conservees, rattachees aux anciens domaines |
| 39 | Meme observation, deux domaines possibles ? | LLM choisit le plus pertinent, prof peut corriger |
| 40 | Observations contradictoires ? | LLM nuance chronologiquement (montre la progression) |
| 41 | Undo global ou par champ ? | Par observation/synthese, pas de undo global |
| 42 | Export LSU partiel (un seul eleve) ? | Oui, possible |
| 43 | Absences sur LSU : format ? | Nombre total demi-journees (justifiees + injustifiees separement) |
| 44 | Periodes configurables ? | Deja implemente (trimestres/semestres) |

---

## Phase 3 — Morphological Analysis (Matrice systematique)

### Module 1 : Comportement Classe (enrichi)

| Action | Input | Donnees | Ecran |
|--------|-------|---------|-------|
| Avertissement 1-2-3 | Tap carte eleve | `sanctions` (warnings++) | Tableau collectif |
| Sanction (3e avert.) | Modal motif (radio) | `sanctions` + motif texte | Modal → tableau |
| Motif vocal sanction | Bouton micro carte | `evenements_pedagogiques` (type=motif_sanction) | Micro inline → toast |
| Observation spontanee | Bouton micro carte (dual-mode) | `evenements_pedagogiques` (type=observation, domaine=auto LLM) | Micro → TranscriptPreview → validation |
| Marquer absent | Bouton ABS carte | `absences` (demi-journee, type) | Tableau collectif |
| Reset quotidien | Auto 16h30 | `sanctions` (warnings=0) | — |
| Reset hebdomadaire | Auto lundi | `sanctions` (count=0) | — |

**Flux micro dual-mode :**
```
Tap court (<300ms)  → toggle enregistrement continu
Press long (>300ms) → push-to-talk (relacher = stop)
→ Whisper STT → texte editable
→ LLM classify_and_merge (domaine auto)
→ TranscriptPreview (carte editable, diff avant/apres)
→ Valider / Rejeter
```

### Module 2 : Registre d'appel (nouveau)

| Action | Input | Donnees | Ecran |
|--------|-------|---------|-------|
| Appel matin | Toggle absent par eleve | `absences` (demi_journee=matin) | Grille eleves x jour |
| Appel apres-midi | Toggle absent par eleve | `absences` (demi_journee=apres_midi) | Grille eleves x jour |
| Type absence | Select | `absences.type_absence` (justifiee/medicale/injustifiee) | Inline select |
| Motif absence | Texte ou vocal | `absences.motif` | Input / micro |
| Retard | Toggle | `absences` (retard=true, present=true) | Checkbox |
| Saisie retroactive | Date picker | `absences` (date passee) | Date picker |
| Alerte legale | Auto-calcul glissant 30j | Compteur injustifiees >= 4 | Badge alerte rouge |
| Totaux LSU | Auto-calcul par periode | Somme demi-journees (J + I) | Vue recapitulative |

### Module 3 : Evaluations (remplace ancien Module 3)

| Action | Input | Donnees | Ecran |
|--------|-------|---------|-------|
| Nouvelle evaluation | Formulaire | `evenements_pedagogiques` (type=evaluation) | Modal/formulaire |
| Nom lecon | Texte | `.lecon` | Input texte |
| Domaine | Select (filtre par cycle eleve) | `.domaine_id` | Select domaines |
| Niveau LSU | Select 4 niveaux officiels | `.niveau_lsu` | Boutons/select |
| Observation | Texte ou vocal | `.observations` | Textarea / micro |
| Historique eleve | Lecture | `evenements_pedagogiques` filtres | Timeline par eleve |
| Saisie par lot | Multi-eleves meme lecon | `evenements_pedagogiques` x N | Grille eleves x niveau |

### Module 4 : LSU Vivant (nouveau)

| Action | Input | Donnees | Ecran |
|--------|-------|---------|-------|
| Vue par eleve | Select eleve | `syntheses_lsu` + sources | Fiche eleve, tous domaines |
| Vue par domaine | Select domaine | `syntheses_lsu` + sources | Liste eleves, un domaine |
| Generer synthese | Bouton "Synthetiser" | LLM → `syntheses_lsu` (version N+1) | Texte genere editable |
| Editer synthese | Texte ou vocal | `syntheses_lsu.contenu` | Textarea / micro |
| Appreciation generale | Bouton "Generer" | LLM → `appreciations_generales` | Texte genere editable |
| Voir sources | Deplier accordeon | `evenements_pedagogiques` lies | Accordeon sous synthese |
| Historique versions | Bouton versions | `syntheses_lsu` (4-5 versions) | Liste versions, restaurer |
| Export LSU XML | Bouton export | Syntheses + absences + niveaux | Fichier XML |

### Module 5 : Import & Gestion

| Action | Input | Donnees | Ecran |
|--------|-------|---------|-------|
| Import CSV eleves | Fichier CSV | `eleves` (prenom, niveau PS-CM2) | Settings → Import |
| Creer annee scolaire | Formulaire | `annees_scolaires` | Settings |
| Cloturer annee | Bouton + confirmation | `annees_scolaires.cloturee=true` | Confirmation → read-only |
| Configurer periodes | Formulaire | `periodes` | Settings |

---

## Flux de donnees global

```
                    ┌─────────────────┐
                    │  Bouton Micro   │
                    │  (carte eleve)  │
                    └────────┬────────┘
                             │
                    ┌────────▼────────┐
                    │   Whisper STT   │
                    └────────┬────────┘
                             │
                    ┌────────▼────────┐
                    │  LLM Classify   │──→ domaine auto
                    │  & Merge        │──→ fusion obs existante
                    └────────┬────────┘
                             │
              ┌──────────────▼──────────────┐
              │   evenements_pedagogiques    │  ← event sourcing
              │  (observations, evaluations, │
              │   motifs sanctions)          │
              └──────────────┬──────────────┘
                             │
               ┌─────────────┼─────────────┐
               │             │             │
    ┌──────────▼───┐  ┌─────▼──────┐  ┌──▼──────────────┐
    │ syntheses_lsu│  │appreciations│  │   absences      │
    │ (par domaine)│  │ _generales  │  │ (demi-journee)  │
    └──────────────┘  └────────────┘  └─────────────────┘
               │             │             │
               └─────────────┼─────────────┘
                             │
                    ┌────────▼────────┐
                    │  Export LSU XML  │
                    └─────────────────┘
```

---

## Modele de donnees (event sourcing leger)

### Tables principales

```sql
-- Events immutables (append-only)
evenements_pedagogiques (
  id INTEGER PRIMARY KEY,
  uuid TEXT UNIQUE,           -- future sync mobile
  eleve_id INTEGER NOT NULL,
  annee_scolaire_id INTEGER NOT NULL,
  periode_id INTEGER,
  type TEXT NOT NULL,          -- 'observation' | 'evaluation' | 'motif_sanction'
  domaine_id INTEGER,          -- NULL si observation diverse
  lecon TEXT,                  -- NULL si pas evaluation
  niveau_lsu TEXT,             -- 4 niveaux officiels, NULL si observation
  observations TEXT,
  texte_dictation TEXT,        -- transcription brute Whisper
  source TEXT DEFAULT 'manual', -- 'vocal' | 'manual'
  created_at TEXT DEFAULT (datetime('now')),
  synced_at TEXT               -- future sync mobile
)

-- Syntheses generees par LLM (versionees)
syntheses_lsu (
  id INTEGER PRIMARY KEY,
  eleve_id INTEGER NOT NULL,
  periode_id INTEGER NOT NULL,
  domaine_id INTEGER NOT NULL,
  version INTEGER DEFAULT 1,
  contenu TEXT NOT NULL,
  generated_by TEXT DEFAULT 'llm', -- 'llm' | 'manual'
  created_at TEXT DEFAULT (datetime('now'))
)

-- Appreciation generale cross-domaines
appreciations_generales (
  id INTEGER PRIMARY KEY,
  eleve_id INTEGER NOT NULL,
  periode_id INTEGER NOT NULL,
  version INTEGER DEFAULT 1,
  contenu TEXT NOT NULL,
  generated_by TEXT DEFAULT 'llm',
  created_at TEXT DEFAULT (datetime('now'))
)

-- Absences refonte (demi-journee)
absences (
  id INTEGER PRIMARY KEY,
  eleve_id INTEGER NOT NULL,
  date TEXT NOT NULL,           -- YYYY-MM-DD
  demi_journee TEXT NOT NULL,   -- 'matin' | 'apres_midi'
  type_absence TEXT NOT NULL,   -- 'justifiee' | 'medicale' | 'injustifiee'
  motif TEXT,
  retard BOOLEAN DEFAULT 0,    -- present mais en retard
  annee_scolaire_id INTEGER NOT NULL,
  created_at TEXT DEFAULT (datetime('now'))
)
```

---

## Combinaisons critiques

| # | Combinaison | Risque | Mitigation |
|---|------------|--------|------------|
| 1 | Micro + LLM classify + domaine ambigu | Mauvais classement | Fallback "observation diverse" → appreciation generale |
| 2 | Evaluation par lot + multi-niveaux | Domaines differents par eleve | Filtrage dynamique par cycle |
| 3 | Synthese LLM + observations contradictoires | Incoherence | Nuancer chronologiquement (progression) |
| 4 | Changement niveau mid-annee | Perte de donnees | Conserver donnees, adapter domaines affiches |
| 5 | Cloture annee + syntheses absentes | LSU incomplet | Warning obligatoire avant cloture |
| 6 | Retard vs absence | Confusion comptage | Retard = present + flag, pas une absence |
| 7 | Alerte 4+ injustifiees | Faux positif si calendaire | Calcul glissant 30 jours |
| 8 | Export LSU partiel (1 eleve) | Cas d'usage frequent | Supporter export unitaire |

---

## Decisions hors scope V2.1

| Feature | Raison | Version cible |
|---------|--------|--------------|
| Canvas infini (grille temporelle Miro-like) | Complexite UX, besoin validation terrain | V3 |
| Sync mobile Bluetooth/WiFi Direct | Necessite app mobile + protocole P2P | V4 |
| Cantine / etude | Pas gere par l'enseignant | Jamais |
| Cahier navette | Support papier, pas numerisable utilement | Jamais |
| Embeddings / recherche semantique | SQL LIKE suffisant pour V2.1 | V3 si besoin |
| Multi-user / multi-poste | Mono-user par design | V4 (sync) |

---

## Synthese et prochaines etapes

### Ce que la session a produit

1. **5 modules detailles** avec matrices action/input/donnees/ecran
2. **44 questions** avec reponses tranchees
3. **Modele de donnees** event sourcing complet (4 tables)
4. **Flux de donnees** global du micro au XML LSU
5. **8 combinaisons critiques** avec mitigations
6. **Scope clair** : V2.1 vs V3 vs V4 vs jamais

### Prochaines etapes

1. **Reviser le PRD V2.1** avec toutes les decisions de cette session
2. **Reviser l'architecture V2.1** (nouveau modele de donnees, nouvelles migrations)
3. **Redecouer les epics et stories** (nouveaux modules = nouveaux epics)
4. **Implementation readiness check** avant de coder
