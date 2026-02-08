/// Reads clipboard text safely by dispatching to the main thread.
///
/// The `arboard` crate (used by tauri-plugin-clipboard-manager) accesses NSPasteboard
/// from the tokio worker thread that handles the Tauri command. NSPasteboard is NOT
/// thread-safe — concurrent access from a worker thread while the main thread interacts
/// with the pasteboard causes a SIGSEGV (collection mutated during enumeration in
/// `_updateTypeCacheIfNeeded`). This is especially likely after the app has been idle,
/// when the pasteboard's internal type cache is stale and needs updating.
///
/// By using `app.run_on_main_thread()` we ensure NSPasteboard is only accessed from
/// the main thread, which is what Apple requires.
#[tauri::command]
pub async fn read_clipboard_text(app: tauri::AppHandle) -> Result<String, String> {
    let (tx, rx) = tokio::sync::oneshot::channel();

    app.run_on_main_thread(move || {
        let result = arboard::Clipboard::new()
            .and_then(|mut cb| cb.get_text())
            .map_err(|e| e.to_string());
        let _ = tx.send(result);
    })
    .map_err(|e| e.to_string())?;

    rx.await
        .map_err(|_| "Failed to receive clipboard result".to_string())?
}
