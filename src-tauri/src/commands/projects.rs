use crate::commands::settings::SettingsState;
use crate::types::ProjectConfig;
use tauri::State;
use tauri_plugin_store::StoreExt;

const STORE_PATH: &str = "settings.json";
const SETTINGS_KEY: &str = "settings";

fn save_settings_internal(
    app: &tauri::AppHandle,
    state: &SettingsState,
) -> Result<(), String> {
    let settings = state.0.lock().map_err(|e| e.to_string())?;
    let store = app.store(STORE_PATH).map_err(|e| e.to_string())?;
    store.set(
        SETTINGS_KEY,
        serde_json::to_value(&*settings).map_err(|e| e.to_string())?,
    );
    store.save().map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub fn get_projects(state: State<SettingsState>) -> Result<Vec<ProjectConfig>, String> {
    let settings = state.0.lock().map_err(|e| e.to_string())?;
    Ok(settings.projects.clone())
}

#[tauri::command]
pub fn add_project(
    app: tauri::AppHandle,
    state: State<SettingsState>,
    project: ProjectConfig,
) -> Result<(), String> {
    {
        let mut settings = state.0.lock().map_err(|e| e.to_string())?;

        // Check if project with same path already exists
        if settings.projects.iter().any(|p| p.repo_path == project.repo_path) {
            return Err("Project with this path already exists".to_string());
        }

        settings.projects.push(project);
    }
    save_settings_internal(&app, &state)
}

#[tauri::command]
pub fn update_project(
    app: tauri::AppHandle,
    state: State<SettingsState>,
    repo_path: String,
    project: ProjectConfig,
) -> Result<(), String> {
    {
        let mut settings = state.0.lock().map_err(|e| e.to_string())?;

        if let Some(idx) = settings.projects.iter().position(|p| p.repo_path == repo_path) {
            settings.projects[idx] = project;
        } else {
            return Err("Project not found".to_string());
        }
    }
    save_settings_internal(&app, &state)
}

#[tauri::command]
pub fn remove_project(
    app: tauri::AppHandle,
    state: State<SettingsState>,
    repo_path: String,
) -> Result<(), String> {
    {
        let mut settings = state.0.lock().map_err(|e| e.to_string())?;
        settings.projects.retain(|p| p.repo_path != repo_path);
    }
    save_settings_internal(&app, &state)
}

#[tauri::command]
pub fn reorder_projects(
    app: tauri::AppHandle,
    state: State<SettingsState>,
    repo_paths: Vec<String>,
) -> Result<(), String> {
    {
        let mut settings = state.0.lock().map_err(|e| e.to_string())?;

        // Create a new ordered list based on repo_paths order
        let mut new_projects = Vec::new();
        for path in &repo_paths {
            if let Some(project) = settings.projects.iter().find(|p| &p.repo_path == path) {
                new_projects.push(project.clone());
            }
        }

        // Add any projects that weren't in the list (shouldn't happen, but just in case)
        for project in &settings.projects {
            if !repo_paths.contains(&project.repo_path) {
                new_projects.push(project.clone());
            }
        }

        settings.projects = new_projects;
    }
    save_settings_internal(&app, &state)
}
