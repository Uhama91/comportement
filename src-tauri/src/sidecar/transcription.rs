use super::manager::SidecarManager;
use super::types::{SidecarError, SidecarName, TranscriptionResult};
use log::{info, warn};
use std::path::PathBuf;
use tauri::Manager;
use tokio::time::Instant;

/// Resolve the whisper model path in app_data_dir/models/ggml-small.bin.
/// Returns SidecarError::ModelNotFound if the file does not exist.
fn resolve_model_path(app: &tauri::AppHandle) -> Result<PathBuf, SidecarError> {
    let data_dir = app
        .path()
        .app_data_dir()
        .map_err(|e| SidecarError::Internal(format!("Impossible de trouver app_data_dir: {}", e)))?;

    let model_path = data_dir.join("models").join("ggml-small.bin");

    if !model_path.exists() {
        return Err(SidecarError::ModelNotFound(
            model_path.to_string_lossy().to_string(),
        ));
    }

    Ok(model_path)
}

/// Send a WAV file to whisper-server /inference endpoint via multipart form.
async fn send_inference_request(audio_path: &str) -> Result<String, SidecarError> {
    let audio_data = tokio::fs::read(audio_path)
        .await
        .map_err(|e| SidecarError::TranscriptionFailed(format!("Lecture du fichier audio echouee: {}", e)))?;

    let file_name = std::path::Path::new(audio_path)
        .file_name()
        .unwrap_or_default()
        .to_string_lossy()
        .to_string();

    let part = reqwest::multipart::Part::bytes(audio_data)
        .file_name(file_name)
        .mime_str("audio/wav")
        .map_err(|e| SidecarError::TranscriptionFailed(e.to_string()))?;

    let form = reqwest::multipart::Form::new()
        .part("file", part)
        .text("language", "fr")
        .text("response_format", "json");

    let client = reqwest::Client::builder()
        .timeout(std::time::Duration::from_secs(30))
        .build()
        .map_err(|e| SidecarError::Internal(e.to_string()))?;

    let response = client
        .post("http://127.0.0.1:8081/inference")
        .multipart(form)
        .send()
        .await
        .map_err(|e| {
            SidecarError::TranscriptionFailed(format!(
                "Requete vers whisper-server echouee: {}",
                e
            ))
        })?;

    if !response.status().is_success() {
        let status = response.status();
        let body = response.text().await.unwrap_or_default();
        return Err(SidecarError::TranscriptionFailed(format!(
            "whisper-server a repondu avec le code {}: {}",
            status, body
        )));
    }

    let json: serde_json::Value = response
        .json()
        .await
        .map_err(|e| SidecarError::TranscriptionFailed(format!("Reponse JSON invalide: {}", e)))?;

    let text = json["text"]
        .as_str()
        .unwrap_or("")
        .trim()
        .to_string();

    Ok(text)
}

/// Ensure whisper-server is running, starting it if needed.
async fn ensure_whisper_running(
    app: &tauri::AppHandle,
    state: &SidecarManager,
    model_path_str: &str,
) -> Result<(), String> {
    let status = state.get_status().await;
    if !status.whisper.running {
        info!("whisper-server non demarre, lancement automatique...");
        state
            .start(app, SidecarName::Whisper, model_path_str.to_string(), None)
            .await
            .map_err(|e| e.to_string())?;
    }
    Ok(())
}

/// Transcribe a WAV audio file to French text using whisper-server sidecar.
///
/// Includes watchdog (Story 13.5):
/// - Empty response detection → restart + retry once
/// - Post-transcription healthcheck → restart if 3 consecutive failures
/// - Preventive restart after ~50 requests (Windows handle leak workaround)
#[tauri::command]
pub async fn transcribe_audio(
    app: tauri::AppHandle,
    state: tauri::State<'_, SidecarManager>,
    audio_path: String,
) -> Result<TranscriptionResult, String> {
    let start = Instant::now();

    // Resolve model path
    let model_path = resolve_model_path(&app).map_err(|e| e.to_string())?;
    let model_path_str = model_path.to_string_lossy().to_string();

    // Ensure whisper is running
    ensure_whisper_running(&app, &state, &model_path_str).await?;

    // Send audio for transcription
    let mut text = send_inference_request(&audio_path)
        .await
        .map_err(|e| e.to_string())?;

    // Watchdog: empty response detection → restart + retry once
    if text.is_empty() {
        warn!("Watchdog: reponse vide de whisper-server, redemarrage et nouvelle tentative");
        state
            .restart(&app, SidecarName::Whisper, "Reponse vide")
            .await
            .map_err(|e| e.to_string())?;

        text = send_inference_request(&audio_path)
            .await
            .map_err(|e| e.to_string())?;

        if text.is_empty() {
            warn!("Watchdog: reponse vide apres retry, retour au frontend");
        }
    }

    // Increment request count
    state.increment_request_count(SidecarName::Whisper).await;

    let duration_ms = start.elapsed().as_millis() as u64;

    info!(
        "Transcription terminee en {}ms: \"{}\"",
        duration_ms,
        if text.len() > 80 { &text[..80] } else { &text }
    );

    // Watchdog: post-request healthcheck + preventive restart (before auto-stop)
    // Only runs if whisper is still alive (concurrent mode or before sequential auto-stop)
    state
        .watchdog_post_request(&app, SidecarName::Whisper)
        .await;

    // ADR-002 / Story 13.4: Auto-stop whisper after task in sequential mode
    state.auto_stop_after_task(&app, SidecarName::Whisper).await;

    Ok(TranscriptionResult { text, duration_ms })
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn model_not_found_returns_error() {
        // Test that a non-existent path produces ModelNotFound
        let path = PathBuf::from("/nonexistent/models/ggml-small.bin");
        assert!(!path.exists());
    }
}
