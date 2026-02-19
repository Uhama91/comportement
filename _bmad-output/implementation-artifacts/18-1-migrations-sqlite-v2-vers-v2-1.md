# Story 18.1 : Migrations SQLite V2→V2.1

Status: done

## Story

En tant qu'enseignant,
je veux que l'application se mette à jour automatiquement au lancement,
afin que ma base de données soit prête pour toutes les nouvelles fonctionnalités V2.1 sans perte de données.

## Acceptance Criteria

1. **Given** une base SQLite V2 existante avec des données élèves et appréciations,
   **When** l'application V2.1 démarre pour la première fois,
   **Then** les 8 migrations additives s'exécutent séquentiellement (M001–M008).

2. **And** un backup fichier de la BDD (copie du `.sqlite`) est créé **avant** la première migration dans un dossier `comportement_backup_YYYYMMDD_HHMMSS.sqlite` à côté du fichier original.

3. **And** un SQL `SAVEPOINT sp_mXXX` est posé avant chaque migration individuelle, `RELEASE sp_mXXX` après succès.

4. **And** en cas d'erreur sur une migration, `ROLLBACK TO sp_mXXX` est exécuté, un message d'erreur clair est loggé, et l'application démarre quand même avec la version de schéma antérieure (sans bloquer l'utilisateur).

5. **And** les colonnes ajoutées ont des valeurs par défaut explicites (NULL acceptable pour toutes les nouvelles colonnes, sauf celles avec DEFAULT).

6. **And** la migration M004 convertit les données `niveau` existantes (échelle 3 niveaux V2) vers l'échelle 4 niveaux LSU : `'debut'→'non_atteints'`, `'en_cours_acquisition'→'partiellement_atteints'`, `'maitrise'→'depasses'` (le niveau `'atteints'` n'est pas affecté par la migration automatique).

7. **And** les migrations sont idempotentes : si déjà appliquées (vérifiées via `PRAGMA user_version`), elles ne s'exécutent pas au redémarrage.

8. **And** après toutes les migrations réussies, `PRAGMA user_version` vaut `9` (versions 0–8 = tauri-plugin-sql V1+V2, version 9 = V2.1 appliquée).

9. **And** un event Tauri `migration-progress { current: N, total: 8, name: "..." }` est émis pour chaque migration appliquée.

## Tasks / Subtasks

- [ ] **Task 1 : Créer le module Rust `migrations/`** (AC: #7, #8)
  - [ ] Créer `src-tauri/src/migrations/mod.rs` — runner principal avec backup + SAVEPOINT
  - [ ] Créer `src-tauri/src/migrations/v2_1.rs` — définition des 8 migrations (structs + SQL)
  - [ ] Déclarer `mod migrations;` dans `src-tauri/src/lib.rs`
  - [ ] Ajouter la dépendance `rusqlite` dans `Cargo.toml` si absente (pour accès direct SQLite)

- [ ] **Task 2 : Implémenter le backup fichier** (AC: #2)
  - [ ] Localiser le chemin du fichier SQLite via `app.path().app_data_dir()` + `"comportement.db"`
  - [ ] Copier le fichier avant la première migration : `comportement_backup_YYYYMMDD_HHMMSS.sqlite`
  - [ ] Logger le chemin du backup dans la console Tauri

- [ ] **Task 3 : Implémenter le runner de migrations avec SAVEPOINT** (AC: #3, #4, #7, #8, #9)
  - [ ] Lire `PRAGMA user_version` au démarrage
  - [ ] Si `user_version >= 9` → skip toutes les migrations (idempotent)
  - [ ] Si `user_version < 9` → backup + boucle migrations
  - [ ] Pour chaque migration : `SAVEPOINT sp_mXXX` → SQL → `RELEASE sp_mXXX` (ou `ROLLBACK TO` si erreur)
  - [ ] Émettre l'event `migration-progress` après chaque migration réussie
  - [ ] Mettre `PRAGMA user_version = 9` après le lot complet
  - [ ] En cas d'erreur non récupérable : logger + retourner `Ok(())` pour ne pas bloquer le démarrage

- [ ] **Task 4 : Définir les 8 migrations SQL** (AC: #1, #5, #6)

  - [ ] **M001** — `CREATE TABLE annees_scolaires`
    ```sql
    CREATE TABLE IF NOT EXISTS annees_scolaires (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        label TEXT NOT NULL,
        date_debut DATE NOT NULL,
        date_fin DATE NOT NULL,
        active INTEGER DEFAULT 0,
        cloturee INTEGER DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
    CREATE INDEX IF NOT EXISTS idx_annees_active ON annees_scolaires(active);
    ```

  - [ ] **M002** — `ALTER TABLE students` (colonnes niveau, annee_id, ine)
    ```sql
    ALTER TABLE students ADD COLUMN niveau TEXT DEFAULT NULL;
    ALTER TABLE students ADD COLUMN annee_scolaire_id INTEGER DEFAULT NULL REFERENCES annees_scolaires(id);
    ALTER TABLE students ADD COLUMN ine TEXT DEFAULT NULL;
    CREATE INDEX IF NOT EXISTS idx_students_annee ON students(annee_scolaire_id);
    CREATE INDEX IF NOT EXISTS idx_students_niveau ON students(niveau);
    ```

  - [ ] **M003** — `CREATE TABLE niveaux_classe`
    ```sql
    CREATE TABLE IF NOT EXISTS niveaux_classe (
        code TEXT PRIMARY KEY,
        libelle TEXT NOT NULL,
        cycle INTEGER NOT NULL CHECK(cycle IN (1, 2, 3)),
        ordre INTEGER NOT NULL
    );
    INSERT OR IGNORE INTO niveaux_classe (code, libelle, cycle, ordre) VALUES
        ('PS', 'Petite Section', 1, 1),
        ('MS', 'Moyenne Section', 1, 2),
        ('GS', 'Grande Section', 1, 3),
        ('CP', 'Cours Préparatoire', 2, 4),
        ('CE1', 'Cours Élémentaire 1', 2, 5),
        ('CE2', 'Cours Élémentaire 2', 2, 6),
        ('CM1', 'Cours Moyen 1', 3, 7),
        ('CM2', 'Cours Moyen 2', 3, 8);
    ```

  - [ ] **M004** — `ALTER TABLE appreciations` + DATA MIGRATION 3→4 niveaux
    ```sql
    ALTER TABLE appreciations ADD COLUMN niveau_lsu TEXT DEFAULT NULL
        CHECK(niveau_lsu IN ('non_atteints', 'partiellement_atteints', 'atteints', 'depasses') OR niveau_lsu IS NULL);
    ALTER TABLE appreciations ADD COLUMN previous_observations TEXT DEFAULT NULL;
    -- Migration de données : anciens niveaux V2 → nouveaux niveaux LSU
    UPDATE appreciations SET niveau_lsu = 'non_atteints' WHERE niveau = 'debut';
    UPDATE appreciations SET niveau_lsu = 'partiellement_atteints' WHERE niveau = 'en_cours_acquisition';
    UPDATE appreciations SET niveau_lsu = 'depasses' WHERE niveau = 'maitrise';
    ```

  - [ ] **M005** — `ALTER TABLE domaines_apprentissage` + seed cycle C3
    ```sql
    ALTER TABLE domaines_apprentissage ADD COLUMN cycle INTEGER DEFAULT NULL CHECK(cycle IN (1, 2, 3) OR cycle IS NULL);
    ALTER TABLE domaines_apprentissage ADD COLUMN code_lsu TEXT DEFAULT NULL;
    ALTER TABLE domaines_apprentissage ADD COLUMN is_custom INTEGER DEFAULT 0;
    -- Les domaines V2 existants correspondent au C3 (CM2, École Victor Hugo, Sevran)
    UPDATE domaines_apprentissage SET cycle = 3, is_custom = 0 WHERE cycle IS NULL;
    CREATE INDEX IF NOT EXISTS idx_domaines_cycle ON domaines_apprentissage(cycle);
    ```

  - [ ] **M006** — `ALTER TABLE config_periodes` (ajout annee_id)
    ```sql
    ALTER TABLE config_periodes ADD COLUMN annee_scolaire_id INTEGER DEFAULT NULL REFERENCES annees_scolaires(id);
    CREATE INDEX IF NOT EXISTS idx_periodes_annee_id ON config_periodes(annee_scolaire_id);
    ```

  - [ ] **M007** — `CREATE TABLE appreciations_generales`
    ```sql
    CREATE TABLE IF NOT EXISTS appreciations_generales (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        eleve_id INTEGER NOT NULL REFERENCES students(id) ON DELETE CASCADE,
        periode_id INTEGER NOT NULL REFERENCES config_periodes(id),
        annee_scolaire_id INTEGER REFERENCES annees_scolaires(id),
        texte TEXT NOT NULL CHECK(length(texte) <= 1500),
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(eleve_id, periode_id)
    );
    CREATE INDEX IF NOT EXISTS idx_appgen_eleve ON appreciations_generales(eleve_id);
    CREATE INDEX IF NOT EXISTS idx_appgen_periode ON appreciations_generales(periode_id);
    ```

  - [ ] **M008** — `CREATE TABLE config_lsu`
    ```sql
    CREATE TABLE IF NOT EXISTS config_lsu (
        id INTEGER PRIMARY KEY DEFAULT 1,
        uai TEXT DEFAULT NULL,
        nom_ecole TEXT DEFAULT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE IF NOT EXISTS identifiants_onde (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        eleve_id INTEGER NOT NULL REFERENCES students(id) ON DELETE CASCADE UNIQUE,
        inc TEXT DEFAULT NULL,
        ine TEXT DEFAULT NULL
    );
    ```

- [ ] **Task 5 : Intégrer le runner dans le setup Tauri** (AC: #1, #7)
  - [ ] Appeler `migrations::run_v2_1_migrations(&app_handle)` dans le `.setup()` hook de `tauri::Builder` dans `lib.rs`
  - [ ] S'assurer que l'appel se fait APRÈS que `tauri_plugin_sql` a initialisé la DB (les migrations V2 sont déjà appliquées)
  - [ ] Le runner doit être `async` si nécessaire ou dans un `tauri::async_runtime::spawn`

- [ ] **Task 6 : Tests Rust** (AC: #3, #4, #6, #7)
  - [ ] Test : migrations idempotentes (appel 2x → `user_version` = 9, aucun doublon)
  - [ ] Test : migration M004 data migration (données `debut` → `non_atteints`, etc.)
  - [ ] Test : rollback SAVEPOINT si SQL invalide sur une migration
  - [ ] Test : backup fichier créé avant la première migration

## Dev Notes

### Architecture — Ce que cette story met en place

C'est la **fondation de V2.1**. TOUTES les autres stories (18.2, 18.3, 18.4, Epic 19, 20, 21) dépendent des tables et colonnes créées ici. Ne pas modifier le schéma dans les stories suivantes — tout passe par ces 8 migrations.

### Système de migrations existant (V1+V2)

Le projet utilise `tauri-plugin-sql` avec son propre système de migration basé sur des versions :
- **Versions 0–8** : gérées par `tauri_plugin_sql::Migration` dans `src-tauri/src/lib.rs` lignes 17–179
- **Tracking interne** : le plugin maintient sa propre table interne pour savoir quelles versions sont appliquées
- **NE PAS MODIFIER** ces migrations existantes — elles sont en production

Le système V2.1 est **séparé** et utilise `PRAGMA user_version` pour son propre tracking :
- Version 0 = V2 installé (tauri-plugin-sql a tout créé, user_version non modifié)
- Version 9 = V2.1 migrations appliquées

### Accès direct à SQLite

`tauri-plugin-sql` expose la DB via son abstraction. Pour le backup fichier et les SAVEPOINTs, on a besoin d'un accès au **chemin fichier** et non à la connexion SQL abstrait.

- Chemin DB (Tauri v2) : `app_handle.path().app_data_dir()? / "comportement.db"`
- Backup : `std::fs::copy(db_path, backup_path)`
- Pour les SAVEPOINTs + PRAGMA user_version : utiliser `rusqlite::Connection::open(&db_path)` directement

**Attention** : `rusqlite` et `tauri-plugin-sql` peuvent se retrouver avec 2 connexions SQLite simultanées. Il faut s'assurer que le runner de migration est appelé AVANT que l'application React ouvre des connexions via le plugin (le hook `.setup()` s'exécute avant que la fenêtre soit visible).

Vérifier si `rusqlite` est déjà dans `Cargo.toml` (probable). Sinon l'ajouter :
```toml
rusqlite = { version = "0.31", features = ["bundled"] }
```
Note: `tauri-plugin-sql` utilise `sqlx` en backend, pas `rusqlite`. Vérifier la compatibilité.

### Structure des fichiers à créer

```
src-tauri/src/
  migrations/
    mod.rs        ← runner principal (backup, SAVEPOINT, user_version)
    v2_1.rs       ← définition des 8 migrations (structs + SQL strings)
  lib.rs          ← ajouter `mod migrations;` + appel dans setup()
```

Pattern `mod.rs` (à adapter) :
```rust
use tauri::AppHandle;

pub async fn run_v2_1_migrations(app: &AppHandle) -> Result<(), String> {
    let db_path = app.path().app_data_dir()
        .map_err(|e| e.to_string())?
        .join("comportement.db");

    // Check user_version
    // Backup if needed
    // Run migrations with SAVEPOINTs
    // Emit migration-progress events
    // Set PRAGMA user_version = 9
    Ok(())
}
```

### Events Tauri à émettre

```rust
// Pattern existant dans le projet (voir sidecar/manager.rs)
app.emit("migration-progress", serde_json::json!({
    "current": 1,
    "total": 8,
    "name": "create_annees_scolaires"
})).ok();
```
[Source: architecture-v2.1.md#Communication Patterns]

### Conventions de nommage — OBLIGATOIRE

| Élément | Convention | Exemple |
|---------|-----------|---------|
| Tables SQLite | `snake_case` pluriel | `annees_scolaires`, `config_lsu` |
| Colonnes | `snake_case` | `annee_scolaire_id`, `niveau_lsu` |
| Index | `idx_{table}_{colonne}` | `idx_annees_active` |
| Module Rust | `snake_case` | `migrations/mod.rs` |
| Fonctions Rust | `snake_case` | `run_v2_1_migrations` |

[Source: architecture-v2.1.md#Naming Patterns]

### Pattern d'erreur dans cette story

Les migrations **ne doivent pas bloquer le démarrage**. Si M004 échoue (ROLLBACK SAVEPOINT), l'app démarre quand même avec la V2 normale. Logger l'erreur clairement. L'utilisateur peut relancer.

```rust
match run_migration(&conn, &m) {
    Ok(_) => { /* emit progress event */ }
    Err(e) => {
        eprintln!("Migration {} failed: {}. Rollback applied.", m.name, e);
        conn.execute(&format!("ROLLBACK TO sp_{}", m.name), [])?;
        return Ok(()); // Ne pas bloquer l'app
    }
}
```

### Points de vigilance

1. **SQLite en mode WAL** : le projet l'active peut-être (`PRAGMA journal_mode=WAL`). Les SAVEPOINTs fonctionnent en WAL.
2. **Timing de l'appel** : le runner doit s'exécuter dans le `.setup()` hook, après l'initialisation du plugin SQL, mais avant que la fenêtre WebView soit visible.
3. **Chemin DB sur macOS** : AppData = `~/Library/Application Support/com.comportement.app/` (vérifier `tauri.conf.json` pour le bundle identifier exact).
4. **M005 — Cycle des domaines existants** : les 9 domaines V2 (Français, Maths, etc.) sont assignés au cycle 3 car l'école est CM2. Ce sera modifié manuellement si l'enseignant ajoute des élèves d'autres cycles.
5. **M004 — CHECK constraint** : le nouveau CHECK sur `niveau_lsu` est strict. SQLite n'applique pas les CHECK sur les colonnes existantes sans valeur — OK pour les nouvelles colonnes.
6. **Ancienne colonne `niveau`** : ne PAS supprimer la colonne `niveau` dans ces migrations (additives uniquement). Elle sera dépréciée mais reste présente.

### Project Structure Notes

- **Fichiers existants à NE PAS modifier** : toutes les migrations versions 0–8 dans `lib.rs`
- **Fichiers à créer** : `src-tauri/src/migrations/mod.rs`, `src-tauri/src/migrations/v2_1.rs`
- **Fichier à modifier** : `src-tauri/src/lib.rs` (ajouter `mod migrations;` + appel setup)
- **Cargo.toml** : potentiellement ajouter `rusqlite` si absent

### Commits récents (contexte)

```
9927174 fix: dictée vocale fonctionnelle (permission micro, sidecar, VAD)
3ec8915 feat: flux vocal domaine-par-domaine (Whisper direct, sans LLM)
80e255d feat: Sprint 3 + Sprint 4 complets (Modules 2-3, gestion modèles, polish)
```
→ La V2 est stable. Les tests Rust existants (`cargo test`) doivent passer sans régression.

### Références

- ADR-013 (migrations backup+savepoints) : [Source: architecture-v2.1.md#ADR-013]
- Séquence des 8 migrations : [Source: architecture-v2.1.md#ADR-013]
- Acceptance Criteria story : [Source: epics-v2.1.md#Story 18.1]
- Pattern events Tauri : [Source: architecture-v2.1.md#Communication Patterns]
- Structure modules Rust : [Source: architecture-v2.1.md#Structure Patterns]
- Mapping colonnes BDD : [Source: architecture-v2.1.md#Requirements to Structure Mapping]

## Dev Agent Record

### Agent Model Used

_À remplir par l'agent dev_

### Debug Log References

_À remplir pendant l'implémentation_

### Completion Notes List

_À remplir après implémentation_

### File List

_Fichiers créés/modifiés par l'agent dev :_
- `src-tauri/src/migrations/mod.rs` (NEW)
- `src-tauri/src/migrations/v2_1.rs` (NEW)
- `src-tauri/src/lib.rs` (MODIFIED — `mod migrations` + setup hook)
- `src-tauri/Cargo.toml` (MODIFIED si rusqlite absent)
