use super::config::{build_args, detect_pipeline_config, SidecarConfig};
use super::types::*;
use log::{error, info, warn};
use tauri::{AppHandle, Emitter};
use tauri_plugin_shell::ShellExt;
use tokio::sync::Mutex;
use tokio::time::{sleep, Instant};

struct SidecarManagerInner {
    whisper: Option<SidecarProcess>,
    llama: Option<SidecarProcess>,
    pipeline_mode: PipelineMode,
}

impl SidecarManagerInner {
    fn get(&self, name: SidecarName) -> &Option<SidecarProcess> {
        match name {
            SidecarName::Whisper => &self.whisper,
            SidecarName::Llama => &self.llama,
        }
    }

    fn take(&mut self, name: SidecarName) -> Option<SidecarProcess> {
        match name {
            SidecarName::Whisper => self.whisper.take(),
            SidecarName::Llama => self.llama.take(),
        }
    }

    fn set(&mut self, name: SidecarName, process: SidecarProcess) {
        match name {
            SidecarName::Whisper => self.whisper = Some(process),
            SidecarName::Llama => self.llama = Some(process),
        }
    }

    fn other(name: SidecarName) -> SidecarName {
        match name {
            SidecarName::Whisper => SidecarName::Llama,
            SidecarName::Llama => SidecarName::Whisper,
        }
    }
}

pub struct SidecarManager {
    inner: Mutex<SidecarManagerInner>,
}

impl SidecarManager {
    pub fn new() -> Self {
        let config = detect_pipeline_config();
        info!(
            "Pipeline mode: {:?} (RAM: {:.1} Go, concurrent disponible: {})",
            config.mode, config.total_ram_gb, config.concurrent_available
        );

        Self {
            inner: Mutex::new(SidecarManagerInner {
                whisper: None,
                llama: None,
                pipeline_mode: config.mode,
            }),
        }
    }

    pub async fn start(
        &self,
        app: &AppHandle,
        name: SidecarName,
        model_path: String,
        grammar_path: Option<String>,
    ) -> Result<(), SidecarError> {
        let mut inner = self.inner.lock().await;
        let config = SidecarConfig::for_sidecar(name);

        // ADR-002: Sequential mode — stop the OTHER sidecar if running
        if inner.pipeline_mode == PipelineMode::Sequential {
            let other_name = SidecarManagerInner::other(name);
            if inner.get(other_name).is_some() {
                info!("Pipeline sequentiel: arret de {} avant demarrage de {}", other_name, name);
                if let Some(process) = inner.take(other_name) {
                    let _ = process.child.kill();
                    let _ = app.emit("sidecar_stopped", SidecarEvent {
                        name: other_name.to_string(),
                        reason: Some(format!("Arrete pour demarrer {}", name)),
                        error: None,
                    });
                }
            }
        }

        // Stop current sidecar if already running (restart idempotent)
        if inner.get(name).is_some() {
            info!("Redemarrage de {} (deja en cours)", name);
            if let Some(process) = inner.take(name) {
                let _ = process.child.kill();
            }
        }

        // Spawn the sidecar process
        let args = build_args(name, &model_path, grammar_path.as_deref());
        let shell = app.shell();

        let command = match shell.sidecar(config.binary_name) {
            Ok(cmd) => cmd,
            Err(e) => {
                let err_str = e.to_string();
                if err_str.contains("not found") || err_str.contains("No such file") || err_str.contains("doesn't exist") {
                    return Err(SidecarError::BinaryNotFound(
                        config.binary_name.to_string(),
                    ));
                }
                return Err(SidecarError::StartFailed(name, err_str));
            }
        };

        let (rx, child) = command
            .args(&args)
            .spawn()
            .map_err(|e| {
                let err_str = e.to_string();
                if err_str.contains("not found") || err_str.contains("No such file") || err_str.contains("program not found") {
                    SidecarError::BinaryNotFound(config.binary_name.to_string())
                } else {
                    SidecarError::StartFailed(name, err_str)
                }
            })?;

        // Spawn background task to drain stdout/stderr (prevents process from blocking)
        let app_clone = app.clone();
        let sidecar_name = name;
        tauri::async_runtime::spawn(async move {
            use tauri_plugin_shell::process::CommandEvent;

            let mut rx = rx;
            while let Some(event) = rx.recv().await {
                match event {
                    CommandEvent::Stdout(line) => {
                        info!("[{} stdout] {}", sidecar_name, String::from_utf8_lossy(&line));
                    }
                    CommandEvent::Stderr(line) => {
                        warn!("[{} stderr] {}", sidecar_name, String::from_utf8_lossy(&line));
                    }
                    CommandEvent::Terminated(payload) => {
                        let code = payload.code.unwrap_or(-1);
                        if code != 0 {
                            error!("[{}] Processus termine avec code {}", sidecar_name, code);
                            let _ = app_clone.emit("sidecar_error", SidecarEvent {
                                name: sidecar_name.to_string(),
                                reason: None,
                                error: Some(format!("Processus termine avec code {}", code)),
                            });
                        }
                        break;
                    }
                    CommandEvent::Error(err) => {
                        error!("[{}] Erreur: {}", sidecar_name, err);
                        break;
                    }
                    _ => {}
                }
            }
        });

        // Polling healthcheck
        let client = reqwest::Client::builder()
            .timeout(std::time::Duration::from_secs(2))
            .build()
            .map_err(|e| SidecarError::Internal(e.to_string()))?;

        let start_time = Instant::now();
        let healthcheck_ok = loop {
            if start_time.elapsed() >= config.healthcheck_timeout {
                break false;
            }
            sleep(config.healthcheck_interval).await;

            match client.get(&config.healthcheck_url).send().await {
                Ok(resp) if resp.status().is_success() => break true,
                _ => continue,
            }
        };

        if !healthcheck_ok {
            // Timeout: kill the child process
            // Note: child has been moved, we can't kill it directly here.
            // The background task will detect the termination.
            return Err(SidecarError::HealthcheckTimeout(name));
        }

        // Store process info and emit event
        inner.set(name, SidecarProcess {
            child,
            port: config.port,
            request_count: 0,
            max_requests: config.max_requests,
            started_at: std::time::Instant::now(),
        });

        let _ = app.emit("sidecar_ready", SidecarEvent {
            name: name.to_string(),
            reason: None,
            error: None,
        });

        info!("Sidecar {} demarre sur le port {}", name, config.port);
        Ok(())
    }

    pub async fn stop(
        &self,
        app: &AppHandle,
        name: SidecarName,
    ) -> Result<(), SidecarError> {
        let mut inner = self.inner.lock().await;

        if let Some(process) = inner.take(name) {
            process
                .child
                .kill()
                .map_err(|e| SidecarError::StopFailed(name, e.to_string()))?;

            let _ = app.emit("sidecar_stopped", SidecarEvent {
                name: name.to_string(),
                reason: None,
                error: None,
            });

            info!("Sidecar {} arrete", name);
        }

        Ok(())
    }

    pub async fn stop_all(&self, app: &AppHandle) {
        let mut inner = self.inner.lock().await;

        for name in [SidecarName::Whisper, SidecarName::Llama] {
            if let Some(process) = inner.take(name) {
                let _ = process.child.kill();
                let _ = app.emit("sidecar_stopped", SidecarEvent {
                    name: name.to_string(),
                    reason: Some("Application fermee".to_string()),
                    error: None,
                });
                info!("Sidecar {} arrete (shutdown)", name);
            }
        }
    }

    pub async fn get_status(&self) -> SidecarStatusResponse {
        let inner = self.inner.lock().await;

        SidecarStatusResponse {
            whisper: Self::instance_status(&inner.whisper),
            llama: Self::instance_status(&inner.llama),
        }
    }

    #[allow(dead_code)] // Used by watchdog (Story 13.5)
    pub async fn increment_request_count(&self, name: SidecarName) {
        let mut inner = self.inner.lock().await;
        let process = match name {
            SidecarName::Whisper => &mut inner.whisper,
            SidecarName::Llama => &mut inner.llama,
        };
        if let Some(p) = process {
            p.request_count += 1;
        }
    }

    /// Auto-stop a sidecar after task completion (sequential mode only).
    /// In concurrent mode, sidecars stay alive for reuse.
    pub async fn auto_stop_after_task(
        &self,
        app: &AppHandle,
        name: SidecarName,
    ) {
        let inner = self.inner.lock().await;
        if inner.pipeline_mode != PipelineMode::Sequential {
            return;
        }
        drop(inner); // Release lock before calling stop()

        info!("Pipeline sequentiel: arret automatique de {} apres tache", name);
        if let Err(e) = self.stop(app, name).await {
            warn!("Echec arret auto de {} : {}", name, e);
        }
    }

    /// Check if the pipeline is in sequential mode
    #[allow(dead_code)] // Available for watchdog (Story 13.5) and future use
    pub async fn is_sequential(&self) -> bool {
        let inner = self.inner.lock().await;
        inner.pipeline_mode == PipelineMode::Sequential
    }

    /// Get the current pipeline configuration
    pub async fn get_pipeline_config(&self) -> PipelineConfig {
        let inner = self.inner.lock().await;
        let detected = detect_pipeline_config();
        PipelineConfig {
            mode: inner.pipeline_mode,
            total_ram_gb: detected.total_ram_gb,
            concurrent_available: detected.concurrent_available,
        }
    }

    /// Override the pipeline mode (e.g., user preference from settings)
    pub async fn set_pipeline_mode(&self, mode: PipelineMode) {
        let mut inner = self.inner.lock().await;
        info!("Pipeline mode change: {:?} -> {:?}", inner.pipeline_mode, mode);
        inner.pipeline_mode = mode;
    }

    fn instance_status(process: &Option<SidecarProcess>) -> SidecarInstanceStatus {
        match process {
            Some(p) => SidecarInstanceStatus {
                running: true,
                port: Some(p.port),
                request_count: Some(p.request_count),
                uptime_secs: Some(p.started_at.elapsed().as_secs()),
            },
            None => SidecarInstanceStatus {
                running: false,
                port: None,
                request_count: None,
                uptime_secs: None,
            },
        }
    }
}
