pub mod executor;
pub mod schema;
pub mod validator;

use crate::sidecar::structuration::ObservationResult;
use executor::{execute_validated_inserts, InsertResult};
use log::info;
use sqlx::sqlite::SqlitePoolOptions;
use tauri::Manager;
use validator::validate_observations;

/// Validate LLM-generated observations (Layer 3) then insert into DB (Layer 4).
///
/// The frontend should call this AFTER showing the LLM result to the teacher
/// for review (principle from Story 15.3).
#[tauri::command]
pub async fn validate_and_insert_observations(
    app: tauri::AppHandle,
    observations: Vec<ObservationResult>,
    eleve_id: i64,
    periode_id: i64,
    original_text: Option<String>,
) -> Result<InsertResult, String> {
    // Layer 3: Pure validation
    let validated = validate_observations(&observations, original_text.as_deref())
        .map_err(|e| e.to_string())?;

    info!(
        "Layer 3 OK: {} observations validees pour eleve_id={}",
        validated.len(),
        eleve_id
    );

    // Resolve DB path from Tauri app data dir
    let data_dir = app
        .path()
        .app_data_dir()
        .map_err(|e| format!("Impossible de trouver app_data_dir: {}", e))?;
    let db_path = data_dir.join("comportement.db");
    let db_url = format!("sqlite:{}", db_path.to_string_lossy());

    // Open a pool for this request (lightweight for ~5 inserts/day)
    let pool = SqlitePoolOptions::new()
        .max_connections(1)
        .connect(&db_url)
        .await
        .map_err(|e| format!("Connexion DB echouee: {}", e))?;

    // Enable foreign keys (SQLite requires this per-connection)
    sqlx::query("PRAGMA foreign_keys = ON;")
        .execute(&pool)
        .await
        .map_err(|e| format!("PRAGMA foreign_keys echoue: {}", e))?;

    // Layer 4: Prepared statement inserts in a transaction
    let result = execute_validated_inserts(&pool, eleve_id, periode_id, &validated)
        .await
        .map_err(|e| e.to_string())?;

    info!(
        "Layer 4 OK: {} appreciations inserees pour eleve_id={} periode_id={}",
        result.count, eleve_id, periode_id
    );

    Ok(result)
}
