// ===================================
// NOTE-TAKING APP - RENDERER PROCESS
// ===================================

// Store for our notes and state
let currentNotes = [];
let selectedNoteId = null;

// Track original note content for change detection
let originalTitle = '';
let originalContent = '';
let hasChanges = false;

// ===================================
// DATA MANAGEMENT FUNCTIONS
// ===================================

// Load notes when app starts
async function loadNotes() {
    try {
        currentNotes = await window.electronAPI.loadNotes();
        displayNotes();
    } catch (error) {
        console.error('Error loading notes:', error);
    }
}

// Display notes in the sidebar
function displayNotes() {
    const notesList = document.getElementById('notes-list');
    
    // Clear existing content but keep the header
    const header = notesList.querySelector('h3');
    notesList.innerHTML = '';
    notesList.appendChild(header);
    
    // Add each note
    currentNotes.forEach(note => {
        const noteItem = document.createElement('div');
        noteItem.className = 'note-item';
        noteItem.dataset.id = note.id;
        
        // Create note display with title and date
        const noteTitle = document.createElement('div');
        noteTitle.className = 'note-title';
        noteTitle.textContent = note.title;
        
        const noteDate = document.createElement('div');
        noteDate.className = 'note-date';
        const date = new Date(note.createdAt);
        noteDate.textContent = date.toLocaleDateString();
        
        noteItem.appendChild(noteTitle);
        noteItem.appendChild(noteDate);
        
        // Click handler to select note
        noteItem.addEventListener('click', () => selectNote(note.id));
        
        notesList.appendChild(noteItem);
    });
}

// ===================================
// NOTE SELECTION AND EDITING
// ===================================

// Select a note to view/edit
function selectNote(id) {
    selectedNoteId = id;
    const note = currentNotes.find(n => n.id === id);
    
    if (note) {
        const titleInput = document.getElementById('note-title');
        const contentInput = document.getElementById('note-content');
        
        // Store original values for comparison
        originalTitle = note.title;
        originalContent = note.content;
        
        // Set input values
        titleInput.value = originalTitle;
        contentInput.value = originalContent;
        
        // Update visual selection
        document.querySelectorAll('.note-item').forEach(item => {
            item.classList.toggle('selected', item.dataset.id === id);
        });
        
        // No changes initially when loading an existing note
        hasChanges = false;
        
        // Update buttons
        setupEditorButtons();
    }
}

// Function to check if there are unsaved changes
function checkForChanges() {
    const currentTitle = document.getElementById('note-title').value;
    const currentContent = document.getElementById('note-content').value;
    
    // For new notes, enable if there's any title
    if (!selectedNoteId) {
        hasChanges = currentTitle.trim() !== '';
    } else {
        // For existing notes, check if anything changed
        hasChanges = (currentTitle !== originalTitle || currentContent !== originalContent);
    }
    
    // Enable/disable save button
    const saveButton = document.getElementById('save-note');
    if (saveButton) {
        saveButton.disabled = !hasChanges;
    }
}

// ===================================
// BUTTON MANAGEMENT
// ===================================

// Create or update the editor buttons
function setupEditorButtons() {
    // Get container
    let buttonContainer = document.getElementById('note-editor-buttons');
    
    // Clear existing buttons
    buttonContainer.innerHTML = '';
    
    // Create delete button (left side with trash emoji) only when a note is selected
    if (selectedNoteId) {
        const deleteBtn = document.createElement('button');
        deleteBtn.id = 'delete-note';
        deleteBtn.textContent = '🗑️';
        deleteBtn.addEventListener('click', handleDelete);
        buttonContainer.appendChild(deleteBtn);
    }
    
    // Create save button (right aligned)
    const saveBtn = document.createElement('button');
    saveBtn.id = 'save-note';
    saveBtn.textContent = 'Save Note';
    saveBtn.disabled = !hasChanges;
    saveBtn.addEventListener('click', handleSaveNote);
    buttonContainer.appendChild(saveBtn);
}

// ===================================
// EDITOR RESET FUNCTION
// ===================================

// Create a temporary note for display while editing
function createTempNote() {
    const tempNote = {
        id: 'temp-' + Date.now(),
        title: 'Untitled Note',
        content: '',
        createdAt: new Date().toISOString(),
        isTemp: true
    };
    
    // Add to beginning of notes array
    currentNotes.unshift(tempNote);
    displayNotes();
    
    // Select the temp note
    selectedNoteId = tempNote.id;
    
    // Update visual selection
    document.querySelectorAll('.note-item').forEach(item => {
        item.classList.toggle('selected', item.dataset.id === tempNote.id);
    });
}

// Update resetEditor function
function resetEditor() {
    // Get editor and button container
    const noteEditor = document.getElementById('note-editor');
    const buttonContainer = document.getElementById('note-editor-buttons');
    
    // Remove current inputs
    noteEditor.innerHTML = '';
    
    // Create new inputs
    const titleInput = document.createElement('input');
    titleInput.type = 'text';
    titleInput.id = 'note-title';
    titleInput.placeholder = 'Note title...';
    
    const contentInput = document.createElement('textarea');
    contentInput.id = 'note-content';
    contentInput.placeholder = 'Write your note here...';
    
    // Add the new inputs to the editor
    noteEditor.appendChild(titleInput);
    noteEditor.appendChild(contentInput);
    noteEditor.appendChild(buttonContainer);
    
    // Reset variables for new note
    selectedNoteId = null;
    originalTitle = '';
    originalContent = '';
    hasChanges = false;
    
    // Re-add event listeners
    titleInput.addEventListener('input', checkForChanges);
    titleInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            contentInput.focus();
        }
    });
    contentInput.addEventListener('input', checkForChanges);
    
    // Create and show temp note
    createTempNote();
    
    // Update buttons immediately
    setupEditorButtons();
}

// ===================================
// EVENT HANDLERS
// ===================================

// Handle delete - without confirmation dialog
async function handleDelete() {
    if (!selectedNoteId) return;
    
    try {
        // Delete note directly without confirmation
        await window.electronAPI.deleteNote(selectedNoteId);
        
        // Create new inputs instead of trying to modify existing ones
        resetEditor();
        
        // Reload notes separately
        await loadNotes();
        
        // Update the buttons
        setupEditorButtons();
    } catch (error) {
        console.error('Error deleting note:', error);
    }
}

// Handle new note button
document.getElementById('new-note').addEventListener('click', () => {
    console.log('New note clicked');
    
    // Use the reset editor function
    resetEditor();
    
    // Remove selection
    document.querySelectorAll('.note-item').forEach(item => {
        item.classList.remove('selected');
    });
    
    // Update buttons
    setupEditorButtons();
    
    // Focus on title
    setTimeout(() => {
        document.getElementById('note-title').focus();
    }, 10);
});

// Handle save note
// Handle save note
async function handleSaveNote() {
    const titleInput = document.getElementById('note-title');
    const contentInput = document.getElementById('note-content');
    
    const title = titleInput.value;
    const content = contentInput.value;
    
    if (title.trim() === '') {
        alert('Please enter a title for your note');
        titleInput.focus();
        return;
    }
    
    const noteData = { title, content };
    
    try {
        // Check if this is a temp note
        const isTemp = selectedNoteId && selectedNoteId.startsWith('temp-');
        
        if (selectedNoteId && !isTemp) {
            // Update existing note
            noteData.id = selectedNoteId;
            const updatedNote = await window.electronAPI.updateNote(noteData);
            
            // Update the note in our local array
            const index = currentNotes.findIndex(n => n.id === selectedNoteId);
            if (index !== -1) {
                currentNotes[index] = updatedNote;
            }
            
            // Update originals
            originalTitle = title;
            originalContent = content;
            hasChanges = false;
            
            // Refresh the display
            displayNotes();
            selectNote(selectedNoteId);
        } else {
            // Save new note (either temp or completely new)
            const savedNote = await window.electronAPI.saveNote(noteData);
            
            // Remove temp note if it exists
            if (isTemp) {
                currentNotes = currentNotes.filter(n => n.id !== selectedNoteId);
            }
            
            // Reload notes to show the new one
            await loadNotes();
            
            // Select the newly saved note
            selectNote(savedNote.id);
        }
        
        // Update button states
        setupEditorButtons();
        
    } catch (error) {
        console.error('Error saving note:', error);
        alert('Failed to save note.');
    }
}

// ===================================
// INITIALIZATION AND EVENT LISTENERS
// ===================================

// Add input listeners to track changes (these need to be re-added after resetEditor)
function addInputListeners() {
    const titleInput = document.getElementById('note-title');
    const contentInput = document.getElementById('note-content');
    
    if (titleInput && contentInput) {
        // Add input listeners
        titleInput.addEventListener('input', checkForChanges);
        titleInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                contentInput.focus();
            }
        });
        contentInput.addEventListener('input', checkForChanges);
    }
}

// Console logging for debugging
console.log('Note app is running!');
console.log('Platform:', window.electronAPI.platform);

// Initialize app
setTimeout(() => {
    // Add sort change listener
    const sortSelect = document.getElementById('sort-options');
    if (sortSelect) {
        sortSelect.addEventListener('change', () => {
            displayNotes();
        });
    }
    
    // Add initial input listeners
    addInputListeners();
    
    // Load notes when app starts
    loadNotes().then(() => {
        setupEditorButtons();
    });
}, 100);


// Sort notes based on selected option
function sortNotes(notes, sortBy) {
    const sortedNotes = [...notes];
    
    switch (sortBy) {
        case 'date-desc':
            return sortedNotes.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        case 'date-asc':
            return sortedNotes.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
        case 'title-asc':
            return sortedNotes.sort((a, b) => a.title.toLowerCase().localeCompare(b.title.toLowerCase()));
        case 'title-desc':
            return sortedNotes.sort((a, b) => b.title.toLowerCase().localeCompare(a.title.toLowerCase()));
        default:
            return sortedNotes;
    }
}

// Update displayNotes function
function displayNotes() {
    const notesList = document.getElementById('notes-list');
    const sortSelect = document.getElementById('sort-options');
    
    // Clear existing content but keep the header
    const header = notesList.querySelector('.notes-header');
    notesList.innerHTML = '';
    notesList.appendChild(header);
    
    // Get sort preference
    const sortBy = sortSelect ? sortSelect.value : 'date-desc';
    
    // Sort notes (but keep temp notes at top)
    const tempNotes = currentNotes.filter(note => note.isTemp);
    const regularNotes = currentNotes.filter(note => !note.isTemp);
    const sortedRegularNotes = sortNotes(regularNotes, sortBy);
    const allNotes = [...tempNotes, ...sortedRegularNotes];
    
    // Add each note
    allNotes.forEach(note => {
        const noteItem = document.createElement('div');
        noteItem.className = 'note-item';
        if (note.isTemp) noteItem.classList.add('temp-note');
        noteItem.dataset.id = note.id;
        
        // Create note display with title and date
        const noteTitle = document.createElement('div');
        noteTitle.className = 'note-title';
        noteTitle.textContent = note.title;
        
        const noteDate = document.createElement('div');
        noteDate.className = 'note-date';
        const date = new Date(note.createdAt);
        noteDate.textContent = date.toLocaleDateString();
        
        noteItem.appendChild(noteTitle);
        noteItem.appendChild(noteDate);
        
        // Click handler to select note
        noteItem.addEventListener('click', () => selectNote(note.id));
        
        notesList.appendChild(noteItem);
    });
}