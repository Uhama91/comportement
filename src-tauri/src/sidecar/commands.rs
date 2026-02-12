use super::manager::SidecarManager;
use super::types::{PipelineConfig, PipelineMode, SidecarName};

#[tauri::command]
pub async fn start_sidecar(
    app: tauri::AppHandle,
    state: tauri::State<'_, SidecarManager>,
    name: SidecarName,
    model_path: String,
    grammar_path: Option<String>,
) -> Result<(), String> {
    state
        .start(&app, name, model_path, grammar_path)
        .await
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn stop_sidecar(
    app: tauri::AppHandle,
    state: tauri::State<'_, SidecarManager>,
    name: SidecarName,
) -> Result<(), String> {
    state.stop(&app, name).await.map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn get_sidecar_status(
    state: tauri::State<'_, SidecarManager>,
) -> Result<super::types::SidecarStatusResponse, String> {
    Ok(state.get_status().await)
}

/// Returns the current pipeline configuration (mode, RAM, concurrent availability)
#[tauri::command]
pub async fn get_pipeline_config(
    state: tauri::State<'_, SidecarManager>,
) -> Result<PipelineConfig, String> {
    Ok(state.get_pipeline_config().await)
}

/// Override the pipeline mode (sequential or concurrent)
#[tauri::command]
pub async fn set_pipeline_mode(
    state: tauri::State<'_, SidecarManager>,
    mode: PipelineMode,
) -> Result<(), String> {
    state.set_pipeline_mode(mode).await;
    Ok(())
}
