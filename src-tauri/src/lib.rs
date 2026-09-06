use serde::Serialize;
use std::fs::{self, OpenOptions};
use std::path::{Path, PathBuf};

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
struct WorkspaceEntry {
    name: String,
    path: String,
    kind: String,
    children: Vec<WorkspaceEntry>,
}

fn is_hidden(path: &Path) -> bool {
    path.file_name()
        .and_then(|name| name.to_str())
        .is_some_and(|name| name.starts_with('.'))
}

fn read_directory(path: &Path) -> Result<Vec<WorkspaceEntry>, String> {
    let mut entries = fs::read_dir(path)
        .map_err(|error| format!("Workspace okunamadı: {error}"))?
        .filter_map(Result::ok)
        .map(|entry| entry.path())
        .filter(|entry| !is_hidden(entry))
        .filter(|entry| {
            entry.is_dir() || entry.extension().is_some_and(|extension| extension == "md")
        })
        .collect::<Vec<PathBuf>>();

    entries.sort_by_key(|entry| {
        (
            !entry.is_dir(),
            entry.file_name().map(|name| name.to_os_string()),
        )
    });

    entries
        .into_iter()
        .map(|entry| {
            let name = entry
                .file_name()
                .and_then(|name| name.to_str())
                .unwrap_or_default()
                .to_string();
            let kind = if entry.is_dir() { "folder" } else { "note" }.to_string();
            let children = if entry.is_dir() {
                read_directory(&entry)?
            } else {
                Vec::new()
            };
            Ok(WorkspaceEntry {
                name,
                path: entry.to_string_lossy().into_owned(),
                kind,
                children,
            })
        })
        .collect()
}

#[tauri::command]
fn read_workspace(path: String) -> Result<WorkspaceEntry, String> {
    let root = PathBuf::from(&path);
    if !root.is_dir() {
        return Err("Seçilen workspace klasör değil.".to_string());
    }
    Ok(WorkspaceEntry {
        name: root
            .file_name()
            .and_then(|name| name.to_str())
            .unwrap_or("Workspace")
            .to_string(),
        path,
        kind: "folder".to_string(),
        children: read_directory(&root)?,
    })
}

#[tauri::command]
fn read_note(path: String) -> Result<String, String> {
    fs::read_to_string(&path).map_err(|error| format!("Not okunamadı: {error}"))
}

#[tauri::command]
fn save_note(path: String, content: String) -> Result<(), String> {
    fs::write(&path, content).map_err(|error| format!("Not kaydedilemedi: {error}"))
}

#[tauri::command]
fn create_directory(path: String) -> Result<(), String> {
    fs::create_dir_all(&path).map_err(|error| format!("Klasör oluşturulamadı: {error}"))
}

#[tauri::command]
fn create_note(path: String) -> Result<(), String> {
    OpenOptions::new()
        .write(true)
        .create_new(true)
        .open(&path)
        .map(|_| ())
        .map_err(|error| format!("Not oluşturulamadı: {error}"))
}

#[tauri::command]
fn rename_item(old_path: String, new_path: String) -> Result<(), String> {
    fs::rename(&old_path, &new_path)
        .map_err(|error| format!("Öğe yeniden adlandırılamadı: {error}"))
}

#[tauri::command]
fn delete_item(path: String) -> Result<(), String> {
    let item = PathBuf::from(&path);
    if !item.exists() {
        return Err("Silinecek öğe bulunamadı.".to_string());
    }
    if item.is_dir() {
        fs::remove_dir_all(&item).map_err(|error| format!("Klasör silinemedi: {error}"))
    } else {
        fs::remove_file(&item).map_err(|error| format!("Not silinemedi: {error}"))
    }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .invoke_handler(tauri::generate_handler![
            read_workspace,
            read_note,
            save_note,
            create_directory,
            create_note,
            rename_item,
            delete_item
        ])
        .run(tauri::generate_context!())
        .expect("error while running Takex");
}
