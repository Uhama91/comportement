use serde::{Deserialize, Serialize};
use std::fmt;
use tauri_plugin_shell::process::CommandChild;

#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum SidecarName {
    Whisper,
    Llama,
}

/// Pipeline execution mode (ADR-002)
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum PipelineMode {
    /// One sidecar at a time, auto-stop after task. Safe for 4 GB RAM.
    Sequential,
    /// Both sidecars can coexist. Requires >= 8 GB RAM.
    Concurrent,
}

impl Default for PipelineMode {
    fn default() -> Self {
        PipelineMode::Sequential
    }
}

/// Pipeline configuration returned to frontend
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PipelineConfig {
    pub mode: PipelineMode,
    pub total_ram_gb: f64,
    pub concurrent_available: bool,
}

impl fmt::Display for SidecarName {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            SidecarName::Whisper => write!(f, "whisper"),
            SidecarName::Llama => write!(f, "llama"),
        }
    }
}

pub struct SidecarProcess {
    pub child: CommandChild,
    pub port: u16,
    pub request_count: u64,
    #[allow(dead_code)] // Used by watchdog (Story 13.5)
    pub max_requests: u64,
    pub started_at: std::time::Instant,
}

#[derive(Debug, thiserror::Error)]
pub enum SidecarError {
    #[error("Binaire IA introuvable : {0}. Les modeles IA ne sont pas installes.")]
    BinaryNotFound(String),

    #[error("Le sidecar {0} n'a pas repondu dans le delai imparti (healthcheck timeout)")]
    HealthcheckTimeout(SidecarName),

    #[error("Echec du demarrage du sidecar {0} : {1}")]
    StartFailed(SidecarName, String),

    #[error("Echec de l'arret du sidecar {0} : {1}")]
    StopFailed(SidecarName, String),

    #[error("Modele IA introuvable : {0}. Lancez le script scripts/setup-whisper.sh pour installer les modeles.")]
    ModelNotFound(String),

    #[error("Erreur de transcription : {0}")]
    TranscriptionFailed(String),

    #[error("Erreur interne : {0}")]
    Internal(String),
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TranscriptionResult {
    pub text: String,
    pub duration_ms: u64,
}

#[derive(Debug, Clone, Serialize)]
pub struct SidecarEvent {
    pub name: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub reason: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub error: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SidecarStatusResponse {
    pub whisper: SidecarInstanceStatus,
    pub llama: SidecarInstanceStatus,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SidecarInstanceStatus {
    pub running: bool,
    pub port: Option<u16>,
    pub request_count: Option<u64>,
    pub uptime_secs: Option<u64>,
}
