use std::{
    env, fs,
    path::{Path, PathBuf},
};

fn main() {
    let project = PathBuf::from(env::var_os("CARGO_MANIFEST_DIR").unwrap());
    let web = project.join("../dist");
    println!("cargo:rerun-if-changed={}", web.display());
    println!("cargo:rerun-if-changed=icon.ico");

    assert!(
        web.join("index.html").is_file(),
        "Run the web build before building Blingo for Windows."
    );

    let mut paths = Vec::new();
    collect_files(&web, &mut paths);
    paths.sort_unstable();

    let mut assets = String::from("static ASSETS: &[(&str, &[u8])] = &[\n");
    for path in paths {
        let route = path
            .strip_prefix(&web)
            .unwrap()
            .to_string_lossy()
            .replace('\\', "/");
        let filename = path.into_os_string();
        assets.push_str(&format!("    ({route:?}, include_bytes!({filename:?})),\n"));
    }
    assets.push_str("];\n");
    let output = PathBuf::from(env::var_os("OUT_DIR").unwrap()).join("assets.rs");
    fs::write(output, assets).expect("Could not write the embedded asset index.");

    let version = env!("CARGO_PKG_VERSION");
    let manifest = format!(
        r#"<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<assembly xmlns="urn:schemas-microsoft-com:asm.v1" manifestVersion="1.0">
  <assemblyIdentity type="win32" name="Blingo" version="{version}.0" processorArchitecture="*"/>
  <trustInfo xmlns="urn:schemas-microsoft-com:asm.v3">
    <security><requestedPrivileges><requestedExecutionLevel level="asInvoker" uiAccess="false"/></requestedPrivileges></security>
  </trustInfo>
  <application xmlns="urn:schemas-microsoft-com:asm.v3">
    <windowsSettings>
      <dpiAware xmlns="http://schemas.microsoft.com/SMI/2005/WindowsSettings">true/pm</dpiAware>
      <dpiAwareness xmlns="http://schemas.microsoft.com/SMI/2016/WindowsSettings">PerMonitorV2</dpiAwareness>
    </windowsSettings>
  </application>
</assembly>"#
    );
    let mut resources = tauri_winres::WindowsResource::new();
    resources
        .set("ProductName", "Blingo")
        .set("FileDescription", "Blingo language practice")
        .set("OriginalFilename", "Blingo.exe")
        .set_manifest(&manifest);
    resources.set_icon("icon.ico");
    resources
        .compile()
        .expect("Could not embed the Windows application resources.");
}

fn collect_files(directory: &Path, paths: &mut Vec<PathBuf>) {
    for entry in fs::read_dir(directory).expect("Could not read the web build.") {
        let entry = entry.expect("Could not inspect a web asset.");
        let file_type = entry.file_type().expect("Could not identify a web asset.");
        if file_type.is_dir() {
            collect_files(&entry.path(), paths);
        } else if file_type.is_file() {
            paths.push(entry.path());
        }
    }
}
