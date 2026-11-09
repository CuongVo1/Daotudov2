@echo off
cd /d "%~dp0src-tauri"
where cargo >nul 2>nul || (echo Install Rust from https://rustup.rs/ & pause & exit /b 1)
cargo install tauri-cli --version "^2" --locked
if errorlevel 1 (pause & exit /b 1)
cargo tauri build --bundles nsis
echo.
echo Installer folder: src-tauri\target\release\bundle\nsis
pause
