import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('amoDesktop', {
  platform: process.platform,
  openProject: () => ipcRenderer.invoke('project:open'),
  saveProject: (payload) => ipcRenderer.invoke('project:save', payload),
  onMenuCommand: (listener) => {
    const handler = (_event, command) => listener(command);
    ipcRenderer.on('menu:command', handler);
    return () => ipcRenderer.removeListener('menu:command', handler);
  },
});
