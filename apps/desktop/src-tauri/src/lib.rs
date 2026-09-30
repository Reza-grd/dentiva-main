use tauri::Manager;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        // Hanya satu jendela Dentiva: membuka ikon lagi memunculkan jendela yang sudah ada
        .plugin(tauri_plugin_single_instance::init(|app, _args, _cwd| {
            if let Some(window) = app.get_webview_window("main") {
                let _ = window.unminimize();
                let _ = window.show();
                let _ = window.set_focus();
            }
        }))
        // Tautan eksternal (WhatsApp, booking, email) dibuka di browser sistem
        .plugin(tauri_plugin_opener::init())
        .run(tauri::generate_context!())
        .expect("gagal menjalankan Dentiva");
}
