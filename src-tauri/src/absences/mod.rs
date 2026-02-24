/// Module Absences — Registre d'Appel (ADR-019)
///
/// CRUD sur absences_v2 : toggle absence, types, motifs, retards.
/// Calcul alertes legales (4+ demi-journees injustifiees / 30 jours glissants).
/// Totaux par periode pour export LSU.

use serde::{Deserialize, Serialize};
use sqlx::Connection;

use crate::migrations::get_db_path;

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AbsenceV2 {
    pub id: i64,
    pub eleve_id: i64,
    pub date: String,
    pub demi_journee: String,       // 'matin' | 'apres_midi'
    pub type_absence: String,       // 'justifiee' | 'medicale' | 'injustifiee'
    pub motif: Option<String>,
    pub retard: bool,
    pub annee_scolaire_id: i64,
    pub created_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct NewAbsence {
    pub eleve_id: i64,
    pub date: String,               // YYYY-MM-DD
    pub demi_journee: String,       // 'matin' | 'apres_midi'
    pub type_absence: Option<String>, // default 'injustifiee'
    pub motif: Option<String>,
    pub retard: Option<bool>,
    pub annee_scolaire_id: i64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AbsenceAlert {
    pub eleve_id: i64,
    pub count: i64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AbsenceTotaux {
    pub eleve_id: i64,
    pub justifiees: i64,
    pub injustifiees: i64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AbsenceFilter {
    pub annee_scolaire_id: i64,
    pub date: Option<String>,         // filter by exact date
    pub week_start: Option<String>,   // filter by week (date range)
    pub week_end: Option<String>,
}

// ─────────────────────────────────────────────────────────────────────────────
// Row mapping
// ─────────────────────────────────────────────────────────────────────────────

#[derive(Debug, sqlx::FromRow)]
struct AbsenceRow {
    id: i64,
    eleve_id: i64,
    date: String,
    demi_journee: String,
    type_absence: String,
    motif: Option<String>,
    retard: i32,
    annee_scolaire_id: i64,
    created_at: String,
}

impl From<AbsenceRow> for AbsenceV2 {
    fn from(r: AbsenceRow) -> Self {
        AbsenceV2 {
            id: r.id,
            eleve_id: r.eleve_id,
            date: r.date,
            demi_journee: r.demi_journee,
            type_absence: r.type_absence,
            motif: r.motif,
            retard: r.retard != 0,
            annee_scolaire_id: r.annee_scolaire_id,
            created_at: r.created_at,
        }
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// Impls (testable, prennent une connexion)
// ─────────────────────────────────────────────────────────────────────────────

/// Toggle absence: insere si absente, supprime si deja presente
pub async fn toggle_absence_impl(
    conn: &mut sqlx::sqlite::SqliteConnection,
    absence: &NewAbsence,
) -> Result<Option<i64>, String> {
    // Check if already exists
    let existing: Option<(i64,)> = sqlx::query_as(
        "SELECT id FROM absences_v2 WHERE eleve_id = ? AND date = ? AND demi_journee = ?",
    )
    .bind(absence.eleve_id)
    .bind(&absence.date)
    .bind(&absence.demi_journee)
    .fetch_optional(&mut *conn)
    .await
    .map_err(|e| format!("Erreur requete absence : {}", e))?;

    if let Some((id,)) = existing {
        // Remove — eleve redevient present
        sqlx::query("DELETE FROM absences_v2 WHERE id = ?")
            .bind(id)
            .execute(&mut *conn)
            .await
            .map_err(|e| format!("Erreur suppression absence : {}", e))?;
        Ok(None) // Removed
    } else {
        // Insert new absence
        let type_abs = absence.type_absence.as_deref().unwrap_or("injustifiee");
        let retard = if absence.retard.unwrap_or(false) { 1 } else { 0 };

        let result = sqlx::query(
            "INSERT INTO absences_v2 (eleve_id, date, demi_journee, type_absence, motif, retard, annee_scolaire_id)
             VALUES (?, ?, ?, ?, ?, ?, ?)",
        )
        .bind(absence.eleve_id)
        .bind(&absence.date)
        .bind(&absence.demi_journee)
        .bind(type_abs)
        .bind(&absence.motif)
        .bind(retard)
        .bind(absence.annee_scolaire_id)
        .execute(&mut *conn)
        .await
        .map_err(|e| format!("Erreur insertion absence : {}", e))?;

        Ok(Some(result.last_insert_rowid()))
    }
}

/// Update type d'absence
pub async fn update_absence_type_impl(
    conn: &mut sqlx::sqlite::SqliteConnection,
    id: i64,
    type_absence: &str,
) -> Result<(), String> {
    sqlx::query("UPDATE absences_v2 SET type_absence = ? WHERE id = ?")
        .bind(type_absence)
        .bind(id)
        .execute(&mut *conn)
        .await
        .map_err(|e| format!("Erreur update type absence : {}", e))?;
    Ok(())
}

/// Update motif
pub async fn update_absence_motif_impl(
    conn: &mut sqlx::sqlite::SqliteConnection,
    id: i64,
    motif: &str,
) -> Result<(), String> {
    sqlx::query("UPDATE absences_v2 SET motif = ? WHERE id = ?")
        .bind(motif)
        .bind(id)
        .execute(&mut *conn)
        .await
        .map_err(|e| format!("Erreur update motif absence : {}", e))?;
    Ok(())
}

/// Toggle retard (present mais en retard — pas une absence)
pub async fn toggle_retard_impl(
    conn: &mut sqlx::sqlite::SqliteConnection,
    eleve_id: i64,
    date: &str,
    demi_journee: &str,
    annee_scolaire_id: i64,
) -> Result<bool, String> {
    // Check if retard record exists
    let existing: Option<(i64, i32)> = sqlx::query_as(
        "SELECT id, retard FROM absences_v2 WHERE eleve_id = ? AND date = ? AND demi_journee = ?",
    )
    .bind(eleve_id)
    .bind(date)
    .bind(demi_journee)
    .fetch_optional(&mut *conn)
    .await
    .map_err(|e| format!("Erreur requete retard : {}", e))?;

    if let Some((id, retard)) = existing {
        // Toggle retard flag on existing absence
        let new_retard = if retard != 0 { 0 } else { 1 };
        sqlx::query("UPDATE absences_v2 SET retard = ? WHERE id = ?")
            .bind(new_retard)
            .bind(id)
            .execute(&mut *conn)
            .await
            .map_err(|e| format!("Erreur toggle retard : {}", e))?;
        Ok(new_retard != 0)
    } else {
        // Create absence record with retard flag only (type justifiee par defaut car retard != absence)
        sqlx::query(
            "INSERT INTO absences_v2 (eleve_id, date, demi_journee, type_absence, retard, annee_scolaire_id)
             VALUES (?, ?, ?, 'justifiee', 1, ?)",
        )
        .bind(eleve_id)
        .bind(date)
        .bind(demi_journee)
        .bind(annee_scolaire_id)
        .execute(&mut *conn)
        .await
        .map_err(|e| format!("Erreur insertion retard : {}", e))?;
        Ok(true)
    }
}

/// Load absences for a date range
pub async fn load_absences_impl(
    conn: &mut sqlx::sqlite::SqliteConnection,
    filter: &AbsenceFilter,
) -> Result<Vec<AbsenceV2>, String> {
    let mut sql = String::from(
        "SELECT id, eleve_id, date, demi_journee, type_absence, motif, retard, annee_scolaire_id, created_at
         FROM absences_v2 WHERE annee_scolaire_id = ?",
    );
    let mut binds: Vec<String> = vec![filter.annee_scolaire_id.to_string()];

    if let Some(ref d) = filter.date {
        sql.push_str(" AND date = ?");
        binds.push(d.clone());
    }
    if let Some(ref ws) = filter.week_start {
        sql.push_str(" AND date >= ?");
        binds.push(ws.clone());
    }
    if let Some(ref we) = filter.week_end {
        sql.push_str(" AND date <= ?");
        binds.push(we.clone());
    }

    sql.push_str(" ORDER BY date ASC, demi_journee ASC, eleve_id ASC");

    let mut query = sqlx::query_as::<_, AbsenceRow>(&sql);
    for b in &binds {
        query = query.bind(b);
    }

    let rows = query
        .fetch_all(&mut *conn)
        .await
        .map_err(|e| format!("Erreur chargement absences : {}", e))?;

    Ok(rows.into_iter().map(|r| r.into()).collect())
}

/// Compute legal alerts: eleves with 4+ injustifiees in last 30 rolling days
pub async fn compute_alerts_impl(
    conn: &mut sqlx::sqlite::SqliteConnection,
    annee_scolaire_id: i64,
    today: &str,
) -> Result<Vec<AbsenceAlert>, String> {
    let rows: Vec<(i64, i64)> = sqlx::query_as(
        "SELECT eleve_id, COUNT(*) as cnt
         FROM absences_v2
         WHERE annee_scolaire_id = ?
           AND type_absence = 'injustifiee'
           AND retard = 0
           AND date >= date(?, '-30 days')
           AND date <= ?
         GROUP BY eleve_id
         HAVING cnt >= 4",
    )
    .bind(annee_scolaire_id)
    .bind(today)
    .bind(today)
    .fetch_all(&mut *conn)
    .await
    .map_err(|e| format!("Erreur calcul alertes : {}", e))?;

    Ok(rows
        .into_iter()
        .map(|(eleve_id, count)| AbsenceAlert { eleve_id, count })
        .collect())
}

/// Compute totaux by periode for LSU export
pub async fn compute_totaux_periode_impl(
    conn: &mut sqlx::sqlite::SqliteConnection,
    annee_scolaire_id: i64,
    date_debut: &str,
    date_fin: &str,
) -> Result<Vec<AbsenceTotaux>, String> {
    let rows: Vec<(i64, i64, i64)> = sqlx::query_as(
        "SELECT eleve_id,
                SUM(CASE WHEN type_absence IN ('justifiee', 'medicale') THEN 1 ELSE 0 END) as justifiees,
                SUM(CASE WHEN type_absence = 'injustifiee' THEN 1 ELSE 0 END) as injustifiees
         FROM absences_v2
         WHERE annee_scolaire_id = ?
           AND retard = 0
           AND date >= ?
           AND date <= ?
         GROUP BY eleve_id",
    )
    .bind(annee_scolaire_id)
    .bind(date_debut)
    .bind(date_fin)
    .fetch_all(&mut *conn)
    .await
    .map_err(|e| format!("Erreur calcul totaux : {}", e))?;

    Ok(rows
        .into_iter()
        .map(|(eleve_id, justifiees, injustifiees)| AbsenceTotaux {
            eleve_id,
            justifiees,
            injustifiees,
        })
        .collect())
}

// ─────────────────────────────────────────────────────────────────────────────
// Commandes Tauri
// ─────────────────────────────────────────────────────────────────────────────

#[tauri::command]
pub async fn toggle_absence_v2(
    app: tauri::AppHandle,
    absence: NewAbsence,
) -> Result<Option<i64>, String> {
    let db_path = get_db_path(&app)?;
    let db_url = format!("sqlite:{}", db_path.display());
    let mut conn = sqlx::sqlite::SqliteConnection::connect(&db_url)
        .await
        .map_err(|e| format!("Impossible d'ouvrir la DB : {}", e))?;
    toggle_absence_impl(&mut conn, &absence).await
}

#[tauri::command]
pub async fn update_absence_type(
    app: tauri::AppHandle,
    id: i64,
    type_absence: String,
) -> Result<(), String> {
    let db_path = get_db_path(&app)?;
    let db_url = format!("sqlite:{}", db_path.display());
    let mut conn = sqlx::sqlite::SqliteConnection::connect(&db_url)
        .await
        .map_err(|e| format!("Impossible d'ouvrir la DB : {}", e))?;
    update_absence_type_impl(&mut conn, id, &type_absence).await
}

#[tauri::command]
pub async fn update_absence_motif(
    app: tauri::AppHandle,
    id: i64,
    motif: String,
) -> Result<(), String> {
    let db_path = get_db_path(&app)?;
    let db_url = format!("sqlite:{}", db_path.display());
    let mut conn = sqlx::sqlite::SqliteConnection::connect(&db_url)
        .await
        .map_err(|e| format!("Impossible d'ouvrir la DB : {}", e))?;
    update_absence_motif_impl(&mut conn, id, &motif).await
}

#[tauri::command]
pub async fn toggle_retard(
    app: tauri::AppHandle,
    eleve_id: i64,
    date: String,
    demi_journee: String,
    annee_scolaire_id: i64,
) -> Result<bool, String> {
    let db_path = get_db_path(&app)?;
    let db_url = format!("sqlite:{}", db_path.display());
    let mut conn = sqlx::sqlite::SqliteConnection::connect(&db_url)
        .await
        .map_err(|e| format!("Impossible d'ouvrir la DB : {}", e))?;
    toggle_retard_impl(&mut conn, eleve_id, &date, &demi_journee, annee_scolaire_id).await
}

#[tauri::command]
pub async fn load_absences_v2(
    app: tauri::AppHandle,
    filter: AbsenceFilter,
) -> Result<Vec<AbsenceV2>, String> {
    let db_path = get_db_path(&app)?;
    let db_url = format!("sqlite:{}", db_path.display());
    let mut conn = sqlx::sqlite::SqliteConnection::connect(&db_url)
        .await
        .map_err(|e| format!("Impossible d'ouvrir la DB : {}", e))?;
    load_absences_impl(&mut conn, &filter).await
}

#[tauri::command]
pub async fn compute_absence_alerts(
    app: tauri::AppHandle,
    annee_scolaire_id: i64,
    today: String,
) -> Result<Vec<AbsenceAlert>, String> {
    let db_path = get_db_path(&app)?;
    let db_url = format!("sqlite:{}", db_path.display());
    let mut conn = sqlx::sqlite::SqliteConnection::connect(&db_url)
        .await
        .map_err(|e| format!("Impossible d'ouvrir la DB : {}", e))?;
    compute_alerts_impl(&mut conn, annee_scolaire_id, &today).await
}

#[tauri::command]
pub async fn compute_absence_totaux(
    app: tauri::AppHandle,
    annee_scolaire_id: i64,
    date_debut: String,
    date_fin: String,
) -> Result<Vec<AbsenceTotaux>, String> {
    let db_path = get_db_path(&app)?;
    let db_url = format!("sqlite:{}", db_path.display());
    let mut conn = sqlx::sqlite::SqliteConnection::connect(&db_url)
        .await
        .map_err(|e| format!("Impossible d'ouvrir la DB : {}", e))?;
    compute_totaux_periode_impl(&mut conn, annee_scolaire_id, &date_debut, &date_fin).await
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
            "CREATE TABLE absences_v2 (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                eleve_id INTEGER NOT NULL REFERENCES students(id) ON DELETE CASCADE,
                date TEXT NOT NULL,
                demi_journee TEXT NOT NULL CHECK(demi_journee IN ('matin', 'apres_midi')),
                type_absence TEXT NOT NULL CHECK(type_absence IN ('justifiee', 'medicale', 'injustifiee')),
                motif TEXT,
                retard INTEGER DEFAULT 0,
                annee_scolaire_id INTEGER NOT NULL REFERENCES annees_scolaires(id),
                created_at TEXT DEFAULT (datetime('now')),
                UNIQUE(eleve_id, date, demi_journee)
            )",
        )
        .execute(&mut conn)
        .await
        .unwrap();

        // Seed data
        sqlx::query("INSERT INTO annees_scolaires (label, date_debut, date_fin, active) VALUES ('2025-2026', '2025-09-01', '2026-07-05', 1)")
            .execute(&mut conn).await.unwrap();
        sqlx::query("INSERT INTO students (first_name) VALUES ('Alice'), ('Bob'), ('Charlie')")
            .execute(&mut conn).await.unwrap();

        (conn, tmp)
    }

    fn make_absence(eleve_id: i64, date: &str, demi: &str) -> NewAbsence {
        NewAbsence {
            eleve_id,
            date: date.to_string(),
            demi_journee: demi.to_string(),
            type_absence: None,
            motif: None,
            retard: None,
            annee_scolaire_id: 1,
        }
    }

    #[tokio::test]
    async fn test_toggle_absence_insert() {
        let (mut conn, _tmp) = setup_test_db().await;
        let abs = make_absence(1, "2026-02-24", "matin");
        let result = toggle_absence_impl(&mut conn, &abs).await.unwrap();
        assert!(result.is_some(), "Should return inserted id");
        assert!(result.unwrap() > 0);
    }

    #[tokio::test]
    async fn test_toggle_absence_remove() {
        let (mut conn, _tmp) = setup_test_db().await;
        let abs = make_absence(1, "2026-02-24", "matin");

        // Insert
        toggle_absence_impl(&mut conn, &abs).await.unwrap();
        // Remove
        let result = toggle_absence_impl(&mut conn, &abs).await.unwrap();
        assert!(result.is_none(), "Should return None (removed)");
    }

    #[tokio::test]
    async fn test_default_type_injustifiee() {
        let (mut conn, _tmp) = setup_test_db().await;
        let abs = make_absence(1, "2026-02-24", "matin");
        toggle_absence_impl(&mut conn, &abs).await.unwrap();

        let row: (String,) = sqlx::query_as(
            "SELECT type_absence FROM absences_v2 WHERE eleve_id = 1",
        )
        .fetch_one(&mut conn)
        .await
        .unwrap();
        assert_eq!(row.0, "injustifiee");
    }

    #[tokio::test]
    async fn test_update_type() {
        let (mut conn, _tmp) = setup_test_db().await;
        let abs = make_absence(1, "2026-02-24", "matin");
        let id = toggle_absence_impl(&mut conn, &abs).await.unwrap().unwrap();

        update_absence_type_impl(&mut conn, id, "medicale").await.unwrap();

        let row: (String,) = sqlx::query_as(
            "SELECT type_absence FROM absences_v2 WHERE id = ?",
        )
        .bind(id)
        .fetch_one(&mut conn)
        .await
        .unwrap();
        assert_eq!(row.0, "medicale");
    }

    #[tokio::test]
    async fn test_update_motif() {
        let (mut conn, _tmp) = setup_test_db().await;
        let abs = make_absence(1, "2026-02-24", "matin");
        let id = toggle_absence_impl(&mut conn, &abs).await.unwrap().unwrap();

        update_absence_motif_impl(&mut conn, id, "Rendez-vous medical").await.unwrap();

        let row: (Option<String>,) = sqlx::query_as(
            "SELECT motif FROM absences_v2 WHERE id = ?",
        )
        .bind(id)
        .fetch_one(&mut conn)
        .await
        .unwrap();
        assert_eq!(row.0.unwrap(), "Rendez-vous medical");
    }

    #[tokio::test]
    async fn test_load_absences_by_date() {
        let (mut conn, _tmp) = setup_test_db().await;

        toggle_absence_impl(&mut conn, &make_absence(1, "2026-02-24", "matin")).await.unwrap();
        toggle_absence_impl(&mut conn, &make_absence(2, "2026-02-24", "apres_midi")).await.unwrap();
        toggle_absence_impl(&mut conn, &make_absence(1, "2026-02-25", "matin")).await.unwrap();

        let filter = AbsenceFilter {
            annee_scolaire_id: 1,
            date: Some("2026-02-24".to_string()),
            week_start: None,
            week_end: None,
        };
        let absences = load_absences_impl(&mut conn, &filter).await.unwrap();
        assert_eq!(absences.len(), 2, "2 absences on 2026-02-24");
    }

    #[tokio::test]
    async fn test_load_absences_by_week() {
        let (mut conn, _tmp) = setup_test_db().await;

        toggle_absence_impl(&mut conn, &make_absence(1, "2026-02-24", "matin")).await.unwrap();
        toggle_absence_impl(&mut conn, &make_absence(1, "2026-02-25", "matin")).await.unwrap();
        toggle_absence_impl(&mut conn, &make_absence(1, "2026-03-03", "matin")).await.unwrap();

        let filter = AbsenceFilter {
            annee_scolaire_id: 1,
            date: None,
            week_start: Some("2026-02-24".to_string()),
            week_end: Some("2026-02-28".to_string()),
        };
        let absences = load_absences_impl(&mut conn, &filter).await.unwrap();
        assert_eq!(absences.len(), 2, "Only 2 in the feb 24-28 week");
    }

    #[tokio::test]
    async fn test_unique_constraint() {
        let (mut conn, _tmp) = setup_test_db().await;
        let abs = make_absence(1, "2026-02-24", "matin");

        // Direct insert (not toggle)
        sqlx::query(
            "INSERT INTO absences_v2 (eleve_id, date, demi_journee, type_absence, annee_scolaire_id)
             VALUES (1, '2026-02-24', 'matin', 'injustifiee', 1)",
        )
        .execute(&mut conn)
        .await
        .unwrap();

        // Second direct insert should fail
        let result = sqlx::query(
            "INSERT INTO absences_v2 (eleve_id, date, demi_journee, type_absence, annee_scolaire_id)
             VALUES (1, '2026-02-24', 'matin', 'injustifiee', 1)",
        )
        .execute(&mut conn)
        .await;
        assert!(result.is_err(), "UNIQUE constraint should prevent duplicate");
    }

    #[tokio::test]
    async fn test_check_constraint_demi_journee() {
        let (mut conn, _tmp) = setup_test_db().await;

        let result = sqlx::query(
            "INSERT INTO absences_v2 (eleve_id, date, demi_journee, type_absence, annee_scolaire_id)
             VALUES (1, '2026-02-24', 'soir', 'injustifiee', 1)",
        )
        .execute(&mut conn)
        .await;
        assert!(result.is_err(), "CHECK constraint should reject 'soir'");
    }

    #[tokio::test]
    async fn test_compute_alerts_below_threshold() {
        let (mut conn, _tmp) = setup_test_db().await;

        // 3 demi-journees injustifiees (below 4 threshold)
        toggle_absence_impl(&mut conn, &make_absence(1, "2026-02-20", "matin")).await.unwrap();
        toggle_absence_impl(&mut conn, &make_absence(1, "2026-02-21", "matin")).await.unwrap();
        toggle_absence_impl(&mut conn, &make_absence(1, "2026-02-22", "matin")).await.unwrap();

        let alerts = compute_alerts_impl(&mut conn, 1, "2026-02-24").await.unwrap();
        assert!(alerts.is_empty(), "3 < 4, no alert");
    }

    #[tokio::test]
    async fn test_compute_alerts_above_threshold() {
        let (mut conn, _tmp) = setup_test_db().await;

        // 4 demi-journees injustifiees
        toggle_absence_impl(&mut conn, &make_absence(1, "2026-02-20", "matin")).await.unwrap();
        toggle_absence_impl(&mut conn, &make_absence(1, "2026-02-20", "apres_midi")).await.unwrap();
        toggle_absence_impl(&mut conn, &make_absence(1, "2026-02-21", "matin")).await.unwrap();
        toggle_absence_impl(&mut conn, &make_absence(1, "2026-02-21", "apres_midi")).await.unwrap();

        let alerts = compute_alerts_impl(&mut conn, 1, "2026-02-24").await.unwrap();
        assert_eq!(alerts.len(), 1);
        assert_eq!(alerts[0].eleve_id, 1);
        assert_eq!(alerts[0].count, 4);
    }

    #[tokio::test]
    async fn test_compute_alerts_excludes_justified() {
        let (mut conn, _tmp) = setup_test_db().await;

        // 2 injustifiees + 2 justifiees = only 2 count for alert
        toggle_absence_impl(&mut conn, &make_absence(1, "2026-02-20", "matin")).await.unwrap();
        toggle_absence_impl(&mut conn, &make_absence(1, "2026-02-20", "apres_midi")).await.unwrap();

        let abs3 = NewAbsence {
            type_absence: Some("justifiee".to_string()),
            ..make_absence(1, "2026-02-21", "matin")
        };
        let abs4 = NewAbsence {
            type_absence: Some("justifiee".to_string()),
            ..make_absence(1, "2026-02-21", "apres_midi")
        };
        toggle_absence_impl(&mut conn, &abs3).await.unwrap();
        toggle_absence_impl(&mut conn, &abs4).await.unwrap();

        let alerts = compute_alerts_impl(&mut conn, 1, "2026-02-24").await.unwrap();
        assert!(alerts.is_empty(), "Only 2 injustifiees, no alert");
    }

    #[tokio::test]
    async fn test_compute_totaux_periode() {
        let (mut conn, _tmp) = setup_test_db().await;

        // Alice: 2 injustifiees + 1 medicale
        toggle_absence_impl(&mut conn, &make_absence(1, "2026-02-20", "matin")).await.unwrap();
        toggle_absence_impl(&mut conn, &make_absence(1, "2026-02-21", "matin")).await.unwrap();
        let med = NewAbsence {
            type_absence: Some("medicale".to_string()),
            ..make_absence(1, "2026-02-22", "matin")
        };
        toggle_absence_impl(&mut conn, &med).await.unwrap();

        // Bob: 1 justifiee
        let just = NewAbsence {
            type_absence: Some("justifiee".to_string()),
            ..make_absence(2, "2026-02-20", "matin")
        };
        toggle_absence_impl(&mut conn, &just).await.unwrap();

        let totaux = compute_totaux_periode_impl(&mut conn, 1, "2026-02-01", "2026-02-28").await.unwrap();
        assert_eq!(totaux.len(), 2);

        let alice = totaux.iter().find(|t| t.eleve_id == 1).unwrap();
        assert_eq!(alice.justifiees, 1, "1 medicale counts as justifiee");
        assert_eq!(alice.injustifiees, 2);

        let bob = totaux.iter().find(|t| t.eleve_id == 2).unwrap();
        assert_eq!(bob.justifiees, 1);
        assert_eq!(bob.injustifiees, 0);
    }

    #[tokio::test]
    async fn test_toggle_retard() {
        let (mut conn, _tmp) = setup_test_db().await;

        // Toggle retard on (creates record)
        let result = toggle_retard_impl(&mut conn, 1, "2026-02-24", "matin", 1).await.unwrap();
        assert!(result, "Should be retard=true");

        // Toggle retard off
        let result = toggle_retard_impl(&mut conn, 1, "2026-02-24", "matin", 1).await.unwrap();
        assert!(!result, "Should be retard=false");
    }
}
