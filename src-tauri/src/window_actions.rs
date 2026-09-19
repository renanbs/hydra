use tauri::{AppHandle, Manager};

#[tauri::command]
pub fn window_minimize(app: AppHandle) -> Result<(), String> {
    println!("[Hydra] minimize clicked");
    if let Some(window) = app.get_webview_window("main") {
        window.minimize().map_err(|e| {
            eprintln!("[Hydra] minimize error: {e}");
            e.to_string()
        })
    } else {
        eprintln!("[Hydra] window 'main' not found");
        Err("Window not found".to_string())
    }
}

#[tauri::command]
pub fn window_toggle_maximize(app: AppHandle) -> Result<(), String> {
    println!("[Hydra] toggle_maximize clicked");
    if let Some(window) = app.get_webview_window("main") {
        let is_max = window.is_maximized().unwrap_or(false);
        if is_max {
            window.unmaximize().map_err(|e| e.to_string())
        } else {
            window.maximize().map_err(|e| e.to_string())
        }
    } else {
        Err("Window not found".to_string())
    }
}

#[tauri::command]
pub fn window_close(app: AppHandle) -> Result<(), String> {
    println!("[Hydra] close clicked");
    if let Some(window) = app.get_webview_window("main") {
        window.close().map_err(|e| e.to_string())
    } else {
        Err("Window not found".to_string())
    }
}

#[tauri::command]
pub fn window_start_dragging(app: AppHandle) -> Result<(), String> {
    if let Some(window) = app.get_webview_window("main") {
        let _ = window.start_dragging();
        Ok(())
    } else {
        Err("Window not found".to_string())
    }
}
