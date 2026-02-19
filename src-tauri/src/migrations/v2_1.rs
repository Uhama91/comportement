/// Définition des 8 migrations V2→V2.1
/// Chaque migration contient un nom et une liste de statements SQL à exécuter séquentiellement.
pub struct V21Migration {
    pub name: &'static str,
    pub statements: &'static [&'static str],
}

pub fn migrations() -> Vec<V21Migration> {
    vec![
        // M001 : Table annees_scolaires (fondation — toutes les données seront scopées par année)
        V21Migration {
            name: "m001_create_annees_scolaires",
            statements: &[
                "CREATE TABLE IF NOT EXISTS annees_scolaires (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    label TEXT NOT NULL,
                    date_debut DATE NOT NULL,
                    date_fin DATE NOT NULL,
                    active INTEGER DEFAULT 0,
                    cloturee INTEGER DEFAULT 0,
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
                )",
                "CREATE INDEX IF NOT EXISTS idx_annees_active ON annees_scolaires(active)",
            ],
        },
        // M002 : Colonnes niveau, annee_scolaire_id, ine sur students
        V21Migration {
            name: "m002_alter_students_add_niveau_annee_ine",
            statements: &[
                "ALTER TABLE students ADD COLUMN niveau TEXT DEFAULT NULL",
                "ALTER TABLE students ADD COLUMN annee_scolaire_id INTEGER DEFAULT NULL REFERENCES annees_scolaires(id)",
                "ALTER TABLE students ADD COLUMN ine TEXT DEFAULT NULL",
                "CREATE INDEX IF NOT EXISTS idx_students_annee ON students(annee_scolaire_id)",
                "CREATE INDEX IF NOT EXISTS idx_students_niveau ON students(niveau)",
            ],
        },
        // M003 : Table référentiel niveaux scolaires (PS→CM2, avec cycle)
        V21Migration {
            name: "m003_create_niveaux_classe",
            statements: &[
                "CREATE TABLE IF NOT EXISTS niveaux_classe (
                    code TEXT PRIMARY KEY,
                    libelle TEXT NOT NULL,
                    cycle INTEGER NOT NULL CHECK(cycle IN (1, 2, 3)),
                    ordre INTEGER NOT NULL
                )",
                "INSERT OR IGNORE INTO niveaux_classe (code, libelle, cycle, ordre) VALUES
                    ('PS',  'Petite Section',        1, 1),
                    ('MS',  'Moyenne Section',       1, 2),
                    ('GS',  'Grande Section',        1, 3),
                    ('CP',  'Cours Préparatoire',    2, 4),
                    ('CE1', 'Cours Élémentaire 1',   2, 5),
                    ('CE2', 'Cours Élémentaire 2',   2, 6),
                    ('CM1', 'Cours Moyen 1',         3, 7),
                    ('CM2', 'Cours Moyen 2',         3, 8)",
            ],
        },
        // M004 : Colonnes niveau_lsu et previous_observations sur appreciations
        //        + data migration 3 niveaux V2 → 4 niveaux LSU officiels
        V21Migration {
            name: "m004_alter_appreciations_add_niveau_lsu_undo",
            statements: &[
                "ALTER TABLE appreciations ADD COLUMN niveau_lsu TEXT DEFAULT NULL",
                "ALTER TABLE appreciations ADD COLUMN previous_observations TEXT DEFAULT NULL",
                // Migration données : anciens niveaux V2 → nouveaux codes LSU
                "UPDATE appreciations SET niveau_lsu = 'non_atteints'         WHERE niveau = 'debut'",
                "UPDATE appreciations SET niveau_lsu = 'partiellement_atteints' WHERE niveau = 'en_cours_acquisition'",
                "UPDATE appreciations SET niveau_lsu = 'depasses'             WHERE niveau = 'maitrise'",
            ],
        },
        // M005 : Colonnes cycle, code_lsu, is_custom sur domaines_apprentissage
        //        + assign cycle 3 aux domaines existants (classe CM2)
        V21Migration {
            name: "m005_alter_domaines_add_cycle_lsu",
            statements: &[
                "ALTER TABLE domaines_apprentissage ADD COLUMN cycle INTEGER DEFAULT NULL",
                "ALTER TABLE domaines_apprentissage ADD COLUMN code_lsu TEXT DEFAULT NULL",
                "ALTER TABLE domaines_apprentissage ADD COLUMN is_custom INTEGER DEFAULT 0",
                // Les domaines V2 existants sont pour CM2 → Cycle 3
                "UPDATE domaines_apprentissage SET cycle = 3, is_custom = 0 WHERE cycle IS NULL",
                "CREATE INDEX IF NOT EXISTS idx_domaines_cycle ON domaines_apprentissage(cycle)",
            ],
        },
        // M006 : Colonne annee_scolaire_id sur config_periodes
        V21Migration {
            name: "m006_alter_config_periodes_add_annee",
            statements: &[
                "ALTER TABLE config_periodes ADD COLUMN annee_scolaire_id INTEGER DEFAULT NULL REFERENCES annees_scolaires(id)",
                "CREATE INDEX IF NOT EXISTS idx_periodes_annee_id ON config_periodes(annee_scolaire_id)",
            ],
        },
        // M007 : Table appréciations générales par élève/période (max 1500 chars)
        V21Migration {
            name: "m007_create_appreciations_generales",
            statements: &[
                "CREATE TABLE IF NOT EXISTS appreciations_generales (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    eleve_id INTEGER NOT NULL REFERENCES students(id) ON DELETE CASCADE,
                    periode_id INTEGER NOT NULL REFERENCES config_periodes(id),
                    annee_scolaire_id INTEGER REFERENCES annees_scolaires(id),
                    texte TEXT NOT NULL CHECK(length(texte) <= 1500),
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    UNIQUE(eleve_id, periode_id)
                )",
                "CREATE INDEX IF NOT EXISTS idx_appgen_eleve    ON appreciations_generales(eleve_id)",
                "CREATE INDEX IF NOT EXISTS idx_appgen_periode   ON appreciations_generales(periode_id)",
                "CREATE INDEX IF NOT EXISTS idx_appgen_annee     ON appreciations_generales(annee_scolaire_id)",
            ],
        },
        // M008 : Tables config LSU (UAI école) et identifiants ONDE (INC/INE par élève)
        V21Migration {
            name: "m008_create_config_lsu_and_identifiants_onde",
            statements: &[
                "CREATE TABLE IF NOT EXISTS config_lsu (
                    id INTEGER PRIMARY KEY DEFAULT 1,
                    uai TEXT DEFAULT NULL,
                    nom_ecole TEXT DEFAULT NULL,
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
                )",
                "CREATE TABLE IF NOT EXISTS identifiants_onde (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    eleve_id INTEGER NOT NULL REFERENCES students(id) ON DELETE CASCADE UNIQUE,
                    inc TEXT DEFAULT NULL,
                    ine TEXT DEFAULT NULL
                )",
                "CREATE INDEX IF NOT EXISTS idx_onde_eleve ON identifiants_onde(eleve_id)",
            ],
        },
    ]
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_migrations_count() {
        assert_eq!(migrations().len(), 8, "Il doit y avoir exactement 8 migrations V2.1");
    }

    #[test]
    fn test_migration_names_unique() {
        let migs = migrations();
        let mut names = std::collections::HashSet::new();
        for m in &migs {
            assert!(names.insert(m.name), "Nom de migration dupliqué: {}", m.name);
        }
    }

    #[test]
    fn test_migration_statements_non_empty() {
        for m in migrations() {
            assert!(
                !m.statements.is_empty(),
                "Migration {} n'a aucun statement",
                m.name
            );
            for s in m.statements {
                assert!(!s.trim().is_empty(), "Statement vide dans {}", m.name);
            }
        }
    }

    #[test]
    fn test_m004_data_migration_statements_present() {
        let migs = migrations();
        let m004 = migs.iter().find(|m| m.name == "m004_alter_appreciations_add_niveau_lsu_undo").unwrap();
        let statements_str = m004.statements.join(" ");
        assert!(statements_str.contains("non_atteints"), "M004 doit migrer 'debut' → 'non_atteints'");
        assert!(statements_str.contains("partiellement_atteints"), "M004 doit migrer 'en_cours_acquisition'");
        assert!(statements_str.contains("depasses"), "M004 doit migrer 'maitrise' → 'depasses'");
    }

    #[test]
    fn test_m001_creates_annees_scolaires_with_cloturee() {
        let migs = migrations();
        let m001 = migs.iter().find(|m| m.name == "m001_create_annees_scolaires").unwrap();
        let sql = m001.statements.join(" ");
        assert!(sql.contains("cloturee"), "M001 doit avoir la colonne cloturee");
        assert!(sql.contains("active"), "M001 doit avoir la colonne active");
    }
}
