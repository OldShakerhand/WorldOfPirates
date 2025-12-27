const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const path = require('path');
const GameLoop = require('./game/GameLoop');

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

const PORT = process.env.PORT || 3000;
const MAX_PLAYERS = 20; // Server capacity limit

// Player tracking
let playerCount = 0;

// Serve static files from the public directory
app.use(express.static(path.join(__dirname, '../public')));

// Initialize Game Loop
const gameLoop = new GameLoop(io);
gameLoop.start();

io.on('connection', (socket) => {
    // Check if server is full
    if (playerCount >= MAX_PLAYERS) {
        console.log(`Server full (${MAX_PLAYERS}/${MAX_PLAYERS}). Rejecting connection: ${socket.id}`);
        socket.emit('server_full', {
            message: 'Server is full. Please try again later.',
            maxPlayers: MAX_PLAYERS
        });
        socket.disconnect();
        return;
    }

    playerCount++;
    console.log(`New player connected: ${socket.id} (${playerCount}/${MAX_PLAYERS})`);
    gameLoop.addPlayer(socket);

    socket.on('disconnect', () => {
        playerCount--;
        console.log(`Player disconnected: ${socket.id} (${playerCount}/${MAX_PLAYERS})`);
        gameLoop.removePlayer(socket.id);
    });

    socket.on('input', (data) => {
        gameLoop.handleInput(socket.id, data);
    });

    socket.on('enterHarbor', () => {
        gameLoop.handleEnterHarbor(socket);
    });

    socket.on('repairShip', () => {
        gameLoop.handleRepairShip(socket.id);
    });

    socket.on('closeHarbor', () => {
        gameLoop.handleCloseHarbor(socket.id);
    });
});

server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
