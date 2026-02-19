# Story 18.2 : Gestion Année Scolaire

Status: ready-for-dev

## Story

En tant qu'enseignant,
Je veux créer et gérer mes années scolaires,
Afin d'organiser le suivi de mes élèves par année et de clôturer une année terminée.

## Acceptance Criteria

1. **Given** l'enseignant accède aux paramètres (AnneeSettings),
   **When** il crée une année scolaire avec un label (ex: "2025-2026") et des dates début/fin,
   **Then** l'année est créée et activée automatiquement,
   **And** une seule année peut être active à la fois (la précédente est désactivée).

2. **Given** une année scolaire active,
   **When** l'enseignant la clôture,
   **Then** l'année passe en lecture seule,
   **And** toute tentative d'écriture (ajout élève, modification note) est bloquée par le guard Rust `check_annee_not_closed`,
   **And** un message explicite informe que l'année est clôturée.

3. **Given** une année clôturée,
   **When** l'enseignant choisit de la réouvrir,
   **Then** l'année redevient active et les écritures sont à nouveau possibles.

4. **Given** le store Zustand `anneeStore`,
   **When** l'enseignant change d'année active,
   **Then** les données affichées (élèves, appréciations) sont filtrées par l'année sélectionnée.

## Tasks / Subtasks

- [ ] **Task 1 : Commandes Tauri — CRUD année scolaire** (AC: #1, #3)
  - [ ] 1.1 Créer `src-tauri/src/annee.rs` avec les commandes Tauri :
    - `get_annees_scolaires` → SELECT toutes les années (triées par date_debut DESC)
    - `create_annee_scolaire(label, date_debut, date_fin)` → INSERT + désactiver l'ancienne active + activer la nouvelle
    - `set_annee_active(id)` → UPDATE active=0 partout puis active=1 pour l'id
    - `cloturer_annee(id)` → UPDATE cloturee=1 (AC: #2)
    - `rouvrir_annee(id)` → UPDATE cloturee=0 puis set_annee_active(id) (AC: #3)
  - [ ] 1.2 Déclarer `mod annee;` dans `lib.rs`
  - [ ] 1.3 Enregistrer les 5 commandes dans `invoke_handler`

- [ ] **Task 2 : Guard Rust `check_annee_not_closed`** (AC: #2)
  - [ ] 2.1 Implémenter la fonction guard dans `src-tauri/src/annee.rs` :
    ```rust
    pub async fn check_annee_not_closed(db_url: &str, annee_id: i64) -> Result<(), String>
    ```
    - SELECT cloturee FROM annees_scolaires WHERE id = ?
    - Si cloturee = 1 → Err("L'année scolaire est clôturée. Réouvrez-la pour modifier les données.")
    - Si annee_id absent → Err("Année scolaire introuvable")
  - [ ] 2.2 Exposer la fonction pour les stories suivantes (pub)
  - [ ] 2.3 Tests unitaires du guard (année ouverte, clôturée, inexistante)

- [ ] **Task 3 : Store Zustand `anneeStore`** (AC: #1, #3, #4)
  - [ ] 3.1 Créer `src/shared/stores/anneeStore.ts` (pattern identique à configStore) :
    - State : `annees: AnneeScolaire[]`, `activeAnnee: AnneeScolaire | null`, `isLoading`, `error`
    - Actions : `loadAnnees()`, `createAnnee(label, dateDebut, dateFin)`, `setActive(id)`, `cloturer(id)`, `rouvrir(id)`
    - Chaque action invoke la commande Tauri correspondante puis reload
  - [ ] 3.2 Ajouter les types dans `src/shared/types/index.ts` :
    ```typescript
    export interface AnneeScolaire {
      id: number;
      label: string;
      dateDebut: string;
      dateFin: string;
      active: boolean;
      cloturee: boolean;
      createdAt: string;
    }
    ```

- [ ] **Task 4 : Composant `AnneeSettings`** (AC: #1, #2, #3)
  - [ ] 4.1 Créer `src/shared/components/AnneeSettings.tsx` :
    - Formulaire création : label (text), date début (date), date fin (date), bouton "Créer"
    - Liste des années existantes avec badges (Active / Clôturée)
    - Bouton "Clôturer" sur l'année active
    - Bouton "Réouvrir" sur les années clôturées
    - Message d'information quand une année est clôturée
  - [ ] 4.2 Intégrer dans `Settings.tsx` (nouvelle section entre Périodes et Domaines)

- [ ] **Task 5 : Charger l'année active au démarrage** (AC: #4)
  - [ ] 5.1 Dans `App.tsx`, appeler `anneeStore.loadAnnees()` au démarrage (useEffect)
  - [ ] 5.2 Si aucune année n'existe, ne rien bloquer (rétrocompatibilité V2 pure)

- [ ] **Task 6 : Tests Rust** (AC: #1, #2, #3)
  - [ ] 6.1 Test : création d'année → active=1, ancienne active=0
  - [ ] 6.2 Test : clôture → cloturee=1
  - [ ] 6.3 Test : réouverture → cloturee=0, active=1
  - [ ] 6.4 Test : guard bloque écriture sur année clôturée
  - [ ] 6.5 Test : guard autorise écriture sur année ouverte

## Dev Notes

### Architecture — ADR-011 (Année scolaire flag + guard Rust)

Le guard `check_annee_not_closed` est une fonction réutilisable que TOUTES les commandes Tauri d'écriture (stories 18.3, 18.4, Epic 19, 20, 21) devront appeler avant de modifier des données scopées par année. C'est la brique de sécurité centrale de la V2.1.

**Pattern guard (architecture-v2.1.md) :**
```rust
pub async fn check_annee_not_closed(db_url: &str, annee_id: i64) -> Result<(), String> {
    let mut conn = sqlx::sqlite::SqliteConnection::connect(db_url)
        .await
        .map_err(|e| e.to_string())?;

    let cloturee: bool = sqlx::query_scalar::<_, bool>(
        "SELECT cloturee FROM annees_scolaires WHERE id = ?"
    )
    .bind(annee_id)
    .fetch_optional(&mut conn)
    .await
    .map_err(|e| e.to_string())?
    .ok_or_else(|| "Année scolaire introuvable".to_string())?;

    if cloturee {
        return Err("L'année scolaire est clôturée. Réouvrez-la pour modifier les données.".to_string());
    }
    Ok(())
}
```

[Source: architecture-v2.1.md#ADR-011]

### Accès DB depuis les commandes Tauri

Le projet utilise `tauri-plugin-sql` côté frontend (via `Database.load('sqlite:comportement.db')`). Les stores TS font les requêtes SQL directement via le plugin.

Pour les commandes Rust, on a deux options :
1. **sqlx direct** (comme les migrations) — ouvrir une connexion sqlx au même fichier
2. **Passer par le frontend** — le store TS fait tout, Rust n'intervient pas

**Choix pour cette story :** Les commandes Tauri CRUD + guard utilisent **sqlx direct** car le guard doit être Rust-side (c'est sa raison d'être — empêcher les écritures même si le frontend est modifié).

Le chemin DB est obtenu via `app.path().app_local_data_dir()?.join("comportement.db")`, pattern déjà utilisé dans `migrations/mod.rs:get_db_path()`. Réutiliser cette fonction (la rendre `pub`).

### Pattern stores existant (à suivre exactement)

Les stores Zustand suivent ce pattern (voir `configStore.ts`, `studentStore.ts`) :

```typescript
import { create } from 'zustand';
import Database from '@tauri-apps/plugin-sql';

async function getDb() {
  return await Database.load('sqlite:comportement.db');
}

export const useAnneeStore = create<AnneeStore>((set, get) => ({
  // state
  annees: [],
  activeAnnee: null,
  isLoading: false,
  error: null,

  // actions — try/catch systématique
  loadAnnees: async () => {
    set({ isLoading: true, error: null });
    try {
      const db = await getDb();
      // ... SQL via le plugin
      set({ annees, activeAnnee, isLoading: false });
    } catch (error) {
      console.error('Error loading annees:', error);
      set({ error: String(error), isLoading: false });
    }
  },
}));
```

**Important :** Le store TS fait les opérations CRUD SQL directement via le plugin (comme tous les autres stores). Les commandes Tauri Rust sont utilisées uniquement pour le guard et les opérations nécessitant du Rust (validation, sécurité). Pour cette story, le **store TS fait le CRUD via SQL plugin** et les **commandes Rust ne servent que pour le guard check** (appelé explicitement par le store avant une écriture sur année clôturée).

**Alternative simplifiée :** Le store peut faire tout le CRUD via `Database.load()` (SQL direct comme les autres stores), et la commande Tauri Rust `check_annee_not_closed` est appelée via `invoke()` avant les écritures critiques. Cela évite de dupliquer l'accès DB en Rust pour du simple CRUD.

### Pattern composant Settings existant

`Settings.tsx` est un modal plein écran avec des sections dans des `<div className="p-4 bg-slate-50 rounded-lg">`. Chaque section est un composant autonome (ex: `PeriodsSettings`, `DomainsSettings`). `AnneeSettings` suivra le même pattern.

**Placement :** En premier dans la liste des sections (l'année scolaire est le conteneur principal de toutes les données).

### Rétrocompatibilité V2

Si aucune année n'existe dans `annees_scolaires` (cas V2 pur sans année créée), l'application doit fonctionner normalement. L'année est optionnelle tant que l'utilisateur ne l'a pas configurée. Le guard ne s'active que quand un `annee_scolaire_id` est associé aux données.

### Colonnes `active` et `cloturee` dans SQLite

SQLite stocke les booléens comme INTEGER (0/1). Le store TS doit convertir :
```typescript
const annees = rows.map(r => ({
  ...r,
  active: Boolean(r.active),
  cloturee: Boolean(r.cloturee),
}));
```

Pattern existant : voir `studentStore.ts` ligne 132 — `cancelled: Boolean(r.cancelled)`.

### Conventions de nommage — OBLIGATOIRE

| Élément | Convention | Exemple |
|---------|-----------|---------|
| Commandes Tauri | `snake_case` | `get_annees_scolaires`, `cloturer_annee` |
| Store Zustand | `camelCase` + suffixe `Store` | `anneeStore.ts` |
| Composant React | `PascalCase` | `AnneeSettings.tsx` |
| Types TS | `PascalCase` | `AnneeScolaire` |
| Module Rust | `snake_case` | `annee.rs` |
| Colonnes DB | `snake_case` | `annee_scolaire_id`, `cloturee` |

[Source: architecture-v2.1.md#Naming Patterns]

### Fichiers à créer/modifier

**Nouveaux fichiers :**
- `src-tauri/src/annee.rs` — module Rust (guard + commandes Tauri)
- `src/shared/stores/anneeStore.ts` — store Zustand
- `src/shared/components/AnneeSettings.tsx` — composant Settings

**Fichiers à modifier :**
- `src-tauri/src/lib.rs` — `mod annee;` + `invoke_handler`
- `src-tauri/src/migrations/mod.rs` — rendre `get_db_path` pub (réutilisation)
- `src/shared/types/index.ts` — ajouter `AnneeScolaire`
- `src/shared/components/Settings.tsx` — intégrer `AnneeSettings`
- `src/App.tsx` — charger années au démarrage

### Commits récents (contexte)

```
9f3d727 feat: Story 18.1 — migrations SQLite V2→V2.1 (8 migrations additives)
9927174 fix: dictée vocale fonctionnelle (permission micro, sidecar, VAD)
3ec8915 feat: flux vocal domaine-par-domaine (Whisper direct, sans LLM)
```

→ La table `annees_scolaires` existe déjà (créée par M001 dans Story 18.1).
→ Les colonnes `annee_scolaire_id` sur `students` et `config_periodes` existent (M002, M006).

### Références

- ADR-011 (année scolaire flag+guard) : [Source: architecture-v2.1.md#ADR-011]
- Pattern guard Rust : [Source: architecture-v2.1.md#Guard pattern]
- FR58 : [Source: epics-v2.1.md#Story 18.2]
- Pattern stores Zustand : [Source: src/shared/stores/configStore.ts]
- Pattern Settings sections : [Source: src/shared/components/Settings.tsx]
- Table annees_scolaires : [Source: src-tauri/src/migrations/v2_1.rs#M001]

## Dev Agent Record

### Agent Model Used

_À remplir par l'agent dev_

### Debug Log References

_À remplir pendant l'implémentation_

### Completion Notes List

_À remplir après implémentation_

### File List

_Fichiers créés/modifiés par l'agent dev_
