use serde::{Deserialize, Serialize};
use sqlx::SqlitePool;

use super::validator::ValidatedAppreciation;

/// Result of a successful batch insert
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct InsertResult {
    pub success: bool,
    pub inserted_ids: Vec<i64>,
    pub count: usize,
}

#[derive(Debug, thiserror::Error)]
pub enum ExecutionError {
    #[error("Eleve introuvable (id: {0})")]
    StudentNotFound(i64),

    #[error("Periode introuvable (id: {0})")]
    PeriodNotFound(i64),

    #[error("Domaine introuvable en base : \"{0}\"")]
    DomaineNotFound(String),

    #[error("Erreur base de donnees : {0}")]
    DatabaseError(String),
}

impl From<sqlx::Error> for ExecutionError {
    fn from(e: sqlx::Error) -> Self {
        ExecutionError::DatabaseError(e.to_string())
    }
}

/// Layer 4: Execute validated inserts using prepared statements in a transaction.
/// Accepts a SqlitePool (not AppHandle) for testability.
pub async fn execute_validated_inserts(
    pool: &SqlitePool,
    eleve_id: i64,
    periode_id: i64,
    appreciations: &[ValidatedAppreciation],
) -> Result<InsertResult, ExecutionError> {
    // Verify student exists
    let student_exists: Option<(i64,)> =
        sqlx::query_as("SELECT id FROM students WHERE id = ?")
            .bind(eleve_id)
            .fetch_optional(pool)
            .await?;

    if student_exists.is_none() {
        return Err(ExecutionError::StudentNotFound(eleve_id));
    }

    // Verify period exists
    let period_exists: Option<(i64,)> =
        sqlx::query_as("SELECT id FROM config_periodes WHERE id = ?")
            .bind(periode_id)
            .fetch_optional(pool)
            .await?;

    if period_exists.is_none() {
        return Err(ExecutionError::PeriodNotFound(periode_id));
    }

    // Execute all inserts in a transaction
    let mut tx = pool.begin().await?;
    let mut inserted_ids = Vec::with_capacity(appreciations.len());

    for appr in appreciations {
        // Lookup domaine_id by name
        let domaine_row: Option<(i64,)> =
            sqlx::query_as("SELECT id FROM domaines_apprentissage WHERE nom = ?")
                .bind(&appr.domaine)
                .fetch_optional(&mut *tx)
                .await?;

        let domaine_id = match domaine_row {
            Some((id,)) => id,
            None => {
                // Rollback happens on drop
                return Err(ExecutionError::DomaineNotFound(appr.domaine.clone()));
            }
        };

        // INSERT with prepared statement
        let result = sqlx::query(
            "INSERT INTO appreciations (eleve_id, periode_id, domaine_id, date_evaluation, niveau, observations, texte_dictation) VALUES (?, ?, ?, date('now'), ?, ?, ?)"
        )
        .bind(eleve_id)
        .bind(periode_id)
        .bind(domaine_id)
        .bind(&appr.niveau)
        .bind(&appr.observations)
        .bind(&appr.texte_dictation)
        .execute(&mut *tx)
        .await?;

        inserted_ids.push(result.last_insert_rowid());
    }

    tx.commit().await?;

    Ok(InsertResult {
        success: true,
        count: inserted_ids.len(),
        inserted_ids,
    })
}

#[cfg(test)]
mod tests {
    use super::*;
    use sqlx::sqlite::SqlitePoolOptions;

    /// Set up an in-memory SQLite database reproducing the app's migrations
    async fn setup_test_db() -> SqlitePool {
        let pool = SqlitePoolOptions::new()
            .max_connections(1)
            .connect("sqlite::memory:")
            .await
            .unwrap();

        // Reproduce relevant migrations
        sqlx::query("PRAGMA foreign_keys = ON;")
            .execute(&pool)
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
        .execute(&pool)
        .await
        .unwrap();

        sqlx::query(
            "CREATE TABLE config_periodes (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                annee_scolaire TEXT NOT NULL,
                type_periode TEXT NOT NULL CHECK(type_periode IN ('trimestre', 'semestre')),
                numero INTEGER NOT NULL,
                date_debut DATE NOT NULL,
                date_fin DATE NOT NULL,
                nom_affichage TEXT,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )",
        )
        .execute(&pool)
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
        .execute(&pool)
        .await
        .unwrap();

        sqlx::query(
            "CREATE TABLE appreciations (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                eleve_id INTEGER NOT NULL REFERENCES students(id) ON DELETE CASCADE,
                periode_id INTEGER NOT NULL REFERENCES config_periodes(id),
                domaine_id INTEGER NOT NULL REFERENCES domaines_apprentissage(id),
                date_evaluation DATE,
                niveau TEXT CHECK(niveau IN ('maitrise', 'en_cours_acquisition', 'debut')),
                observations TEXT,
                texte_dictation TEXT,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )",
        )
        .execute(&pool)
        .await
        .unwrap();

        // Seed domaines (matching migration 7)
        sqlx::query(
            "INSERT INTO domaines_apprentissage (nom, ordre_affichage) VALUES
                ('Francais', 1),
                ('Mathematiques', 2),
                ('Sciences et Technologies', 3),
                ('Histoire-Geographie', 4),
                ('Enseignement Moral et Civique', 5),
                ('Education Physique et Sportive', 6),
                ('Arts Plastiques', 7),
                ('Education Musicale', 8),
                ('Langues Vivantes', 9)",
        )
        .execute(&pool)
        .await
        .unwrap();

        // Insert test student
        sqlx::query("INSERT INTO students (first_name) VALUES ('Alice')")
            .execute(&pool)
            .await
            .unwrap();

        // Insert test period
        sqlx::query(
            "INSERT INTO config_periodes (annee_scolaire, type_periode, numero, date_debut, date_fin, nom_affichage) VALUES ('2025-2026', 'trimestre', 1, '2025-09-01', '2025-12-20', 'Trimestre 1')",
        )
        .execute(&pool)
        .await
        .unwrap();

        pool
    }

    #[tokio::test]
    async fn insert_single_appreciation() {
        let pool = setup_test_db().await;
        let apprs = vec![ValidatedAppreciation {
            domaine: "Francais".to_string(),
            niveau: "maitrise".to_string(),
            observations: "Excellent travail en lecture".to_string(),
            texte_dictation: Some("texte original".to_string()),
        }];

        let result = execute_validated_inserts(&pool, 1, 1, &apprs).await.unwrap();
        assert!(result.success);
        assert_eq!(result.count, 1);
        assert_eq!(result.inserted_ids.len(), 1);

        // Verify data in DB
        let row: (String, String, String) = sqlx::query_as(
            "SELECT niveau, observations, texte_dictation FROM appreciations WHERE id = ?",
        )
        .bind(result.inserted_ids[0])
        .fetch_one(&pool)
        .await
        .unwrap();
        assert_eq!(row.0, "maitrise");
        assert_eq!(row.1, "Excellent travail en lecture");
        assert_eq!(row.2, "texte original");
    }

    #[tokio::test]
    async fn insert_multiple_appreciations_in_transaction() {
        let pool = setup_test_db().await;
        let apprs = vec![
            ValidatedAppreciation {
                domaine: "Francais".to_string(),
                niveau: "maitrise".to_string(),
                observations: "Tres bien en lecture".to_string(),
                texte_dictation: None,
            },
            ValidatedAppreciation {
                domaine: "Mathematiques".to_string(),
                niveau: "en_cours_acquisition".to_string(),
                observations: "Progresse en calcul".to_string(),
                texte_dictation: None,
            },
        ];

        let result = execute_validated_inserts(&pool, 1, 1, &apprs).await.unwrap();
        assert!(result.success);
        assert_eq!(result.count, 2);

        // Verify both rows exist
        let count: (i64,) = sqlx::query_as("SELECT COUNT(*) FROM appreciations")
            .fetch_one(&pool)
            .await
            .unwrap();
        assert_eq!(count.0, 2);
    }

    #[tokio::test]
    async fn reject_nonexistent_student() {
        let pool = setup_test_db().await;
        let apprs = vec![ValidatedAppreciation {
            domaine: "Francais".to_string(),
            niveau: "maitrise".to_string(),
            observations: "Bien".to_string(),
            texte_dictation: None,
        }];

        let result = execute_validated_inserts(&pool, 999, 1, &apprs).await;
        assert!(matches!(result, Err(ExecutionError::StudentNotFound(999))));
    }

    #[tokio::test]
    async fn reject_nonexistent_period() {
        let pool = setup_test_db().await;
        let apprs = vec![ValidatedAppreciation {
            domaine: "Francais".to_string(),
            niveau: "maitrise".to_string(),
            observations: "Bien".to_string(),
            texte_dictation: None,
        }];

        let result = execute_validated_inserts(&pool, 1, 999, &apprs).await;
        assert!(matches!(result, Err(ExecutionError::PeriodNotFound(999))));
    }

    #[tokio::test]
    async fn reject_nonexistent_domaine() {
        let pool = setup_test_db().await;
        // This should not happen if Layer 3 ran first, but Layer 4 checks anyway
        let apprs = vec![ValidatedAppreciation {
            domaine: "Domaine Inexistant".to_string(),
            niveau: "maitrise".to_string(),
            observations: "Bien".to_string(),
            texte_dictation: None,
        }];

        let result = execute_validated_inserts(&pool, 1, 1, &apprs).await;
        assert!(matches!(result, Err(ExecutionError::DomaineNotFound(_))));
    }
}
