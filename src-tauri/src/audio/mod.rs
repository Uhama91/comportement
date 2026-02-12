// Audio capture module using tauri-plugin-mic-recorder
// WAV PCM 16-bit, 16kHz, mono format for Whisper.cpp compatibility
//
// The plugin handles:
// - Audio capture from system default microphone
// - WAV file generation in temp directory
// - Automatic permission request on first use
//
// Audio format is configured in the plugin's Rust source
// Default format should be compatible with Whisper.cpp (16kHz, 16-bit, mono)

/// Audio recording commands exposed to frontend
pub mod commands {
    use log::info;

    /// Start audio recording
    /// Returns success/error, actual recording is handled by the plugin
    #[tauri::command]
    pub async fn start_audio_recording(_app: tauri::AppHandle) -> Result<(), String> {
        info!("Starting audio recording via tauri-plugin-mic-recorder");
        // The plugin handles permission request automatically on first use
        Ok(())
    }

    /// Stop audio recording and return the path to the WAV file
    #[tauri::command]
    pub async fn stop_audio_recording(_app: tauri::AppHandle) -> Result<String, String> {
        info!("Stopping audio recording");
        // Plugin will return the temp file path
        // For now, return a placeholder - the plugin handles this via its own API
        Ok(String::new())
    }

    /// Check if microphone permission is granted
    #[tauri::command]
    pub async fn check_mic_permission() -> Result<bool, String> {
        // On first call, browser/OS will prompt for permission
        // This is a placeholder - actual permission check is handled by the plugin
        Ok(true)
    }
}
