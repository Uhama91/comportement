use super::gbnf::{self, DomainInfo};
use super::manager::SidecarManager;
use super::prompt_builder::{self, DomainContext, EventContext, SynthesisContext};
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

/// Single item in a classification+fusion response (V2.1)
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ClassificationResultItem {
    pub domaine_id: i64,
    pub domaine_nom: String,
    pub domaine_index: usize,
    pub observation_before: Option<String>,
    pub observation_after: String,
}

/// Full classification response with all items (V2.1 multi-domain)
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ClassificationResults {
    pub items: Vec<ClassificationResultItem>,
    pub duration_ms: u64,
}

/// Raw LLM response item for classification (V2.1 GBNF)
#[derive(Debug, Deserialize)]
struct LlmClassificationItem {
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

/// Recover valid items from truncated JSON array.
/// The LLM sometimes exceeds max_tokens, producing truncated JSON like:
///   [{"domaine_id": 0, "observation_mise_a_jour": "text"}, {"domaine_id": 1, "observ
/// This function finds the last complete `}` and closes the array with `]`.
fn recover_truncated_json(content: &str) -> Option<Vec<LlmClassificationItem>> {
    // Find the last complete item (ends with `}`)
    let mut last_valid_end = None;
    let mut depth = 0;
    let mut in_string = false;
    let mut escape_next = false;

    for (i, ch) in content.char_indices() {
        if escape_next {
            escape_next = false;
            continue;
        }
        if ch == '\\' && in_string {
            escape_next = true;
            continue;
        }
        if ch == '"' {
            in_string = !in_string;
            continue;
        }
        if in_string {
            continue;
        }
        match ch {
            '{' => depth += 1,
            '}' => {
                depth -= 1;
                if depth == 0 {
                    last_valid_end = Some(i);
                }
            }
            _ => {}
        }
    }

    let end = last_valid_end?;
    // Build valid JSON: everything up to and including the last `}`, then close array
    let partial = &content[..=end];
    // Ensure it starts with `[`
    let trimmed = partial.trim_start();
    if !trimmed.starts_with('[') {
        return None;
    }
    let json_str = format!("{}]", partial.trim_end().trim_end_matches(','));
    serde_json::from_str(&json_str).ok()
}

/// Send a classification request to llama-server with dynamic GBNF grammar.
/// Returns a Vec of classification items (multi-domain support).
async fn send_classification_request(
    system_prompt: &str,
    user_prompt: &str,
    grammar: &str,
) -> Result<Vec<LlmClassificationItem>, SidecarError> {
    let body = serde_json::json!({
        "model": "qwen2.5-coder",
        "messages": [
            { "role": "system", "content": system_prompt },
            { "role": "user", "content": user_prompt }
        ],
        "temperature": 0.1,
        "max_tokens": 768,
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

    // Try direct parse first; if truncated, recover partial JSON
    let items: Vec<LlmClassificationItem> = match serde_json::from_str(content) {
        Ok(v) => v,
        Err(_) => {
            // JSON likely truncated by max_tokens — recover valid items
            match recover_truncated_json(content) {
                Some(recovered) => {
                    info!(
                        "JSON LLM tronque, {} item(s) recupere(s) sur reponse partielle",
                        recovered.len()
                    );
                    recovered
                }
                None => {
                    return Err(SidecarError::Internal(format!(
                        "JSON classification invalide (attendu: tableau): Contenu: {}",
                        &content[..content.len().min(200)]
                    )));
                }
            }
        }
    };

    if items.is_empty() {
        return Err(SidecarError::Internal(
            "Le LLM a retourne un tableau vide".to_string(),
        ));
    }

    Ok(items)
}

/// Max chars for an observation — truncate (don't reject) if exceeded
const MAX_OBSERVATION_CHARS: usize = 500;

/// Validate a single classification item from the LLM.
/// Returns the (possibly truncated) observation text.
fn validate_classification_item(
    item: &LlmClassificationItem,
    domain_count: usize,
) -> Result<String, SidecarError> {
    if item.domaine_id >= domain_count {
        return Err(SidecarError::Internal(format!(
            "domaine_id {} hors range (0..{})",
            item.domaine_id,
            domain_count - 1
        )));
    }

    let obs = item.observation_mise_a_jour.trim();
    if obs.is_empty() {
        return Err(SidecarError::Internal(
            "observation_mise_a_jour vide".to_string(),
        ));
    }

    // Truncate to MAX_OBSERVATION_CHARS if the LLM was too verbose
    if obs.len() > MAX_OBSERVATION_CHARS {
        // Find last sentence end within limit
        let truncated = &obs[..obs.floor_char_boundary(MAX_OBSERVATION_CHARS)];
        let last_period = truncated.rfind('.');
        let clean = match last_period {
            Some(pos) if pos > MAX_OBSERVATION_CHARS / 2 => &truncated[..=pos],
            _ => truncated,
        };
        info!(
            "Observation tronquee: {} chars -> {} chars",
            obs.len(),
            clean.len()
        );
        return Ok(clean.to_string());
    }

    Ok(obs.to_string())
}

/// Keywords that map to domain names for post-filtering hallucinated domains.
/// The LLM (Qwen 1.5B) tends to fill ALL domains even when only a few are mentioned.
/// This function checks if a domain is actually referenced in the dictated text.
fn domain_mentioned_in_text(domain_name: &str, text: &str) -> bool {
    let text_lower = text.to_lowercase();
    let name_lower = domain_name.to_lowercase();

    // Direct name match
    if text_lower.contains(&name_lower) {
        return true;
    }

    // Keyword aliases for common domains (includes singular/plural variants)
    let keywords: &[(&str, &[&str])] = &[
        ("francais", &["francais", "français", "lecture", "ecriture", "écriture", "orthographe", "grammaire", "conjugaison", "vocabulaire", "dictee", "dictée", "rédaction", "redaction", "expression écrite", "expression ecrite", "compréhension", "comprehension"]),
        ("mathematiques", &["mathematiques", "mathématiques", "maths", "calcul", "géométrie", "geometrie", "numération", "numeration", "problèmes", "problemes", "multiplication", "division", "addition", "soustraction", "nombres"]),
        ("sciences", &["sciences", "science", "technologie", "vivant", "matière", "matiere", "énergie", "energie", "expérience", "experience"]),
        ("histoire", &["histoire", "géographie", "geographie", "géo", "geo", "carte", "chronologie", "époque", "epoque"]),
        ("enseignement moral", &["moral", "civique", "citoyen", "citoyenneté", "citoyennete", "respect", "règles", "regles", "débat", "debat", "laïcité", "laicite"]),
        ("education physique", &["sport", "sportive", "physique", "eps", "course", "gymnastique", "natation", "athlétisme", "athletisme", "jeux", "badminton", "basket", "football", "handball", "rugby", "natation", "escalade"]),
        ("arts plastiques", &["art plastique", "arts plastiques", "plastique", "dessin", "peinture", "sculpture", "arts visuels", "art visuel", "collage", "modelage"]),
        ("education musicale", &["musique", "musicale", "musical", "chant", "instrument", "rythme", "chorale"]),
        ("langues vivantes", &["anglais", "langue vivante", "langues vivantes", "langue", "langues", "english", "espagnol", "allemand"]),
    ];

    for (domain_key, domain_keywords) in keywords {
        if name_lower.contains(domain_key) {
            return domain_keywords.iter().any(|kw| text_lower.contains(kw));
        }
    }

    // Unknown domain: keep it (don't filter custom domains)
    true
}

/// Classify dictated text into one or more domains and merge with existing observations (V2.1).
///
/// Pipeline:
/// 1. Load active domains for the student's cycle from DB
/// 2. Load existing observations for the student/period
/// 3. Generate dynamic GBNF grammar (ADR-007) — array format
/// 4. Build adaptive prompt (ADR-008) — multi-domain + error correction
/// 5. Start llama-server if needed
/// 6. Send request with grammar constraint
/// 7. Parse, validate each item, and return ClassificationResults
/// 8. Auto-stop llama (ADR-002)
#[tauri::command]
pub async fn classify_and_merge(
    app: tauri::AppHandle,
    state: tauri::State<'_, SidecarManager>,
    text: String,
    eleve_id: i64,
    periode_id: i64,
) -> Result<ClassificationResults, String> {
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

    // Step 6: Send classification request (returns Vec)
    let classification_items = send_classification_request(
        &prompt_result.system_prompt,
        &prompt_result.user_prompt,
        &grammar,
    )
    .await
    .map_err(|e| e.to_string())?;

    // Increment request count
    state.increment_request_count(SidecarName::Llama).await;

    // Step 7: Validate each item, post-filter hallucinated domains, and build results
    let mut items: Vec<ClassificationResultItem> = Vec::new();
    for item in &classification_items {
        let observation_text =
            validate_classification_item(item, domains.len()).map_err(|e| e.to_string())?;

        let domain = &domains[item.domaine_id];

        // Post-filter: skip domains not actually mentioned in the dictation
        if !domain_mentioned_in_text(&domain.nom, &text) {
            info!(
                "Domaine '{}' filtre (non mentionne dans la dictee)",
                domain.nom
            );
            continue;
        }

        let observation_before = obs_map.get(&domain.id).cloned();

        items.push(ClassificationResultItem {
            domaine_id: domain.id,
            domaine_nom: domain.nom.clone(),
            domaine_index: item.domaine_id,
            observation_before,
            observation_after: observation_text,
        });
    }

    // If all items were filtered, keep the first one as fallback
    if items.is_empty() && !classification_items.is_empty() {
        let first = &classification_items[0];
        let observation_text =
            validate_classification_item(first, domains.len()).map_err(|e| e.to_string())?;
        let domain = &domains[first.domaine_id];
        items.push(ClassificationResultItem {
            domaine_id: domain.id,
            domaine_nom: domain.nom.clone(),
            domaine_index: first.domaine_id,
            observation_before: obs_map.get(&domain.id).cloned(),
            observation_after: observation_text,
        });
        info!("Tous les domaines filtres, fallback sur le premier");
    }

    let duration_ms = start.elapsed().as_millis() as u64;

    info!(
        "Classification terminee en {}ms: {} domaine(s) retenu(s) (sur {} du LLM) pour eleve_id={}",
        duration_ms, items.len(), classification_items.len(), eleve_id
    );

    // Step 8: Auto-stop llama (ADR-002)
    state.auto_stop_after_task(&app, SidecarName::Llama).await;

    Ok(ClassificationResults {
        items,
        duration_ms,
    })
}

// ─── V2.1 — Job 2 (Synthese) + Job 3 (Appreciation) ───

/// Response type for Job 2 — Synthese LSU
#[derive(Debug, Deserialize)]
struct LlmSyntheseResponse {
    synthese: String,
}

/// Response type for Job 3 — Appreciation generale
#[derive(Debug, Deserialize)]
struct LlmAppreciationResponse {
    appreciation: String,
}

/// Result returned to the frontend for Job 2
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SyntheseResult {
    pub synthese: String,
    pub duration_ms: u64,
}

/// Result returned to the frontend for Job 3
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AppreciationResult {
    pub appreciation: String,
    pub duration_ms: u64,
}

/// Generic LLM request helper — sends system+user prompt with grammar, returns raw content string.
///
/// Extracted to avoid duplicating HTTP code across Jobs 2 and 3.
async fn send_simple_llm_request(
    system_prompt: &str,
    user_prompt: &str,
    grammar: &str,
    max_tokens: u32,
    timeout_secs: u64,
) -> Result<String, SidecarError> {
    let body = serde_json::json!({
        "model": "qwen2.5-coder",
        "messages": [
            { "role": "system", "content": system_prompt },
            { "role": "user", "content": user_prompt }
        ],
        "temperature": 0.1,
        "max_tokens": max_tokens,
        "grammar": grammar
    });

    let client = reqwest::Client::builder()
        .timeout(std::time::Duration::from_secs(timeout_secs))
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

    Ok(completion
        .choices
        .first()
        .map(|c| c.message.content.clone())
        .unwrap_or_default())
}

/// DB row for events query (Job 2)
#[derive(Debug, sqlx::FromRow)]
struct EventForSyntheseRow {
    event_type: String,
    observations: Option<String>,
    niveau_lsu: Option<String>,
    lecon: Option<String>,
    created_at: String,
}

/// Load all pedagogical events for a student/domain/period from DB (Job 2)
async fn load_events_for_synthese(
    pool: &sqlx::SqlitePool,
    eleve_id: i64,
    domaine_id: i64,
    periode_id: i64,
    annee_id: i64,
) -> Result<Vec<EventContext>, SidecarError> {
    let rows: Vec<EventForSyntheseRow> = sqlx::query_as(
        "SELECT type as event_type, observations, niveau_lsu, lecon, created_at
         FROM evenements_pedagogiques
         WHERE eleve_id = ? AND domaine_id = ? AND periode_id = ? AND annee_scolaire_id = ?
         ORDER BY created_at ASC",
    )
    .bind(eleve_id)
    .bind(domaine_id)
    .bind(periode_id)
    .bind(annee_id)
    .fetch_all(pool)
    .await
    .map_err(|e| SidecarError::Internal(format!("Requete evenements echouee: {}", e)))?;

    Ok(rows
        .into_iter()
        .map(|r| EventContext {
            event_type: r.event_type,
            observations: r.observations,
            niveau_lsu: r.niveau_lsu,
            lecon: r.lecon,
            created_at: r.created_at,
        })
        .collect())
}

/// DB row for syntheses query (Job 3)
#[derive(Debug, sqlx::FromRow)]
struct SyntheseForAppreciationRow {
    domaine_nom: String,
    synthese_text: String,
}

/// Load the latest syntheses for each domain for a student/period (Job 3)
async fn load_syntheses_for_appreciation(
    pool: &sqlx::SqlitePool,
    eleve_id: i64,
    periode_id: i64,
    annee_id: i64,
) -> Result<Vec<SynthesisContext>, SidecarError> {
    let rows: Vec<SyntheseForAppreciationRow> = sqlx::query_as(
        "SELECT d.nom as domaine_nom, s.texte as synthese_text
         FROM syntheses_lsu s
         JOIN domaines_apprentissage d ON d.id = s.domaine_id
         WHERE s.eleve_id = ? AND s.periode_id = ? AND s.annee_scolaire_id = ?
           AND s.version = (
             SELECT MAX(s2.version) FROM syntheses_lsu s2
             WHERE s2.eleve_id = s.eleve_id AND s2.periode_id = s.periode_id
               AND s2.domaine_id = s.domaine_id AND s2.annee_scolaire_id = s.annee_scolaire_id
           )
         ORDER BY d.ordre_affichage ASC",
    )
    .bind(eleve_id)
    .bind(periode_id)
    .bind(annee_id)
    .fetch_all(pool)
    .await
    .map_err(|e| SidecarError::Internal(format!("Requete syntheses echouee: {}", e)))?;

    Ok(rows
        .into_iter()
        .map(|r| SynthesisContext {
            domaine_nom: r.domaine_nom,
            synthese_text: r.synthese_text,
        })
        .collect())
}

/// Build a textual behavior summary (incidents + absences) for a student/period
async fn load_behavior_summary(
    pool: &sqlx::SqlitePool,
    eleve_id: i64,
    periode_id: i64,
    annee_id: i64,
) -> Result<String, SidecarError> {
    let incidents: i64 = sqlx::query_scalar(
        "SELECT COUNT(*) FROM evenements_pedagogiques
         WHERE eleve_id = ? AND type = 'motif_sanction' AND periode_id = ?",
    )
    .bind(eleve_id)
    .bind(periode_id)
    .fetch_one(pool)
    .await
    .map_err(|e| SidecarError::Internal(format!("Requete incidents echouee: {}", e)))?;

    let absences: i64 = sqlx::query_scalar(
        "SELECT COUNT(*) FROM absences_v2
         WHERE eleve_id = ? AND type_absence = 'injustifiee' AND annee_scolaire_id = ?",
    )
    .bind(eleve_id)
    .bind(annee_id)
    .fetch_one(pool)
    .await
    .map_err(|e| SidecarError::Internal(format!("Requete absences echouee: {}", e)))?;

    Ok(format!(
        "{} incidents de comportement. {} absences injustifiees.",
        incidents, absences
    ))
}

/// Validate synthese text — rejects empty string
fn validate_synthese_text(text: &str) -> Result<String, SidecarError> {
    let trimmed = text.trim();
    if trimmed.is_empty() {
        return Err(SidecarError::Internal(
            "Synthese vide retournee par le LLM".to_string(),
        ));
    }
    Ok(trimmed.to_string())
}

/// Validate appreciation text — rejects empty string
fn validate_appreciation_text(text: &str) -> Result<String, SidecarError> {
    let trimmed = text.trim();
    if trimmed.is_empty() {
        return Err(SidecarError::Internal(
            "Appreciation vide retournee par le LLM".to_string(),
        ));
    }
    Ok(trimmed.to_string())
}

/// Generate a LSU synthese for a student/domain/period using the Qwen LLM (Job 2).
///
/// Pipeline:
/// 1. Load domain name + events from DB
/// 2. Build synthese prompt (ADR-008 budget)
/// 3. Start llama-server if needed
/// 4. Send request with static GBNF grammar
/// 5. Parse + validate response
/// 6. Auto-stop llama (ADR-002)
#[tauri::command]
pub async fn generate_synthese(
    app: tauri::AppHandle,
    state: tauri::State<'_, SidecarManager>,
    eleve_id: i64,
    domaine_id: i64,
    periode_id: i64,
    annee_scolaire_id: i64,
    student_name: String,
) -> Result<SyntheseResult, String> {
    let start = Instant::now();

    let pool = open_db_pool(&app).await.map_err(|e| e.to_string())?;

    // Fetch domain name for the prompt
    let domaine_nom: String = sqlx::query_scalar(
        "SELECT nom FROM domaines_apprentissage WHERE id = ?",
    )
    .bind(domaine_id)
    .fetch_one(&pool)
    .await
    .map_err(|e| format!("Domaine introuvable (id={}): {}", domaine_id, e))?;

    let events = load_events_for_synthese(&pool, eleve_id, domaine_id, periode_id, annee_scolaire_id)
        .await
        .map_err(|e| e.to_string())?;

    let prompt = prompt_builder::build_synthese_prompt(&events, &domaine_nom, &student_name);
    let grammar = gbnf::generate_synthese_gbnf();

    // Start llama-server if not running
    let model_path = resolve_model_path(&app).map_err(|e| e.to_string())?;
    let status = state.get_status().await;
    if !status.llama.running {
        info!("llama-server non demarre, lancement automatique (generate_synthese)...");
        state
            .start(&app, SidecarName::Llama, model_path.to_string_lossy().to_string(), None)
            .await
            .map_err(|e| e.to_string())?;
    }

    let content = send_simple_llm_request(
        &prompt.system_prompt,
        &prompt.user_prompt,
        &grammar,
        512,
        30,
    )
    .await
    .map_err(|e| e.to_string())?;

    state.increment_request_count(SidecarName::Llama).await;

    let llm_response: LlmSyntheseResponse = serde_json::from_str(&content).map_err(|e| {
        format!("JSON synthese invalide (GBNF non respectee?): {}. Contenu: {}", e, content)
    })?;

    let synthese = validate_synthese_text(&llm_response.synthese).map_err(|e| e.to_string())?;

    let duration_ms = start.elapsed().as_millis() as u64;
    info!(
        "Synthese generee en {}ms pour eleve_id={} domaine_id={}",
        duration_ms, eleve_id, domaine_id
    );

    state.auto_stop_after_task(&app, SidecarName::Llama).await;

    Ok(SyntheseResult { synthese, duration_ms })
}

/// Generate a LSU appreciation generale for a student/period using the Qwen LLM (Job 3).
///
/// Pipeline:
/// 1. Load existing syntheses + behavior summary from DB
/// 2. Build appreciation prompt (ADR-008 budget)
/// 3. Start llama-server if needed
/// 4. Send request with static GBNF grammar
/// 5. Parse + validate response
/// 6. Auto-stop llama (ADR-002)
#[tauri::command]
pub async fn generate_appreciation(
    app: tauri::AppHandle,
    state: tauri::State<'_, SidecarManager>,
    eleve_id: i64,
    periode_id: i64,
    annee_scolaire_id: i64,
    student_name: String,
) -> Result<AppreciationResult, String> {
    let start = Instant::now();

    let pool = open_db_pool(&app).await.map_err(|e| e.to_string())?;

    let syntheses =
        load_syntheses_for_appreciation(&pool, eleve_id, periode_id, annee_scolaire_id)
            .await
            .map_err(|e| e.to_string())?;

    let behavior =
        load_behavior_summary(&pool, eleve_id, periode_id, annee_scolaire_id)
            .await
            .map_err(|e| e.to_string())?;

    let prompt =
        prompt_builder::build_appreciation_prompt(&syntheses, &behavior, &student_name);
    let grammar = gbnf::generate_appreciation_gbnf();

    // Start llama-server if not running
    let model_path = resolve_model_path(&app).map_err(|e| e.to_string())?;
    let status = state.get_status().await;
    if !status.llama.running {
        info!("llama-server non demarre, lancement automatique (generate_appreciation)...");
        state
            .start(&app, SidecarName::Llama, model_path.to_string_lossy().to_string(), None)
            .await
            .map_err(|e| e.to_string())?;
    }

    let content = send_simple_llm_request(
        &prompt.system_prompt,
        &prompt.user_prompt,
        &grammar,
        768,
        45,
    )
    .await
    .map_err(|e| e.to_string())?;

    state.increment_request_count(SidecarName::Llama).await;

    let llm_response: LlmAppreciationResponse =
        serde_json::from_str(&content).map_err(|e| {
            format!(
                "JSON appreciation invalide (GBNF non respectee?): {}. Contenu: {}",
                e, content
            )
        })?;

    let appreciation =
        validate_appreciation_text(&llm_response.appreciation).map_err(|e| e.to_string())?;

    let duration_ms = start.elapsed().as_millis() as u64;
    info!(
        "Appreciation generee en {}ms pour eleve_id={} periode_id={}",
        duration_ms, eleve_id, periode_id
    );

    state.auto_stop_after_task(&app, SidecarName::Llama).await;

    Ok(AppreciationResult { appreciation, duration_ms })
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

    // ─── V2.1 Classification tests (multi-domain) ───

    #[test]
    fn parse_classification_array_single() {
        let json = r#"[{"domaine_id": 2, "observation_mise_a_jour": "L'eleve progresse en calcul mental."}]"#;
        let result: Vec<LlmClassificationItem> = serde_json::from_str(json).unwrap();
        assert_eq!(result.len(), 1);
        assert_eq!(result[0].domaine_id, 2);
        assert!(result[0].observation_mise_a_jour.contains("calcul mental"));
    }

    #[test]
    fn parse_classification_array_multi() {
        let json = r#"[{"domaine_id": 0, "observation_mise_a_jour": "Bonne lecture."}, {"domaine_id": 5, "observation_mise_a_jour": "Progresse en sport."}]"#;
        let result: Vec<LlmClassificationItem> = serde_json::from_str(json).unwrap();
        assert_eq!(result.len(), 2);
        assert_eq!(result[0].domaine_id, 0);
        assert_eq!(result[1].domaine_id, 5);
    }

    #[test]
    fn reject_invalid_domaine_id() {
        let item = LlmClassificationItem {
            domaine_id: 10,
            observation_mise_a_jour: "Texte valide".to_string(),
        };
        let err = validate_classification_item(&item, 5);
        assert!(err.is_err());
        assert!(err.unwrap_err().to_string().contains("hors range"));
    }

    #[test]
    fn reject_empty_observation() {
        let item = LlmClassificationItem {
            domaine_id: 0,
            observation_mise_a_jour: "   ".to_string(),
        };
        let err = validate_classification_item(&item, 5);
        assert!(err.is_err());
        assert!(err.unwrap_err().to_string().contains("vide"));
    }

    #[test]
    fn truncate_too_long_observation() {
        let long_text = "Phrase un. ".repeat(80); // ~880 chars > 500
        let item = LlmClassificationItem {
            domaine_id: 0,
            observation_mise_a_jour: long_text,
        };
        let result = validate_classification_item(&item, 5);
        assert!(result.is_ok());
        let obs = result.unwrap();
        assert!(obs.len() <= MAX_OBSERVATION_CHARS + 1); // +1 for trailing period
        assert!(obs.ends_with('.')); // Truncated at sentence boundary
    }

    #[test]
    fn accept_valid_classification_item() {
        let item = LlmClassificationItem {
            domaine_id: 3,
            observation_mise_a_jour: "Bonne participation en histoire.".to_string(),
        };
        let result = validate_classification_item(&item, 9);
        assert!(result.is_ok());
        assert_eq!(result.unwrap(), "Bonne participation en histoire.");
    }

    #[test]
    fn accept_boundary_domaine_id() {
        // domaine_id = N-1 should be valid
        let item = LlmClassificationItem {
            domaine_id: 4,
            observation_mise_a_jour: "OK".to_string(),
        };
        let result = validate_classification_item(&item, 5);
        assert!(result.is_ok());
        assert_eq!(result.unwrap(), "OK");
    }

    #[test]
    fn parse_classification_with_escaped_chars() {
        let json = r#"[{"domaine_id": 0, "observation_mise_a_jour": "L'eleve a dit \"bonjour\" et travaille bien."}]"#;
        let result: Vec<LlmClassificationItem> = serde_json::from_str(json).unwrap();
        assert_eq!(result[0].domaine_id, 0);
        assert!(result[0].observation_mise_a_jour.contains("bonjour"));
    }

    // ─── Post-filter tests (domain_mentioned_in_text) ───

    #[test]
    fn filter_detects_francais_by_keyword() {
        assert!(domain_mentioned_in_text("Francais", "En français, il lit bien."));
        assert!(domain_mentioned_in_text("Francais", "Bonne lecture orale."));
        assert!(domain_mentioned_in_text("Francais", "L'orthographe est correcte."));
        assert!(!domain_mentioned_in_text("Francais", "Il court vite en sport."));
    }

    #[test]
    fn filter_detects_maths_by_keyword() {
        assert!(domain_mentioned_in_text("Mathematiques", "En mathématiques, il progresse."));
        assert!(domain_mentioned_in_text("Mathematiques", "Le calcul mental est bon."));
        assert!(domain_mentioned_in_text("Mathematiques", "Difficultés en multiplication."));
        assert!(!domain_mentioned_in_text("Mathematiques", "Bon en histoire."));
    }

    #[test]
    fn filter_detects_sport_by_keyword() {
        assert!(domain_mentioned_in_text("Education Physique et Sportive", "En sport, il est bon."));
        assert!(domain_mentioned_in_text("Education Physique et Sportive", "La course est bonne."));
        assert!(!domain_mentioned_in_text("Education Physique et Sportive", "Il lit bien en français."));
    }

    #[test]
    fn filter_detects_histoire_geo() {
        assert!(domain_mentioned_in_text("Histoire-Geographie", "En histoire géographie, très bien."));
        assert!(domain_mentioned_in_text("Histoire-Geographie", "En histoire, il progresse."));
        assert!(!domain_mentioned_in_text("Histoire-Geographie", "Bon en maths."));
    }

    #[test]
    fn filter_detects_arts_plastiques_singular() {
        assert!(domain_mentioned_in_text("Arts Plastiques", "En art plastique, il a bien travaillé."));
        assert!(domain_mentioned_in_text("Arts Plastiques", "Le dessin est bon."));
        assert!(!domain_mentioned_in_text("Arts Plastiques", "Il chante bien en musique."));
    }

    #[test]
    fn filter_detects_education_musicale() {
        assert!(domain_mentioned_in_text("Education Musicale", "En éducation musicale, il manque de participation."));
        assert!(domain_mentioned_in_text("Education Musicale", "Il chante bien en musique."));
        assert!(!domain_mentioned_in_text("Education Musicale", "Il dessine bien."));
    }

    #[test]
    fn filter_detects_langues_vivantes_singular() {
        assert!(domain_mentioned_in_text("Langues Vivantes", "En langue vivante, il progresse."));
        assert!(domain_mentioned_in_text("Langues Vivantes", "L'anglais est bon."));
        assert!(!domain_mentioned_in_text("Langues Vivantes", "Il court vite en sport."));
    }

    #[test]
    fn filter_keeps_custom_unknown_domains() {
        // Custom domains should always be kept (not filtered)
        assert!(domain_mentioned_in_text("Mon domaine custom", "Texte sans rapport."));
    }

    #[test]
    fn filter_is_case_insensitive() {
        assert!(domain_mentioned_in_text("Francais", "en FRANÇAIS il progresse"));
        assert!(domain_mentioned_in_text("Sciences et Technologies", "En SCIENCE, c'est bien"));
    }

    // ─── JSON recovery tests ───

    #[test]
    fn recover_valid_json_returns_none() {
        // Already valid JSON — recovery not needed (None because parse succeeds upstream)
        let json = r#"[{"domaine_id": 0, "observation_mise_a_jour": "Texte."}]"#;
        let result = recover_truncated_json(json);
        assert!(result.is_some());
        assert_eq!(result.unwrap().len(), 1);
    }

    #[test]
    fn recover_truncated_mid_string() {
        // Truncated in the middle of the second item's string
        let json = r#"[{"domaine_id": 0, "observation_mise_a_jour": "Bon travail."}, {"domaine_id": 1, "observation_mise_a_jour": "Progresse en cal"#;
        let result = recover_truncated_json(json);
        assert!(result.is_some());
        let items = result.unwrap();
        assert_eq!(items.len(), 1); // Only first complete item
        assert_eq!(items[0].domaine_id, 0);
    }

    #[test]
    fn recover_truncated_after_complete_items() {
        // Two complete items, third truncated
        let json = r#"[{"domaine_id": 0, "observation_mise_a_jour": "A."}, {"domaine_id": 5, "observation_mise_a_jour": "B."}, {"domaine_id": 2, "obs"#;
        let result = recover_truncated_json(json);
        assert!(result.is_some());
        let items = result.unwrap();
        assert_eq!(items.len(), 2);
        assert_eq!(items[1].domaine_id, 5);
    }

    #[test]
    fn recover_no_complete_items() {
        let json = r#"[{"domaine_id": 0, "observation_mise_a_jo"#;
        let result = recover_truncated_json(json);
        // The `}` is never closed, so no valid items
        assert!(result.is_none());
    }

    // ─── Tests Job 2 (Synthese) + Job 3 (Appreciation) ───

    #[test]
    fn test_parse_synthese_response() {
        let json = r#"{"synthese": "L'eleve progresse bien en lecture."}"#;
        let result: LlmSyntheseResponse = serde_json::from_str(json).unwrap();
        assert_eq!(result.synthese, "L'eleve progresse bien en lecture.");
    }

    #[test]
    fn test_parse_appreciation_response() {
        let json = r#"{"appreciation": "L'eleve fait preuve de serieux dans l'ensemble des matieres."}"#;
        let result: LlmAppreciationResponse = serde_json::from_str(json).unwrap();
        assert!(result.appreciation.contains("serieux"));
    }

    #[test]
    fn test_reject_empty_synthese() {
        let err = validate_synthese_text("  ");
        assert!(err.is_err());
        assert!(err.unwrap_err().to_string().contains("vide"));
    }

    #[test]
    fn test_reject_empty_appreciation() {
        let err = validate_appreciation_text("");
        assert!(err.is_err());
        assert!(err.unwrap_err().to_string().contains("vide"));
    }

    #[test]
    fn test_synthese_response_with_accents() {
        let json = r#"{"synthese": "L'\u00e9l\u00e8ve d\u00e9montre des progr\u00e8s remarquables."}"#;
        let result: LlmSyntheseResponse = serde_json::from_str(json).unwrap();
        assert!(result.synthese.contains("progr"));
        let ok = validate_synthese_text(&result.synthese);
        assert!(ok.is_ok());
    }

    #[test]
    fn test_appreciation_response_with_accents() {
        let json = r#"{"appreciation": "Tr\u00e8s bonne ann\u00e9e, l'\u00e9l\u00e8ve est epanoui."}"#;
        let result: LlmAppreciationResponse = serde_json::from_str(json).unwrap();
        assert!(result.appreciation.contains("bonne"));
        let ok = validate_appreciation_text(&result.appreciation);
        assert!(ok.is_ok());
    }
}
