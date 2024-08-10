<div align="center">
   <img width="100" height="100" src="apps/tauri-app/src-tauri/icons/icon.png" />

   <h1>Auto Wallpaper</h1>
   <p>Personalize your desktop with AI-generated wallpapers that adapt to your environment. Auto Wallpaper uses artificial intelligence to create unique wallpapers based on the current weather and time of day, offering a dynamic and visually stunning experience.</p>
</div>

### Download links:

**Windows:**  
   - [.exe installer](https://github.com/auto-wallpaper/auto-wallpaper/releases/latest/download/Auto.Wallpaper_0.2.7_x64-setup.exe) 
   - [.msi installer](https://github.com/auto-wallpaper/auto-wallpaper/releases/latest/download/Auto.Wallpaper_0.2.7_x64_en-US.msi)

**Linux:** 
   - [Debian package](https://github.com/auto-wallpaper/auto-wallpaper/releases/latest/download/auto-wallpaper_0.2.7_amd64.deb) 
   - [AppImage](https://github.com/auto-wallpaper/auto-wallpaper/releases/latest/download/auto-wallpaper_0.2.7_amd64.AppImage)
   
**Mac:** 
   - [.dmg installer](https://github.com/auto-wallpaper/auto-wallpaper/releases/latest/download/Auto.Wallpaper_0.2.7_x64.dmg)

### Screenshots

![prompts page](https://github.com/user-attachments/assets/69cd6e04-9c49-4ce6-93d1-9f7524c4efa9)
![edit prompt form](https://github.com/user-attachments/assets/685efddf-1012-4bfe-9327-a996537a9bf4)
![albums page](https://github.com/user-attachments/assets/5bf1a359-55e8-4a35-b952-fb0109ce59ee)

### Features

- [x] AI-generated wallpapers: Create unique and personalized wallpapers based on your environment.
- [x] Automatic updates: Set wallpapers to change automatically at your desired interval.
- [x] Save wallpapers: Keep your favorite creations for future use.
- [x] High-resolution support: Enjoy stunning visuals with **4K resolution** option.
- [x] Lightweight and free to use: No limitations or hidden costs.
- [x] Launch on startup: Get greeted by a fresh wallpaper whenever you turn on your computer.
- [x] Albums of prompts: save your prompts in different albums and generate them sequentially or randomly
- [x] High-detailed upscale: Upscale your generations to a highly detailed wallpaper (it's gonna hit your eyes, believe me!)
- [ ] Mobile support: Bring the Auto Wallpaper experience to your mobile devices.

Any PR is welcome :)

### Why I made this application?
Honestly, my goal was to take a look at [Tauri](https://tauri.app/) and learn it. So I built this open-source and non-profit project. Any PR is welcome and if you found a bug, i will be so glad if you report it in [issues](https://github.com/auto-wallpaper/auto-wallpaper/issues).

### Development Environment

This project is built using the `created-t3-turbo` template (https://github.com/t3-oss/create-t3-turbo), which utilizes `Turborepo` (https://turbo.build/repo/docs) and focuses on TypeScript. It currently has a single application, `tauri-app`, developed with Tauri (https://v2.tauri.app/). The project is currently undergoing migration from Tauri v1 to v2.

#### Prerequisites:

- **Node.js:** Version 20.10.0 or above
- **pnpm:** Version 9.2.0 or above (other package managers are not supported)
- **Rust and Tauri prerequisites:** Follow the official Tauri documentation: https://v2.tauri.app/start/prerequisites/

#### Getting Started:

1. **Fork and Clone this project.**
2. **Install dependencies:** Navigate to the project's root directory and run `pnpm i`.
3. **Available commands:**
   - `pnpm dev`: Starts the application in development mode.
   - `pnpm build`: Builds the application for local execution.
   - `pnpm add -F tauri-app <package-name>`: Adds a new package to the project.

#### Note for Local Development:

To run the application locally, make sure to disable the updater in `apps/tauri-app/src-tauri/tauri.conf.json`. Remove `plugins.updater`. This is because the updater requires a private key, which is not set for local development environments. If you want to use your own updater signature, refer to the Tauri documentation: https://v2.tauri.app/plugin/updater/#signing-updates

#### Contributions:

We welcome your contributions! Feel free to share your ideas, experiences, and pull requests (PRs) to help improve the project.

### DISCLAIMER
This project is purely for educational purposes and is not intended for commercial gain. It will remain open-source indefinitely.

This application utilizes automated interactions with other web services:
- [leonardo.ai](https://leonardo.ai/) for image generation and upscaling
- [1secmail.com](https://1secmail.com/) for temp emails

We respect the terms of service of these platforms and will readily remove any automation upon request from their owners.

### Contact:

Feel free to contact me at arash382.jb@gmail.com with any questions or concerns.

**Thank you for your understanding!**
