use tauri::{
    tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent},
    Manager,
};
use tauri_plugin_autostart::MacosLauncher;
use tauri_plugin_global_shortcut::{GlobalShortcutExt, Shortcut};
use tauri_plugin_single_instance::init as single_instance_init;
use tauri_plugin_sql::{Migration, MigrationKind};

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let migrations = vec![
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
    ];

    tauri::Builder::default()
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

            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
