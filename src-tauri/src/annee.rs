use sqlx::Connection;

use crate::migrations::get_db_path;

/// Guard Rust — verifie qu'une annee scolaire n'est pas cloturee.
/// Appelee par le frontend (invoke) avant toute ecriture scopee par annee.
/// C'est la brique de securite centrale de la V2.1 (ADR-011).
///
/// Retourne Ok(()) si l'annee est ouverte, Err(message) sinon.
pub async fn check_annee_not_closed_impl(
    conn: &mut sqlx::sqlite::SqliteConnection,
    annee_id: i64,
) -> Result<(), String> {
    let cloturee: Option<i32> = sqlx::query_scalar::<_, i32>(
        "SELECT cloturee FROM annees_scolaires WHERE id = ?",
    )
    .bind(annee_id)
    .fetch_optional(&mut *conn)
    .await
    .map_err(|e| e.to_string())?;

    match cloturee {
        None => Err("Annee scolaire introuvable".to_string()),
        Some(1) => Err(
            "L'annee scolaire est cloturee. Reouvrez-la pour modifier les donnees.".to_string(),
        ),
        Some(_) => Ok(()),
    }
}

/// Commande Tauri exposee au frontend.
/// Le store TS appelle `invoke('check_annee_not_closed', { anneeId })` avant les ecritures critiques.
#[tauri::command]
pub async fn check_annee_not_closed(
    app: tauri::AppHandle,
    annee_id: i64,
) -> Result<(), String> {
    let db_path = get_db_path(&app)?;
    let db_url = format!("sqlite:{}", db_path.display());

    let mut conn = sqlx::sqlite::SqliteConnection::connect(&db_url)
        .await
        .map_err(|e| format!("Impossible d'ouvrir la DB : {}", e))?;

    check_annee_not_closed_impl(&mut conn, annee_id).await
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

        // Schema minimal annees_scolaires
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

        (conn, tmp)
    }

    #[tokio::test]
    async fn test_guard_annee_ouverte() {
        let (mut conn, _tmp) = setup_test_db().await;

        sqlx::query(
            "INSERT INTO annees_scolaires (label, date_debut, date_fin, active, cloturee) VALUES ('2025-2026', '2025-09-01', '2026-07-05', 1, 0)",
        )
        .execute(&mut conn)
        .await
        .unwrap();

        let result = check_annee_not_closed_impl(&mut conn, 1).await;
        assert!(result.is_ok(), "Le guard doit autoriser une annee ouverte");
    }

    #[tokio::test]
    async fn test_guard_annee_cloturee() {
        let (mut conn, _tmp) = setup_test_db().await;

        sqlx::query(
            "INSERT INTO annees_scolaires (label, date_debut, date_fin, active, cloturee) VALUES ('2024-2025', '2024-09-01', '2025-07-05', 0, 1)",
        )
        .execute(&mut conn)
        .await
        .unwrap();

        let result = check_annee_not_closed_impl(&mut conn, 1).await;
        assert!(result.is_err(), "Le guard doit bloquer une annee cloturee");
        assert!(
            result.unwrap_err().contains("cloturee"),
            "Le message doit mentionner la cloture"
        );
    }

    #[tokio::test]
    async fn test_guard_annee_inexistante() {
        let (mut conn, _tmp) = setup_test_db().await;

        let result = check_annee_not_closed_impl(&mut conn, 999).await;
        assert!(result.is_err(), "Le guard doit rejeter un id inexistant");
        assert!(
            result.unwrap_err().contains("introuvable"),
            "Le message doit mentionner introuvable"
        );
    }

    #[tokio::test]
    async fn test_guard_creation_active_desactive_ancienne() {
        let (mut conn, _tmp) = setup_test_db().await;

        // Creer une premiere annee active
        sqlx::query(
            "INSERT INTO annees_scolaires (label, date_debut, date_fin, active, cloturee) VALUES ('2024-2025', '2024-09-01', '2025-07-05', 1, 0)",
        )
        .execute(&mut conn)
        .await
        .unwrap();

        // Simuler la creation d'une deuxieme annee (comme le store TS ferait)
        sqlx::query("UPDATE annees_scolaires SET active = 0 WHERE active = 1")
            .execute(&mut conn)
            .await
            .unwrap();
        sqlx::query(
            "INSERT INTO annees_scolaires (label, date_debut, date_fin, active, cloturee) VALUES ('2025-2026', '2025-09-01', '2026-07-05', 1, 0)",
        )
        .execute(&mut conn)
        .await
        .unwrap();

        // Verifier: ancienne desactivee, nouvelle active
        let old_active: i32 =
            sqlx::query_scalar("SELECT active FROM annees_scolaires WHERE id = 1")
                .fetch_one(&mut conn)
                .await
                .unwrap();
        assert_eq!(old_active, 0, "L'ancienne annee doit etre desactivee");

        let new_active: i32 =
            sqlx::query_scalar("SELECT active FROM annees_scolaires WHERE id = 2")
                .fetch_one(&mut conn)
                .await
                .unwrap();
        assert_eq!(new_active, 1, "La nouvelle annee doit etre active");

        // Guard autorise les deux (ni l'une ni l'autre n'est cloturee)
        assert!(check_annee_not_closed_impl(&mut conn, 1).await.is_ok());
        assert!(check_annee_not_closed_impl(&mut conn, 2).await.is_ok());
    }

    #[tokio::test]
    async fn test_guard_cloture_et_reouverture() {
        let (mut conn, _tmp) = setup_test_db().await;

        sqlx::query(
            "INSERT INTO annees_scolaires (label, date_debut, date_fin, active, cloturee) VALUES ('2025-2026', '2025-09-01', '2026-07-05', 1, 0)",
        )
        .execute(&mut conn)
        .await
        .unwrap();

        // Cloturer
        sqlx::query("UPDATE annees_scolaires SET cloturee = 1 WHERE id = 1")
            .execute(&mut conn)
            .await
            .unwrap();
        assert!(
            check_annee_not_closed_impl(&mut conn, 1).await.is_err(),
            "Apres cloture, le guard doit bloquer"
        );

        // Rouvrir
        sqlx::query("UPDATE annees_scolaires SET cloturee = 0 WHERE id = 1")
            .execute(&mut conn)
            .await
            .unwrap();
        assert!(
            check_annee_not_closed_impl(&mut conn, 1).await.is_ok(),
            "Apres reouverture, le guard doit autoriser"
        );
    }
}
