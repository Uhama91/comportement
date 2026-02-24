/// Module Events — Journal Pédagogique (Event Sourcing, ADR-014)
///
/// Append-only : INSERT uniquement, pas d'UPDATE ni DELETE.
/// Chaque événement reçoit un UUID v4 pour future sync mobile.

use serde::{Deserialize, Serialize};
use sqlx::Connection;

use crate::annee::check_annee_not_closed_impl;
use crate::migrations::get_db_path;

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct NewEvent {
    pub eleve_id: i64,
    pub annee_scolaire_id: i64,
    pub periode_id: Option<i64>,
    #[serde(rename = "type")]
    pub event_type: String, // 'observation' | 'evaluation' | 'motif_sanction'
    pub domaine_id: Option<i64>,
    pub lecon: Option<String>,
    pub niveau_lsu: Option<String>,
    pub observations: Option<String>,
    pub texte_dictation: Option<String>,
    pub source: String, // 'vocal' | 'manual'
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PedagogicalEvent {
    pub id: i64,
    pub uuid: String,
    pub eleve_id: i64,
    pub annee_scolaire_id: i64,
    pub periode_id: Option<i64>,
    #[serde(rename = "type")]
    pub event_type: String,
    pub domaine_id: Option<i64>,
    pub lecon: Option<String>,
    pub niveau_lsu: Option<String>,
    pub observations: Option<String>,
    pub texte_dictation: Option<String>,
    pub source: String,
    pub created_at: String,
    pub synced_at: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
pub struct EventFilter {
    pub eleve_id: Option<i64>,
    pub annee_scolaire_id: Option<i64>,
    pub periode_id: Option<i64>,
    pub domaine_id: Option<i64>,
    pub event_type: Option<String>,
}

// ─────────────────────────────────────────────────────────────────────────────
// Impls (testable, prennent une connexion)
// ─────────────────────────────────────────────────────────────────────────────

pub async fn add_event_impl(
    conn: &mut sqlx::sqlite::SqliteConnection,
    event: &NewEvent,
) -> Result<i64, String> {
    // Guard : année non clôturée
    check_annee_not_closed_impl(conn, event.annee_scolaire_id).await?;

    let uuid = uuid::Uuid::new_v4().to_string();

    let result = sqlx::query(
        "INSERT INTO evenements_pedagogiques
            (uuid, eleve_id, annee_scolaire_id, periode_id, type, domaine_id, lecon, niveau_lsu, observations, texte_dictation, source)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
    )
    .bind(&uuid)
    .bind(event.eleve_id)
    .bind(event.annee_scolaire_id)
    .bind(event.periode_id)
    .bind(&event.event_type)
    .bind(event.domaine_id)
    .bind(&event.lecon)
    .bind(&event.niveau_lsu)
    .bind(&event.observations)
    .bind(&event.texte_dictation)
    .bind(&event.source)
    .execute(&mut *conn)
    .await
    .map_err(|e| format!("Erreur insertion événement : {}", e))?;

    Ok(result.last_insert_rowid())
}

pub async fn load_events_impl(
    conn: &mut sqlx::sqlite::SqliteConnection,
    filter: &EventFilter,
) -> Result<Vec<PedagogicalEvent>, String> {
    let mut sql = String::from(
        "SELECT id, uuid, eleve_id, annee_scolaire_id, periode_id, type, domaine_id,
                lecon, niveau_lsu, observations, texte_dictation, source, created_at, synced_at
         FROM evenements_pedagogiques WHERE 1=1",
    );
    let mut binds: Vec<String> = Vec::new();

    if let Some(v) = filter.eleve_id {
        sql.push_str(" AND eleve_id = ?");
        binds.push(v.to_string());
    }
    if let Some(v) = filter.annee_scolaire_id {
        sql.push_str(" AND annee_scolaire_id = ?");
        binds.push(v.to_string());
    }
    if let Some(v) = filter.periode_id {
        sql.push_str(" AND periode_id = ?");
        binds.push(v.to_string());
    }
    if let Some(v) = filter.domaine_id {
        sql.push_str(" AND domaine_id = ?");
        binds.push(v.to_string());
    }
    if let Some(ref v) = filter.event_type {
        sql.push_str(" AND type = ?");
        binds.push(v.clone());
    }

    sql.push_str(" ORDER BY created_at DESC, id DESC");

    // Build query with dynamic binds
    let mut query = sqlx::query_as::<_, EventRow>(&sql);
    for b in &binds {
        query = query.bind(b);
    }

    let rows = query
        .fetch_all(&mut *conn)
        .await
        .map_err(|e| format!("Erreur chargement événements : {}", e))?;

    Ok(rows.into_iter().map(|r| r.into()).collect())
}

/// Row struct pour sqlx::FromRow (snake_case DB → struct)
#[derive(Debug, sqlx::FromRow)]
struct EventRow {
    id: i64,
    uuid: String,
    eleve_id: i64,
    annee_scolaire_id: i64,
    periode_id: Option<i64>,
    #[sqlx(rename = "type")]
    event_type: String,
    domaine_id: Option<i64>,
    lecon: Option<String>,
    niveau_lsu: Option<String>,
    observations: Option<String>,
    texte_dictation: Option<String>,
    source: String,
    created_at: String,
    synced_at: Option<String>,
}

impl From<EventRow> for PedagogicalEvent {
    fn from(r: EventRow) -> Self {
        PedagogicalEvent {
            id: r.id,
            uuid: r.uuid,
            eleve_id: r.eleve_id,
            annee_scolaire_id: r.annee_scolaire_id,
            periode_id: r.periode_id,
            event_type: r.event_type,
            domaine_id: r.domaine_id,
            lecon: r.lecon,
            niveau_lsu: r.niveau_lsu,
            observations: r.observations,
            texte_dictation: r.texte_dictation,
            source: r.source,
            created_at: r.created_at,
            synced_at: r.synced_at,
        }
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// Commandes Tauri
// ─────────────────────────────────────────────────────────────────────────────

#[tauri::command]
pub async fn add_event(app: tauri::AppHandle, event: NewEvent) -> Result<i64, String> {
    let db_path = get_db_path(&app)?;
    let db_url = format!("sqlite:{}", db_path.display());
    let mut conn = sqlx::sqlite::SqliteConnection::connect(&db_url)
        .await
        .map_err(|e| format!("Impossible d'ouvrir la DB : {}", e))?;

    add_event_impl(&mut conn, &event).await
}

#[tauri::command]
pub async fn load_events(
    app: tauri::AppHandle,
    filter: EventFilter,
) -> Result<Vec<PedagogicalEvent>, String> {
    let db_path = get_db_path(&app)?;
    let db_url = format!("sqlite:{}", db_path.display());
    let mut conn = sqlx::sqlite::SqliteConnection::connect(&db_url)
        .await
        .map_err(|e| format!("Impossible d'ouvrir la DB : {}", e))?;

    load_events_impl(&mut conn, &filter).await
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

        // Schema minimal pour les tests events
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
            "CREATE TABLE evenements_pedagogiques (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                uuid TEXT UNIQUE,
                eleve_id INTEGER NOT NULL REFERENCES students(id) ON DELETE CASCADE,
                annee_scolaire_id INTEGER NOT NULL REFERENCES annees_scolaires(id),
                periode_id INTEGER REFERENCES config_periodes(id),
                type TEXT NOT NULL CHECK(type IN ('observation', 'evaluation', 'motif_sanction')),
                domaine_id INTEGER REFERENCES domaines_apprentissage(id),
                lecon TEXT,
                niveau_lsu TEXT CHECK(niveau_lsu IN ('non_atteints', 'partiellement_atteints', 'atteints', 'depasses')),
                observations TEXT,
                texte_dictation TEXT,
                source TEXT DEFAULT 'manual' CHECK(source IN ('vocal', 'manual')),
                created_at TEXT DEFAULT (datetime('now')),
                synced_at TEXT
            )",
        )
        .execute(&mut conn)
        .await
        .unwrap();

        // Seed data
        sqlx::query("INSERT INTO annees_scolaires (label, date_debut, date_fin, active) VALUES ('2025-2026', '2025-09-01', '2026-07-05', 1)")
            .execute(&mut conn).await.unwrap();
        sqlx::query("INSERT INTO students (first_name) VALUES ('Alice'), ('Bob')")
            .execute(&mut conn).await.unwrap();
        sqlx::query("INSERT INTO domaines_apprentissage (nom) VALUES ('Français'), ('Mathématiques')")
            .execute(&mut conn).await.unwrap();
        sqlx::query("INSERT INTO config_periodes (annee_scolaire, type_periode, numero, date_debut, date_fin) VALUES ('2025-2026', 'trimestre', 1, '2025-09-01', '2025-12-20')")
            .execute(&mut conn).await.unwrap();

        (conn, tmp)
    }

    fn make_event(eleve_id: i64, event_type: &str, source: &str) -> NewEvent {
        NewEvent {
            eleve_id,
            annee_scolaire_id: 1,
            periode_id: Some(1),
            event_type: event_type.to_string(),
            domaine_id: Some(1),
            lecon: None,
            niveau_lsu: None,
            observations: Some("Bonne participation".to_string()),
            texte_dictation: None,
            source: source.to_string(),
        }
    }

    #[tokio::test]
    async fn test_add_event_returns_id() {
        let (mut conn, _tmp) = setup_test_db().await;
        let event = make_event(1, "observation", "manual");
        let id = add_event_impl(&mut conn, &event).await.unwrap();
        assert!(id > 0, "L'id doit être positif");
    }

    #[tokio::test]
    async fn test_add_event_generates_uuid() {
        let (mut conn, _tmp) = setup_test_db().await;
        let event = make_event(1, "observation", "manual");
        add_event_impl(&mut conn, &event).await.unwrap();

        let uuid: String =
            sqlx::query_scalar("SELECT uuid FROM evenements_pedagogiques WHERE id = 1")
                .fetch_one(&mut conn)
                .await
                .unwrap();
        assert!(!uuid.is_empty(), "UUID ne doit pas être vide");
        assert!(uuid.contains('-'), "UUID doit être au format v4 (avec tirets)");
    }

    #[tokio::test]
    async fn test_add_event_blocked_by_closed_annee() {
        let (mut conn, _tmp) = setup_test_db().await;

        // Clôturer l'année
        sqlx::query("UPDATE annees_scolaires SET cloturee = 1 WHERE id = 1")
            .execute(&mut conn)
            .await
            .unwrap();

        let event = make_event(1, "observation", "manual");
        let result = add_event_impl(&mut conn, &event).await;
        assert!(result.is_err(), "Le guard doit bloquer une année clôturée");
        assert!(result.unwrap_err().contains("cloturee"));
    }

    #[tokio::test]
    async fn test_load_events_empty() {
        let (mut conn, _tmp) = setup_test_db().await;
        let filter = EventFilter {
            eleve_id: Some(1),
            annee_scolaire_id: Some(1),
            ..Default::default()
        };
        let events = load_events_impl(&mut conn, &filter).await.unwrap();
        assert!(events.is_empty());
    }

    #[tokio::test]
    async fn test_load_events_by_eleve() {
        let (mut conn, _tmp) = setup_test_db().await;

        // Insérer pour Alice (id=1) et Bob (id=2)
        add_event_impl(&mut conn, &make_event(1, "observation", "manual")).await.unwrap();
        add_event_impl(&mut conn, &make_event(1, "evaluation", "vocal")).await.unwrap();
        add_event_impl(&mut conn, &make_event(2, "observation", "manual")).await.unwrap();

        let filter = EventFilter {
            eleve_id: Some(1),
            ..Default::default()
        };
        let events = load_events_impl(&mut conn, &filter).await.unwrap();
        assert_eq!(events.len(), 2, "Alice doit avoir 2 événements");
        assert!(events.iter().all(|e| e.eleve_id == 1));
    }

    #[tokio::test]
    async fn test_load_events_by_type() {
        let (mut conn, _tmp) = setup_test_db().await;

        add_event_impl(&mut conn, &make_event(1, "observation", "manual")).await.unwrap();
        add_event_impl(&mut conn, &make_event(1, "evaluation", "manual")).await.unwrap();
        add_event_impl(&mut conn, &make_event(1, "motif_sanction", "vocal")).await.unwrap();

        let filter = EventFilter {
            event_type: Some("evaluation".to_string()),
            ..Default::default()
        };
        let events = load_events_impl(&mut conn, &filter).await.unwrap();
        assert_eq!(events.len(), 1);
        assert_eq!(events[0].event_type, "evaluation");
    }

    #[tokio::test]
    async fn test_load_events_by_domaine_and_periode() {
        let (mut conn, _tmp) = setup_test_db().await;

        let mut event = make_event(1, "observation", "manual");
        event.domaine_id = Some(1);
        event.periode_id = Some(1);
        add_event_impl(&mut conn, &event).await.unwrap();

        let mut event2 = make_event(1, "observation", "manual");
        event2.domaine_id = Some(2);
        event2.periode_id = Some(1);
        add_event_impl(&mut conn, &event2).await.unwrap();

        let filter = EventFilter {
            domaine_id: Some(1),
            periode_id: Some(1),
            ..Default::default()
        };
        let events = load_events_impl(&mut conn, &filter).await.unwrap();
        assert_eq!(events.len(), 1, "Filtre domaine+periode");
    }

    #[tokio::test]
    async fn test_events_ordered_desc() {
        let (mut conn, _tmp) = setup_test_db().await;

        add_event_impl(&mut conn, &make_event(1, "observation", "manual")).await.unwrap();
        add_event_impl(&mut conn, &make_event(1, "evaluation", "manual")).await.unwrap();

        let filter = EventFilter {
            eleve_id: Some(1),
            ..Default::default()
        };
        let events = load_events_impl(&mut conn, &filter).await.unwrap();
        assert_eq!(events.len(), 2);
        // Le plus récent en premier (id 2 > id 1)
        assert!(events[0].id >= events[1].id);
    }

    #[tokio::test]
    async fn test_event_check_constraint_type() {
        let (mut conn, _tmp) = setup_test_db().await;
        let event = make_event(1, "invalid_type", "manual");
        let result = add_event_impl(&mut conn, &event).await;
        assert!(result.is_err(), "Type invalide doit être rejeté par CHECK constraint");
    }

    #[tokio::test]
    async fn test_event_check_constraint_source() {
        let (mut conn, _tmp) = setup_test_db().await;
        let event = make_event(1, "observation", "invalid_source");
        let result = add_event_impl(&mut conn, &event).await;
        assert!(result.is_err(), "Source invalide doit être rejeté par CHECK constraint");
    }
}
