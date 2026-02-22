use super::gbnf::{self, DomainInfo};
use super::manager::SidecarManager;
use super::prompt_builder::{self, DomainContext};
use super::types::{SidecarError, SidecarName};
use log::info;
use serde::{Deserialize, Serialize};
use sqlx::sqlite::SqlitePoolOptions;
use std::path::PathBuf;
use tauri::Manager;
use tokio::time::Instant;

const LLAMA_MODEL_NAME: &str = "qwen2.5-coder-1.5b-instruct-q4_k_m.gguf";
const GRAMMAR_FILE_NAME: &str = "appreciation.gbnf";

const SYSTEM_PROMPT: &str = r#"Tu es un assistant pedagogique pour une ecole elementaire (CM2).
Tu transformes les observations dictees par l'enseignant en JSON structure.
Tu ne generes QUE des objets JSON au format specifie par la grammaire.
Chaque observation doit etre classee dans un domaine d'apprentissage avec un niveau d'acquisition.
Les domaines autorises sont : Francais, Mathematiques, Sciences et Technologies, Histoire-Geographie, Enseignement Moral et Civique, Education Physique et Sportive, Arts Plastiques, Education Musicale, Langues Vivantes.
Les niveaux autorises sont : maitrise, en_cours_acquisition, debut.
Sois precis et concis dans les commentaires."#;

/// Result of a structuration request
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct StructurationResult {
    pub observations: Vec<ObservationResult>,
    pub duration_ms: u64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ObservationResult {
    pub domaine: String,
    pub niveau: String,
    pub commentaire: String,
}

/// Raw LLM response matching GBNF grammar
#[derive(Debug, Deserialize)]
struct LlmResponse {
    observations: Vec<ObservationResult>,
}

/// OpenAI-compatible chat completion response
#[derive(Debug, Deserialize)]
struct ChatCompletionResponse {
    choices: Vec<ChatChoice>,
}

#[derive(Debug, Deserialize)]
struct ChatChoice {
    message: ChatMessage,
}

#[derive(Debug, Deserialize)]
struct ChatMessage {
    content: String,
}

/// Resolve the Qwen model path in app_data_dir/models/
fn resolve_model_path(app: &tauri::AppHandle) -> Result<PathBuf, SidecarError> {
    let data_dir = app
        .path()
        .app_data_dir()
        .map_err(|e| SidecarError::Internal(format!("Impossible de trouver app_data_dir: {}", e)))?;

    let model_path = data_dir.join("models").join(LLAMA_MODEL_NAME);

    if !model_path.exists() {
        return Err(SidecarError::ModelNotFound(
            model_path.to_string_lossy().to_string(),
        ));
    }

    Ok(model_path)
}

/// Resolve the GBNF grammar path in app_data_dir/grammars/
fn resolve_grammar_path(app: &tauri::AppHandle) -> Result<PathBuf, SidecarError> {
    let data_dir = app
        .path()
        .app_data_dir()
        .map_err(|e| SidecarError::Internal(format!("Impossible de trouver app_data_dir: {}", e)))?;

    let grammar_path = data_dir.join("grammars").join(GRAMMAR_FILE_NAME);

    if !grammar_path.exists() {
        // Fallback: check in resource dir (bundled with app)
        let resource_dir = app
            .path()
            .resource_dir()
            .map_err(|e| SidecarError::Internal(format!("Impossible de trouver resource_dir: {}", e)))?;

        let bundled_path = resource_dir.join("grammars").join(GRAMMAR_FILE_NAME);
        if bundled_path.exists() {
            return Ok(bundled_path);
        }

        return Err(SidecarError::Internal(format!(
            "Grammaire GBNF introuvable: {} (ni dans app_data_dir, ni dans resources)",
            GRAMMAR_FILE_NAME
        )));
    }

    Ok(grammar_path)
}

/// Send a structuration request to llama-server via OpenAI-compatible API
async fn send_structuration_request(
    text: &str,
    student_name: &str,
) -> Result<LlmResponse, SidecarError> {
    let user_prompt = format!(
        "Eleve: {}\n\nObservation de l'enseignant:\n\"{}\"",
        student_name, text
    );

    let body = serde_json::json!({
        "model": "qwen2.5-coder",
        "messages": [
            { "role": "system", "content": SYSTEM_PROMPT },
            { "role": "user", "content": user_prompt }
        ],
        "temperature": 0.1,
        "max_tokens": 512
    });

    let client = reqwest::Client::builder()
        .timeout(std::time::Duration::from_secs(30))
        .build()
        .map_err(|e| SidecarError::Internal(e.to_string()))?;

    let response = client
        .post("http://127.0.0.1:8080/v1/chat/completions")
        .json(&body)
        .send()
        .await
        .map_err(|e| {
            SidecarError::Internal(format!(
                "Requete vers llama-server echouee: {}",
                e
            ))
        })?;

    if !response.status().is_success() {
        let status = response.status();
        let body = response.text().await.unwrap_or_default();
        return Err(SidecarError::Internal(format!(
            "llama-server a repondu avec le code {}: {}",
            status, body
        )));
    }

    let completion: ChatCompletionResponse = response.json().await.map_err(|e| {
        SidecarError::Internal(format!("Reponse JSON invalide de llama-server: {}", e))
    })?;

    let content = completion
        .choices
        .first()
        .map(|c| c.message.content.as_str())
        .unwrap_or("");

    let llm_response: LlmResponse = serde_json::from_str(content).map_err(|e| {
        SidecarError::Internal(format!(
            "JSON LLM invalide (grammaire GBNF non respectee?): {}. Contenu: {}",
            e, content
        ))
    })?;

    Ok(llm_response)
}

/// Structure free-text observations into categorized JSON using Qwen 2.5 via llama-server.
///
/// - Resolves model + grammar paths
/// - Starts llama-server if not already running (stops whisper if needed — ADR-002)
/// - Sends POST /v1/chat/completions with constrained prompt
/// - Returns structured observations
#[tauri::command]
pub async fn structure_text(
    app: tauri::AppHandle,
    state: tauri::State<'_, SidecarManager>,
    text: String,
    student_name: String,
) -> Result<StructurationResult, String> {
    let start = Instant::now();

    // Resolve paths
    let model_path = resolve_model_path(&app).map_err(|e| e.to_string())?;
    let model_path_str = model_path.to_string_lossy().to_string();
    let grammar_path = resolve_grammar_path(&app).map_err(|e| e.to_string())?;
    let grammar_path_str = grammar_path.to_string_lossy().to_string();

    // Check if llama is already running, start if not
    let status = state.get_status().await;
    if !status.llama.running {
        info!("llama-server non demarre, lancement automatique...");
        state
            .start(
                &app,
                SidecarName::Llama,
                model_path_str,
                Some(grammar_path_str),
            )
            .await
            .map_err(|e| e.to_string())?;
    }

    // Send structuration request
    let llm_response = send_structuration_request(&text, &student_name)
        .await
        .map_err(|e| e.to_string())?;

    // Increment request count
    state.increment_request_count(SidecarName::Llama).await;

    let duration_ms = start.elapsed().as_millis() as u64;

    info!(
        "Structuration terminee en {}ms: {} observations pour {}",
        duration_ms,
        llm_response.observations.len(),
        student_name
    );

    // ADR-002 / Story 13.4: Auto-stop llama after task in sequential mode
    // Frees RAM after structuration is complete
    state.auto_stop_after_task(&app, SidecarName::Llama).await;

    Ok(StructurationResult {
        observations: llm_response.observations,
        duration_ms,
    })
}

// ─── V2.1 — Classification + Fusion (Story 19.3) ───

/// Result of a classification+fusion request (V2.1)
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ClassificationResult {
    pub domaine_id: i64,
    pub domaine_nom: String,
    pub domaine_index: usize,
    pub observation_before: Option<String>,
    pub observation_after: String,
    pub duration_ms: u64,
}

/// Raw LLM response for classification (V2.1 GBNF)
#[derive(Debug, Deserialize)]
struct LlmClassification {
    domaine_id: usize,
    observation_mise_a_jour: String,
}

/// DB row for active domains query
#[derive(Debug, sqlx::FromRow)]
struct DomainRow {
    id: i64,
    nom: String,
}

/// DB row for existing observations query
#[derive(Debug, sqlx::FromRow)]
struct ObservationRow {
    domaine_id: i64,
    observations: Option<String>,
}

/// Open a read-only SQLite pool for classification queries
async fn open_db_pool(app: &tauri::AppHandle) -> Result<sqlx::SqlitePool, SidecarError> {
    let data_dir = app
        .path()
        .app_data_dir()
        .map_err(|e| SidecarError::Internal(format!("Impossible de trouver app_data_dir: {}", e)))?;
    let db_path = data_dir.join("comportement.db");
    let db_url = format!("sqlite:{}", db_path.to_string_lossy());

    let pool = SqlitePoolOptions::new()
        .max_connections(1)
        .connect(&db_url)
        .await
        .map_err(|e| SidecarError::Internal(format!("Connexion DB echouee: {}", e)))?;

    sqlx::query("PRAGMA foreign_keys = ON;")
        .execute(&pool)
        .await
        .map_err(|e| SidecarError::Internal(format!("PRAGMA echoue: {}", e)))?;

    Ok(pool)
}

/// Load active domains for a student's cycle from the DB.
/// If the student has no niveau set, returns all active domains.
async fn load_active_domains(
    pool: &sqlx::SqlitePool,
    eleve_id: i64,
) -> Result<Vec<DomainRow>, SidecarError> {
    // First, get the student's cycle from their niveau
    let cycle: Option<i64> = sqlx::query_scalar(
        "SELECT nc.cycle FROM students s
         JOIN niveaux_classe nc ON nc.code = s.niveau
         WHERE s.id = ?",
    )
    .bind(eleve_id)
    .fetch_optional(pool)
    .await
    .map_err(|e| SidecarError::Internal(format!("Requete cycle eleve echouee: {}", e)))?
    .flatten();

    let domains = match cycle {
        Some(c) => {
            // Domains matching the student's cycle + custom domains
            sqlx::query_as::<_, DomainRow>(
                "SELECT id, nom FROM domaines_apprentissage
                 WHERE actif = 1 AND (cycle = ? OR is_custom = 1)
                 ORDER BY ordre_affichage ASC",
            )
            .bind(c)
            .fetch_all(pool)
            .await
        }
        None => {
            // No niveau set: return all active domains
            sqlx::query_as::<_, DomainRow>(
                "SELECT id, nom FROM domaines_apprentissage
                 WHERE actif = 1
                 ORDER BY ordre_affichage ASC",
            )
            .fetch_all(pool)
            .await
        }
    }
    .map_err(|e| SidecarError::Internal(format!("Requete domaines echouee: {}", e)))?;

    if domains.is_empty() {
        return Err(SidecarError::Internal(
            "Aucun domaine actif trouve pour cet eleve".to_string(),
        ));
    }

    Ok(domains)
}

/// Load existing observations for a student/period pair
async fn load_existing_observations(
    pool: &sqlx::SqlitePool,
    eleve_id: i64,
    periode_id: i64,
) -> Result<Vec<ObservationRow>, SidecarError> {
    sqlx::query_as::<_, ObservationRow>(
        "SELECT domaine_id, observations FROM appreciations
         WHERE eleve_id = ? AND periode_id = ?
         ORDER BY created_at DESC",
    )
    .bind(eleve_id)
    .bind(periode_id)
    .fetch_all(pool)
    .await
    .map_err(|e| SidecarError::Internal(format!("Requete observations echouee: {}", e)))
}

/// Send a classification request to llama-server with dynamic GBNF grammar
async fn send_classification_request(
    system_prompt: &str,
    user_prompt: &str,
    grammar: &str,
) -> Result<LlmClassification, SidecarError> {
    let body = serde_json::json!({
        "model": "qwen2.5-coder",
        "messages": [
            { "role": "system", "content": system_prompt },
            { "role": "user", "content": user_prompt }
        ],
        "temperature": 0.1,
        "max_tokens": 256,
        "grammar": grammar
    });

    let client = reqwest::Client::builder()
        .timeout(std::time::Duration::from_secs(30))
        .build()
        .map_err(|e| SidecarError::Internal(e.to_string()))?;

    let response = client
        .post("http://127.0.0.1:8080/v1/chat/completions")
        .json(&body)
        .send()
        .await
        .map_err(|e| {
            SidecarError::Internal(format!("Requete vers llama-server echouee: {}", e))
        })?;

    if !response.status().is_success() {
        let status = response.status();
        let body_text = response.text().await.unwrap_or_default();
        return Err(SidecarError::Internal(format!(
            "llama-server a repondu avec le code {}: {}",
            status, body_text
        )));
    }

    let completion: ChatCompletionResponse = response.json().await.map_err(|e| {
        SidecarError::Internal(format!("Reponse JSON invalide de llama-server: {}", e))
    })?;

    let content = completion
        .choices
        .first()
        .map(|c| c.message.content.as_str())
        .unwrap_or("");

    let classification: LlmClassification = serde_json::from_str(content).map_err(|e| {
        SidecarError::Internal(format!(
            "JSON classification invalide: {}. Contenu: {}",
            e, content
        ))
    })?;

    Ok(classification)
}

/// Validate a classification result from the LLM
fn validate_classification(
    classification: &LlmClassification,
    domain_count: usize,
) -> Result<(), SidecarError> {
    if classification.domaine_id >= domain_count {
        return Err(SidecarError::Internal(format!(
            "domaine_id {} hors range (0..{})",
            classification.domaine_id,
            domain_count - 1
        )));
    }

    let obs = classification.observation_mise_a_jour.trim();
    if obs.is_empty() {
        return Err(SidecarError::Internal(
            "observation_mise_a_jour vide".to_string(),
        ));
    }

    if obs.len() > 300 {
        return Err(SidecarError::Internal(format!(
            "observation_mise_a_jour trop longue ({} chars, max 300)",
            obs.len()
        )));
    }

    Ok(())
}

/// Classify dictated text into a domain and merge with existing observations (V2.1).
///
/// Pipeline:
/// 1. Load active domains for the student's cycle from DB
/// 2. Load existing observations for the student/period
/// 3. Generate dynamic GBNF grammar (ADR-007)
/// 4. Build adaptive prompt (ADR-008)
/// 5. Start llama-server if needed
/// 6. Send request with grammar constraint
/// 7. Parse, validate, and return ClassificationResult
/// 8. Auto-stop llama (ADR-002)
#[tauri::command]
pub async fn classify_and_merge(
    app: tauri::AppHandle,
    state: tauri::State<'_, SidecarManager>,
    text: String,
    eleve_id: i64,
    periode_id: i64,
) -> Result<ClassificationResult, String> {
    let start = Instant::now();

    // Step 1: Open DB and load domains
    let pool = open_db_pool(&app).await.map_err(|e| e.to_string())?;
    let domains = load_active_domains(&pool, eleve_id)
        .await
        .map_err(|e| e.to_string())?;

    // Step 2: Load existing observations
    let observations = load_existing_observations(&pool, eleve_id, periode_id)
        .await
        .map_err(|e| e.to_string())?;

    // Build a lookup: domaine_id → most recent observation
    let mut obs_map: std::collections::HashMap<i64, String> = std::collections::HashMap::new();
    for obs in &observations {
        if let Some(ref text) = obs.observations {
            // First entry wins (already ordered by created_at DESC)
            obs_map.entry(obs.domaine_id).or_insert_with(|| text.clone());
        }
    }

    // Step 3: Build DomainInfo for GBNF
    let domain_infos: Vec<DomainInfo> = domains
        .iter()
        .map(|d| DomainInfo {
            id: d.id,
            nom: d.nom.clone(),
        })
        .collect();

    let grammar = gbnf::generate_gbnf(&domain_infos);

    // Step 4: Build DomainContext for prompt
    let domain_contexts: Vec<DomainContext> = domains
        .iter()
        .enumerate()
        .map(|(i, d)| DomainContext {
            index: i,
            nom: d.nom.clone(),
            observation_existante: obs_map.get(&d.id).cloned(),
        })
        .collect();

    let prompt_result = prompt_builder::build_prompt(&domain_contexts, &text);

    // Step 5: Start llama-server if not running
    let model_path = resolve_model_path(&app).map_err(|e| e.to_string())?;
    let model_path_str = model_path.to_string_lossy().to_string();

    let status = state.get_status().await;
    if !status.llama.running {
        info!("llama-server non demarre, lancement automatique...");
        state
            .start(&app, SidecarName::Llama, model_path_str, None)
            .await
            .map_err(|e| e.to_string())?;
    }

    // Step 6: Send classification request
    let classification = send_classification_request(
        &prompt_result.system_prompt,
        &prompt_result.user_prompt,
        &grammar,
    )
    .await
    .map_err(|e| e.to_string())?;

    // Increment request count
    state.increment_request_count(SidecarName::Llama).await;

    // Step 7: Validate
    validate_classification(&classification, domains.len()).map_err(|e| e.to_string())?;

    // Map index → real domain
    let domain = &domains[classification.domaine_id];
    let observation_before = obs_map.get(&domain.id).cloned();

    let duration_ms = start.elapsed().as_millis() as u64;

    info!(
        "Classification terminee en {}ms: domaine={} (index={}) pour eleve_id={}",
        duration_ms, domain.nom, classification.domaine_id, eleve_id
    );

    // Step 8: Auto-stop llama (ADR-002)
    state.auto_stop_after_task(&app, SidecarName::Llama).await;

    Ok(ClassificationResult {
        domaine_id: domain.id,
        domaine_nom: domain.nom.clone(),
        domaine_index: classification.domaine_id,
        observation_before,
        observation_after: classification.observation_mise_a_jour.trim().to_string(),
        duration_ms,
    })
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn parse_valid_llm_json() {
        let json = r#"{"observations":[{"domaine":"Francais","niveau":"maitrise","commentaire":"Excellent travail en lecture"}]}"#;
        let result: LlmResponse = serde_json::from_str(json).unwrap();
        assert_eq!(result.observations.len(), 1);
        assert_eq!(result.observations[0].domaine, "Francais");
        assert_eq!(result.observations[0].niveau, "maitrise");
    }

    #[test]
    fn parse_multiple_observations() {
        let json = r#"{"observations":[
            {"domaine":"Francais","niveau":"maitrise","commentaire":"Tres bien en lecture"},
            {"domaine":"Mathematiques","niveau":"en_cours_acquisition","commentaire":"Progresse en calcul"}
        ]}"#;
        let result: LlmResponse = serde_json::from_str(json).unwrap();
        assert_eq!(result.observations.len(), 2);
        assert_eq!(result.observations[1].domaine, "Mathematiques");
    }

    #[test]
    fn reject_invalid_json() {
        let json = r#"{"invalid": true}"#;
        let result: Result<LlmResponse, _> = serde_json::from_str(json);
        assert!(result.is_err());
    }

    #[test]
    fn parse_chat_completion_response() {
        let json = r#"{
            "choices": [{
                "message": {
                    "content": "{\"observations\":[{\"domaine\":\"Francais\",\"niveau\":\"debut\",\"commentaire\":\"A ameliorer\"}]}"
                }
            }]
        }"#;
        let resp: ChatCompletionResponse = serde_json::from_str(json).unwrap();
        let content = &resp.choices[0].message.content;
        let llm: LlmResponse = serde_json::from_str(content).unwrap();
        assert_eq!(llm.observations[0].niveau, "debut");
    }

    // ─── V2.1 Classification tests ───

    #[test]
    fn parse_classification_json() {
        let json = r#"{"domaine_id": 2, "observation_mise_a_jour": "L'eleve progresse en calcul mental et maitrise les tables."}"#;
        let result: LlmClassification = serde_json::from_str(json).unwrap();
        assert_eq!(result.domaine_id, 2);
        assert!(result.observation_mise_a_jour.contains("calcul mental"));
    }

    #[test]
    fn reject_invalid_domaine_id() {
        let classification = LlmClassification {
            domaine_id: 10,
            observation_mise_a_jour: "Texte valide".to_string(),
        };
        let err = validate_classification(&classification, 5);
        assert!(err.is_err());
        assert!(err.unwrap_err().to_string().contains("hors range"));
    }

    #[test]
    fn reject_empty_observation() {
        let classification = LlmClassification {
            domaine_id: 0,
            observation_mise_a_jour: "   ".to_string(),
        };
        let err = validate_classification(&classification, 5);
        assert!(err.is_err());
        assert!(err.unwrap_err().to_string().contains("vide"));
    }

    #[test]
    fn reject_too_long_observation() {
        let classification = LlmClassification {
            domaine_id: 0,
            observation_mise_a_jour: "A".repeat(301),
        };
        let err = validate_classification(&classification, 5);
        assert!(err.is_err());
        assert!(err.unwrap_err().to_string().contains("trop longue"));
    }

    #[test]
    fn accept_valid_classification() {
        let classification = LlmClassification {
            domaine_id: 3,
            observation_mise_a_jour: "Bonne participation en histoire.".to_string(),
        };
        assert!(validate_classification(&classification, 9).is_ok());
    }

    #[test]
    fn accept_boundary_domaine_id() {
        // domaine_id = N-1 should be valid
        let classification = LlmClassification {
            domaine_id: 4,
            observation_mise_a_jour: "OK".to_string(),
        };
        assert!(validate_classification(&classification, 5).is_ok());
    }

    #[test]
    fn parse_classification_with_escaped_chars() {
        let json = r#"{"domaine_id": 0, "observation_mise_a_jour": "L'eleve a dit \"bonjour\" et travaille bien."}"#;
        let result: LlmClassification = serde_json::from_str(json).unwrap();
        assert_eq!(result.domaine_id, 0);
        assert!(result.observation_mise_a_jour.contains("bonjour"));
    }
}
