// Configuration: Point to our backend
const API_URL = '/api/notes';

// Wait for the page to load before running scripts
document.addEventListener('DOMContentLoaded', () => {
    loadNotes();
    setupFloatingHearts();
    setupForm();
});

/*
 * Fetches notes from the server and displays them.
 */
async function loadNotes() {
    try {
        // GET request to our API
        const response = await fetch(API_URL);
        const notes = await response.json();

        const grid = document.getElementById('wall-grid');
        grid.innerHTML = ''; // Start clean

        // Loop through each note and add to screen
        notes.forEach(note => {
            addCardToGrid(note, grid);
        });
    } catch (err) {
        console.error('Failed to load notes:', err);
    }
}

/*
 * Creates the HTML for a single note card
 */
function addCardToGrid(note, gridContainer) {
    const card = document.createElement('div');
    card.className = 'love-card';

    // Default likes to 0 if undefined
    const likes = note.likes || 0;

    // Check if *this user* has already liked this note
    let likedNotes = [];
    try {
        likedNotes = JSON.parse(localStorage.getItem('liked_notes') || '[]');
    } catch (e) { likedNotes = []; }

    const isLiked = likedNotes.includes(note.id);
    const btnClass = isLiked ? 'like-btn liked' : 'like-btn';

    // Inject data safely, including the Like button
    card.innerHTML = `
        <div class="card-to">To: ${cleanInput(note.to)}</div>
        <div class="card-msg">"${cleanInput(note.msg)}"</div>
        <div class="card-from">- ${cleanInput(note.from)}</div>
        <div class="card-actions">
            <button class="${btnClass}" onclick="toggleLike('${note.id}', this)">
                ❤ <span class="like-count">${likes}</span>
            </button>
        </div>
    `;

    gridContainer.appendChild(card);
}

/*
 * Like Feature Logic
 * Calls the API to increment likes
 */
window.toggleLike = async function (id, btnElement) {
    // Check current state from LocalStorage to prevent spam execution
    let likedNotes = [];
    try {
        likedNotes = JSON.parse(localStorage.getItem('liked_notes') || '[]');
    } catch (e) {
        likedNotes = [];
    }

    const isLiked = likedNotes.includes(id);

    // Determine direction: If liked, we -1 (unlike). If not, we +1 (like).
    const direction = isLiked ? -1 : 1;

    try {
        const response = await fetch(`/api/like/${id}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ direction })
        });

        if (response.ok) {
            const updatedNote = await response.json();

            // Update the count in the UI
            const countSpan = btnElement.querySelector('.like-count');
            countSpan.textContent = updatedNote.likes;

            // Update Visuals and LocalStorage
            if (direction === 1) {
                // Was not liked, now Liked
                btnElement.classList.add('liked');
                likedNotes.push(id);
            } else {
                // Was liked, now Unliked
                btnElement.classList.remove('liked');
                likedNotes = likedNotes.filter(noteId => noteId !== id);
            }

            localStorage.setItem('liked_notes', JSON.stringify(likedNotes));
        }
    } catch (err) {
        console.error('Failed to toggle like:', err);
    }
}

/*
 * Modal Interactions
 * Handles opening/closing the "Write a Note" popup
 */
const modal = document.getElementById('submission-modal');
const form = document.getElementById('love-form');

// Attached to the button in HTML
window.openModal = function () {
    modal.classList.remove('hidden');
}

document.querySelector('.close-modal').addEventListener('click', () => {
    modal.classList.add('hidden');
});

// Close if user clicks the dark background
modal.addEventListener('click', (e) => {
    if (e.target === modal) {
        modal.classList.add('hidden');
    }
});

/*
 * Form Submission Logic
 * Sends data to the server
 */
function setupForm() {
    form.addEventListener('submit', async (e) => {
        e.preventDefault(); // Stop page reload

        const inputs = form.querySelectorAll('input, textarea');
        const newNote = {
            to: inputs[0].value,
            msg: inputs[1].value,
            from: inputs[2].value
        };

        try {
            // POST request to save data
            const response = await fetch(API_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(newNote)
            });

            if (response.ok) {
                const savedNote = await response.json();
                const grid = document.getElementById('wall-grid');

                // Add the new card (prepend)
                const card = document.createElement('div');
                card.className = 'love-card';
                card.innerHTML = `
                    <div class="card-to">To: ${cleanInput(savedNote.to)}</div>
                    <div class="card-msg">"${cleanInput(savedNote.msg)}"</div>
                    <div class="card-from">- ${cleanInput(savedNote.from)}</div>
                    <div class="card-actions">
                        <button class="like-btn" onclick="toggleLike('${savedNote.id}', this)">
                            ❤ <span class="like-count">0</span>
                        </button>
                    </div>
                `;
                grid.prepend(card);

                // Cleanup
                form.reset();
                modal.classList.add('hidden');

                // Scroll down to see it
                window.scrollToWall();
            }
        } catch (err) {
            alert('Failed to post note. Please try again.');
        }
    });
}

// Helpers
window.scrollToWall = function () {
    document.getElementById('love-wall').scrollIntoView({ behavior: 'smooth' });
}

// Prevent HTML injection (Security)
function cleanInput(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
}

/*
 * Animation: Floating Hearts
 * Adds a new heart element every few milliseconds
 */
function setupFloatingHearts() {
    const container = document.getElementById('hearts-container');

    setInterval(() => {
        const heart = document.createElement('div');
        heart.classList.add('floating-heart');
        heart.innerHTML = '❤';

        // Randomize position and size
        heart.style.left = Math.random() * 100 + '%';
        heart.style.top = Math.random() * 80 + 20 + '%';
        heart.style.fontSize = Math.random() * 20 + 10 + 'px';

        container.appendChild(heart);

        // Remove after animation ends
        setTimeout(() => {
            heart.remove();
        }, 4000);
    }, 600);
}
