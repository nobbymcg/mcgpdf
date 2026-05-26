# McGPDF

A lightweight, cross-platform PDF reader built with [Electron](https://www.electronjs.org/) and [PDF.js](https://mozilla.github.io/pdf.js/).

McGPDF is intentionally minimal — open a PDF, scroll through it, search inside it. No telemetry, no accounts, no cloud.

[![Build & Release](https://github.com/nobbymcg/mcgpdf/actions/workflows/release.yml/badge.svg)](https://github.com/nobbymcg/mcgpdf/actions/workflows/release.yml)
[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](#license)

## Features

- 📄 **Continuous scroll** with lazy page rendering
- 🔍 **Find in document** with match highlighting
- 🔗 **Clickable internal & external links**
- 🪶 **Lightweight** — ~100 MB installer, no background services
- 🖱️ **OS file association** — set McGPDF as the default `.pdf` handler
- 🌓 Works offline, no network calls at runtime

## Download

Pre-built installers are published on the [Releases page](https://github.com/nobbymcg/mcgpdf/releases) for each tagged version.

| Platform | Download |
|---|---|
| Windows (x64) | `McGPDF Setup <version>.exe` (NSIS installer) |
| macOS (Apple Silicon) | `McGPDF-<version>-arm64.dmg` |
| macOS (Intel) | `McGPDF-<version>.dmg` |

> **macOS users:** builds are not currently code-signed or notarized. On first launch you may need to right-click the app → **Open** to bypass Gatekeeper.

The latest CI build (from the `main` branch) is also available as a downloadable artifact on the [Actions page](https://github.com/nobbymcg/mcgpdf/actions).

## Usage

- **Open a PDF:** double-click any `.pdf` file (after installing), or launch McGPDF and drag a PDF onto the window.
- **Command-line:** `mcgpdf "path\to\file.pdf"`
- **Search:** `Ctrl+F` / `Cmd+F`
- **Scroll:** mouse wheel, trackpad, or PgUp / PgDn

## Build from source

### Prerequisites

- [Node.js](https://nodejs.org/) 20 or later
- npm 10+
- Git

### Setup

```bash
git clone https://github.com/nobbymcg/mcgpdf.git
cd mcgpdf
npm ci
```

### Run in dev mode

```bash
npm start
```

### Build installers locally

```bash
# Windows installer (run on Windows)
npm run dist:win

# macOS dmg + zip (run on macOS — electron-builder cannot cross-build Mac)
npm run dist:mac
```

Output is written to `dist/`.

## Continuous integration

Every push to `main` triggers a CI matrix build for **Windows** and **macOS (Apple Silicon)** on GitHub-hosted runners. Artifacts are attached to each workflow run.

Pushing a `v*` tag publishes a full GitHub Release with installers for every platform:

```bash
git tag v0.2.0
git push origin v0.2.0
```

See [.github/workflows/release.yml](.github/workflows/release.yml) for the full pipeline.

## Architecture

```
┌─────────────────────────┐
│ main.js (Electron main) │  ── argv / open-file ──┐
│  • single-instance lock │                        │
│  • file system access   │                        ▼
└────────────┬────────────┘             ┌──────────────────────┐
             │ IPC: pdf:open            │ preload.js           │
             │ (ArrayBuffer)            │  contextBridge:      │
             ▼                          │  window.mcgpdf       │
┌─────────────────────────┐             └──────────┬───────────┘
│ index.html (renderer)   │ ◄──────────────────────┘
│  • PDF.js viewer        │
│  • continuous scroll    │
│  • search & links       │
└─────────────────────────┘
```

The renderer runs with `contextIsolation: true`, `sandbox: true`, and `nodeIntegration: false`. File I/O happens only in the main process.

## Tech stack

| Component | Version |
|---|---|
| Electron | 42.x |
| electron-builder | 26.x |
| PDF.js | 3.11.x (cdnjs) |
| Node.js (build) | 20 |

## Contributing

Issues and pull requests are welcome. For substantial changes, please open an issue first to discuss the proposed direction.

## License

[MIT](LICENSE) © Ian McGuire
