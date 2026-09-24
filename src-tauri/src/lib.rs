use serde::{Deserialize, Serialize};
use std::fs::{self, OpenOptions};
use std::path::{Path, PathBuf};
use std::process::Command;
use tauri::Manager;

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

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
struct Slide {
    id: String,
    session_id: String,
    image_path: String,
    order: u32,
    width: u32,
    height: u32,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
struct Annotation {
    id: String,
    #[serde(rename = "slideId")]
    slide_id: String,
    #[serde(rename = "type")]
    annotation_type: String,
    bbox: Bbox,
    #[serde(rename = "targetText", skip_serializing_if = "Option::is_none")]
    target_text: Option<String>,
    color: String,
    note: Option<String>,
    directive: String,
    confidence: Option<f32>,
    #[serde(rename = "createdAt")]
    created_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
struct Bbox { x: f32, y: f32, w: f32, h: f32 }

#[derive(Debug, Clone, Serialize, Deserialize)]
struct AnnotationResult {
    #[serde(rename = "type")]
    annotation_type: String,
    bbox: [f32; 4],
    target_text: Option<String>,
    color: Option<String>,
    note: Option<String>,
    confidence: Option<f32>,
}

fn clamp(value: f32) -> f32 { value.clamp(0.0, 1.0) }

#[tauri::command]
async fn call_ai_annotate(image_base64: String, directive: String, existing_annotations: Vec<Annotation>) -> Result<AnnotationResult, String> {
    let endpoint = std::env::var("TAKEX_AI_ENDPOINT").unwrap_or_else(|_| "http://127.0.0.1:11434/api/chat".to_string());
    let model = std::env::var("TAKEX_AI_MODEL").unwrap_or_else(|_| "qwen2.5vl:3b".to_string());
    let existing = serde_json::to_string(&existing_annotations).map_err(|error| error.to_string())?;
    let system = format!("Slayt görselini analiz et. Kullanıcı direktifindeki kavramın yaklaşık konumunu bul. Mevcut anotasyonları tekrar işaretleme: {existing}. Yalnızca şu JSON şemasında cevap ver: {{\"type\":\"highlight|underline|circle|note|arrow\",\"bbox\":[x,y,w,h],\"target_text\":\"...\",\"color\":\"#fbbf24\",\"note\":\"...\",\"confidence\":0.0}}. bbox değerleri 0-1 aralığında olmalı; JSON dışında hiçbir metin üretme.");
    let response = reqwest::Client::new().post(endpoint).json(&serde_json::json!({
        "model": model,
        "temperature": 0,
        "format": "json",
        "stream": false,
        "messages": [
            { "role": "system", "content": system },
            { "role": "user", "content": directive, "images": [image_base64] }
        ]
    })).send().await.map_err(|error| format!("AI isteği başarısız: {error}"))?;
    let status = response.status();
    let body: serde_json::Value = response.json().await.map_err(|error| format!("AI yanıtı okunamadı: {error}"))?;
    if !status.is_success() {
        let provider_message = body["error"].as_str().unwrap_or("Ollama sağlayıcısı ayrıntı vermedi.");
        return Err(format!("Ollama isteği başarısız oldu ({status}): {provider_message}"));
    }
    let content = body["message"]["content"].as_str().ok_or("Ollama geçerli bir JSON yanıtı döndürmedi.")?;
    let mut result: AnnotationResult = serde_json::from_str(content).map_err(|error| format!("AI çıktısı beklenen şemada değil: {error}"))?;
    if !matches!(result.annotation_type.as_str(), "highlight" | "underline" | "circle" | "note" | "arrow") { return Err("AI geçersiz anotasyon türü döndürdü.".to_string()); }
    result.bbox = result.bbox.map(clamp);
    result.confidence = result.confidence.map(clamp);
    Ok(result)
}

fn slide_root(app: &tauri::AppHandle) -> Result<PathBuf, String> {
    app.path().app_data_dir().map(|path| path.join("slides")).map_err(|error| format!("Slayt klasörü bulunamadı: {error}"))
}

fn image_dimensions(bytes: &[u8]) -> (u32, u32) {
    if bytes.starts_with(b"\x89PNG\r\n\x1a\n") && bytes.len() >= 24 {
        return (u32::from_be_bytes([bytes[16], bytes[17], bytes[18], bytes[19]]), u32::from_be_bytes([bytes[20], bytes[21], bytes[22], bytes[23]]));
    }
    if bytes.starts_with(b"GIF") && bytes.len() >= 10 {
        return (u16::from_le_bytes([bytes[6], bytes[7]]) as u32, u16::from_le_bytes([bytes[8], bytes[9]]) as u32);
    }
    (16, 9)
}

#[tauri::command]
fn import_slide_image(app: tauri::AppHandle, path: String) -> Result<Slide, String> {
    let source = PathBuf::from(&path);
    if !source.is_file() { return Err("Seçilen slayt görseli bulunamadı.".to_string()); }
    let id = uuid::Uuid::new_v4().to_string();
    let directory = slide_root(&app)?.join(&id);
    fs::create_dir_all(&directory).map_err(|error| format!("Slayt klasörü oluşturulamadı: {error}"))?;
    let extension = source.extension().and_then(|value| value.to_str()).unwrap_or("png");
    let destination = directory.join(format!("image.{extension}"));
    fs::copy(&source, &destination).map_err(|error| format!("Slayt kopyalanamadı: {error}"))?;
    let (width, height) = image_dimensions(&fs::read(&destination).map_err(|error| error.to_string())?);
    Ok(Slide { id, session_id: "default".to_string(), image_path: destination.to_string_lossy().into_owned(), order: 0, width, height })
}

fn import_slide_pdf_sync(app: tauri::AppHandle, path: String) -> Result<Vec<Slide>, String> {
    let source = PathBuf::from(&path);
    if !source.is_file() { return Err("Seçilen PDF bulunamadı.".to_string()); }
    let session_id = uuid::Uuid::new_v4().to_string();
    let render_directory = slide_root(&app)?.join(format!("pdf-{session_id}"));
    fs::create_dir_all(&render_directory).map_err(|error| format!("PDF klasörü oluşturulamadı: {error}"))?;
    fs::copy(&source, render_directory.join("source.pdf")).map_err(|error| format!("PDF kopyalanamadı: {error}"))?;
    let prefix = render_directory.join("page");
    let output = Command::new("pdftoppm")
        .args(["-png", "-r", "144"])
        .arg(&source)
        .arg(&prefix)
        .output()
        .map_err(|error| format!("PDF dönüştürücü çalıştırılamadı: {error}. Linux'ta poppler-utils kurulu olmalı."))?;
    if !output.status.success() {
        return Err(format!("PDF sayfaları dönüştürülemedi: {}", String::from_utf8_lossy(&output.stderr).trim()));
    }
    let mut pages = fs::read_dir(&render_directory)
        .map_err(|error| format!("PDF sayfaları okunamadı: {error}"))?
        .filter_map(Result::ok)
        .map(|entry| entry.path())
        .filter(|page| page.extension().is_some_and(|extension| extension == "png"))
        .collect::<Vec<PathBuf>>();
    pages.sort_by_key(|page| page.file_stem().and_then(|stem| stem.to_str()).and_then(|stem| stem.rsplit('-').next()).and_then(|number| number.parse::<u32>().ok()).unwrap_or(0));
    if pages.is_empty() { return Err("PDF içinde dönüştürülebilir sayfa bulunamadı.".to_string()); }

    pages.into_iter().enumerate().map(|(order, page)| {
        let id = uuid::Uuid::new_v4().to_string();
        let directory = slide_root(&app)?.join(&id);
        fs::create_dir_all(&directory).map_err(|error| format!("PDF slayt klasörü oluşturulamadı: {error}"))?;
        let destination = directory.join("image.png");
        fs::rename(&page, &destination).map_err(|error| format!("PDF sayfası kaydedilemedi: {error}"))?;
        let (width, height) = image_dimensions(&fs::read(&destination).map_err(|error| error.to_string())?);
        Ok(Slide { id, session_id: session_id.clone(), image_path: destination.to_string_lossy().into_owned(), order: order as u32, width, height })
    }).collect()
}

#[tauri::command]
async fn import_slide_pdf(app: tauri::AppHandle, path: String) -> Result<Vec<Slide>, String> {
    tauri::async_runtime::spawn_blocking(move || import_slide_pdf_sync(app, path))
        .await
        .map_err(|error| format!("PDF dönüşümü sonlandırıldı: {error}"))?
}

fn annotation_path(app: &tauri::AppHandle, slide_id: &str) -> Result<PathBuf, String> { Ok(slide_root(app)?.join(slide_id).join("annotations.json")) }

#[tauri::command]
fn load_annotations(app: tauri::AppHandle, slide_id: String) -> Result<Vec<Annotation>, String> {
    let path = annotation_path(&app, &slide_id)?;
    if !path.exists() { return Ok(Vec::new()); }
    serde_json::from_str(&fs::read_to_string(path).map_err(|error| format!("Anotasyonlar okunamadı: {error}"))?).map_err(|error| format!("Anotasyonlar geçersiz: {error}"))
}

#[tauri::command]
fn save_annotations(app: tauri::AppHandle, slide_id: String, annotations: Vec<Annotation>) -> Result<(), String> {
    let path = annotation_path(&app, &slide_id)?;
    if !path.parent().is_some_and(Path::exists) { fs::create_dir_all(path.parent().ok_or("Anotasyon klasörü bulunamadı.")?).map_err(|error| error.to_string())?; }
    fs::write(path, serde_json::to_string_pretty(&annotations).map_err(|error| error.to_string())?).map_err(|error| format!("Anotasyonlar kaydedilemedi: {error}"))
}

fn chats_path(workspace_path: &str) -> PathBuf {
    PathBuf::from(workspace_path).join(".takex").join("chats.json")
}

#[tauri::command]
fn load_chats(workspace_path: String) -> Result<String, String> {
    let path = chats_path(&workspace_path);
    if !path.exists() {
        return Ok("[]".to_string());
    }
    fs::read_to_string(path).map_err(|error| format!("Sohbet geçmişi okunamadı: {error}"))
}

#[tauri::command]
fn save_chats(workspace_path: String, chats: String) -> Result<(), String> {
    let directory = PathBuf::from(workspace_path).join(".takex");
    fs::create_dir_all(&directory).map_err(|error| format!("Sohbet klasörü oluşturulamadı: {error}"))?;
    let parsed: serde_json::Value = serde_json::from_str(&chats)
        .map_err(|error| format!("Sohbet geçmişi geçersiz: {error}"))?;
    let formatted = serde_json::to_string_pretty(&parsed)
        .map_err(|error| format!("Sohbet geçmişi hazırlanamadı: {error}"))?;
    fs::write(directory.join("chats.json"), formatted)
        .map_err(|error| format!("Sohbet geçmişi kaydedilemedi: {error}"))
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
            delete_item,
            load_chats,
            save_chats,
            import_slide_image,
            load_annotations,
            save_annotations,
            import_slide_pdf,
            call_ai_annotate
        ])
        .run(tauri::generate_context!())
        .expect("error while running Takex");
}
