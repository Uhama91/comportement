pub mod v2_1;
pub mod v2_1_rev2;

use sqlx::Connection;
use std::path::PathBuf;
use std::sync::atomic::{AtomicBool, Ordering};
use tokio::sync::Mutex;
use tauri::{AppHandle, Emitter, Manager};

/// Guard pour empêcher l'exécution concurrente des migrations (setup + ensure_v2_1_migrations).
static MIGRATION_LOCK: Mutex<()> = Mutex::const_new(());
/// Flag pour savoir si les migrations ont déjà été appliquées avec succès.
static MIGRATIONS_DONE: AtomicBool = AtomicBool::new(false);

/// Version user_version qui marque l'application complète des migrations V2.1
const V2_1_USER_VERSION: i32 = 11;

/// Retourne le chemin du fichier SQLite selon la plateforme.
/// macOS  : ~/Library/Application Support/fr.comportement.app/comportement.db
/// Windows: %LOCALAPPDATA%\fr.comportement.app\comportement.db
pub fn get_db_path(app: &AppHandle) -> Result<PathBuf, String> {
    app.path()
        .app_local_data_dir()
        .map(|dir| dir.join("comportement.db"))
        .map_err(|e| e.to_string())
}

/// Crée une copie de sauvegarde du fichier SQLite avant les migrations.
/// Utilise VACUUM INTO pour garantir un backup cohérent même en mode WAL
/// (les fichiers .db-wal et .db-shm sont intégrés dans le backup).
/// Nom : comportement_backup_{timestamp_unix}.sqlite dans le même dossier.
pub async fn backup_database(db_path: &PathBuf) -> Result<PathBuf, String> {
    let now = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .unwrap_or_default()
        .as_secs();

    // Format YYYYMMDD_HHMMSS lisible pour l'utilisateur
    // Calcul simple sans dépendance chrono (UTC)
    let secs_per_day: u64 = 86400;
    let days = now / secs_per_day;
    let day_secs = now % secs_per_day;
    let hours = day_secs / 3600;
    let minutes = (day_secs % 3600) / 60;
    let seconds = day_secs % 60;

    // Algorithme civil date (days since 1970-01-01)
    let z = days + 719468;
    let era = z / 146097;
    let doe = z - era * 146097;
    let yoe = (doe - doe / 1460 + doe / 36524 - doe / 146096) / 365;
    let y = yoe + era * 400;
    let doy = doe - (365 * yoe + yoe / 4 - yoe / 100);
    let mp = (5 * doy + 2) / 153;
    let d = doy - (153 * mp + 2) / 5 + 1;
    let m = if mp < 10 { mp + 3 } else { mp - 9 };
    let y = if m <= 2 { y + 1 } else { y };

    let backup_name = format!(
        "comportement_backup_{:04}{:02}{:02}_{:02}{:02}{:02}.sqlite",
        y, m, d, hours, minutes, seconds
    );
    let backup_path = db_path
        .parent()
        .ok_or("Impossible de déterminer le dossier parent de la DB")?
        .join(&backup_name);

    // VACUUM INTO produit un backup cohérent en mode WAL (inclut .db-wal/.db-shm)
    let db_url = format!("sqlite:{}", db_path.display());
    let mut conn = sqlx::sqlite::SqliteConnection::connect(&db_url)
        .await
        .map_err(|e| format!("Backup: impossible d'ouvrir la DB : {}", e))?;

    let vacuum_sql = format!("VACUUM INTO '{}'", backup_path.display());
    sqlx::query(&vacuum_sql)
        .execute(&mut conn)
        .await
        .map_err(|e| format!("Échec du backup VACUUM INTO : {}", e))?;

    println!("[migrations] Backup créé (VACUUM INTO) : {}", backup_path.display());
    Ok(backup_path)
}

// ─────────────────────────────────────────────────────────────────────────────
// M013 — Supprimer la contrainte UNIQUE(eleve_id, periode_id) de
//         appreciations_generales pour permettre le versioning multi-lignes.
// ─────────────────────────────────────────────────────────────────────────────

/// Applique M013 si la contrainte UNIQUE(eleve_id, periode_id) est encore présente.
/// Idempotent : si la contrainte est absente (déjà migrée), skip.
pub async fn apply_m013_if_needed(
    conn: &mut sqlx::sqlite::SqliteConnection,
) -> Result<(), String> {
    // Lire le schema de la table pour détecter la contrainte UNIQUE
    let schema_sql: Option<String> = sqlx::query_scalar(
        "SELECT sql FROM sqlite_master WHERE type='table' AND name='appreciations_generales'",
    )
    .fetch_optional(&mut *conn)
    .await
    .map_err(|e| format!("M013: erreur lecture schema: {}", e))?;

    // Si la table n'existe pas encore → skip (sera créée par M007)
    // Si UNIQUE absent du schema → déjà migrée → skip
    let needs_migration = schema_sql
        .as_deref()
        .map(|s| s.to_uppercase().contains("UNIQUE"))
        .unwrap_or(false);

    if needs_migration {
        // SAVEPOINT pour rendre l'opération atomique (ADR-013)
        sqlx::query("SAVEPOINT sp_m013")
            .execute(&mut *conn)
            .await
            .map_err(|e| format!("M013 SAVEPOINT: {}", e))?;

        // Pattern rename-copy-drop-rename (SQLite ne supporte pas DROP CONSTRAINT)
        let stmts = [
            "CREATE TABLE appreciations_generales_new (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                eleve_id INTEGER NOT NULL REFERENCES students(id) ON DELETE CASCADE,
                periode_id INTEGER NOT NULL REFERENCES config_periodes(id),
                annee_scolaire_id INTEGER REFERENCES annees_scolaires(id),
                texte TEXT NOT NULL CHECK(length(texte) <= 1500),
                version INTEGER NOT NULL DEFAULT 1,
                generated_by TEXT DEFAULT 'manual' CHECK(generated_by IN ('llm', 'manual')),
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )",
            "INSERT OR IGNORE INTO appreciations_generales_new
                (id, eleve_id, periode_id, annee_scolaire_id, texte, version, generated_by, created_at)
             SELECT id, eleve_id, periode_id, annee_scolaire_id, texte,
                    COALESCE(version,1), COALESCE(generated_by,'manual'), created_at
             FROM appreciations_generales",
            "DROP TABLE appreciations_generales",
            "ALTER TABLE appreciations_generales_new RENAME TO appreciations_generales",
        ];

        let mut m013_ok = true;
        for stmt in &stmts {
            if let Err(e) = sqlx::query(stmt).execute(&mut *conn).await {
                eprintln!("[migrations] M013 erreur : {}", e);
                m013_ok = false;
                break;
            }
        }

        if m013_ok {
            sqlx::query("RELEASE sp_m013")
                .execute(&mut *conn)
                .await
                .map_err(|e| format!("M013 RELEASE: {}", e))?;
            println!("[migrations] M013 appliquée : UNIQUE(eleve_id, periode_id) supprimée.");
        } else {
            let _ = sqlx::query("ROLLBACK TO SAVEPOINT sp_m013")
                .execute(&mut *conn)
                .await;
            let _ = sqlx::query("RELEASE sp_m013")
                .execute(&mut *conn)
                .await;
            return Err("M013 échouée → rollback. Table appreciations_generales intacte.".into());
        }
    } else {
        println!("[migrations] M013 skip : contrainte UNIQUE absente (déjà migrée).");
    }

    // Toujours créer les index (IF NOT EXISTS = idempotent)
    let idx_stmts = [
        "CREATE INDEX IF NOT EXISTS idx_appgen_eleve ON appreciations_generales(eleve_id)",
        "CREATE INDEX IF NOT EXISTS idx_appgen_periode ON appreciations_generales(periode_id)",
        "CREATE INDEX IF NOT EXISTS idx_appgen_annee ON appreciations_generales(annee_scolaire_id)",
        "CREATE INDEX IF NOT EXISTS idx_appgen_version ON appreciations_generales(eleve_id, periode_id, annee_scolaire_id, version)",
    ];
    for stmt in &idx_stmts {
        sqlx::query(stmt)
            .execute(&mut *conn)
            .await
            .map_err(|e| format!("M013 index: {}", e))?;
    }

    Ok(())
}

/// Point d'entrée principal : vérifie et applique les migrations V2→V2.1.
///
/// Logique :
/// 1. Si le fichier DB n'existe pas → skip (fresh install, plugin pas encore initialisé)
/// 2. Si la table `students` n'existe pas → skip (même raison)
/// 3. Si PRAGMA user_version >= 11 → déjà appliqué, idempotent
/// 4. Sinon : backup + 12 migrations M001-M012 avec SAVEPOINT + M013 conditionnel + PRAGMA user_version = 11
pub async fn run_v2_1_migrations(app: &AppHandle) -> Result<(), String> {
    // Fast path : si déjà fait, skip immédiatement
    if MIGRATIONS_DONE.load(Ordering::Acquire) {
        println!("[migrations] Migrations V2.1 déjà complétées (fast path).");
        return Ok(());
    }

    // Lock pour empêcher l'exécution concurrente (setup vs ensure_v2_1_migrations)
    let _guard = MIGRATION_LOCK.lock().await;

    // Double-check après acquisition du lock
    if MIGRATIONS_DONE.load(Ordering::Acquire) {
        println!("[migrations] Migrations V2.1 déjà complétées (après lock).");
        return Ok(());
    }

    let db_path = get_db_path(app)?;

    // Cas fresh install : fichier DB pas encore créé par tauri-plugin-sql
    if !db_path.exists() {
        println!("[migrations] DB absente, migrations V2.1 différées.");
        return Ok(());
    }

    let db_url = format!("sqlite:{}", db_path.display());

    let mut conn: sqlx::sqlite::SqliteConnection =
        sqlx::sqlite::SqliteConnection::connect(&db_url)
            .await
            .map_err(|e| format!("Impossible d'ouvrir la DB pour les migrations : {}", e))?;

    // Vérifier que le schéma V2 existe (table students = indicateur)
    let students_exists: i64 =
        sqlx::query_scalar::<_, i64>(
            "SELECT COUNT(*) FROM sqlite_master WHERE type='table' AND name='students'",
        )
        .fetch_one(&mut conn)
        .await
        .map_err(|e| format!("Impossible de vérifier les tables V2 : {}", e))?;

    if students_exists == 0 {
        println!("[migrations] Schéma V2 absent, migrations V2.1 différées.");
        return Ok(());
    }

    // Vérifier si les migrations V2.1 ont déjà été appliquées
    let user_version: i32 = sqlx::query_scalar::<_, i32>("PRAGMA user_version")
        .fetch_one(&mut conn)
        .await
        .map_err(|e| format!("Impossible de lire PRAGMA user_version : {}", e))?;

    if user_version >= V2_1_USER_VERSION {
        MIGRATIONS_DONE.store(true, Ordering::Release);
        println!("[migrations] Migrations V2.1 déjà appliquées (user_version={}).", user_version);
        return Ok(());
    }

    println!(
        "[migrations] Démarrage migrations V2.1 (user_version actuel={}).",
        user_version
    );

    // Backup avant toute modification (VACUUM INTO = cohérent en mode WAL)
    backup_database(&db_path).await?;

    // Appliquer les 8 migrations V2.1 avec SAVEPOINT
    let migrations = v2_1::migrations();
    let migrations_rev2 = v2_1_rev2::migrations();
    let total = migrations.len() + migrations_rev2.len();

    for (i, migration) in migrations.iter().enumerate() {
        let sp_name = format!("sp_{}", migration.name);

        // Poser le SAVEPOINT
        sqlx::query(&format!("SAVEPOINT {}", sp_name))
            .execute(&mut conn)
            .await
            .map_err(|e| {
                format!(
                    "Impossible de poser le SAVEPOINT {} : {}",
                    sp_name, e
                )
            })?;

        // Exécuter chaque statement de la migration
        let mut migration_ok = true;
        for statement in migration.statements {
            let stmt = statement.trim();
            if stmt.is_empty() {
                continue;
            }
            if let Err(e) = sqlx::query(stmt).execute(&mut conn).await {
                eprintln!(
                    "[migrations] Erreur dans {} : {}",
                    migration.name, e
                );
                migration_ok = false;
                break;
            }
        }

        if migration_ok {
            // RELEASE = commit du savepoint vers la transaction parente
            sqlx::query(&format!("RELEASE {}", sp_name))
                .execute(&mut conn)
                .await
                .map_err(|e| {
                    format!("RELEASE SAVEPOINT {} échoué : {}", sp_name, e)
                })?;

            println!(
                "[migrations] ✓ {} ({}/{}) appliquée.",
                migration.name,
                i + 1,
                total
            );

            // Émettre l'événement de progression vers le frontend
            let _ = app.emit(
                "migration-progress",
                serde_json::json!({
                    "current": i + 1,
                    "total": total,
                    "name": migration.name,
                }),
            );
        } else {
            // Rollback de ce savepoint uniquement
            let _ = sqlx::query(&format!("ROLLBACK TO SAVEPOINT {}", sp_name))
                .execute(&mut conn)
                .await;
            // Release pour nettoyer le savepoint après rollback
            let _ = sqlx::query(&format!("RELEASE {}", sp_name))
                .execute(&mut conn)
                .await;

            eprintln!(
                "[migrations] Migration {} en échec → rollback. Migrations V2.1 interrompues.",
                migration.name
            );
            // Ne pas bloquer le démarrage de l'application
            return Ok(());
        }
    }

    // Appliquer les 4 migrations V2.1-rev2 avec SAVEPOINT (même pattern)
    let offset = migrations.len();
    for (i, migration) in migrations_rev2.iter().enumerate() {
        let sp_name = format!("sp_{}", migration.name);

        sqlx::query(&format!("SAVEPOINT {}", sp_name))
            .execute(&mut conn)
            .await
            .map_err(|e| {
                format!(
                    "Impossible de poser le SAVEPOINT {} : {}",
                    sp_name, e
                )
            })?;

        let mut migration_ok = true;
        for statement in migration.statements {
            let stmt = statement.trim();
            if stmt.is_empty() {
                continue;
            }
            if let Err(e) = sqlx::query(stmt).execute(&mut conn).await {
                eprintln!(
                    "[migrations] Erreur dans {} : {}",
                    migration.name, e
                );
                migration_ok = false;
                break;
            }
        }

        if migration_ok {
            sqlx::query(&format!("RELEASE {}", sp_name))
                .execute(&mut conn)
                .await
                .map_err(|e| {
                    format!("RELEASE SAVEPOINT {} échoué : {}", sp_name, e)
                })?;

            println!(
                "[migrations] ✓ {} ({}/{}) appliquée.",
                migration.name,
                offset + i + 1,
                total
            );

            let _ = app.emit(
                "migration-progress",
                serde_json::json!({
                    "current": offset + i + 1,
                    "total": total,
                    "name": migration.name,
                }),
            );
        } else {
            let _ = sqlx::query(&format!("ROLLBACK TO SAVEPOINT {}", sp_name))
                .execute(&mut conn)
                .await;
            let _ = sqlx::query(&format!("RELEASE {}", sp_name))
                .execute(&mut conn)
                .await;

            eprintln!(
                "[migrations] Migration {} en échec → rollback. Migrations V2.1 interrompues.",
                migration.name
            );
            return Ok(());
        }
    }

    // M013 — Supprimer UNIQUE(eleve_id, periode_id) de appreciations_generales
    apply_m013_if_needed(&mut conn).await?;

    // Marquer les migrations comme appliquées
    sqlx::query(&format!("PRAGMA user_version = {}", V2_1_USER_VERSION))
        .execute(&mut conn)
        .await
        .map_err(|e| format!("Impossible de mettre à jour PRAGMA user_version : {}", e))?;

    // Marquer comme fait pour le fast path
    MIGRATIONS_DONE.store(true, Ordering::Release);

    println!(
        "[migrations] ✅ Toutes les migrations V2.1 appliquées (user_version={}).",
        V2_1_USER_VERSION
    );
    Ok(())
}

// ─────────────────────────────────────────────────────────────────────────────
// Tests
// ─────────────────────────────────────────────────────────────────────────────

#[cfg(test)]
mod tests {
    use super::*;
    use std::path::Path;

    /// Crée une DB SQLite temporaire avec le schéma V2 minimal nécessaire aux tests.
    async fn setup_v2_db_file(path: &Path) -> sqlx::sqlite::SqliteConnection {
        let url = format!("sqlite:{}", path.display());
        let mut conn = sqlx::sqlite::SqliteConnection::connect(&url)
            .await
            .expect("Impossible de créer la DB de test");

        // Schéma V2 minimal (tables nécessaires aux migrations V2.1)
        sqlx::query(
            "CREATE TABLE IF NOT EXISTS students (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                first_name TEXT NOT NULL,
                warnings INTEGER DEFAULT 0,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )",
        )
        .execute(&mut conn)
        .await
        .unwrap();

        sqlx::query(
            "CREATE TABLE IF NOT EXISTS config_periodes (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                annee_scolaire TEXT NOT NULL,
                type_periode TEXT NOT NULL,
                numero INTEGER NOT NULL,
                date_debut DATE NOT NULL,
                date_fin DATE NOT NULL,
                nom_affichage TEXT,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )",
        )
        .execute(&mut conn)
        .await
        .unwrap();

        sqlx::query(
            "CREATE TABLE IF NOT EXISTS domaines_apprentissage (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                nom TEXT NOT NULL UNIQUE,
                ordre_affichage INTEGER DEFAULT 0,
                actif INTEGER DEFAULT 1,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )",
        )
        .execute(&mut conn)
        .await
        .unwrap();

        sqlx::query(
            "CREATE TABLE IF NOT EXISTS appreciations (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                eleve_id INTEGER NOT NULL REFERENCES students(id) ON DELETE CASCADE,
                periode_id INTEGER NOT NULL REFERENCES config_periodes(id),
                domaine_id INTEGER NOT NULL REFERENCES domaines_apprentissage(id),
                niveau TEXT,
                observations TEXT,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )",
        )
        .execute(&mut conn)
        .await
        .unwrap();

        conn
    }

    /// Applique les migrations V2.1 + V2.1-rev2 directement via sqlx (sans AppHandle).
    async fn apply_migrations_direct(conn: &mut sqlx::sqlite::SqliteConnection) -> bool {
        let migrations = v2_1::migrations();
        let migrations_rev2 = v2_1_rev2::migrations();
        let total = migrations.len() + migrations_rev2.len();

        // Chaîner les deux vecs de migrations
        let all: Vec<(&str, &[&str])> = migrations
            .iter()
            .map(|m| (m.name, m.statements))
            .chain(migrations_rev2.iter().map(|m| (m.name, m.statements)))
            .collect();

        for (i, (name, statements)) in all.iter().enumerate() {
            let sp_name = format!("sp_{}", name);

            sqlx::query(&format!("SAVEPOINT {}", sp_name))
                .execute(&mut *conn)
                .await
                .unwrap();

            let mut ok = true;
            for stmt in *statements {
                let s = stmt.trim();
                if s.is_empty() {
                    continue;
                }
                if let Err(e) = sqlx::query(s).execute(&mut *conn).await {
                    eprintln!("Migration {} échouée: {}", name, e);
                    ok = false;
                    break;
                }
            }

            if ok {
                sqlx::query(&format!("RELEASE {}", sp_name))
                    .execute(&mut *conn)
                    .await
                    .unwrap();
                println!("✓ {} ({}/{})", name, i + 1, total);
            } else {
                let _ = sqlx::query(&format!("ROLLBACK TO SAVEPOINT {}", sp_name))
                    .execute(&mut *conn)
                    .await;
                let _ = sqlx::query(&format!("RELEASE {}", sp_name))
                    .execute(&mut *conn)
                    .await;
                return false;
            }
        }

        // M013 — Supprimer UNIQUE(eleve_id, periode_id) de appreciations_generales
        apply_m013_if_needed(conn).await.expect("M013 doit s'appliquer");

        sqlx::query(&format!("PRAGMA user_version = {}", V2_1_USER_VERSION))
            .execute(&mut *conn)
            .await
            .unwrap();

        true
    }

    #[tokio::test]
    async fn test_migrations_apply_successfully() {
        let tmp = tempfile::NamedTempFile::new().unwrap();
        let path = tmp.path().to_path_buf();

        let mut conn = setup_v2_db_file(&path).await;
        let ok = apply_migrations_direct(&mut conn).await;
        assert!(ok, "Les migrations V2.1 doivent s'appliquer sans erreur");

        // Vérifier user_version = 10
        let version: i32 = sqlx::query_scalar("PRAGMA user_version")
            .fetch_one(&mut conn)
            .await
            .unwrap();
        assert_eq!(version, V2_1_USER_VERSION, "PRAGMA user_version doit valoir 11");
    }

    #[tokio::test]
    async fn test_migrations_idempotent() {
        let tmp = tempfile::NamedTempFile::new().unwrap();
        let path = tmp.path().to_path_buf();

        let mut conn = setup_v2_db_file(&path).await;

        // Première application
        let ok1 = apply_migrations_direct(&mut conn).await;
        assert!(ok1, "Première application doit réussir");

        // Deuxième application doit être un no-op (user_version >= 9)
        let version: i32 = sqlx::query_scalar("PRAGMA user_version")
            .fetch_one(&mut conn)
            .await
            .unwrap();
        assert_eq!(version, V2_1_USER_VERSION);

        // Rejouer uniquement le check user_version (simule ce que fait run_v2_1_migrations)
        let version_after: i32 = sqlx::query_scalar("PRAGMA user_version")
            .fetch_one(&mut conn)
            .await
            .unwrap();
        assert!(
            version_after >= V2_1_USER_VERSION,
            "user_version ne doit pas régresser"
        );

        // Vérifier absence de doublons dans niveaux_classe
        let count: i64 = sqlx::query_scalar("SELECT COUNT(*) FROM niveaux_classe")
            .fetch_one(&mut conn)
            .await
            .unwrap();
        assert_eq!(count, 8, "Exactement 8 niveaux scolaires attendus");
    }

    #[tokio::test]
    async fn test_m004_data_migration_3_to_4_niveaux() {
        let tmp = tempfile::NamedTempFile::new().unwrap();
        let path = tmp.path().to_path_buf();

        let mut conn = setup_v2_db_file(&path).await;

        // Insérer des données V2 avec les 3 anciens niveaux
        sqlx::query(
            "INSERT INTO students (first_name) VALUES ('Alice'), ('Bob'), ('Charlie')",
        )
        .execute(&mut conn)
        .await
        .unwrap();

        sqlx::query(
            "INSERT INTO domaines_apprentissage (nom) VALUES ('Français')",
        )
        .execute(&mut conn)
        .await
        .unwrap();

        sqlx::query(
            "INSERT INTO config_periodes (annee_scolaire, type_periode, numero, date_debut, date_fin)
             VALUES ('2025-2026', 'trimestre', 1, '2025-09-01', '2025-12-20')",
        )
        .execute(&mut conn)
        .await
        .unwrap();

        // Insérer des appréciations V2 avec les 3 anciens niveaux
        sqlx::query(
            "INSERT INTO appreciations (eleve_id, periode_id, domaine_id, niveau)
             VALUES (1, 1, 1, 'debut'), (2, 1, 1, 'en_cours_acquisition'), (3, 1, 1, 'maitrise')",
        )
        .execute(&mut conn)
        .await
        .unwrap();

        // Appliquer les migrations
        let ok = apply_migrations_direct(&mut conn).await;
        assert!(ok, "Les migrations doivent réussir");

        // Vérifier la migration des données
        let niveau_lsu_alice: Option<String> =
            sqlx::query_scalar("SELECT niveau_lsu FROM appreciations WHERE eleve_id = 1")
                .fetch_one(&mut conn)
                .await
                .unwrap();
        assert_eq!(
            niveau_lsu_alice.as_deref(),
            Some("non_atteints"),
            "'debut' doit devenir 'non_atteints'"
        );

        let niveau_lsu_bob: Option<String> =
            sqlx::query_scalar("SELECT niveau_lsu FROM appreciations WHERE eleve_id = 2")
                .fetch_one(&mut conn)
                .await
                .unwrap();
        assert_eq!(
            niveau_lsu_bob.as_deref(),
            Some("partiellement_atteints"),
            "'en_cours_acquisition' doit devenir 'partiellement_atteints'"
        );

        let niveau_lsu_charlie: Option<String> =
            sqlx::query_scalar("SELECT niveau_lsu FROM appreciations WHERE eleve_id = 3")
                .fetch_one(&mut conn)
                .await
                .unwrap();
        assert_eq!(
            niveau_lsu_charlie.as_deref(),
            Some("depasses"),
            "'maitrise' doit devenir 'depasses'"
        );

        // Vérifier la présence de previous_observations
        let has_col: i64 = sqlx::query_scalar(
            "SELECT COUNT(*) FROM pragma_table_info('appreciations') WHERE name='previous_observations'",
        )
        .fetch_one(&mut conn)
        .await
        .unwrap();
        assert_eq!(has_col, 1, "La colonne previous_observations doit exister");
    }

    #[tokio::test]
    async fn test_backup_database_creates_file() {
        let dir = tempfile::tempdir().unwrap();
        let db_path = dir.path().join("test.sqlite");

        // Créer une vraie DB SQLite (VACUUM INTO nécessite un fichier SQLite valide)
        let url = format!("sqlite:{}?mode=rwc", db_path.display());
        let mut conn = sqlx::sqlite::SqliteConnection::connect(&url)
            .await
            .unwrap();
        sqlx::query("CREATE TABLE test_table (id INTEGER PRIMARY KEY)")
            .execute(&mut conn)
            .await
            .unwrap();
        sqlx::query("INSERT INTO test_table (id) VALUES (1), (2), (3)")
            .execute(&mut conn)
            .await
            .unwrap();
        drop(conn);

        let result = backup_database(&db_path).await;
        assert!(result.is_ok(), "Le backup doit réussir");

        let backup_path = result.unwrap();
        assert!(backup_path.exists(), "Le fichier backup doit exister");
        assert_ne!(backup_path, db_path, "Le backup doit avoir un nom différent");

        // Vérifier que le backup contient les données
        let backup_url = format!("sqlite:{}", backup_path.display());
        let mut backup_conn = sqlx::sqlite::SqliteConnection::connect(&backup_url)
            .await
            .unwrap();
        let count: i64 = sqlx::query_scalar("SELECT COUNT(*) FROM test_table")
            .fetch_one(&mut backup_conn)
            .await
            .unwrap();
        assert_eq!(count, 3, "Le backup doit contenir les 3 lignes insérées");
    }

    #[tokio::test]
    async fn test_rollback_on_invalid_sql() {
        let tmp = tempfile::NamedTempFile::new().unwrap();
        let path = tmp.path().to_path_buf();

        let mut conn = setup_v2_db_file(&path).await;

        // Test SAVEPOINT + ROLLBACK avec SQL invalide
        sqlx::query("SAVEPOINT sp_test").execute(&mut conn).await.unwrap();
        sqlx::query("CREATE TABLE test_rollback (id INTEGER PRIMARY KEY)")
            .execute(&mut conn)
            .await
            .unwrap();

        // Vérifier la table existe dans le savepoint
        let exists: i64 = sqlx::query_scalar(
            "SELECT COUNT(*) FROM sqlite_master WHERE name='test_rollback'",
        )
        .fetch_one(&mut conn)
        .await
        .unwrap();
        assert_eq!(exists, 1);

        // Rollback au savepoint
        sqlx::query("ROLLBACK TO SAVEPOINT sp_test")
            .execute(&mut conn)
            .await
            .unwrap();
        sqlx::query("RELEASE sp_test").execute(&mut conn).await.unwrap();

        // La table ne doit plus exister
        let exists_after: i64 = sqlx::query_scalar(
            "SELECT COUNT(*) FROM sqlite_master WHERE name='test_rollback'",
        )
        .fetch_one(&mut conn)
        .await
        .unwrap();
        assert_eq!(
            exists_after, 0,
            "ROLLBACK TO SAVEPOINT doit annuler les changements"
        );
    }

    #[tokio::test]
    async fn test_all_v2_1_tables_created() {
        let tmp = tempfile::NamedTempFile::new().unwrap();
        let path = tmp.path().to_path_buf();

        let mut conn = setup_v2_db_file(&path).await;
        let ok = apply_migrations_direct(&mut conn).await;
        assert!(ok);

        let expected_tables = [
            "annees_scolaires",
            "niveaux_classe",
            "appreciations_generales",
            "config_lsu",
            "identifiants_onde",
            "evenements_pedagogiques",
            "syntheses_lsu",
            "absences_v2",
        ];

        for table in &expected_tables {
            let count: i64 = sqlx::query_scalar(&format!(
                "SELECT COUNT(*) FROM sqlite_master WHERE type='table' AND name='{}'",
                table
            ))
            .fetch_one(&mut conn)
            .await
            .unwrap();
            assert_eq!(count, 1, "La table '{}' doit exister après migrations", table);
        }
    }

    #[tokio::test]
    async fn test_students_new_columns_exist() {
        let tmp = tempfile::NamedTempFile::new().unwrap();
        let path = tmp.path().to_path_buf();

        let mut conn = setup_v2_db_file(&path).await;
        apply_migrations_direct(&mut conn).await;

        let expected_cols = ["niveau", "annee_scolaire_id", "ine"];
        for col in &expected_cols {
            let count: i64 = sqlx::query_scalar(&format!(
                "SELECT COUNT(*) FROM pragma_table_info('students') WHERE name='{}'",
                col
            ))
            .fetch_one(&mut conn)
            .await
            .unwrap();
            assert_eq!(
                count, 1,
                "La colonne '{}' doit exister dans students",
                col
            );
        }
    }

    #[tokio::test]
    async fn test_rev2_columns_exist() {
        let tmp = tempfile::NamedTempFile::new().unwrap();
        let path = tmp.path().to_path_buf();

        let mut conn = setup_v2_db_file(&path).await;
        let ok = apply_migrations_direct(&mut conn).await;
        assert!(ok);

        // evenements_pedagogiques : uuid, type, source
        let evt_cols = ["uuid", "type", "source", "texte_dictation", "synced_at"];
        for col in &evt_cols {
            let count: i64 = sqlx::query_scalar(&format!(
                "SELECT COUNT(*) FROM pragma_table_info('evenements_pedagogiques') WHERE name='{}'",
                col
            ))
            .fetch_one(&mut conn)
            .await
            .unwrap();
            assert_eq!(count, 1, "Colonne '{}' doit exister dans evenements_pedagogiques", col);
        }

        // absences_v2 : demi_journee, type_absence
        let abs_cols = ["demi_journee", "type_absence", "retard"];
        for col in &abs_cols {
            let count: i64 = sqlx::query_scalar(&format!(
                "SELECT COUNT(*) FROM pragma_table_info('absences_v2') WHERE name='{}'",
                col
            ))
            .fetch_one(&mut conn)
            .await
            .unwrap();
            assert_eq!(count, 1, "Colonne '{}' doit exister dans absences_v2", col);
        }

        // appreciations_generales : version, generated_by (ajoutés par M012)
        let ag_cols = ["version", "generated_by"];
        for col in &ag_cols {
            let count: i64 = sqlx::query_scalar(&format!(
                "SELECT COUNT(*) FROM pragma_table_info('appreciations_generales') WHERE name='{}'",
                col
            ))
            .fetch_one(&mut conn)
            .await
            .unwrap();
            assert_eq!(count, 1, "Colonne '{}' doit exister dans appreciations_generales", col);
        }

        // syntheses_lsu : version, generated_by
        let synth_cols = ["version", "generated_by", "texte"];
        for col in &synth_cols {
            let count: i64 = sqlx::query_scalar(&format!(
                "SELECT COUNT(*) FROM pragma_table_info('syntheses_lsu') WHERE name='{}'",
                col
            ))
            .fetch_one(&mut conn)
            .await
            .unwrap();
            assert_eq!(count, 1, "Colonne '{}' doit exister dans syntheses_lsu", col);
        }
    }

    #[tokio::test]
    async fn test_m013_removes_unique_constraint() {
        let tmp = tempfile::NamedTempFile::new().unwrap();
        let path = tmp.path().to_path_buf();

        let mut conn = setup_v2_db_file(&path).await;
        let ok = apply_migrations_direct(&mut conn).await;
        assert!(ok, "Les migrations doivent s'appliquer");

        // Vérifier que UNIQUE(eleve_id, periode_id) n'est plus dans le schema
        let schema_sql: Option<String> = sqlx::query_scalar(
            "SELECT sql FROM sqlite_master WHERE type='table' AND name='appreciations_generales'",
        )
        .fetch_optional(&mut conn)
        .await
        .unwrap();

        let schema = schema_sql.expect("La table appreciations_generales doit exister");
        assert!(
            !schema.to_uppercase().contains("UNIQUE"),
            "UNIQUE(eleve_id, periode_id) ne doit plus être dans le schema après M013 : {}",
            schema
        );

        // Vérifier que idx_appgen_version existe
        let idx_count: i64 = sqlx::query_scalar(
            "SELECT COUNT(*) FROM sqlite_master WHERE type='index' AND name='idx_appgen_version'",
        )
        .fetch_one(&mut conn)
        .await
        .unwrap();
        assert_eq!(idx_count, 1, "Index idx_appgen_version doit exister après M013");

        // Vérifier que plusieurs lignes avec même (eleve_id, periode_id) sont maintenant possibles
        sqlx::query("INSERT INTO annees_scolaires (label, date_debut, date_fin, active, cloturee) VALUES ('2025-2026', '2025-09-01', '2026-07-05', 1, 0)")
            .execute(&mut conn).await.unwrap();
        sqlx::query("INSERT INTO students (first_name) VALUES ('Alice')")
            .execute(&mut conn).await.unwrap();
        sqlx::query("INSERT INTO config_periodes (annee_scolaire, type_periode, numero, date_debut, date_fin) VALUES ('2025-2026', 'trimestre', 1, '2025-09-01', '2025-12-20')")
            .execute(&mut conn).await.unwrap();

        let insert1 = sqlx::query(
            "INSERT INTO appreciations_generales (eleve_id, periode_id, annee_scolaire_id, texte, version, generated_by) VALUES (1, 1, 1, 'v1', 1, 'llm')",
        )
        .execute(&mut conn)
        .await;
        assert!(insert1.is_ok(), "Premier insert doit réussir");

        let insert2 = sqlx::query(
            "INSERT INTO appreciations_generales (eleve_id, periode_id, annee_scolaire_id, texte, version, generated_by) VALUES (1, 1, 1, 'v2', 2, 'manual')",
        )
        .execute(&mut conn)
        .await;
        assert!(
            insert2.is_ok(),
            "Deuxième insert avec même (eleve_id, periode_id) doit réussir sans UNIQUE : {:?}",
            insert2.err()
        );
    }
}
