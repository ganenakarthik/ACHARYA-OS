const { contextBridge, ipcRenderer } = require('electron');

const api = {
  send: (channel, ...args) => {
    try {
      ipcRenderer.send(channel, ...args);
    } catch (e) {
      console.warn('ipc send error:', e);
    }
  },
  invoke: (channel, ...args) => {
    try {
      return ipcRenderer.invoke(channel, ...args);
    } catch (e) {
      console.warn('ipc invoke error:', e);
    }
  },
  on: (channel, func) => {
    try {
      ipcRenderer.on(channel, (event, ...args) => func(...args));
    } catch (e) {
      console.warn('ipc on error:', e);
    }
  },
};

// Safe exposure regardless of contextIsolation setting
try {
  if (process.contextIsolated) {
    contextBridge.exposeInMainWorld('electronAPI', api);
  }
} catch (e) {
  console.warn('contextBridge fallback:', e);
}

try {
  window.electronAPI = api;
} catch (_) {}
