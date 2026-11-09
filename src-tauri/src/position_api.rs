//! Direct SCUM Position API v2 test integration. Do not distribute builds with an embedded key.
use super::*;
use std::sync::atomic::Ordering;
const API_BASE: &str = "https://taxi.nihao.io.vn";
const SCUM_DEV_API_KEY: &str = "scum_dev_YpTwCknkS7rpXoNvLbmxIMtue6RTOMMtGUkTFj-MpXo";


fn developer_key() -> Result<String, String> {
    let key = SCUM_DEV_API_KEY.trim();

    if key.is_empty() {
        return Err("SCUM Dev API Key đang trống".to_string());
    }

    Ok(key.to_string())
}
fn client() -> Result<reqwest::Client, String> {
    reqwest::Client::builder().timeout(Duration::from_secs(10)).build().map_err(|e| e.to_string())
}
async fn json_response(resp: reqwest::Response) -> Result<serde_json::Value, String> {
    let status = resp.status();
    let data: serde_json::Value = resp.json().await.map_err(|_| "Phản hồi API không hợp lệ".to_string())?;
    if !status.is_success() {
        let err = data.get("error").or_else(|| data.get("message"))
            .and_then(|v| v.as_str()).unwrap_or("api_error");
        return Err(format!("{} ({})", err, status.as_u16()));
    }
    Ok(data)
}
#[tauri::command]
pub(super) async fn api_request_code(steam_id: String, state: State<'_, Arc<AppState>>) -> Result<String, String> {
    if steam_id.len() != 17 || !steam_id.starts_with("7656119") || !steam_id.bytes().all(|c| c.is_ascii_digit()) {
        return Err("SteamID64 không hợp lệ".into());
    }
    let resp = client()?.post(format!("{API_BASE}/v1/minimap/request-code"))
        .header("X-API-Key", developer_key()?)
        .json(&serde_json::json!({"steamId": steam_id}))
        .send().await.map_err(|e| format!("Không kết nối được API: {e}"))?;
    let data = json_response(resp).await?;
    let request_id = data.get("requestId").and_then(|v| v.as_str())
        .ok_or("API không trả requestId")?.to_string();
    *state.api_session.lock().unwrap() = None;
    Ok(request_id)
}
#[tauri::command]
pub(super) async fn api_verify_code(request_id: String, code: String, state: State<'_, Arc<AppState>>, app: tauri::AppHandle) -> Result<(), String> {
    if request_id.is_empty() || request_id.len() > 512 || code.len() != 6 || !code.bytes().all(|c| c.is_ascii_digit()) {
        return Err("Mã xác minh phải gồm 6 chữ số".into());
    }
    let resp = client()?.post(format!("{API_BASE}/v1/minimap/verify"))
        .header("X-API-Key", developer_key()?)
        .json(&serde_json::json!({"requestId": request_id, "code": code}))
        .send().await.map_err(|e| format!("Không kết nối được API: {e}"))?;
    let data = json_response(resp).await?;
    let token = data.get("accessToken").and_then(|v| v.as_str())
        .filter(|s| !s.is_empty()).ok_or("API không trả accessToken")?.to_string();
    *state.api_session.lock().unwrap() = Some(token.clone());
    *state.live_tracking.lock().unwrap() = false;
    let generation = state.api_generation.fetch_add(1, Ordering::SeqCst) + 1;
    let shared = state.inner().clone();
    thread::spawn(move || poll_positions(shared, app, token, generation));
    Ok(())
}
fn poll_positions(state: Arc<AppState>, app: tauri::AppHandle, token: String, generation: u64) {
    let key = match developer_key() { Ok(k) => k, Err(_) => { let _ = app.emit("api-position-status", "invalid_api_key"); return; } };
    let client = match reqwest::blocking::Client::builder().timeout(Duration::from_secs(8)).build() { Ok(c) => c, Err(_) => return };
    let mut failures = 0u32;
    loop {
        if state.api_generation.load(Ordering::SeqCst) != generation { break; }
        let response = client.get(format!("{API_BASE}/v1/minimap/me"))
            .header("X-API-Key", &key).bearer_auth(&token).send();
        let mut delay_ms = 1100;
        match response {
            Ok(resp) if resp.status().is_success() => {
                if let Ok(data) = resp.json::<serde_json::Value>() {
                    if data.get("online").and_then(|v| v.as_bool()) == Some(false) {
                        let _ = app.emit("api-position-status", "player_offline");
                    } else if let Some(pos) = data.get("position") {
                        if let (Some(x), Some(y), Some(z)) = (pos.get("x").and_then(|v| v.as_f64()), pos.get("y").and_then(|v| v.as_f64()), pos.get("z").and_then(|v| v.as_f64())) {
                            if x.is_finite() && y.is_finite() && z.is_finite() {
                                let record = CoordRecord { time: Utc::now(), x, y, z, pitch: 0.0, yaw: pos.get("yaw").and_then(|v| v.as_f64()).filter(|v| v.is_finite()).unwrap_or(0.0), roll: 0.0 };
                                if state.api_generation.load(Ordering::SeqCst) != generation { break; }
                                *state.current_position.lock().unwrap() = Some(record.clone());
                                let _ = app.emit("coord-update", record.clone());
                                ws_broadcast(serde_json::json!(["coord-update", record]).to_string());
                                let _ = app.emit("api-position-status", "online");
                                failures = 0;
                            }
                        }
                    }
                }
            }
            Ok(resp) if resp.status().as_u16() == 401 => {
                let _ = app.emit("api-position-status", "invalid_access_token");
                if state.api_generation.load(Ordering::SeqCst) == generation { *state.api_session.lock().unwrap() = None; }
                break;
            }
            Ok(resp) if resp.status().as_u16() == 429 => { let _ = app.emit("api-position-status", "rate_limited"); delay_ms = 3000; }
            _ => {
                failures = failures.saturating_add(1);
                let _ = app.emit("api-position-status", "network_error");
                delay_ms = (1100u64.saturating_mul(2u64.pow(failures.min(4)))).min(15000);
            }
        }
        thread::sleep(Duration::from_millis(delay_ms));
    }
}
#[tauri::command]
pub(super) fn api_logout(state: State<'_, Arc<AppState>>) {
    state.api_generation.fetch_add(1, Ordering::SeqCst);
    *state.api_session.lock().unwrap() = None;
    *state.current_position.lock().unwrap() = None;
}
