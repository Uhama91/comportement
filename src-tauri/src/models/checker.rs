use serde::Serialize;
use tauri::Manager;

const WHISPER_MODEL: &str = "ggml-small.bin";
const QWEN_MODEL: &str = "qwen2.5-coder-1.5b-instruct-q4_k_m.gguf";

#[derive(Clone, Serialize)]
pub struct ModelInfo {
    pub name: String,
    pub filename: String,
    pub installed: bool,
    pub path: Option<String>,
    pub expected_size_mb: u64,
}

#[derive(Clone, Serialize)]
pub struct ModelsCheckResult {
    pub whisper: ModelInfo,
    pub llama: ModelInfo,
    pub all_installed: bool,
    pub models_dir: String,
}

#[tauri::command]
pub async fn check_models_status(app: tauri::AppHandle) -> Result<ModelsCheckResult, String> {
    let models_dir = app
        .path()
        .app_data_dir()
        .map_err(|e| format!("Impossible de trouver app_data_dir: {}", e))?
        .join("models");

    let whisper_path = models_dir.join(WHISPER_MODEL);
    let llama_path = models_dir.join(QWEN_MODEL);

    log::info!("Models dir: {:?}", models_dir);
    log::info!("Whisper path: {:?} exists={}", whisper_path, whisper_path.exists());
    log::info!("Llama path: {:?} exists={}", llama_path, llama_path.exists());

    let whisper_installed = whisper_path.exists();
    let llama_installed = llama_path.exists();

    Ok(ModelsCheckResult {
        whisper: ModelInfo {
            name: "Whisper Small FR".to_string(),
            filename: WHISPER_MODEL.to_string(),
            installed: whisper_installed,
            path: whisper_installed.then(|| whisper_path.to_string_lossy().into()),
            expected_size_mb: 465,
        },
        llama: ModelInfo {
            name: "Qwen 2.5 Coder 1.5B".to_string(),
            filename: QWEN_MODEL.to_string(),
            installed: llama_installed,
            path: llama_installed.then(|| llama_path.to_string_lossy().into()),
            expected_size_mb: 980,
        },
        all_installed: whisper_installed && llama_installed,
        models_dir: models_dir.to_string_lossy().into(),
    })
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn model_constants_are_correct() {
        assert_eq!(WHISPER_MODEL, "ggml-small.bin");
        assert_eq!(QWEN_MODEL, "qwen2.5-coder-1.5b-instruct-q4_k_m.gguf");
    }
}
