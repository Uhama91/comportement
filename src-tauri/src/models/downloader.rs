use super::verifier;
use futures::StreamExt;
use log::{info, warn};
use serde::Serialize;
use std::io::Write;
use std::sync::atomic::{AtomicBool, Ordering};
use tauri::{Emitter, Manager};

const MODELS: &[(&str, &str, &str)] = &[
    (
        "whisper",
        "ggml-small.bin",
        "https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-small.bin",
    ),
    (
        "llama",
        "qwen2.5-coder-1.5b-instruct-q4_k_m.gguf",
        "https://huggingface.co/Qwen/Qwen2.5-Coder-1.5B-Instruct-GGUF/resolve/main/qwen2.5-coder-1.5b-instruct-q4_k_m.gguf",
    ),
];

/// Emit frequency: one progress event per PROGRESS_INTERVAL bytes downloaded.
const PROGRESS_INTERVAL: u64 = 512 * 1024; // 512 KB

#[derive(Clone, Serialize)]
pub struct DownloadProgress {
    pub model_name: String,
    pub downloaded_bytes: u64,
    pub total_bytes: u64,
    pub percentage: f64,
    pub current_model: usize,  // 1-based index
    pub total_models: usize,
    pub status: String, // "downloading" | "verifying" | "complete" | "error"
}

/// Global cancel flag shared between download_models and cancel_download.
static CANCEL_FLAG: AtomicBool = AtomicBool::new(false);

#[tauri::command]
pub async fn download_models(app: tauri::AppHandle) -> Result<(), String> {
    CANCEL_FLAG.store(false, Ordering::Relaxed);

    let models_dir = app
        .path()
        .app_data_dir()
        .map_err(|e| format!("app_data_dir: {}", e))?
        .join("models");

    std::fs::create_dir_all(&models_dir)
        .map_err(|e| format!("Impossible de creer le dossier models: {}", e))?;

    let client = reqwest::Client::builder()
        .timeout(std::time::Duration::from_secs(600)) // 10 min per model
        .build()
        .map_err(|e| format!("Client HTTP: {}", e))?;

    let total_models = MODELS.len();

    for (idx, (name, filename, url)) in MODELS.iter().enumerate() {
        let dest = models_dir.join(filename);

        // Skip if already installed
        if dest.exists() {
            info!("Modele {} deja installe, skip", name);
            app.emit(
                "download_progress",
                DownloadProgress {
                    model_name: name.to_string(),
                    downloaded_bytes: 0,
                    total_bytes: 0,
                    percentage: 100.0,
                    current_model: idx + 1,
                    total_models,
                    status: "complete".to_string(),
                },
            )
            .ok();
            continue;
        }

        // Check cancel
        if CANCEL_FLAG.load(Ordering::Relaxed) {
            return Err("Telechargement annule par l'utilisateur".to_string());
        }

        info!("Telechargement de {} depuis {}", name, url);

        let resp = client.get(*url).send().await.map_err(|e| {
            format!(
                "Impossible de telecharger {} : {}. Utilisez l'option cle USB.",
                name, e
            )
        })?;

        if !resp.status().is_success() {
            return Err(format!(
                "Serveur a repondu {} pour {}. Utilisez l'option cle USB.",
                resp.status(),
                name
            ));
        }

        let total = resp.content_length().unwrap_or(0);
        let mut downloaded: u64 = 0;
        let mut last_emitted: u64 = 0;

        // Write to .tmp first, then rename
        let tmp_path = dest.with_extension("tmp");
        let mut file = std::fs::File::create(&tmp_path)
            .map_err(|e| format!("Impossible de creer {}: {}", tmp_path.display(), e))?;

        let mut stream = resp.bytes_stream();

        while let Some(chunk_result) = stream.next().await {
            if CANCEL_FLAG.load(Ordering::Relaxed) {
                drop(file);
                std::fs::remove_file(&tmp_path).ok();
                return Err("Telechargement annule par l'utilisateur".to_string());
            }

            let chunk = chunk_result
                .map_err(|e| format!("Erreur reseau pendant le telechargement de {}: {}", name, e))?;

            file.write_all(&chunk)
                .map_err(|e| format!("Erreur ecriture disque: {}", e))?;

            downloaded += chunk.len() as u64;

            // Emit progress every PROGRESS_INTERVAL
            if downloaded - last_emitted >= PROGRESS_INTERVAL || downloaded == total {
                last_emitted = downloaded;
                app.emit(
                    "download_progress",
                    DownloadProgress {
                        model_name: name.to_string(),
                        downloaded_bytes: downloaded,
                        total_bytes: total,
                        percentage: if total > 0 {
                            (downloaded as f64 / total as f64) * 100.0
                        } else {
                            0.0
                        },
                        current_model: idx + 1,
                        total_models,
                        status: "downloading".to_string(),
                    },
                )
                .ok();
            }
        }

        drop(file);

        // Verify SHA256
        app.emit(
            "download_progress",
            DownloadProgress {
                model_name: name.to_string(),
                downloaded_bytes: downloaded,
                total_bytes: total,
                percentage: 100.0,
                current_model: idx + 1,
                total_models,
                status: "verifying".to_string(),
            },
        )
        .ok();

        let hash_ok = verifier::verify_model_hash(&tmp_path, filename)?;
        if !hash_ok {
            std::fs::remove_file(&tmp_path).ok();
            return Err(format!(
                "Fichier {} corrompu (SHA256 invalide). Reessayez ou utilisez l'option cle USB.",
                filename
            ));
        }

        // Compute and log actual hash for reference
        let actual_hash = verifier::compute_sha256(&tmp_path).unwrap_or_default();
        info!("SHA256 de {} : {}", filename, actual_hash);

        // Atomic rename
        std::fs::rename(&tmp_path, &dest).map_err(|e| format!("Rename final: {}", e))?;

        info!("Modele {} installe avec succes ({} octets)", name, downloaded);

        app.emit(
            "download_progress",
            DownloadProgress {
                model_name: name.to_string(),
                downloaded_bytes: downloaded,
                total_bytes: total,
                percentage: 100.0,
                current_model: idx + 1,
                total_models,
                status: "complete".to_string(),
            },
        )
        .ok();
    }

    Ok(())
}

#[tauri::command]
pub fn cancel_download() {
    CANCEL_FLAG.store(true, Ordering::Relaxed);
    warn!("Telechargement annulation demandee");
}
