/// Whitelist of allowed domaines d'apprentissage (matches migration 7 seed data)
pub const ALLOWED_DOMAINES: &[&str] = &[
    "Francais",
    "Mathematiques",
    "Sciences et Technologies",
    "Histoire-Geographie",
    "Enseignement Moral et Civique",
    "Education Physique et Sportive",
    "Arts Plastiques",
    "Education Musicale",
    "Langues Vivantes",
];

/// Whitelist of allowed niveaux d'acquisition (matches CHECK constraint in appreciations table)
pub const ALLOWED_NIVEAUX: &[&str] = &["maitrise", "en_cours_acquisition", "debut"];

/// Maximum length for observation text fields
pub const MAX_TEXT_LENGTH: usize = 500;

/// Maximum number of observations per single API call
pub const MAX_OBSERVATIONS_PER_CALL: usize = 20;
