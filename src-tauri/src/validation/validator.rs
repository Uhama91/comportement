use crate::sidecar::structuration::ObservationResult;
use serde::{Deserialize, Serialize};

use super::schema::{ALLOWED_DOMAINES, ALLOWED_NIVEAUX, MAX_OBSERVATIONS_PER_CALL, MAX_TEXT_LENGTH};

/// A validated observation ready for DB insertion
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ValidatedAppreciation {
    pub domaine: String,
    pub niveau: String,
    pub observations: String,
    pub texte_dictation: Option<String>,
}

#[derive(Debug, thiserror::Error)]
pub enum ValidationError {
    #[error("Domaine inconnu : \"{0}\". Domaines autorises : {1}")]
    InvalidDomaine(String, String),

    #[error("Niveau inconnu : \"{0}\". Niveaux autorises : maitrise, en_cours_acquisition, debut")]
    InvalidNiveau(String),

    #[error("Le commentaire de l'observation {0} est vide")]
    EmptyComment(usize),

    #[error("Le commentaire de l'observation {0} depasse {1} caracteres (longueur: {2})")]
    CommentTooLong(usize, usize, usize),

    #[error("Trop d'observations ({0}). Maximum autorise : {1}")]
    TooManyObservations(usize, usize),

    #[error("Aucune observation a valider")]
    NoObservations,
}

/// Layer 3: Pure validation of LLM-generated observations.
/// No DB access, fully synchronous, deterministic.
pub fn validate_observations(
    observations: &[ObservationResult],
    original_text: Option<&str>,
) -> Result<Vec<ValidatedAppreciation>, ValidationError> {
    if observations.is_empty() {
        return Err(ValidationError::NoObservations);
    }

    if observations.len() > MAX_OBSERVATIONS_PER_CALL {
        return Err(ValidationError::TooManyObservations(
            observations.len(),
            MAX_OBSERVATIONS_PER_CALL,
        ));
    }

    let mut validated = Vec::with_capacity(observations.len());

    for (i, obs) in observations.iter().enumerate() {
        // Validate domaine against whitelist
        if !ALLOWED_DOMAINES.contains(&obs.domaine.as_str()) {
            return Err(ValidationError::InvalidDomaine(
                obs.domaine.clone(),
                ALLOWED_DOMAINES.join(", "),
            ));
        }

        // Validate niveau against whitelist
        if !ALLOWED_NIVEAUX.contains(&obs.niveau.as_str()) {
            return Err(ValidationError::InvalidNiveau(obs.niveau.clone()));
        }

        // Validate comment is not empty
        let trimmed = obs.commentaire.trim();
        if trimmed.is_empty() {
            return Err(ValidationError::EmptyComment(i + 1));
        }

        // Validate comment length
        if trimmed.len() > MAX_TEXT_LENGTH {
            return Err(ValidationError::CommentTooLong(
                i + 1,
                MAX_TEXT_LENGTH,
                trimmed.len(),
            ));
        }

        validated.push(ValidatedAppreciation {
            domaine: obs.domaine.clone(),
            niveau: obs.niveau.clone(),
            observations: trimmed.to_string(),
            texte_dictation: original_text.map(|t| t.to_string()),
        });
    }

    Ok(validated)
}

#[cfg(test)]
mod tests {
    use super::*;

    fn make_obs(domaine: &str, niveau: &str, commentaire: &str) -> ObservationResult {
        ObservationResult {
            domaine: domaine.to_string(),
            niveau: niveau.to_string(),
            commentaire: commentaire.to_string(),
        }
    }

    #[test]
    fn valid_single_observation() {
        let obs = vec![make_obs("Francais", "maitrise", "Excellent travail en lecture")];
        let result = validate_observations(&obs, Some("texte original"));
        assert!(result.is_ok());
        let validated = result.unwrap();
        assert_eq!(validated.len(), 1);
        assert_eq!(validated[0].domaine, "Francais");
        assert_eq!(validated[0].niveau, "maitrise");
        assert_eq!(validated[0].observations, "Excellent travail en lecture");
        assert_eq!(validated[0].texte_dictation, Some("texte original".to_string()));
    }

    #[test]
    fn valid_multiple_observations() {
        let obs = vec![
            make_obs("Francais", "maitrise", "Tres bien en lecture"),
            make_obs("Mathematiques", "en_cours_acquisition", "Progresse en calcul"),
            make_obs("Arts Plastiques", "debut", "A ameliorer"),
        ];
        let result = validate_observations(&obs, None);
        assert!(result.is_ok());
        let validated = result.unwrap();
        assert_eq!(validated.len(), 3);
        assert!(validated[0].texte_dictation.is_none());
    }

    #[test]
    fn reject_empty_observations() {
        let obs: Vec<ObservationResult> = vec![];
        let result = validate_observations(&obs, None);
        assert!(matches!(result, Err(ValidationError::NoObservations)));
    }

    #[test]
    fn reject_too_many_observations() {
        let obs: Vec<ObservationResult> = (0..21)
            .map(|_| make_obs("Francais", "maitrise", "Bien"))
            .collect();
        let result = validate_observations(&obs, None);
        assert!(matches!(
            result,
            Err(ValidationError::TooManyObservations(21, 20))
        ));
    }

    #[test]
    fn reject_invalid_domaine() {
        let obs = vec![make_obs("Cuisine", "maitrise", "Bon cuisinier")];
        let result = validate_observations(&obs, None);
        assert!(matches!(result, Err(ValidationError::InvalidDomaine(ref d, _)) if d == "Cuisine"));
    }

    #[test]
    fn reject_invalid_niveau() {
        let obs = vec![make_obs("Francais", "expert", "Tres fort")];
        let result = validate_observations(&obs, None);
        assert!(matches!(result, Err(ValidationError::InvalidNiveau(ref n)) if n == "expert"));
    }

    #[test]
    fn reject_empty_comment() {
        let obs = vec![make_obs("Francais", "maitrise", "   ")];
        let result = validate_observations(&obs, None);
        assert!(matches!(result, Err(ValidationError::EmptyComment(1))));
    }

    #[test]
    fn reject_comment_too_long() {
        let long_text = "a".repeat(501);
        let obs = vec![make_obs("Francais", "maitrise", &long_text)];
        let result = validate_observations(&obs, None);
        assert!(matches!(
            result,
            Err(ValidationError::CommentTooLong(1, 500, 501))
        ));
    }

    #[test]
    fn trim_whitespace_from_comment() {
        let obs = vec![make_obs("Francais", "maitrise", "  Bon travail  ")];
        let result = validate_observations(&obs, None).unwrap();
        assert_eq!(result[0].observations, "Bon travail");
    }
}
