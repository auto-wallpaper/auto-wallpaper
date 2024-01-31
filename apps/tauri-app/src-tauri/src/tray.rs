use tauri::SystemTray;
use tauri::{CustomMenuItem, SystemTrayMenu, SystemTrayMenuItem};

pub fn init_system_tray() -> SystemTray {
    let quit = CustomMenuItem::new("quit".to_string(), "Quit");
    let open_window = CustomMenuItem::new("open".to_string(), "Open Window");

    let tray_menu = SystemTrayMenu::new()
        .add_item(open_window)
        .add_native_item(SystemTrayMenuItem::Separator)
        .add_item(quit);

    let tray = SystemTray::new().with_menu(tray_menu);

    return tray;
}
