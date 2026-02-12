use super::manager::SidecarManager;
use super::types::{SidecarError, SidecarName};
use log::info;
use serde::{Deserialize, Serialize};
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
}
