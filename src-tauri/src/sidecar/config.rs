use super::types::SidecarName;
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
                binary_name: "binaries/whisper-server",
                healthcheck_url: "http://127.0.0.1:8081/health".to_string(),
                healthcheck_timeout: Duration::from_secs(10),
                healthcheck_interval: Duration::from_millis(500),
                max_requests: 50,
            },
            SidecarName::Llama => SidecarConfig {
                port: 8080,
                binary_name: "binaries/llama-server",
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
            "--vad".to_string(),
            "--language".to_string(),
            "fr".to_string(),
            "--threads".to_string(),
            "4".to_string(),
        ],
        SidecarName::Llama => {
            let mut args = vec![
                "--model".to_string(),
                model_path.to_string(),
                "--host".to_string(),
                "127.0.0.1".to_string(),
                "--port".to_string(),
                "8080".to_string(),
                "--ctx-size".to_string(),
                "1024".to_string(),
                "--threads".to_string(),
                "4".to_string(),
            ];
            if let Some(grammar) = grammar_path {
                args.push("--grammar-file".to_string());
                args.push(grammar.to_string());
            }
            args
        }
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
    fn whisper_args_contain_vad_and_language() {
        let args = build_args(SidecarName::Whisper, "/path/to/model.gguf", None);
        assert!(args.contains(&"--vad".to_string()));
        assert!(args.contains(&"fr".to_string()));
        assert!(args.contains(&"8081".to_string()));
    }

    #[test]
    fn llama_args_contain_grammar_when_provided() {
        let args = build_args(
            SidecarName::Llama,
            "/path/to/model.gguf",
            Some("/path/to/grammar.gbnf"),
        );
        assert!(args.contains(&"--grammar-file".to_string()));
        assert!(args.contains(&"/path/to/grammar.gbnf".to_string()));
    }

    #[test]
    fn llama_args_omit_grammar_when_none() {
        let args = build_args(SidecarName::Llama, "/path/to/model.gguf", None);
        assert!(!args.contains(&"--grammar-file".to_string()));
    }
}
