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
const CTX_SIZE: usize = 3072;
const OUTPUT_RESERVE: usize = 768; // max_tokens for multi-domain output
const INPUT_BUDGET: usize = CTX_SIZE - OUTPUT_RESERVE; // ~2048 tokens for prompt
const CHARS_PER_TOKEN: usize = 4; // ~1 token per 4 chars in French

// Truncation thresholds
const MAX_OBS_CHARS_TRUNCATED: usize = 200;

const SYSTEM_PROMPT_BASE: &str = r#"Assistant pedagogique. Classe la dictee dans les domaines mentionnes.
Reponds en JSON : [{"domaine_id": N, "observation_mise_a_jour": "texte"}]

REGLES :
- Si la dictee mentionne PLUSIEURS domaines, cree un item SEPARE pour chaque domaine. Maximum 3 items.
- UNIQUEMENT les domaines nommes ou clairement evoques dans la dictee.
- Garde les details importants (points forts, difficultes, conseils). 2-3 phrases par domaine.
- Chaque observation concerne UNIQUEMENT son domaine. Ne melange pas le contenu.
- Corrige fautes de transcription. Style ecrit professionnel.
- Si observation existante : fusionne ancien + nouveau."#;

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

// ─── V2.1 — Job 2 (Synthese) + Job 3 (Appreciation) ───

/// A single pedagogical event for prompt construction
#[derive(Debug, Clone)]
pub struct EventContext {
    pub event_type: String, // 'observation' | 'evaluation' | 'motif_sanction'
    pub observations: Option<String>,
    pub niveau_lsu: Option<String>,
    pub lecon: Option<String>,
    pub created_at: String,
}

/// A domain synthesis entry for appreciation prompt construction
#[derive(Debug, Clone)]
pub struct SynthesisContext {
    pub domaine_nom: String,
    pub synthese_text: String,
}

const SYSTEM_PROMPT_SYNTHESE: &str = r#"Assistant pedagogique. Tu rediges une synthese pour le Livret Scolaire Unique (LSU).
A partir des observations et evaluations, produis un texte de synthese coherent.

REGLES :
- Style ecrit professionnel, 3e personne ("L'eleve...").
- 3-5 phrases. Maximum 300 caracteres.
- Mentionne progres, points forts et axes d'amelioration.
- Jamais de jugement global negatif. Toujours constructif.
- Reponds en JSON : { "synthese": "texte" }"#;

const SYSTEM_PROMPT_APPRECIATION: &str = r#"Assistant pedagogique. Tu rediges l'appreciation generale pour le Livret Scolaire Unique (LSU).
A partir des syntheses par domaine et du comportement, produis un texte transversal.

REGLES :
- Style bienveillant, 3e personne ("L'eleve...").
- 3-6 phrases. Maximum 500 caracteres.
- Mentionne domaines ou l'eleve excelle et axes de progres.
- JAMAIS punitif. Toujours encourageant et constructif.
- Ne mentionne pas sanctions directement. Evoque le comportement positivement.
- Reponds en JSON : { "appreciation": "texte" }"#;

/// Build the system + user prompt for Job 2 — Synthese LSU par domaine.
///
/// Events are assumed to be in chronological order (oldest first).
/// If the prompt exceeds the token budget, oldest events are dropped first.
pub fn build_synthese_prompt(
    events: &[EventContext],
    domaine_nom: &str,
    student_name: &str,
) -> PromptBuilderResult {
    let system_prompt = SYSTEM_PROMPT_SYNTHESE.to_string();
    let user_prefix = format!(
        "Eleve: {}\nDomaine: {}\n\nEvenements (chronologiques) :\n",
        student_name, domaine_nom
    );

    let format_event = |e: &EventContext, idx: usize| -> String {
        match e.event_type.as_str() {
            "evaluation" => format!(
                "{}. [{}] Evaluation - Lecon: {}, Niveau: {}",
                idx + 1,
                e.created_at,
                e.lecon.as_deref().unwrap_or("?"),
                e.niveau_lsu.as_deref().unwrap_or("?")
            ),
            "motif_sanction" => format!(
                "{}. [{}] Incident: {}",
                idx + 1,
                e.created_at,
                e.observations.as_deref().unwrap_or("")
            ),
            _ => format!(
                "{}. [{}] Observation: {}",
                idx + 1,
                e.created_at,
                e.observations.as_deref().unwrap_or("")
            ),
        }
    };

    if events.is_empty() {
        let user_prompt = format!("{}Aucun evenement.", user_prefix);
        let tokens = estimate_tokens(&system_prompt) + estimate_tokens(&user_prompt);
        return PromptBuilderResult { system_prompt, user_prompt, estimated_tokens: tokens };
    }

    // Try progressively removing oldest events until budget fits
    let mut start = 0;
    loop {
        let slice = &events[start..];
        let lines: Vec<String> = slice
            .iter()
            .enumerate()
            .map(|(i, e)| format_event(e, i))
            .collect();
        let user_prompt = format!("{}{}", user_prefix, lines.join("\n"));
        let tokens = estimate_tokens(&system_prompt) + estimate_tokens(&user_prompt);

        if tokens <= INPUT_BUDGET || slice.len() <= 1 {
            return PromptBuilderResult { system_prompt, user_prompt, estimated_tokens: tokens };
        }
        start += 1;
    }
}

/// Build the system + user prompt for Job 3 — Appreciation generale.
///
/// If the prompt exceeds the token budget, the longest syntheses are truncated first.
pub fn build_appreciation_prompt(
    syntheses: &[SynthesisContext],
    behavior_summary: &str,
    student_name: &str,
) -> PromptBuilderResult {
    let system_prompt = SYSTEM_PROMPT_APPRECIATION.to_string();

    fn format_user(syns: &[SynthesisContext], name: &str, behavior: &str) -> String {
        let lines: Vec<String> = syns
            .iter()
            .map(|s| format!("- {} : {}", s.domaine_nom, s.synthese_text))
            .collect();
        format!(
            "Eleve: {}\n\nSyntheses par domaine :\n{}\n\nComportement :\n{}",
            name,
            lines.join("\n"),
            behavior
        )
    }

    let user_prompt = format_user(syntheses, student_name, behavior_summary);
    let full_tokens = estimate_tokens(&system_prompt) + estimate_tokens(&user_prompt);

    if full_tokens <= INPUT_BUDGET || syntheses.is_empty() {
        return PromptBuilderResult {
            system_prompt,
            user_prompt,
            estimated_tokens: full_tokens,
        };
    }

    // Truncate longest syntheses first until budget fits
    let mut truncated: Vec<SynthesisContext> = syntheses.to_vec();
    loop {
        let max_idx = truncated
            .iter()
            .enumerate()
            .max_by_key(|(_, s)| s.synthese_text.len())
            .map(|(i, _)| i);

        let Some(idx) = max_idx else { break };
        if truncated[idx].synthese_text.len() <= MAX_OBS_CHARS_TRUNCATED {
            break;
        }
        truncated[idx].synthese_text =
            truncate(&truncated[idx].synthese_text, MAX_OBS_CHARS_TRUNCATED);

        let up = format_user(&truncated, student_name, behavior_summary);
        let tokens = estimate_tokens(&system_prompt) + estimate_tokens(&up);
        if tokens <= INPUT_BUDGET {
            return PromptBuilderResult { system_prompt, user_prompt: up, estimated_tokens: tokens };
        }
    }

    let user_prompt_final = format_user(&truncated, student_name, behavior_summary);
    let tokens = estimate_tokens(&system_prompt) + estimate_tokens(&user_prompt_final);
    PromptBuilderResult { system_prompt, user_prompt: user_prompt_final, estimated_tokens: tokens }
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
        // Should not contain the truncation marker section
        assert!(!result.system_prompt.contains("resumees"));
    }

    // ─── Tests Job 2 (Synthese) + Job 3 (Appreciation) ───

    #[test]
    fn test_build_synthese_prompt_basic() {
        let events = vec![EventContext {
            event_type: "observation".to_string(),
            observations: Some("Bonne participation en cours.".to_string()),
            niveau_lsu: None,
            lecon: None,
            created_at: "2026-01-15".to_string(),
        }];
        let result = build_synthese_prompt(&events, "Francais", "Alice");
        assert!(result.system_prompt.contains("synthese"));
        assert!(result.user_prompt.contains("Alice"));
        assert!(result.user_prompt.contains("Francais"));
        assert!(result.user_prompt.contains("Bonne participation en cours"));
        assert!(result.estimated_tokens > 0);
        assert!(result.estimated_tokens <= INPUT_BUDGET);
    }

    #[test]
    fn test_build_synthese_prompt_truncates_old_events() {
        // 55 events with long observations — oldest should be dropped to fit budget
        let long_obs = "X".repeat(200);
        let events: Vec<EventContext> = (0..55)
            .map(|i| EventContext {
                event_type: "observation".to_string(),
                observations: Some(format!("Evenement {} : {}", i, long_obs)),
                niveau_lsu: None,
                lecon: None,
                created_at: format!("2026-01-{:02}T10:00:00", (i % 28) + 1),
            })
            .collect();

        let result = build_synthese_prompt(&events, "Francais", "Alice");
        assert!(
            result.estimated_tokens <= INPUT_BUDGET,
            "Token budget depasse: {}",
            result.estimated_tokens
        );
        // Most recent event (index 54) should be retained
        assert!(result.user_prompt.contains("Evenement 54"));
    }

    #[test]
    fn test_build_appreciation_prompt_basic() {
        let syntheses = vec![
            SynthesisContext {
                domaine_nom: "Francais".to_string(),
                synthese_text: "Bonne lecture.".to_string(),
            },
            SynthesisContext {
                domaine_nom: "Mathematiques".to_string(),
                synthese_text: "Progresse en calcul.".to_string(),
            },
        ];
        let result =
            build_appreciation_prompt(&syntheses, "Comportement global satisfaisant.", "Alice");
        assert!(result.system_prompt.contains("appreciation"));
        assert!(result.user_prompt.contains("Alice"));
        assert!(result.user_prompt.contains("Francais"));
        assert!(result.user_prompt.contains("Bonne lecture"));
        assert!(result.user_prompt.contains("Comportement global satisfaisant"));
        assert!(result.estimated_tokens <= INPUT_BUDGET);
    }

    #[test]
    fn test_build_appreciation_prompt_truncates_long_syntheses() {
        let long_text = "X".repeat(3000);
        let syntheses: Vec<SynthesisContext> = (0..5)
            .map(|i| SynthesisContext {
                domaine_nom: format!("Domaine {}", i),
                synthese_text: long_text.clone(),
            })
            .collect();
        let result =
            build_appreciation_prompt(&syntheses, "Bon comportement.", "Alice");
        // Syntheses should be truncated (contain "...")
        assert!(result.user_prompt.contains("..."));
    }
}
