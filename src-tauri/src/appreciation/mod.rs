/// Module Appreciation Générale — LSU Vivant (ADR-015, ADR-017, Story 25.4)
///
/// CRUD sur appreciations_generales : sauvegarde versionnée (sans UNIQUE après M013),
/// chargement courant, historique 5 versions, restauration d'une ancienne version.

use serde::{Deserialize, Serialize};
use sqlx::Connection;

use crate::annee::check_annee_not_closed_impl;
use crate::migrations::get_db_path;

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AppreciationRow {
    pub id: i64,
    pub eleve_id: i64,
    pub periode_id: i64,
    pub annee_scolaire_id: i64,
    pub version: i64,
    pub texte: String,
    pub generated_by: String,
    pub created_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AppreciationVersion {
    pub id: i64,
    pub version: i64,
    pub texte: String,
    pub generated_by: String,
    pub created_at: String,
}

// ─────────────────────────────────────────────────────────────────────────────
// Row mapping
// ─────────────────────────────────────────────────────────────────────────────

#[derive(Debug, sqlx::FromRow)]
struct AppreciationDbRow {
    id: i64,
    eleve_id: i64,
    periode_id: i64,
    annee_scolaire_id: i64,
    version: i64,
    texte: String,
    generated_by: String,
    created_at: String,
}

impl From<AppreciationDbRow> for AppreciationRow {
    fn from(r: AppreciationDbRow) -> Self {
        AppreciationRow {
            id: r.id,
            eleve_id: r.eleve_id,
            periode_id: r.periode_id,
            annee_scolaire_id: r.annee_scolaire_id,
            version: r.version,
            texte: r.texte,
            generated_by: r.generated_by,
            created_at: r.created_at,
        }
    }
}

#[derive(Debug, sqlx::FromRow)]
struct AppreciationVersionDbRow {
    id: i64,
    version: i64,
    texte: String,
    generated_by: String,
    created_at: String,
}

impl From<AppreciationVersionDbRow> for AppreciationVersion {
    fn from(r: AppreciationVersionDbRow) -> Self {
        AppreciationVersion {
            id: r.id,
            version: r.version,
            texte: r.texte,
            generated_by: r.generated_by,
            created_at: r.created_at,
        }
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// Impls (testables, prennent une connexion)
// ─────────────────────────────────────────────────────────────────────────────

/// Sauvegarde une appréciation générale (nouvelle version).
/// Version = max existante + 1, cleanup garde les 5 dernières.
pub async fn save_appreciation_impl(
    conn: &mut sqlx::sqlite::SqliteConnection,
    eleve_id: i64,
    periode_id: i64,
    annee_scolaire_id: i64,
    texte: &str,
    generated_by: &str,
) -> Result<AppreciationRow, String> {
    check_annee_not_closed_impl(conn, annee_scolaire_id).await?;

    // Get current max version for this combo
    let max_version: Option<i64> = sqlx::query_scalar(
        "SELECT MAX(version) FROM appreciations_generales
         WHERE eleve_id = ? AND periode_id = ? AND annee_scolaire_id = ?",
    )
    .bind(eleve_id)
    .bind(periode_id)
    .bind(annee_scolaire_id)
    .fetch_optional(&mut *conn)
    .await
    .map_err(|e| format!("Erreur lecture version max : {}", e))?
    .flatten();

    let next_version = max_version.unwrap_or(0) + 1;

    // Insert new version
    let insert_id = sqlx::query(
        "INSERT INTO appreciations_generales (eleve_id, periode_id, annee_scolaire_id, version, texte, generated_by)
         VALUES (?, ?, ?, ?, ?, ?)",
    )
    .bind(eleve_id)
    .bind(periode_id)
    .bind(annee_scolaire_id)
    .bind(next_version)
    .bind(texte)
    .bind(generated_by)
    .execute(&mut *conn)
    .await
    .map_err(|e| format!("Erreur insertion appréciation : {}", e))?
    .last_insert_rowid();

    // Cleanup: keep only 5 most recent versions
    sqlx::query(
        "DELETE FROM appreciations_generales
         WHERE eleve_id = ? AND periode_id = ? AND annee_scolaire_id = ?
           AND id NOT IN (
             SELECT id FROM appreciations_generales
             WHERE eleve_id = ? AND periode_id = ? AND annee_scolaire_id = ?
             ORDER BY version DESC LIMIT 5
           )",
    )
    .bind(eleve_id)
    .bind(periode_id)
    .bind(annee_scolaire_id)
    .bind(eleve_id)
    .bind(periode_id)
    .bind(annee_scolaire_id)
    .execute(&mut *conn)
    .await
    .map_err(|e| format!("Erreur cleanup appréciations : {}", e))?;

    // Return inserted row
    let row: AppreciationDbRow = sqlx::query_as(
        "SELECT id, eleve_id, periode_id, annee_scolaire_id, version, texte, generated_by, created_at
         FROM appreciations_generales WHERE id = ?",
    )
    .bind(insert_id)
    .fetch_one(&mut *conn)
    .await
    .map_err(|e| format!("Erreur lecture appréciation insérée : {}", e))?;

    Ok(row.into())
}

/// Charge la version courante (la plus récente) d'une appréciation générale.
pub async fn load_appreciation_current_impl(
    conn: &mut sqlx::sqlite::SqliteConnection,
    eleve_id: i64,
    periode_id: i64,
    annee_scolaire_id: i64,
) -> Result<Option<AppreciationRow>, String> {
    let row: Option<AppreciationDbRow> = sqlx::query_as(
        "SELECT id, eleve_id, periode_id, annee_scolaire_id, version, texte, generated_by, created_at
         FROM appreciations_generales
         WHERE eleve_id = ? AND periode_id = ? AND annee_scolaire_id = ?
         ORDER BY version DESC LIMIT 1",
    )
    .bind(eleve_id)
    .bind(periode_id)
    .bind(annee_scolaire_id)
    .fetch_optional(&mut *conn)
    .await
    .map_err(|e| format!("Erreur chargement appréciation courante : {}", e))?;

    Ok(row.map(|r| r.into()))
}

/// Charge l'historique des versions (max 5, DESC).
pub async fn load_appreciation_versions_impl(
    conn: &mut sqlx::sqlite::SqliteConnection,
    eleve_id: i64,
    periode_id: i64,
    annee_scolaire_id: i64,
) -> Result<Vec<AppreciationVersion>, String> {
    let rows: Vec<AppreciationVersionDbRow> = sqlx::query_as(
        "SELECT id, version, texte, generated_by, created_at
         FROM appreciations_generales
         WHERE eleve_id = ? AND periode_id = ? AND annee_scolaire_id = ?
         ORDER BY version DESC LIMIT 5",
    )
    .bind(eleve_id)
    .bind(periode_id)
    .bind(annee_scolaire_id)
    .fetch_all(&mut *conn)
    .await
    .map_err(|e| format!("Erreur chargement versions appréciation : {}", e))?;

    Ok(rows.into_iter().map(|r| r.into()).collect())
}

/// Restaure une ancienne version en créant une nouvelle version (copie).
pub async fn restore_appreciation_version_impl(
    conn: &mut sqlx::sqlite::SqliteConnection,
    eleve_id: i64,
    periode_id: i64,
    annee_scolaire_id: i64,
    version_id: i64,
) -> Result<AppreciationRow, String> {
    check_annee_not_closed_impl(conn, annee_scolaire_id).await?;

    // Fetch the texte from the version to restore
    let texte: Option<String> = sqlx::query_scalar(
        "SELECT texte FROM appreciations_generales WHERE id = ?",
    )
    .bind(version_id)
    .fetch_optional(&mut *conn)
    .await
    .map_err(|e| format!("Erreur lecture version à restaurer : {}", e))?;

    let texte = texte.ok_or_else(|| format!("Version introuvable : id={}", version_id))?;

    // Save as new version with generated_by='manual'
    save_appreciation_impl(
        conn,
        eleve_id,
        periode_id,
        annee_scolaire_id,
        &texte,
        "manual",
    )
    .await
}

// ─────────────────────────────────────────────────────────────────────────────
// Commandes Tauri
// ─────────────────────────────────────────────────────────────────────────────

#[tauri::command]
pub async fn save_appreciation(
    app: tauri::AppHandle,
    eleve_id: i64,
    periode_id: i64,
    annee_scolaire_id: i64,
    texte: String,
    generated_by: String,
) -> Result<AppreciationRow, String> {
    let db_path = get_db_path(&app)?;
    let db_url = format!("sqlite:{}", db_path.display());
    let mut conn = sqlx::sqlite::SqliteConnection::connect(&db_url)
        .await
        .map_err(|e| format!("Impossible d'ouvrir la DB : {}", e))?;
    save_appreciation_impl(&mut conn, eleve_id, periode_id, annee_scolaire_id, &texte, &generated_by).await
}

#[tauri::command]
pub async fn load_appreciation_current(
    app: tauri::AppHandle,
    eleve_id: i64,
    periode_id: i64,
    annee_scolaire_id: i64,
) -> Result<Option<AppreciationRow>, String> {
    let db_path = get_db_path(&app)?;
    let db_url = format!("sqlite:{}", db_path.display());
    let mut conn = sqlx::sqlite::SqliteConnection::connect(&db_url)
        .await
        .map_err(|e| format!("Impossible d'ouvrir la DB : {}", e))?;
    load_appreciation_current_impl(&mut conn, eleve_id, periode_id, annee_scolaire_id).await
}

#[tauri::command]
pub async fn load_appreciation_versions(
    app: tauri::AppHandle,
    eleve_id: i64,
    periode_id: i64,
    annee_scolaire_id: i64,
) -> Result<Vec<AppreciationVersion>, String> {
    let db_path = get_db_path(&app)?;
    let db_url = format!("sqlite:{}", db_path.display());
    let mut conn = sqlx::sqlite::SqliteConnection::connect(&db_url)
        .await
        .map_err(|e| format!("Impossible d'ouvrir la DB : {}", e))?;
    load_appreciation_versions_impl(&mut conn, eleve_id, periode_id, annee_scolaire_id).await
}

#[tauri::command]
pub async fn restore_appreciation_version(
    app: tauri::AppHandle,
    eleve_id: i64,
    periode_id: i64,
    annee_scolaire_id: i64,
    version_id: i64,
) -> Result<AppreciationRow, String> {
    let db_path = get_db_path(&app)?;
    let db_url = format!("sqlite:{}", db_path.display());
    let mut conn = sqlx::sqlite::SqliteConnection::connect(&db_url)
        .await
        .map_err(|e| format!("Impossible d'ouvrir la DB : {}", e))?;
    restore_appreciation_version_impl(&mut conn, eleve_id, periode_id, annee_scolaire_id, version_id).await
}

// ─────────────────────────────────────────────────────────────────────────────
// Tests
// ─────────────────────────────────────────────────────────────────────────────

#[cfg(test)]
mod tests {
    use super::*;

    async fn setup_test_db() -> (sqlx::sqlite::SqliteConnection, tempfile::NamedTempFile) {
        let tmp = tempfile::NamedTempFile::new().unwrap();
        let url = format!("sqlite:{}", tmp.path().display());
        let mut conn = sqlx::sqlite::SqliteConnection::connect(&url)
            .await
            .expect("Impossible de créer la DB de test");

        sqlx::query(
            "CREATE TABLE annees_scolaires (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                label TEXT NOT NULL,
                date_debut DATE NOT NULL,
                date_fin DATE NOT NULL,
                active INTEGER DEFAULT 0,
                cloturee INTEGER DEFAULT 0,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )",
        )
        .execute(&mut conn)
        .await
        .unwrap();

        sqlx::query(
            "CREATE TABLE students (
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
            "CREATE TABLE config_periodes (
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

        // Table sans UNIQUE (post-M013)
        sqlx::query(
            "CREATE TABLE appreciations_generales (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                eleve_id INTEGER NOT NULL REFERENCES students(id) ON DELETE CASCADE,
                periode_id INTEGER NOT NULL REFERENCES config_periodes(id),
                annee_scolaire_id INTEGER REFERENCES annees_scolaires(id),
                texte TEXT NOT NULL CHECK(length(texte) <= 1500),
                version INTEGER NOT NULL DEFAULT 1,
                generated_by TEXT DEFAULT 'manual' CHECK(generated_by IN ('llm', 'manual')),
                created_at TEXT DEFAULT (datetime('now'))
            )",
        )
        .execute(&mut conn)
        .await
        .unwrap();

        // Seed
        sqlx::query("INSERT INTO annees_scolaires (label, date_debut, date_fin, active, cloturee) VALUES ('2025-2026', '2025-09-01', '2026-07-05', 1, 0)")
            .execute(&mut conn).await.unwrap();
        sqlx::query("INSERT INTO students (first_name) VALUES ('Alice')")
            .execute(&mut conn).await.unwrap();
        sqlx::query("INSERT INTO config_periodes (annee_scolaire, type_periode, numero, date_debut, date_fin) VALUES ('2025-2026', 'trimestre', 1, '2025-09-01', '2025-12-20')")
            .execute(&mut conn).await.unwrap();

        (conn, tmp)
    }

    #[tokio::test]
    async fn test_save_increments_version() {
        let (mut conn, _tmp) = setup_test_db().await;

        let a1 = save_appreciation_impl(&mut conn, 1, 1, 1, "Appréciation v1", "llm").await.unwrap();
        assert_eq!(a1.version, 1);

        let a2 = save_appreciation_impl(&mut conn, 1, 1, 1, "Appréciation v2", "manual").await.unwrap();
        assert_eq!(a2.version, 2);

        let a3 = save_appreciation_impl(&mut conn, 1, 1, 1, "Appréciation v3", "llm").await.unwrap();
        assert_eq!(a3.version, 3);
    }

    #[tokio::test]
    async fn test_load_current_retourne_derniere_version() {
        let (mut conn, _tmp) = setup_test_db().await;

        save_appreciation_impl(&mut conn, 1, 1, 1, "Version 1", "llm").await.unwrap();
        save_appreciation_impl(&mut conn, 1, 1, 1, "Version 2", "manual").await.unwrap();
        save_appreciation_impl(&mut conn, 1, 1, 1, "Version 3", "llm").await.unwrap();

        let current = load_appreciation_current_impl(&mut conn, 1, 1, 1).await.unwrap();
        assert!(current.is_some());
        let current = current.unwrap();
        assert_eq!(current.version, 3);
        assert_eq!(current.texte, "Version 3");
    }

    #[tokio::test]
    async fn test_load_current_retourne_none_si_vide() {
        let (mut conn, _tmp) = setup_test_db().await;

        let current = load_appreciation_current_impl(&mut conn, 1, 1, 1).await.unwrap();
        assert!(current.is_none(), "Aucune appréciation : doit retourner None");
    }

    #[tokio::test]
    async fn test_load_versions_retourne_desc() {
        let (mut conn, _tmp) = setup_test_db().await;

        for i in 1..=3 {
            save_appreciation_impl(&mut conn, 1, 1, 1, &format!("v{}", i), "llm").await.unwrap();
        }

        let versions = load_appreciation_versions_impl(&mut conn, 1, 1, 1).await.unwrap();
        assert_eq!(versions.len(), 3);
        assert_eq!(versions[0].version, 3, "Premier élément doit être la version la plus récente");
        assert_eq!(versions[1].version, 2);
        assert_eq!(versions[2].version, 1);
    }

    #[tokio::test]
    async fn test_cleanup_garde_5_versions_max() {
        let (mut conn, _tmp) = setup_test_db().await;

        for i in 1..=7 {
            save_appreciation_impl(&mut conn, 1, 1, 1, &format!("v{}", i), "llm").await.unwrap();
        }

        let versions = load_appreciation_versions_impl(&mut conn, 1, 1, 1).await.unwrap();
        assert_eq!(versions.len(), 5, "Cleanup doit garder exactement 5 versions");
        assert_eq!(versions[0].version, 7, "La plus récente doit être v7");
        assert_eq!(versions[4].version, 3, "La plus ancienne gardée doit être v3");
    }

    #[tokio::test]
    async fn test_restore_copie_texte_dans_nouvelle_version() {
        let (mut conn, _tmp) = setup_test_db().await;

        let v1 = save_appreciation_impl(&mut conn, 1, 1, 1, "Texte original", "llm").await.unwrap();
        save_appreciation_impl(&mut conn, 1, 1, 1, "Version modifiée", "manual").await.unwrap();

        let restored = restore_appreciation_version_impl(&mut conn, 1, 1, 1, v1.id).await.unwrap();
        assert_eq!(restored.version, 3, "Restauration crée une nouvelle version");
        assert_eq!(restored.texte, "Texte original", "Texte copié depuis v1");
        assert_eq!(restored.generated_by, "manual");
    }

    #[tokio::test]
    async fn test_save_annee_cloturee_retourne_erreur() {
        let (mut conn, _tmp) = setup_test_db().await;

        sqlx::query("UPDATE annees_scolaires SET cloturee = 1 WHERE id = 1")
            .execute(&mut conn)
            .await
            .unwrap();

        let result = save_appreciation_impl(&mut conn, 1, 1, 1, "Appréciation", "llm").await;
        assert!(result.is_err(), "Année clôturée doit retourner une erreur");
    }

    #[tokio::test]
    async fn test_restore_annee_cloturee_retourne_erreur() {
        let (mut conn, _tmp) = setup_test_db().await;

        let v1 = save_appreciation_impl(&mut conn, 1, 1, 1, "Texte", "llm").await.unwrap();

        sqlx::query("UPDATE annees_scolaires SET cloturee = 1 WHERE id = 1")
            .execute(&mut conn)
            .await
            .unwrap();

        let result = restore_appreciation_version_impl(&mut conn, 1, 1, 1, v1.id).await;
        assert!(result.is_err(), "Année clôturée doit empêcher la restauration");
    }

    #[tokio::test]
    async fn test_restore_version_introuvable_retourne_erreur() {
        let (mut conn, _tmp) = setup_test_db().await;

        let result = restore_appreciation_version_impl(&mut conn, 1, 1, 1, 9999).await;
        assert!(result.is_err(), "ID introuvable doit retourner une erreur");
    }
}
