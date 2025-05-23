const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
    platform: process.platform,
    saveNote: (note) => ipcRenderer.invoke('save-note', note),
    loadNotes: () => ipcRenderer.invoke('load-notes'),
    deleteNote: (id) => ipcRenderer.invoke('delete-note', id),
    updateNote: (note) => ipcRenderer.invoke('update-note', note) // Add this line
});