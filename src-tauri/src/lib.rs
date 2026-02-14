pub mod vault;

use vault::VaultEntry;

#[tauri::command]
fn list_vault(path: String) -> Result<Vec<VaultEntry>, String> {
    vault::scan_vault(&path)
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .setup(|app| {
            if cfg!(debug_assertions) {
                app.handle().plugin(
                    tauri_plugin_log::Builder::default()
                        .level(log::LevelFilter::Info)
                        .build(),
                )?;
            }
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![list_vault])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
