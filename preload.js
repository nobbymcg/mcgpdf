// McGPDF — Electron preload (sandboxed, contextIsolated)
//
// Exposes a tiny window.mcgpdf API to index.html so the renderer can receive
// PDF bytes from the main process without needing Node integration.

const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('mcgpdf', {
  /**
   * Subscribe to "open PDF" events pushed by the main process. The callback
   * is invoked with (bytes: ArrayBuffer, fileName: string).
   */
  onOpenPdf(callback) {
    ipcRenderer.on('pdf:open', (_event, payload) => {
      try {
        callback(payload.bytes, payload.name);
      } catch (err) {
        console.error('mcgpdf onOpenPdf handler threw:', err);
      }
    });
    // Tell main we're ready to receive any queued file.
    ipcRenderer.invoke('pdf:renderer-ready').catch(() => {});
  },

  /**
   * Subscribe to error notifications from the main process (e.g. unreadable
   * file). Optional — falls back to console if not wired up.
   */
  onError(callback) {
    ipcRenderer.on('pdf:error', (_event, payload) => {
      try {
        callback(payload);
      } catch (err) {
        console.error('mcgpdf onError handler threw:', err);
      }
    });
  },
});
