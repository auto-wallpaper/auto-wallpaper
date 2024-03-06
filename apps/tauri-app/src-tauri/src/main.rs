// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(
    all(not(debug_assertions), target_os = "windows"),
    windows_subsystem = "windows"
)]

mod commands;
mod libs;
mod states;
mod tray;
mod utils;

use std::{
    ops::Add,
    panic::{self, PanicInfo},
};

use crate::{
    libs::{
        prompt_engine::PromptEngine,
        store::StoreManager,
        wallpaper_engine::{
            managers::{
                status::WallpaperEngineStatusManager,
                using_prompt::WallpaperEngineUsingPromptManager,
            },
            WallpaperEngine,
        },
    },
    states::{
        prompt_engine::PromptEngineStore,
        wallpaper_engine::{
            WallpaperEngineStatusStore, WallpaperEngineStore, WallpaperEngineUsingPromptStore,
        },
    },
};

use chrono::{DateTime, Datelike, Duration, Utc};
use log::{error, info, LevelFilter};
use serde::Deserialize;
use serde_json::json;
use tauri::{Manager, SystemTrayEvent};
use tauri_plugin_aptabase::EventTracker;
use tauri_plugin_autostart::MacosLauncher;
use tauri_plugin_log::{fern::colors::ColoredLevelConfig, LogTarget};
use tokio::time::sleep;
use window_shadows::set_shadow;

const APTABASE_KEY: &str = "A-EU-5389767615";
const SENTRY_DSN: &str = "https://c09db2fc4cffce9266db5d582f232e8f@o4506859582586880.ingest.us.sentry.io/4506859587043328";

fn build_main_window(app: &tauri::AppHandle) {
    match tauri::WindowBuilder::new(
        app,
        "main", /* the unique window label */
        tauri::WindowUrl::App("/".parse().unwrap()),
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

fn main() {
    let _client = sentry_tauri::sentry::init((
        SENTRY_DSN,
        sentry_tauri::sentry::ClientOptions {
            release: sentry_tauri::sentry::release_name!(),
            ..Default::default()
        },
    ));

    panic::set_hook(Box::new(|info| {
        let location = info
            .location()
            .map(|loc| format!("{}:{}:{}", loc.file(), loc.line(), loc.column()))
            .unwrap_or_else(|| "".to_string());

        let message = format!("{} ({})", get_panic_message(info), location);

        error!("[panic] {}", message);
    }));

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

            if let Err(_) = set_shadow(&window, true) {
                info!("Shadow is not supported for this platform");
            }

            app.manage(PromptEngineStore {
                prompt_engine: PromptEngine::new(app.app_handle()).into(),
            });
            app.manage(WallpaperEngineStatusStore {
                status: WallpaperEngineStatusManager::new(app.app_handle()).into(),
            });
            app.manage(WallpaperEngineUsingPromptStore {
                using_prompt: WallpaperEngineUsingPromptManager::new(app.app_handle()).into(),
            });
            app.manage(WallpaperEngineStore {
                wallpaper_engine: WallpaperEngine::new(app.app_handle()).into(),
            });

            #[derive(Debug, Deserialize, PartialEq)]
            #[serde(rename_all = "SCREAMING_SNAKE_CASE")]
            enum Intervals {
                Off,
                FiveMins,
                TenMins,
                FifteenMins,
                Thirteens,
                OneHour,
                TwoHours,
                SixHours,
                TwelveHours,
                OneDay,
            }

            fn interval_to_duration(interval: Intervals) -> Duration {
                match interval {
                    Intervals::Off => Duration::zero(),
                    Intervals::FiveMins => Duration::minutes(5),
                    Intervals::TenMins => Duration::minutes(10),
                    Intervals::FifteenMins => Duration::minutes(15),
                    Intervals::Thirteens => Duration::minutes(30),
                    Intervals::OneHour => Duration::hours(1),
                    Intervals::TwoHours => Duration::hours(2),
                    Intervals::SixHours => Duration::hours(6),
                    Intervals::TwelveHours => Duration::hours(12),
                    Intervals::OneDay => Duration::days(1),
                }
            }

            let app_handle = app.app_handle();

            tauri::async_runtime::spawn(async move {
                let temp_store = StoreManager::make_temp_store(app_handle.clone());
                let user_store = StoreManager::make_user_store(app_handle.clone());

                loop {
                    sleep(Duration::seconds(1).to_std().unwrap()).await;

                    let interval = match user_store.get::<Intervals>("interval") {
                        Ok(v) => match v {
                            Some(v) => v,
                            None => continue,
                        },
                        Err(_) => continue,
                    };

                    if interval == Intervals::Off {
                        continue;
                    }

                    let last_generation_timestamp =
                        match temp_store.get::<String>("lastGenerationTimestamp") {
                            Ok(v) => match v {
                                Some(v) => v,
                                None => continue,
                            },
                            Err(_) => continue,
                        };

                    let last_generation_date =
                        match last_generation_timestamp.parse::<DateTime<Utc>>() {
                            Ok(v) => v,
                            Err(_) => continue,
                        };

                    if (Utc::now().timestamp_millis()
                        - last_generation_date
                            .timestamp_millis()
                            .add(interval_to_duration(interval).num_milliseconds()))
                        > 0
                    {
                        match app_handle
                            .state::<WallpaperEngineStore>()
                            .wallpaper_engine
                            .lock()
                            .await
                            .generate_selected_prompt()
                            .await
                        {
                            Ok(_) => {
                                info!("mission completed!");
                            }
                            Err(e) => {
                                error!("Error: {:?}", e);
                            }
                        }
                    };
                }
            });

            let mut temp_store = StoreManager::make_temp_store(app.app_handle());

            let last_active_track_event_day = match temp_store.get::<u32>("lastActiveTrackEventDay")
            {
                Ok(v) => match v {
                    Some(v) => v,
                    None => 0,
                },
                Err(_) => 0,
            };

            let now = Utc::now();
            let day = now.day();

            if day > last_active_track_event_day {
                app.track_event(
                    "app_started",
                    Some(json!({
                        "date": format!("{}", now.format("%d/%m/%Y")),
                        "date_time": format!("{}", now.format("%d/%m/%Y %H:%M")),
                        "count": None::<String>
                    })),
                );

                temp_store
                    .set("lastActiveTrackEventDay", day.into())
                    .unwrap();
            };

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            commands::wallpaper_engine::generate_selected_prompt,
            commands::wallpaper_engine::generate_by_prompt_id,
            commands::wallpaper_engine::get_using_prompt,
            commands::wallpaper_engine::get_status,
            commands::wallpaper_engine::cancel,
            commands::wallpaper::refresh_wallpaper,
            commands::prompt::generate_prompt,
            commands::prompt::validate_prompt,
        ])
        .plugin(sentry_tauri::plugin())
        .plugin(
            tauri_plugin_log::Builder::default()
                .targets([LogTarget::Stdout, LogTarget::Webview, LogTarget::LogDir])
                .with_colors(ColoredLevelConfig::default())
                .max_file_size(2 * 1024 /* 2MB */)
                .level(LevelFilter::Info)
                .build(),
        )
        .plugin(tauri_plugin_aptabase::Builder::new(APTABASE_KEY).build())
        .plugin(tauri_plugin_store::Builder::default().build())
        .plugin(tauri_plugin_autostart::init(
            MacosLauncher::LaunchAgent,
            Some(vec!["--flag1", "--flag2"]),
        ))
        .plugin(tauri_plugin_single_instance::init(|app, argv, cwd| {
            #[derive(Clone, serde::Serialize)]
            struct SingleInstancePayload {
                args: Vec<String>,
                cwd: String,
            }

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
