// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(
    all(not(debug_assertions), target_os = "windows"),
    windows_subsystem = "windows"
)]

use log::info;
use log::LevelFilter;
use serde::{Deserialize, Serialize};
use serde_json::json;
use tauri::Manager;
use tauri::SystemTrayEvent;
use tauri_plugin_autostart::MacosLauncher;
use tauri_plugin_log::fern::colors::ColoredLevelConfig;
use tauri_plugin_log::LogTarget;
use wallpaper;
use window_shadows::set_shadow;

#[derive(Clone, serde::Serialize)]
struct SingleInstancePayload {
    args: Vec<String>,
    cwd: String,
}

#[derive(Serialize, Deserialize)]
struct ChangeGenerateWallpaperTrayStatePayload {
    is_generating: bool,
}

#[derive(Serialize, Deserialize)]
struct ChangeWallpaperPayload {
    prompt_id: String,
}

const APTABASE_KEY: &str = "A-EU-5389767615";

mod tray;
mod utils;

#[tauri::command]
fn change_wallpaper(app_handle: tauri::AppHandle, prompt_id: String) {
    let app_data_dir = app_handle.path_resolver().app_data_dir().unwrap();
    let prompt_dir = utils::append_to_path(&app_data_dir, &("/".to_owned() + prompt_id.as_str()));

    let upscale_image_path = utils::append_to_path(&prompt_dir, "/upscale.jpeg");

    if upscale_image_path.exists() {
        wallpaper::set_from_path(upscale_image_path.to_str().unwrap())
            .expect("cannot set wallpaper");
        return;
    }

    let original_image_path = utils::append_to_path(&prompt_dir, "/original.jpeg");

    if original_image_path.exists() {
        wallpaper::set_from_path(original_image_path.to_str().unwrap())
            .expect("cannot set wallpaper");

        return;
    }

    info!("Wallpaper not found");
}

fn build_main_window(app: &tauri::AppHandle) {
    match tauri::WindowBuilder::new(
        app,
        "main", /* the unique window label */
        tauri::WindowUrl::App("/".parse().unwrap()),
    )
    .fullscreen(false)
    .resizable(true)
    .title("AI Wallpaper")
    .decorations(false)
    .min_inner_size(680.0, 700.0)
    .inner_size(950.0, 730.0)
    .transparent(true)
    .build()
    {
        Ok(_) => (),
        Err(e) => {
            info!("Could not build window: {}", e);
        }
    };
}

fn main() {
    tauri::Builder::default()
        .system_tray(tray::init_system_tray())
        .on_system_tray_event(|app, event| match event {
            SystemTrayEvent::LeftClick {
                position: _,
                size: _,
                ..
            } => {
                build_main_window(&app);
                let window = app.get_window("main").unwrap();

                window.show().unwrap();
            }
            SystemTrayEvent::MenuItemClick { id, .. } => match id.as_str() {
                "quit" => {
                    std::process::exit(0);
                }
                "open_window" => {
                    build_main_window(&app);
                    let window = app.get_window("main").unwrap();

                    window.show().unwrap();
                }
                _ => {}
            },
            _ => {}
        })
        .setup(|app| {
            let window = app.get_window("main").unwrap();

            set_shadow(&window, true).expect("Unsupported platform!");

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![change_wallpaper])
        .plugin(
            tauri_plugin_log::Builder::default()
                .targets([LogTarget::Stdout, LogTarget::Webview, LogTarget::LogDir])
                .with_colors(ColoredLevelConfig::default())
                .max_file_size(2 * 1024 /* 2MB */)
                .level(LevelFilter::Info)
                .build(),
        )
        .plugin(
            tauri_plugin_aptabase::Builder::new(APTABASE_KEY)
                .with_panic_hook(Box::new(|client, info| {
                    let location = info
                        .location()
                        .map(|loc| format!("{}:{}:{}", loc.file(), loc.line(), loc.column()))
                        .unwrap_or_else(|| "".to_string());

                    let payload = match info.payload().downcast_ref::<&str>() {
                        Some(p) => p,
                        None => "ERROR PAYLOAD COULD NOT PARSED",
                    };

                    client.track_event(
                        "panic",
                        Some(json!({
                          "info": format!("{} ({})", payload, location),
                        })),
                    );
                }))
                .build(),
        )
        .plugin(tauri_plugin_store::Builder::default().build())
        .plugin(tauri_plugin_autostart::init(
            MacosLauncher::LaunchAgent,
            Some(vec!["--flag1", "--flag2"]),
        ))
        .plugin(tauri_plugin_single_instance::init(|app, argv, cwd| {
            info!("{}, {argv:?}, {cwd}", app.package_info().name);

            app.emit_all("single-instance", SingleInstancePayload { args: argv, cwd })
                .unwrap();

            build_main_window(&app);
            let window = app.get_window("main").unwrap();

            window.show().unwrap();
        }))
        .build(tauri::generate_context!())
        .expect("error while running tauri application")
        .run(|_app_handle, event| match event {
            tauri::RunEvent::ExitRequested { api, .. } => {
                api.prevent_exit();
            }
            _ => {}
        });
}
