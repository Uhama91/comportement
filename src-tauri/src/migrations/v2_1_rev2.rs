/// Définition des 4 migrations V2.1-rev2 (M009-M012)
/// Event sourcing, synthèses LSU, absences V2, colonnes appreciations_generales.
pub struct V21Migration {
    pub name: &'static str,
    pub statements: &'static [&'static str],
}

pub fn migrations() -> Vec<V21Migration> {
    vec![
        // M009 : Table evenements_pedagogiques (ADR-014 — event sourcing)
        V21Migration {
            name: "m009_create_evenements_pedagogiques",
            statements: &[
                "CREATE TABLE IF NOT EXISTS evenements_pedagogiques (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    uuid TEXT UNIQUE,
                    eleve_id INTEGER NOT NULL REFERENCES students(id) ON DELETE CASCADE,
                    annee_scolaire_id INTEGER NOT NULL REFERENCES annees_scolaires(id),
                    periode_id INTEGER REFERENCES config_periodes(id),
                    type TEXT NOT NULL CHECK(type IN ('observation', 'evaluation', 'motif_sanction')),
                    domaine_id INTEGER REFERENCES domaines_apprentissage(id),
                    lecon TEXT,
                    niveau_lsu TEXT CHECK(niveau_lsu IN ('non_atteints', 'partiellement_atteints', 'atteints', 'depasses')),
                    observations TEXT,
                    texte_dictation TEXT,
                    source TEXT DEFAULT 'manual' CHECK(source IN ('vocal', 'manual')),
                    created_at TEXT DEFAULT (datetime('now')),
                    synced_at TEXT
                )",
                "CREATE INDEX IF NOT EXISTS idx_evt_eleve    ON evenements_pedagogiques(eleve_id)",
                "CREATE INDEX IF NOT EXISTS idx_evt_annee    ON evenements_pedagogiques(annee_scolaire_id)",
                "CREATE INDEX IF NOT EXISTS idx_evt_periode  ON evenements_pedagogiques(periode_id)",
                "CREATE INDEX IF NOT EXISTS idx_evt_type     ON evenements_pedagogiques(type)",
                "CREATE INDEX IF NOT EXISTS idx_evt_domaine  ON evenements_pedagogiques(domaine_id)",
                "CREATE INDEX IF NOT EXISTS idx_evt_uuid     ON evenements_pedagogiques(uuid)",
            ],
        },
        // M010 : Table syntheses_lsu (ADR-015, ADR-017)
        V21Migration {
            name: "m010_create_syntheses_lsu",
            statements: &[
                "CREATE TABLE IF NOT EXISTS syntheses_lsu (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    eleve_id INTEGER NOT NULL REFERENCES students(id) ON DELETE CASCADE,
                    periode_id INTEGER NOT NULL REFERENCES config_periodes(id),
                    domaine_id INTEGER NOT NULL REFERENCES domaines_apprentissage(id),
                    annee_scolaire_id INTEGER NOT NULL REFERENCES annees_scolaires(id),
                    version INTEGER NOT NULL DEFAULT 1,
                    texte TEXT NOT NULL,
                    generated_by TEXT DEFAULT 'manual' CHECK(generated_by IN ('llm', 'manual')),
                    created_at TEXT DEFAULT (datetime('now'))
                )",
                "CREATE INDEX IF NOT EXISTS idx_synth_eleve    ON syntheses_lsu(eleve_id)",
                "CREATE INDEX IF NOT EXISTS idx_synth_periode  ON syntheses_lsu(periode_id)",
                "CREATE INDEX IF NOT EXISTS idx_synth_domaine  ON syntheses_lsu(domaine_id)",
                "CREATE INDEX IF NOT EXISTS idx_synth_version  ON syntheses_lsu(eleve_id, periode_id, domaine_id, version)",
            ],
        },
        // M011 : Table absences_v2 (ADR-019 — registre d'appel)
        V21Migration {
            name: "m011_create_absences_v2",
            statements: &[
                "CREATE TABLE IF NOT EXISTS absences_v2 (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    eleve_id INTEGER NOT NULL REFERENCES students(id) ON DELETE CASCADE,
                    date TEXT NOT NULL,
                    demi_journee TEXT NOT NULL CHECK(demi_journee IN ('matin', 'apres_midi')),
                    type_absence TEXT NOT NULL CHECK(type_absence IN ('justifiee', 'medicale', 'injustifiee')),
                    motif TEXT,
                    retard INTEGER DEFAULT 0,
                    annee_scolaire_id INTEGER NOT NULL REFERENCES annees_scolaires(id),
                    created_at TEXT DEFAULT (datetime('now')),
                    UNIQUE(eleve_id, date, demi_journee)
                )",
                "CREATE INDEX IF NOT EXISTS idx_abs2_eleve  ON absences_v2(eleve_id)",
                "CREATE INDEX IF NOT EXISTS idx_abs2_date   ON absences_v2(date)",
                "CREATE INDEX IF NOT EXISTS idx_abs2_annee  ON absences_v2(annee_scolaire_id)",
                "CREATE INDEX IF NOT EXISTS idx_abs2_type   ON absences_v2(type_absence)",
            ],
        },
        // M012 : ALTER appreciations_generales — ajouter version + generated_by
        V21Migration {
            name: "m012_alter_appreciations_generales_add_version",
            statements: &[
                "ALTER TABLE appreciations_generales ADD COLUMN version INTEGER DEFAULT 1",
                "ALTER TABLE appreciations_generales ADD COLUMN generated_by TEXT DEFAULT 'manual'",
            ],
        },
    ]
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_migrations_rev2_count() {
        assert_eq!(migrations().len(), 4, "Il doit y avoir exactement 4 migrations V2.1-rev2");
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
    fn test_m009_has_event_sourcing_constraints() {
        let migs = migrations();
        let m009 = migs
            .iter()
            .find(|m| m.name == "m009_create_evenements_pedagogiques")
            .unwrap();
        let sql = m009.statements.join(" ");
        assert!(
            sql.contains("CHECK(type IN ('observation', 'evaluation', 'motif_sanction'))"),
            "M009 doit avoir le CHECK constraint sur type"
        );
        assert!(
            sql.contains("CHECK(source IN ('vocal', 'manual'))"),
            "M009 doit avoir le CHECK constraint sur source"
        );
    }
}
