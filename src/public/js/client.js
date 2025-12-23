const socket = io();

// Input handling
const keys = {
    w: false,
    a: false,
    s: false, // Optional: reverse/brake
    d: false,
    space: false
};

document.addEventListener('keydown', (e) => {
    if (e.code === 'Space') keys.space = true;
    switch (e.key.toLowerCase()) {
        case 'w': keys.w = true; break;
        case 'a': keys.a = true; break;
        case 'd': keys.d = true; break;
    }
    sendInput();
});

document.addEventListener('keyup', (e) => {
    if (e.code === 'Space') keys.space = false;
    switch (e.key.toLowerCase()) {
        case 'w': keys.w = false; break;
        case 'a': keys.a = false; break;
        case 'd': keys.d = false; break;
    }
    sendInput();
});

function sendInput() {
    socket.emit('input', {
        forward: keys.w,
        left: keys.a,
        right: keys.d,
        shoot: keys.space
    });
}

// Game State handling
socket.on('gamestate_update', (state) => {
    // Pass state to the renderer
    renderGame(state, socket.id);
});
