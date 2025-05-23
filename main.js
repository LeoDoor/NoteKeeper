const { app, BrowserWindow } = require('electron');
const fs = require('fs').promises;
const path = require('path');
const PREFERENCES_FILE = path.join(app.getPath('userData'), 'preferences.json');

// Path to our JSON file
const NOTES_FILE = path.join(app.getPath('userData'), 'notes.json');

// Ensure the notes file exists
async function ensureNotesFile() {
    try {
        await fs.access(NOTES_FILE);
    } catch {
        // File doesn't exist, create it with empty array
        await fs.writeFile(NOTES_FILE, JSON.stringify([]));
    }
}

// Load notes from file
async function loadNotes() {
    await ensureNotesFile();
    const data = await fs.readFile(NOTES_FILE, 'utf8');
    return JSON.parse(data);
}

// Save notes to file
async function saveNotes(notes) {
    await fs.writeFile(NOTES_FILE, JSON.stringify(notes, null, 2));
}

// Keep a global reference of the window object
let mainWindow;

function createWindow() {
  // Create the browser window
    mainWindow = new BrowserWindow({
    width: 1000,
    height: 1000,
    title: "NoteKeeper", // Add this line
    icon: path.join(__dirname, 'assets', 'icon.png'),
    autoHideMenuBar: true,
    webPreferences: {
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js')
    }
  });

  // Load the index.html file
  mainWindow.loadFile('index.html');

  // Handle window closed
  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// IPC handlers
const { ipcMain } = require('electron');

// Handle save note
ipcMain.handle('save-note', async (event, note) => {
    const notes = await loadNotes();
    
    // Add ID and timestamp to note
    note.id = Date.now().toString();
    note.createdAt = new Date().toISOString();
    
    // Add to notes array
    notes.push(note);
    
    // Save to file
    await saveNotes(notes);
    
    return note; // Return the saved note with ID
});


// Handle load notes
ipcMain.handle('load-notes', async () => {
    return await loadNotes();
});

// Handle delete note
ipcMain.handle('delete-note', async (event, id) => {
    const notes = await loadNotes();
    const filteredNotes = notes.filter(note => note.id !== id);
    await saveNotes(filteredNotes);
    return filteredNotes;
});

// Handle update note
ipcMain.handle('update-note', async (event, updatedNote) => {
    const notes = await loadNotes();
    
    // Find and update the note
    const index = notes.findIndex(note => note.id === updatedNote.id);
    if (index !== -1) {
        // Keep original created date, update modified date
        notes[index] = {
            ...notes[index],
            ...updatedNote,
            modifiedAt: new Date().toISOString()
        };
        await saveNotes(notes);
        return notes[index];
    }
    
    throw new Error('Note not found');
});

// This method will be called when Electron has finished initialization
app.whenReady().then(createWindow);

// Quit when all windows are closed
app.on('window-all-closed', () => {
  // On macOS, it's common for apps to stay open even when all windows are closed
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// On macOS, create a new window when the dock icon is clicked and no windows are open
app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});