use super::verifier;
use log::info;
use serde::Serialize;
use std::path::PathBuf;
use tauri::{Emitter, Manager};

const EXPECTED_FILES: &[(&str, &str)] = &[
    ("whisper", "ggml-small.bin"),
    ("llama", "qwen2.5-coder-1.5b-instruct-q4_k_m.gguf"),
];

#[derive(Clone, Serialize)]
struct InstallProgress {
    model_name: String,
    status: String, // "copying" | "verifying" | "complete" | "error"
    current: usize,
    total: usize,
}

#[tauri::command]
pub async fn install_models_from_folder(
    app: tauri::AppHandle,
    folder_path: String,
) -> Result<(), String> {
    let source = PathBuf::from(&folder_path);
    if !source.is_dir() {
        return Err(format!("{} n'est pas un dossier valide", folder_path));
    }

    let models_dir = app
        .path()
        .app_data_dir()
        .map_err(|e| format!("app_data_dir: {}", e))?
        .join("models");

    std::fs::create_dir_all(&models_dir)
        .map_err(|e| format!("Impossible de creer le dossier models: {}", e))?;

    let total = EXPECTED_FILES.len();

    for (idx, (name, filename)) in EXPECTED_FILES.iter().enumerate() {
        let src_file = source.join(filename);
        let dest_file = models_dir.join(filename);

        // Skip if already installed
        if dest_file.exists() {
            info!("Modele {} deja installe, skip", name);
            app.emit(
                "install_progress",
                InstallProgress {
                    model_name: name.to_string(),
                    status: "complete".to_string(),
                    current: idx + 1,
                    total,
                },
            )
            .ok();
            continue;
        }

        // Check source exists
        if !src_file.exists() {
            return Err(format!(
                "Fichier manquant dans le dossier : {}. Verifiez que les modeles sont bien dans le dossier selectionne.",
                filename
            ));
        }

        // Copy
        app.emit(
            "install_progress",
            InstallProgress {
                model_name: name.to_string(),
                status: "copying".to_string(),
                current: idx + 1,
                total,
            },
        )
        .ok();

        info!("Copie de {} vers {}", src_file.display(), dest_file.display());
        std::fs::copy(&src_file, &dest_file).map_err(|e| {
            format!("Erreur lors de la copie de {} : {}", filename, e)
        })?;

        // Verify SHA256
        app.emit(
            "install_progress",
            InstallProgress {
                model_name: name.to_string(),
                status: "verifying".to_string(),
                current: idx + 1,
                total,
            },
        )
        .ok();

        let hash_ok = verifier::verify_model_hash(&dest_file, filename)?;
        if !hash_ok {
            std::fs::remove_file(&dest_file).ok();
            return Err(format!(
                "Fichier {} corrompu (SHA256 invalide). Verifiez la source.",
                filename
            ));
        }

        let actual_hash = verifier::compute_sha256(&dest_file).unwrap_or_default();
        info!("SHA256 de {} : {}", filename, actual_hash);

        app.emit(
            "install_progress",
            InstallProgress {
                model_name: name.to_string(),
                status: "complete".to_string(),
                current: idx + 1,
                total,
            },
        )
        .ok();
    }

    Ok(())
}
