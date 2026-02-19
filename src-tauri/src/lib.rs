use tauri::{
    tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent},
    Manager, RunEvent,
};
use tauri_plugin_autostart::MacosLauncher;
use tauri_plugin_global_shortcut::{GlobalShortcutExt, Shortcut};
use tauri_plugin_single_instance::init as single_instance_init;
use tauri_plugin_sql::{Migration, MigrationKind};

mod audio;
mod migrations;
mod models;
mod sidecar;
mod validation;

/// Commande Tauri exposée au frontend pour déclencher les migrations V2.1.
/// Le frontend doit l'appeler après l'ouverture de la DB (Database.open) pour couvrir
/// le cas d'une installation fraîche où la DB n'existait pas au démarrage.
#[tauri::command]
async fn ensure_v2_1_migrations(app: tauri::AppHandle) -> Result<(), String> {
    migrations::run_v2_1_migrations(&app).await
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let migrations = vec![
        // Activate foreign keys enforcement
        Migration {
            version: 0,
            description: "enable_foreign_keys",
            sql: "PRAGMA foreign_keys = ON;",
            kind: MigrationKind::Up,
        },
        Migration {
            version: 1,
            description: "create_students_table",
            sql: "CREATE TABLE IF NOT EXISTS students (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                first_name TEXT NOT NULL,
                warnings INTEGER DEFAULT 0,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            );",
            kind: MigrationKind::Up,
        },
        Migration {
            version: 2,
            description: "create_sanctions_table",
            sql: "CREATE TABLE IF NOT EXISTS sanctions (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                student_id INTEGER NOT NULL,
                reason TEXT,
                week_number INTEGER NOT NULL,
                year INTEGER NOT NULL,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE
            );
            CREATE INDEX IF NOT EXISTS idx_sanctions_student ON sanctions(student_id);
            CREATE INDEX IF NOT EXISTS idx_sanctions_week ON sanctions(week_number, year);",
            kind: MigrationKind::Up,
        },
        Migration {
            version: 3,
            description: "create_daily_rewards_table",
            sql: "CREATE TABLE IF NOT EXISTS daily_rewards (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                student_id INTEGER NOT NULL,
                day_of_week INTEGER NOT NULL CHECK (day_of_week IN (1, 2, 4, 5)),
                week_number INTEGER NOT NULL,
                year INTEGER NOT NULL,
                reward_type TEXT NOT NULL CHECK (reward_type IN ('full', 'partial')),
                cancelled INTEGER DEFAULT 0,
                cancelled_by_sanction_id INTEGER,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
                FOREIGN KEY (cancelled_by_sanction_id) REFERENCES sanctions(id) ON DELETE SET NULL,
                UNIQUE(student_id, day_of_week, week_number, year)
            );
            CREATE INDEX IF NOT EXISTS idx_rewards_student ON daily_rewards(student_id);
            CREATE INDEX IF NOT EXISTS idx_rewards_week ON daily_rewards(week_number, year);",
            kind: MigrationKind::Up,
        },
        Migration {
            version: 4,
            description: "create_absences_table",
            sql: "CREATE TABLE IF NOT EXISTS absences (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                student_id INTEGER NOT NULL,
                date TEXT NOT NULL,
                week_number INTEGER NOT NULL,
                year INTEGER NOT NULL,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
                UNIQUE(student_id, date)
            );
            CREATE INDEX IF NOT EXISTS idx_absences_student ON absences(student_id);
            CREATE INDEX IF NOT EXISTS idx_absences_date ON absences(date);",
            kind: MigrationKind::Up,
        },
        // V2 Migrations
        Migration {
            version: 5,
            description: "create_config_periodes_table",
            sql: "CREATE TABLE IF NOT EXISTS config_periodes (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                annee_scolaire TEXT NOT NULL,
                type_periode TEXT NOT NULL CHECK(type_periode IN ('trimestre', 'semestre')),
                numero INTEGER NOT NULL,
                date_debut DATE NOT NULL,
                date_fin DATE NOT NULL,
                nom_affichage TEXT,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            );
            CREATE INDEX IF NOT EXISTS idx_periodes_annee ON config_periodes(annee_scolaire);
            CREATE INDEX IF NOT EXISTS idx_periodes_dates ON config_periodes(date_debut, date_fin);",
            kind: MigrationKind::Up,
        },
        Migration {
            version: 6,
            description: "create_comportement_detail_table",
            sql: "CREATE TABLE IF NOT EXISTS comportement_detail (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                eleve_id INTEGER NOT NULL REFERENCES students(id) ON DELETE CASCADE,
                date_incident DATE NOT NULL,
                heure_incident TIME,
                periode_id INTEGER REFERENCES config_periodes(id),
                type_evenement TEXT NOT NULL,
                motif TEXT NOT NULL,
                description TEXT,
                intervenant TEXT DEFAULT 'Enseignant',
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            );
            CREATE INDEX IF NOT EXISTS idx_detail_eleve ON comportement_detail(eleve_id);
            CREATE INDEX IF NOT EXISTS idx_detail_periode ON comportement_detail(periode_id);
            CREATE INDEX IF NOT EXISTS idx_detail_date ON comportement_detail(date_incident);
            CREATE INDEX IF NOT EXISTS idx_detail_type ON comportement_detail(type_evenement);",
            kind: MigrationKind::Up,
        },
        Migration {
            version: 7,
            description: "create_domaines_and_appreciations_tables",
            sql: "CREATE TABLE IF NOT EXISTS domaines_apprentissage (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                nom TEXT NOT NULL UNIQUE,
                ordre_affichage INTEGER DEFAULT 0,
                actif INTEGER DEFAULT 1,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            );
            CREATE TABLE IF NOT EXISTS appreciations (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                eleve_id INTEGER NOT NULL REFERENCES students(id) ON DELETE CASCADE,
                periode_id INTEGER NOT NULL REFERENCES config_periodes(id),
                domaine_id INTEGER NOT NULL REFERENCES domaines_apprentissage(id),
                date_evaluation DATE,
                niveau TEXT CHECK(niveau IN ('maitrise', 'en_cours_acquisition', 'debut')),
                observations TEXT,
                texte_dictation TEXT,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            );
            CREATE INDEX IF NOT EXISTS idx_appreciations_eleve ON appreciations(eleve_id);
            CREATE INDEX IF NOT EXISTS idx_appreciations_periode ON appreciations(periode_id);
            CREATE INDEX IF NOT EXISTS idx_appreciations_domaine ON appreciations(domaine_id);
            INSERT OR IGNORE INTO domaines_apprentissage (nom, ordre_affichage) VALUES
                ('Francais', 1),
                ('Mathematiques', 2),
                ('Sciences et Technologies', 3),
                ('Histoire-Geographie', 4),
                ('Enseignement Moral et Civique', 5),
                ('Education Physique et Sportive', 6),
                ('Arts Plastiques', 7),
                ('Education Musicale', 8),
                ('Langues Vivantes', 9);",
            kind: MigrationKind::Up,
        },
        Migration {
            version: 8,
            description: "create_models_status_table",
            sql: "CREATE TABLE IF NOT EXISTS models_status (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                model_name TEXT NOT NULL UNIQUE,
                file_path TEXT NOT NULL,
                file_size INTEGER,
                sha256 TEXT,
                installed_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                version TEXT
            );",
            kind: MigrationKind::Up,
        },
    ];

    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .plugin(single_instance_init(|app, _args, _cwd| {
            // When a second instance tries to launch, show the existing window
            if let Some(window) = app.get_webview_window("main") {
                let _ = window.show();
                let _ = window.set_focus();
            }
        }))
        .plugin(
            tauri_plugin_sql::Builder::default()
                .add_migrations("sqlite:comportement.db", migrations)
                .build(),
        )
        .plugin(tauri_plugin_global_shortcut::Builder::new().build())
        .plugin(tauri_plugin_autostart::init(
            MacosLauncher::LaunchAgent,
            Some(vec!["--minimized"]),
        ))
        .plugin(tauri_plugin_mic_recorder::init())
        .plugin(tauri_plugin_dialog::init())
        .manage(sidecar::SidecarManager::new())
        .invoke_handler(tauri::generate_handler![
            ensure_v2_1_migrations,
            audio::commands::save_wav_file,
            sidecar::commands::start_sidecar,
            sidecar::commands::stop_sidecar,
            sidecar::commands::get_sidecar_status,
            sidecar::commands::get_pipeline_config,
            sidecar::commands::set_pipeline_mode,
            sidecar::transcription::transcribe_audio,
            sidecar::structuration::structure_text,
            validation::validate_and_insert_observations,
            models::checker::check_models_status,
            models::downloader::download_models,
            models::downloader::cancel_download,
            models::installer::install_models_from_folder,
        ])
        .setup(|app| {
            // Logging in debug mode
            if cfg!(debug_assertions) {
                app.handle().plugin(
                    tauri_plugin_log::Builder::default()
                        .level(log::LevelFilter::Info)
                        .build(),
                )?;
            }

            // System tray
            let _tray = TrayIconBuilder::new()
                .icon(app.default_window_icon().unwrap().clone())
                .tooltip("Comportement")
                .on_tray_icon_event(|tray, event| {
                    if let TrayIconEvent::Click {
                        button: MouseButton::Left,
                        button_state: MouseButtonState::Up,
                        ..
                    } = event
                    {
                        let app = tray.app_handle();
                        if let Some(window) = app.get_webview_window("main") {
                            let _ = window.show();
                            let _ = window.set_focus();
                        }
                    }
                })
                .build(app)?;

            // Global shortcut: Ctrl+Shift+C to show window
            let shortcut: Shortcut = "ctrl+shift+c".parse().unwrap();
            let app_handle = app.handle().clone();
            app.global_shortcut().on_shortcut(shortcut, move |_app, _shortcut, _event| {
                if let Some(window) = app_handle.get_webview_window("main") {
                    let _ = window.show();
                    let _ = window.set_focus();
                }
            })?;

            // Migrations V2→V2.1 : lancées en arrière-plan dès le démarrage.
            // Couvre le cas upgrade (DB V2 existante) sans bloquer l'UI.
            // Pour une installation fraîche, le frontend appelle ensure_v2_1_migrations
            // après Database.open() pour couvrir le cas où la DB n'existait pas encore.
            let migration_handle = app.handle().clone();
            tauri::async_runtime::spawn(async move {
                if let Err(e) = migrations::run_v2_1_migrations(&migration_handle).await {
                    eprintln!("[setup] Erreur migrations V2.1 : {}", e);
                }
            });

            Ok(())
        })
        .build(tauri::generate_context!())
        .expect("error while building tauri application")
        .run(|app_handle, event| {
            if let RunEvent::ExitRequested { .. } = event {
                let manager = app_handle.state::<sidecar::SidecarManager>();
                tauri::async_runtime::block_on(manager.stop_all(app_handle));
            }
        });
}
