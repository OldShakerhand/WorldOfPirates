const socket = io();

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
    socket.emit('input', {
        left: keys.turnLeft,
        right: keys.turnRight,
        sailUp: keys.sailUp,
        sailDown: keys.sailDown,
        shootLeft: keys.shootLeft,
        shootRight: keys.shootRight
    });
}

// Game State handling
socket.on('gamestate_update', (state) => {
    // Pass state to the renderer
    renderGame(state, socket.id);
});

// Harbor UI events
socket.on('harborData', (harborData) => {
    showHarborUI(harborData);
});

socket.on('harborClosed', () => {
    hideHarborUI();
});

// Harbor UI functions (called from HTML buttons)
function repairShip() {
    socket.emit('repairShip');
}

function closeHarbor() {
    socket.emit('closeHarbor');
    hideHarborUI();
}

// Make functions global for HTML onclick
window.repairShip = repairShip;
window.closeHarbor = closeHarbor;
