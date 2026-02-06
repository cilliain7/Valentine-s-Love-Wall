const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const fs = require('fs');
const path = require('path');

// Initialize the Express app
const app = express();

// Use PORT from environment variables (important for Render) or default to 3000
const PORT = process.env.PORT || 3000;

// Path to our database file
const DATA_FILE = path.join(__dirname, 'data', 'notes.json');

// --- Middleware ---
app.use(cors()); // Allow cross-origin requests
app.use(bodyParser.json()); // Parse JSON bodies
app.use(express.static(__dirname)); // Serve the frontend files (index.html, css, etc.)

// --- Helper Functions ---

// Read notes from the JSON file
const readNotes = () => {
    // If file doesn't exist, return empty list
    if (!fs.existsSync(DATA_FILE)) return [];

    const data = fs.readFileSync(DATA_FILE);
    let notes = JSON.parse(data);

    // MIGRATION: Ensure all notes have an ID and 'likes' count
    let changed = false;
    notes = notes.map(note => {
        if (!note.id || typeof note.likes === 'undefined') {
            // Generate a simple unique ID
            note.id = note.id || Date.now().toString(36) + Math.random().toString(36).substr(2);
            note.likes = note.likes || 0;
            changed = true;
        }
        return note;
    });

    if (changed) saveNotes(notes);
    return notes;
};

// Write notes to the JSON file
const saveNotes = (notes) => {
    fs.writeFileSync(DATA_FILE, JSON.stringify(notes, null, 2));
};

// --- API Endpoints ---

// GET /api/notes - Get all messages
app.get('/api/notes', (req, res) => {
    try {
        const notes = readNotes();
        res.json(notes.reverse()); // Show newest first
    } catch (err) {
        res.status(500).json({ error: 'Failed to read notes' });
    }
});

// POST /api/like/:id - Toggle Like (Add or Remove)
app.post('/api/like/:id', (req, res) => {
    try {
        const { id } = req.params;
        const { direction } = req.body; // Expect 1 (like) or -1 (unlike)
        const notes = readNotes();

        const noteIndex = notes.findIndex(n => n.id === id);

        if (noteIndex !== -1) {
            // Default to +1 if not specified
            const change = direction ? parseInt(direction) : 1;

            // Current likes
            let currentLikes = notes[noteIndex].likes || 0;

            // Update and prevent negative likes
            currentLikes += change;
            if (currentLikes < 0) currentLikes = 0;

            notes[noteIndex].likes = currentLikes;

            saveNotes(notes);
            res.json(notes[noteIndex]);
        } else {
            res.status(404).json({ error: 'Note not found' });
        }
    } catch (err) {
        res.status(500).json({ error: 'Failed to like note' });
    }
});

// POST /api/notes - Add a new message
app.post('/api/notes', (req, res) => {
    try {
        const { to, msg, from } = req.body;

        // Validation: Ensure all fields are there
        if (!to || !msg || !from) {
            return res.status(400).json({ error: 'Missing fields' });
        }

        const notes = readNotes();

        // Create new note object
        const newNote = {
            id: Date.now().toString(36) + Math.random().toString(36).substr(2),
            to,
            msg,
            from,
            likes: 0,
            timestamp: new Date().toISOString()
        };

        notes.push(newNote);
        saveNotes(notes);

        // Send back the created note
        res.status(201).json(newNote);
    } catch (err) {
        res.status(500).json({ error: 'Failed to save note' });
    }
});

// Start the server
app.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
});
