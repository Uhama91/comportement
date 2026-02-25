/// Module Synthese — LSU Vivant (ADR-015, ADR-017)
///
/// CRUD sur syntheses_lsu : sauvegarde versionnee, chargement courant,
/// historique 5 versions, restauration d'une ancienne version.

use serde::{Deserialize, Serialize};
use sqlx::Connection;

use crate::annee::check_annee_not_closed_impl;
use crate::migrations::get_db_path;

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SyntheseRow {
    pub id: i64,
    pub eleve_id: i64,
    pub domaine_id: i64,
    pub periode_id: i64,
    pub annee_scolaire_id: i64,
    pub version: i64,
    pub texte: String,
    pub generated_by: String,
    pub created_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SyntheseVersion {
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
struct SyntheseDbRow {
    id: i64,
    eleve_id: i64,
    domaine_id: i64,
    periode_id: i64,
    annee_scolaire_id: i64,
    version: i64,
    texte: String,
    generated_by: String,
    created_at: String,
}

impl From<SyntheseDbRow> for SyntheseRow {
    fn from(r: SyntheseDbRow) -> Self {
        SyntheseRow {
            id: r.id,
            eleve_id: r.eleve_id,
            domaine_id: r.domaine_id,
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
struct SyntheseVersionDbRow {
    id: i64,
    version: i64,
    texte: String,
    generated_by: String,
    created_at: String,
}

impl From<SyntheseVersionDbRow> for SyntheseVersion {
    fn from(r: SyntheseVersionDbRow) -> Self {
        SyntheseVersion {
            id: r.id,
            version: r.version,
            texte: r.texte,
            generated_by: r.generated_by,
            created_at: r.created_at,
        }
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// Impls (testable, prennent une connexion)
// ─────────────────────────────────────────────────────────────────────────────

/// Sauvegarde une synthese (nouvelle version).
/// Version = max existante + 1, cleanup garde les 5 dernieres.
pub async fn save_synthese_impl(
    conn: &mut sqlx::sqlite::SqliteConnection,
    eleve_id: i64,
    domaine_id: i64,
    periode_id: i64,
    annee_scolaire_id: i64,
    texte: &str,
    generated_by: &str,
) -> Result<SyntheseRow, String> {
    check_annee_not_closed_impl(conn, annee_scolaire_id).await?;

    // Get current max version for this combo
    let max_version: Option<i64> = sqlx::query_scalar(
        "SELECT MAX(version) FROM syntheses_lsu
         WHERE eleve_id = ? AND domaine_id = ? AND periode_id = ? AND annee_scolaire_id = ?",
    )
    .bind(eleve_id)
    .bind(domaine_id)
    .bind(periode_id)
    .bind(annee_scolaire_id)
    .fetch_optional(&mut *conn)
    .await
    .map_err(|e| format!("Erreur lecture version max : {}", e))?
    .flatten();

    let next_version = max_version.unwrap_or(0) + 1;

    // Insert new version
    let insert_id = sqlx::query(
        "INSERT INTO syntheses_lsu (eleve_id, domaine_id, periode_id, annee_scolaire_id, version, texte, generated_by)
         VALUES (?, ?, ?, ?, ?, ?, ?)",
    )
    .bind(eleve_id)
    .bind(domaine_id)
    .bind(periode_id)
    .bind(annee_scolaire_id)
    .bind(next_version)
    .bind(texte)
    .bind(generated_by)
    .execute(&mut *conn)
    .await
    .map_err(|e| format!("Erreur insertion synthese : {}", e))?
    .last_insert_rowid();

    // Cleanup: keep only 5 most recent versions
    sqlx::query(
        "DELETE FROM syntheses_lsu
         WHERE eleve_id = ? AND domaine_id = ? AND periode_id = ? AND annee_scolaire_id = ?
           AND id NOT IN (
             SELECT id FROM syntheses_lsu
             WHERE eleve_id = ? AND domaine_id = ? AND periode_id = ? AND annee_scolaire_id = ?
             ORDER BY version DESC LIMIT 5
           )",
    )
    .bind(eleve_id)
    .bind(domaine_id)
    .bind(periode_id)
    .bind(annee_scolaire_id)
    .bind(eleve_id)
    .bind(domaine_id)
    .bind(periode_id)
    .bind(annee_scolaire_id)
    .execute(&mut *conn)
    .await
    .map_err(|e| format!("Erreur cleanup syntheses : {}", e))?;

    // Return inserted row
    let row: SyntheseDbRow = sqlx::query_as(
        "SELECT id, eleve_id, domaine_id, periode_id, annee_scolaire_id, version, texte, generated_by, created_at
         FROM syntheses_lsu WHERE id = ?",
    )
    .bind(insert_id)
    .fetch_one(&mut *conn)
    .await
    .map_err(|e| format!("Erreur lecture synthese inseree : {}", e))?;

    Ok(row.into())
}

/// Charge la version courante (la plus recente) d'une synthese.
pub async fn load_synthese_current_impl(
    conn: &mut sqlx::sqlite::SqliteConnection,
    eleve_id: i64,
    domaine_id: i64,
    periode_id: i64,
    annee_scolaire_id: i64,
) -> Result<Option<SyntheseRow>, String> {
    let row: Option<SyntheseDbRow> = sqlx::query_as(
        "SELECT id, eleve_id, domaine_id, periode_id, annee_scolaire_id, version, texte, generated_by, created_at
         FROM syntheses_lsu
         WHERE eleve_id = ? AND domaine_id = ? AND periode_id = ? AND annee_scolaire_id = ?
         ORDER BY version DESC LIMIT 1",
    )
    .bind(eleve_id)
    .bind(domaine_id)
    .bind(periode_id)
    .bind(annee_scolaire_id)
    .fetch_optional(&mut *conn)
    .await
    .map_err(|e| format!("Erreur chargement synthese courante : {}", e))?;

    Ok(row.map(|r| r.into()))
}

/// Charge l'historique des versions (max 5, DESC).
pub async fn load_synthese_versions_impl(
    conn: &mut sqlx::sqlite::SqliteConnection,
    eleve_id: i64,
    domaine_id: i64,
    periode_id: i64,
    annee_scolaire_id: i64,
) -> Result<Vec<SyntheseVersion>, String> {
    let rows: Vec<SyntheseVersionDbRow> = sqlx::query_as(
        "SELECT id, version, texte, generated_by, created_at
         FROM syntheses_lsu
         WHERE eleve_id = ? AND domaine_id = ? AND periode_id = ? AND annee_scolaire_id = ?
         ORDER BY version DESC LIMIT 5",
    )
    .bind(eleve_id)
    .bind(domaine_id)
    .bind(periode_id)
    .bind(annee_scolaire_id)
    .fetch_all(&mut *conn)
    .await
    .map_err(|e| format!("Erreur chargement versions synthese : {}", e))?;

    Ok(rows.into_iter().map(|r| r.into()).collect())
}

/// Restaure une ancienne version en creant une nouvelle version (copie).
pub async fn restore_synthese_version_impl(
    conn: &mut sqlx::sqlite::SqliteConnection,
    eleve_id: i64,
    domaine_id: i64,
    periode_id: i64,
    annee_scolaire_id: i64,
    version_id: i64,
) -> Result<SyntheseRow, String> {
    check_annee_not_closed_impl(conn, annee_scolaire_id).await?;

    // Fetch the texte from the version to restore
    let texte: Option<String> = sqlx::query_scalar(
        "SELECT texte FROM syntheses_lsu WHERE id = ?",
    )
    .bind(version_id)
    .fetch_optional(&mut *conn)
    .await
    .map_err(|e| format!("Erreur lecture version a restaurer : {}", e))?;

    let texte = texte.ok_or_else(|| format!("Version introuvable : id={}", version_id))?;

    // Save as new version with generated_by='manual'
    save_synthese_impl(
        conn,
        eleve_id,
        domaine_id,
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
pub async fn save_synthese(
    app: tauri::AppHandle,
    eleve_id: i64,
    domaine_id: i64,
    periode_id: i64,
    annee_scolaire_id: i64,
    texte: String,
    generated_by: String,
) -> Result<SyntheseRow, String> {
    let db_path = get_db_path(&app)?;
    let db_url = format!("sqlite:{}", db_path.display());
    let mut conn = sqlx::sqlite::SqliteConnection::connect(&db_url)
        .await
        .map_err(|e| format!("Impossible d'ouvrir la DB : {}", e))?;
    save_synthese_impl(&mut conn, eleve_id, domaine_id, periode_id, annee_scolaire_id, &texte, &generated_by).await
}

#[tauri::command]
pub async fn load_synthese_current(
    app: tauri::AppHandle,
    eleve_id: i64,
    domaine_id: i64,
    periode_id: i64,
    annee_scolaire_id: i64,
) -> Result<Option<SyntheseRow>, String> {
    let db_path = get_db_path(&app)?;
    let db_url = format!("sqlite:{}", db_path.display());
    let mut conn = sqlx::sqlite::SqliteConnection::connect(&db_url)
        .await
        .map_err(|e| format!("Impossible d'ouvrir la DB : {}", e))?;
    load_synthese_current_impl(&mut conn, eleve_id, domaine_id, periode_id, annee_scolaire_id).await
}

#[tauri::command]
pub async fn load_synthese_versions(
    app: tauri::AppHandle,
    eleve_id: i64,
    domaine_id: i64,
    periode_id: i64,
    annee_scolaire_id: i64,
) -> Result<Vec<SyntheseVersion>, String> {
    let db_path = get_db_path(&app)?;
    let db_url = format!("sqlite:{}", db_path.display());
    let mut conn = sqlx::sqlite::SqliteConnection::connect(&db_url)
        .await
        .map_err(|e| format!("Impossible d'ouvrir la DB : {}", e))?;
    load_synthese_versions_impl(&mut conn, eleve_id, domaine_id, periode_id, annee_scolaire_id).await
}

#[tauri::command]
pub async fn restore_synthese_version(
    app: tauri::AppHandle,
    eleve_id: i64,
    domaine_id: i64,
    periode_id: i64,
    annee_scolaire_id: i64,
    version_id: i64,
) -> Result<SyntheseRow, String> {
    let db_path = get_db_path(&app)?;
    let db_url = format!("sqlite:{}", db_path.display());
    let mut conn = sqlx::sqlite::SqliteConnection::connect(&db_url)
        .await
        .map_err(|e| format!("Impossible d'ouvrir la DB : {}", e))?;
    restore_synthese_version_impl(&mut conn, eleve_id, domaine_id, periode_id, annee_scolaire_id, version_id).await
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
            .expect("Impossible de creer la DB de test");

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

        sqlx::query(
            "CREATE TABLE domaines_apprentissage (
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
            "CREATE TABLE syntheses_lsu (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                eleve_id INTEGER NOT NULL REFERENCES students(id) ON DELETE CASCADE,
                periode_id INTEGER NOT NULL REFERENCES config_periodes(id),
                domaine_id INTEGER NOT NULL REFERENCES domaines_apprentissage(id),
                annee_scolaire_id INTEGER NOT NULL REFERENCES annees_scolaires(id),
                version INTEGER NOT NULL DEFAULT 1,
                texte TEXT NOT NULL,
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
        sqlx::query("INSERT INTO domaines_apprentissage (nom, ordre_affichage) VALUES ('Francais', 1)")
            .execute(&mut conn).await.unwrap();

        (conn, tmp)
    }

    #[tokio::test]
    async fn test_save_increments_version() {
        let (mut conn, _tmp) = setup_test_db().await;

        let s1 = save_synthese_impl(&mut conn, 1, 1, 1, 1, "Synthese v1", "llm").await.unwrap();
        assert_eq!(s1.version, 1);

        let s2 = save_synthese_impl(&mut conn, 1, 1, 1, 1, "Synthese v2", "manual").await.unwrap();
        assert_eq!(s2.version, 2);

        let s3 = save_synthese_impl(&mut conn, 1, 1, 1, 1, "Synthese v3", "llm").await.unwrap();
        assert_eq!(s3.version, 3);
    }

    #[tokio::test]
    async fn test_save_annee_cloturee_retourne_erreur() {
        let (mut conn, _tmp) = setup_test_db().await;

        sqlx::query("UPDATE annees_scolaires SET cloturee = 1 WHERE id = 1")
            .execute(&mut conn)
            .await
            .unwrap();

        let result = save_synthese_impl(&mut conn, 1, 1, 1, 1, "Synthese", "llm").await;
        assert!(result.is_err(), "Annee cloturee doit retourner une erreur");
    }

    #[tokio::test]
    async fn test_load_current_retourne_derniere_version() {
        let (mut conn, _tmp) = setup_test_db().await;

        save_synthese_impl(&mut conn, 1, 1, 1, 1, "Version 1", "llm").await.unwrap();
        save_synthese_impl(&mut conn, 1, 1, 1, 1, "Version 2", "manual").await.unwrap();
        save_synthese_impl(&mut conn, 1, 1, 1, 1, "Version 3", "llm").await.unwrap();

        let current = load_synthese_current_impl(&mut conn, 1, 1, 1, 1).await.unwrap();
        assert!(current.is_some());
        let current = current.unwrap();
        assert_eq!(current.version, 3);
        assert_eq!(current.texte, "Version 3");
    }

    #[tokio::test]
    async fn test_load_current_retourne_none_si_vide() {
        let (mut conn, _tmp) = setup_test_db().await;

        let current = load_synthese_current_impl(&mut conn, 1, 1, 1, 1).await.unwrap();
        assert!(current.is_none(), "Aucune synthese : doit retourner None");
    }

    #[tokio::test]
    async fn test_load_versions_retourne_desc() {
        let (mut conn, _tmp) = setup_test_db().await;

        for i in 1..=3 {
            save_synthese_impl(&mut conn, 1, 1, 1, 1, &format!("v{}", i), "llm").await.unwrap();
        }

        let versions = load_synthese_versions_impl(&mut conn, 1, 1, 1, 1).await.unwrap();
        assert_eq!(versions.len(), 3);
        assert_eq!(versions[0].version, 3, "Premier element doit etre la version la plus recente");
        assert_eq!(versions[1].version, 2);
        assert_eq!(versions[2].version, 1);
    }

    #[tokio::test]
    async fn test_cleanup_garde_5_versions_max() {
        let (mut conn, _tmp) = setup_test_db().await;

        for i in 1..=7 {
            save_synthese_impl(&mut conn, 1, 1, 1, 1, &format!("v{}", i), "llm").await.unwrap();
        }

        let versions = load_synthese_versions_impl(&mut conn, 1, 1, 1, 1).await.unwrap();
        assert_eq!(versions.len(), 5, "Cleanup doit garder exactement 5 versions");
        assert_eq!(versions[0].version, 7, "La plus recente doit etre v7");
        assert_eq!(versions[4].version, 3, "La plus ancienne gardee doit etre v3");
    }

    #[tokio::test]
    async fn test_restore_copie_texte_dans_nouvelle_version() {
        let (mut conn, _tmp) = setup_test_db().await;

        let v1 = save_synthese_impl(&mut conn, 1, 1, 1, 1, "Texte original", "llm").await.unwrap();
        save_synthese_impl(&mut conn, 1, 1, 1, 1, "Version modifiee", "manual").await.unwrap();

        let restored = restore_synthese_version_impl(&mut conn, 1, 1, 1, 1, v1.id).await.unwrap();
        assert_eq!(restored.version, 3, "Restauration cree une nouvelle version");
        assert_eq!(restored.texte, "Texte original", "Texte copie depuis v1");
        assert_eq!(restored.generated_by, "manual");
    }

    #[tokio::test]
    async fn test_restore_annee_cloturee_retourne_erreur() {
        let (mut conn, _tmp) = setup_test_db().await;

        let v1 = save_synthese_impl(&mut conn, 1, 1, 1, 1, "Texte", "llm").await.unwrap();

        sqlx::query("UPDATE annees_scolaires SET cloturee = 1 WHERE id = 1")
            .execute(&mut conn)
            .await
            .unwrap();

        let result = restore_synthese_version_impl(&mut conn, 1, 1, 1, 1, v1.id).await;
        assert!(result.is_err(), "Annee cloturee doit empecher la restauration");
    }

    #[tokio::test]
    async fn test_restore_version_introuvable_retourne_erreur() {
        let (mut conn, _tmp) = setup_test_db().await;

        let result = restore_synthese_version_impl(&mut conn, 1, 1, 1, 1, 9999).await;
        assert!(result.is_err(), "ID introuvable doit retourner une erreur");
    }
}
