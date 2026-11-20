#![windows_subsystem = "windows"]

use std::{borrow::Cow, env, error::Error, io, path::PathBuf, ptr::null_mut};

use tao::{
    dpi::LogicalSize,
    event::{Event, WindowEvent},
    event_loop::{ControlFlow, EventLoop},
    platform::windows::{IconExtWindows, WindowBuilderExtWindows},
    window::{Icon, WindowBuilder},
};
use windows_sys::Win32::UI::WindowsAndMessaging::{MB_ICONERROR, MessageBoxW};
use wry::{
    NewWindowResponse, WebContext, WebViewBuilder, WebViewBuilderExtWindows,
    http::{Method, Request, Response, StatusCode, response::Builder},
};

include!(concat!(env!("OUT_DIR"), "/assets.rs"));

const WEBVIEW_URL: &str = "blingo://localhost/";

fn main() {
    if let Err(error) = run() {
        let title: Vec<u16> = "Blingo\0".encode_utf16().collect();
        let message: Vec<u16> = format!("Não foi possível abrir o Blingo.\n\n{error}\0")
            .encode_utf16()
            .collect();
        unsafe { MessageBoxW(null_mut(), message.as_ptr(), title.as_ptr(), MB_ICONERROR) };
        std::process::exit(1);
    }
}

fn run() -> Result<(), Box<dyn Error>> {
    wry::webview_version().map_err(|_| {
        io::Error::other("Instale o Microsoft Edge WebView2 Runtime e abra o Blingo novamente.")
    })?;
    let data = env::var_os("LOCALAPPDATA")
        .map(PathBuf::from)
        .ok_or_else(|| io::Error::other("A pasta do seu perfil do Windows está indisponível."))?
        .join("Blingo")
        .join("WebView2");
    let mut profile = WebContext::new(Some(data));

    let events = EventLoop::new();
    let window = WindowBuilder::new()
        .with_title("Blingo")
        .with_inner_size(LogicalSize::new(1280, 800))
        .with_min_inner_size(LogicalSize::new(360, 480))
        .with_window_icon(Icon::from_resource(32512, None).ok())
        .with_taskbar_icon(Icon::from_resource(32512, None).ok())
        .with_visible(false)
        .build(&events)?;

    let webview = WebViewBuilder::new_with_web_context(&mut profile)
        .with_https_scheme(true)
        .with_background_color((248, 250, 245, 255))
        .with_custom_protocol("blingo".into(), |_, request| serve_asset(request))
        .with_navigation_handler(|url| {
            url.starts_with("https://blingo.localhost/") || url == WEBVIEW_URL
        })
        .with_new_window_req_handler(|_, _| NewWindowResponse::Deny)
        .with_hotkeys_zoom(true)
        .with_url(WEBVIEW_URL)
        .build(&window)?;

    window.set_visible(true);
    events.run(move |event, _, control| {
        let _keep_alive = (&window, &webview);
        *control = ControlFlow::Wait;
        if let Event::WindowEvent {
            event: WindowEvent::CloseRequested,
            ..
        } = event
        {
            *control = ControlFlow::Exit;
        }
    });
}

fn serve_asset(request: Request<Vec<u8>>) -> Response<Cow<'static, [u8]>> {
    let uri = request.uri();
    if uri.scheme_str() != Some("blingo") || uri.host() != Some("localhost") {
        return finish_response(response(StatusCode::NOT_FOUND, "text/plain"), b"Not found.");
    }
    if request.method() != Method::GET && request.method() != Method::HEAD {
        return finish_response(
            response(StatusCode::METHOD_NOT_ALLOWED, "text/plain").header("Allow", "GET, HEAD"),
            b"Method not allowed.",
        );
    }

    let path = uri.path().trim_start_matches('/');
    let path = if path.is_empty() { "index.html" } else { path };
    let Some((_, asset)) = ASSETS.iter().find(|(name, _)| *name == path) else {
        return finish_response(response(StatusCode::NOT_FOUND, "text/plain"), b"Not found.");
    };
    let mime = content_type(path);
    let length = asset.len();
    let payload = response(StatusCode::OK, mime)
        .header("Accept-Ranges", "bytes")
        .header("Content-Length", length);

    if request.method() == Method::HEAD {
        return finish_response(payload, b"");
    }
    if let Some(range) = request
        .headers()
        .get("Range")
        .and_then(|value| value.to_str().ok())
    {
        if let Some((start, end)) = byte_range(range, length) {
            return finish_response(
                response(StatusCode::PARTIAL_CONTENT, mime)
                    .header("Accept-Ranges", "bytes")
                    .header("Content-Range", format!("bytes {start}-{end}/{length}"))
                    .header("Content-Length", end - start + 1),
                &asset[start..=end],
            );
        }
        return finish_response(
            response(StatusCode::RANGE_NOT_SATISFIABLE, "text/plain")
                .header("Content-Range", format!("bytes */{length}")),
            b"Requested byte range is unavailable.",
        );
    }
    finish_response(payload, asset)
}

fn byte_range(value: &str, length: usize) -> Option<(usize, usize)> {
    let (first, last) = value.strip_prefix("bytes=")?.split_once('-')?;
    let final_byte = length.checked_sub(1)?;
    let (start, end) = match (first, last) {
        ("", last) => (length.saturating_sub(last.parse().ok()?), final_byte),
        (first, "") => (first.parse().ok()?, final_byte),
        (first, last) => (first.parse().ok()?, final_byte.min(last.parse().ok()?)),
    };
    (start <= end).then_some((start, end))
}

fn response(status: StatusCode, mime: &str) -> Builder {
    Response::builder()
        .status(status)
        .header("Content-Type", mime)
        .header("Cache-Control", "no-store")
        .header("X-Content-Type-Options", "nosniff")
}

fn finish_response(builder: Builder, body: &'static [u8]) -> Response<Cow<'static, [u8]>> {
    builder
        .body(Cow::Borrowed(body))
        .expect("Static response headers are valid.")
}

fn content_type(path: &str) -> &'static str {
    match path.rsplit_once('.').map(|(_, extension)| extension) {
        Some("html") => "text/html; charset=utf-8",
        Some("css") => "text/css; charset=utf-8",
        Some("js" | "mjs") => "text/javascript; charset=utf-8",
        Some("svg") => "image/svg+xml",
        Some("png") => "image/png",
        Some("jpg" | "jpeg") => "image/jpeg",
        Some("webp") => "image/webp",
        Some("ico") => "image/x-icon",
        Some("woff2") => "font/woff2",
        Some("woff") => "font/woff",
        Some("json" | "map") => "application/json",
        Some("webmanifest") => "application/manifest+json",
        Some("mp3") => "audio/mpeg",
        Some("ogg" | "opus") => "audio/ogg",
        Some("wav") => "audio/wav",
        _ => "application/octet-stream",
    }
}
