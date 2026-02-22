/// Dynamic system prompt builder with token budget management (ADR-008)
///
/// Builds the system prompt and user prompt for the LLM classification+fusion task.
/// Manages a token budget of ctx-size 2048 with intelligent truncation of existing
/// observations when the prompt would exceed the available budget.

/// Domain context with existing observation for prompt construction
#[derive(Debug, Clone)]
pub struct DomainContext {
    /// Local index (0..N-1), matching the GBNF grammar
    pub index: usize,
    /// Domain name (e.g., "Francais", "Mathematiques")
    pub nom: String,
    /// Existing observation for this domain (if any)
    pub observation_existante: Option<String>,
}

/// Result of prompt construction
#[derive(Debug, Clone)]
pub struct PromptBuilderResult {
    pub system_prompt: String,
    pub user_prompt: String,
    pub estimated_tokens: usize,
}

// Token budget constants (ADR-008)
const CTX_SIZE: usize = 2048;
const OUTPUT_RESERVE: usize = 150;
const INPUT_BUDGET: usize = CTX_SIZE - OUTPUT_RESERVE; // ~1898 tokens
const CHARS_PER_TOKEN: usize = 4; // ~1 token per 4 chars in French

// Truncation thresholds
const MAX_OBS_CHARS_TRUNCATED: usize = 200;

const SYSTEM_PROMPT_BASE: &str = r#"Tu es un assistant pedagogique pour une ecole elementaire.
Tu recois une observation dictee par l'enseignant et tu dois :
1. Identifier le domaine d'apprentissage vise parmi la liste fournie
2. Fusionner l'observation avec le texte existant du domaine (si present)
Tu reponds UNIQUEMENT en JSON au format : {"domaine_id": N, "observation_mise_a_jour": "texte"}
- domaine_id : index du domaine (commence a 0)
- observation_mise_a_jour : texte fusionne (existant + nouveau), coherent et concis
Si le domaine a deja une observation, integre le nouveau texte naturellement.
Si pas d'observation existante, utilise directement le texte dicte."#;

fn estimate_tokens(text: &str) -> usize {
    (text.len() + CHARS_PER_TOKEN - 1) / CHARS_PER_TOKEN
}

/// Truncate text to a maximum number of characters, adding "..." if truncated
fn truncate(text: &str, max_chars: usize) -> String {
    if text.len() <= max_chars {
        text.to_string()
    } else {
        let truncated = &text[..text.floor_char_boundary(max_chars.saturating_sub(3))];
        format!("{}...", truncated)
    }
}

/// Build the system prompt and user prompt for LLM classification+fusion.
///
/// The prompt includes:
/// - Base instructions (system prompt)
/// - List of active domains with indexes
/// - Existing observations per domain (truncated if budget exceeded)
/// - The dictated text (user prompt)
pub fn build_prompt(domains: &[DomainContext], dictated_text: &str) -> PromptBuilderResult {
    assert!(!domains.is_empty(), "Au moins un domaine requis pour construire le prompt");

    // Step 1: Build domain list section
    let domain_list: Vec<String> = domains
        .iter()
        .map(|d| format!("  {} - {}", d.index, d.nom))
        .collect();
    let domain_section = format!("Domaines actifs :\n{}", domain_list.join("\n"));

    // Step 2: Build observations section (full version first)
    let obs_entries: Vec<(usize, String)> = domains
        .iter()
        .filter_map(|d| {
            d.observation_existante.as_ref().map(|obs| {
                (d.index, format!("  {} ({}): {}", d.index, d.nom, obs))
            })
        })
        .collect();

    let obs_section_full = if obs_entries.is_empty() {
        "Aucune observation existante.".to_string()
    } else {
        let lines: Vec<&str> = obs_entries.iter().map(|(_, s)| s.as_str()).collect();
        format!("Observations existantes :\n{}", lines.join("\n"))
    };

    // Step 3: Estimate full prompt tokens
    let system_full = format!("{}\n\n{}\n\n{}", SYSTEM_PROMPT_BASE, domain_section, obs_section_full);
    let user_prompt = format!("Observation dictee :\n\"{}\"", dictated_text);
    let full_tokens = estimate_tokens(&system_full) + estimate_tokens(&user_prompt);

    if full_tokens <= INPUT_BUDGET {
        // Everything fits — no truncation needed
        return PromptBuilderResult {
            system_prompt: system_full,
            user_prompt,
            estimated_tokens: full_tokens,
        };
    }

    // Step 4: Truncation needed — truncate longest observations first
    let mut obs_texts: Vec<(usize, String, String, usize)> = domains
        .iter()
        .filter_map(|d| {
            d.observation_existante.as_ref().map(|obs| {
                (d.index, d.nom.clone(), obs.clone(), obs.len())
            })
        })
        .collect();

    // Sort by length descending (truncate longest first)
    obs_texts.sort_by(|a, b| b.3.cmp(&a.3));

    // Truncate iteratively until we fit
    for item in obs_texts.iter_mut() {
        if item.2.len() > MAX_OBS_CHARS_TRUNCATED {
            item.2 = truncate(&item.2, MAX_OBS_CHARS_TRUNCATED);
        }
    }

    // Sort back by index for display
    obs_texts.sort_by_key(|item| item.0);

    let obs_section_truncated = if obs_texts.is_empty() {
        "Aucune observation existante.".to_string()
    } else {
        let lines: Vec<String> = obs_texts
            .iter()
            .map(|(idx, nom, obs, _)| format!("  {} ({}): {}", idx, nom, obs))
            .collect();
        format!("Observations existantes (resumees) :\n{}", lines.join("\n"))
    };

    let system_truncated = format!("{}\n\n{}\n\n{}", SYSTEM_PROMPT_BASE, domain_section, obs_section_truncated);
    let truncated_tokens = estimate_tokens(&system_truncated) + estimate_tokens(&user_prompt);

    PromptBuilderResult {
        system_prompt: system_truncated,
        user_prompt,
        estimated_tokens: truncated_tokens,
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn make_domains(count: usize) -> Vec<DomainContext> {
        let names = [
            "Francais", "Mathematiques", "Sciences et Technologies",
            "Histoire-Geographie", "Enseignement Moral et Civique",
            "Education Physique et Sportive", "Arts Plastiques",
            "Education Musicale", "Langues Vivantes",
        ];
        (0..count)
            .map(|i| DomainContext {
                index: i,
                nom: names.get(i).unwrap_or(&"Domaine custom").to_string(),
                observation_existante: None,
            })
            .collect()
    }

    #[test]
    fn build_prompt_basic_no_observations() {
        let domains = make_domains(3);
        let result = build_prompt(&domains, "L'eleve lit bien a voix haute");
        assert!(result.system_prompt.contains("Domaines actifs"));
        assert!(result.system_prompt.contains("0 - Francais"));
        assert!(result.system_prompt.contains("1 - Mathematiques"));
        assert!(result.system_prompt.contains("2 - Sciences et Technologies"));
        assert!(result.system_prompt.contains("Aucune observation existante"));
        assert!(result.user_prompt.contains("L'eleve lit bien a voix haute"));
        assert!(result.estimated_tokens > 0);
        assert!(result.estimated_tokens <= INPUT_BUDGET);
    }

    #[test]
    fn build_prompt_with_existing_observations() {
        let domains = vec![
            DomainContext {
                index: 0,
                nom: "Francais".to_string(),
                observation_existante: Some("Bonne lecture orale.".to_string()),
            },
            DomainContext {
                index: 1,
                nom: "Mathematiques".to_string(),
                observation_existante: None,
            },
        ];
        let result = build_prompt(&domains, "Progresse en calcul mental");
        assert!(result.system_prompt.contains("0 (Francais): Bonne lecture orale."));
        assert!(!result.system_prompt.contains("1 (Mathematiques):")); // No observation
    }

    #[test]
    fn build_prompt_truncates_long_observations() {
        // Create observations that will exceed the token budget (~1898 tokens)
        // 5 observations * 3000 chars = 15000 chars = ~3750 tokens > budget
        let long_obs = "A".repeat(3000);
        let domains = vec![
            DomainContext {
                index: 0,
                nom: "Francais".to_string(),
                observation_existante: Some(long_obs.clone()),
            },
            DomainContext {
                index: 1,
                nom: "Mathematiques".to_string(),
                observation_existante: Some(long_obs.clone()),
            },
            DomainContext {
                index: 2,
                nom: "Sciences".to_string(),
                observation_existante: Some(long_obs.clone()),
            },
            DomainContext {
                index: 3,
                nom: "Histoire".to_string(),
                observation_existante: Some(long_obs.clone()),
            },
            DomainContext {
                index: 4,
                nom: "EMC".to_string(),
                observation_existante: Some(long_obs),
            },
        ];
        let result = build_prompt(&domains, "Texte dicte");
        // Observations should be truncated
        assert!(result.system_prompt.contains("..."));
        assert!(result.system_prompt.contains("resumees"));
    }

    #[test]
    fn build_prompt_nine_domains_c3_fits_budget() {
        let domains = make_domains(9);
        let result = build_prompt(&domains, "L'eleve participe activement en classe");
        assert!(result.estimated_tokens <= INPUT_BUDGET);
        assert!(result.system_prompt.contains("8 - Langues Vivantes"));
    }

    #[test]
    fn build_prompt_token_estimation() {
        let text = "abcd"; // 4 chars = 1 token
        assert_eq!(estimate_tokens(text), 1);
        let text = "abcde"; // 5 chars = 2 tokens
        assert_eq!(estimate_tokens(text), 2);
        let text = ""; // 0 chars = 0 tokens
        assert_eq!(estimate_tokens(text), 0);
    }

    #[test]
    fn truncate_short_text_unchanged() {
        assert_eq!(truncate("Hello", 10), "Hello");
    }

    #[test]
    fn truncate_long_text_adds_ellipsis() {
        let result = truncate("A".repeat(300).as_str(), 200);
        assert!(result.ends_with("..."));
        assert!(result.len() <= 200);
    }

    #[test]
    #[should_panic(expected = "Au moins un domaine")]
    fn build_prompt_panics_on_empty_domains() {
        build_prompt(&[], "texte");
    }

    #[test]
    fn build_prompt_preserves_short_observations() {
        let domains = vec![
            DomainContext {
                index: 0,
                nom: "Francais".to_string(),
                observation_existante: Some("Court.".to_string()),
            },
            DomainContext {
                index: 1,
                nom: "Mathematiques".to_string(),
                observation_existante: Some("Aussi court.".to_string()),
            },
        ];
        let result = build_prompt(&domains, "Dicte");
        // Short observations should NOT be truncated
        assert!(result.system_prompt.contains("Court."));
        assert!(result.system_prompt.contains("Aussi court."));
        assert!(!result.system_prompt.contains("..."));
    }
}
