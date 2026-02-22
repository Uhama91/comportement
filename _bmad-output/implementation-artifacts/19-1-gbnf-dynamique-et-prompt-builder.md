# Story 19.1 : GBNF Dynamique & Prompt Builder

## Story

En tant qu'enseignant,
Je veux que le systeme genere automatiquement les contraintes de sortie du LLM a partir de mes domaines configures,
Afin que le LLM ne puisse classifier que dans les domaines reellement actifs pour l'eleve.

## Status: done

## FRs: FR46, FR49
## Epic: 19

## Tasks

### Task 1 : Module gbnf.rs — generation dynamique de grammaire GBNF
- Struct `DomainInfo { id: i64, nom: String }` pour recevoir les domaines actifs
- Fonction `generate_gbnf(domains: &[DomainInfo]) -> String`
- Grammaire contraint `domaine_id` aux index 0..N-1
- Champ `observation_mise_a_jour` contraint en string non-vide
- Tests unitaires : 1 domaine, 9 domaines, validation format

### Task 2 : Module prompt_builder.rs — construction du system prompt adaptatif
- Struct `DomainContext { index, nom, observation_existante }`
- Struct `PromptBuilderResult { system_prompt, user_prompt, estimated_tokens }`
- Fonction `build_prompt(domains, dictated_text) -> PromptBuilderResult`
- Budget tokens ctx-size 2048, reserve output 150 tokens
- Troncature intelligente : observations les plus longues tronquees en priorite
- Estimation : 1 token ~ 4 caracteres en francais
- Tests unitaires : budget OK, depassement avec troncature

### Task 3 : Mise a jour config.rs
- ctx-size 1024 → 2048 pour llama-server
- Retrait de `--grammar-file` des args serveur (grammar sera per-request dans le body API)

### Task 4 : Enregistrement modules dans mod.rs
- Ajouter `pub mod gbnf;` et `pub mod prompt_builder;`

### Task 5 : Verification TypeScript + Tests Rust
- `npx tsc --noEmit` zero errors
- `cargo test` tous les tests passent (y compris nouveaux tests gbnf + prompt_builder)

## Dev Notes

### Architecture ADR-007 : GBNF dynamique
La grammaire GBNF est generee par requete depuis les domaines actifs du cycle de l'eleve.
Format genere :
```
root ::= "{" ws "\"domaine_id\":" ws domaine-id "," ws "\"observation_mise_a_jour\":" ws string "}"
domaine-id ::= "0" | "1" | ... | "N-1"
```
La grammaire sera passee dans le body JSON de la requete API (pas en flag `--grammar-file` au demarrage).

### Architecture ADR-008 : Budget tokens adaptatif
- System prompt (instructions) : ~300 tokens fixes
- Domaines actifs (index + noms) : ~50 tokens
- Observations existantes : variable, tronquees si besoin
- Texte dicte : ~50-150 tokens
- Output reserve : ~150 tokens
- Total disponible input : ~1900 tokens

### Integration future (Stories 19.3/19.4)
Ces modules seront integres dans `structuration.rs` lors de la Story 19.3.
Pour l'instant, ce sont des modules independants avec tests unitaires.

## Acceptance Criteria

- [x] Le module `gbnf.rs` genere une grammaire GBNF valide pour N domaines
- [x] La grammaire contraint `domaine_id` aux index 0..N-1
- [x] Le module `prompt_builder.rs` construit un prompt avec domaines + observations existantes
- [x] Le budget tokens respecte ctx-size 2048 avec troncature intelligente
- [x] Les observations les plus longues sont tronquees en priorite si depassement
- [x] ctx-size mis a jour a 2048 dans config.rs
- [x] `cargo test` passe avec les nouveaux tests (64 tests, 15 nouveaux)
