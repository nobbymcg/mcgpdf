// McGPDF — Electron main process
//
// Responsibilities:
//   * Create the BrowserWindow that hosts index.html
//   * Capture the PDF path from process.argv (Windows "Open with") or from
//     the macOS "open-file" event
//   * Forward the file bytes to the renderer via IPC ("pdf:open")
//   * Reuse the existing window when a second instance is launched (so
//     opening another PDF from Explorer swaps the document instead of
//     spawning a new window)

const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs/promises');

let mainWindow = null;
// File queued before the renderer is ready to receive it.
let pendingFile = null;

// ---------------------------------------------------------------------------
// Single-instance handling so a second launch (e.g. another Explorer "Open
// with") just sends the new PDF to the running window.
// ---------------------------------------------------------------------------
const gotLock = app.requestSingleInstanceLock();
if (!gotLock) {
  app.quit();
} else {
  app.on('second-instance', (_event, argv) => {
    const file = findPdfArg(argv);
    if (file) sendPdfToWindow(file);
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
    }
  });
}

// macOS: file was double-clicked or dropped onto the dock icon.
app.on('open-file', (event, filePath) => {
  event.preventDefault();
  if (app.isReady() && mainWindow) {
    sendPdfToWindow(filePath);
  } else {
    pendingFile = filePath;
  }
});

app.whenReady().then(() => {
  createWindow();

  // The first CLI arg after the executable is typically the PDF path on
  // Windows when launched from Explorer / "Open with".
  const initialFile = pendingFile || findPdfArg(process.argv);
  if (initialFile) {
    pendingFile = initialFile;
  }
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});

// ---------------------------------------------------------------------------
// Window
// ---------------------------------------------------------------------------
function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1100,
    height: 850,
    backgroundColor: '#525659',
    title: 'McGPDF',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });

  // Quality-of-life: no default menu bar (toolbar already provides controls).
  mainWindow.setMenuBarVisibility(false);

  mainWindow.loadFile('index.html');

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// ---------------------------------------------------------------------------
// IPC: renderer tells us it's ready; we then push any queued file.
// ---------------------------------------------------------------------------
ipcMain.handle('pdf:renderer-ready', async () => {
  if (pendingFile) {
    const file = pendingFile;
    pendingFile = null;
    await sendPdfToWindow(file);
  }
});

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

// Pick the first arg in `argv` that looks like a .pdf path on disk. We avoid
// trusting `process.argv[1]` blindly because Electron passes its own flags
// (e.g. --type=...) during dev runs.
function findPdfArg(argv) {
  if (!argv) return null;
  for (const arg of argv) {
    if (typeof arg !== 'string') continue;
    if (arg.startsWith('--')) continue;
    if (arg.toLowerCase().endsWith('.pdf')) {
      return path.resolve(arg);
    }
  }
  return null;
}

async function sendPdfToWindow(filePath) {
  if (!mainWindow) {
    pendingFile = filePath;
    return;
  }
  try {
    const buf = await fs.readFile(filePath);
    // Send a transferable copy so contextIsolation can clone it safely.
    mainWindow.webContents.send('pdf:open', {
      name: path.basename(filePath),
      bytes: buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength),
    });
  } catch (err) {
    console.error('McGPDF: failed to read PDF', filePath, err);
    if (mainWindow) {
      mainWindow.webContents.send('pdf:error', {
        path: filePath,
        message: String(err && err.message || err),
      });
    }
  }
}
