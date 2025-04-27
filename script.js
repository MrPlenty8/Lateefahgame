const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const scoreDisplay = document.getElementById('scoreDisplay');
const restartButton = document.getElementById('restartButton');

// Web Audio API setup
let audioCtx;
try {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
} catch (e) {
    console.error("Web Audio API is not supported in this browser");
}

const box = 20; // Size of each grid box
const canvasSize = 400;
const gridSize = canvasSize / box;

let snake;
let food;
let score;
let d; // Direction
let game; // Game loop interval
let isGameOver;
let touchStartX = 0;
let touchStartY = 0;
let touchEndX = 0;
let touchEndY = 0;
let backgroundMusicInterval = null; // To hold the background music interval timer
let currentNoteIndex = 0;
const backgroundNotes = [261.63, 392.00]; // Frequencies for C4 and G4 (a simple happy interval)
const noteDuration = 0.4; // Duration of each note in seconds
const gapDuration = 0.1; // Gap between notes

document.addEventListener("keydown", direction);
restartButton.addEventListener("click", restartGame);
canvas.addEventListener('touchstart', handleTouchStart, false);
canvas.addEventListener('touchmove', handleTouchMove, false);
canvas.addEventListener('touchend', handleTouchEnd, false);


function initGame() {
    snake = [];
    snake[0] = { x: 9 * box, y: 10 * box }; // Initial snake position

    // Assign initial food position (variable already declared globally)
    food = {
        x: Math.floor(Math.random() * gridSize) * box,
        y: Math.floor(Math.random() * gridSize) * box
    };

    score = 0;
    d = undefined; // Reset direction
    isGameOver = false;
    scoreDisplay.textContent = "Score: 0"; // Update score display

    // Stop existing sounds and clear game loop
    stopBackgroundMusic(); // Use new function name
    if (game) {
        clearInterval(game);
    }

    // Start new game
    playBackgroundMusic(); // Use new function name
    game = setInterval(draw, 150); // Start game loop (slightly slower for visibility)
}

function restartGame() {
    // AudioContext might need a user interaction to start,
    // ensure it's running if stopped.
    if (audioCtx && audioCtx.state === 'suspended') {
        audioCtx.resume();
    }
    initGame();
}

function direction(event) {
    if (isGameOver) return; // Don't change direction if game is over
    let key = event.keyCode;
    if (key == 37 && d != "RIGHT") { // Left arrow
        d = "LEFT";
    } else if (key == 38 && d != "DOWN") { // Up arrow
        d = "UP";
    } else if (key == 39 && d != "LEFT") { // Right arrow
        d = "RIGHT";
    } else if (key == 40 && d != "UP") { // Down arrow
        d = "DOWN";
    }
}

// Check collision function
function collision(head, array) {
    for (let i = 0; i < array.length; i++) {
        if (head.x == array[i].x && head.y == array[i].y) {
            return true;
        }
    }
    return false;
}

// Draw grid function
function drawGrid() {
    ctx.strokeStyle = "#444"; // Darker grey grid lines for less contrast
    for (let i = 0; i <= gridSize; i++) {
        // Vertical lines
        ctx.beginPath();
        ctx.moveTo(i * box, 0);
        ctx.lineTo(i * box, canvasSize);
        ctx.stroke();
        // Horizontal lines
        ctx.beginPath();
        ctx.moveTo(0, i * box);
        ctx.lineTo(canvasSize, i * box);
        ctx.stroke();
    }
}

// Draw everything to the canvas
function draw() {
    ctx.clearRect(0, 0, canvasSize, canvasSize); // Clear canvas
    drawGrid(); // Draw the grid first

    // Draw snake with custom 'I' shape
    ctx.strokeStyle = "blue"; // Line color
    ctx.lineWidth = Math.max(1, box * 0.15); // Line thickness relative to box size, min 1px
    const capWidth = box * 0.4; // Width of the horizontal caps
    const halfCap = capWidth / 2;
    const segmentHeight = box * 0.7; // Height of the vertical line
    const halfHeight = segmentHeight / 2;

    for (let i = 0; i < snake.length; i++) {
        const centerX = snake[i].x + box / 2;
        const centerY = snake[i].y + box / 2;

        ctx.beginPath();
        // Vertical line
        ctx.moveTo(centerX, centerY - halfHeight);
        ctx.lineTo(centerX, centerY + halfHeight);
        // Top cap
        ctx.moveTo(centerX - halfCap, centerY - halfHeight);
        ctx.lineTo(centerX + halfCap, centerY - halfHeight);
        // Bottom cap
        ctx.moveTo(centerX - halfCap, centerY + halfHeight);
        ctx.lineTo(centerX + halfCap, centerY + halfHeight);
        ctx.stroke();
    }

    // Draw food with 'L' (adjust font size back slightly if needed)
    ctx.fillStyle = "pink"; // Change food color to pink
    ctx.font = `${box * 0.8}px Arial`; // Reset font size if it looks too big now
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("L", food.x + box / 2, food.y + box / 2);
    // --- Game Logic ---
    if (isGameOver) return; // Stop game logic if over

    // Old head position
    let snakeX = snake[0].x;
    let snakeY = snake[0].y;

    // Which direction
    if (d == "LEFT") snakeX -= box;
    if (d == "UP") snakeY -= box;
    if (d == "RIGHT") snakeX += box;
    if (d == "DOWN") snakeY += box;

    // If the snake eats the food
    if (snakeX == food.x && snakeY == food.y) {
        score++;
        scoreDisplay.textContent = "Score: " + score; // Update score display
        playEatSound(); // Play eat sound
        food = {
            x: Math.floor(Math.random() * gridSize) * box,
            y: Math.floor(Math.random() * gridSize) * box
        };
        // Don't remove tail
    } else {
        // Remove the tail
        snake.pop();
    }

    // Add new head
    let newHead = {
        x: snakeX,
        y: snakeY
    };

    // Game over conditions
    if (snakeX < 0 || snakeX >= canvasSize || snakeY < 0 || snakeY >= canvasSize || collision(newHead, snake)) {
        clearInterval(game);
        isGameOver = true;
        stopBackgroundMusic(); // Use new function name
        playGameOverSound(); // Play game over sound
        // Display Game Over message on canvas
        // No semi-transparent background needed on black canvas
        ctx.fillStyle = "red"; // Red Game Over text
        ctx.font = "24px Arial"; // Slightly smaller font for the longer text
        ctx.textAlign = "center";
        ctx.fillText("oh no lateefah got shorter", canvasSize / 2, canvasSize / 2 - 10); // New game over text
        ctx.fillStyle = "white"; // White score text
        ctx.font = "20px Arial";
        ctx.fillText(`Final Score: ${score}`, canvasSize / 2, canvasSize / 2 + 20); // Adjusted position slightly
        return; // Stop the draw function early
    }

    snake.unshift(newHead);

    // Score is now updated via scoreDisplay element
}

// Touch Control Handlers
function handleTouchStart(event) {
    event.preventDefault(); // Prevent scrolling
    touchStartX = event.touches[0].clientX;
    touchStartY = event.touches[0].clientY;
}

function handleTouchMove(event) {
    event.preventDefault(); // Prevent scrolling
    touchEndX = event.touches[0].clientX;
    touchEndY = event.touches[0].clientY;
}

function handleTouchEnd(event) {
    event.preventDefault(); // Prevent scrolling
    if (isGameOver) return;

    const deltaX = touchEndX - touchStartX;
    const deltaY = touchEndY - touchStartY;

    // Determine swipe direction
    if (Math.abs(deltaX) > Math.abs(deltaY)) { // Horizontal swipe
        if (deltaX > 0 && d !== "LEFT") {
            d = "RIGHT";
        } else if (deltaX < 0 && d !== "RIGHT") {
            d = "LEFT";
        }
    } else { // Vertical swipe
        if (deltaY > 0 && d !== "UP") {
            d = "DOWN";
        } else if (deltaY < 0 && d !== "DOWN") {
            d = "UP";
        }
    }
    // Reset touch coordinates for the next swipe
    touchStartX = 0;
    touchStartY = 0;
    touchEndX = 0;
    touchEndY = 0;
}


// --- Sound Effect Functions ---

function playSound(frequency, type, duration) {
    if (!audioCtx) return; // Don't play if AudioContext failed

    const oscillator = audioCtx.createOscillator();
    const gainNode = audioCtx.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(audioCtx.destination);

    oscillator.type = type; // 'sine', 'square', 'sawtooth', 'triangle'
    oscillator.frequency.setValueAtTime(frequency, audioCtx.currentTime);

    // Fade out quickly - Adjust starting gain for general sound level
    gainNode.gain.setValueAtTime(0.6, audioCtx.currentTime); // Lowered general sound start volume
    gainNode.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + duration);

    oscillator.start(audioCtx.currentTime);
    oscillator.stop(audioCtx.currentTime + duration);
}

function playEatSound() {
    // A short, high-pitched 'pop' sound - using triangle for potentially softer sound
    playSound(880, 'triangle', 0.1); // Frequency 880Hz (A5), type triangle, duration 0.1s
}

function playGameOverSound() {
    // A lower, longer descending sound
    if (!audioCtx) return;
    const oscillator = audioCtx.createOscillator();
    const gainNode = audioCtx.createGain();
    oscillator.connect(gainNode);
    gainNode.connect(audioCtx.destination);

    oscillator.type = 'sine'; // Changed to sine for smoother sound
    gainNode.gain.setValueAtTime(0.4, audioCtx.currentTime); // Lowered starting volume

    // Descending pitch
    oscillator.frequency.setValueAtTime(330, audioCtx.currentTime); // Start slightly lower (E4)
    oscillator.frequency.exponentialRampToValueAtTime(82, audioCtx.currentTime + 0.6); // End lower (E2) over slightly longer time

    // Fade out
    gainNode.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.6);

    oscillator.start(audioCtx.currentTime);
    oscillator.stop(audioCtx.currentTime + 0.6); // Match duration
}


function playSingleBackgroundNote() {
    if (!audioCtx || isGameOver) return; // Don't play if no context or game is over

    const frequency = backgroundNotes[currentNoteIndex];
    const oscillator = audioCtx.createOscillator();
    const gainNode = audioCtx.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(audioCtx.destination);

    oscillator.type = 'sine'; // Changed to sine for smoother background
    oscillator.frequency.setValueAtTime(frequency, audioCtx.currentTime);
    gainNode.gain.setValueAtTime(0.07, audioCtx.currentTime); // Lowered background volume further

    // Fade out the note
    gainNode.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + noteDuration);

    oscillator.start(audioCtx.currentTime);
    oscillator.stop(audioCtx.currentTime + noteDuration);

    // Move to the next note
    currentNoteIndex = (currentNoteIndex + 1) % backgroundNotes.length;
}

function playBackgroundMusic() {
    if (!audioCtx || backgroundMusicInterval) return; // Don't start if no context or already playing
    // Play the first note immediately
    playSingleBackgroundNote();
    // Set interval to play subsequent notes
    backgroundMusicInterval = setInterval(playSingleBackgroundNote, (noteDuration + gapDuration) * 1000);
}

function stopBackgroundMusic() {
    if (backgroundMusicInterval) {
        clearInterval(backgroundMusicInterval);
        backgroundMusicInterval = null;
    }
    // Reset note index for next time
    currentNoteIndex = 0;
}


// Initialize and start the game
// Note: AudioContext often requires a user gesture (like a click) to start.
// The restart button click will help resume it if needed.
initGame();
