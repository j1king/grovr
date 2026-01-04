use tauri::Manager;

#[cfg(target_os = "macos")]
use window_vibrancy::{apply_vibrancy, NSVisualEffectMaterial};

#[cfg(target_os = "windows")]
use window_vibrancy::apply_mica;

#[tauri::command]
fn greet(name: &str) -> String {
    format!("Hello, {}! You've been greeted from Rust!", name)
}

fn setup_window_effects(app: &tauri::App) -> Result<(), Box<dyn std::error::Error>> {
    let window = app.get_webview_window("main").expect("no main window");

    #[cfg(target_os = "macos")]
    {
        // Fallback to vibrancy for older macOS versions
        // Liquid Glass plugin handles macOS 26+ automatically
        let _ = apply_vibrancy(&window, NSVisualEffectMaterial::Sidebar, None, None);
    }

    #[cfg(target_os = "windows")]
    {
        let _ = apply_mica(&window, None);
    }

    Ok(())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_store::Builder::new().build())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_clipboard_manager::init())
        .plugin(tauri_plugin_os::init())
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_liquid_glass::init())
        .setup(|app| {
            setup_window_effects(app)?;
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![greet])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
