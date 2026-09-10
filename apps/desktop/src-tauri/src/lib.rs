use serde::{Deserialize, Serialize};
use std::fs;
use std::path::PathBuf;
use std::process::Command;
use std::time::Duration;

const GITHUB_CLIENT_ID: &str = "Ov23li6SliiHRpeaqbQL";
const GITHUB_SCOPE: &str = "read:user";

#[derive(Debug, Serialize, Deserialize, Clone)]
struct AuthUser {
    login: String,
    avatar_url: Option<String>,
    name: Option<String>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
struct AuthSession {
    #[serde(rename = "accessToken")]
    access_token: String,
    user: AuthUser,
    #[serde(rename = "createdAt")]
    created_at: String,
}

#[derive(Debug, Serialize)]
struct AuthStatus {
    authenticated: bool,
    user: Option<AuthUser>,
}

#[derive(Debug, Serialize)]
struct DevicePollResult {
    #[serde(rename = "authenticated")]
    authenticated: bool,
    pending: bool,
    user: Option<AuthUser>,
    error: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
struct DeviceCodeResponse {
    #[serde(rename = "device_code")]
    device_code: String,
    #[serde(rename = "user_code")]
    user_code: String,
    #[serde(rename = "verification_uri")]
    verification_uri: String,
    #[serde(rename = "expires_in")]
    expires_in: u64,
    interval: Option<u64>,
}

fn auth_file() -> Result<PathBuf, String> {
    let home = dirs::home_dir().ok_or_else(|| "Could not locate the user profile directory.".to_string())?;
    Ok(home.join(".breakguard").join("github-auth.json"))
}

fn read_session() -> Result<Option<AuthSession>, String> {
    let file = auth_file()?;
    if !file.exists() {
        return Ok(None);
    }
    let contents = fs::read_to_string(file).map_err(|error| error.to_string())?;
    serde_json::from_str(&contents)
        .map(Some)
        .map_err(|error| format!("Invalid BreakGuard auth session: {error}"))
}

fn write_session(session: &AuthSession) -> Result<(), String> {
    let file = auth_file()?;
    if let Some(parent) = file.parent() {
        fs::create_dir_all(parent).map_err(|error| error.to_string())?;
    }
    let temporary = file.with_extension(format!("json.{}.tmp", std::process::id()));
    fs::write(&temporary, serde_json::to_vec_pretty(session).map_err(|error| error.to_string())?)
        .map_err(|error| error.to_string())?;
    fs::rename(temporary, file).map_err(|error| error.to_string())
}

fn github_error(payload: &serde_json::Value, status: reqwest::StatusCode) -> String {
    let code = payload.get("error").and_then(|value| value.as_str());
    let description = payload
        .get("error_description")
        .and_then(|value| value.as_str());
    match code {
        Some("device_flow_disabled") => {
            "GitHub Device Flow is disabled for this OAuth App. Enable Device flow in GitHub OAuth App settings.".to_string()
        }
        Some("access_denied") => "GitHub login was denied. Please authorize BreakGuard and try again.".to_string(),
        Some("expired_token") => "The GitHub device code expired. Start login again.".to_string(),
        _ if description.is_some() => description.unwrap_or_default().to_string(),
        Some(code) => format!("GitHub authentication failed ({code})."),
        None => format!("GitHub authentication request failed (HTTP {}).", status.as_u16()),
    }
}

#[tauri::command]
fn github_auth_status() -> Result<AuthStatus, String> {
    let session = read_session()?;
    Ok(AuthStatus {
        authenticated: session.is_some(),
        user: session.map(|value| value.user),
    })
}

#[tauri::command]
fn github_auth_logout() -> Result<(), String> {
    let file = auth_file()?;
    if file.exists() {
        fs::remove_file(file).map_err(|error| error.to_string())?;
    }
    Ok(())
}

#[tauri::command]
async fn github_device_code() -> Result<DeviceCodeResponse, String> {
    let client = reqwest::Client::new();
    let response = client
        .post("https://github.com/login/device/code")
        .timeout(Duration::from_secs(15))
        .header("Accept", "application/json")
        .header("User-Agent", "BreakGuard/1.2.0")
        .form(&[("client_id", GITHUB_CLIENT_ID), ("scope", GITHUB_SCOPE)])
        .send()
        .await
        .map_err(|error| format!("Could not reach GitHub: {error}"))?;
    let status = response.status();
    let payload: serde_json::Value = response
        .json()
        .await
        .map_err(|error| format!("Invalid GitHub device response: {error}"))?;
    if !status.is_success() || payload.get("error").is_some() {
        return Err(github_error(&payload, status));
    }
    serde_json::from_value(payload).map_err(|error| format!("Invalid GitHub device response: {error}"))
}

#[tauri::command(rename_all = "snake_case")]
async fn github_device_poll(device_code: String) -> Result<DevicePollResult, String> {
    let client = reqwest::Client::new();
    let response = client
        .post("https://github.com/login/oauth/access_token")
        .timeout(Duration::from_secs(15))
        .header("Accept", "application/json")
        .header("User-Agent", "BreakGuard/1.2.0")
        .form(&[
            ("client_id", GITHUB_CLIENT_ID),
            ("device_code", device_code.as_str()),
            ("grant_type", "urn:ietf:params:oauth:grant-type:device_code"),
        ])
        .send()
        .await
        .map_err(|error| format!("Could not reach GitHub: {error}"))?;
    let status = response.status();
    let payload: serde_json::Value = response.json().await.map_err(|error| error.to_string())?;

    if let Some(code) = payload.get("error").and_then(|value| value.as_str()) {
        if code == "authorization_pending" || code == "slow_down" {
            return Ok(DevicePollResult {
                authenticated: false,
                pending: true,
                user: None,
                error: None,
            });
        }
        return Ok(DevicePollResult {
            authenticated: false,
            pending: false,
            user: None,
            error: Some(github_error(&payload, status)),
        });
    }

    let token = payload
        .get("access_token")
        .and_then(|value| value.as_str())
        .ok_or_else(|| "GitHub did not return an access token.".to_string())?;
    let profile_response = client
        .get("https://api.github.com/user")
        .timeout(Duration::from_secs(15))
        .header("Accept", "application/vnd.github+json")
        .header("User-Agent", "BreakGuard/1.2.0")
        .bearer_auth(token)
        .send()
        .await
        .map_err(|error| error.to_string())?;
    let profile_status = profile_response.status();
    let profile_payload: serde_json::Value = profile_response.json().await.map_err(|error| error.to_string())?;
    if !profile_status.is_success() || profile_payload.get("login").and_then(|value| value.as_str()).is_none() {
        return Err(format!("Could not verify GitHub login (HTTP {}).", profile_status.as_u16()));
    }
    let profile: AuthUser = serde_json::from_value(profile_payload)
        .map_err(|error| format!("Invalid GitHub user profile: {error}"))?;
    let session = AuthSession {
        access_token: token.to_string(),
        user: profile.clone(),
        created_at: format!(
            "unix:{}",
            std::time::SystemTime::now()
                .duration_since(std::time::UNIX_EPOCH)
                .unwrap_or_default()
                .as_secs()
        ),
    };
    write_session(&session)?;
    Ok(DevicePollResult {
        authenticated: true,
        pending: false,
        user: Some(profile),
        error: None,
    })
}

#[tauri::command]
fn open_github_device_url(url: String) -> Result<(), String> {
    if !url.starts_with("https://github.com/") {
        return Err("Refusing to open an untrusted authentication URL.".to_string());
    }
    let result = if cfg!(target_os = "windows") {
        Command::new("cmd").args(["/C", "start", "", &url]).spawn()
    } else if cfg!(target_os = "macos") {
        Command::new("open").arg(&url).spawn()
    } else {
        Command::new("xdg-open").arg(&url).spawn()
    };
    result.map(|_| ()).map_err(|error| format!("Could not open browser: {error}"))
}

#[tauri::command]
fn greet(name: &str) -> String {
    format!("BreakGuard initialized for, {}!", name)
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .invoke_handler(tauri::generate_handler![
            greet,
            github_auth_status,
            github_auth_logout,
            github_device_code,
            github_device_poll,
            open_github_device_url
        ])
        .run(tauri::generate_context!())
        .expect("error while running BreakGuard desktop application");
}
