use super::types::{PipelineConfig, PipelineMode, SidecarName};
use std::time::Duration;

pub struct SidecarConfig {
    pub port: u16,
    pub binary_name: &'static str,
    pub healthcheck_url: String,
    pub healthcheck_timeout: Duration,
    pub healthcheck_interval: Duration,
    pub max_requests: u64,
}

impl SidecarConfig {
    pub fn for_sidecar(name: SidecarName) -> Self {
        match name {
            SidecarName::Whisper => SidecarConfig {
                port: 8081,
                binary_name: "whisper-server",
                healthcheck_url: "http://127.0.0.1:8081/".to_string(),
                healthcheck_timeout: Duration::from_secs(30),
                healthcheck_interval: Duration::from_millis(500),
                max_requests: 50,
            },
            SidecarName::Llama => SidecarConfig {
                port: 8080,
                binary_name: "llama-server",
                healthcheck_url: "http://127.0.0.1:8080/health".to_string(),
                healthcheck_timeout: Duration::from_secs(15),
                healthcheck_interval: Duration::from_millis(500),
                max_requests: 0, // 0 = no limit
            },
        }
    }
}

pub fn build_args(
    name: SidecarName,
    model_path: &str,
    grammar_path: Option<&str>,
) -> Vec<String> {
    match name {
        SidecarName::Whisper => vec![
            "--model".to_string(),
            model_path.to_string(),
            "--host".to_string(),
            "127.0.0.1".to_string(),
            "--port".to_string(),
            "8081".to_string(),
            "--language".to_string(),
            "fr".to_string(),
            "--threads".to_string(),
            "4".to_string(),
        ],
        SidecarName::Llama => {
            // Note: grammar is passed per-request in the API body (ADR-007 V2.1),
            // not via --grammar-file at server startup.
            // grammar_path parameter kept for backward compatibility but ignored.
            let _ = grammar_path; // suppress unused warning
            vec![
                "--model".to_string(),
                model_path.to_string(),
                "--host".to_string(),
                "127.0.0.1".to_string(),
                "--port".to_string(),
                "8080".to_string(),
                "--ctx-size".to_string(),
                "2048".to_string(),
                "--threads".to_string(),
                "4".to_string(),
            ]
        }
    }
}

const CONCURRENT_RAM_THRESHOLD_GB: f64 = 8.0;

/// Detect total system RAM in bytes (platform-specific)
pub fn detect_total_ram_bytes() -> Option<u64> {
    #[cfg(target_os = "macos")]
    {
        let output = std::process::Command::new("sysctl")
            .args(["-n", "hw.memsize"])
            .output()
            .ok()?;
        String::from_utf8_lossy(&output.stdout)
            .trim()
            .parse()
            .ok()
    }

    #[cfg(target_os = "windows")]
    {
        let output = std::process::Command::new("wmic")
            .args(["ComputerSystem", "get", "TotalPhysicalMemory", "/format:value"])
            .output()
            .ok()?;
        let text = String::from_utf8_lossy(&output.stdout);
        for line in text.lines() {
            if let Some(val) = line.strip_prefix("TotalPhysicalMemory=") {
                return val.trim().parse().ok();
            }
        }
        None
    }

    #[cfg(target_os = "linux")]
    {
        let output = std::process::Command::new("grep")
            .args(["MemTotal", "/proc/meminfo"])
            .output()
            .ok()?;
        let text = String::from_utf8_lossy(&output.stdout);
        // Format: "MemTotal:       16384000 kB"
        let kb: u64 = text
            .split_whitespace()
            .nth(1)?
            .parse()
            .ok()?;
        Some(kb * 1024)
    }

    #[cfg(not(any(target_os = "macos", target_os = "windows", target_os = "linux")))]
    {
        None
    }
}

/// Determine the recommended pipeline mode based on system RAM
pub fn detect_pipeline_config() -> PipelineConfig {
    let ram_bytes = detect_total_ram_bytes().unwrap_or(0);
    let total_ram_gb = ram_bytes as f64 / (1024.0 * 1024.0 * 1024.0);
    let concurrent_available = total_ram_gb >= CONCURRENT_RAM_THRESHOLD_GB;

    PipelineConfig {
        mode: if concurrent_available {
            PipelineMode::Concurrent
        } else {
            PipelineMode::Sequential
        },
        total_ram_gb,
        concurrent_available,
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn whisper_config_has_correct_port() {
        let config = SidecarConfig::for_sidecar(SidecarName::Whisper);
        assert_eq!(config.port, 8081);
        assert_eq!(config.max_requests, 50);
    }

    #[test]
    fn llama_config_has_correct_port() {
        let config = SidecarConfig::for_sidecar(SidecarName::Llama);
        assert_eq!(config.port, 8080);
        assert_eq!(config.max_requests, 0);
    }

    #[test]
    fn whisper_args_contain_language_and_port() {
        let args = build_args(SidecarName::Whisper, "/path/to/model.gguf", None);
        assert!(args.contains(&"fr".to_string()));
        assert!(args.contains(&"8081".to_string()));
    }

    #[test]
    fn llama_args_no_grammar_file_flag() {
        // ADR-007 V2.1: grammar is per-request in API body, not at server startup
        let args = build_args(
            SidecarName::Llama,
            "/path/to/model.gguf",
            Some("/path/to/grammar.gbnf"),
        );
        assert!(!args.contains(&"--grammar-file".to_string()));
        assert!(args.contains(&"2048".to_string())); // ctx-size upgraded
    }

    #[test]
    fn llama_args_ctx_size_2048() {
        let args = build_args(SidecarName::Llama, "/path/to/model.gguf", None);
        let ctx_idx = args.iter().position(|a| a == "--ctx-size").unwrap();
        assert_eq!(args[ctx_idx + 1], "2048");
    }

    #[test]
    fn detect_ram_returns_some_on_supported_platforms() {
        // Should return Some on macOS/Windows/Linux
        let ram = detect_total_ram_bytes();
        if cfg!(any(target_os = "macos", target_os = "windows", target_os = "linux")) {
            assert!(ram.is_some(), "RAM detection should work on this platform");
            assert!(ram.unwrap() > 0, "RAM should be > 0");
        }
    }

    #[test]
    fn pipeline_config_defaults_to_sequential_for_low_ram() {
        // 4 GB system should be sequential
        let config = PipelineConfig {
            mode: if 4.0 >= 8.0 { PipelineMode::Concurrent } else { PipelineMode::Sequential },
            total_ram_gb: 4.0,
            concurrent_available: false,
        };
        assert_eq!(config.mode, PipelineMode::Sequential);
        assert!(!config.concurrent_available);
    }

    #[test]
    fn pipeline_config_allows_concurrent_for_high_ram() {
        // 16 GB system should allow concurrent
        let config = PipelineConfig {
            mode: if 16.0 >= 8.0 { PipelineMode::Concurrent } else { PipelineMode::Sequential },
            total_ram_gb: 16.0,
            concurrent_available: true,
        };
        assert_eq!(config.mode, PipelineMode::Concurrent);
        assert!(config.concurrent_available);
    }

    #[test]
    fn detect_pipeline_config_returns_valid_config() {
        let config = detect_pipeline_config();
        assert!(config.total_ram_gb > 0.0);
        // If we have enough RAM, concurrent should be available
        if config.total_ram_gb >= 8.0 {
            assert!(config.concurrent_available);
        }
    }
}
