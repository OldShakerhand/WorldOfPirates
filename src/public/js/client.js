// Socket connection (will be initialized after name is set)
let socket = null;

// Store static map data (received once on connection)
let mapData = null;

// Chat messages (kill feed)
// ChatMessage: { type: 'system', timestamp: number, text: string }
// - Append-only: messages are never edited or deleted
// - Client stores last 10 messages for display
let chatMessages = [];

// Name input handling
document.addEventListener('DOMContentLoaded', () => {
    const nameInput = document.getElementById('playerNameInput');
    const setSailBtn = document.getElementById('setSailBtn');
    const nameError = document.getElementById('nameError');
    const nameOverlay = document.getElementById('nameInputOverlay');

    // Try to load saved name from localStorage
    const savedName = localStorage.getItem('playerName');
    if (savedName) {
        nameInput.value = savedName;
    }

    // Focus on input
    nameInput.focus();

    // Handle Enter key
    nameInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            setSailBtn.click();
        }
    });

    // Handle Set Sail button
    setSailBtn.addEventListener('click', () => {
        const playerName = nameInput.value.trim();

        // Client-side validation
        if (playerName.length < 3 || playerName.length > 20) {
            showError('Name must be 3-20 characters long');
            return;
        }

        if (!/^[a-zA-Z0-9 ]+$/.test(playerName)) {
            showError('Name can only contain letters, numbers, and spaces');
            return;
        }

        // Save to localStorage for convenience
        localStorage.setItem('playerName', playerName);

        // Disable button while connecting
        setSailBtn.disabled = true;
        setSailBtn.textContent = 'Connecting...';

        // Initialize socket connection
        socket = io();

        // Get custom spawn coordinates if provided
        const spawnX = document.getElementById('spawnX').value;
        const spawnY = document.getElementById('spawnY').value;

        let customSpawn = null;
        if (spawnX && spawnY) {
            customSpawn = {
                x: parseInt(spawnX),
                y: parseInt(spawnY)
            };
            console.log('[DEBUG] Custom spawn requested:', customSpawn);
        }

        // Send player name to server (with optional spawn)
        socket.emit('setPlayerName', {
            name: playerName,
            spawn: customSpawn
        });

        // Handle successful connection
        socket.on('map_data', (data) => {
            mapData = data;  // Keep local variable for backward compatibility
            window.mapData = data;  // Also set globally for harbor rendering
            console.log('Received map data:', data);
            console.log('Harbors count:', data.harbors ? data.harbors.length : 0);

            // Hide name overlay and show game
            nameOverlay.style.display = 'none';
        });

        // Handle name rejection
        socket.on('nameRejected', (data) => {
            showError(data.reason);
            setSailBtn.disabled = false;
            setSailBtn.textContent = 'Set Sail! 🏴‍☠️';
            socket.disconnect();
            socket = null;
        });

        // Handle server full
        socket.on('server_full', (data) => {
            showError(data.message);
            setSailBtn.disabled = false;
            setSailBtn.textContent = 'Set Sail! 🏴‍☠️';
            socket.disconnect();
            socket = null;
        });

        // Setup game event listeners
        setupGameListeners();
    });

    function showError(message) {
        nameError.textContent = message;
        nameError.style.display = 'block';
        setTimeout(() => {
            nameError.style.display = 'none';
        }, 5000);
    }
});

function setupGameListeners() {
    if (!socket) return;

    // Game State handling
    socket.on('gamestate_update', (state) => {
        // Pass both map data and dynamic state to the renderer
        if (mapData) {
            renderGame(state, mapData, socket.id);
        }
    });

    // Harbor UI events
    socket.on('harborData', (harborData) => {
        showHarborUI(harborData);
    });

    socket.on('harborClosed', () => {
        hideHarborUI();
    });

    // Ship metadata from server (single source of truth)
    socket.on('shipMetadata', (metadata) => {
        // Merge server metadata with client SHIP_PROPERTIES
        Object.assign(SHIP_PROPERTIES, metadata);
        console.log('Loaded ship metadata from server:', metadata);
    });

    // Combat config from server (visual settings)
    socket.on('combatConfig', (config) => {
        // Store combat visuals globally
        window.COMBAT_CONFIG = config;
        console.log('Loaded combat config from server:', config);
    });

    // Chat messages (kill feed) - event-based, not in game state
    socket.on('chatMessage', (message) => {
        // Add new message to array
        chatMessages.push(message);

        // Keep only last 10 messages
        if (chatMessages.length > 10) {
            chatMessages.shift(); // Remove oldest
        }

        // Render updated chat feed
        renderChatFeed(chatMessages);
    });
}

// Input handling
const keys = {
    turnLeft: false, // A
    turnRight: false, // D
    sailUp: false, // W
    sailDown: false, // S
    shootLeft: false, // Q
    shootRight: false // E
};

document.addEventListener('keydown', (e) => {
    switch (e.key.toLowerCase()) {
        case 'w': keys.sailUp = true; break;
        case 's': keys.sailDown = true; break;
        case 'a': keys.turnLeft = true; break;
        case 'd': keys.turnRight = true; break;
        case 'q': keys.shootLeft = true; break;
        case 'e': keys.shootRight = true; break;
        case 'h':
            socket.emit('enterHarbor');
            break;
    }
    sendInput();
});

document.addEventListener('keyup', (e) => {
    switch (e.key.toLowerCase()) {
        case 'w': keys.sailUp = false; break;
        case 's': keys.sailDown = false; break;
        case 'a': keys.turnLeft = false; break;
        case 'd': keys.turnRight = false; break;
        case 'q': keys.shootLeft = false; break;
        case 'e': keys.shootRight = false; break;
    }
    sendInput();
});

function sendInput() {
    if (!socket) return; // Don't send input before connected

    socket.emit('input', {
        left: keys.turnLeft,
        right: keys.turnRight,
        sailUp: keys.sailUp,
        sailDown: keys.sailDown,
        shootLeft: keys.shootLeft,
        shootRight: keys.shootRight
    });
}

// Harbor UI functions (called from HTML buttons)
function repairShip() {
    socket.emit('repairShip');
}

function closeHarbor() {
    socket.emit('closeHarbor');
    hideHarborUI();
}

function switchFlagship() {
    const shipSelector = document.getElementById('shipSelector');
    const selectedShip = shipSelector.value;
    socket.emit('switchFlagship', selectedShip);
}

// Make functions global for HTML onclick
window.repairShip = repairShip;
window.closeHarbor = closeHarbor;
window.switchFlagship = switchFlagship;
