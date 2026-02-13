// Audio capture module for Whisper.cpp transcription pipeline
//
// Plan A: tauri-plugin-mic-recorder (Rust-native, WAV direct)
// Plan B: Web Audio API fallback (frontend capture → Rust save)
//
// Both plans produce WAV PCM 16-bit, 16kHz, mono files
// compatible with whisper-server /inference endpoint.

pub mod commands {
    use log::info;
    use std::io::Write;
    use tauri::Manager;

    /// Save raw WAV bytes (captured by Web Audio API fallback) to a temp file.
    /// Returns the absolute path to the saved WAV file.
    ///
    /// Used by Plan B when tauri-plugin-mic-recorder fails.
    /// The frontend captures audio via getUserMedia, resamples to 16kHz mono,
    /// builds the WAV header+data, and sends the complete bytes here.
    #[tauri::command]
    pub async fn save_wav_file(
        app: tauri::AppHandle,
        wav_data: Vec<u8>,
    ) -> Result<String, String> {
        info!(
            "Saving WAV file from Web Audio fallback ({} bytes)",
            wav_data.len()
        );

        if wav_data.len() < 44 {
            return Err("Données WAV invalides (trop petit)".to_string());
        }

        // Validate WAV header magic bytes
        if &wav_data[0..4] != b"RIFF" || &wav_data[8..12] != b"WAVE" {
            return Err("Format WAV invalide (header incorrect)".to_string());
        }

        let data_dir = app
            .path()
            .app_data_dir()
            .map_err(|e| format!("Impossible de trouver app_data_dir: {}", e))?;

        let audio_dir = data_dir.join("audio_temp");
        std::fs::create_dir_all(&audio_dir)
            .map_err(|e| format!("Impossible de créer le répertoire audio_temp: {}", e))?;

        let timestamp = std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .unwrap_or_default()
            .as_millis();

        let file_path = audio_dir.join(format!("recording_{}.wav", timestamp));

        let mut file = std::fs::File::create(&file_path)
            .map_err(|e| format!("Impossible de créer le fichier WAV: {}", e))?;

        file.write_all(&wav_data)
            .map_err(|e| format!("Impossible d'écrire le fichier WAV: {}", e))?;

        let path_str = file_path.to_string_lossy().to_string();
        info!("WAV file saved: {}", path_str);

        Ok(path_str)
    }
}
