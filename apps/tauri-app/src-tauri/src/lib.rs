// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(
    all(not(debug_assertions), target_os = "windows"),
    windows_subsystem = "windows"
)]

mod commands;
mod libs;
mod states;
mod utils;

use std::{
    ops::Add,
    panic::{self, PanicInfo},
};

use crate::{
    libs::prompt_engine::PromptEngine,
    states::{prompt_engine::PromptEngineStore, wallpaper_engine::AppWallpaperEngineStore},
};

use chrono::{DateTime, Datelike, Duration, Utc};
use libs::{
    app_wallpaper_engine::{self, status_manager, using_prompt_manager},
    stores::{
        temp::TempRepository,
        user::{Interval, UserRepository},
    },
};
use log::{error, info, LevelFilter};
use serde_json::json;
use tauri::{
    menu::{MenuBuilder, MenuItemBuilder},
    AppHandle, Manager,
};
use tauri_plugin_aptabase::EventTracker;
use tauri_plugin_autostart::MacosLauncher;
use tauri_plugin_log::{fern::colors::ColoredLevelConfig, RotationStrategy, Target, TargetKind};
use tokio::time::sleep;

const APTABASE_KEY: &str = "A-EU-5389767615";
const SENTRY_DSN: &str = "https://c09db2fc4cffce9266db5d582f232e8f@o4506859582586880.ingest.us.sentry.io/4506859587043328";

fn build_main_window(app: &tauri::AppHandle) {
    match tauri::WebviewWindowBuilder::new(
        app,
        "main", /* the unique window label */
        tauri::WebviewUrl::App("/".parse().unwrap()),
    )
    .fullscreen(false)
    .resizable(true)
    .title("Auto Wallpaper")
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

fn show_window(app: &AppHandle) {
    let windows = app.webview_windows();

    let window = windows.values().next().expect("Sorry, no window found");

    window.show().expect("Can't Bring Window to Show");
    window.set_focus().expect("Can't Bring Window to Focus");
}

fn get_panic_message(info: &PanicInfo) -> String {
    let payload = info.payload();

    if let Some(s) = payload.downcast_ref::<&str>() {
        return s.to_string();
    }

    if let Some(s) = payload.downcast_ref::<String>() {
        return s.to_string();
    }

    format!("{:?}", payload)
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let client = tauri_plugin_sentry::sentry::init((
        SENTRY_DSN,
        tauri_plugin_sentry::sentry::ClientOptions {
            release: tauri_plugin_sentry::sentry::release_name!(),
            ..Default::default()
        },
    ));

    // Everything before here runs in both app and crash reporter processes
    let _guard = tauri_plugin_sentry::minidump::init(&client);

    panic::set_hook(Box::new(|info| {
        let location = info
            .location()
            .map(|loc| format!("{}:{}:{}", loc.file(), loc.line(), loc.column()))
            .unwrap_or_else(|| "".to_string());

        let message = format!("{} ({})", get_panic_message(info), location);

        error!("[panic] {}", message);
    }));

    tauri::Builder::default()
        .plugin(tauri_plugin_process::init())
        .plugin(tauri_plugin_sentry::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_http::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_aptabase::Builder::new(APTABASE_KEY).build())
        .plugin(tauri_plugin_store::Builder::default().build())
        .plugin(tauri_plugin_single_instance::init(|app, _, _| {
            let _ = show_window(app);
        }))
        .plugin(tauri_plugin_autostart::init(
            MacosLauncher::LaunchAgent,
            Some(vec!["--flag1", "--flag2"]),
        ))
        .plugin(
            tauri_plugin_log::Builder::default()
                .targets([
                    Target::new(TargetKind::LogDir {
                        file_name: Some("main".into()),
                    }),
                    Target::new(TargetKind::Stdout),
                    Target::new(TargetKind::Webview),
                ])
                .with_colors(ColoredLevelConfig::default())
                .max_file_size(2 * 1024 /* 2MB */)
                .level(LevelFilter::Info)
                .rotation_strategy(RotationStrategy::KeepAll)
                .build(),
        )
        .setup(|app| {
            let open = MenuItemBuilder::with_id("open", "Open Auto Wallpaper").build(app)?;
            let quit = MenuItemBuilder::with_id("quit", "Quit").build(app)?;
            let menu = MenuBuilder::new(app).items(&[&open, &quit]).build()?;

            let tray = app.tray_by_id("main").unwrap();

            tray.set_menu(Some(menu)).unwrap();
            tray.set_show_menu_on_left_click(false).unwrap();
            tray.on_menu_event(move |app, event| match event.id().as_ref() {
                "open" => {
                    build_main_window(&app);

                    if let Some(webview_window) = app.get_webview_window("main") {
                        let _ = webview_window.show();
                        let _ = webview_window.set_focus();
                    }
                }
                "quit" => {
                    std::process::exit(0);
                }
                _ => (),
            });

            app.manage(PromptEngineStore {
                prompt_engine: PromptEngine::new(app.app_handle()).into(),
            });
            app.manage(status_manager::Store::new(
                status_manager::StatusManager::new(app.app_handle()),
            ));
            app.manage(using_prompt_manager::Store::new(
                using_prompt_manager::UsingPromptManager::new(app.app_handle()),
            ));
            app.manage(AppWallpaperEngineStore::new(app.app_handle()));

            fn interval_to_duration(interval: Interval) -> Duration {
                match interval {
                    Interval::Off => Duration::zero(),
                    Interval::FiveMins => Duration::minutes(5),
                    Interval::TenMins => Duration::minutes(10),
                    Interval::FifteenMins => Duration::minutes(15),
                    Interval::Thirteens => Duration::minutes(30),
                    Interval::OneHour => Duration::hours(1),
                    Interval::TwoHours => Duration::hours(2),
                    Interval::SixHours => Duration::hours(6),
                    Interval::TwelveHours => Duration::hours(12),
                    Interval::OneDay => Duration::days(1),
                }
            }

            let app_handle = app.app_handle().clone();

            tauri::async_runtime::spawn(async move {
                let user_repository = UserRepository::open(&app_handle);

                loop {
                    sleep(Duration::seconds(1).to_std().unwrap()).await;

                    let interval = match user_repository.get_interval() {
                        Ok(v) => v,
                        Err(_) => continue,
                    };

                    if interval == Interval::Off {
                        continue;
                    }

                    let prompts = user_repository
                        .get_prompts_recently_generated_first()
                        .unwrap();

                    let most_recent_generated_prompt = prompts.get(0).unwrap();

                    let latest_generation_timestamp = match most_recent_generated_prompt
                        .generated_at
                        .clone()
                        .and_then(|v| v.parse::<DateTime<Utc>>().ok())
                    {
                        Some(generated_at) => generated_at.timestamp_millis(),
                        None => continue,
                    };

                    if (Utc::now().timestamp_millis()
                        - latest_generation_timestamp
                            .add(interval_to_duration(interval).num_milliseconds()))
                        > 0
                    {
                        let _ = app_wallpaper_engine::handle_result(
                            app_handle
                                .clone()
                                .state::<AppWallpaperEngineStore>()
                                .generate_selected_prompt()
                                .await,
                        );
                    };
                }
            });

            let mut temp_repository = TempRepository::open(app.app_handle());

            let last_active_track_event_day =
                match temp_repository.get_last_active_track_event_day() {
                    Ok(v) => v,
                    Err(_) => 0,
                };

            let now = Utc::now();
            let day = now.day();

            if day != last_active_track_event_day {
                app.track_event(
                    "app_started",
                    Some(json!({
                        "date": format!("{}", now.format("%d/%m/%Y")),
                        "date_time": format!("{}", now.format("%d/%m/%Y %H:%M")),
                        "count": None::<String>
                    })),
                );

                let _ = temp_repository.set_last_active_track_event_day(day);
            };

            #[cfg(desktop)]
            app.handle()
                .plugin(tauri_plugin_updater::Builder::new().build())?;

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            commands::wallpaper_engine::generate_selected_prompt,
            commands::wallpaper_engine::generate_by_prompt_id,
            commands::wallpaper_engine::generate_by_album_id,
            commands::wallpaper_engine::get_using_prompt,
            commands::wallpaper_engine::get_status,
            commands::wallpaper_engine::cancel,
            commands::wallpaper::refresh_wallpaper,
            commands::prompt::generate_prompt,
            commands::prompt::validate_prompt,
        ])
        .build(tauri::generate_context!())
        .expect("error while running tauri application")
        .run(|_app_handle, event| match event {
            tauri::RunEvent::ExitRequested { api, .. } => {
                api.prevent_exit();
            }
            _ => {}
        });
}
