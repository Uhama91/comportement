/// Dynamic GBNF grammar generation for LLM classification (ADR-007)
///
/// Generates a GBNF grammar per-request from the active domains of the student's cycle.
/// The grammar constrains the LLM output to a JSON object with:
/// - `domaine_id`: integer index 0..N-1 matching active domains
/// - `observation_mise_a_jour`: non-empty string with the merged observation
///
/// The grammar string is passed in the API request body (not via `--grammar-file`).

/// Domain info needed for GBNF generation
#[derive(Debug, Clone)]
pub struct DomainInfo {
    pub id: i64,
    pub nom: String,
}

/// Generate a dynamic GBNF grammar string from active domains.
///
/// The generated grammar constrains the LLM to produce exactly:
/// ```json
/// {"domaine_id": N, "observation_mise_a_jour": "texte non vide"}
/// ```
/// where N is an integer in 0..domains.len()-1.
pub fn generate_gbnf(domains: &[DomainInfo]) -> String {
    assert!(!domains.is_empty(), "Au moins un domaine requis pour generer la grammaire GBNF");

    // Build domaine-id alternatives: "0" | "1" | ... | "N-1"
    let domain_id_alts: Vec<String> = (0..domains.len())
        .map(|i| format!("\"{}\"", i))
        .collect();
    let domain_id_rule = domain_id_alts.join(" | ");

    format!(
        r#"root ::= "{{" ws "\"domaine_id\":" ws domaine-id "," ws "\"observation_mise_a_jour\":" ws string "}}"
domaine-id ::= {domain_id_rule}
ws ::= [ \t\n]*
string ::= "\"" chars "\""
chars ::= char+
char ::= [^"\\] | "\\" escape
escape ::= "\"" | "\\" | "/" | "n" | "r" | "t"
"#,
        domain_id_rule = domain_id_rule
    )
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn generate_gbnf_single_domain() {
        let domains = vec![DomainInfo { id: 1, nom: "Francais".to_string() }];
        let grammar = generate_gbnf(&domains);
        assert!(grammar.contains("domaine-id ::= \"0\""));
        assert!(grammar.contains("observation_mise_a_jour"));
        assert!(grammar.contains("root ::="));
    }

    #[test]
    fn generate_gbnf_multiple_domains() {
        let domains = vec![
            DomainInfo { id: 1, nom: "Francais".to_string() },
            DomainInfo { id: 2, nom: "Mathematiques".to_string() },
            DomainInfo { id: 3, nom: "Sciences et Technologies".to_string() },
        ];
        let grammar = generate_gbnf(&domains);
        assert!(grammar.contains("\"0\" | \"1\" | \"2\""));
        assert!(!grammar.contains("\"3\""));
    }

    #[test]
    fn generate_gbnf_nine_domains_c3() {
        let domains: Vec<DomainInfo> = (0..9)
            .map(|i| DomainInfo { id: i + 1, nom: format!("Domaine {}", i) })
            .collect();
        let grammar = generate_gbnf(&domains);
        // Should have 0..8
        assert!(grammar.contains("\"0\" | \"1\" | \"2\" | \"3\" | \"4\" | \"5\" | \"6\" | \"7\" | \"8\""));
        assert!(!grammar.contains("\"9\""));
    }

    #[test]
    fn generate_gbnf_constrains_nonempty_string() {
        let domains = vec![DomainInfo { id: 1, nom: "Francais".to_string() }];
        let grammar = generate_gbnf(&domains);
        // chars ::= char+ (at least one character required)
        assert!(grammar.contains("chars ::= char+"));
    }

    #[test]
    #[should_panic(expected = "Au moins un domaine")]
    fn generate_gbnf_panics_on_empty_domains() {
        generate_gbnf(&[]);
    }

    #[test]
    fn generate_gbnf_valid_structure() {
        let domains = vec![
            DomainInfo { id: 10, nom: "Francais".to_string() },
            DomainInfo { id: 20, nom: "Mathematiques".to_string() },
        ];
        let grammar = generate_gbnf(&domains);
        // Verify structure: root, domaine-id, ws, string, chars, char, escape rules
        assert!(grammar.contains("root ::="));
        assert!(grammar.contains("domaine-id ::="));
        assert!(grammar.contains("ws ::="));
        assert!(grammar.contains("string ::="));
        assert!(grammar.contains("char ::="));
        assert!(grammar.contains("escape ::="));
    }
}
